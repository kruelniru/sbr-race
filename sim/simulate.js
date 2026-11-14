#!/usr/bin/env node
// Headless race simulator for balance tuning. Runs full games with AI PCs and
// prints stats. Uses exactly the same engine as the host.
//
//   node sim/simulate.js                         100 games, 18 PCs
//   node sim/simulate.js --games 500 --players 12
//   node sim/simulate.js --runners 0.3           30% of PCs are Runners
//   node sim/simulate.js --seed abc --verbose    print one full game as text
//
// Tune numbers in data/rules.js, data/stages.js and event weights in data/events.

import RULES from '../data/rules.js';
import STAGES from '../data/stages.js';
import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { namedRacers } from '../js/engine/racers.js';
import { EVENTS, lintEvents } from '../js/engine/events.js';
import { buildCards, cardsSeconds } from '../js/engine/reveal.js';

// ---------------------------------------------------------------- args
const args = parseArgs(process.argv.slice(2));
const GAMES = args.verbose ? 1 : Number(args.games ?? 100);
const PLAYERS = Number(args.players ?? 18);
const RUNNERS = args.runners != null ? Number(args.runners) : null;
const SEED = args.seed ?? 'sim';

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
    const p = addPlayer(state, { isAI: true });
    const c = makeAiCharacter(rosterRng, taken);
    if (RUNNERS != null) c.mount = rosterRng.chance(RUNNERS) ? 'runner' : 'horse';
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  startRace(state);
  const results = [];
  while (!state.race.over) results.push(runRound(state));
  return { state, results };
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
  };
}

function collect(S, { state, results }) {
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
  const T = RULES.timing;
  const choices = STAGES.length * T.projectedStagePlan + results.length * T.projectedSubEventsPerRound;
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
  console.log(`  + projected choices (M3): everything ${f1(avg(S.projected))} min · side stories skipped ${f1(avg(S.projectedNoSide))} min  [target 30–40]`);

  const counts = EVENTS.map((e) => [e.id, S.eventCounts[e.id] ?? 0]).sort((a, b) => b[1] - a[1]);
  console.log('\nMost used events (per game)');
  for (const [id, n] of counts.slice(0, 8)) console.log(`  ${f1(n / g).padStart(5)}  ${id}`);
  const never = counts.filter(([, n]) => n === 0).map(([id]) => id);
  console.log(`Never used: ${never.length ? never.join(', ') : 'none'}`);

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
    P(`  ${r.name} (${r.tier === 'pc' ? 'PC' : 'canon'}, ${r.pronouns}, ${r.personality}, ${r.mount === 'runner' ? 'Runner' : `horse ${r.horse}`})`);
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
