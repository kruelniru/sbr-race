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
//
// Tune numbers in data/rules.js, data/stages.js and event weights in data/events.

import RULES from '../data/rules.js';
import STAGES from '../data/stages.js';
import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { needsStagePlans, openStagePlans, openSubEvents, closeChoices, starOption, answerLikeAi, useItem } from '../js/engine/choices.js';
import PLANS from '../data/plans.js';
import PERSONALITIES from '../data/personalities.js';
import { readFileSync } from 'node:fs';
import { namedRacers } from '../js/engine/racers.js';
import { EVENTS, lintEvents } from '../js/engine/events.js';
import { buildCards, cardsSeconds, cardSeconds } from '../js/engine/reveal.js';

// ---------------------------------------------------------------- args
const args = parseArgs(process.argv.slice(2));
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
  while (!state.race.over) {
    if (needsStagePlans(state)) {
      const w = openStagePlans(state);
      const pcsById = Object.fromEntries(state.players.map((x) => [x.id, x]));
      for (const pr of w.prompts) if (!pr.answer) answerLikeAi(timeRng, pr, pcsById[pr.playerId].personality, 'player');
      for (const pr of w.prompts) overrideAnswer(pr, timeRng);
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
        stageLog.push({ id: pc.id, stage: w.stageId, plan: pr.answer.optionId, star: pr.star, personality: pc.personality, start: pc.points });
      }
      closeChoices(state);
    }
    const w = openSubEvents(state);
    simPeopleUseItems(state, timeRng);
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
    closeChoices(state);
    const res = runRound(state);
    results.push(res);
    // Stand holders among PCs at the end of Stages 3, 6 and 9.
    if (res.placements && [3, 6, 9].includes(res.stage.id)) {
      const living = state.players.filter((x) => x.status !== 'dead');
      standShare.push({ stage: res.stage.id, ofAll: living.filter((x) => x.stand).length / state.players.length, ofLiving: living.filter((x) => x.stand).length / (living.length || 1) });
    }
  }
  return { state, results, stageLog, windows, timeRng, palm, standShare };
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

function collect(S, { state, results, stageLog, windows, timeRng, palm, standShare }) {
  collectStands(S, state, results, palm);
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
    worth: {}, // personality -> [end worthiness]
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
    return `${k} wins ${pct(T.pcWinTier[k] ?? 0, pcWins)} of PC wins vs ${pct(T.pcFieldTier[k], pcField)} of PCs = ${r.toFixed(2)}x${k !== 'none' && r > 2 ? ' FAIL' : ''}`;
  }).join('\n            '));
}

/** Sim assumption for people: use a kept Arrow when Standless (35% a window), eat a kept Rokakaka when holding a Common Stand (25%). */
function simPeopleUseItems(state, rng) {
  for (const it of state.items ?? []) {
    const p = state.players.find((x) => x.id === it.owner);
    if (!p || p.isAI || it.pendingUse || p.status !== 'racing') continue;
    if (it.kind === 'arrow' && !p.stand && rng.chance(0.6)) useItem(state, p.id, it.id);
    if (it.kind === 'rokakaka' && p.stand?.tier === 'common' && rng.chance(0.25)) useItem(state, p.id, it.id);
  }
}
