// The main ending and the epilogues (milestone 6b, DESIGN.md → Finale).
// Exactly one main ending per game, decided at the last Finish Line, in this
// priority (the first that applies):
//
//   1. president-dead  Funny Valentine was killed in the Final Stage.
//   2. president       He holds more parts than every racer combined.
//   3. double-cross    The boss is a Valentine joiner, reaches New York, and keeps the Corpse.
//   4. corpse          The boss reaches New York holding the Corpse (3+ parts).
//   5. bloodbath       fewer than a quarter of the PCs who started reach New York.
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
import { requiemHolder, saintHolder } from './secret-endings.js';

export const ENDINGS = {
  requiem: { title: 'Requiem', text: '' },
  saint: { title: 'The Saint Walks Again', text: '' },
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
  // The Bloodbath counts PCs only (15 canon racers would always keep it from happening).
  const pcs = state.players.filter((p) => p.hasCharacter);
  const reachedNY = pcs.filter((p) => p.status === 'racing' && !p.otherWorld).length;
  // Secret endings first (milestone 6d): each wins outright.
  const requiem = requiemHolder(state);
  const saint = requiem ? null : saintHolder(state);
  let id = 'normal';
  if (requiem) id = 'requiem';
  else if (saint) id = 'saint';
  else if (valentineDead(state)) id = 'president-dead';
  else if (pres > held) id = 'president';
  else if (bossHolds && isJoiner(boss)) id = 'double-cross';
  else if (bossHolds) id = 'corpse';
  else if (reachedNY < pcs.length * F.bloodbathShare) id = 'bloodbath';
  const ending = { id, president: pres, racers: held, reachedNY };
  if (requiem) Object.assign(ending, { winnerId: requiem.id, winnerName: requiem.name, stand: requiem.stand.name, from: state.race.requiem.from });
  if (saint) Object.assign(ending, { winnerId: saint.id, winnerName: saint.name });
  if (['corpse', 'double-cross'].includes(id)) {
    // Love Train's bonus goes to a boss chosen with Love Train who still holds the Corpse (3+), even if a fight took a part or two.
    const lt = !!race.boss.loveTrain;
    const bonus = lt ? F.loveTrainBonus : F.corpseBonus;
    boss.points += bonus;
    Object.assign(ending, { bossId: boss.id, bossName: boss.name, parts: bossParts, bonus, loveTrain: lt });
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
  if (e.id === 'requiem') text = `${e.winnerName} drove the Arrow into ${e.from}, and it became ${e.stand}. Whatever the trail tried to do to them never arrived. The Steel Ball Run is theirs, whatever the points say.`;
  if (e.id === 'saint') text = `All nine parts of the Saint's Corpse came together in ${e.winnerName}'s hands at Trinity Church. The Saint walks again, and ${e.winnerName} walks beside him. No one else could have won.`;
  return { id: e.id, title: def.title, text, bossId: e.bossId ?? e.winnerId ?? null };
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
