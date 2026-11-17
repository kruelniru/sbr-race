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
//   The Requiem Arrow: a Stand Arrow and 2 Rokakaka in Items at once, a
//        Legendary Stand and Worthiness 80+: a hidden "Pierce your Stand"
//        prompt appears. It consumes all three and evolves the Stand into a
//        Requiem (nothing can kill its user). Reaching New York with it wins outright.
//
// state.race.d4c = { id, name, from: { cause, stage, by }, stage } | null
// state.race.requiem = { id, name, stand, from, stage } | null

import RULES from '../../data/rules.js';
import { REQUIEM_STANDS, STAND_BY_ID } from '../../data/stands.js';
import { readyPlayers } from './state.js';
import { namedRacers, addHint, findRacerAnywhere } from './racers.js';
import { giveStand, pickStand, removeStand } from './stands.js';
import { itemsOf, removeItem } from './items.js';
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

// ------------------------------------------------------------ The Requiem Arrow

/** The recipe (never shown anywhere in the game). */
export function requiemReady(state, p) {
  if (!p || p.status !== 'racing' || p.otherWorld || p.stand?.tier !== 'legendary' || p.stand.requiem) return false;
  if ((p.worthiness ?? 0) < RULES.requiem.minWorthiness) return false;
  const items = itemsOf(state, p.id);
  return items.filter((i) => i.kind === 'arrow').length >= 1 && items.filter((i) => i.kind === 'rokakaka').length >= 2;
}

/** The Requiem version of a Stand: the canon ones, or "[Stand] Requiem". */
export function requiemOf(stand) {
  const known = REQUIEM_STANDS.find((s) => s.from === stand.id);
  if (known) return known;
  return { id: `${stand.id}-requiem`, name: `${stand.name} Requiem`, tier: 'legendary', requiem: true, from: stand.id, flavor: `${STAND_BY_ID[stand.id]?.flavor ?? ''} Now it answers to something beyond its user.`.trim() };
}

/** "Pierce your Stand": consume the Arrow and both Rokakaka; the Stand becomes a Requiem. */
export function pierceStand(ctx, p) {
  if (!requiemReady(ctx.state, p)) return null;
  const items = itemsOf(ctx.state, p.id);
  removeItem(ctx.state, items.find((i) => i.kind === 'arrow').id);
  for (const it of items.filter((i) => i.kind === 'rokakaka').slice(0, 2)) removeItem(ctx.state, it.id);
  // The Arrow chooses (milestone 7b): it may refuse. Everything is used up; nothing on stream.
  if (!ctx.rng.chance(RULES.requiem.success)) {
    (ctx.state.race.requiemRefused ??= []).push({ id: p.id, stage: ctx.stage.id, stand: p.stand.name });
    addHint(p, 'The Arrow turns in your hand and will not pierce. It has judged you.', ctx);
    return null;
  }
  const old = p.stand;
  const def = requiemOf(old);
  removeStand(ctx.state, p);
  // The old Stand doesn't go back into the pool: it became this.
  if (!ctx.state.stands.out.includes(old.id)) ctx.state.stands.out.push(old.id);
  giveStand(ctx, p, def, 'requiem');
  p.stand.requiem = true;
  ctx.state.race.requiem = { id: p.id, name: p.name, stand: def.name, from: old.name, stage: ctx.stage.id };
  addHint(p, `You drive the Arrow into ${old.name}. It screams, and becomes ${def.name}. Whatever is done to you now never arrives.`, ctx);
  ctx.state.corpse?.announce.push('Somewhere on the trail, a Stand has become something else.');
  return def;
}

/** Racing with a Requiem Stand (checked at the final Finish Line). */
export function requiemHolder(state) {
  const id = state.race?.requiem?.id;
  const r = id ? findRacerAnywhere(state, id) : null;
  return r && r.status === 'racing' && r.stand?.requiem ? r : null;
}
