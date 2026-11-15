// Host-side player sessions: who is connected on which connection, session
// tokens for reconnects, joining, character creation, and the lobby lock.
//
// Flow for a phone:
//   connect -> HELLO{token?} -> WELCOME{token, playerId, needsCharacter}
//           -> CHARACTER{...} -> YOU + PUBLIC broadcast
// A known token reattaches the same player (even after the lobby locks).

import { MAX_PLAYERS, HOST_TIMEOUT_MS } from '../config.js';
import { PROTOCOL_VERSION, TO_HOST, TO_PHONE, REJECT, msg } from '../net/protocol.js';
import {
  PHASE, addPlayer, getPlayer, removePlayer, validateCharacter, applyCharacter,
  addFeed, recentFeed, publicFeedItem, publicView, privateView,
} from '../engine/state.js';
import { makeAiCharacter } from '../engine/roster.js';
import { Rng } from '../engine/rng.js';
import { render } from '../engine/text.js';
import { randomToken } from '../ui/dom.js';

export class HostLobby {
  /**
   * @param {object} opts
   * @param {object} opts.state      game state (engine/state.js)
   * @param {Record<string,string>} opts.sessions  token -> playerId (persisted)
   * @param {import('../net/host-net.js').HostNet} opts.net
   * @param {() => void} opts.onChange  called after anything changes
   */
  constructor({ state, sessions, net, onChange }) {
    this.state = state;
    this.sessions = sessions;
    this.net = net;
    this.onChange = onChange;
    this.connToPlayer = new Map(); // connId -> playerId
    this.playerToConn = new Map(); // playerId -> connId
    this.lastSeen = new Map();     // playerId -> ms timestamp
    this.onChoice = null;          // RaceHost: (player, CHOICE message) => void
    this.onUseItem = null;         // RaceHost: (player, itemId) => void
    this.timerView = null;         // RaceHost: () => { remainingMs, durationMs, paused } | null

    // After a host reload nobody is connected until their phone says hello.
    for (const p of state.players) if (!p.isAI) p.connected = false;

    setInterval(() => this.#sweep(), 3000);
  }

  // ------------------------------------------------------------ network in

  handleMessage(connId, m) {
    if (m.t === TO_HOST.HELLO) return this.#hello(connId, m);

    const playerId = this.connToPlayer.get(connId);
    if (!playerId) return; // must say hello first
    this.lastSeen.set(playerId, Date.now());
    const player = getPlayer(this.state, playerId);
    if (!player) return;
    if (!player.connected) this.#setConnected(player, true);

    switch (m.t) {
      case TO_HOST.PING:
        this.net.send(connId, msg(TO_PHONE.PONG));
        break;
      case TO_HOST.CHARACTER:
        this.#character(player, m);
        break;
      case TO_HOST.CHOICE:
        if (typeof m.promptId === 'string' && typeof m.optionId === 'string') {
          this.onChoice?.(player, { promptId: m.promptId, optionId: m.optionId, targetId: typeof m.targetId === 'string' ? m.targetId : undefined });
        }
        break;
      case TO_HOST.USE_ITEM:
        if (typeof m.itemId === 'string') this.onUseItem?.(player, m.itemId);
        break;
      default:
        // VOTE arrives in milestone 6.
        console.debug('[lobby] ignoring', m.t, 'from', playerId);
    }
  }

  handleClose(connId) {
    const playerId = this.connToPlayer.get(connId);
    this.connToPlayer.delete(connId);
    if (!playerId || this.playerToConn.get(playerId) !== connId) return;
    this.playerToConn.delete(playerId);
    const player = getPlayer(this.state, playerId);
    if (!player) return;

    // A phone that left before making a character doesn't hold a slot.
    if (!player.hasCharacter && this.state.phase === PHASE.LOBBY) {
      this.#forget(playerId);
      this.onChange();
      return;
    }
    this.#setConnected(player, false);
  }

  #hello(connId, m) {
    if (m.v !== PROTOCOL_VERSION) {
      return this.#reject(connId, REJECT.BAD_VERSION, 'This page is out of date. Reload it.');
    }

    // Reconnect: known token.
    const knownId = typeof m.token === 'string' ? this.sessions[m.token] : null;
    const known = knownId && getPlayer(this.state, knownId);
    if (known) return this.#attach(connId, known, m.token);

    // New player.
    if (this.state.phase !== PHASE.LOBBY) {
      return this.#reject(connId, REJECT.GAME_STARTED, 'This race has already started. New riders can join the next one.');
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      // Real players come first: the newest AI racer gives up its place.
      const ai = this.state.players.filter((p) => p.isAI).at(-1);
      if (!ai) return this.#reject(connId, REJECT.ROOM_FULL, `The race is full (${MAX_PLAYERS} riders).`);
      this.#forget(ai.id);
      this.#feed(render('{ai} gives up {ai.their} place to a new rider.', { ai }), 'leave');
      this.broadcastPublic();
    }
    const player = addPlayer(this.state);
    const token = randomToken();
    this.sessions[token] = player.id;
    this.#attach(connId, player, token);
  }

  #attach(connId, player, token) {
    // Replace any older connection for this player (e.g. a stale tab).
    const old = this.playerToConn.get(player.id);
    if (old != null && old !== connId) {
      this.connToPlayer.delete(old);
      this.net.send(old, msg(TO_PHONE.KICKED, { message: 'You opened the game somewhere else.' }));
      this.net.close(old);
    }
    this.connToPlayer.set(connId, player.id);
    this.playerToConn.set(player.id, connId);
    this.lastSeen.set(player.id, Date.now());

    this.net.send(connId, msg(TO_PHONE.WELCOME, {
      token,
      playerId: player.id,
      needsCharacter: !player.hasCharacter,
    }));
    this.net.send(connId, this.#youMsg(player.id));
    this.net.send(connId, msg(TO_PHONE.PUBLIC, publicView(this.state)));
    this.net.send(connId, msg(TO_PHONE.FEED, { items: recentFeed(this.state), reset: true }));
    this.#setConnected(player, true);
  }

  #character(player, m) {
    if (this.state.phase !== PHASE.LOBBY) {
      this.#sendTo(player.id, msg(TO_PHONE.CHAR_ERROR, { message: 'The race has started; characters are locked.' }));
      return;
    }
    const result = validateCharacter(this.state, player.id, m);
    if (!result.ok) {
      this.#sendTo(player.id, msg(TO_PHONE.CHAR_ERROR, { message: result.error }));
      return;
    }
    const isNew = !player.hasCharacter;
    applyCharacter(player, result.value);
    if (isNew) this.#feed(`${player.name} joined the race.`, 'join');
    this.#sendTo(player.id, this.#youMsg(player.id));
    this.broadcastPublic();
    this.onChange();
  }

  // ------------------------------------------------------------ host actions

  /** Lock the lobby. Only reconnects get in after this. */
  lock() {
    if (this.state.phase !== PHASE.LOBBY) return;
    // Drop phones that never finished making a character.
    for (const p of this.state.players.filter((x) => !x.hasCharacter)) {
      const connId = this.playerToConn.get(p.id);
      if (connId != null) {
        this.net.send(connId, msg(TO_PHONE.REJECTED, { reason: REJECT.GAME_STARTED, message: 'The race started before you finished your character.' }));
        this.net.close(connId);
      }
      this.#forget(p.id);
    }
    this.state.phase = PHASE.RACING;
    this.#feed('The lobby is closed. Riders, to the starting line!', 'system');
    this.broadcastPublic();
    this.onChange();
  }

  kick(playerId) {
    const player = getPlayer(this.state, playerId);
    if (!player) return;
    const connId = this.playerToConn.get(playerId);
    if (connId != null) {
      this.net.send(connId, msg(TO_PHONE.KICKED, { message: 'The host removed you from the race.' }));
      this.net.close(connId);
    }
    this.#forget(playerId);
    if (player.hasCharacter) this.#feed(`${player.name} left the race.`, 'leave');
    this.broadcastPublic();
    this.onChange();
  }

  /** Host closed the room on purpose: tell every phone to forget it. */
  closeRoom() {
    const m = msg(TO_PHONE.ROOM_CLOSED, { message: 'The host closed this room.' });
    for (const connId of this.playerToConn.values()) this.net.send(connId, m);
  }

  // ---------------------------------------------------------- AI racers
  // AI racers are PCs the game controls: random name, pronouns and
  // personality, always "connected", always choosing by personality.

  /** Add up to `count` AI racers (stops at the room limit). Returns how many. */
  addAiRacers(count) {
    if (this.state.phase !== PHASE.LOBBY) return 0;
    const rng = Rng.fromState(this.state.rngState);
    const taken = new Set(this.state.players.map((p) => p.name.toLowerCase()));
    let added = 0;
    while (added < count && this.state.players.length < MAX_PLAYERS) {
      const player = addPlayer(this.state, { isAI: true });
      const character = makeAiCharacter(rng, taken);
      taken.add(character.name.toLowerCase());
      applyCharacter(player, character);
      this.#feed(`${player.name} joined the race.`, 'join');
      added++;
    }
    this.state.rngState = rng.getState();
    if (added) {
      this.broadcastPublic();
      this.onChange();
    }
    return added;
  }

  /** Fill with AI racers until the race has `target` riders (phones still joining count too). */
  fillWithAi(target) {
    return this.addAiRacers(Math.min(target, MAX_PLAYERS) - this.state.players.length);
  }

  removeAllAi() {
    for (const p of this.state.players.filter((x) => x.isAI)) this.kick(p.id);
  }

  setCanon(id, on) {
    if (this.state.phase !== PHASE.LOBBY) return;
    this.state.settings.canon[id] = !!on;
    this.onChange();
  }

  /** Host preferences (speed, side stories, effects, sub event frequency, choice timer). Allowed any time. */
  setHostSetting(key, value) {
    if (!['revealSpeed', 'autoSkipSide', 'effects', 'subEventFreq', 'choiceTimer'].includes(key)) return;
    if (key === 'subEventFreq' && !['low', 'normal', 'high'].includes(value)) return;
    if (key === 'choiceTimer') value = Math.max(10, Math.min(90, Math.round(Number(value)) || 30));
    this.state.settings[key] = value;
    this.onChange();
  }

  /** Public feed line to the host's feed and every phone. */
  feed(text, kind, ids) {
    this.#feed(text, kind, ids);
  }

  /** Send every phone its private view (round revealed, choice opened/closed, timer paused). */
  sendPrivateAll() {
    for (const [playerId, connId] of this.playerToConn) this.net.send(connId, this.#youMsg(playerId));
  }

  sendPrivate(playerId) {
    this.#sendTo(playerId, this.#youMsg(playerId));
  }

  /** YOU: the player's private view, plus the choice timer if their prompt is open. */
  #youMsg(playerId) {
    const you = privateView(this.state, playerId);
    const timer = you?.prompt ? this.timerView?.() ?? null : null;
    return msg(TO_PHONE.YOU, { you, timer });
  }

  setMinPlayers(n) {
    const v = Math.max(1, Math.min(MAX_PLAYERS, Math.round(Number(n)) || 1));
    if (v === this.state.settings.minPlayers) return;
    this.state.settings.minPlayers = v;
    this.onChange();
  }

  broadcastPublic() {
    const view = publicView(this.state);
    for (const connId of this.playerToConn.values()) this.net.send(connId, msg(TO_PHONE.PUBLIC, view));
  }

  // ------------------------------------------------------------ internals

  #feed(text, kind, ids) {
    const item = addFeed(this.state, text, kind, ids);
    const m = msg(TO_PHONE.FEED, { items: [publicFeedItem(item)] });
    for (const connId of this.playerToConn.values()) this.net.send(connId, m);
  }

  #sendTo(playerId, m) {
    const connId = this.playerToConn.get(playerId);
    if (connId != null) this.net.send(connId, m);
  }

  #setConnected(player, connected) {
    if (player.isAI || player.connected === connected) return;
    player.connected = connected;
    if (player.hasCharacter) this.broadcastPublic();
    this.onChange();
  }

  #forget(playerId) {
    removePlayer(this.state, playerId);
    this.playerToConn.delete(playerId);
    this.lastSeen.delete(playerId);
    for (const [token, id] of Object.entries(this.sessions)) if (id === playerId) delete this.sessions[token];
  }

  #reject(connId, reason, message) {
    this.net.send(connId, msg(TO_PHONE.REJECTED, { reason, message }));
    this.net.close(connId);
  }

  /** Mark phones that went quiet as disconnected (no close event on iOS sometimes). */
  #sweep() {
    const now = Date.now();
    // Keep the connection mapping: if the channel is actually alive, the
    // next ping marks the player connected again.
    for (const playerId of this.playerToConn.keys()) {
      if (now - (this.lastSeen.get(playerId) ?? 0) > HOST_TIMEOUT_MS) {
        const player = getPlayer(this.state, playerId);
        if (player) this.#setConnected(player, false);
      }
    }
  }
}
