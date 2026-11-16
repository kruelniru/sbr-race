// Host screen entry point. This page is streamed, so it renders ONLY
// hostScreenView(state), never raw state, never anyone's secrets.
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, MAX_PLAYERS } from '../config.js';
import { HostNet } from '../net/host-net.js';
import { createGameState, hostScreenView, PHASE } from '../engine/state.js';
import { newSeed } from '../engine/rng.js';
import { HostLobby } from './lobby.js';
import { loadSavedGame, saveGame, clearSavedGame } from './persist.js';
import { addBots, removeBots } from './debug.js';
import { RaceHost } from './race-host.js';
import { raceView, sceneFor, countdownText, barPct } from './race-view.js';
import { Backdrop } from './backdrop.js';
import CANON from '../../data/canon-racers.js';
import { h, $, mount, avatar } from '../ui/dom.js';
import { sevenTaps, openPinPad, openCheatMenu } from '../ui/cheat-ui.js';
import { verifyPin, applyCheat, CHEAT_STANDS } from '../engine/cheats.js';
import { CHEAT_PIN_HASH } from '../config.js';
import { exportGameLog } from './log-export.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const app = $('#app');
const backdrop = new Backdrop($('#backdrop'));
backdrop.setScene({ stage: 0, night: false }, true);

let lobby = null;
let raceHost = null;
let code = null;
let closing = false;
let fillTarget = null; // the host's "fill to" number; null = use the minimum
let netStatus = { status: 'starting', detail: '' };

showSetup();

// ---------------------------------------------------------------- setup

function showSetup() {
  const saved = loadSavedGame();
  mount(app,
    h('main', { class: 'setup' },
      h('h1', { class: 'title' }, 'Steel Ball Run'),
      h('p', { class: 'subtitle' }, 'Race Simulator'),
      h('div', { class: 'setup-actions' },
        saved && h('button', { class: 'btn btn-primary', onclick: () => openRoom(saved) },
          `Resume room ${saved.code} (${riders(saved.state.players.filter((p) => p.hasCharacter).length)})`),
        h('button', { class: saved ? 'btn' : 'btn btn-primary', onclick: () => { clearSavedGame(); openRoom(null); } },
          saved ? 'Start a new room' : 'Open a room'),
      ),
      h('p', { class: 'hint' }, 'Players join on their phones with the room code.'),
    ),
  );
}

async function openRoom(saved) {
  mount(app, h('main', { class: 'setup' }, h('p', { class: 'subtitle' }, 'Opening the room…')));

  let state = saved?.state ?? createGameState(newSeed());
  const sessions = saved?.sessions ?? {};

  const net = new HostNet({
    onMessage: (connId, m) => lobby.handleMessage(connId, m),
    onClose: (connId) => lobby.handleClose(connId),
    onConnType: DEBUG ? (connId, info) => lobby.handleConnType(connId, info) : null,
    onStatus: (status, detail = '') => {
      netStatus = { status, detail };
      render();
    },
  });

  // A resumed room reclaims its old code; a new one tries codes until one is free.
  try {
    if (saved) {
      code = saved.code;
      await net.start(code, { reclaim: true });
    } else {
      for (let tries = 0; ; tries++) {
        code = randomCode();
        try {
          await net.start(code);
          break;
        } catch (err) {
          if (err.type !== 'unavailable-id' || tries > 5) throw err;
        }
      }
    }
  } catch (err) {
    console.error(err);
    mount(app, h('main', { class: 'setup' },
      h('h2', {}, 'Could not open the room'),
      h('p', { class: 'hint' }, err.message || String(err)),
      h('button', { class: 'btn btn-primary', onclick: showSetup }, 'Try again'),
    ));
    return;
  }

  lobby = new HostLobby({
    state,
    sessions,
    net,
    onChange: () => {
      if (closing) return; // phones dropping off after "Close room" must not re-save it
      saveGame(code, state, sessions);
      render();
    },
  });
  if (state.phase === PHASE.RACING && state.race) {
    raceHost = makeRaceHost();
    raceHost.resume();
  }
  saveGame(code, state, sessions);
  render();
}

function startRace() {
  if (!confirm(`Lock the lobby and start with ${riders(hostScreenView(lobby.state).players.length)}? New players won't be able to join.`)) return;
  lobby.lock();
  raceHost = makeRaceHost();
  raceHost.start();
}

function makeRaceHost() {
  const rh = new RaceHost({ lobby, onChange: lobby.onChange, debug: DEBUG });
  // The secret cheat menu on a phone: the right PIN unlocks it for that phone only.
  lobby.onCheatUnlock = async (player, pin) => {
    if (!(await verifyPin(pin, CHEAT_PIN_HASH))) return; // wrong: nothing happens
    player.cheatUnlocked = true;
    lobby.sendPrivate(player.id);
  };
  lobby.onCheat = (player, { action, value }) => {
    if (!player.cheatUnlocked) return;
    const res = hostCheat(player.name, player.id, action, value);
    lobby.sendPrivate(player.id, !res.ok ? res.error : res.warning ?? 'Cheat applied.');
  };
  // The choice countdown ticks without re-rendering (or re-saving) the screen.
  rh.onTick = () => {
    const t = rh.timerView();
    for (const el of document.querySelectorAll('[data-countdown]')) el.textContent = countdownText(t);
    for (const el of document.querySelectorAll('[data-countdown-bar]')) el.style.width = `${barPct(t)}%`;
  };
  return rh;
}

/** Download every choice window's timing (for: node sim/simulate.js --choice-times file.json). */
function exportChoiceTimes() {
  const data = raceHost?.timingExport();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `sbr-choice-times-${code}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function riders(n) {
  return `${n} rider${n === 1 ? '' : 's'}`;
}

function randomCode() {
  let s = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) s += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return s;
}

// ---------------------------------------------------------------- render

function render() {
  if (!lobby) return;
  const view = hostScreenView(lobby.state);
  const racing = view.phase === PHASE.RACING && raceHost;
  backdrop.setScene(racing ? sceneFor(lobby.state, raceHost) : { stage: 0, night: false }, view.settings.effects !== false);
  if (racing) return renderRace(view);
  const count = view.players.length;
  const minPlayers = view.settings.minPlayers;
  const joinUrl = new URL('phone.html', location.href);
  joinUrl.search = '';
  const shortUrl = joinUrl.host + joinUrl.pathname.replace(/phone\.html$/, '');

  mount(app,
    h('div', { class: 'host' },
      h('header', { class: 'host-header' },
        h('div', { class: 'brand' }, h('span', { class: 'title small' }, 'Steel Ball Run'), h('span', { class: 'subtitle small' }, 'Race Simulator')),
        statusBadge(),
      ),

      view.phase === PHASE.LOBBY
        ? h('section', { class: 'join-panel' },
            h('div', { class: 'join-how' },
              h('div', { class: 'label' }, 'Join on your phone'),
              h('div', { class: 'join-url' }, shortUrl),
            ),
            h('div', { class: 'room-code-box' },
              h('div', { class: 'label' }, 'Room code'),
              h('div', { class: 'room-code' }, code),
            ),
          )
        : h('section', { class: 'join-panel locked' },
            h('div', { class: 'label' }, `Room ${code} · lobby locked`),
            h('div', { class: 'big-line' }, 'The race begins!'),
            h('p', { class: 'hint' }, 'Riders who drop out can still rejoin.'),
          ),

      h('section', { class: 'roster' },
        h('div', { class: 'roster-head' },
          h('h2', {}, view.phase === PHASE.LOBBY ? 'Riders at the start' : 'Riders'),
          h('span', { class: 'count' }, `${count} / ${MAX_PLAYERS}`,
            view.joining ? h('span', { class: 'joining' }, ` · ${view.joining} saddling up…`) : null),
        ),
        count === 0
          ? h('p', { class: 'empty' }, 'Waiting for riders…')
          : h('ul', { class: 'player-grid' }, view.players.map(playerCard)),
      ),

      view.phase === PHASE.LOBBY && lobbySettings(view),

      h('footer', { class: 'host-footer' },
        view.phase === PHASE.LOBBY &&
          h('button', {
            class: 'btn btn-primary btn-big',
            disabled: count < minPlayers,
            onclick: startRace,
          }, count < minPlayers ? `Need ${minPlayers - count} more` : 'Start the race'),
        h('div', { class: 'feed host-feed' }, view.feed.slice(-4).map((f) => h('div', { class: `feed-item feed-${f.kind}` }, f.text))),
        h('button', { class: 'btn btn-quiet', onclick: endRoom }, 'Close room'),
      ),

      DEBUG && debugPanel(view),
    ),
  );
}

function renderRace(view) {
  mount(app,
    h('div', { class: 'host host-race' },
      h('header', { class: 'host-header' },
        h('div', { class: 'brand' }, h('span', { class: 'title small' }, 'Steel Ball Run'), h('span', { class: 'subtitle small' }, `Room ${code}`)),
        statusBadge(),
      ),
      raceView(lobby.state, raceHost),
      h('footer', { class: 'host-footer race-footer' },
        disconnectedNote(view),
        DEBUG && h('span', { class: 'seed' }, `seed ${view.seed}`),
        (DEBUG || lobby.state.race?.over) && h('button', {
          class: 'btn btn-small', onclick: exportChoiceTimes,
          title: 'Save how long every choice took, for the balance sim',
        }, `Export choice times (${raceHost?.timingExport().windows.length ?? 0})`),
        h('button', { class: 'btn btn-quiet', onclick: endRoom }, 'Close room'),
      ),
    ),
  );
}

function disconnectedNote(view) {
  const n = view.players.filter((p) => !p.connected).length;
  return h('span', { class: 'hint' }, n ? `${n} phone${n === 1 ? '' : 's'} disconnected (playing on personality)` : '');
}

function playerCard(p) {
  // ?debug=1: how this phone reaches the host (direct, or through the TURN relay).
  const route = DEBUG && !p.isAI ? lobby.connTypeOf(p.id) : null;
  return h('li', { class: 'player-card' + (p.connected ? '' : ' offline') },
    avatar(p.name, p.picture, 'lg'),
    h('div', { class: 'player-info' },
      h('div', { class: 'player-name' }, p.name),
      h('div', { class: 'player-meta' }, [p.pronouns, p.gender].filter(Boolean).join(' · ')),
      h('div', { class: 'player-personality' }, p.personality),
    ),
    h('span', { class: 'conn-dot', title: p.connected ? 'Connected' : 'Disconnected: playing on personality' }),
    h('div', { class: 'tags' },
      p.mount === 'runner' && h('span', { class: 'tag' }, 'Runner'),
      p.isAI && h('span', { class: 'tag tag-ai' }, 'AI'),
      DEBUG && !p.isAI && h('span', { class: 'tag tag-route' + (route === 'relay' ? ' relay' : '') }, route ? route : 'route…'),
    ),
    h('button', {
      class: 'kick', title: 'Remove rider',
      onclick: () => { if (confirm(`Remove ${p.name} from the race?`)) lobby.kick(p.id); },
    }, '×'),
  );
}

function statusBadge() {
  const labels = {
    starting: 'Starting…',
    online: 'Room open',
    reclaiming: 'Reclaiming room…',
    'signaling-lost': 'Reconnecting to server…',
  };
  return h('div', { class: `net-status net-${netStatus.status}`, title: netStatus.detail, onclick: cheatTap },
    labels[netStatus.status] ?? netStatus.status);
}

// ---------------------------------------------------------------- the secret cheat menu (testing)
// 7 quick taps on the status badge, then the PIN. A wrong PIN closes silently.
const cheatTap = sevenTaps(() => openPinPad(async (pin) => {
  if (!(await verifyPin(pin, CHEAT_PIN_HASH))) return;
  openCheatMenu({
    players: lobby.state.players.filter((p) => p.hasCharacter).map((p) => ({ id: p.id, name: p.name + (p.isAI ? ' (AI)' : '') })),
    stands: CHEAT_STANDS,
    onAction: (action, value, target) => hostCheat('host', target, action, value),
  });
}));

/** Apply a cheat (host menu or an unlocked phone). Records it; the game is marked "Cheats used". */
function hostCheat(by, target, action, value) {
  const res = applyCheat(lobby.state, { by, target, action, value });
  if (res.ok && action === 'skip-stage9') raceHost?.cheatSkipToFinal();
  if (res.ok) { lobby.sendPrivate(target); lobby.onChange(); }
  return res;
}

/** Lobby settings: minimum riders and filling empty slots with AI racers. */
function lobbySettings(view) {
  const min = view.settings.minPlayers;
  const target = fillTarget ?? min;
  const aiCount = view.players.filter((p) => p.isAI).length;
  const numberInput = (value, onchange, label) => h('input', {
    type: 'number', class: 'num-input', min: 1, max: MAX_PLAYERS, value, 'aria-label': label, onchange,
  });

  return h('section', { class: 'lobby-settings' },
    h('label', { class: 'setting' },
      h('span', {}, 'Minimum riders'),
      numberInput(min, (e) => lobby.setMinPlayers(e.target.value), 'Minimum riders'),
    ),
    h('div', { class: 'setting' },
      h('span', {}, 'Fill to'),
      numberInput(target, (e) => {
        fillTarget = Math.max(1, Math.min(MAX_PLAYERS, Number(e.target.value) || min));
        render();
      }, 'Fill with AI racers up to'),
      h('button', {
        class: 'btn btn-small',
        disabled: view.players.length + view.joining >= Math.min(target, MAX_PLAYERS),
        onclick: () => lobby.fillWithAi(target),
      }, 'Fill with AI racers'),
    ),
    aiCount > 0 && h('button', { class: 'btn btn-small btn-quiet', onclick: () => lobby.removeAllAi() }, `Remove all AI (${aiCount})`),
    h('label', { class: 'setting' }, h('span', {}, 'Reveal speed'),
      h('select', { onchange: (e) => lobby.setHostSetting('revealSpeed', e.target.value) },
        ['slow', 'normal', 'fast'].map((v) => h('option', { value: v, selected: view.settings.revealSpeed === v }, v[0].toUpperCase() + v.slice(1))))),
    h('label', { class: 'setting' },
      h('input', { type: 'checkbox', checked: view.settings.autoSkipSide, onchange: (e) => lobby.setHostSetting('autoSkipSide', e.target.checked) }),
      h('span', {}, 'Skip side stories (shorter game)')),
    h('label', { class: 'setting' },
      h('input', { type: 'checkbox', checked: view.settings.effects, onchange: (e) => lobby.setHostSetting('effects', e.target.checked) }),
      h('span', {}, 'Background effects')),
    h('label', { class: 'setting' }, h('span', {}, 'Sub events'),
      h('select', { onchange: (e) => lobby.setHostSetting('subEventFreq', e.target.value) },
        [['low', 'Low (~1 a round)'], ['normal', 'Normal (~2–3)'], ['high', 'High (~4–5)']].map(([v, label]) =>
          h('option', { value: v, selected: (view.settings.subEventFreq ?? 'normal') === v }, label)))),
    h('label', { class: 'setting' }, h('span', {}, 'NPC field'),
      h('select', { onchange: (e) => lobby.setHostSetting('fieldSize', e.target.value), disabled: view.phase !== 'lobby' },
        [200, 350, 500, 750].map((v) => h('option', { value: v, selected: Number(view.settings.fieldSize ?? 500) === v }, `${v} riders`)))),
    h('label', { class: 'setting' }, h('span', {}, 'Choice timer'),
      h('select', { onchange: (e) => lobby.setHostSetting('choiceTimer', e.target.value) },
        [15, 20, 30, 45, 60].map((v) => h('option', { value: v, selected: Number(view.settings.choiceTimer ?? 30) === v }, `${v} seconds`)))),
    h('div', { class: 'setting canon-toggles' },
      h('span', {}, 'Canon racers'),
      h('div', { class: 'chips' }, CANON.map((c) => {
        const on = view.settings.canon?.[c.id] !== false;
        return h('button', {
          class: 'chip' + (on ? ' on' : ''), 'aria-pressed': String(on),
          onclick: () => lobby.setCanon(c.id, !on),
        }, c.name);
      })),
    ),
  );
}

function debugPanel(view) {
  return h('aside', { class: 'debug' },
    h('strong', {}, 'Debug'),
    h('button', { class: 'btn btn-small', onclick: () => addBots(lobby, 1) }, '+1 bot'),
    h('button', { class: 'btn btn-small', onclick: () => addBots(lobby, 4) }, '+4 bots'),
    h('button', { class: 'btn btn-small', onclick: () => addBots(lobby, 16 - view.players.length - view.joining) }, 'Fill to 16'),
    h('button', { class: 'btn btn-small', onclick: () => removeBots(lobby) }, 'Remove bots'),
    h('span', { class: 'seed' }, `seed ${view.seed}`),
  );
}

function endRoom() {
  if (!confirm('Close this room? Everyone will be disconnected and the game is deleted.')) return;
  closing = true;
  clearSavedGame();
  raceHost?.stop();
  lobby.closeRoom();
  // Give the "room closed" messages a moment to reach the phones.
  mount(app, h('main', { class: 'setup' }, h('p', { class: 'subtitle' }, 'Closing the room…')));
  setTimeout(() => {
    clearSavedGame();
    location.reload();
  }, 1000);
}

// Warn before closing the streaming tab by accident (the game is saved anyway).
window.addEventListener('beforeunload', (e) => {
  if (!closing && lobby && lobby.state.players.length) e.preventDefault();
});
