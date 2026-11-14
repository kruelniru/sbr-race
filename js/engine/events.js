// Picking, casting and resolving events from data/events.
// See data/events/README.md for the event format.

import RULES from '../../data/rules.js';
import ALL_EVENTS from '../../data/events/index.js';
import { EFFECTS, EFFECT_KEYS } from './effects.js';
import { render, lintTemplate } from './text.js';
import { namedRacers } from './racers.js';
import { castNpc, keepNpc } from './field.js';

const ROUND_TYPES = ['day', 'night', 'finish'];
const ROLE_KINDS = ['focus', 'named', 'npc'];

// ------------------------------------------------------------ normalizing

/** Turn shorthand into full form once, at load. */
function normalize(e) {
  const cast = {};
  for (const [key, spec] of Object.entries(e.cast)) cast[key] = typeof spec === 'string' ? { is: spec } : { ...spec };
  const focusKey = Object.keys(cast).find((k) => cast[k].is === 'focus');
  return {
    tags: [],
    effects: {},
    when: {},
    weight: 1,
    ...e,
    cast,
    focusKey,
    minor: (e.tags ?? []).includes('minor'),
  };
}

export const EVENTS = ALL_EVENTS.map(normalize);

/** Content checks; returns a list of problems (empty = good). */
export function lintEvents(events = EVENTS) {
  const problems = [];
  const ids = new Set();
  for (const e of events) {
    const where = `event "${e.id}"`;
    if (!e.id) problems.push('an event has no id');
    if (ids.has(e.id)) problems.push(`${where}: duplicate id`);
    ids.add(e.id);
    if (!e.focusKey) problems.push(`${where}: needs exactly one 'focus' role`);
    if (Object.values(e.cast).filter((c) => c.is === 'focus').length > 1) problems.push(`${where}: more than one focus`);
    for (const [k, c] of Object.entries(e.cast)) {
      if (!ROLE_KINDS.includes(c.is)) problems.push(`${where}: role ${k} has unknown kind "${c.is}"`);
    }
    for (const p of lintTemplate(e.text ?? '', Object.keys(e.cast))) problems.push(`${where}: ${p}`);
    for (const [k, eff] of Object.entries(e.effects)) {
      if (!e.cast[k]) problems.push(`${where}: effects for unknown role ${k}`);
      for (const key of Object.keys(eff)) if (!EFFECT_KEYS.includes(key)) problems.push(`${where}: unknown effect "${key}"`);
      if (eff.by && !e.cast[eff.by]) problems.push(`${where}: by: "${eff.by}" is not a role`);
      if (eff.sparedBy && !e.cast[eff.sparedBy]) problems.push(`${where}: sparedBy: "${eff.sparedBy}" is not a role`);
    }
    for (const r of e.when.rounds ?? []) if (!ROUND_TYPES.includes(r)) problems.push(`${where}: unknown round type "${r}"`);
    if (!(e.weight > 0)) problems.push(`${where}: weight must be > 0`);
  }
  return problems;
}

// ------------------------------------------------------------ matching

function whenFits(e, ctx) {
  const w = e.when;
  if (w.stages && !w.stages.includes(ctx.stage.id)) return false;
  if (w.terrain && !w.terrain.some((t) => ctx.stage.terrain.includes(t))) return false;
  if (w.rounds && !w.rounds.includes(ctx.type)) return false;
  return true;
}

function statusFits(e, spec, racer) {
  if (racer.status === 'dead') return false;
  if (spec.is === 'focus') {
    if (e.retiredOnly) return racer.status === 'retired';
    if (e.allowRetired) return true;
  }
  return racer.status === (spec.status ?? 'racing');
}

const asList = (v) => (Array.isArray(v) ? v : [v]);

/** Does this racer fit this role (filters + every effect on it)? */
function roleFits(ctx, e, key, racer) {
  const spec = e.cast[key];
  if (!statusFits(e, spec, racer)) return false;
  if (spec.tier && !asList(spec.tier).includes(racer.tier)) return false;
  if (spec.canon && !asList(spec.canon).includes(racer.canonId)) return false;
  if (spec.mount && racer.mount !== spec.mount) return false;
  if (spec.hasHorse && !(racer.mount === 'horse' && !racer.onFoot)) return false;
  if (spec.injured != null && !!racer.injured !== spec.injured) return false;
  if (spec.side && racer.side !== spec.side) return false;
  if (spec.notSide && racer.side === spec.notSide) return false;
  for (const [effKey, value] of Object.entries(e.effects[key] ?? {})) {
    if (!EFFECTS[effKey].fits(ctx, racer, value)) return false;
  }
  return true;
}

function eventWeight(e, focus) {
  let w = e.weight;
  const P = RULES.personalityLean[focus.personality] ?? {};
  for (const tag of e.tags) {
    w *= P[tag] ?? 1;
    if (focus.tier === 'canon') w *= RULES.canonLean[tag] ?? 1;
    w *= focus.lean?.[tag] ?? 1;
  }
  if (e.lean) w *= e.lean[focus.personality] ?? 1;
  if (e.effects[e.focusKey]?.dies) w *= RULES.deathOdds[focus.tier] ?? 1;
  // Rivalries: kill events aimed at the rival side are likelier.
  if (focus.rivals && e.tags.includes('kill')
    && Object.values(e.cast).some((c) => c.side === focus.rivals.side)) {
    w *= focus.rivals.lean;
  }
  return w;
}

// ------------------------------------------------------------ casting

/** Fill every non-focus role, or return null if the event can't be cast. */
function castRoles(ctx, e, focus) {
  const roles = { [e.focusKey]: focus };
  const used = new Set([focus.id]);
  for (const [key, spec] of Object.entries(e.cast)) {
    if (key === e.focusKey) continue;
    let who = null;
    if (spec.is === 'named') {
      const pool = namedRacers(ctx.state).filter(
        (r) => !used.has(r.id) && !ctx.assigned.has(r.id) && roleFits(ctx, e, key, r),
      );
      const dies = !!e.effects[key]?.dies;
      who = ctx.rng.weighted(pool, (r) => (dies ? RULES.deathOdds[r.tier] ?? 1 : 1));
    } else if (spec.is === 'npc') {
      who = castNpc(ctx);
      if (who && !roleFits(ctx, e, key, who)) who = null;
    }
    if (!who) return null;
    roles[key] = who;
    used.add(who.id);
    if (who.tier === 'npc') ctx.usedNpcs.add(who.id);
  }
  return roles;
}

// ------------------------------------------------------------ resolving

/**
 * Give `focus` a main event. Returns the resolved line, or null if nothing fits.
 */
export function runMainEvent(ctx, focus) {
  const cap = RULES.maxUsesPerRound;
  const fresh = (e) => (ctx.eventCounts[e.id] ?? 0) < (e.minor ? cap.minor : cap.full);
  let candidates = EVENTS.filter((e) => fresh(e) && whenFits(e, ctx) && roleFits(ctx, e, e.focusKey, focus));
  for (let tries = 0; tries < 10 && candidates.length; tries++) {
    const e = ctx.rng.weighted(candidates, (ev) => eventWeight(ev, focus));
    if (!e) return null;
    const roles = castRoles(ctx, e, focus);
    if (!roles) {
      candidates = candidates.filter((c) => c !== e);
      continue;
    }
    return resolve(ctx, e, roles);
  }
  return null;
}

function resolve(ctx, e, roles) {
  // Render before effects so the text describes the moment it happened.
  const display = {};
  for (const [k, who] of Object.entries(roles)) {
    display[k] = { name: who.name ?? 'a rider from the pack', pronouns: who.pronouns, horse: who.horse ?? who.lostHorse };
  }
  const text = render(e.text, display);
  // Main Story: involves someone still in the race (PC, canon, or a breakout
  // NPC). Everything else (retired racers, NPC-only) is a Side Story.
  const inMain = Object.values(roles).some((w) => (w.tier !== 'npc' || w.breakout) && w.status === 'racing');

  for (const [k, effs] of Object.entries(e.effects)) {
    for (const [key, value] of Object.entries(effs)) {
      EFFECTS[key].apply(ctx, roles[k], value, roles, effs);
    }
  }

  const ids = [];
  for (const who of Object.values(roles)) {
    if (who.tier === 'npc') keepNpc(ctx.state, who);
    else {
      ctx.assigned.add(who.id);
      ids.push(who.id);
    }
  }
  ctx.eventCounts[e.id] = (ctx.eventCounts[e.id] ?? 0) + 1;
  const effects = Object.entries(e.effects);
  const death = effects.some(([, x]) => x.dies);
  const namedDeath = effects.some(([k, x]) => x.dies && roles[k].tier !== 'npc');
  const minor = e.minor && !death;
  // Named racers in the line, so screens can highlight them (NPCs stay plain).
  const names = Object.values(roles).filter((w) => w.tier !== 'npc').map((w) => ({ name: w.name, tier: w.tier }));
  return {
    eventId: e.id, text, ids, names, minor, death, tags: e.tags,
    // Side Story: minor lines, retired racers, NPC-only. A named death is always Main Story.
    side: minor || (!inMain && !namedDeath),
  };
}
