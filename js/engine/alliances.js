// Alliances (milestone 5, DESIGN.md → Alliances). One ally at a time.
//
// racer.ally = the other racer's id (both sides point at each other). Allies
// help in each other's fights (rules.fights.ally), share food (help events),
// and ride double when one is on foot (rules.horses.doubleRide). Points stay
// individual. An alliance ends when one of them dies, abandons or betrays
// the other (−12 Worthiness, rules.worthiness.abandonAlly).
//
// state.race.allyLog: [{ event: 'formed' | 'refused' | 'abandoned' | 'betrayed' | 'ended', ... }] for the sim.

import RULES from '../../data/rules.js';
import { namedRacers, findRacerAnywhere, addWorthiness, addHint } from './racers.js';
import { keepNpc } from './field.js';
import { standings } from './placement.js';

export function allyOf(state, racer) {
  if (!racer?.ally) return null;
  const a = findRacerAnywhere(state, racer.ally);
  return a && a.status !== 'dead' && a.ally === racer.id ? a : null;
}

/** On foot, with an ally still on a horse and still racing: ride double. */
export function ridesDouble(state, racer) {
  const a = allyOf(state, racer);
  return !!a && a.status === 'racing' && a.mount === 'horse' && !a.onFoot && !a.animal;
}

export function formAlliance(ctx, a, b, how) {
  if (!a || !b || a.id === b.id || a.ally || b.ally) return false;
  a.ally = b.id;
  b.ally = a.id;
  if (b.tier === 'npc') keepNpc(ctx.state, b);
  if (a.tier === 'npc') keepNpc(ctx.state, a);
  log(ctx.state, { event: 'formed', how, tiers: [a.tier, b.tier], stage: ctx.stage?.id });
  for (const [x, y] of [[a, b], [b, a]]) addHint(x, `You ride with ${y.name} now.`, ctx);
  return true;
}

/**
 * End an alliance. `kind`: 'abandoned' | 'betrayed' (the breaker loses
 * Worthiness) or 'ended' (death, no blame).
 */
export function breakAlliance(ctx, breaker, kind = 'ended') {
  const other = breaker?.ally ? findRacerAnywhere(ctx.state, breaker.ally) : null;
  if (breaker) breaker.ally = null;
  if (other && other.ally === breaker.id) other.ally = null;
  if (kind !== 'ended') addWorthiness(breaker, RULES.worthiness.abandonAlly, ctx);
  log(ctx.state, { event: kind, tier: breaker?.tier, stage: ctx.stage?.id });
  if (other && kind !== 'ended') addHint(other, `${breaker.name} is no longer riding with you.`, ctx);
  return other;
}

/** A racer died: their alliance ends quietly. */
export function allyDied(ctx, who) {
  if (who.ally) breakAlliance(ctx, who, 'ended');
}

/**
 * Does a canon racer agree to ride with `asker`? Character fit
 * (rules.alliances.canon): Gyro takes in the worthy, Diego rarely unless
 * it helps Diego (the asker is in the top five).
 */
export function canonAccepts(state, rng, canon, asker) {
  const C = RULES.alliances.canon;
  const rule = C[canon.canonId] ?? C.default;
  if ((asker.worthiness ?? 50) < rule.min) return false;
  let p = rule.p;
  if (rule.topFive != null) {
    const top = standings(state).slice(0, 5).map((r) => r.id);
    if (top.includes(asker.id)) p = rule.topFive;
  }
  return rng.chance(p);
}

/** Ally up targets: racing named racers and named NPCs who ride alone. */
export function allyTargets(state, self) {
  const f = state.field;
  const npcs = [...f.packLeaders, ...f.kept].filter((n) => n.name && n.status === 'racing' && (n.packLeader || n.breakout) && !n.ally);
  return [...namedRacers(state), ...new Set(npcs)]
    .filter((r) => r.status === 'racing' && r.id !== self.id && !r.ally)
    .map((r) => ({ id: r.id, name: r.name, tier: r.tier }));
}

export function log(state, entry) {
  if (!state.race) return;
  (state.race.allyLog ??= []).push(entry);
}
