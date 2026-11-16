// Horses (milestone 5, DESIGN.md → Horses). Pure engine code.
//
// A Rider has `horse` (name) and `horseQuality` ('nag' | 'sound' | 'fine' |
// 'thoroughbred'). Losing it leaves them on foot (`onFoot`, a big placement
// penalty); `horsesLost` counts losses, and the second one asks "retire or
// continue on foot". Runners never have a horse, and never get one.
//
// Placement: rules.horses.quality[quality] minus `horseBase` (canon racers'
// first horse is already in their skill, so it counts as 0 for them).

import RULES from '../../data/rules.js';
import HORSES from '../../data/horse-names.js';
import { addHint } from './racers.js';

export const QUALITIES = ['nag', 'sound', 'fine', 'thoroughbred'];
export const QUALITY_LABEL = { nag: 'Nag', sound: 'Sound', fine: 'Fine', thoroughbred: 'Thoroughbred' };

/** A PC's first horse quality (rules.horses.start). */
export function startQuality(rng) {
  return rng.weighted(Object.entries(RULES.horses.start), ([, w]) => w)[0];
}

/** Canon racers: the famous horses are Thoroughbreds, the rest Fine. */
export function canonQuality(def) {
  return RULES.horses.canonThoroughbreds.includes(def.horse) ? 'thoroughbred' : 'fine';
}

/** Placement modifier from horse quality (0 while on foot; the on-foot penalty covers that). */
export function horseMod(racer) {
  if (racer.mount !== 'horse' || racer.onFoot || !racer.horseQuality) return 0;
  const Q = RULES.horses.quality;
  return (Q[racer.horseQuality] ?? 0) - (racer.horseBase != null ? Q[racer.horseBase] ?? 0 : 0);
}

export const canHaveHorse = (r) => r.mount === 'horse' && !r.animal;
export const hasHorse = (r) => canHaveHorse(r) && !r.onFoot;

/** A fresh, unused horse name. */
export function newHorseName(state, rng) {
  const used = new Set([...(state.players ?? []), ...(state.canon ?? [])].map((r) => r.horse).filter(Boolean));
  const free = HORSES.filter((h) => !used.has(h));
  return free.length ? rng.pick(free) : rng.pick(HORSES);
}

/** Put a racer on a horse. Returns false for Runners and camel riders. */
export function giveHorse(racer, name, quality) {
  if (!canHaveHorse(racer)) return false;
  racer.horse = name;
  racer.horseQuality = quality;
  racer.onFoot = false;
  return true;
}

/**
 * The racer loses their horse (dies, stolen, given away). The second loss
 * queues the "retire or continue on foot" decision for their next window.
 * Returns the lost horse { name, quality } or null.
 */
export function loseHorse(ctx, racer, { counts = true, how = counts ? 'dead' : 'given' } = {}) {
  if (racer.tier === 'npc' || !hasHorse(racer)) return null;
  const lost = { name: racer.horse, quality: racer.horseQuality };
  racer.horseLossHow = how; // 'dead' | 'taken' | 'given' (the phone alert's wording)
  racer.onFoot = true;
  racer.lostHorse = racer.horse;
  if (counts) {
    racer.horsesLost = (racer.horsesLost ?? 0) + 1;
    if (racer.horsesLost === 2 && racer.tier === 'pc' && racer.status === 'racing') racer.secondHorseDecision = true;
  }
  log(ctx.state, { event: 'lost', id: racer.id, tier: racer.tier, stage: ctx.stage?.id });
  return lost;
}

/** Steal / take a horse: the winner rides off on it if on foot (or if it's better). */
export function takeHorse(ctx, winner, loser) {
  const lost = loseHorse(ctx, loser, { how: 'taken' });
  if (!lost) return null;
  if (canHaveHorse(winner) && (winner.onFoot || QUALITIES.indexOf(lost.quality) > QUALITIES.indexOf(winner.horseQuality))) {
    giveHorse(winner, lost.name, lost.quality);
    log(ctx.state, { event: 'taken', id: winner.id, tier: winner.tier });
    return lost;
  }
  return lost; // driven off: nobody rides it
}

/** The horse trader (town stages, Stage Plan window). */
export function townStage(stage) {
  return RULES.horses.townStages.includes(stage.id);
}

/** What a racer may buy here: [{ quality, price, label }] (empty if nothing). */
export function shopOffers(racer) {
  if (!canHaveHorse(racer) || racer.status !== 'racing') return [];
  const have = racer.onFoot ? -1 : QUALITIES.indexOf(racer.horseQuality);
  return Object.entries(RULES.horses.prices)
    .filter(([q, price]) => QUALITIES.indexOf(q) > have && racer.points >= price)
    .map(([q, price]) => ({ quality: q, price, label: QUALITY_LABEL[q] }));
}

/** Buy a horse (resolved when the Stage Plan window closes). */
export function buyHorse(state, rng, racer, quality) {
  const offer = shopOffers(racer).find((o) => o.quality === quality);
  if (!offer) return false;
  racer.points -= offer.price;
  giveHorse(racer, newHorseName(state, rng), quality);
  log(state, { event: 'bought', id: racer.id, tier: racer.tier, quality, price: offer.price });
  addHint(racer, `You buy ${racer.horse}, a ${QUALITY_LABEL[quality].toLowerCase()} horse, for ${offer.price} points.`, { stage: { id: state.race?.stageIdx + 1 }, roundLabel: 'town' });
  return true;
}

/** AI and sim people: buy when on foot (or on a Nag) and they can afford it. */
export function aiBuys(racer, rng) {
  const offers = shopOffers(racer);
  if (!offers.length) return null;
  if (!racer.onFoot && !rng.chance(0.3)) return null; // a Nag rider sometimes upgrades
  const best = offers.at(-1);
  const cheap = offers[0];
  return (racer.personality === 'cautious' || racer.points < best.price + 60 ? cheap : best).quality;
}

/** state.race.horseLog for the sim. */
export function log(state, entry) {
  if (!state.race) return;
  (state.race.horseLog ??= []).push(entry);
}
