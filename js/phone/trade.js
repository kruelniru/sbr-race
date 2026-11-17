// The phone's milestone 5a pieces: the horse trader (inside the Stage Plan
// card in town stages) and secret trade offers. Pure render functions: the
// caller passes the data and the callbacks that talk to the host.
import { h } from '../ui/dom.js';

/** The horse trader. `onPick(quality | null)`; tapping the chosen one again cancels. */
export function trader(prompt, onFoot, onPick) {
  return h('div', { class: 'trader' },
    h('h3', {}, 'Horse trader'),
    h('p', { class: 'trader-note' }, onFoot ? "You're on foot. A horse changes everything." : 'You could trade up.'),
    h('div', { class: 'trader-list' },
      prompt.shop.map((o) => h('button', {
        type: 'button', class: 'btn trader-btn' + (prompt.buy === o.quality ? ' chosen' : ''), 'aria-pressed': String(prompt.buy === o.quality),
        onclick: () => onPick(prompt.buy === o.quality ? null : o.quality),
      }, `${o.label} horse`, h('span', { class: 'trader-price' }, `${o.price} points`)))),
    h('p', { class: 'trader-note' }, prompt.buy ? 'Paid for when the plan locks in. Tap it again to cancel.' : 'Optional. Tap one to buy it with this stage.'));
}

/**
 * Make a secret trade offer: who gets it, and what (if anything) you want
 * back. `onDone({ give, to, ask } | null)`; null = cancelled.
 */
export function offerForm(you, offering, onDone) {
  const targets = offering.give === 'horse' ? you.tradeTargets.horse : you.tradeTargets.item;
  const sel = h('select', { class: 'offer-to' }, targets.map((t) => h('option', { value: t.id }, t.name)));
  // Only what this person could actually give back: never the same thing you
  // offer, and "their horse" only from someone who has one (milestone 7a).
  const asksFor = (t) => {
    const asks = [['', 'Nothing: a gift'], ['arrow', 'A Stand Arrow'], ['rokakaka', 'A Rokakaka fruit'], ['part', 'A corpse part']]
      .filter(([v]) => !v || v !== offering.kind);
    if (you.canAskHorse && offering.give !== 'horse' && t?.hasHorse) asks.push(['horse', 'Their horse']);
    return asks;
  };
  const ask = h('select', { class: 'offer-ask' });
  const fill = () => {
    const t = targets.find((x) => x.id === sel.value) ?? targets[0];
    ask.replaceChildren(...asksFor(t).map(([v, l]) => h('option', { value: v }, l)));
  };
  fill();
  sel.addEventListener('change', fill);
  return h('section', { class: 'offer-card' },
    h('h3', {}, `Offer ${offering.label}`),
    h('label', { class: 'field' }, h('span', {}, 'To'), sel),
    h('label', { class: 'field' }, h('span', {}, 'For'), ask),
    h('p', { class: 'item-hint' }, offering.kind === 'part'
      ? "It's secret. They answer in their next decision. Giving a corpse part away for nothing is a great deed."
      : "It's secret. They answer in their next decision, and it happens with that round. A gift counts as a good deed."),
    h('div', { class: 'offer-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', onclick: () => onDone({ give: offering.give, to: sel.value, ask: ask.value || null }) }, 'Send offer'),
      h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => onDone(null) }, 'Cancel')));
}

/** Your open offer, waiting for their next decision. */
export function pendingOffer(o, onCancel) {
  return h('section', { class: 'offer-card pending' },
    h('h3', {}, 'Your offer'),
    h('p', {}, `${o.give} to ${o.to}${o.ask ? `, for ${o.ask}` : ', as a gift'}.`),
    h('p', { class: 'item-hint' }, o.asked ? "They're deciding now." : 'Waiting for their next decision.'),
    o.asked ? null : h('button', { type: 'button', class: 'btn btn-small btn-quiet', onclick: onCancel }, 'Cancel offer'));
}
