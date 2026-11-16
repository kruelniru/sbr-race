// The Devil's Palm (Stages 2–3) and private phone hints. Pure engine code.
//
// A racer who goes in gets one outcome from their Worthiness band
// (rules.palm.bands): awaken a Stand, come out with nothing, get lost (lose
// time or retire), or die. On stream, "awakened" and "nothing" read the same
// ("walks out of the Devil's Palm, silent"), so the stream learns nothing.
//
// state.race.palmLog: [{ tier, worthiness, band, outcome }] for the sim.

import RULES from '../../data/rules.js';
import { addWorthiness, retireRacer, addHint } from './racers.js';
import { awakenStand } from './stands.js';
import { keepNpc } from './field.js';
import { palmPart } from './corpse.js';

export function palmBand(worthiness = 50) {
  return RULES.palm.bands.find((b) => worthiness >= b.min) ?? RULES.palm.bands.at(-1);
}

/** Pick an outcome for someone going in: 'stand' | 'nothing' | 'lost' | 'dies'. */
export function rollPalm(rng, worthiness) {
  const b = palmBand(worthiness);
  const x = rng.next() * 100;
  if (x < b.stand) return 'stand';
  if (x < b.stand + b.nothing) return 'nothing';
  if (x < b.stand + b.nothing + b.lost) return 'lost';
  return 'dies';
}

/** A private line for a PC's phone, shown with the round's private update. */
export { addHint }; // lives in racers.js now

export function logPalm(ctx, who, outcome) {
  // hadStand: went in already holding one (a 'stand' roll then reads as 'nothing').
  const hadStand = outcome === 'stand' ? false : !!who.stand;
  (ctx.state.race.palmLog ??= []).push({ tier: who.tier, worthiness: who.worthiness, band: palmBand(who.worthiness).min, outcome, hadStand });
}

/**
 * Someone walked back out alive with no visible sign: they either awakened a
 * Stand or got nothing (already rolled: 'stand' | 'nothing'). +5 Worthiness.
 */
export function palmExit(ctx, who, outcome) {
  let got = null;
  if (outcome === 'stand' && !who.stand) {
    if (who.tier === 'npc') {
      // An NPC who awakens a Stand becomes a named breakout (capped per game).
      const f = ctx.state.field;
      if ((f.breakouts ?? 0) < RULES.palm.breakoutCap) {
        got = awakenStand(ctx, who, 'palm');
        if (got) {
          f.breakouts = (f.breakouts ?? 0) + 1;
          who.breakout = true;
          keepNpc(ctx.state, who);
        }
      }
    } else {
      got = awakenStand(ctx, who, 'palm');
    }
  }
  logPalm(ctx, who, got ? 'stand' : 'nothing');
  addWorthiness(who, RULES.worthiness.palmSurvive, ctx);
  // Milestone 5b: in a Palm stage, that stage's corpse part may be waiting inside (its own hint).
  const part = palmPart(ctx, who);
  if (part && !got) return got;
  addHint(who, got
    ? 'A strange calm settles over you as you leave the Palm. Something walks out with you.'
    : who.stand
      ? 'The Palm has nothing more to give you.'
      : 'The Palm gives you nothing but sand in your boots.', ctx);
  return got;
}

/** Lost in the Palm: time lost, or the race is over for them (still alive). */
export function palmLost(ctx, who) {
  logPalm(ctx, who, 'lost');
  addWorthiness(who, RULES.worthiness.palmSurvive, ctx);
  if (who.tier === 'pc' && ctx.rng.chance(RULES.palm.lostRetire)) {
    if (who.status === 'racing') retireRacer(ctx, who);
    addHint(who, 'You wandered the Palm for days. When you found the trail again, the race had gone on without you.', ctx);
    return 'retired';
  }
  if (who.tier !== 'npc') who.pace += RULES.palm.lostPace;
  addHint(who, 'You lost a day in the Palm, walking in circles under a sun that never moved.', ctx);
  return 'lost';
}
