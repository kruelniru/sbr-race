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
import { startQuality, canonQuality } from './horses.js';
import { allyOf } from './alliances.js';
import { Rng } from './rng.js';
import { readyPlayers } from './state.js';
import { initPcRacer, makeCanonRacer, canonDefs, namedRacers, findRacer, startWorthiness, canonStartingStand } from './racers.js';
import { initStands, giveStand } from './stands.js';
import { CANON_STANDS, STAND_BY_ID } from '../../data/stands.js';
import { displayRoles } from './events.js';
import { render } from './text.js';
import { buildFinale } from './finale.js';
import './finale-sections.js'; // registers milestone 4+ finale sections
import { storyFor } from './secrets.js'; // registers the secrets reveal (milestone 6c)
import { initField, fieldAttrition, fieldReportText } from './field.js';
import { runMainEvent } from './events.js';
import { placeStage, standings } from './placement.js';
import { prepareRound, resolveSubEvents } from './choices.js';
import { initCorpse, processMerges, corpseFinishLine, announcements } from './corpse.js';
import { initAgents } from './agents.js';
import { scheduleOffers, valentineEnding } from './valentine.js';
import { resolveDeadVote, openDeadVote } from './dead.js';
import { decideEnding } from './endings.js';
import { otherWorldEnding } from './secret-endings.js';
import { recordRound } from './game-log.js';

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

  for (const p of readyPlayers(state)) initPcRacer(p, p.mount === 'runner' ? null : nextHorse(), startWorthiness(rng, 'pc', p.personality));
  state.canon = defs.map((d) => makeCanonRacer(d, d.mount === 'runner' ? null : d.horse ?? nextHorse(), startWorthiness(rng, 'canon')));
  // Horse quality (milestone 5): PCs roll theirs; canon horses are already in their skill.
  for (const p of readyPlayers(state)) if (p.mount === 'horse') p.horseQuality = startQuality(rng);
  for (const c of state.canon) if (c.mount === 'horse' && c.horse) { c.horseQuality = canonQuality(c); c.horseBase = c.horseQuality; }

  initField(state, rng);

  // Stands: canon racers who start with theirs. They stay hidden on stream
  // until a Stand event names them.
  initStands(state);
  for (const c of state.canon) {
    const def = canonStartingStand(c);
    if (def) giveStand({ state, rng, stage: null, roundLabel: 'start' }, c, def, 'canon');
  }

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
  scheduleStandEvents(state, rng);
  // Milestone 5b: the Saint's Corpse, Valentine's agents, the Valentine offer.
  initCorpse(state, rng, plan);
  initAgents(state);
  scheduleOffers(state, rng, plan);
  state.rngState = rng.getState();
}

/** Global round numbers (1-based) of every round in stages lo..hi. */
function roundsInStages(plan, lo, hi) {
  const out = [];
  let n = 0;
  for (const s of plan) {
    for (let i = 0; i < s.types.length; i++) {
      n++;
      if (s.id >= lo && s.id <= hi) out.push({ round: n, stage: s.id, roundIdx: i });
    }
  }
  return out;
}

/**
 * Seeded at Start: when Stand Arrows and Rokakaka turn up, and when Johnny
 * and Diego awaken their Stands.
 */
function scheduleStandEvents(state, rng) {
  const race = state.race;
  const A = RULES.arrows;
  const arrowSlots = roundsInStages(race.plan, A.stages[0], A.stages[1]);
  race.arrowsDue = Array.from({ length: rng.int(A.perGame[0], A.perGame[1]) }, () => ({ round: rng.pick(arrowSlots).round }))
    .sort((a, b) => a.round - b.round);
  // Rokakaka: the guaranteed ones land early enough to be retried before the deadline.
  const R = RULES.rokakaka;
  const early = roundsInStages(race.plan, R.stages[0], R.stages[1] - 1);
  const any = roundsInStages(race.plan, R.stages[0], R.stages[1]);
  race.rokakakaDue = Array.from({ length: R.guaranteed }, () => ({ round: rng.pick(early).round, guaranteed: true }));
  if (rng.chance(R.thirdChance)) race.rokakakaDue.push({ round: rng.pick(any).round, guaranteed: false });
  race.rokakakaDue.sort((a, b) => a.round - b.round);
  // Canon awakenings (Johnny: Stage 2 or 3; Diego: Stage 3).
  race.awakenings = [];
  for (const def of CANON_STANDS.filter((s) => s.awakens)) {
    if (!state.canon.some((c) => c.canonStand === def.id)) continue;
    const slots = roundsInStages(race.plan, Math.min(...def.awakens), Math.max(...def.awakens));
    race.awakenings.push({ standId: def.id, round: rng.pick(slots).round });
  }
}

const AWAKEN_LINES = {
  'tusk-act-1': "{a}'s fingernails start to spin.",
  'scary-monsters': '{a} wakes from a fever with a taste for raw meat.',
};

/** Johnny and Diego awaken their Stands on their seeded round. */
function canonAwakenings(ctx) {
  const lines = [];
  for (const aw of ctx.state.race.awakenings ?? []) {
    if (aw.done || aw.round > ctx.state.race.roundNo) continue;
    const racer = ctx.state.canon.find((c) => c.canonStand === aw.standId);
    if (racer && ctx.assigned.has(racer.id) && racer.status !== 'dead') continue; // in another line this round: next round
    aw.done = true;
    if (!racer || racer.status === 'dead' || racer.stand) continue;
    giveStand(ctx, racer, STAND_BY_ID[aw.standId], 'awaken');
    ctx.assigned.add(racer.id);
    lines.push({
      eventId: `awaken-${aw.standId}`, text: render(AWAKEN_LINES[aw.standId] ?? '{a} feels something stir.', displayRoles({ a: racer })),
      ids: [racer.id], names: [{ name: racer.name, tier: racer.tier }], minor: false, death: false, tags: ['stand'], side: racer.status !== 'racing',
    });
  }
  return lines;
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
  // 0. The dead act first (their vote from the last reveal), so a Blessing covers this round.
  result.events.push(...resolveDeadVote(ctx));
  result.events.push(...resolveSubEvents(ctx, choice));
  result.events.push(...canonAwakenings(ctx));
  race.choice = null;

  // 2. Main events.
  for (const racer of rng.shuffle(namedRacers(state).filter((r) => r.status !== 'dead'))) {
    if (ctx.assigned.has(racer.id) || racer.status === 'dead') continue;
    if (racer.status === 'retired' && !rng.chance(RULES.retiredEventChance)) continue;
    if (racer.status === 'racing' && racer.tier === 'canon' && !rng.chance(RULES.canonEventChance)) continue;
    const line = runMainEvent(ctx, racer);
    if (line) result.events.push(line);
  }

  // 2b. Corpse parts that came to someone this round merge (or reject them).
  result.events.push(...processMerges(ctx, { all: type === 'finish' && race.stageIdx === STAGES.length - 1 }));
  if (type === 'finish') corpseFinishLine(ctx);
  // Anonymous host lines ("Someone has been deemed worthy of the Saint.").
  result.events.push(...announcements(state));

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
      decideEnding(state);    // the main ending (and the boss's bonus), before the podium
      valentineEnding(state); // reward 5 and every joiner's outcome
      otherWorldEnding(state); // D4C: stay in this world, or fade back
      result.finale = buildFinale(state);
    }
  }
  // The dead vote on the next round while this one is revealed.
  openDeadVote(state);
  recordRound(state, result); // the exported game log
  if (result.finale) race.finale = result.finale;
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

/** Who this racer rides with (alliances are public: the stream announces them). */
function allyName(state, p) {
  const a = allyOf(state, p);
  return a ? a.name : null;
}

/** Where the next horse trader is, from where the race stands now. */
export function nextTraderText(state) {
  const race = state.race;
  if (!race || race.over) return null;
  // The next Stage Plan window: this stage's if it hasn't opened yet, otherwise the next stage's.
  const nextPlan = race.roundIdx === 0 ? race.stageIdx + 1 : race.stageIdx + 2;
  const town = RULES.horses.townStages.find((s) => s >= nextPlan);
  if (!town) return 'No more horse traders ahead. A riderless horse is your only chance.';
  return `The next horse trader is at the start of Stage ${town}, leaving ${STAGES[town - 1].from}.`;
}

/**
 * Big private changes since the last reveal become phone alerts (shown once,
 * after the round has been revealed, so nothing spoils the stream).
 * level 'big' (flashing): losing your horse. 'calm': everything else.
 */
function addAlerts(state, p, prev, next) {
  const add = (level, title, text) => {
    p.alertSeq = (p.alertSeq ?? 0) + 1;
    (p.alerts ??= []).push({ id: p.alertSeq, level, title, text });
    if (p.alerts.length > 6) p.alerts.splice(0, p.alerts.length - 6);
  };
  const alive = next.status !== 'dead';
  if (p.mount === 'horse' && !prev.onFoot && next.onFoot && alive && p.horseLossHow !== 'given') {
    add('big', p.horseLossHow === 'taken' ? 'YOUR HORSE WAS TAKEN' : 'YOUR HORSE IS DEAD',
      `You're on foot and far slower. Buy one at the next town, or take a riderless horse. ${next.nextTrader ?? ''}`.trim());
  }
  if (p.mount === 'horse' && prev.onFoot && !next.onFoot && alive) add('calm', 'You have a horse again', `${next.horse}${next.horseQuality ? `, a ${next.horseQuality} horse` : ''}.`);
  if (!prev.stand && next.stand) add('calm', 'You have a Stand', `${next.stand.name} (${next.stand.tier}). Only you know.`);
  if (prev.stand && !next.stand && alive) add('calm', 'Your Stand is gone', `${prev.stand.name} has left you.`);
  for (const name of next.parts ?? []) if (!(prev.parts ?? []).includes(name)) add('calm', 'A corpse part is yours', `${name.charAt(0).toUpperCase() + name.slice(1)}. Only you know.`);
  if (alive) for (const name of prev.parts ?? []) if (!(next.parts ?? []).includes(name)) add('calm', 'You lost a corpse part', `${name.charAt(0).toUpperCase() + name.slice(1)} is no longer with you.`);
  if (!prev.injured && next.injured && alive) add('calm', "You're badly hurt", 'It costs you placement until this stage ends.');
  if (prev.allyId && next.allyId !== prev.allyId && alive) {
    const a = state.players.concat(state.canon ?? []).find((r) => r.id === prev.allyId)
      ?? state.field?.kept.find((n) => n.id === prev.allyId) ?? state.field?.packLeaders.find((n) => n.id === prev.allyId);
    if (a?.status === 'dead') add('calm', 'Your ally is dead', `${a.name} won't ride with you anymore.`);
    else add('calm', 'Your alliance is over', `${a?.name ?? 'Your ally'} no longer rides with you.`);
  }
}

/** The phone's Worthiness bar: a coarse level (0..barSteps), never the number. */
export function worthinessLevel(w) {
  const steps = RULES.worthiness.barSteps;
  return w == null ? null : Math.round(((w ?? 0) / 100) * steps);
}

/**
 * Copy what the stream has now revealed into the "shown" snapshot that phones
 * read (privateView / publicView). Call after a round's reveal finishes.
 */
export function syncShown(state) {
  const race = state.race;
  for (const p of readyPlayers(state)) {
    const last = p.placements?.at(-1);
    const prev = p.shown;
    const parts = (state.items ?? []).filter((i) => i.kind === 'part' && i.owner === p.id).map((i) => i.label);
    const settling = !p.stand && (race.mergeQueue ?? []).some((q) => (state.items ?? []).some((i) => i.id === q.id && i.owner === p.id));
    const injured = !!(p.injured || p.hurtThisStage);
    p.hurtThisStage = false;
    p.shown = {
      status: p.status,
      mount: p.mount,
      horse: p.horse,
      horseQuality: p.horseQuality ?? null,
      onFoot: p.onFoot,
      ally: allyName(state, p),
      points: p.points,
      kills: p.kills,
      lastPlacement: last ? { stage: last.stage, rank: last.rank } : null,
      death: p.death ? { cause: p.death.cause, stage: p.death.stage, by: p.death.by } : null,
      // Private to this player (privateView only). Never the source of a Stand.
      stand: p.stand ? { name: p.stand.name, tier: p.stand.tier, flavor: STAND_BY_ID[p.stand.id]?.flavor ?? '' } : null,
      worthinessLevel: worthinessLevel(p.worthiness),
      hints: (p.hints ?? []).slice(-5),
      valentineOutcome: p.valentine?.outcome ?? null,
      // Milestone 5b: phone alerts and status.
      allyId: allyOf(state, p)?.id ?? null,
      parts,
      settling,            // a corpse part is merging: the Stand card says so
      injured,
      nextTrader: p.mount === 'horse' && p.onFoot ? nextTraderText(state) : null,
      // Milestone 6c: your own story, once the last round has been revealed.
      story: race.over ? storyFor(state, p) : null,
    };
    if (prev && race) addAlerts(state, p, prev, p.shown);
    // Alerts queued by the engine this round (trades, fights, items...).
    for (const a of p.pendingAlerts ?? []) {
      p.alertSeq = (p.alertSeq ?? 0) + 1;
      (p.alerts ??= []).push({ id: p.alertSeq, ...a });
    }
    p.pendingAlerts = [];
    if ((p.alerts ?? []).length > 6) p.alerts.splice(0, p.alerts.length - 6);
    p.shown.alerts = (p.alerts ?? []).slice(-6);
  }
  race.shownHeader = race.over ? { over: true } : nextRoundHeader(state);
}
