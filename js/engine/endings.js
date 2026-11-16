// The main ending and the epilogues (milestone 6b, DESIGN.md → Finale).
// Exactly one main ending per game, decided at the last Finish Line, in this
// priority (the first that applies):
//
//   1. president-dead  Funny Valentine was killed in the Final Stage.
//   2. president       He holds more parts than every racer combined.
//   3. double-cross    The boss is a Valentine joiner, reaches New York, and keeps the Corpse.
//   4. corpse          The boss reaches New York holding the Corpse (3+ parts).
//   5. bloodbath       3 or fewer named racers reach New York.
//   6. normal
//
// The boss's bonus (corpse / double-cross) is paid before the podium. The
// joiners' outcome follows the ending (valentine.js valentineEnding).

import RULES from '../../data/rules.js';
import { EPILOGUES } from '../../data/epilogues.js';
import { namedRacers, findRacerAnywhere, addHint } from './racers.js';
import { carried, presidentParts } from './corpse.js';
import { valentineDead } from './final-stage.js';
import { isJoiner } from './valentine.js';

export const ENDINGS = {
  'president-dead': { title: 'The President is dead', text: 'Funny Valentine fell in the Final Stage, with no other world left to run to. The Saint\'s Corpse belongs to no one.' },
  president: { title: 'The President takes the Corpse', text: 'Funny Valentine holds the Saint\'s Corpse. America is his, whoever crosses the line.' },
  'double-cross': { title: 'The Double-Cross', text: 'The President\'s own rider has betrayed him.' },
  corpse: { title: 'Holder of the Saint\'s Corpse', text: '' },
  bloodbath: { title: 'The Bloodbath', text: 'The Steel Ball Run ends in silence.' },
  normal: null,
};

/** Decide the main ending and pay the boss. Sets state.race.ending; returns it. */
export function decideEnding(state) {
  const race = state.race;
  const F = RULES.finale;
  const held = (state.items ?? []).filter((i) => i.kind === 'part').length;
  const pres = presidentParts(state);
  const boss = race.boss ? findRacerAnywhere(state, race.boss.id) : null;
  const bossParts = boss ? carried(state, boss).length : 0;
  const bossHolds = boss && boss.status === 'racing' && bossParts >= F.bossMin;
  const reachedNY = namedRacers(state).filter((r) => r.status === 'racing').length;
  let id = 'normal';
  if (valentineDead(state)) id = 'president-dead';
  else if (pres > held) id = 'president';
  else if (bossHolds && isJoiner(boss)) id = 'double-cross';
  else if (bossHolds) id = 'corpse';
  else if (reachedNY <= F.bloodbath) id = 'bloodbath';
  const ending = { id, president: pres, racers: held, reachedNY };
  if (['corpse', 'double-cross'].includes(id)) {
    const bonus = bossParts >= F.loveTrain ? F.loveTrainBonus : F.corpseBonus;
    boss.points += bonus;
    Object.assign(ending, { bossId: boss.id, bossName: boss.name, parts: bossParts, bonus, loveTrain: bossParts >= F.loveTrain });
    addHint(boss, `You reached New York holding the Saint's Corpse. +${bonus} points.`, { stage: { id: 9 }, roundLabel: 'end' });
  }
  if (id === 'president-dead') ending.killers = (race.fv?.killers ?? []).map((k) => findRacerAnywhere(state, k)?.name).filter(Boolean);
  race.ending = ending;
  return ending;
}

/** The ending card for the finale (null for a normal ending). */
export function endingCard(state) {
  const e = state.race.ending;
  if (!e || e.id === 'normal') return null;
  const def = ENDINGS[e.id];
  let text = def.text;
  if (e.id === 'corpse') text = `${e.bossName} reached New York holding the Saint's Corpse${e.loveTrain ? ', Love Train and all' : ''}. +${e.bonus} points.`;
  if (e.id === 'double-cross') text = `${def.text} ${e.bossName} kept the Saint's Corpse. +${e.bonus} points.`;
  if (e.id === 'president-dead' && e.killers?.length) text += ` Killed by ${e.killers.join(' and ')}.`;
  return { id: e.id, title: def.title, text, bossId: e.bossId ?? null };
}

/** Epilogue cards after the podium (data/epilogues.js). */
export function epilogues(state, podium) {
  const winner = podium[0] ? findRacerAnywhere(state, podium[0].id) : null;
  const c = { state, winner, podium, ending: state.race.ending?.id ?? 'normal', racers: namedRacers(state) };
  const out = [];
  for (const e of EPILOGUES) {
    try {
      if (e.when(c)) out.push({ id: e.id, title: e.title, text: e.text(c), who: winner?.id ?? null });
    } catch { /* a broken epilogue never breaks the finale */ }
  }
  return out;
}
