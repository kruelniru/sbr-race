// Stands: tier odds, the pool, giving and removing Stands. Pure engine code.
//
// racer.stand = { id, name, tier, source, revealed, gained: { stage, round } } | null
//   source is stored for the sim and the M6 secrets reveal; it is NEVER sent
//   to a phone or the host screen.
//   revealed: the stream has seen this Stand named in an event.
//
// state.stands = {
//   out: [id],       // not in the pool: held by someone, locked canon, or dead with its user
//   unlocked: [id],  // canon Stands whose owner died (now in the pool)
//   log: [...],      // every Stand gained this game (awards, sim)
// }
// One Stand per racer, always. Only Rokakaka removes one.

import RULES from '../../data/rules.js';
import { POOL, CANON_STANDS, STAND_BY_ID } from '../../data/stands.js';

const TIERS = ['legendary', 'rare', 'common'];

export function initStands(state) {
  state.stands = {
    // Canon Stands start out of the pool (locked to their owner, alive or not yet awakened).
    out: CANON_STANDS.map((s) => s.id),
    unlocked: [],
    log: [],
  };
}

/**
 * Tier odds (%) for a source at a Worthiness: [legendary, rare, common].
 * Every point above 50 moves rules.standOdds.shiftPer10 / 10 points into
 * Legendary from the lowest tier (Common; Rare for corpse parts).
 */
export function standOdds(source, worthiness) {
  const O = RULES.standOdds;
  const [l, r, c] = O[source];
  const shift = ((worthiness - 50) / 10) * O.shiftPer10;
  if (source === 'corpse') return [l + shift, r - shift, 0];
  return [l + shift, r, c - shift];
}

export function rollTier(rng, source, worthiness) {
  const [l, r] = standOdds(source, worthiness);
  const x = rng.next() * 100;
  return x < l ? 'legendary' : x < l + r ? 'rare' : 'common';
}

/** Stands anyone could get right now: the pool plus unlocked canon Stands, minus what's out. */
export function availableStands(state) {
  const out = new Set(state.stands.out);
  const unlocked = new Set(state.stands.unlocked);
  return [...POOL, ...CANON_STANDS.filter((s) => unlocked.has(s.id))].filter((s) => !out.has(s.id));
}

/** Pick a free Stand of `tier` (falling back to a neighbouring tier if that one is empty). */
export function pickStand(state, rng, tier) {
  const free = availableStands(state);
  const order = tier === 'legendary' ? ['legendary', 'rare', 'common'] : tier === 'rare' ? ['rare', 'common', 'legendary'] : ['common', 'rare', 'legendary'];
  for (const t of order) {
    const options = free.filter((s) => s.tier === t);
    if (options.length) return rng.pick(options);
  }
  return null;
}

/**
 * Give a racer a Stand. `def` is a stand from data/stands.js. Returns the
 * racer's new stand, or null if they already have one (one per racer).
 */
export function giveStand(ctx, racer, def, source) {
  if (!def || racer.stand) return null;
  const s = ctx.state.stands;
  if (!s.out.includes(def.id)) s.out.push(def.id);
  s.unlocked = s.unlocked.filter((id) => id !== def.id);
  racer.stand = {
    id: def.id, name: def.name, tier: def.tier, source, revealed: false,
    gained: { stage: ctx.stage?.id ?? 0, round: ctx.roundLabel ?? 'start' },
  };
  s.log.push({
    racerId: racer.id, name: racer.name, racerTier: racer.tier, standId: def.id, stand: def.name,
    tier: def.tier, source, stage: ctx.stage?.id ?? 0, worthiness: racer.worthiness, human: racer.tier === 'pc' && !racer.isAI,
  });
  return racer.stand;
}

/** Roll a tier from `source` at the racer's Worthiness and give them a free Stand of it. */
export function awakenStand(ctx, racer, source) {
  if (racer.stand) return null;
  const tier = rollTier(ctx.rng, source, racer.worthiness ?? 50);
  return giveStand(ctx, racer, pickStand(ctx.state, ctx.rng, tier), source);
}

/** Rokakaka: the Stand leaves its user and goes back into the pool. */
export function removeStand(state, racer) {
  const st = racer.stand;
  if (!st) return null;
  racer.stand = null;
  state.stands.out = state.stands.out.filter((id) => id !== st.id);
  const def = STAND_BY_ID[st.id];
  // A canon Stand stays in the pool once freed.
  if (def?.owner && !state.stands.unlocked.includes(st.id)) state.stands.unlocked.push(st.id);
  return st;
}

/**
 * A racer died. A canon racer's own Stand (held or not yet awakened) joins
 * the pool. Anyone else's Stand dies with them and stays out of the pool.
 */
export function standOwnerDied(state, racer) {
  if (!state.stands) return;
  if (racer.tier === 'canon' && racer.canonStand) {
    const id = racer.canonStand;
    const holdsOwn = !racer.stand || racer.stand.id === id;
    if (holdsOwn) {
      state.stands.out = state.stands.out.filter((x) => x !== id);
      if (!state.stands.unlocked.includes(id)) state.stands.unlocked.push(id);
    }
  }
}

/** Per-tier modifiers for a racer's Stand (rules.standTier), or null. */
export function standMods(racer) {
  return racer?.stand ? RULES.standTier[racer.stand.tier] : null;
}

export { TIERS };
