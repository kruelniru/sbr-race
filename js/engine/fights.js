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
// Worthiness: the attacker started it (kill −6; a fleeing loser −10, cruel; a rescue's kill is defense);
// a defender's kill is self-defense (0); sparing someone you beat +8, or
// +2 if you started the fight (rules.worthiness.spareStarted). Milestone 7b: each PC's phone gets an alert saying what happened.

import RULES from '../../data/rules.js';
import { render } from './text.js';
import { displayRoles } from './events.js';
import { killRacer, addWorthiness, addAlert } from './racers.js';
import { npcDies } from './field.js';
import { standMods } from './stands.js';
import { allyOf } from './alliances.js';
import { hasHorse, takeHorse } from './horses.js';
import { carried, takePart } from './corpse.js';
import { deathProof } from './dead.js';
import { isLoveTrain, redirectMisfortune } from './final-stage.js';

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
  if (deathProof(ctx, who)) return false; // safe stages for PCs, the dead's Blessing, Love Train
  return !(who.tier === 'canon' && RULES.canonImmuneStages.includes(ctx.stage?.id));
}

/** PC deaths lean late: in earlier stages a beaten PC more often gets away (rules.pcDeathByStage). */
function lateEnough(ctx, who) {
  if (who.tier !== 'pc') return true;
  const m = RULES.pcDeathByStage[ctx.stage?.id] ?? 1;
  return m >= 1 || ctx.rng.chance(m);
}

function die(ctx, who, cause, killer, masked = false) {
  killer.kills = (killer.kills ?? 0) + 1;
  if (masked) {
    // A Valentine errand: the Fallen screen says "a rider in a dark hat" (the M6 reveal unmasks it).
    killRacer(ctx, who, cause, { ...killer, name: 'a rider in a dark hat' });
    if (who.death) who.death.secretBy = killer.name;
    return;
  }
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
  const roles = { x, y, ...(spec.extra ?? {}) }; // extra: more roles the opening line names (a rescue's victim)
  const masked = !!spec.masked;
  let text = spec.open ?? LINES.open[kind] ?? LINES.open.strike;
  let outcome;
  let death = false;
  x.fights = (x.fights ?? 0) + 1;
  y.fights = (y.fights ?? 0) + 1;
  const carriedBefore = carried(ctx.state, y).length;
  let scores = null; // { a: { base, roll }, d } for the debug log
  let took = []; // labels of the parts the winner took (the phone alert)
  let horseTaken = null;

  // Notes stay templates (rendered once, at the end), keyed to the roles they name.
  const addNotes = (notes) => {
    for (const [k, w, z] of notes) {
      const wKey = Object.keys(roles).find((key) => roles[key] === w);
      let tpl = LINES[k].replaceAll('{w', `{${wKey}`);
      if (z) {
        const zKey = `ally${Object.keys(roles).length}`;
        roles[zKey] = z;
        tpl = tpl.replaceAll('{z', `{${zKey}`);
      }
      text += tpl;
      if (k === 'stand' && w.stand) w.stand.revealed = true; // first fight with it reveals it
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
    if (spec.defend === 'fight-kill' && -margin >= F().killMargin && mortal(ctx, x) && lateEnough(ctx, x)) {
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
        addWorthiness(y, W.spare, ctx, { great: x.tier === 'pc' }); // sparing a PC who attacked you is a great deed
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
    if (choice === 'kill' && isLoveTrain(ctx.state, y) && m >= F().killMargin) {
      // Love Train: the killing blow lands on someone nearby instead.
      outcome = 'kill-missed';
      text += LINES.killMissed + (redirectMisfortune(ctx, y, x) ?? '');
    } else if (choice === 'kill') {
      if (m < F().killMargin || ctx.rng.chance(F().killEscape) || !mortal(ctx, y) || !lateEnough(ctx, y)) {
        outcome = 'kill-missed';
        y.injured = true;
        text += LINES.killMissed;
        // No kill, no kill cost: the loser got away.
      } else {
        outcome = 'kill';
        death = true;
        text += cruel ? LINES.killFled : LINES.kill;
        die(ctx, y, spec.cause ?? 'killed in a fight', x, masked && y.tier !== 'npc');
        // A rescue: killing the attacker to save someone counts as defense.
        addWorthiness(x, spec.rescue ? W.killDefense : cruel ? W.killCruel : W.killStarted, ctx);
      }
    } else if (choice === 'part' || choice === 'searched') {
      // Search them. The stream line is the same whether there was anything to find.
      const got = takeParts(ctx, x, y, spec, took);
      outcome = got ? 'part' : 'searched';
      if (!got && spec.fallback === 'horse' && hasHorse(y) && choice === 'part') {
        outcome = 'horse';
        const lost = takeHorse(ctx, x, y);
        horseTaken = lost;
        text += lost && x.horse === lost.name && !x.onFoot ? LINES.horse : LINES.horseDrive;
      } else {
        text += choice === 'searched' ? LINES.searched : LINES.part;
        if (!got && choice === 'searched') y.injured = true; // roughed up, quietly
      }
      if (got && x.tier !== 'agent' && !x.immortal) addWorthiness(x, W.stealPart, ctx);
    } else if (choice === 'horse') {
      outcome = 'horse';
      const lost = takeHorse(ctx, x, y);
      horseTaken = lost;
      text += lost && x.horse === lost.name && !x.onFoot ? LINES.horse : LINES.horseDrive;
    } else {
      outcome = 'spare';
      text += spec.spareLine ?? LINES.spare;
      if (x.tier !== 'agent') {
        x.spares = (x.spares ?? 0) + 1;
        addWorthiness(x, spec.rescue ? W.spare : W.spareStarted, ctx);
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
    fightAlerts(x, y, outcome, { masked, took, horse: horseTaken, alertX: spec.alertX, alertY: spec.alertY });
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

/**
 * Milestone 7b: after any fight, each PC's phone says exactly what happened
 * ("Ringo Roadagain beat you and took the left arm.", "You drove them off and kept everything.").
 * A masked attacker stays "a rider in a dark hat". spec.alertX / alertY override a side's text.
 */
export function fightAlerts(x, y, outcome, { masked = false, took = [], horse = null, alertX = null, alertY = null } = {}) {
  const cap = (n) => n.charAt(0).toUpperCase() + n.slice(1);
  const xn = cap(masked ? 'a rider in a dark hat' : x.name);
  const yn = cap(y.name ?? 'they');
  const lostWhat = took.length ? `took ${list(took)}` : horse ? `took ${horse.name}` : null;
  const X = {
    escape: [`${yn} got away`, 'They fled before you could catch them.'],
    'both-hurt': ['A standstill', `You fought ${yn} to a standstill. You're both hurt.`],
    kill: [`You killed ${yn}`, ''],
    'kill-missed': [`${yn} got away`, `You beat ${yn}, but they got away, badly hurt.`],
    part: ['You won the fight', `You beat ${yn} and went through their things.`],
    searched: ['You won the fight', `You beat ${yn} and went through their things.`],
    horse: ['You won the fight', `You beat ${yn} and took their horse.`],
    spare: ['You won the fight', `You beat ${yn} and let them go.`],
    'reversal-spare': ['You lost the fight', `${yn} turned it around and drove you off.`],
  };
  const Y = {
    escape: ['You got away', `You fled from ${xn} and kept everything.`],
    'both-hurt': ['A standstill', `You fought ${xn} to a standstill. You're both hurt.`],
    'kill-missed': ['You lost the fight', `${xn} beat you. You got away, badly hurt${lostWhat ? '' : ', and kept everything'}.`],
    part: ['You lost the fight', `${xn} beat you and ${lostWhat ?? 'went through your things'}.`],
    searched: ['You lost the fight', `${xn} beat you and went through your things. They found nothing, and you kept everything.`],
    horse: ['You lost the fight', `${xn} beat you and ${horse ? `took ${horse.name}` : 'drove off your horse'}.`],
    spare: ['You lost the fight', `${xn} beat you and let you go. You kept everything.`],
    'reversal-kill': [`You killed ${masked ? 'the rider in the dark hat' : x.name}`, masked ? `It was ${x.name}${x.name.endsWith('.') ? '' : '.'}` : 'You kept everything.'],
    'reversal-spare': ['You won the fight', `You drove ${masked ? 'the rider in the dark hat' : x.name} off and kept everything.`],
  };
  const sx = alertX?.[outcome] ?? X[outcome];
  const sy = alertY?.[outcome] ?? Y[outcome];
  if (sx && x.status !== 'dead') addAlert(x, 'calm', sx[0], sx[1]);
  if (sy && y.status !== 'dead') addAlert(y, 'calm', sy[0], sy[1]);
}

const list = (xs) => (xs.length < 2 ? xs[0] : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** The winner takes one corpse part (or every one, `takeAll`) the loser carries. Returns how many. */
function takeParts(ctx, winner, loser, spec, took = []) {
  const items = carried(ctx.state, loser);
  if (!items.length) return 0;
  const list = spec.takeAll ? items : [ctx.rng.pick(items)];
  for (const it of list) took.push(it.label);
  const to = spec.partTo === 'president' || winner.tier === 'agent' || winner.immortal ? 'president' : winner;
  for (const it of list) takePart(ctx, it, to, 'fight', loser);
  return list.length;
}
