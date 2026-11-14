// The NPC field: ~500 background racers tracked as counts, plus the few NPCs
// who've been named (pulled into an event, or a pack leader who placed top 10).
//
// state.field = {
//   racing, retired, dead,   // counts, including every tracked NPC below
//   packLeaders: [npc],      // compete for placements; unnamed until top 10
//   kept: [npc],             // named NPCs who can show up again (future breakouts)
//   nextId,
// }
// npc = { id, tier: 'npc', name|null, pronouns, status, kills, points, packLeader }

import RULES from '../../data/rules.js';
import NPC_NAMES from '../../data/npc-names.js';

export function initField(state, rng) {
  state.field = { racing: RULES.fieldSize, retired: 0, dead: 0, packLeaders: [], kept: [], nextId: 1 };
  for (let i = 0; i < RULES.packLeaders; i++) state.field.packLeaders.push(makeNpc(state, rng, { named: false, packLeader: true }));
}

function makeNpc(state, rng, { named = true, packLeader = false } = {}) {
  const f = state.field;
  const pronouns = rng.weighted(NPC_NAMES.pronouns, ([, w]) => w)[0];
  return {
    id: 'n' + f.nextId++,
    tier: 'npc',
    name: named ? npcName(state, rng, pronouns) : null,
    pronouns,
    status: 'racing',
    kills: 0,
    points: 0,
    pace: 0,
    injured: false,
    packLeader,
  };
}

/** A unique NPC name (unique against named racers and named NPCs). */
export function npcName(state, rng, pronouns = 'they') {
  const taken = new Set([
    ...state.players.map((p) => p.name.toLowerCase()),
    ...(state.canon ?? []).map((c) => c.name.toLowerCase()),
    ...state.field.kept.map((n) => n.name?.toLowerCase()),
    ...state.field.packLeaders.map((n) => n.name?.toLowerCase()),
  ]);
  let name;
  for (let i = 0; i < 100; i++) {
    name = `${rng.pick(NPC_NAMES.first[pronouns] ?? NPC_NAMES.first.they)} ${rng.pick(NPC_NAMES.last)}`;
    if (!taken.has(name.toLowerCase())) break;
  }
  return name;
}

/** Tracked NPCs (named or pack leaders) who are still racing. */
function trackedRacing(f) {
  return f.packLeaders.filter((n) => n.status === 'racing').length
    + f.kept.filter((n) => n.status === 'racing' && !n.packLeader).length;
}

/**
 * An NPC for an event's 'npc' role: sometimes someone we've met before,
 * otherwise a fresh face from the anonymous field.
 */
export function castNpc(ctx) {
  const { state, rng, usedNpcs } = ctx;
  const f = state.field;
  const known = f.kept.filter((n) => n.status === 'racing' && !usedNpcs.has(n.id));
  if (known.length && rng.chance(RULES.keptNpcReuse)) return rng.pick(known);
  if (f.racing - trackedRacing(f) <= 0) return known.length ? rng.pick(known) : null;
  return makeNpc(state, rng);
}

/** After an event: NPCs who survived it are kept for later. */
export function keepNpc(state, npc) {
  if (npc.status === 'dead' || state.field.kept.includes(npc)) return;
  state.field.kept.push(npc);
}

export function npcDies(ctx, npc) {
  const f = ctx.state.field;
  if (npc.status === 'racing') f.racing--;
  else if (npc.status === 'retired') f.retired--;
  npc.status = 'dead';
  f.dead++;
  ctx.tally.died++;
}

export function npcRetires(ctx, npc) {
  const f = ctx.state.field;
  if (npc.status !== 'racing') return;
  npc.status = 'retired';
  f.racing--;
  f.retired++;
  ctx.tally.retired++;
}

/** Background attrition for one round. Adds to ctx.tally. */
export function fieldAttrition(ctx) {
  const { state, rng, stage, type } = ctx;
  const f = state.field;
  const dieRate = stage.field.die * (type === 'night' ? RULES.nightDeathMult : 1);
  const retireRate = stage.field.retire;

  // Anonymous racers.
  const anonymous = f.racing - trackedRacing(f);
  let died = 0, retired = 0;
  for (let i = 0; i < anonymous; i++) {
    const r = rng.next();
    if (r < dieRate) died++;
    else if (r < dieRate + retireRate) retired++;
  }
  f.racing -= died + retired;
  f.dead += died;
  f.retired += retired;
  ctx.tally.died += died;
  ctx.tally.retired += retired;

  // Tracked NPCs are tougher (they're the ones worth following).
  for (const npc of [...f.packLeaders, ...f.kept]) {
    if (npc.status !== 'racing') continue;
    const r = rng.next();
    if (r < dieRate * 0.5) npcDies(ctx, npc);
    else if (r < (dieRate + retireRate) * 0.5) npcRetires(ctx, npc);
  }

  // A pack leader who drops out is replaced by the next strongest rider.
  f.packLeaders = f.packLeaders.map((n) => {
    if (n.status === 'racing') return n;
    if (f.racing - trackedRacing(f) <= 0) return n;
    return makeNpc(state, rng, { named: false, packLeader: true });
  }).filter((n) => n.status === 'racing');
}

export function fieldReportText(stage, tally, f, rng) {
  const { retired, died } = tally;
  const parts = [];
  if (retired && died) parts.push(`${retired} ${retired === 1 ? 'racer' : 'racers'} retired and ${died} died.`);
  else if (retired) parts.push(`${retired} ${retired === 1 ? 'racer' : 'racers'} retired. No one in the field died.`);
  else if (died) parts.push(`${died} ${died === 1 ? 'racer' : 'racers'} died. No one else gave up.`);
  else parts.push('The whole field rides on.');
  parts.push(`${f.racing} remain.`);
  if (stage.flavor?.length && rng.chance(0.4)) parts.unshift(rng.pick(stage.flavor));
  return parts.join(' ');
}
