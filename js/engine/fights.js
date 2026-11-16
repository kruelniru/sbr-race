// Fights (milestone 5, DESIGN.md → Fights). One module for every fight:
// Hunt a rival showdowns, "Attacked on the trail", "A chance to strike",
// PC vs PC, and (M5b) agents and Funny Valentine.
//
// Both sides commit before the fight:
//   attacker `win`:    'kill' | 'spare' | 'horse'           ("If you win: ...")
//   defender `defend`: 'fight-kill' | 'fight-spare' | 'flee'
// Racers nobody controls choose by tier (rules.fights.*Wins / *Defends).
//
// score = skill (NPCs rules.fights.npcSkill) + Stand fightBonus + Spin
//         + ally (sometimes) + bonus + normal(0, sd). Nobody wins automatically.
//
// Outcomes: escape (fled), both hurt (close), the attacker wins (their
// choice; a kill can still miss), or a reversal (the defender wins and
// kills or drives them off).
//
// Worthiness: the attacker started it (kill −8; a fleeing loser −12, cruel);
// a defender's kill is self-defense (0); sparing someone you beat +12, or
// +4 if you started the fight (rules.worthiness.spareStarted).

import RULES from '../../data/rules.js';
import { render } from './text.js';
import { displayRoles } from './events.js';
import { killRacer, addWorthiness } from './racers.js';
import { npcDies } from './field.js';
import { standMods } from './stands.js';
import { allyOf } from './alliances.js';
import { hasHorse, takeHorse } from './horses.js';

const F = () => RULES.fights;

export const LINES = {
  open: {
    rival: '{x} catches up with {y}, and they fight.',
    strike: '{x} attacks {y} on the trail.',
    attacked: '{x} jumps {y} on the trail.',
  },
  stand: ' {w} fights with {w.stand}.',
  spin: ' {w} throws {w.their} Steel Balls.',
  ally: ' {z} rides in to help {w}.',
  escaped: ' {y} turns and flees, and gets away.',
  caught: ' {y} tries to flee, but {x} runs {y.them} down.',
  close: ' They fight to a standstill, and both ride off hurt.',
  kill: ' {x} kills {y}.',
  killFled: ' {y} begs for {y.their} life. {x} kills {y.them} anyway.',
  killMissed: ' {x} goes for the kill, but {y} gets away, badly hurt.',
  spare: ' {x} beats {y} and lets {y.them} go.',
  horse: ' {x} beats {y} and rides off with {y.horse}.',
  horseDrive: ' {x} beats {y} and drives off {y.horse}.',
  reversalKill: ' {y} turns the fight around and kills {x}.',
  reversalSpare: ' {y} turns the fight around and drives {x} off.',
  leave: '{x} thinks better of it and rides on.',
};

/** Fight score for one side (see header). Returns { score, notes: [template keys] }. */
export function fightScore(ctx, r, bonus = 0) {
  let score = (r.tier === 'npc' ? F().npcSkill : r.skill) + bonus;
  const notes = [];
  if (r.stand) { score += standMods(r).fightBonus ?? 0; notes.push(['stand', r]); }
  if (r.canonId && F().spinUsers.includes(r.canonId)) { score += F().spin; notes.push(['spin', r]); }
  const ally = allyOf(ctx.state, r);
  if (ally && ally.status === 'racing' && !ctx.assigned?.has(ally.id) && !ctx.inPrompts?.has(ally.id) && ctx.rng.chance(F().allyChance)) {
    ctx.assigned?.add(ally.id);
    score += F().ally;
    notes.push(['ally', r, ally]);
  }
  return { score: score + ctx.rng.normal(0, F().sd), notes };
}

/** What a racer nobody controls does (canon mostly spare, NPCs often kill). */
export function npcWin(rng, r, defender) {
  const w = { ...(r.tier === 'canon' ? F().canonWins : F().npcWins) };
  if (!hasHorse(defender)) delete w.horse;
  return rng.weighted(Object.entries(w), ([, x]) => x)[0];
}
export function npcDefend(rng, r) {
  const w = r.tier === 'canon' ? F().canonDefends : F().npcDefends;
  return rng.weighted(Object.entries(w), ([, x]) => x)[0];
}

/** Can this racer die right now? (Canon racers can't in Stage 1.) */
function mortal(ctx, who) {
  return !(who.tier === 'canon' && RULES.canonImmuneStages.includes(ctx.stage?.id));
}

function die(ctx, who, cause, killer) {
  killer.kills = (killer.kills ?? 0) + 1;
  if (who.tier === 'npc') npcDies(ctx, who);
  else killRacer(ctx, who, cause, killer);
}

/**
 * Resolve one fight. Returns { text, death, roles, outcome }.
 * spec: { kind: 'rival' | 'strike' | 'attacked' | ..., attacker, defender,
 *         win, defend, bonusA?, bonusD?, cause?, open? (template override) }
 */
export function resolveFight(ctx, spec) {
  const { attacker: x, defender: y, kind } = spec;
  const W = RULES.worthiness;
  const roles = { x, y };
  let text = spec.open ?? LINES.open[kind] ?? LINES.open.strike;
  let outcome;
  let death = false;
  x.fights = (x.fights ?? 0) + 1;
  y.fights = (y.fights ?? 0) + 1;

  const addNotes = (notes) => {
    for (const [k, w, z] of notes) {
      const r = { ...roles, w, ...(z ? { z } : {}) };
      text += render(LINES[k], displayRoles(r));
      if (k === 'stand' && w.stand) w.stand.revealed = true; // first fight with it reveals it
      if (z) roles[`ally${Object.keys(roles).length}`] = z;
    }
  };

  let fled = spec.defend === 'flee';
  let caught = false;
  if (fled) {
    if (ctx.rng.chance(F().fleeEscape)) {
      outcome = 'escape';
      text += LINES.escaped;
      return finish();
    }
    caught = true;
    text += LINES.caught;
  }

  const a = fightScore(ctx, x, spec.bonusA ?? 0);
  const d = fightScore(ctx, y, (spec.bonusD ?? 0) - (caught ? F().caughtPenalty : 0));
  addNotes([...a.notes, ...d.notes]);
  const margin = a.score - d.score;

  if (Math.abs(margin) < F().close) {
    outcome = 'both-hurt';
    x.injured = true; y.injured = true;
    text += LINES.close;
  } else if (margin > 0) {
    // The attacker wins: their choice happens.
    let win = spec.win;
    if (win === 'horse' && !hasHorse(y)) win = 'spare';
    if (win === 'kill') {
      if (margin < F().killMargin || ctx.rng.chance(F().killEscape) || !mortal(ctx, y)) {
        outcome = 'kill-missed';
        y.injured = true;
        text += LINES.killMissed;
        // No kill, no kill cost: the loser got away.
      } else {
        outcome = 'kill';
        death = true;
        text += caught ? LINES.killFled : LINES.kill;
        die(ctx, y, spec.cause ?? 'killed in a fight', x);
        addWorthiness(x, caught ? W.killCruel : W.killStarted, ctx);
      }
    } else if (win === 'horse') {
      outcome = 'horse';
      const lost = takeHorse(ctx, x, y);
      text += lost && x.horse === lost.name && !x.onFoot ? LINES.horse : LINES.horseDrive;
    } else {
      outcome = 'spare';
      text += LINES.spare;
      x.spares = (x.spares ?? 0) + 1;
      addWorthiness(x, W.spareStarted, ctx);
    }
    if (kind === 'rival') { x.points += F().winPoints; x.pace += F().winPace; y.pace -= 1; }
  } else {
    // Reversal: the defender wins.
    if (spec.defend === 'fight-kill' && -margin >= F().killMargin && mortal(ctx, x)) {
      outcome = 'reversal-kill';
      death = true;
      text += LINES.reversalKill;
      die(ctx, x, spec.cause ?? 'killed in a fight', y);
      addWorthiness(y, W.killDefense, ctx);
    } else {
      outcome = 'reversal-spare';
      x.injured = true;
      text += LINES.reversalSpare;
      y.spares = (y.spares ?? 0) + 1;
      addWorthiness(y, W.spare, ctx);
    }
    if (kind === 'rival') { y.points += F().winPoints; y.pace += F().winPace; x.pace -= 1; }
  }
  return finish();

  function finish() {
    const rendered = render(text, displayRoles(roles));
    (ctx.state.race.fightLog ??= []).push({
      kind, outcome, stage: ctx.stage?.id,
      pvp: x.tier === 'pc' && y.tier === 'pc',
      a: { tier: x.tier, personality: x.personality, ai: !!x.isAI }, d: { tier: y.tier, personality: y.personality },
      win: spec.win, defend: spec.defend,
    });
    return { text: rendered, death, roles, outcome };
  }
}
