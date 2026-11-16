// Fights (milestone 5, DESIGN.md → Fights). One module for every fight:
// Hunt a rival showdowns, "Attacked on the trail", "A chance to strike",
// PC vs PC, and (M5b) agents and Funny Valentine.
//
// Both sides commit before the fight:
//   attacker `win`:    'kill' | 'spare' | 'horse' | 'part'  ("If you win: ...")
//   defender `defend`: 'fight-kill' | 'fight-spare' | 'flee' | 'surrender'
// 'part' searches the loser: a corpse part if they carry one (the stream
// line is the same either way). 'surrender' skips the fight: the attacker
// gets their choice, and a kill counts as cruel.
//
// Milestone 5b: agents (tier 'agent', state.agents) and Funny Valentine
// (immortal) fight here too, and a Valentine errand fights masked
// ("a rider in a dark hat": no name, no Stand, no ally on stream).
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
import { carried, takePart } from './corpse.js';
import { blessed } from './dead.js';

const F = () => RULES.fights;

export const LINES = {
  open: {
    rival: '{x} catches up with {y}, and they fight.',
    strike: '{x} attacks {y} on the trail.',
    attacked: '{x} jumps {y} on the trail.',
    agents: '{x} ambushes {y} on the trail.',
    errand: 'A rider in a dark hat ambushes {y} on the trail.',
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
  part: ' {x} beats {y} and goes through {y.their} things.',
  surrender: ' {y} gives up without a fight.',
  searched: ' {x} goes through {y.their} things and rides off.',
  unmasked: ' {y} turns the fight around and kills the rider in the dark hat. It was {xr}.',
  reversalKill: ' {y} turns the fight around and kills {x}.',
  reversalSpare: ' {y} turns the fight around and drives {x} off.',
  leave: '{x} thinks better of it and rides on.',
};

/** Fight score for one side (see header). Returns { score, notes: [template keys] }. */
export function fightScore(ctx, r, bonus = 0, { masked = false } = {}) {
  let score = (r.tier === 'npc' ? F().npcSkill : r.skill) + bonus;
  const notes = [];
  // A masked rider still fights with their Stand, but the stream never sees it.
  if (r.stand) { score += standMods(r).fightBonus ?? 0; if (!masked) notes.push(['stand', r]); }
  if (r.canonId && F().spinUsers.includes(r.canonId)) { score += F().spin; notes.push(['spin', r]); }
  const ally = masked ? null : allyOf(ctx.state, r);
  if (ally && ally.status === 'racing' && !ctx.assigned?.has(ally.id) && !ctx.inPrompts?.has(ally.id) && ctx.rng.chance(F().allyChance)) {
    ctx.assigned?.add(ally.id);
    score += F().ally;
    notes.push(['ally', r, ally]);
  }
  const roll = ctx.rng.normal(0, F().sd);
  return { score: score + roll, base: score, roll, notes };
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
export function mortal(ctx, who) {
  if (who.immortal) return false; // Funny Valentine
  if (blessed(ctx, who)) return false; // the dead's Blessing (milestone 6a)
  return !(who.tier === 'canon' && RULES.canonImmuneStages.includes(ctx.stage?.id));
}

function die(ctx, who, cause, killer) {
  killer.kills = (killer.kills ?? 0) + 1;
  if (who.tier === 'agent') { who.status = 'dead'; (ctx.state.race.agentLog ??= []).push({ event: 'died', agent: who.id, stage: ctx.stage?.id }); }
  else if (who.tier === 'npc') npcDies(ctx, who, killer);
  else killRacer(ctx, who, cause, killer);
}

/**
 * Resolve one fight. Returns { text, death, roles, outcome }.
 * spec: { kind: 'rival' | 'strike' | 'attacked' | 'agents' | 'valentine' | 'errand',
 *         attacker, defender, win, defend, bonusA?, bonusD?, cause?,
 *         open? (template override), masked? (attacker shown as "a rider in a dark hat"),
 *         partTo? ('president': a part taken goes to him), takeAll? (every part they carry),
 *         fallback? ('horse': 'part' with nothing to find takes their horse),
 *         noSpareCredit?, reversalLine? (template for a defender's win without a kill) }
 */
export function resolveFight(ctx, spec) {
  const { attacker: x, defender: y, kind } = spec;
  const W = RULES.worthiness;
  const roles = { x, y };
  const masked = !!spec.masked;
  let text = spec.open ?? LINES.open[kind] ?? LINES.open.strike;
  let outcome;
  let death = false;
  x.fights = (x.fights ?? 0) + 1;
  y.fights = (y.fights ?? 0) + 1;
  const carriedBefore = carried(ctx.state, y).length;
  let scores = null; // { a: { base, roll }, d } for the debug log

  const addNotes = (notes) => {
    for (const [k, w, z] of notes) {
      const r = { ...roles, w, ...(z ? { z } : {}) };
      text += render(LINES[k], displayRoles(r));
      if (k === 'stand' && w.stand) w.stand.revealed = true; // first fight with it reveals it
      if (z) roles[`ally${Object.keys(roles).length}`] = z;
    }
  };

  // Giving up: the attacker gets their choice without a fight.
  if (spec.defend === 'surrender') {
    text += LINES.surrender;
    win(F().killMargin, true);
    return finish();
  }

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

  const a = fightScore(ctx, x, spec.bonusA ?? 0, { masked });
  const d = fightScore(ctx, y, (spec.bonusD ?? 0) - (caught ? F().caughtPenalty : 0));
  scores = { a: { base: a.base, roll: a.roll }, d: { base: d.base, roll: d.roll } };
  addNotes([...a.notes, ...d.notes]);
  const margin = a.score - d.score;

  if (Math.abs(margin) < F().close) {
    outcome = 'both-hurt';
    x.injured = true; y.injured = true;
    text += LINES.close;
  } else if (margin > 0) {
    win(margin, caught);
  } else {
    // Reversal: the defender wins.
    if (spec.defend === 'fight-kill' && -margin >= F().killMargin && mortal(ctx, x)) {
      outcome = 'reversal-kill';
      death = true;
      text += masked ? LINES.unmasked : LINES.reversalKill;
      die(ctx, x, spec.cause ?? 'killed in a fight', y);
      addWorthiness(y, W.killDefense, ctx);
    } else {
      outcome = 'reversal-spare';
      x.injured = true;
      text += spec.reversalLine ?? LINES.reversalSpare;
      if (!spec.noSpareCredit) {
        y.spares = (y.spares ?? 0) + 1;
        addWorthiness(y, W.spare, ctx);
      }
    }
    if (kind === 'rival') { y.points += F().winPoints; y.pace += F().winPace; x.pace -= 1; }
  }
  return finish();

  /** The attacker won (or the defender gave up): their choice happens. */
  function win(m, cruel) {
    let choice = spec.win;
    if (choice === 'horse' && !hasHorse(y)) choice = 'spare';
    // Agents you give up to never kill: they search you and ride off.
    if (spec.defend === 'surrender' && x.tier === 'agent' && !x.immortal) choice = 'searched';
    if (choice === 'kill') {
      if (m < F().killMargin || ctx.rng.chance(F().killEscape) || !mortal(ctx, y)) {
        outcome = 'kill-missed';
        y.injured = true;
        text += LINES.killMissed;
        // No kill, no kill cost: the loser got away.
      } else {
        outcome = 'kill';
        death = true;
        text += cruel ? LINES.killFled : LINES.kill;
        die(ctx, y, spec.cause ?? 'killed in a fight', x);
        addWorthiness(x, cruel ? W.killCruel : W.killStarted, ctx);
      }
    } else if (choice === 'part' || choice === 'searched') {
      // Search them. The stream line is the same whether there was anything to find.
      const got = takeParts(ctx, x, y, spec);
      outcome = got ? 'part' : 'searched';
      if (!got && spec.fallback === 'horse' && hasHorse(y) && choice === 'part') {
        outcome = 'horse';
        const lost = takeHorse(ctx, x, y);
        text += lost && x.horse === lost.name && !x.onFoot ? LINES.horse : LINES.horseDrive;
      } else {
        text += choice === 'searched' ? LINES.searched : LINES.part;
        if (!got && choice === 'searched') y.injured = true; // roughed up, quietly
      }
      if (got && x.tier !== 'agent' && !x.immortal) addWorthiness(x, W.stealPart, ctx);
    } else if (choice === 'horse') {
      outcome = 'horse';
      const lost = takeHorse(ctx, x, y);
      text += lost && x.horse === lost.name && !x.onFoot ? LINES.horse : LINES.horseDrive;
    } else {
      outcome = 'spare';
      text += LINES.spare;
      if (x.tier !== 'agent') {
        x.spares = (x.spares ?? 0) + 1;
        addWorthiness(x, W.spareStarted, ctx);
      }
    }
    if (kind === 'rival') { x.points += F().winPoints; x.pace += F().winPace; y.pace -= 1; }
  }

  function finish() {
    const shown = displayRoles(roles);
    if (masked) {
      shown.xr = shown.x;
      shown.x = { name: 'the rider in the dark hat', pronouns: 'they' };
    }
    const rendered = render(text, shown);
    (ctx.state.race.fightLog ??= []).push({
      kind, outcome, stage: ctx.stage?.id,
      pvp: x.tier === 'pc' && y.tier === 'pc',
      a: { tier: x.tier, personality: x.personality, ai: !!x.isAI, id: x.id }, d: { tier: y.tier, personality: y.personality, id: y.id, holder: carriedBefore },
      win: spec.win, defend: spec.defend,
      // Host debug log only (?debug=1); never sent anywhere.
      names: [x.name ?? '?', y.name ?? '?'], scores, masked,
    });
    return { text: rendered, death, roles, outcome };
  }
}

/** The winner takes one corpse part (or every one, `takeAll`) the loser carries. Returns how many. */
function takeParts(ctx, winner, loser, spec) {
  const items = carried(ctx.state, loser);
  if (!items.length) return 0;
  const list = spec.takeAll ? items : [ctx.rng.pick(items)];
  const to = spec.partTo === 'president' || winner.tier === 'agent' || winner.immortal ? 'president' : winner;
  for (const it of list) takePart(ctx, it, to, 'fight', loser);
  return list.length;
}
