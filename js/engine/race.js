// The race loop. Pure: no DOM, no network. The host calls runRound() and
// then reveals the result; the headless sim calls it in a loop.
//
// Each round:
//   0. Choices (choices.js): Stage Plans at a stage's start, then sub events.
//      Their results lead the Main Story.
//   1. Shuffle every named racer who's alive.
//   2. Each one without an event yet gets a main event (canon racers ~50% of
//      rounds, retired racers ~25%). Being cast into someone else's event
//      counts as your event this round.
//   3. NPC field attrition -> field report.
//   4. Finish Line: placements and points.
//   5. Fallen list after Night rounds and at the end of each stage.

import RULES from '../../data/rules.js';
import STAGES from '../../data/stages.js';
import HORSES from '../../data/horse-names.js';
import { Rng } from './rng.js';
import { readyPlayers } from './state.js';
import { initPcRacer, makeCanonRacer, canonDefs, namedRacers, findRacer, startWorthiness } from './racers.js';
import { buildFinale } from './finale.js';
import { initField, fieldAttrition, fieldReportText } from './field.js';
import { runMainEvent } from './events.js';
import { placeStage, standings } from './placement.js';
import { prepareRound, resolveSubEvents } from './choices.js';

/** Round types for a stage with n rounds: Day/Night alternate, last is the Finish Line. */
export function roundTypes(n) {
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 'finish' : i % 2 === 0 ? 'day' : 'night'));
}

export function roundLabel(types, index) {
  const type = types[index];
  if (type === 'finish') return 'Finish Line';
  const count = types.slice(0, index + 1).filter((t) => t === type).length;
  return `${type === 'day' ? 'Day' : 'Night'} ${count}`;
}

export function startRace(state) {
  const rng = Rng.fromState(state.rngState);

  const plan = STAGES.map((s) => {
    const n = Array.isArray(s.rounds) ? rng.int(s.rounds[0], s.rounds[1]) : s.rounds;
    return { id: s.id, types: roundTypes(n) };
  });

  // Horses: canon horses first, then unique random names for everyone else.
  const defs = canonDefs(state);
  const usedHorses = new Set(defs.map((d) => d.horse).filter(Boolean));
  const freeHorses = rng.shuffle(HORSES.filter((h) => !usedHorses.has(h)));
  let h = 0;
  const nextHorse = () => freeHorses[h++ % freeHorses.length];

  for (const p of readyPlayers(state)) initPcRacer(p, p.mount === 'runner' ? null : nextHorse(), startWorthiness(rng, 'pc'));
  state.canon = defs.map((d) => makeCanonRacer(d, d.mount === 'runner' ? null : d.horse ?? nextHorse(), startWorthiness(rng, 'canon')));

  initField(state, rng);

  state.race = {
    plan,
    stageIdx: 0,
    roundIdx: 0,
    roundNo: 0,
    over: false,
    fallenSince: [],
    npcDeadSince: 0,
    memorial: [], // every named racer who died, in order (finale)
    history: [], // host-side: earlier rounds' reveals, for the Back button
    reveal: null, // host-side: { cards, index }
  };
  state.rngState = rng.getState();
}

export function currentStage(state) {
  return STAGES[state.race.stageIdx];
}

export function totalRounds(state) {
  return state.race.plan.reduce((n, s) => n + s.types.length, 0);
}

/** Resolve the next round. Returns a RoundResult (plain data). */
export function runRound(state) {
  const race = state.race;
  if (race.over) throw new Error('The race is over');
  // Choices come first: Stage Plans at a stage's start, then this round's sub
  // events. The host runs these with a timer; without one (sim, tests) they're
  // answered instantly here.
  if (!race.choice?.closed || race.choice.kind !== 'sub') prepareRound(state);
  const choice = race.choice;
  const rng = Rng.fromState(state.rngState);
  const stage = STAGES[race.stageIdx];
  const types = race.plan[race.stageIdx].types;
  const type = types[race.roundIdx];
  const label = roundLabel(types, race.roundIdx);
  race.roundNo++;

  const result = {
    roundNo: race.roundNo,
    stage: { id: stage.id, name: stage.name, from: stage.from, to: stage.to },
    type,
    label,
    lastRoundOfStage: type === 'finish',
    events: [],
    deaths: [],
    fieldReport: null,
    fallen: null,
    placements: null,
    standings: null,
    over: false,
    eventCounts: {},
  };
  const ctx = {
    state, rng, stage, type, roundLabel: label, result,
    assigned: new Set(), usedNpcs: new Set(), eventCounts: result.eventCounts,
    tally: { retired: 0, died: 0 },
  };

  // 1. Sub events (and Hunt a rival showdowns) resolve first and lead the
  //    Main Story. A sub event counts as that racer's event this round.
  result.events.push(...resolveSubEvents(ctx, choice));
  race.choice = null;

  // 2. Main events.
  for (const racer of rng.shuffle(namedRacers(state).filter((r) => r.status !== 'dead'))) {
    if (ctx.assigned.has(racer.id) || racer.status === 'dead') continue;
    if (racer.status === 'retired' && !rng.chance(RULES.retiredEventChance)) continue;
    if (racer.status === 'racing' && racer.tier === 'canon' && !rng.chance(RULES.canonEventChance)) continue;
    const line = runMainEvent(ctx, racer);
    if (line) result.events.push(line);
  }

  // 3. Field report (includes NPCs who died or retired in events).
  fieldAttrition(ctx);
  result.fieldReport = {
    retired: ctx.tally.retired,
    died: ctx.tally.died,
    remain: state.field.racing,
    text: fieldReportText(stage, ctx.tally, state.field, rng),
  };
  race.npcDeadSince += ctx.tally.died;

  // 4. Finish Line.
  if (type === 'finish') {
    result.placements = placeStage(state, rng, stage);
    result.standings = standings(state);
    result.standings.forEach((row, i) => {
      const r = findRacer(state, row.id);
      if (r && r.status === 'racing') r.rankHistory.push(i + 1);
    });
  }

  // 5. The Fallen.
  if (type === 'night' || type === 'finish') {
    if (race.fallenSince.length || race.npcDeadSince) {
      result.fallen = { named: race.fallenSince, npcs: race.npcDeadSince };
    }
    race.fallenSince = [];
    race.npcDeadSince = 0;
  }

  // Advance.
  race.roundIdx++;
  if (race.roundIdx >= types.length) {
    race.roundIdx = 0;
    race.stageIdx++;
    if (race.stageIdx >= STAGES.length) {
      race.over = true;
      result.over = true;
      result.finale = buildFinale(state);
    }
  }
  state.rngState = rng.getState();
  return result;
}

/** Header for the current (next) round, for screens. */
export function nextRoundHeader(state) {
  const race = state.race;
  if (!race || race.over) return null;
  const stage = STAGES[race.stageIdx];
  const types = race.plan[race.stageIdx].types;
  return {
    stageId: stage.id,
    stageName: stage.name,
    route: `${stage.from} → ${stage.to}`,
    label: roundLabel(types, race.roundIdx),
    roundsInStage: types.length,
  };
}

/**
 * Copy what the stream has now revealed into the "shown" snapshot that phones
 * read (privateView / publicView). Call after a round's reveal finishes.
 */
export function syncShown(state) {
  const race = state.race;
  for (const p of readyPlayers(state)) {
    const last = p.placements?.at(-1);
    p.shown = {
      status: p.status,
      mount: p.mount,
      horse: p.horse,
      onFoot: p.onFoot,
      points: p.points,
      kills: p.kills,
      lastPlacement: last ? { stage: last.stage, rank: last.rank } : null,
      death: p.death ? { cause: p.death.cause, stage: p.death.stage, by: p.death.by } : null,
    };
  }
  race.shownHeader = race.over ? { over: true } : nextRoundHeader(state);
}
