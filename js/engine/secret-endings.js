// Secret endings (milestone 6d, DESIGN.md → Secret endings). Pure engine code.
// None of these is ever hinted at in the game.
//
//   D4C: going into the Final Stage, if Funny Valentine holds 3+ parts, he brings one fallen racer
//        back from another world to ride for him (a dead human PC if any,
//        then a dead AI PC, then a dead canon racer). That player controls
//        their other-world self for the Final Stage: same personality, a
//        Legendary Stand from the pool, a Valentine rider (agents ride past;
//        errands; riding with him). They can't win the race or score. If the
//        President wins, they stay in this world (they reach New York, and get
//        the joiners' bonus); otherwise they fade back into death at the end.
//   The Saint Walks Again: one racer still racing holds all 9 parts at the
//        final Finish Line. They win outright.
//   The Requiem Arrow (milestone 7c): anyone holding a Stand Arrow and 2
//        Rokakaka can combine them into a Requiem Arrow (a secret prompt for
//        people). Only a human PC with a Stand can pierce with it; the Arrow
//        chooses by Worthiness. Success turns the Stand into its Requiem form:
//        the strongest power in the game, but no longer an outright win.
//
// state.race.d4c = { id, name, from: { cause, stage, by }, stage } | null
// state.race.requiems = [{ id, name, stand, from, stage, worthiness, chance }]; requiemArrows, requiemRefused

import RULES from '../../data/rules.js';
import { requiemFor, baseStandId } from '../../data/stands.js';
import { readyPlayers } from './state.js';
import { namedRacers, addHint, addAlert, findRacerAnywhere } from './racers.js';
import { giveStand, pickStand, removeStand } from './stands.js';
import { itemsOf, removeItem, addItem } from './items.js';
import { carried, presidentParts, takePart } from './corpse.js';

export const isOtherWorld = (r) => !!r?.otherWorld;

// ------------------------------------------------------------ D4C

/** Who D4C brings back: a dead human PC, then a dead AI PC, then a dead canon racer. */
export function d4cCandidate(state, rng, forcedId = null) {
  if (forcedId) {
    const f = findRacerAnywhere(state, forcedId);
    if (f && f.status === 'dead' && f.tier !== 'npc') return f;
  }
  const dead = (list) => list.filter((r) => r.status === 'dead' && !r.otherWorld);
  const pcs = readyPlayers(state);
  return rng.pick(dead(pcs.filter((p) => !p.isAI))) ?? rng.pick(dead(pcs.filter((p) => p.isAI))) ?? rng.pick(dead(state.canon ?? [])) ?? null;
}

/** At the Final Stage's start (Funny Valentine alive): bring one fallen racer back. */
export function d4cReturn(state, rng, forcedId = null) {
  const race = state.race;
  if (race.d4c || race.fv?.dead) return null;
  // Only when Valentine is strong going into the Final Stage (rules.d4c.minPresidentParts),
  // unless the cheat menu forces it.
  const forced = forcedId ?? race.d4cPick ?? null;
  if (!forced && presidentParts(state) < RULES.d4c.minPresidentParts) return null;
  const r = d4cCandidate(state, rng, forced);
  if (!r) return null;
  const ctx = { state, rng, stage: { id: 9 }, roundLabel: 'start' };
  r.otherWorld = { death: r.death, stage: 9 };
  r.status = 'racing';
  r.death = null;
  r.injured = false;
  r.pace = 0;
  r.valentine = { joined: true, stage: 9, errandStage: 9, otherWorld: true };
  r.valentineOffered = true;
  if (r.stand) removeStand(state, r);
  giveStand(ctx, r, pickStand(state, rng, 'legendary'), 'd4c');
  race.d4c = { id: r.id, name: r.name, tier: r.tier, from: r.otherWorld.death, stage: 9 };
  (race.pendingNotes ??= []).push({
    eventId: 'd4c', note: true, minor: false, death: false, tags: ['d4c'], side: false,
    text: `Dirty Deeds Done Dirt Cheap. ${r.name} rides again… from another world.`,
    ids: [r.id], names: [{ name: r.name, tier: r.tier }],
  });
  addHint(r, 'You wake up between two flags, alive, in a world that isn\'t quite yours. You ride for Valentine now. You can\'t win the race, but if he wins, you get to stay.', ctx);
  return race.d4c;
}

/** End of the race: stay in this world (the President won) or fade back into death. */
export function otherWorldEnding(state) {
  const won = state.race.ending?.id === 'president';
  for (const r of namedRacers(state).filter((x) => x.otherWorld)) {
    if (r.status === 'dead') continue; // died again in the Final Stage
    if (won) { r.otherWorld.stayed = true; continue; }
    // Fading back, they leave what they carried to the President they rode for.
    for (const it of carried(state, r)) takePart({ state, stage: { id: 9 }, roundLabel: 'end' }, it, 'president', 'faded', r, { quiet: true });
    r.status = 'dead';
    r.death = { ...r.otherWorld.death, faded: true };
    r.otherWorld.faded = true;
  }
  if (state.race.d4c) state.race.d4c.stayed = won;
}

// ------------------------------------------------------------ The Saint Walks Again

/** A racer still racing who holds all 9 parts (checked at the final Finish Line). */
export function saintHolder(state) {
  const total = state.corpse?.parts.length ?? 9;
  return [...namedRacers(state), ...(state.field?.kept ?? [])].find((r) => r.status === 'racing' && !r.otherWorld && carried(state, r).length === total) ?? null;
}

// ------------------------------------------------------------ The Requiem Arrow (milestone 7c)

const isHuman = (r) => r?.tier === 'pc' && !r.isAI;

/** Holds a Stand Arrow and 2 Rokakaka at once (anyone can combine them). */
export function craftReady(state, r) {
  if (!r || r.status === 'dead') return false;
  const items = itemsOf(state, r.id);
  return items.some((i) => i.kind === 'arrow') && items.filter((i) => i.kind === 'rokakaka').length >= 2;
}

/** Combine one Arrow and 2 Rokakaka into a Requiem Arrow. */
export function craftRequiemArrow(ctx, r) {
  if (!craftReady(ctx.state, r)) return null;
  const items = itemsOf(ctx.state, r.id);
  removeItem(ctx.state, items.find((i) => i.kind === 'arrow').id);
  for (const it of items.filter((i) => i.kind === 'rokakaka').slice(0, 2)) removeItem(ctx.state, it.id);
  const item = addItem(ctx.state, 'requiem-arrow', r, { stage: ctx.stage?.id ?? 0, round: ctx.roundLabel ?? '' });
  (ctx.state.race.requiemArrows ??= []).push({ id: r.id, tier: r.tier, human: isHuman(r), ai: !!r.isAI, personality: r.personality ?? null, stage: ctx.stage?.id ?? 0 });
  addHint(r, 'The Arrow drinks the fruit, and something in it wakes. It is a different Arrow now.', ctx);
  return item;
}

/** Racers nobody controls combine the pieces on their own: AI PCs by personality, NPCs and canon racers always. */
export function autoCraft(ctx) {
  const owners = new Set((ctx.state.items ?? []).filter((i) => i.kind === 'arrow').map((i) => i.owner));
  for (const id of owners) {
    const r = findRacerAnywhere(ctx.state, id);
    if (!r || isHuman(r) || !craftReady(ctx.state, r)) continue;
    const p = r.tier === 'pc' ? RULES.requiem.aiCraft[r.personality] ?? 0.4 : 1;
    if (ctx.rng.chance(p)) craftRequiemArrow(ctx, r);
  }
}

/** "Pierce your Stand": only a human PC with a Stand (not already a Requiem) and a Requiem Arrow. */
export function requiemReady(state, p) {
  if (!isHuman(p) || p.status !== 'racing' || p.otherWorld || !p.stand || p.stand.requiem) return false;
  return itemsOf(state, p.id).some((i) => i.kind === 'requiem-arrow');
}

/** The Arrow chooses: success by Worthiness (rules.requiem.success, interpolated). */
export function requiemChance(worthiness = 50) {
  const T = RULES.requiem.success;
  const w = Math.max(0, Math.min(100, worthiness));
  if (w <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) {
    const [w1, p1] = T[i];
    const [w0, p0] = T[i - 1];
    if (w <= w1) return p0 + ((p1 - p0) * (w - w0)) / (w1 - w0);
  }
  return T.at(-1)[1];
}

/** The Requiem form of a Stand (data/stands.js REQUIEMS). */
export function requiemOf(stand) {
  return requiemFor(stand.id);
}

export const REQUIEM_LINE = 'An Arrow has found its mark. Somewhere out there rides a Stand that no one will ever reach the end of.';

/** Drive the Requiem Arrow into your Stand. It is used up either way. */
export function pierceStand(ctx, p, { force = false } = {}) {
  if (!requiemReady(ctx.state, p)) return null;
  const arrow = itemsOf(ctx.state, p.id).find((i) => i.kind === 'requiem-arrow');
  removeItem(ctx.state, arrow.id);
  const old = p.stand;
  const chance = requiemChance(p.worthiness);
  const entry = { id: p.id, stage: ctx.stage.id, stand: old.name, worthiness: p.worthiness ?? 0, chance };
  if (!force && !ctx.rng.chance(chance)) {
    (ctx.state.race.requiemRefused ??= []).push(entry);
    addHint(p, 'The Arrow turns in your hand and will not pierce. It has judged you.', ctx);
    addAlert(p, 'calm', 'The Arrow refused', 'The Arrow turns in your hand and will not pierce. It has judged you.');
    return null;
  }
  return becomeRequiem(ctx, p, 'requiem', entry);
}

/** Turn this racer's Stand into its Requiem form (the Arrow, or the cheat menu). */
export function becomeRequiem(ctx, p, source = 'requiem', entry = {}) {
  const old = p.stand;
  const def = old && requiemOf(old);
  if (!def) return null;
  const base = baseStandId(old.id);
  removeStand(ctx.state, p);
  // The old Stand doesn't go back into the pool: it became this.
  for (const id of [old.id, base]) if (!ctx.state.stands.out.includes(id)) ctx.state.stands.out.push(id);
  ctx.state.stands.unlocked = ctx.state.stands.unlocked.filter((id) => id !== base);
  giveStand(ctx, p, def, source);
  p.stand.requiem = true;
  p.requiem = { stage: ctx.stage.id, round: ctx.state.race.roundNo ?? 0, finishes: 0 };
  const rec = { ...entry, id: p.id, name: p.name, stand: def.name, from: old.name, stage: ctx.stage.id, round: ctx.roundLabel ?? '', source };
  (ctx.state.race.requiems ??= []).push(rec);
  addHint(p, `You drive the Arrow into ${old.name}. It screams, and becomes ${def.name}.`, ctx);
  addAlert(p, 'calm', 'This is Requiem', `${old.name} is gone. What stands in its place cannot be reached, and cannot be stopped.`);
  ctx.state.corpse?.announce.push(REQUIEM_LINE);
  return def;
}

/** Everyone who ever held a Requiem this game (state.race.requiems). */
export const requiemHolders = (state) => (state.race?.requiems ?? []).map((q) => findRacerAnywhere(state, q.id)).filter(Boolean);

