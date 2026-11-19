// The phone's private sections (milestone 4): the Worthiness bar, your Stand,
// kept items and private hints. Everything here comes from privateView and is
// shown only on its owner's phone. Pure rendering (no network), so it can be
// render-tested in Node.
import { h } from '../ui/dom.js';

/** RDR2-style bar: segments, no number. `level` is 0..20 from the host. */
export function worthinessBar(level) {
  const steps = 20;
  return h('div', { class: 'worth', role: 'img', 'aria-label': `Worthiness: ${worthWord(level)}` },
    h('div', { class: 'worth-bar' },
      Array.from({ length: steps / 2 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, (level - i * 2) / 2)); // each segment holds 2 steps
        return h('span', { class: 'worth-seg', style: `--fill:${fill}` });
      })),
    h('span', { class: 'worth-word' }, worthWord(level)));
}

function worthWord(level) {
  if (level >= 16) return 'The Saint is watching';
  if (level >= 12) return 'Worthy';
  if (level >= 8) return 'Unproven';
  if (level >= 4) return 'Doubtful';
  return 'Unworthy';
}

const TIER_LABEL = { legendary: 'Legendary', rare: 'Rare', common: 'Common' };

export function standCard(r) {
  if (!r.stand) {
    return h('section', { class: 'stand-card none' + (r.settling ? ' settling' : '') },
      h('div', { class: 'stand-label' }, 'Your Stand'),
      h('p', { class: 'stand-none' }, r.settling
        ? 'The part is settling into you… By the end of next round you\'ll know if it accepts you.'
        : r.ateRokakaka
          ? 'Your Stand is gone (you ate a Rokakaka). The Devil\'s Palm, a Stand Arrow, or a corpse part can give you a new one.'
          : 'No Stand yet. The Devil\'s Palm, a Stand Arrow, or a corpse part might change that.'));
  }
  return h('section', { class: `stand-card tier-${r.stand.tier}` },
    h('div', { class: 'stand-label' }, 'Your Stand', h('span', { class: `tier-badge tier-${r.stand.tier}` }, TIER_LABEL[r.stand.tier] ?? r.stand.tier)),
    h('div', { class: 'stand-name' }, r.stand.name),
    r.stand.flavor && h('p', { class: 'stand-flavor' }, r.stand.flavor),
    h('p', { class: 'stand-note' }, 'Only you know. The stream sees it the first time it shows up in an event.'));
}

/**
 * Kept Stand Arrows and Rokakaka. Usable while any decision is open; resolves
 * with that round. `onUse(itemId)` sends the request (again to cancel).
 */
export function itemsCard(you, onUse, onOffer = null) {
  const items = (you?.items ?? []).filter((it) => it.kind !== 'part');
  if (!items.length) return null;
  const open = !!you.choiceOpen;
  return h('section', { class: 'items-card' },
    h('h3', {}, 'Items'),
    h('ul', { class: 'item-list' }, items.map((it) => {
      const can = open && (it.usable || it.pending);
      const label = it.pending ? 'Tap to cancel' : it.kind === 'arrow' ? 'Pierce yourself' : 'Eat it';
      return h('li', { class: 'item' + (it.pending ? ' pending' : '') },
        h('div', { class: 'item-text' },
          h('div', { class: 'item-name' }, it.label),
          h('div', { class: 'item-blurb' }, it.blurb),
          it.pending ? h('div', { class: 'item-pending' }, it.kind === 'arrow' ? "You'll pierce yourself when the round is revealed." : "You'll eat this when the round is revealed.") : null,
          !it.usable && !it.pending && it.why ? h('div', { class: 'item-why' }, it.why) : null),
        h('div', { class: 'item-actions' },
          // Some items have no button: their prompt finds you (milestone 7c).
          it.kind === 'requiem-arrow' ? null : h('button', {
            type: 'button', class: 'btn btn-small item-use' + (it.pending ? ' btn-primary' : ''), disabled: !can,
            onclick: () => onUse(it.id),
          }, label),
          onOffer && !it.pending ? h('button', { type: 'button', class: 'btn btn-small btn-quiet item-offer', onclick: () => onOffer(it) }, 'Offer') : null));
    })),
    h('p', { class: 'item-hint' }, open ? 'It happens with this round.' : 'You can use items while a decision is open.'));
}

/**
 * Corpse parts you carry (milestone 5b). Secret, like your Stand. A hidden
 * part can be held later ("Hold it": it merges with you this round).
 */
export function partsCard(you, onUse, onOffer = null, onDeliver = null) {
  const parts = (you?.items ?? []).filter((it) => it.kind === 'part');
  if (!parts.length) return null;
  const open = !!you.choiceOpen;
  return h('section', { class: 'parts-card' },
    h('h3', {}, "The Saint's Corpse", h('span', { class: 'parts-count' }, `${parts.length} ${parts.length === 1 ? 'part' : 'parts'}`)),
    h('ul', { class: 'item-list' }, parts.map((it) => h('li', { class: 'item part' + (it.hidden ? ' hidden-part' : '') + (it.pending ? ' pending' : '') },
      h('div', { class: 'item-text' },
        h('div', { class: 'item-name' }, it.label),
        h('div', { class: 'item-blurb' }, it.hidden
          ? "Wrapped, so it can't touch you: no Stand, no rejection, and agents notice it less."
          : 'It has merged with you. Agents hunt whoever carries one.')),
      h('div', { class: 'item-actions' },
        it.hidden ? h('button', {
          type: 'button', class: 'btn btn-small item-use' + (it.pending ? ' btn-primary' : ''), disabled: !(open && (it.usable || it.pending)),
          onclick: () => onUse(it.id),
        }, it.pending ? 'Holding it this round · tap to cancel' : 'Hold it') : null,
        onDeliver && it.deliverable ? h('button', {
          type: 'button', class: 'btn btn-small item-deliver' + (it.delivering ? ' btn-primary' : ''), disabled: !open,
          onclick: () => onDeliver(it.id),
        }, it.delivering ? 'Delivering this round · tap to cancel' : 'Deliver it to the President') : null,
        onOffer && !it.pending && !it.delivering ? h('button', { type: 'button', class: 'btn btn-small btn-quiet item-offer', onclick: () => onOffer(it) }, 'Offer') : null)))),
    h('p', { class: 'item-hint' }, 'Only you know. Whoever holds the most going into the Final Stage matters. So does the President, who is gathering them too.'));
}

/** You ride for Valentine (milestone 5b): only your phone knows, until the finale. */
export function valentineCard(v) {
  if (!v) return null;
  if (v.outcome) {
    const text = {
      won: `The President holds the Corpse. As promised: +${v.bonus} points.`,
      lost: "The President's plan failed. You rode for the losing side.",
      dead: 'The President is dead. You rode for a dead man.',
      betrayed: "The President's own rider betrayed him. You get nothing.",
      traitor: 'You kept the Saint\'s Corpse for yourself. The President will never forgive you.',
    }[v.outcome];
    return h('section', { class: 'valentine-card ' + (['won', 'traitor'].includes(v.outcome) ? 'won' : 'lost') },
      h('h3', {}, 'You rode for Valentine'),
      h('p', { class: 'valentine-outcome' }, text));
  }
  return h('section', { class: 'valentine-card' + (v.hunted ? ' hunted' : '') },
    h('h3', {}, 'You ride for Valentine'),
    h('p', { class: 'valentine-status' }, v.hunted
      ? `HUNTED: you carry a corpse part the President wants. His agents will come for you until you deliver it (+${v.deliverPoints} points a part).`
      : 'Protected: his agents ride past you.'),
    h('ul', {},
      v.relay ? h('li', {}, `Fresh relay horses: a little better placement every stage (+${v.relay}).`) : null,
      h('li', {}, 'Once a stage, he may send you on an errand.'),
      v.bonus ? h('li', {}, `If the President ends with more corpse parts than every racer combined, you get +${v.bonus} points.`) : null),
    v.errand ? h('p', { class: 'valentine-errand' }, 'Your errand rides next round, in a dark hat.') : null,
    h('p', { class: 'item-hint' }, 'Nobody else knows. The finale will tell them.'));
}

/** Your own story, at the very end (milestone 6c). */
export function storyCard(story) {
  if (!story) return null;
  return h('section', { class: 'story-card' },
    h('h2', {}, 'Your Steel Ball Run'),
    h('ul', {}, story.lines.map((t) => h('li', {}, t))));
}

export function hintsCard(hints) {
  return h('section', { class: 'hints-card' },
    h('h3', {}, 'Only you know'),
    h('ul', {}, hints.slice().reverse().map((x) => h('li', {}, x.text))));
}
