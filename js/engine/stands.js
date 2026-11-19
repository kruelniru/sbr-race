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
import { POOL, CANON_STANDS, STAND_BY_ID, baseStandId } from '../../data/stands.js';
import { addAlert, addHint } from './notify.js';
import { render } from './text.js';

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
  racer.ateRokakaka = false;
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

/**
 * Rokakaka: the Stand leaves its user and goes back into the pool. A later Act
 * goes back as Act 1 (milestone 7c), and a Requiem never goes back (its own
 * Stand stays out: it became the Requiem).
 */
export function removeStand(state, racer) {
  const st = racer.stand;
  if (!st) return null;
  racer.stand = null;
  if (STAND_BY_ID[st.id]?.requiem) return st;
  const base = baseStandId(st.id);
  state.stands.out = state.stands.out.filter((id) => id !== st.id && id !== base);
  const def = STAND_BY_ID[base];
  // A canon Stand stays in the pool once freed.
  if (def?.owner && !state.stands.unlocked.includes(base)) state.stands.unlocked.push(base);
  return st;
}

// ------------------------------------------------------------ Acts (milestone 7c)

/** The next Act of this racer's Stand, or null. */
export function nextAct(racer) {
  const def = racer?.stand && STAND_BY_ID[racer.stand.id];
  return def?.next ? STAND_BY_ID[def.next] : null;
}

/**
 * A trigger happened ('fight' | 'nearDeath' | 'worthiness' | 'finish'): roll
 * rules.acts.chance for it. At most one Act per stage; Johnny's own Tusk
 * follows its schedule instead.
 */
export function tryEvolve(ctx, racer, trigger) {
  if (!ctx?.rng || !racer?.stand || racer.status === 'dead') return null;
  if (!nextAct(racer)) return null;
  if (racer.canonId === 'johnny' && STAND_BY_ID[racer.stand.id]?.family === 'tusk') return null;
  if (racer.stand.actStage === (ctx.stage?.id ?? 0)) return null;
  if (!ctx.rng.chance(RULES.acts.chance[trigger] ?? 0)) return null;
  return evolveStand(ctx, racer, trigger);
}

/**
 * The Stand becomes its next Act. Its user's phone is told; the stream sees
 * it only if the Stand was already revealed (data/stands.js evolveLine).
 */
export function evolveStand(ctx, racer, trigger) {
  const st = racer.stand;
  const nx = nextAct(racer);
  if (!st || !nx) return null;
  const s = ctx.state.stands;
  const from = st.name;
  if (!s.out.includes(nx.id)) s.out.push(nx.id);
  Object.assign(st, { id: nx.id, name: nx.name, tier: nx.tier, actStage: ctx.stage?.id ?? 0 });
  (s.acts ??= []).push({
    racerId: racer.id, name: racer.name, racerTier: racer.tier, personality: racer.personality ?? null,
    human: racer.tier === 'pc' && !racer.isAI, from, to: nx.name, trigger, stage: ctx.stage?.id ?? 0, revealed: !!st.revealed,
  });
  addAlert(racer, 'calm', 'Your Stand evolved', `${from} is now ${nx.name}. ${nx.flavor}`);
  addHint(racer, `${from} changes. It is ${nx.name} now.`, ctx);
  if (st.revealed && nx.evolveLine) {
    (ctx.lateLines ??= []).push({
      eventId: `act-${nx.id}`, text: render(nx.evolveLine, { a: { name: racer.name ?? 'a rider from the pack', pronouns: racer.pronouns } }),
      ids: racer.tier === 'npc' ? [] : [racer.id], names: racer.tier === 'npc' ? [] : [{ name: racer.name, tier: racer.tier }],
      minor: false, death: false, tags: ['stand', 'act'], side: racer.status !== 'racing', after: true,
    });
  }
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
    const holdsOwn = !racer.stand || baseStandId(racer.stand.id) === id; // any Act of it (Tusk enters the pool as Act 1)
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
