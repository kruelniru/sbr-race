// The Valentine offer (milestone 5b, DESIGN.md → Joining Valentine). SECRET.
//
// Stages 4–6: 1–2 PCs a stage get a secret offer from "a man in a dark hat"
// (likelier with low Worthiness, and for Ruthless and Opportunist players;
// once per PC). Joining costs Worthiness −30, and the host announces only
// "Someone has fallen to the dark side." In return:
//   1. agents never ambush them (agents.js);
//   2. relay horses: +3 placement every remaining stage (placement.js);
//   3. a free Stand on the Arrow odds, with no risk, if they have none;
//   4. once a stage, a secret errand: pick a racer, then next round ambush
//      them masked ("a rider in a dark hat") with agent backup; a part taken
//      goes to the President, or else their horse;
//   5. if the President ends with more parts than every racer combined,
//      every joiner gets +100 points (valentineEnding, before the podium).
// A joiner can stay in an alliance; their errand can target their own ally.
//
// racer.valentine = { joined: true, stage, errandStage } | undefined
// racer.valentineOffered = true once offered.
// state.race.valentineDue: [{ stage, round, placed }]
// state.race.errands: [{ from, to, stage, due: roundNo, done }]
// state.race.valentineLog: [...] for the sim.

import RULES from '../../data/rules.js';
import { PART_LINES } from '../../data/corpse.js';
import { addWorthiness, addHint, namedRacers } from './racers.js';
import { giveStand, pickStand, rollTier } from './stands.js';
import { presidentParts } from './corpse.js';

const V = () => RULES.valentine;

export const isJoiner = (r) => !!r?.valentine?.joined;

/** Seeded at Start: which rounds of Stages 4–6 bring an offer. */
export function scheduleOffers(state, rng, plan) {
  const due = [];
  let n = 0;
  for (const s of plan) {
    const first = n + 1;
    n += s.types.length;
    if (!V().offerStages.includes(s.id)) continue;
    const rounds = s.types.map((t, i) => ({ t, round: first + i })).filter((x) => x.t !== 'finish').map((x) => x.round);
    const count = rng.int(V().perStage[0], V().perStage[1]);
    for (let i = 0; i < count; i++) due.push({ stage: s.id, round: rng.pick(rounds), placed: false });
  }
  state.race.valentineDue = due.sort((a, b) => a.round - b.round);
}

/** Weight for being offered: low Worthiness x2, Ruthless / Opportunist x1.5. */
export function offerWeight(p) {
  let w = 1;
  if ((p.worthiness ?? 50) < V().lowWorthiness) w *= V().lowMult;
  w *= V().personalityMult[p.personality] ?? 1;
  return w;
}

/** Offers due this round, with who gets them (free, racing PCs not yet offered). */
export function dueOffers(state, rng, roundNo, stageId, free) {
  const out = [];
  for (const d of (state.race.valentineDue ?? []).filter((x) => !x.placed && x.round <= roundNo)) {
    if (d.stage !== stageId) { d.placed = 'expired'; continue; }
    const pool = free.filter((p) => !p.valentineOffered && !out.includes(p));
    const pick = rng.weighted(pool, offerWeight);
    if (!pick) continue; // try again next round (same stage)
    d.placed = roundNo;
    pick.valentineOffered = true;
    out.push(pick);
  }
  return out;
}

export function log(ctx, entry) {
  (ctx.state.race.valentineLog ??= []).push({ stage: ctx.stage?.id, ...entry });
}

/** They said yes. */
export function joinValentine(ctx, p) {
  p.valentine = { joined: true, stage: ctx.stage.id, errandStage: ctx.stage.id };
  addWorthiness(p, RULES.worthiness.joinValentine, ctx);
  ctx.state.corpse?.announce.push(PART_LINES.darkSide);
  let stand = null;
  if (!p.stand) {
    // Reward 3: a Stand on the Arrow odds, with no death risk.
    stand = giveStand(ctx, p, pickStand(ctx.state, ctx.rng, rollTier(ctx.rng, 'arrow', p.worthiness ?? 50)), 'valentine');
  }
  addHint(p, "You shake the man's hand. From now on, the President's agents ride past you, and fresh horses wait at every relay.", ctx);
  if (stand) addHint(p, 'He presses a strange arrowhead into your palm. It slides in without a drop of blood. You are not alone anymore.', ctx);
  log(ctx, { event: 'joined', id: p.id, personality: p.personality, worthiness: p.worthiness, stand: stand?.tier ?? null });
}

export function refuseValentine(ctx, p) {
  addHint(p, 'You turn him down. The man in the dark hat tips it, and is gone.', ctx);
  log(ctx, { event: 'refused', id: p.id, personality: p.personality });
}

/** Errand targets: racing named racers (PCs, canon) and named NPCs, never yourself. */
export function errandTargets(state, self, rivalTargets) {
  return rivalTargets(state, self);
}

/** Reward 5, at the end of the race (before the podium). */
export function valentineEnding(state) {
  const held = (state.items ?? []).filter((i) => i.kind === 'part').length;
  const pres = presidentParts(state);
  const triggered = pres > held;
  state.race.valentineEnding = { president: pres, racers: held, triggered };
  if (!triggered) return;
  for (const r of namedRacers(state)) {
    if (isJoiner(r)) { r.points += V().endingBonus; r.valentine.bonus = V().endingBonus; }
  }
}
