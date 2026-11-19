// The secret cheat menu's UI, shared by the host and the phone (testing only).
// Nothing here is visible until 7 quick taps on the connection status and a
// correct PIN. A wrong PIN just closes the pad, with no message.
import { h } from './dom.js';

/** Count taps: `onSeven()` after 7 within 3 seconds. Returns the click handler. */
export function sevenTaps(onSeven) {
  let taps = [];
  return () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 3000);
    taps.push(now);
    if (taps.length >= 7) { taps = []; onSeven(); }
  };
}

function overlay(...children) {
  const el = h('div', { class: 'cheat-overlay', role: 'dialog' }, h('div', { class: 'cheat-panel' }, ...children));
  document.body.append(el);
  return el;
}

/** A digits-only PIN pad. `onSubmit(pin)` once; the pad always closes. */
export function openPinPad(onSubmit) {
  let pin = '';
  const shown = h('div', { class: 'pin-dots' }, '');
  let el = null;
  const close = () => el?.remove();
  const key = (d) => h('button', { type: 'button', class: 'pin-key', onclick: () => { if (pin.length < 12) { pin += d; shown.textContent = '•'.repeat(pin.length); } } }, d);
  el = overlay(
    shown,
    h('div', { class: 'pin-grid' }, ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key),
      h('button', { type: 'button', class: 'pin-key', onclick: close }, '✕'),
      key('0'),
      h('button', { type: 'button', class: 'pin-key', onclick: () => { close(); onSubmit(pin); } }, '✓')),
  );
  return close;
}

/**
 * The cheat menu. `players` (host only): [{ id, name }] to pick the target.
 * `stands`: [{ id, name, tier }]. `onAction(action, value, targetId)`.
 */
export function openCheatMenu({ players = null, stands = [], onAction }) {
  let target = players?.[0]?.id ?? null;
  let el = null;
  // What happened: the host shows the result here; a phone gets it as a notice too.
  const said = h('p', { class: 'cheat-said', 'aria-live': 'polite' }, '');
  const say = (res) => { said.textContent = !res ? '' : res.ok === false ? res.error ?? 'That did not work.' : res.warning ?? res.info ?? 'Done.'; said.className = 'cheat-said' + (res?.warning || res?.ok === false ? ' warn' : ''); };
  const btn = (label, action, value = () => null) => h('button', { type: 'button', class: 'btn btn-small', onclick: () => say(onAction(action, value(), target)) }, label);
  const worth = h('input', { type: 'number', min: 0, max: 100, value: 50, class: 'cheat-num' });
  const stand = h('select', { class: 'cheat-select' }, stands.map((s) => h('option', { value: s.id }, `${s.name} (${s.tier})`)));
  const row = (title, ...items) => h('div', { class: 'cheat-row' }, h('strong', {}, title), h('div', { class: 'cheat-btns' }, ...items));
  el = overlay(
    h('h2', {}, 'Cheats'),
    h('p', { class: 'cheat-note' }, 'Every cheat is recorded. This game will say "Cheats used".'),
    players ? row('Player', h('select', { class: 'cheat-select', onchange: (e) => { target = e.target.value; } }, players.map((p) => h('option', { value: p.id }, p.name)))) : null,
    row('Worthiness', btn('+10', 'worthiness+10'), btn('−10', 'worthiness-10'), worth, btn('Set', 'worthiness-set', () => worth.value)),
    row('Valentine', btn('Join', 'valentine-join'), btn('Leave', 'valentine-leave')),
    row('Corpse parts', btn('Gain all 9', 'parts-all'), btn('Lose all', 'parts-none')),
    row('Stand', stand, btn('Give', 'stand-give', () => stand.value), btn('Remove', 'stand-remove')),
    row('Items', btn('Stand Arrow', 'item-arrow'), btn('Rokakaka', 'item-rokakaka'), btn('Requiem Arrow', 'item-requiem-arrow')),
    row('Horse', btn('Lose horse', 'horse-lose'), btn('Thoroughbred', 'horse-thoroughbred')),
    row('Race', btn('Skip to Stage 9', 'skip-stage9'), btn('Kill', 'kill'), btn('Revive', 'revive')),
    h('p', { class: 'cheat-note' }, 'Set parts, Stands and Worthiness first; the boss is chosen when Stage 9 plans close.'),
    row('Secret endings', btn('Set up Requiem (Arrow + Stand)', 'setup-requiem'), btn('Trigger D4C (pick a dead player)', 'trigger-d4c')),
    row('Force next sub event', btn("Devil's Palm", 'force-palm'), btn('Valentine offer', 'force-offer'), btn('Funny Valentine', 'force-fv'), btn('A fight', 'force-fight')),
    said,
    h('button', { type: 'button', class: 'btn btn-quiet cheat-close', onclick: () => el.remove() }, 'Close'),
  );
  return { close: () => el?.remove(), say };
}
