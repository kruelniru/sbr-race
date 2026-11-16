#!/usr/bin/env node
// Headless race simulator for balance tuning. Runs full games with AI PCs and
// prints stats. Uses exactly the same engine as the host.
//
//   node sim/simulate.js                         100 games, 18 PCs
//   node sim/simulate.js --games 500 --players 12
//   node sim/simulate.js --runners 0.3           30% of PCs are Runners
//   node sim/simulate.js --seed abc --verbose    print one full game as text
//   node sim/simulate.js --plans random          PCs pick Stage Plans at random
//   node sim/simulate.js --plans push            every PC always picks one plan
//   node sim/simulate.js --plans star            every PC always picks its star option (plans and sub events)
//   node sim/simulate.js --choice-times log.json replay answer times from a real game
//   node sim/simulate.js --freq high             sub event frequency (low/normal/high)
//   node sim/simulate.js --humans 12             how many PCs are people (default: all)
//   node sim/simulate.js --set valentine.relay=1  try a rules.js number (comma-separate several)
//
// Tune numbers in data/rules.js, data/stages.js and event weights in data/events.

import RULES from '../data/rules.js';
import STAGES from '../data/stages.js';
import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { needsStagePlans, openStagePlans, openSubEvents, closeChoices, starOption, answerLikeAi, useItem } from '../js/engine/choices.js';
import { aiBuys } from '../js/engine/horses.js';
import { fightScore } from '../js/engine/fights.js';
import { offerTrade } from '../js/engine/trades.js';
import { corpseSummary } from '../js/engine/corpse.js';
import PLANS from '../data/plans.js';
import PERSONALITIES from '../data/personalities.js';
import { readFileSync } from 'node:fs';
import { namedRacers } from '../js/engine/racers.js';
import { EVENTS, lintEvents } from '../js/engine/events.js';
import { buildCards, cardsSeconds, cardSeconds } from '../js/engine/reveal.js';

// ---------------------------------------------------------------- args
const args = parseArgs(process.argv.slice(2));
// --set a.b.c=value (repeatable, comma-separated): try a rules.js number without editing it.
for (const kv of String(args.set ?? '').split(',').filter(Boolean)) {
  const [path, v] = kv.split('=');
  const keys = path.split('.');
  const obj = keys.slice(0, -1).reduce((o, k) => o[k], RULES);
  obj[keys.at(-1)] = Number(v);
}
const HORSE_VALUE = {}; // ridden at the Finish Line -> { n, pts }
const FAIR = {};        // sub event prompts per living PC per round, by personality
const GAMES = args.verbose ? 1 : Number(args.games ?? 100);
const PLAYERS = Number(args.players ?? 18);
const RUNNERS = args.runners != null ? Number(args.runners) : null;
const SEED = args.seed ?? 'sim';
const PLAN_MODE = args.plans ?? 'ai'; // ai | random | star | <plan id>
const FREQ = args.freq ?? 'normal';
const HUMANS = args.humans != null ? Number(args.humans) : PLAYERS; // PCs played by people (timing, Main Story lines)
const CHOICE_TIMES = args['choice-times'] ? loadChoiceTimes(args['choice-times']) : null;

const problems = lintEvents();
if (problems.length) {
  console.error('Event problems:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// ---------------------------------------------------------------- run
function playGame(seed) {
  const state = createGameState(seed);
  const rosterRng = new Rng(seed + ':roster');
  const taken = new Set();
  for (let i = 0; i < PLAYERS; i++) {
    // The first HUMANS PCs are "people" (they can find Rokakaka); the sim
    // answers for them the way an AI racer would.
    const p = addPlayer(state, { isAI: i >= HUMANS });
    p.connected = true;
    const c = makeAiCharacter(rosterRng, taken);
    if (RUNNERS != null) c.mount = rosterRng.chance(RUNNERS) ? 'runner' : 'horse';
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  state.settings.subEventFreq = FREQ;
  startRace(state);
  const results = [];
  const stageLog = []; // per PC per stage: { id, stage, plan, star, personality, start }
  const windows = [];  // choice windows: { kind, humans }
  const timeRng = new Rng(seed + ':time');
  const palm = { offers: 0, in: 0 };
  const standShare = [];
  const horseValue = HORSE_VALUE;
  const partsByStage = []; // at each Finish Line: who holds the parts
  const fair = (FAIR.byPers ??= {});
  while (!state.race.over) {
    if (needsStagePlans(state)) {
      const w = openStagePlans(state);
      const pcsById = Object.fromEntries(state.players.map((x) => [x.id, x]));
      for (const pr of w.prompts) if (!pr.answer) answerLikeAi(timeRng, pr, pcsById[pr.playerId].personality, 'player');
      for (const pr of w.prompts) overrideAnswer(pr, timeRng);
      // Sim people shop like AI racers at the horse trader.
      for (const pr of w.prompts) if (pr.shop && pr.buy == null && !pcsById[pr.playerId].isAI) pr.buy = aiBuys(pcsById[pr.playerId], timeRng);
      const humanIds = new Set(state.players.slice(0, HUMANS).map((x) => x.id));
      // Stage Plans open on the stage results card, so the results and
      // standings cards cover part of the window (none before Stage 1).
      const prev = results.at(-1);
      const overlap = prev?.placements
        ? buildCards(prev).filter((c) => c.kind === 'stage' || c.kind === 'standings').reduce((t, c) => t + cardSeconds(c), 0)
        : 0;
      windows.push({ kind: 'plan', humans: w.prompts.filter((x) => humanIds.has(x.playerId)).length, overlap });
      const pcs = Object.fromEntries(state.players.map((x) => [x.id, x]));
      for (const pr of w.prompts) {
        const pc = pcs[pr.playerId];
        stageLog.push({ id: pc.id, stage: w.stageId, plan: pr.answer.optionId, star: pr.star, personality: pc.personality, start: pc.points, worthiness: pc.worthiness });
      }
      closeChoices(state);
    }
    const w = openSubEvents(state);
    simPeopleUseItems(state, timeRng);
    simPeopleTrade(state, timeRng);
    const humanIds = new Set(state.players.slice(0, HUMANS).map((x) => x.id));
    const pcsById = Object.fromEntries(state.players.map((x) => [x.id, x]));
    for (const pr of w.prompts) {
      if (!pr.answer) answerLikeAi(timeRng, pr, pcsById[pr.playerId].personality, 'player');
      if (PLAN_MODE === 'star') pr.answer = { optionId: pr.star, by: 'ai' };
      if (pr.subId === 'sub-palm') { palm.offers++; if (pr.answer.optionId === 'in') palm.in++; }
      // People's results always land in the Main Story (AI quiet results don't).
      if (humanIds.has(pr.playerId)) pr.answer.by = 'player';
    }
    windows.push({ kind: 'sub', humans: w.prompts.filter((x) => humanIds.has(x.playerId)).length });
    // Fairness: prompts per living PC per round, by personality (Valentine-only prompts apart).
    for (const p of state.players.filter((x) => x.status === 'racing')) {
      const f = (fair[p.personality] ??= { rounds: 0, prompts: 0, valentine: 0 });
      f.rounds++;
      for (const pr of w.prompts.filter((x) => x.playerId === p.id)) {
        if (['valentine-offer', 'valentine-errand'].includes(pr.special)) f.valentine++; else f.prompts++;
      }
    }
    closeChoices(state);
    const res = runRound(state);
    results.push(res);
    // Horse value: stage points for racing PCs by what they ride at the Finish Line.
    if (res.placements) {
      for (const pl of res.placements) {
        const pc = state.players.find((x) => x.id === pl.id);
        if (!pc || pc.mount !== 'horse') continue;
        const k = pc.onFoot ? 'on foot' : pc.horseQuality;
        const b = (horseValue[k] ??= { n: 0, pts: 0 });
        b.n++; b.pts += pl.points;
      }
    }
    if (res.placements) partsByStage.push(partsSnapshot(state, res.stage.id));
    // Stand holders among PCs at the end of Stages 3, 6 and 9.
    if (res.placements && [3, 6, 9].includes(res.stage.id)) {
      const living = state.players.filter((x) => x.status !== 'dead');
      standShare.push({ stage: res.stage.id, ofAll: living.filter((x) => x.stand).length / state.players.length, ofLiving: living.filter((x) => x.stand).length / (living.length || 1) });
    }
  }
  return { state, results, stageLog, windows, timeRng, palm, standShare, partsByStage };
}

/** Sim plan modes: random, star, or one fixed plan for everyone. */
function overrideAnswer(pr, rng) {
  if (PLAN_MODE === 'ai') return;
  if (PLAN_MODE === 'ai') return;
  let id;
  if (PLAN_MODE === 'random') id = rng.pick(pr.options).id;
  else if (PLAN_MODE === 'star') id = pr.star;
  else id = pr.options.some((o) => o.id === PLAN_MODE) ? PLAN_MODE : 'pace';
  const opt = pr.options.find((o) => o.id === id);
  pr.answer = { optionId: id, by: 'ai' };
  if (opt.needsTarget) pr.answer.targetId = rng.weighted(pr.targets, (t) => 50 + (t.points ?? 0)).id;
}

/** How long a game's choice windows take, in seconds (see rules.timing.choiceModel). */
function choiceSeconds(windows, rng) {
  const M = RULES.timing.choiceModel;
  const timer = RULES.choices.timerSeconds;
  let total = 0;
  const byKind = { plan: 0, sub: 0 };
  for (const w of windows) {
    if (!w.humans) continue;
    let slowest = 0;
    for (let i = 0; i < w.humans; i++) slowest = Math.max(slowest, answerSeconds(w.kind, rng, M));
    // Only the time beyond the results cards keeps the stream waiting.
    const wait = Math.max(0, Math.min(timer, slowest) - (w.overlap ?? 0));
    if (wait > 0) {
      total += M.overhead[w.kind] + wait;
      byKind[w.kind] += M.overhead[w.kind] + wait;
    }
  }
  return { total, byKind };
}

function answerSeconds(kind, rng, M) {
  const samples = CHOICE_TIMES?.[kind];
  if (samples?.length) return rng.pick(samples) / 1000;
  return M.medianSeconds[kind] * Math.exp(rng.normal(0, M.spread));
}

/** A timing log exported from the host (debug bar: Export choice times). */
function loadChoiceTimes(path) {
  const log = JSON.parse(readFileSync(path, 'utf8'));
  const out = { plan: [], sub: [] };
  for (const w of log.windows ?? []) {
    const kind = w.kind === 'plan' ? 'plan' : 'sub';
    // Timed-out answers count as the full timer.
    // Timed-out answers count as the full timer.
    for (const a of w.answers ?? []) out[kind].push(a.ms ?? (w.timerSeconds ?? RULES.choices.timerSeconds) * 1000);
  }
  return out;
}

if (args.verbose) {
  const { state, results } = playGame(SEED);
  printGame(state, results);
  process.exit(0);
}

const S = newStats();
for (let g = 0; g < GAMES; g++) collect(S, playGame(`${SEED}-${g}`));
printStats(S);

// ---------------------------------------------------------------- stats
function newStats() {
  return {
    games: 0,
    perStage: STAGES.map(() => ({ pcDead: 0, pcRetired: 0, canonDead: 0, canonRetired: 0, npcDied: 0, npcRetired: 0, npcLeft: 0, horsesLost: 0 })),
    pcSurvive: 0, canonSurvive: 0, npcSurvive: 0, pcTotal: 0, canonTotal: 0,
    winnerPoints: [], winnerTier: { pc: 0, canon: 0, npc: 0 },
    rounds: [], minutes: [], minutesNoSide: [], projected: [], projectedNoSide: [], mainLines: [], sideLines: [], minorLines: [],
    spares: 0, awards: {},
    kills: [], maxKills: [], killsPc: 0, killsCanon: 0,
    mount: { horse: { n: 0, points: 0, survive: 0, placements: [] }, runner: { n: 0, points: 0, survive: 0, placements: [] } },
    eventCounts: {},
    packNamed: 0,
    canonStage1Deaths: 0,
    fieldMismatch: 0,
    stands: 0, // milestone 4
    choiceMin: [], planMin: [], subMin: [], subPerRound: [],
    st: newStandStats(), byPlan: {}, byPers: {},
  };
}

function collect(S, { state, results, stageLog, windows, timeRng, palm, standShare, partsByStage }) {
  collectStands(S, state, results, palm);
  collectM5a(S, state);
  collectM5b(S, state, results, partsByStage);
  collectHunts(S, state, stageLog);
  for (const x of standShare) (S.st.share[x.stage] ??= []).push(x);
  S.games++;
  const racers = namedRacers(state);
  for (const r of racers) {
    const tot = r.tier === 'pc' ? 'pcTotal' : 'canonTotal';
    S[tot]++;
    if (r.death) {
      const st = S.perStage[r.death.stage - 1];
      st[r.tier === 'pc' ? 'pcDead' : 'canonDead']++;
      if (r.tier === 'canon' && r.death.stage === 1) S.canonStage1Deaths++;
    }
    if (r.retiredAt) S.perStage[r.retiredAt.stage - 1][r.tier === 'pc' ? 'pcRetired' : 'canonRetired']++;
    if (r.status === 'racing') S[r.tier === 'pc' ? 'pcSurvive' : 'canonSurvive']++;
    if (r.onFoot) S.perStage[0].horsesLost++; // total, shown in summary
    S.kills.push(r.kills);
    S.spares += r.spares ?? 0;
    if (r.tier === 'pc') {
      S.killsPc += r.kills;
      const m = S.mount[r.mount];
      m.n++;
      m.points += r.points;
      if (r.status === 'racing') m.survive++;
      for (const pl of r.placements) m.placements.push(pl.rank);
    } else S.killsCanon += r.kills;
  }
  S.maxKills.push(Math.max(...racers.map((r) => r.kills)));

  let seconds = 0, secondsNoSide = 0, main = 0, side = 0, minor = 0;
  for (const res of results) {
    const st = S.perStage[res.stage.id - 1];
    st.npcDied += res.fieldReport.died;
    st.npcRetired += res.fieldReport.retired;
    if (res.type === 'finish') st.npcLeft += res.fieldReport.remain;
    const cards = buildCards(res);
    seconds += cardsSeconds(cards);
    secondsNoSide += cardsSeconds(cards, 'normal', { skipSide: true });
    for (const e of res.events) {
      if (e.minor) minor++;
      else if (e.side) side++;
      else main++;
    }
    for (const [id, n] of Object.entries(res.eventCounts)) S.eventCounts[id] = (S.eventCounts[id] ?? 0) + n;
  }
  const { total: choices, byKind } = choiceSeconds(windows, timeRng);
  S.choiceMin.push(choices / 60);
  S.planMin.push(byKind.plan / 60);
  S.subMin.push(byKind.sub / 60);
  S.subPerRound.push(windows.filter((w) => w.kind === 'sub').reduce((n, w) => n + w.humans, 0) / results.length);

  // Stage Plans: what each PC earned in each stage under its plan.
  const byId = Object.fromEntries(state.players.map((x) => [x.id, x]));
  const fin = Object.fromEntries(results.filter((r) => r.placements).map((r) => [r.stage.id, r.placements]));
  for (const row of stageLog) {
    const pc = byId[row.id];
    const next = stageLog.find((x) => x.id === row.id && x.stage === row.stage + 1);
    const pts = (next ? next.start : pc.points) - row.start;
    const diedHere = pc.death?.stage === row.stage;
    const rank = fin[row.stage]?.find((x) => x.id === row.id)?.rank ?? null;
    const b = (S.byPlan[row.plan] ??= { n: 0, points: 0, died: 0, top10: 0, placed: 0 });
    b.n++; b.points += pts; if (diedHere) b.died++;
    if (rank) { b.placed++; if (rank <= 10) b.top10++; }
  }
  // Personalities (whole game).
  for (const pc of state.players) {
    const b = (S.byPers[pc.personality] ??= { n: 0, points: 0, ny: 0, top10: 0, placed: 0, plans: {} });
    b.n++; b.points += pc.points; if (pc.status === 'racing') b.ny++;
    for (const pl of pc.placements) { b.placed++; if (pl.rank <= 10) b.top10++; }
    for (const row of stageLog.filter((x) => x.id === pc.id)) b.plans[row.plan] = (b.plans[row.plan] ?? 0) + 1;
  }
  S.rounds.push(results.length);
  S.minutes.push(seconds / 60);
  S.minutesNoSide.push(secondsNoSide / 60);
  S.projected.push((seconds + choices) / 60);
  S.projectedNoSide.push((secondsNoSide + choices) / 60);
  S.mainLines.push(main);
  S.sideLines.push(side);
  S.minorLines.push(minor);

  const finale = results.at(-1).finale;
  const winner = finale.podium[0];
  if (winner) {
    S.winnerPoints.push(winner.points);
    S.winnerTier[winner.tier]++;
  }
  for (const a of finale.awards) S.awards[a.title] = (S.awards[a.title] ?? 0) + 1;
  S.npcSurvive += state.field.racing;
  S.packNamed += state.field.kept.filter((n) => n.packLeader).length;
  const f = state.field;
  if (f.racing + f.retired + f.dead !== RULES.fieldSize) S.fieldMismatch++;
}

// ---------------------------------------------------------------- printing
function printStats(S) {
  const g = S.games;
  const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const f1 = (n) => n.toFixed(1);
  const pct = (n, d) => `${((100 * n) / (d || 1)).toFixed(0)}%`;

  console.log(`\n=== ${g} games · ${PLAYERS} PCs${RUNNERS != null ? ` · ${Math.round(RUNNERS * 100)}% Runners` : ''} · ${S.canonTotal / g} canon · field ${RULES.fieldSize} · ${EVENTS.length} events ===\n`);

  console.log('Per stage (averages per game)');
  table(
    ['Stage', 'PC dead', 'PC ret.', 'Canon dead', 'Canon ret.', 'NPC died', 'NPC ret.', 'Field left'],
    S.perStage.map((st, i) => [
      `${i + 1} ${STAGES[i].name.slice(0, 22)}`,
      f1(st.pcDead / g), f1(st.pcRetired / g), f1(st.canonDead / g), f1(st.canonRetired / g),
      f1(st.npcDied / g), f1(st.npcRetired / g), f1(st.npcLeft / g),
    ]),
  );

  const pcPerGame = S.pcTotal / g, canonPerGame = S.canonTotal / g;
  console.log('\nReached New York');
  console.log(`  PCs     ${f1(S.pcSurvive / g)} of ${pcPerGame} (${pct(S.pcSurvive, S.pcTotal)})`);
  console.log(`  Canon   ${f1(S.canonSurvive / g)} of ${canonPerGame} (${pct(S.canonSurvive, S.canonTotal)})`);
  console.log(`  NPCs    ${f1(S.npcSurvive / g)} of ${RULES.fieldSize}`);
  console.log(`  Horses lost (riders on foot at the end): ${f1(S.perStage[0].horsesLost / g)} per game`);

  console.log('\nWinner');
  console.log(`  points  avg ${f1(avg(S.winnerPoints))}, min ${Math.min(...S.winnerPoints)}, max ${Math.max(...S.winnerPoints)}`);
  console.log(`  tier    PC ${pct(S.winnerTier.pc, g)} · canon ${pct(S.winnerTier.canon, g)} · pack leader ${pct(S.winnerTier.npc, g)}`);

  const pcRanks = [...S.mount.horse.placements, ...S.mount.runner.placements];
  const share = (max) => pct(pcRanks.filter((r) => r <= max).length, pcRanks.length);
  console.log(`\nPC stage placements: top 10 in ${share(10)}, top 3 in ${share(3)}`);

  console.log('\nRiders vs Runners (PCs)');
  for (const [k, m] of Object.entries(S.mount)) {
    if (!m.n) continue;
    console.log(`  ${k === 'horse' ? 'Riders ' : 'Runners'} n=${m.n}  avg points ${f1(m.points / m.n)}  avg placement ${f1(avg(m.placements))}  reach NY ${pct(m.survive, m.n)}`);
  }

  console.log('\nKills');
  console.log(`  per game: by PCs ${f1(S.killsPc / g)}, by canon ${f1(S.killsCanon / g)}; most by one racer avg ${f1(avg(S.maxKills))}; spares ${f1(S.spares / g)}`);
  console.log(`  awards given: ${Object.entries(S.awards).map(([k, n]) => `${k} ${pct(n, g)}`).join(' · ')}`);
  console.log(`  pack leaders named (placed top 10): ${f1(S.packNamed / g)} per game`);

  console.log('\nLength');
  console.log(`  rounds ${f1(avg(S.rounds))} · Main Story lines ${f1(avg(S.mainLines))} · side lines ${f1(avg(S.sideLines))} · minor lines ${f1(avg(S.minorLines))}`);
  console.log(`  reveal at Normal speed:   everything ${f1(avg(S.minutes))} min · side stories skipped ${f1(avg(S.minutesNoSide))} min`);
  console.log(`  choice windows: ${f1(avg(S.choiceMin))} min = Stage Plans ${f1(avg(S.planMin))} (beyond the results cards) + sub events ${f1(avg(S.subMin))} (${f1(avg(S.subPerRound))} sub events per round, ${HUMANS} of ${PLAYERS} PCs are people)`);
  console.log(`  total with choices:       everything ${f1(avg(S.projected))} min · side stories skipped ${f1(avg(S.projectedNoSide))} min  [target 30–40]`);

  console.log(`\nStage Plans (per PC per stage, mode: ${PLAN_MODE})`);
  const picks = Object.values(S.byPlan).reduce((t, x) => t + x.n, 0);
  table(['Plan', 'picks', 'pts/stage', 'died in stage', 'top 10'],
    PLANS.filter((pl) => S.byPlan[pl.id]).map((pl) => {
      const b = S.byPlan[pl.id];
      return [pl.label, pct(b.n, picks), f1(b.points / b.n), pct(b.died, b.n), pct(b.top10, b.placed)];
    }));
  console.log('\nPersonalities (whole game)');
  table(['Personality', 'star plan', 'avg points', 'reach NY', 'top 10', 'plans picked'],
    PERSONALITIES.filter((x) => S.byPers[x.id]).map((x) => {
      const b = S.byPers[x.id];
      const star = starOption(PLANS.filter((pl) => pl.enabled), x.id).label;
      const tot = Object.values(b.plans).reduce((t, n) => t + n, 0);
      const mix = Object.entries(b.plans).sort((m, n) => n[1] - m[1]).map(([id, n]) => `${id} ${pct(n, tot)}`).join(' ');
      return [x.label, star, f1(b.points / b.n), pct(b.ny, b.n), pct(b.top10, b.placed), mix];
    }));

  const counts = EVENTS.map((e) => [e.id, S.eventCounts[e.id] ?? 0]).sort((a, b) => b[1] - a[1]);
  console.log('\nMost used events (per game)');
  for (const [id, n] of counts.slice(0, 8)) console.log(`  ${f1(n / g).padStart(5)}  ${id}`);
  const never = counts.filter(([, n]) => n === 0).map(([id]) => id);
  console.log(`Never used: ${never.length ? never.join(', ') : 'none'}`);

  printStands(S);
  printM5a(S);
  printM5b(S);
  printHunts(S);

  console.log('\nChecks');
  console.log(`  canon deaths in Stage 1: ${S.canonStage1Deaths} ${S.canonStage1Deaths ? 'FAIL' : 'ok'}`);
  console.log(`  NPC counts add up: ${S.fieldMismatch ? `FAIL in ${S.fieldMismatch} games` : 'ok'}`);
  console.log('');
}

function printGame(state, results) {
  const P = (s = '') => console.log(s);
  P(`STEEL BALL RUN · seed "${state.seed}" · ${PLAYERS} PCs, ${state.canon.length} canon, ${RULES.fieldSize} in the field\n`);
  P('The racers:');
  for (const r of namedRacers(state)) {
    P(`  ${r.name} (${r.tier === 'pc' ? 'PC' : 'canon'}, ${r.pronouns}, ${r.personality}, ${r.mount === 'runner' ? 'Runner' : r.animal ? 'camel' : `horse ${r.horse}`})`);
  }
  let stage = null;
  for (const res of results) {
    if (res.stage.id !== stage) {
      stage = res.stage.id;
      P(`\n${'='.repeat(70)}\nSTAGE ${stage}: ${res.stage.name.toUpperCase()}\n${res.stage.from} → ${res.stage.to}\n${'='.repeat(70)}`);
    }
    P(`\n--- ${res.label} ---`);
    for (const e of res.events.filter((x) => !x.side)) P(`${e.death ? '✝ ' : '  '}${e.text}`);
    const sideFull = res.events.filter((x) => x.side && !x.minor);
    const minor = res.events.filter((x) => x.minor);
    if (sideFull.length || minor.length) P('  -- Side stories --');
    for (const e of sideFull) P(`  ${e.death ? '✝ ' : '  '}${e.text}`);
    if (minor.length) {
      P('    Meanwhile on the trail...');
      for (const e of minor) P(`      · ${e.text}`);
    }
    P(`  [Field] ${res.fieldReport.text}`);
    if (res.fallen) {
      const names = res.fallen.named.map((f) => `${f.name} (${f.cause}${f.by ? `, by ${f.by}` : ''})`);
      P(`  [The Fallen] ${names.length ? names.join('; ') : 'No named racers.'}${res.fallen.npcs ? ` And ${res.fallen.npcs} from the field.` : ''}`);
    }
    if (res.placements) {
      P(`\n  STAGE ${stage} RESULTS`);
      for (const p of res.placements.slice(0, 10)) P(`    ${String(p.rank).padStart(2)}. ${p.unnamed ? '(a rider from the pack)' : p.name}${p.tier === 'npc' ? ' [pack]' : ''}  +${p.points}`);
      P('  STANDINGS');
      for (const s of res.standings.slice(0, 6)) P(`    ${s.name}${s.status !== 'racing' ? ` (${s.status})` : ''}  ${s.points}`);
    }
    if (res.finale) printFinale(P, res.finale);
  }
  const all = results.reduce((s, r) => s + cardsSeconds(buildCards(r)), 0);
  const noSide = results.reduce((s, r) => s + cardsSeconds(buildCards(r), 'normal', { skipSide: true }), 0);
  P(`\n(${results.length} rounds · reveals at Normal speed: ~${(all / 60).toFixed(0)} min, or ~${(noSide / 60).toFixed(0)} min skipping side stories)`);
}

function printFinale(P, f) {
  P(`\n${'='.repeat(70)}\nNEW YORK · TRINITY CHURCH\n${'='.repeat(70)}`);
  for (const p of [...f.podium].reverse()) P(`  ${['', '1st', '2nd', '3rd'][p.rank]}: ${p.name}  ${p.points} points${p.rank === 1 ? '   <-- WINNER' : ''}`);
  if (!f.podium.length) P('  Nobody reached New York.');
  P('\n  AWARDS');
  for (const a of f.awards) P(`    ${a.title}: ${a.winners.map((w) => w.name).join(' & ')} (${a.detail})`);
  P(`\n  REACHED NEW YORK (${f.survivors.length} named, plus ${f.fieldFinished} from the field)`);
  P(`    ${f.survivors.map((s) => s.name).join(', ')}`);
  P(`\n  THE FALLEN (${f.memorial.length})`);
  for (const m of f.memorial) P(`    ✝ ${m.name}: ${m.cause}${m.by ? `, by ${m.by}` : ''} (Stage ${m.stage}, ${m.round})`);
}

function table(head, rows) {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => '  ' + r.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('  ');
  console.log(line(head));
  for (const r of rows) console.log(line(r));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

// ---------------------------------------------------------------- milestone 4: Stands
function newStandStats() {
  return {
    palmOffers: 0, palmIn: 0, palmLog: {}, // band -> outcome -> n (PCs); plus 'canon', 'npc'
    gained: {}, // source -> tier -> n
    arrows: { found: 0, pierce: 0, keep: 0, leave: 0, used: 0, stand: 0, died: 0, already: 0, tiers: {} },
    roka: { found: 0, foundHuman: 0, gamesUnder2: 0, eaten: 0, kept: 0, left: 0, before: {}, after: {} },
    worth: {}, worthNoJoin: {}, // personality -> [end worthiness]
    arrowBands: {}, // band min -> { stand, died }
    deeds: {}, // personality -> { n, helps, spares } (PCs, whole game)
    holders: {}, // tier|none -> { n, points, ny, pc }
    winTier: {}, fieldTier: {}, pcWinTier: {}, pcFieldTier: {}, games: 0, breakouts: 0, share: {},
  };
}

function bump(o, k, n = 1) { o[k] = (o[k] ?? 0) + n; }

function collectStands(S, state, results, palm) {
  const T = S.st;
  T.games++;
  T.palmOffers += palm.offers; T.palmIn += palm.in;
  for (const e of state.race.palmLog ?? []) {
    const key = e.tier === 'pc' ? `PCs, Worthiness ${e.band}+` : e.tier === 'canon' ? 'canon' : 'NPCs';
    bump((T.palmLog[key] ??= {}), e.outcome);
    // The table in DESIGN.md is for racers who can still get a Stand.
    if (e.tier === 'pc' && !e.hadStand) bump((T.palmLog[`PCs Standless, Worthiness ${e.band}+`] ??= {}), e.outcome);
    if (e.tier === 'pc' && e.hadStand) T.palmHolders = (T.palmHolders ?? 0) + 1;
  }
  for (const e of state.stands.log) if (e.source !== 'canon') bump((T.gained[e.source] ??= {}), e.tier);
  T.breakouts += state.field.breakouts ?? 0;
  for (const e of state.race.arrowLog ?? []) {
    if (e.event === 'found') { T.arrows.found++; bump(T.arrows, e.choice); }
    else if (e.event === 'used') T.arrows.used++;
    else if (e.outcome) {
      bump(T.arrows, e.outcome); if (e.tier) bump(T.arrows.tiers, e.tier);
      const band = RULES.arrows.survive.find((b) => (e.worthiness ?? 50) >= b.min).min;
      bump((T.arrowBands[band] ??= {}), e.outcome);
    }
  }
  let human = 0;
  for (const e of state.race.rokakakaLog ?? []) {
    if (e.event === 'found') {
      T.roka.found++; if (e.human) { T.roka.foundHuman++; human++; }
      if (e.choice === 'keep') T.roka.kept++; else if (e.choice === 'leave') T.roka.left++;
    } else if (e.event === 'eaten') {
      T.roka.eaten++;
      bump(T.roka.before, e.tierBefore ?? 'none');
      const later = state.stands.log.slice(e.logIndex ?? 0).find((x) => x.racerId === e.racerId);
      bump(T.roka.after, later ? later.tier : 'none (stayed Standless)');
    }
  }
  if (human < 2) {
    // Allowed only when no human PC was left racing to find one.
    const drops = (state.race.rokakakaLog ?? []).filter((e) => e.event === 'dropped');
    if (drops.some((e) => e.humansRacing > 0)) T.roka.gamesUnder2++;
    else T.roka.noHumansLeft = (T.roka.noHumansLeft ?? 0) + 1;
    (T.roka.why ??= []).push(drops);
  }
  for (const p of state.players) (T.worth[p.personality] ??= []).push(p.worthiness);
  for (const p of state.players) if (!p.valentine?.joined) (T.worthNoJoin[p.personality] ??= []).push(p.worthiness);
  for (const p of state.players) { const d = (T.deeds[p.personality] ??= { n: 0, helps: 0, spares: 0 }); d.n++; d.helps += p.helps ?? 0; d.spares += p.spares ?? 0; }
  // Stand holders (the Stand they held at the end, or when they died) vs non-holders.
  const named = [...state.players, ...state.canon];
  for (const r of named) {
    const k = r.stand?.tier ?? 'none';
    const h = (T.holders[k] ??= { n: 0, points: 0, ny: 0, pcN: 0, pcPoints: 0, pcNy: 0 });
    h.n++; h.points += r.points; if (r.status === 'racing') h.ny++;
    if (r.tier === 'pc') { h.pcN++; h.pcPoints += r.points; if (r.status === 'racing') h.pcNy++; }
    bump(T.fieldTier, k);
    if (r.tier === 'pc') bump(T.pcFieldTier, k);
  }
  const winner = results.at(-1).finale.podium[0];
  if (winner) {
    const r = named.find((x) => x.id === winner.id);
    bump(T.winTier, r?.stand?.tier ?? (r ? 'none' : 'pack leader'));
    if (r?.tier === 'pc') bump(T.pcWinTier, r.stand?.tier ?? 'none');
  }
}

function printStands(S) {
  const T = S.st, g = T.games;
  const f1 = (n) => n.toFixed(1);
  const pct = (n, d) => `${((100 * n) / (d || 1)).toFixed(0)}%`;
  const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

  console.log("\nDevil's Palm");
  console.log(`  PC offers ${f1(T.palmOffers / g)} per game, went in ${pct(T.palmIn, T.palmOffers)}`);
  table(['Who (band)', 'entries/game', 'Stand', 'nothing', 'lost', 'died'],
    Object.entries(T.palmLog).sort().map(([k, o]) => {
      const n = Object.values(o).reduce((a, b) => a + b, 0);
      return [k, f1(n / g), pct(o.stand ?? 0, n), pct(o.nothing ?? 0, n), pct((o.lost ?? 0) + (o.retired ?? 0), n), pct(o.dies ?? 0, n)];
    }));
  console.log(`  NPC breakouts: ${f1(T.breakouts / g)} per game`);

  console.log('\nPCs holding a Stand (living holders)');
  console.log('  ' + Object.entries(T.share).map(([st, a]) => `end of Stage ${st}: ${pct(avg(a.map((x) => x.ofAll)), 1)} of all PCs (${pct(avg(a.map((x) => x.ofLiving)), 1)} of those alive)`).join(' · '));
  console.log(`  holding one at the end or when they died: ${pct((T.pcFieldTier.legendary ?? 0) + (T.pcFieldTier.rare ?? 0) + (T.pcFieldTier.common ?? 0), Object.values(T.pcFieldTier).reduce((a, b) => a + b, 0), 1)} of all PCs`);
  console.log(`  PC Palm entries by racers who already had a Stand: ${f1((T.palmHolders ?? 0) / g)} per game (a Stand roll is "nothing" for them)`);

  console.log('\nStands gained during the race (per game)');
  const tiers = ['legendary', 'rare', 'common'];
  table(['Source', 'Legendary', 'Rare', 'Common', 'total'],
    Object.entries(T.gained).map(([src, o]) => [src, ...tiers.map((t) => f1((o[t] ?? 0) / g)), f1(tiers.reduce((n, t) => n + (o[t] ?? 0), 0) / g)]));

  const A = T.arrows;
  console.log('\nStand Arrows');
  console.log(`  found ${f1(A.found / g)} per game: pierce now ${pct(A.pierce ?? 0, A.found)}, keep ${pct(A.keep ?? 0, A.found)}, leave ${pct(A.leave ?? 0, A.found)}; kept ones used later ${f1(A.used / g)} per game`);
  const tries = (A.stand ?? 0) + (A.died ?? 0);
  console.log(`  piercings: ${f1(tries / g)} per game, survived ${pct(A.stand ?? 0, tries)} (${tiers.map((t) => `${t} ${A.tiers[t] ?? 0}`).join(', ')}), died ${pct(A.died ?? 0, tries)}; "won't take" ${A.already ?? 0}`);

  const R = T.roka;
  console.log('\nRokakaka');
  console.log(`  found ${f1(R.found / g)} per game (${f1(R.foundHuman / g)} by human PCs, ${R.found - R.foundHuman} by anyone else); games with fewer than 2 while a human was still racing: ${R.gamesUnder2} ${R.gamesUnder2 ? 'FAIL' : 'ok'} (fewer because every human was out: ${R.noHumansLeft ?? 0})`);
  if (R.why) console.log('  short games: ' + JSON.stringify(R.why));
  console.log(`  eaten ${pct(R.eaten, R.found)} · kept ${pct(R.kept, R.found)} · left ${pct(R.left, R.found)}`);
  console.log(`  tier before eating: ${JSON.stringify(R.before)} · next Stand after: ${JSON.stringify(R.after)}`);

  console.log('  piercings by Worthiness band (everyone): ' + Object.entries(T.arrowBands).sort((x, y) => y[0] - x[0])
    .map(([b, o]) => `${b}+: ${(o.stand ?? 0) + (o.died ?? 0)} tries, survived ${pct(o.stand ?? 0, (o.stand ?? 0) + (o.died ?? 0))} (rule ${RULES.arrows.survive.find((x) => x.min === +b).p}%)`).join(' · '));

  console.log('\nWorthiness at the end of the race (PCs; start by personality; 10th–90th percentile)');
  table(['Personality', 'start', 'end avg', '10th–90th', 'end at 100', 'end below 25'], Object.entries(T.worth).map(([k, a]) => {
    const sorted = a.slice().sort((x, y) => x - y), q = (f) => sorted[Math.floor(f * (sorted.length - 1))];
    return [k, RULES.worthiness.byPersonality[k], f1(avg(a)), `${q(0.1)}–${q(0.9)}`, pct(a.filter((x) => x >= 100).length, a.length), pct(a.filter((x) => x < 25).length, a.length)];
  }));

  console.log('  without Valentine joiners (joining costs −30): ' + Object.entries(T.worthNoJoin).map(([k, a]) => `${k} ${f1(avg(a))} (below 25: ${pct(a.filter((x) => x < 25).length, a.length)})`).join(' · '));
  console.log('  helps and spares per PC per game: ' + Object.entries(T.deeds).map(([k, d]) => `${k} ${f1(d.helps / d.n)} + ${f1(d.spares / d.n)} = ${f1((d.helps + d.spares) / d.n)}`).join(' · '));
  console.log('\nStand holders vs non-holders (Stand at the end of the race; PCs + canon)');
  const order = ['legendary', 'rare', 'common', 'none'];
  table(['Stand tier', 'racers/game', 'avg points', 'reach NY', 'PC avg points', 'PC reach NY', 'win share', 'field share', 'win/field'],
    order.filter((k) => T.holders[k]).map((k) => {
      const h = T.holders[k];
      const win = (T.winTier[k] ?? 0) / g;
      const field = (T.fieldTier[k] ?? 0) / Object.values(T.fieldTier).reduce((a, b) => a + b, 0);
      return [k, f1(h.n / g), f1(h.points / h.n), pct(h.ny, h.n), h.pcN ? f1(h.pcPoints / h.pcN) : '-', h.pcN ? pct(h.pcNy, h.pcN) : '-',
        pct(win, 1), pct(field, 1), `${(win / (field || 1)).toFixed(2)}`];
    }));
  // The check: among PCs (where Stands come from the Palm and Arrows), a tier's
  // share of wins vs its share of PCs. Over 2x means that tier is too strong.
  const pcWins = Object.values(T.pcWinTier).reduce((a, b) => a + b, 0);
  const pcField = Object.values(T.pcFieldTier).reduce((a, b) => a + b, 0);
  console.log('  PCs only: ' + order.filter((k) => T.pcFieldTier[k]).map((k) => {
    const r = ((T.pcWinTier[k] ?? 0) / (pcWins || 1)) / ((T.pcFieldTier[k] ?? 0) / pcField);
    const limit = RULES.tierWinLimit[k];
    return `${k} wins ${pct(T.pcWinTier[k] ?? 0, pcWins)} of PC wins vs ${pct(T.pcFieldTier[k], pcField)} of PCs = ${r.toFixed(2)}x${limit ? ` (limit ${limit}x)${r > limit ? ' FAIL' : ''}` : ''}`;
  }).join('\n            '));
}

/** Sim assumption for people: use a kept Arrow when Standless (35% a window), eat a kept Rokakaka when holding a Common Stand (25%). */
/**
 * Sim people trade a little: an Arrow they can't use (they have a Stand) is
 * gifted to a racing PC without one; on foot, they offer an item for a horse.
 */
function simPeopleTrade(state, rng) {
  const racing = state.players.filter((x) => x.status === 'racing');
  for (const p of state.players.slice(0, HUMANS)) {
    if (p.status !== 'racing' || !rng.chance(0.3)) continue;
    const mine = (state.items ?? []).filter((i) => i.owner === p.id && !i.pendingUse);
    const arrow = mine.find((i) => i.kind === 'arrow');
    if (arrow && p.stand) {
      const to = rng.pick(racing.filter((x) => x.id !== p.id && !x.stand));
      if (to) offerTrade(state, p.id, { give: arrow.id, to: to.id });
    }
  }
}

function simPeopleUseItems(state, rng) {
  for (const it of state.items ?? []) {
    const p = state.players.find((x) => x.id === it.owner);
    if (!p || p.isAI || it.pendingUse || p.status !== 'racing') continue;
    if (it.kind === 'arrow' && !p.stand && rng.chance(0.6)) useItem(state, p.id, it.id);
    if (it.kind === 'rokakaka' && p.stand?.tier === 'common' && rng.chance(0.25)) useItem(state, p.id, it.id);
    if (it.kind === 'part' && it.hidden && rng.chance(0.1)) useItem(state, p.id, it.id); // hold a hidden part after all
    if (it.kind === 'part' && it.merged && p.valentine?.joined && !it.pendingDeliver && rng.chance(RULES.valentine.aiDeliver)) useItem(state, p.id, it.id, 'deliver'); // joiners deliver like AI joiners
  }
}

// ---------------------------------------------------------------- milestone 5a: fights, horses, alliances, trading
function collectM5a(S, state) {
  const T = (S.m5a ??= { games: 0, fights: {}, byPers: {}, pvp: 0, reversals: 0, horse: {}, spent: 0, onFoot: 0, onFootPc: 0, ally: {}, trades: {}, rivalKills: 0 });
  T.games++;
  for (const f of state.race.fightLog ?? []) {
    bump(T.fights, f.kind);
    bump(T.fights, `${f.kind}:${f.outcome}`);
    const who = ['kill', 'kill-missed', 'spare', 'horse', 'part', 'searched'].includes(f.outcome) ? 'attacker' : f.outcome.startsWith('reversal') ? 'defender' : f.outcome;
    if (f.pvp) { T.pvp++; bump((T.pvpOut ??= {}), who); }
    bump((T.allOut ??= {}), `${f.kind}:${who}`);
    if (f.outcome.startsWith('reversal')) T.reversals++;
    // Kills vs spares for PCs who won as the attacker, or won defending.
    const side = f.outcome.startsWith('reversal') ? f.d : f.a;
    if (side.tier === 'pc' && ['kill', 'spare', 'horse', 'kill-missed', 'reversal-kill', 'reversal-spare'].includes(f.outcome)) {
      const k = (T.byPers[side.personality] ??= { kill: 0, spare: 0, horse: 0 });
      if (f.outcome.includes('kill')) k.kill++; else if (f.outcome.includes('spare')) k.spare++; else k.horse++;
    }
  }
  for (const h of state.race.horseLog ?? []) {
    bump(T.horse, `${h.event}:${h.tier}`);
    if (h.event === 'bought') T.spent += h.price;
  }
  for (const r of [...state.players, ...state.canon]) {
    if (r.status === 'racing' && r.mount === 'horse' && r.onFoot) { T.onFoot++; if (r.tier === 'pc') T.onFootPc++; }
  }
  for (const a of state.race.allyLog ?? []) bump(T.ally, a.event === 'formed' ? `formed:${a.how}` : a.event);
  for (const t of state.race.tradeLog ?? []) bump(T.trades, `${t.gift ? 'gift' : 'trade'}:${t.outcome}`);
}

function printM5a(S) {
  const T = S.m5a;
  const g = T.games;
  const f1 = (n) => n.toFixed(1);
  const per = (n) => f1((n ?? 0) / g);
  const F = T.fights;
  console.log('\nFights (per game)');
  for (const kind of ['rival', 'strike', 'attacked']) {
    const outs = ['kill', 'kill-missed', 'spare', 'horse', 'part', 'searched', 'escape', 'both-hurt', 'reversal-kill', 'reversal-spare'];
    console.log(`  ${kind.padEnd(9)} ${per(F[kind])}: ` + outs.filter((o) => F[`${kind}:${o}`]).map((o) => `${o} ${per(F[`${kind}:${o}`])}`).join(' · '));
  }
  const O = T.pvpOut ?? {};
  const aw = O.attacker ?? 0, dw = O.defender ?? 0;
  console.log(`  PC vs PC: ${per(T.pvp)} fights per game · attacker wins ${per(aw)}, defender wins ${per(dw)}, escaped ${per(O.escape)}, both hurt ${per(O['both-hurt'])} · attacker win rate ${Math.round((100 * aw) / (aw + dw || 1))}% of decided fights`);
  const AO = T.allOut ?? {};
  console.log('  attacker win rate by kind (all fights, decided): ' + ['rival', 'strike', 'attacked'].map((k) => {
    const a = AO[`${k}:attacker`] ?? 0, d = AO[`${k}:defender`] ?? 0;
    return `${k} ${Math.round((100 * a) / (a + d || 1))}%`;
  }).join(' · ') + '  (attacked = an NPC attacks a PC)');
  // How much a Stand matters in a fight: a Stand user vs an equal racer without one.
  const rows = ['common', 'rare', 'legendary'].map((tier) => {
    const rng = new Rng('standfight-' + tier);
    const ctx = { state: { players: [], canon: [], field: { packLeaders: [], kept: [] } }, rng };
    const a = { tier: 'pc', skill: 65, stand: { tier } }, b = { tier: 'pc', skill: 65 };
    let win = 0, lose = 0, close = 0;
    for (let i = 0; i < 20000; i++) {
      const m = fightScore(ctx, a).score - fightScore(ctx, b).score;
      if (Math.abs(m) < RULES.fights.close) close++; else if (m > 0) win++; else lose++;
    }
    return `${tier} +${RULES.standTier[tier].fightBonus}: wins ${Math.round((100 * win) / (win + lose))}% of decided fights (${Math.round((100 * close) / 20000)}% end with both hurt)`;
  });
  console.log('  Stand user vs an equal racer without one: ' + rows.join(' · '));
  console.log('  PCs who won a fight chose (whole sim): ' + Object.entries(T.byPers).map(([k, v]) => {
    const n = v.kill + v.spare + v.horse || 1;
    return `${k} kill ${Math.round((100 * v.kill) / n)}% / spare ${Math.round((100 * v.spare) / n)}% / horse ${Math.round((100 * v.horse) / n)}%`;
  }).join(' · '));
  const H = T.horse;
  console.log('\nHorses (per game)');
  console.log(`  lost: PCs ${per(H['lost:pc'])}, canon ${per(H['lost:canon'])} · bought: PCs ${per(H['bought:pc'])}, canon ${per(H['bought:canon'])} (${per(T.spent)} points spent; ${f1(T.spent / ((H['bought:pc'] ?? 0) + (H['bought:canon'] ?? 0) || 1))} per horse)`);
  console.log(`  riderless horses caught ${per((H['riderless:pc'] ?? 0) + (H['riderless:canon'] ?? 0))} · taken in fights or betrayals ${per((H['taken:pc'] ?? 0) + (H['taken:canon'] ?? 0) + (H['taken:npc'] ?? 0))}`);
  console.log(`  Riders on foot at the end: ${per(T.onFoot)} (PCs ${per(T.onFootPc)})`);
  console.log('  stage points by what a PC rides: ' + ['on foot', 'nag', 'sound', 'fine', 'thoroughbred'].filter((k) => HORSE_VALUE[k]).map((k) => `${k} ${f1(HORSE_VALUE[k].pts / HORSE_VALUE[k].n)}`).join(' · '));
  const A = T.ally;
  console.log('\nAlliances (per game)');
  console.log(`  formed ${per((A['formed:pc'] ?? 0) + (A['formed:canon'] ?? 0) + (A['formed:npc'] ?? 0) + (A['formed:event'] ?? 0))} (PC+PC ${per(A['formed:pc'])}, PC+canon ${per(A['formed:canon'])}, PC+NPC ${per((A['formed:npc'] ?? 0) + (A['formed:event'] ?? 0))}) · refused ${per(A.refused)} · abandoned ${per(A.abandoned)} · betrayed ${per(A.betrayed)} · ended by a death ${per(A.ended)}`);
  console.log('\nTrades (per game, sim people only)');
  console.log('  ' + (Object.entries(T.trades).map(([k, v]) => `${k} ${per(v)}`).join(' · ') || 'none'));
}

// ---------------------------------------------------------------- milestone 5b: corpse parts, agents, Valentine
function partsSnapshot(state, stage) {
  const by = { pc: 0, canon: 0, npc: 0, president: 0, loose: 0 };
  for (const p of state.corpse.parts) {
    if (p.status === 'president') by.president++;
    else if (p.status === 'loose' || p.status === 'finding') by.loose++;
  }
  for (const it of (state.items ?? []).filter((i) => i.kind === 'part')) {
    const r = [...state.players, ...state.canon].find((x) => x.id === it.owner);
    by[r ? r.tier : 'npc']++;
  }
  return { stage, ...by };
}

function collectM5b(S, state, results, partsByStage) {
  const T = (S.m5b ??= {
    games: 0, byStage: {}, flow: {}, bands: {}, presMost: 0, presAll: 0, loveTrain: 0, maxHolder: [], pres: [],
    ambush: { holder: 0, none: 0, holderRounds: 0, hidden: 0 }, ambushOut: {}, agentDeaths: 0,
    fv: {}, offers: 0, joins: 0, joinBy: {}, offerBy: {}, joiners: { n: 0, ny: 0, points: 0, stands: 0, wins: 0, bonus: 0, worth: 0 },
    others: { n: 0, ny: 0, points: 0 }, pcN: 0, pcWins: 0, at4: 0, at4Wins: 0, refusers: { n: 0, ny: 0, points: 0, wins: 0 }, triggered: 0, errands: {}, holdersPc: 0, pcHeld: 0,
  });
  T.games++;
  for (const x of partsByStage) {
    const b = (T.byStage[x.stage] ??= { pc: 0, canon: 0, npc: 0, president: 0, loose: 0 });
    for (const k of Object.keys(b)) b[k] += x[k];
  }
  for (const e of state.corpse.log) {
    if (['found', 'given', 'palm', 'stolen', 'fight', 'from-body', 'traded'].includes(e.event)) bump(T.flow, `${e.event}:${e.toTier}`);
    if (e.event === 'president') bump(T.flow, `president:${e.how}`);
    if (e.event === 'loose') bump(T.flow, `loose:${e.how}`);
    if (e.event === 'found' && e.hidden) bump(T.flow, 'hidden');
    if (['merged', 'rejected-death', 'rejected-lost'].includes(e.event)) {
      const b = (T.bands[e.band] ??= { merged: 0, 'rejected-death': 0, 'rejected-lost': 0, pc: 0 });
      b[e.event]++;
      if (e.toTier === 'pc') b.pc++;
    }
  }
  const sum = corpseSummary(state);
  const top = sum.holders[0]?.parts.length ?? 0;
  const held = sum.holders.reduce((t, h) => t + h.parts.length, 0);
  T.pres.push(sum.president); T.maxHolder.push(top);
  if (sum.president > top) T.presMost++;
  if (sum.president > held) T.presAll++;
  if (top >= 5) T.loveTrain++;
  const pcHolders = sum.holders.filter((h) => h.tier === 'pc');
  T.holdersPc += pcHolders.length;
  T.pcHeld += pcHolders.reduce((t, h) => t + h.parts.length, 0);
  for (const a of state.race.agentLog ?? []) {
    if (a.event === 'ambush') { if (a.holder) T.ambush.holder++; else T.ambush.none++; }
    else if (a.event === 'died') T.agentDeaths++;
    else if (a.event === 'valentine') bump(T.fv, a.outcome);
  }
  for (const f of state.race.fightLog ?? []) if (['agents', 'errand', 'valentine'].includes(f.kind)) bump(T.ambushOut, `${f.kind}:${f.outcome}:${f.d.holder ? 'holder' : 'none'}`);
  // Holder-rounds for PCs (rough exposure: parts held at each Finish Line by PCs).
  for (const v of state.race.valentineLog ?? []) {
    if (v.event === 'offered') { T.offers++; bump(T.offerBy, v.personality); }
    if (v.event === 'joined') { T.joins++; bump(T.joinBy, v.personality); }
    if (v.event === 'errand') bump(T.errands, v.outcome);
    if (v.event === 'errand-picked') bump(T.errands, 'picked');
    if (v.event === 'errand-missed') bump(T.errands, 'missed');
    if (v.event === 'delivered') bump(T.errands, 'parts delivered');
  }
  if (state.race.valentineEnding?.triggered) T.triggered++;
  const winner = results.at(-1).finale.podium[0];
  for (const p of state.players) {
    T.pcN++;
    const j = !!p.valentine?.joined;
    const b = j ? T.joiners : T.others;
    b.n++; b.points += p.points; if (p.status === 'racing') b.ny++;
    if (j) {
      if (state.stands.log.some((e) => e.racerId === p.id && e.source === 'valentine')) T.joiners.stands++;
      if (p.valentine.bonus) T.joiners.bonus++;
      T.joiners.worth += p.worthiness;
    }
    if (winner?.id === p.id) { T.pcWins++; if (j) T.joiners.wins++; }
    // Survivorship: offers only reach PCs still racing in Stages 4–6.
    const out = (p.death && p.death.stage < 4) || (p.retiredAt && p.retiredAt.stage < 4);
    if (!out) { T.at4++; if (winner?.id === p.id) T.at4Wins++; }
    if (p.valentineOffered && !j) { const R = T.refusers; R.n++; R.points += p.points; if (p.status === 'racing') R.ny++; if (winner?.id === p.id) R.wins++; }
  }
}

function printM5b(S) {
  const T = S.m5b;
  const g = T.games;
  const f1 = (n) => n.toFixed(1);
  const f2 = (n) => n.toFixed(2);
  const per = (n) => f1((n ?? 0) / g);
  const pct = (n, d) => `${((100 * n) / (d || 1)).toFixed(0)}%`;
  const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

  console.log('\nCorpse parts: who holds them at each Finish Line (average parts per game)');
  table(['Stage', 'PCs', 'canon', 'NPCs', 'President', 'loose'], Object.entries(T.byStage).map(([st, b]) => [st, f1(b.pc / g), f1(b.canon / g), f1(b.npc / g), f1(b.president / g), f1(b.loose / g)]));
  const F = T.flow;
  const sumTier = (ev) => ['pc', 'canon', 'npc'].map((t) => `${t} ${per(F[`${ev}:${t}`])}`).join(', ');
  console.log(`  found: ${sumTier('found')} (hidden by PCs ${per(F.hidden)}) · out of the Palm: ${sumTier('palm')}`);
  console.log(`  given: ${sumTier('given')} · traded: ${sumTier('traded')} · stolen: ${sumTier('stolen')} · taken in fights: ${sumTier('fight')} · taken from a body: ${sumTier('from-body')}`);
  console.log(`  to the President: unclaimed at a Finish Line ${per(F['president:unclaimed'])} · from agents in fights ${per(F['president:fight'])} · from bodies ${per(F['president:from-body'])} · back on the trail: holder died alone ${per(F['loose:dropped'])}, rejected ${per(F['loose:rejected'])}`);
  console.log(`  end of race: President ${f1(avg(T.pres))} parts avg · the top racer holds ${f1(avg(T.maxHolder))} · PC holders ${per(T.holdersPc)} per game holding ${per(T.pcHeld)} parts`);
  console.log(`  President holds the most (more than any one racer): ${pct(T.presMost, g)} of games · more than every racer combined (the bad ending: joiners get the bonus): ${pct(T.presAll, g)} · a racer with 5+ parts (Love Train): ${pct(T.loveTrain, g)}`);

  console.log('\nRejections (every merge, everyone; rule: 75+ 0%, 60+ 3%, 45+ 8%, 25+ 18%, below 25 35%)');
  table(['Worthiness band', 'merges/game', 'PC share', 'accepted', 'rejected', 'died', 'lost the part'], Object.entries(T.bands).sort((a, b) => b[0] - a[0]).map(([band, b]) => {
    const n = b.merged + b['rejected-death'] + b['rejected-lost'];
    return [`${band}+`, f1(n / g), pct(b.pc, n), pct(b.merged, n), pct(b['rejected-death'] + b['rejected-lost'], n), pct(b['rejected-death'], n), pct(b['rejected-lost'], n)];
  }));

  console.log('\nAgent ambushes (per game)');
  console.log(`  on holders ${per(T.ambush.holder)} · on racers holding nothing ${per(T.ambush.none)} (share on holders ${pct(T.ambush.holder, T.ambush.holder + T.ambush.none)}) · agents killed ${per(T.agentDeaths)}`);
  const O = T.ambushOut;
  for (const kind of ['agents', 'errand', 'valentine']) {
    const rows = Object.entries(O).filter(([k]) => k.startsWith(kind + ':'));
    if (rows.length) console.log(`  ${kind}: ` + rows.sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.slice(kind.length + 1)} ${per(n)}`).join(' · '));
  }

  console.log('\nFunny Valentine (Stages 8–9; Rare+ Stand, Worthiness 60+, never joiners)');
  const fv = T.fv;
  const faced = Object.entries(fv).filter(([k]) => k !== 'avoided').reduce((t, [, n]) => t + n, 0);
  console.log(`  encounters ${per(faced + (fv.avoided ?? 0))} per game · faced ${per(faced)}, avoided ${per(fv.avoided)} · of those who faced him: drove him off ${pct(fv['reversal-spare'] ?? 0, faced)}, killed ${pct(fv.kill ?? 0, faced)}, lost their parts ${pct(fv.part ?? 0, faced)}, got away hurt ${pct((fv['kill-missed'] ?? 0) + (fv['both-hurt'] ?? 0) + (fv.searched ?? 0) + (fv.spare ?? 0), faced)}`);

  console.log('\nThe Valentine offer (Stages 4–6, secret)');
  console.log(`  offers ${per(T.offers)} per game · joins ${per(T.joins)} (${pct(T.joins, T.offers)}) · by personality: ` + Object.keys(T.offerBy).map((k) => `${k} ${T.joinBy[k] ?? 0}/${T.offerBy[k]}`).join(', '));
  const J = T.joiners, N = T.others;
  const share = J.n / T.pcN, winShare = J.wins / (T.pcWins || 1);
  console.log(`  joiners: reach NY ${pct(J.ny, J.n)} (others ${pct(N.ny, N.n)}) · avg points ${f1(J.points / (J.n || 1))} (others ${f1(N.points / (N.n || 1))}) · Stand from Valentine ${pct(J.stands, J.n)} · end Worthiness ${f1(J.worth / (J.n || 1))}`);
  console.log(`  joiners win ${pct(J.wins, T.pcWins)} of PC race wins vs ${pct(J.n, T.pcN)} of all PCs = ${f2(winShare / (share || 1))}x (old measure) · the ending bonus triggered in ${pct(T.triggered, g)} of games (${pct(J.bonus, J.n)} of joiners got it)`);
  const R = T.refusers;
  const at4Ratio = ((J.wins / (T.at4Wins || 1)) / ((J.n / (T.at4 || 1)) || 1));
  const lim = RULES.valentine.joinerWinLimit;
  console.log(`  THE CHECK (offers only reach PCs still racing in Stage 4): joiners win ${pct(J.wins, T.at4Wins)} of wins by PCs racing at Stage 4 vs ${pct(J.n, T.at4)} of those PCs = ${f2(at4Ratio)}x (limit ${lim}x)${at4Ratio > lim ? ' FAIL' : ''}`);
  console.log(`  PCs who refused: reach NY ${pct(R.ny, R.n)}, avg points ${f1(R.points / (R.n || 1))}, ${f2(((R.wins / (T.at4Wins || 1)) / ((R.n / (T.at4 || 1)) || 1)))}x on the same test`);
  console.log('  errands per game: ' + Object.entries(T.errands).map(([k, n]) => `${k} ${per(n)}`).join(' · '));
}

// ---------------------------------------------------------------- after the live tests: hunting, Arrows, fairness
function collectHunts(S, state, stageLog) {
  const T = (S.hunt ??= { bands: {}, streaks: [], longest: 0, arrows: { human: 0, ai: 0, humans: 0, ais: 0 } });
  const byPc = {};
  for (const row of stageLog.filter((r) => r.plan === 'corpse')) (byPc[row.id] ??= []).push(row);
  for (const [id, rows] of Object.entries(byPc)) {
    let run = 0, worst = 0, prev = null;
    for (const row of rows.sort((a, b) => a.stage - b.stage)) {
      const found = state.corpse.log.some((e) => e.to === id && ['found', 'palm'].includes(e.event) && e.stage === row.stage);
      const pc = state.players.find((x) => x.id === id);
      const alive = !(pc.death && pc.death.stage <= row.stage) || found;
      if (!alive && !found) continue; // died during the stage: not a fair dry stage
      const band = row.worthiness >= 60 ? '60+' : row.worthiness >= 45 ? '45–59' : row.worthiness >= 25 ? '25–44' : 'below 25';
      const b = (T.bands[band] ??= { n: 0, found: 0 });
      b.n++; if (found) b.found++;
      if (prev != null && row.stage !== prev + 1) run = 0; // a break in hunting resets the streak count
      run = found ? 0 : run + 1;
      worst = Math.max(worst, run);
      prev = row.stage;
    }
    if (rows.length >= 3) T.streaks.push(worst);
    T.longest = Math.max(T.longest, worst);
  }
  for (const e of state.race.arrowLog ?? []) if (e.event === 'found') { /* who found isn't logged per tier */ }
  for (const p of state.players) {
    if (p.isAI) T.arrows.ais++; else T.arrows.humans++;
  }
  for (const it of state.race.arrowFinds ?? []) T.arrows[it.human ? 'human' : 'ai']++;
}

function printHunts(S) {
  const T = S.hunt, g = S.games;
  const pct = (n, d) => `${((100 * n) / (d || 1)).toFixed(0)}%`;
  const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  console.log('\nHunt a corpse part (PC-stages on the plan; target 35–40% at average Worthiness)');
  console.log('  found a part that stage, by Worthiness at the Stage Plan: ' + ['60+', '45–59', '25–44', 'below 25'].filter((b) => T.bands[b]).map((b) => `${b} ${pct(T.bands[b].found, T.bands[b].n)} (${(T.bands[b].n / g).toFixed(1)}/game)`).join(' · '));
  const all = Object.values(T.bands).reduce((t, b) => ({ n: t.n + b.n, found: t.found + b.found }), { n: 0, found: 0 });
  console.log(`  overall ${pct(all.found, all.n)} · longest dry streak (hunting stages in a row with no find): ${T.longest} · per hunter with 3+ hunting stages: average worst streak ${avg(T.streaks).toFixed(1)}, ${pct(T.streaks.filter((x) => x >= 4).length, T.streaks.length)} go 4+ stages dry`);
  if (T.arrows.human + T.arrows.ai) console.log(`  Stand Arrows found per game: by human PCs ${(T.arrows.human / g).toFixed(1)} (${(T.arrows.human / (T.arrows.humans || 1)).toFixed(2)} per human PC), by AI PCs ${(T.arrows.ai / g).toFixed(1)} (${(T.arrows.ai / (T.arrows.ais || 1)).toFixed(2)} per AI PC)`);
  console.log('\nSub events per living PC per round, by personality (Valentine offers and errands apart)');
  const F = FAIR.byPers ?? {};
  const rates = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, f.prompts / (f.rounds || 1)]));
  const mean = Object.values(F).reduce((t, f) => t + f.prompts, 0) / (Object.values(F).reduce((t, f) => t + f.rounds, 0) || 1);
  console.log('  ' + Object.entries(rates).map(([k, r]) => `${k} ${r.toFixed(2)} (${r > mean * 1.2 ? 'OVER +20%' : `${((r / mean - 1) * 100).toFixed(0)}%`})`).join(' · ') + ` · average ${mean.toFixed(2)}`);
  console.log('  Valentine-only prompts per living PC per round: ' + Object.entries(F).map(([k, f]) => `${k} ${(f.valentine / (f.rounds || 1)).toFixed(3)}`).join(' · '));
}
