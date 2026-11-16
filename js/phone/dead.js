// The dead players' card (milestone 6a): "You're dead, but you're not done."
// Each round the dead vote Hazard / Ambush / Blessing for the next round; a
// Blessing also picks which living PC gets it. Pure render: the caller sends.
import { h } from '../ui/dom.js';

const CHOICES = [
  ['hazard', 'Hazard', 'A storm, a stampede, a fire: three riders lose time, one gets hurt.'],
  ['ambush', 'Ambush', 'A rider with the dead\'s fury attacks someone at random. It can hit anyone.'],
  ['blessing', 'Blessing', 'Heal a living rider, speed them up, and keep them safe for a round.'],
];

/**
 * `vote`: privateView.deadVote ({ forRound, mine, targets }) or null.
 * `picking`: true while choosing a Blessing target. `onVote(category, targetId)`, `onPick(bool)`.
 */
export function deadCard(vote, { picking, onVote, onPick }) {
  const mine = vote?.mine;
  const targetName = (id) => vote?.targets.find((t) => t.id === id)?.name;
  return h('section', { class: 'dead-card' },
    h('h2', {}, "You're dead, but you're not done"),
    h('p', { class: 'dead-intro' }, 'Every round the dead choose what happens to the living. Most votes wins; the game breaks ties. Nobody ever sees who voted what.'),
    !vote
      ? h('p', { class: 'dead-wait' }, 'The next vote opens when the next round is revealed.')
      : [
        h('div', { class: 'choice-options' }, CHOICES.map(([id, label, hint]) => h('button', {
          type: 'button', class: 'choice-opt' + (mine?.category === id ? ' chosen' : '') + (picking && id === 'blessing' ? ' picking' : ''),
          'aria-pressed': String(mine?.category === id),
          onclick: () => (id === 'blessing' ? onPick(true) : onVote(id)),
        },
        h('span', { class: 'opt-label' }, label),
        h('span', { class: 'opt-hint' }, hint),
        mine?.category === 'blessing' && id === 'blessing' && targetName(mine.targetId) ? h('span', { class: 'opt-target' }, `For ${targetName(mine.targetId)}`) : null))),
        picking ? h('div', { class: 'target-pick' },
          h('h3', {}, 'Who gets the blessing?'),
          vote.targets.length
            ? h('div', { class: 'target-list' }, vote.targets.map((t) => h('button', { type: 'button', class: 'btn target-btn', onclick: () => onVote('blessing', t.id) }, t.name)))
            : h('p', {}, 'Nobody is left to bless.'),
          h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => onPick(false) }, 'Cancel')) : null,
        h('p', { class: 'choice-status' + (mine ? ' ok' : '') }, mine
          ? 'Your vote is in. You can change it until the next round starts.'
          : 'Vote before the next round starts. If no one votes, nothing happens.'),
      ]);
}
