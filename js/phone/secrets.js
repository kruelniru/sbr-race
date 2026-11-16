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
    return h('section', { class: 'stand-card none' },
      h('div', { class: 'stand-label' }, 'Your Stand'),
      h('p', { class: 'stand-none' }, 'No Stand yet. The Devil\'s Palm, a Stand Arrow, or a corpse part might change that.'));
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
  const items = you?.items ?? [];
  if (!items.length) return null;
  const open = !!you.choiceOpen;
  return h('section', { class: 'items-card' },
    h('h3', {}, 'Items'),
    h('ul', { class: 'item-list' }, items.map((it) => {
      const can = open && (it.usable || it.pending);
      const label = it.pending ? 'Using this round · tap to cancel' : it.kind === 'arrow' ? 'Pierce yourself' : 'Eat it';
      return h('li', { class: 'item' + (it.pending ? ' pending' : '') },
        h('div', { class: 'item-text' },
          h('div', { class: 'item-name' }, it.label),
          h('div', { class: 'item-blurb' }, it.blurb),
          !it.usable && it.why ? h('div', { class: 'item-why' }, it.why) : null),
        h('div', { class: 'item-actions' },
          h('button', {
            type: 'button', class: 'btn btn-small item-use' + (it.pending ? ' btn-primary' : ''), disabled: !can,
            onclick: () => onUse(it.id),
          }, label),
          onOffer && !it.pending ? h('button', { type: 'button', class: 'btn btn-small btn-quiet item-offer', onclick: () => onOffer(it) }, 'Offer') : null));
    })),
    h('p', { class: 'item-hint' }, open ? 'It happens with this round.' : 'You can use items while a decision is open.'));
}

export function hintsCard(hints) {
  return h('section', { class: 'hints-card' },
    h('h3', {}, 'Only you know'),
    h('ul', {}, hints.slice().reverse().map((x) => h('li', {}, x.text))));
}
