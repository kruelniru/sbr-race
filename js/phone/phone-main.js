// Phone entry point: join a room, create a character, wait in the lobby,
// show your private status and the mini feed. The phone is a thin client:
// it only renders what the host sends it (privateView + publicView + feed).
import { ROOM_CODE_LENGTH, ROOM_CODE_ALPHABET } from '../config.js';
import { PhoneNet } from '../net/phone-net.js';
import { PROTOCOL_VERSION, TO_HOST, TO_PHONE, REJECT, msg } from '../net/protocol.js';
import PERSONALITIES from '../../data/personalities.js';
import PRONOUNS from '../../data/pronouns.js';
import PLANS from '../../data/plans.js';
import { h, $, mount, avatar, store } from '../ui/dom.js';
import { characterForm } from './character-form.js';
import { MiniFeed } from './feed.js';
import { keepAwake } from './wake-lock.js';
import { worthinessBar, standCard, itemsCard, hintsCard, partsCard, valentineCard, storyCard } from './secrets.js';
import { trader, offerForm, pendingOffer } from './trade.js';
import { deadCard } from './dead.js';
import { sevenTaps, openPinPad, openCheatMenu } from '../ui/cheat-ui.js';

// Storage keys. Tabs in one browser share localStorage, so to test several
// "phones" on one computer give each tab its own slot: phone.html?room=ABCD&slot=2
const SLOT = (new URLSearchParams(location.search).get('slot') ?? '').replace(/\W/g, '').slice(0, 8);
const ns = SLOT ? `sbr[${SLOT}]` : 'sbr';
const sessionKey = (code) => `${ns}:session:${code}`;
const LAST_ROOM = `${ns}:lastRoom`;
const DRAFT = `${ns}:draft`;

const ui = {
  status: $('#status'),
  room: $('#room-label'),
  connBar: $('#conn-bar'),
  connText: $('#conn-text'),
  wakeHint: $('#wake-hint'),
  main: $('#main'),
  feed: $('#feed'),
};
const feed = new MiniFeed(ui.feed);

let code = null;
let token = null;
let you = null;     // privateView from the host
let pub = null;     // publicView from the host
let screen = 'join';
let netStatus = null;
let form = null;    // active character form, if any
let saving = false; // a CHARACTER message is waiting for an answer

// Choices: the open prompt comes inside `you`; the timer comes beside it.
let timer = null;      // { remainingMs, durationMs, paused, at } (at = performance.now() when received)
let picking = null;    // { promptId, optionId } while choosing a Hunt a rival target
let sent = null;       // { promptId, optionId, targetId } last answer we sent
let lastPromptId = null;
let choiceError = '';
let deadPicking = false; // choosing who gets the dead's Blessing
let offering = null;    // { give: itemId | 'horse', label } while making a trade offer
let notice = '';       // a short message from the host (offer sent, trader refused...)
setInterval(tickCountdown, 250);

const net = new PhoneNet({
  onOpen: () => net.send(msg(TO_HOST.HELLO, { v: PROTOCOL_VERSION, token })),
  onMessage: handle,
  onStatus: renderStatus,
  onGiveUp: () => {
    // Keep the session token so "Try again" (or the same code) resumes the
    // racer, but stop auto-joining this room on the next page load.
    const lost = code;
    store.remove(LAST_ROOM);
    leaveScreens();
    showJoin('', `Couldn't reach room ${lost}. The host may have closed it.`, lost);
  },
});

$('#leave-btn').addEventListener('click', () => {
  if (!confirm(`Leave room ${code}? You'll need a new code to join a game.`)) return;
  net.stop();
  forgetSession();
  leaveScreens();
  showJoin('');
});

keepAwake((mode) => {
  ui.wakeHint.hidden = mode !== 'none';
});

init();

// ---------------------------------------------------------------- the secret cheat menu (testing)
// 7 quick taps on the connection status, then the PIN. The host checks it;
// a wrong PIN just closes the pad. Nothing in the normal UI hints at this.
let cheatWanted = false;
let cheatMenu = null; // { close, say } while open
function openCheats() {
  cheatMenu = openCheatMenu({
    stands: you?.cheat?.stands ?? [],
    onAction: (action, value) => (net?.send(msg(TO_HOST.CHEAT, { action, value })) ? { ok: true, info: 'Sent…' } : { ok: false, error: 'Not connected.' }),
  });
}
ui.status.addEventListener('click', sevenTaps(() => {
  if (you?.cheat) return openCheats();
  openPinPad((pin) => {
    if (!pin || !net?.send(msg(TO_HOST.CHEAT_UNLOCK, { pin }))) return;
    cheatWanted = true;
    setTimeout(() => { cheatWanted = false; }, 8000);
  });
}));

function init() {
  const fromUrl = normalizeCode(new URLSearchParams(location.search).get('room'));
  const last = normalizeCode(store.get(LAST_ROOM));
  if (fromUrl) {
    // A code in the link always wins over a saved session for another room.
    connect(fromUrl);
  } else if (last && store.get(sessionKey(last))) {
    connect(last);
  } else {
    showJoin('');
  }
}

function connect(c) {
  code = c;
  token = store.get(sessionKey(code));
  you = null;
  pub = null;
  feed.add([], true);
  setUrlRoom(code);
  ui.room.textContent = `Room ${code}`;
  setScreen('connecting');
  net.start(code);
}

// Keep ?room= in the address bar in sync, so reloading never resurrects an
// old room (the bug where a phone stayed stuck on a closed room's code).
function setUrlRoom(c) {
  const url = new URL(location.href);
  if (c) url.searchParams.set('room', c);
  else url.searchParams.delete('room');
  history.replaceState(null, '', url);
}

// ---------------------------------------------------------------- messages

function handle(m) {
  switch (m.t) {
    case TO_PHONE.WELCOME:
      token = m.token;
      forgetOtherRooms();
      store.set(sessionKey(code), token);
      store.set(LAST_ROOM, code);
      if (m.needsCharacter && screen !== 'form') showForm();
      break;

    case TO_PHONE.YOU:
      you = m.you;
      notice = m.notice ?? '';
      if (cheatWanted && you?.cheat) { cheatWanted = false; openCheats(); }
      // The host's answer to a cheat (applied, a warning, or why not).
      if (cheatMenu && m.notice && document.querySelector('.cheat-overlay')) cheatMenu.say(m.notice === 'Cheat applied.' ? { ok: true, info: m.notice } : { ok: true, warning: m.notice });
      timer = m.timer ? { ...m.timer, at: performance.now() } : null;
      if (you?.prompt?.id !== lastPromptId) {
        lastPromptId = you?.prompt?.id ?? null;
        picking = null;
        sent = null;
        choiceError = '';
        if (lastPromptId) navigator.vibrate?.(150);
      }
      feed.setMine(you?.id);
      if (saving && you.hasCharacter) {
        saving = false;
        form = null;
        setScreen(pub?.phase === 'lobby' ? 'lobby' : 'racing');
      } else if (screen === 'lobby' || screen === 'racing') {
        renderScreen();
      }
      break;

    case TO_PHONE.PUBLIC: {
      const phaseChanged = pub && pub.phase !== m.phase;
      pub = m;
      if (screen === 'connecting') {
        if (you?.hasCharacter) setScreen(pub.phase === 'lobby' ? 'lobby' : 'racing');
        else showForm();
      } else if (screen === 'form' && pub.phase !== 'lobby' && you?.hasCharacter) {
        form = null; // editing was cut off by the lobby locking
        setScreen('racing');
      } else if (screen === 'lobby' || screen === 'racing') {
        if (phaseChanged) setScreen(pub.phase === 'lobby' ? 'lobby' : 'racing');
        else renderScreen();
      }
      break;
    }

    case TO_PHONE.FEED:
      feed.add(m.items, m.reset);
      ui.feed.hidden = false;
      break;

    case TO_PHONE.CHAR_ERROR:
      saving = false;
      form?.setBusy(false);
      form?.showError(m.message);
      break;

    case TO_PHONE.REJECTED:
      if (m.reason !== REJECT.BAD_VERSION) forgetSession();
      end(m.message);
      break;

    case TO_PHONE.KICKED:
      forgetSession();
      end(m.message);
      break;

    case TO_PHONE.ROOM_CLOSED: {
      const closed = code;
      net.stop();
      forgetSession();
      leaveScreens();
      showJoin('', `The host closed room ${closed}. Enter the new code to join.`);
      break;
    }
  }
}

function forgetSession() {
  if (code) store.remove(sessionKey(code));
  store.remove(LAST_ROOM);
  token = null;
}

/** Only one room's session matters at a time; drop leftovers from old rooms. */
function forgetOtherRooms() {
  try {
    const prefix = `${ns}:session:`;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(prefix) && k !== sessionKey(code)) localStorage.removeItem(k);
    }
  } catch { /* storage unavailable */ }
}

function leaveScreens() {
  you = null;
  pub = null;
  form = null;
  saving = false;
  code = null;
  setUrlRoom(null);
}

function end(message) {
  net.stop();
  you = null;
  pub = null;
  form = null;
  saving = false;
  setUrlRoom(null);
  setScreen('ended', message);
}

// ---------------------------------------------------------------- screens

function setScreen(name, detail) {
  screen = name;
  renderScreen(detail);
  renderStatus(netStatus);
  window.scrollTo(0, 0);
}

function renderScreen(detail) {
  switch (screen) {
    case 'join': return; // rendered by showJoin
    case 'form': return; // rendered by showForm; never re-render (keeps typing)
    case 'connecting':
      mount(ui.main, h('section', { class: 'center' }, h('div', { class: 'spinner' }), h('p', {}, 'Riding to the starting line…')));
      return;
    case 'lobby': return renderLobby();
    case 'racing': return renderRacing();
    case 'ended':
      mount(ui.main, h('section', { class: 'center' },
        h('p', { class: 'big-line' }, detail || 'Disconnected.'),
        h('button', { class: 'btn btn-primary', onclick: () => showJoin('') }, 'Join a room'),
      ));
      ui.feed.hidden = true;
  }
}

/**
 * @param {string} prefill    code to put in the box
 * @param {string} [notice]   why we're back here (room closed, unreachable)
 * @param {string} [retryCode] offer a "Try again" button for this room
 */
function showJoin(prefill, notice = '', retryCode = null) {
  screen = 'join';
  ui.room.textContent = '';
  ui.feed.hidden = true;
  const input = h('input', {
    class: 'code-input', type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters',
    spellcheck: false, maxlength: ROOM_CODE_LENGTH, value: prefill, placeholder: 'ABCD', 'aria-label': 'Room code',
    oninput: (e) => { e.target.value = normalizeCode(e.target.value, true); },
  });
  const error = h('p', { class: 'form-error', role: 'alert' });
  mount(ui.main,
    h('form', {
      class: 'join',
      onsubmit: (e) => {
        e.preventDefault();
        const c = normalizeCode(input.value);
        if (!c) {
          error.textContent = `Enter the ${ROOM_CODE_LENGTH}-letter code from the stream.`;
          return;
        }
        connect(c);
      },
    },
      h('h1', { class: 'title' }, 'Steel Ball Run'),
      h('p', { class: 'subtitle' }, 'Race Simulator'),
      notice && h('p', { class: 'notice' }, notice),
      retryCode && h('button', { type: 'button', class: 'btn', onclick: () => connect(retryCode) }, `Try room ${retryCode} again`),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Room code'), input),
      error,
      h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Join the race'),
    ),
  );
  renderStatus(null);
}

function showForm(editing = false) {
  screen = 'form';
  saving = false;
  const initial = editing && you?.hasCharacter ? you : store.get(DRAFT, {});
  form = characterForm({
    initial,
    submitLabel: editing ? 'Save changes' : 'Ride in',
    onCancel: editing ? () => { form = null; setScreen('lobby'); } : null,
    onSubmit: (character) => {
      store.set(DRAFT, character);
      if (!net.send(msg(TO_HOST.CHARACTER, character))) {
        form.showError('Not connected right now. Try again in a moment.');
        return;
      }
      saving = true;
      form.setBusy(true);
    },
  });
  mount(ui.main,
    h('section', {},
      h('h2', {}, editing ? 'Edit your racer' : 'Create your racer'),
      form.el,
    ),
  );
  renderStatus(netStatus);
  window.scrollTo(0, 0);
}

function renderLobby() {
  const riders = pub?.players ?? [];
  mount(ui.main,
    h('section', {},
      youCard(),
      h('button', { class: 'btn', onclick: () => showForm(true) }, 'Edit racer'),
      h('p', { class: 'waiting' }, 'Waiting for the host to start the race…'),
      h('h3', {}, `Riders (${riders.length})`),
      h('ul', { class: 'rider-list' },
        riders.map((r) => h('li', { class: r.connected ? '' : 'offline' },
          r.name, r.id === you?.id ? ' (you)' : '', r.ai ? h('span', { class: 'ai-tag' }, 'AI') : null)),
      ),
    ),
  );
}

function renderRacing() {
  const r = you?.race;
  const head = pub?.race;
  mount(ui.main,
    h('section', {},
      alertsBox(),
      head && (head.over
        ? h('div', { class: 'race-where' }, 'The race is over: New York!')
        : h('div', { class: 'race-where' }, `Stage ${head.stageId} · ${head.stageName}`, h('span', { class: 'race-round' }, head.label))),
      storyCard(r?.story),
      you?.prompt ? choiceCard(you.prompt) : null,
      r?.status === 'dead' && !you?.isAI ? deadCard(you.deadVote, {
        picking: deadPicking,
        onPick: (on) => { deadPicking = on; renderScreen(); },
        onVote: (category, targetId) => {
          deadPicking = false;
          if (!net.send(msg(TO_HOST.DEAD_VOTE, { category, targetId }))) notice = 'Not connected. Your vote was not sent.';
          renderScreen();
        },
      }) : null,
      youCard(),
      notice ? h('p', { class: 'notice' }, notice) : null,
      r ? statusCard(r) : null,
      offering ? offerSheet() : you?.offer ? offerPending(you.offer) : null,
      r && r.status !== 'dead' ? standCard(r) : null,
      itemsCard(you, useItem, canOffer('item') ? offerItem : null),
      partsCard(you, useItem, canOffer('item') ? offerItem : null, deliverItem),
      r && (r.status !== 'dead' || you?.valentine?.outcome) ? valentineCard(you?.valentine) : null,
      r?.hints?.length ? hintsCard(r.hints) : null,
      r?.status === 'dead'
        ? h('p', { class: 'waiting fallen' }, 'Your final status is below, and the race goes on in the feed.')
        : !you?.prompt && h('p', { class: 'waiting' }, 'Watch the stream. When you have a decision to make, it appears here.'),
    ),
  );
}

// ---------------------------------------------------------------- choices

function timeLeft() {
  if (!timer) return null;
  if (timer.paused) return timer.remainingMs;
  return Math.max(0, timer.remainingMs - (performance.now() - timer.at));
}

function tickCountdown() {
  const ms = timeLeft();
  if (ms == null) return;
  const s = Math.ceil(ms / 1000);
  for (const el of document.querySelectorAll('[data-countdown]')) {
    el.textContent = timer.paused ? 'Paused' : `${s}s`;
    el.classList.toggle('urgent', !timer.paused && s <= 5);
  }
  for (const el of document.querySelectorAll('[data-countdown-bar]')) {
    el.style.width = `${timer.durationMs ? Math.max(0, Math.min(100, (100 * ms) / timer.durationMs)) : 0}%`;
  }
}

function sendChoice(prompt, optionId, targetId) {
  const answer = { promptId: prompt.id, optionId, targetId };
  if (!net.send(msg(TO_HOST.CHOICE, answer))) {
    choiceError = 'Not connected. Your pick was not sent; try again in a moment.';
  } else {
    choiceError = '';
    sent = answer;
  }
  picking = null;
  renderScreen();
}

// What the target picker says for each option that needs a racer.
const PICK_TITLE = { ally: 'Who do you want to ride with?', give: 'Who gets it?', ride: 'Whose things does the President want?' };
const PICK_VERB = { ally: 'Asking', give: 'Giving it to', ride: 'Riding against' };

/** The decision card: title, situation, options with ★ In character, timer. */
function choiceCard(prompt) {
  const chosen = prompt.answer ?? (sent?.promptId === prompt.id ? sent : null);
  const confirmed = !!prompt.answer;
  const paused = timer?.paused;
  const targetName = (id) => prompt.targets?.find((t) => t.id === id)?.name;

  const options = h('div', { class: 'choice-options' }, prompt.options.map((o) => {
    const isChosen = chosen?.optionId === o.id;
    return h('button', {
      type: 'button',
      class: 'choice-opt' + (isChosen ? ' chosen' : '') + (picking?.optionId === o.id ? ' picking' : ''),
      'aria-pressed': String(isChosen),
      onclick: () => {
        if (o.needsTarget) { picking = { promptId: prompt.id, optionId: o.id }; renderScreen(); return; }
        sendChoice(prompt, o.id);
      },
    },
    h('span', { class: 'opt-label' }, o.label,
      prompt.star === o.id ? h('span', { class: 'star' }, '★ In character') : null),
    o.hint && h('span', { class: 'opt-hint' }, o.hint),
    isChosen && o.needsTarget && targetName(chosen.targetId) ? h('span', { class: 'opt-target' }, `${PICK_VERB[o.id] ?? 'Hunting'} ${targetName(chosen.targetId)}`) : null);
  }));

  const targets = picking?.promptId === prompt.id && h('div', { class: 'target-pick' },
    h('h3', {}, PICK_TITLE[picking?.optionId] ?? 'Who are you hunting?'),
    h('div', { class: 'target-list' }, (prompt.targets ?? []).map((t) =>
      h('button', { type: 'button', class: 'btn target-btn', onclick: () => sendChoice(prompt, picking.optionId, t.id) },
        t.name, t.tier !== 'pc' ? h('span', { class: 'ai-tag' }, t.tier === 'canon' ? 'canon' : 'NPC') : null))),
    h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => { picking = null; renderScreen(); } }, 'Cancel'));

  const status = choiceError
    ? h('p', { class: 'form-error' }, choiceError)
    : confirmed
      ? h('p', { class: 'choice-status ok' }, 'Locked in. You can change it until time runs out.')
      : chosen
        ? h('p', { class: 'choice-status' }, 'Sending…')
        : h('p', { class: 'choice-status' }, "If time runs out, you'll go with ★ In character.");

  // Secret prompts say so (the host never shows them).
  const secretNote = prompt.secret ? h('p', { class: 'secret-note' }, 'Only you see this. The host screen never shows it.') : null;
  const card = h('section', { class: 'choice' + (paused ? ' paused' : '') + (prompt.secret ? ' secret' : '') },
    h('div', { class: 'choice-head' },
      h('h2', {}, prompt.title),
      h('span', { class: 'choice-clock', 'data-countdown': '' }, ''),
    ),
    h('div', { class: 'countdown-bar' }, h('div', { class: 'countdown-fill', 'data-countdown-bar': '' })),
    paused && h('p', { class: 'paused-note' }, 'Paused by the host'),
    secretNote,
    h('p', { class: 'choice-text' }, prompt.text),
    options,
    targets,
    prompt.shop?.length ? traderCard(prompt) : null,
    status,
  );
  queueMicrotask(tickCountdown);
  return card;
}

// ---------------------------------------------------------------- milestone 5a: horses, alliances, trading

const QUALITY = { nag: 'Nag', sound: 'Sound', fine: 'Fine', thoroughbred: 'Thoroughbred' };

function deliverItem(itemId) {
  if (!net.send(msg(TO_HOST.USE_ITEM, { itemId, action: 'deliver' }))) choiceError = 'Not connected. Try again in a moment.';
}

// ---------------------------------------------------------------- alerts (milestone 5b)
// Big private changes (your horse is gone, a Stand, a corpse part, a bad
// injury, your ally) arrive with the round's private update, after the
// reveal. Shown until you tap "Got it"; remembered per room on this phone.
const alertKey = () => `sbr-alerts-${code}-${you?.id}`;
function seenAlert() {
  try { return Number(localStorage.getItem(alertKey()) ?? 0); } catch { return 0; }
}
function alertsBox() {
  const list = (you?.race?.alerts ?? []).filter((a) => a.id > seenAlert());
  if (!list.length) return null;
  const big = list.some((a) => a.level === 'big');
  return h('section', { class: 'alerts' + (big ? ' big' : ''), role: 'alert' },
    list.map((a) => h('div', { class: `alert alert-${a.level}` },
      h('div', { class: 'alert-title' }, a.title),
      h('p', { class: 'alert-text' }, a.text))),
    h('button', { type: 'button', class: 'btn btn-small alert-ok', onclick: () => {
      try { localStorage.setItem(alertKey(), String(Math.max(...list.map((a) => a.id)))); } catch { /* private mode: shows again next update */ }
      renderScreen();
    } }, 'Got it'));
}

function useItem(itemId) {
  if (!net.send(msg(TO_HOST.USE_ITEM, { itemId }))) choiceError = 'Not connected. Try again in a moment.';
}

function offerItem(it) {
  offering = { give: it.id, label: it.kind === 'part' ? 'a corpse part' : it.label, kind: it.kind };
  renderScreen();
}

function canOffer(kind) {
  if (!you?.tradeTargets || you.offer || offering) return false;
  return (kind === 'horse' ? you.tradeTargets.horse : you.tradeTargets.item).length > 0;
}

function traderCard(prompt) {
  return trader(prompt, !!you?.race?.onFoot, (quality) => {
    if (!net.send(msg(TO_HOST.BUY_HORSE, { quality }))) choiceError = 'Not connected. Try again in a moment.';
    renderScreen();
  });
}

function offerSheet() {
  return offerForm(you, offering, (o) => {
    notice = o && !net.send(msg(TO_HOST.OFFER, o)) ? 'Not connected. Try again in a moment.' : o ? 'Sending…' : '';
    offering = null;
    renderScreen();
  });
}

function offerPending(o) {
  return pendingOffer(o, () => net.send(msg(TO_HOST.CANCEL_OFFER)));
}

function statusCard(r) {
  const status = {
    racing: ['Racing', 'ok'],
    retired: ['Retired: out of the points race, still on the trail', 'warn'],
    dead: [`Fallen: ${r.death?.cause ?? 'unknown'}${r.death?.by ? ` (${r.death.by})` : ''}`, 'bad'],
  }[r.status];
  const mount = r.mount === 'runner'
    ? 'Runner: no horse, ever'
    : r.onFoot
      ? `On foot (lost ${r.horse})`
      : [`${r.horse}${r.horseQuality ? ` · ${QUALITY[r.horseQuality]}` : ''}`,
        canOffer('horse') ? h('button', { type: 'button', class: 'btn btn-small btn-quiet offer-horse', onclick: () => { offering = { give: 'horse', label: r.horse }; renderScreen(); } }, 'Offer') : null];
  const onFootBanner = r.mount === 'horse' && r.onFoot && r.status === 'racing'
    ? h('div', { class: 'on-foot-banner' }, h('strong', {}, 'ON FOOT'), h('span', {}, r.nextTrader ?? 'Far slower until you get a horse.'))
    : null;
  return h('div', {}, onFootBanner, h('dl', { class: 'status-card' },
    h('dt', {}, 'Status'), h('dd', { class: `st-${status[1]}` }, status[0]),
    h('dt', {}, r.mount === 'runner' ? 'Running' : 'Horse'), h('dd', {}, mount),
    h('dt', {}, 'Points'), h('dd', {}, String(r.points)),
    r.ally && r.status !== 'dead' ? [h('dt', {}, 'Riding with'), h('dd', {}, r.ally)] : null,
    r.lastPlacement && [h('dt', {}, 'Last stage'), h('dd', {}, `${ordinal(r.lastPlacement.rank)} in Stage ${r.lastPlacement.stage}`)],
    r.kills ? [h('dt', {}, 'Kills'), h('dd', {}, String(r.kills))] : null,
    you?.plan && r.status === 'racing' ? [h('dt', {}, 'Stage plan'), h('dd', {}, PLANS.find((x) => x.id === you.plan)?.label ?? you.plan)] : null,
    r.worthinessLevel != null ? [h('dt', {}, 'Worthiness'), h('dd', {}, worthinessBar(r.worthinessLevel))] : null,
  ));
}


function youCard() {
  if (!you?.hasCharacter) return null;
  const personality = PERSONALITIES.find((p) => p.id === you.personality);
  return h('div', { class: 'you-card' },
    avatar(you.name, you.picture, 'lg'),
    h('div', {},
      h('div', { class: 'player-name' }, you.name),
      h('div', { class: 'player-meta' }, [PRONOUNS[you.pronouns]?.label, you.gender].filter(Boolean).join(' · ')),
      h('div', { class: 'player-personality' }, [personality?.label, you.mount === 'runner' ? 'Runner' : 'Rider'].filter(Boolean).join(' · ')),
    ),
  );
}

function renderStatus(status) {
  netStatus = status;
  const labels = {
    connecting: 'Connecting…',
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
    'host-missing': 'Looking for the host…',
    offline: 'Offline',
  };
  const inRoom = screen !== 'join' && screen !== 'ended';
  ui.status.className = `net-status net-${status ?? 'idle'}`;
  ui.status.textContent = status ? labels[status] ?? status : '';
  ui.status.hidden = !status || !inRoom;

  // Whenever we're in a room but not connected, always offer a way out.
  const trouble = inRoom && status && status !== 'connected';
  ui.connBar.hidden = !trouble;
  if (trouble) ui.connText.textContent = `${labels[status] ?? status} Room ${code}`;

  // A save that was in flight when the connection dropped never arrived.
  if (saving && status !== 'connected') {
    saving = false;
    form?.setBusy(false);
    form?.showError('The connection dropped before your changes were saved. Tap save again once reconnected.');
  }
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd" */
function ordinal(n) {
  const teens = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teens ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return n + suffix;
}

function normalizeCode(v, partial = false) {
  if (typeof v !== 'string') return '';
  const allowed = new RegExp(`[^${ROOM_CODE_ALPHABET}]`, 'g');
  const s = v.toUpperCase().replace(allowed, '').slice(0, ROOM_CODE_LENGTH);
  return partial || s.length === ROOM_CODE_LENGTH ? s : '';
}
