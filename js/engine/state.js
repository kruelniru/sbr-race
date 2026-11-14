// Game state and the VIEWS of it. This file is the privacy boundary:
//
//   publicView(state)          -> safe for every phone
//   privateView(state, id)     -> safe for that one player's phone only
//   hostScreenView(state)      -> safe for the streamed host screen
//
// Network and UI code must only ever send/render the output of these
// functions, never `state` itself. Secrets (Worthiness, corpse parts, a Stand
// before it's revealed, Valentine allegiance) get added to the state in later
// milestones and must only ever appear in privateView.
//
// Pure module: no DOM, no network, so the Node simulation can use it.

import PERSONALITIES from '../../data/personalities.js';
import PRONOUNS from '../../data/pronouns.js';
import CANON from '../../data/canon-racers.js';
import { NAME_MAX, GENDER_MAX, PICTURE_MAX_BYTES, FEED_KEEP, DEFAULT_MIN_PLAYERS } from '../config.js';
import { Rng } from './rng.js';

export const PHASE = Object.freeze({
  LOBBY: 'lobby',
  RACING: 'racing', // lobby is locked from here on; only reconnects get in
});

export const STATE_VERSION = 4; // bump when the saved shape changes (old host saves are ignored)

export function createGameState(seed) {
  return {
    version: STATE_VERSION,
    seed,
    rngState: new Rng(seed).getState(),
    phase: PHASE.LOBBY,
    createdAt: Date.now(),
    settings: {
      minPlayers: DEFAULT_MIN_PLAYERS, // riders needed before the host can start
      canon: Object.fromEntries(CANON.map((c) => [c.id, true])), // canon racer toggles
      revealSpeed: 'normal', // 'slow' | 'normal' | 'fast' (host auto-advance)
      autoSkipSide: true,    // skip Side Stories automatically (on by default; off for long game nights)
      effects: true,         // stage-themed particle effects on the host
    },
    players: [],
    feed: [],
    nextPlayerNum: 1,
    nextFeedId: 1,
  };
}

/**
 * Creates a player slot with no character yet (a phone that just joined),
 * or an AI racer slot (isAI: a PC the game controls, always "connected").
 */
export function addPlayer(state, { isAI = false } = {}) {
  const player = {
    id: 'p' + state.nextPlayerNum++,
    kind: 'pc',
    hasCharacter: false,
    name: '',
    gender: '',
    pronouns: 'they',
    personality: 'honorable',
    mount: 'horse', // 'horse' (Rider) or 'runner': a Runner never has a horse
    picture: null, // small JPEG data URL, or null
    isAI, // game-controlled PC: always picks by personality
    connected: isAI, // AI racers are never "disconnected"
    joinedAt: Date.now(),
  };
  state.players.push(player);
  return player;
}

export function getPlayer(state, id) {
  return state.players.find((p) => p.id === id);
}

export function removePlayer(state, id) {
  state.players = state.players.filter((p) => p.id !== id);
}

/** Players who have finished character creation. */
export function readyPlayers(state) {
  return state.players.filter((p) => p.hasCharacter);
}

/**
 * Validate and normalize character data from a phone (untrusted input).
 * Returns { ok: true, value } or { ok: false, error }.
 */
export function validateCharacter(state, playerId, data) {
  if (!data || typeof data !== 'object') return fail('Missing character data.');
  const name = cleanText(data.name, NAME_MAX);
  if (!name) return fail('Your racer needs a name.');
  const taken = state.players.some(
    (p) => p.id !== playerId && p.hasCharacter && p.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) return fail(`Someone is already racing as "${name}". Pick another name.`);
  if (CANON.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return fail(`${name} is a canon racer. Pick your own name.`);
  }

  const gender = cleanText(data.gender, GENDER_MAX);
  if (!PRONOUNS[data.pronouns]) return fail('Pick your pronouns.');
  if (!PERSONALITIES.some((p) => p.id === data.personality)) return fail('Pick a personality.');
  const mount = data.mount ?? 'horse';
  if (mount !== 'horse' && mount !== 'runner') return fail('Pick Rider or Runner.');

  let picture = null;
  if (data.picture != null) {
    if (typeof data.picture !== 'string' || !data.picture.startsWith('data:image/jpeg;base64,')) {
      return fail('That picture could not be used.');
    }
    if (data.picture.length > PICTURE_MAX_BYTES) return fail('That picture is too large.');
    picture = data.picture;
  }

  return { ok: true, value: { name, gender, pronouns: data.pronouns, personality: data.personality, mount, picture } };
}

export function applyCharacter(player, character) {
  Object.assign(player, character, { hasCharacter: true });
}

/** Append a public feed line. `ids` = named racers in it (phones highlight their own). */
export function addFeed(state, text, kind = 'info', ids = null) {
  const item = { id: state.nextFeedId++, text, kind, at: Date.now() };
  if (ids?.length) item.ids = ids;
  state.feed.push(item);
  if (state.feed.length > 300) state.feed.splice(0, state.feed.length - 300);
  return item;
}

export function recentFeed(state, n = FEED_KEEP) {
  return state.feed.slice(-n).map(publicFeedItem);
}

export function publicFeedItem(item) {
  return { id: item.id, text: item.text, kind: item.kind, ids: item.ids };
}

// ---------------------------------------------------------------- views

/** Everything every phone may know. */
export function publicView(state) {
  return {
    phase: state.phase,
    players: readyPlayers(state).map((p) => ({ id: p.id, name: p.name, connected: p.connected, ai: p.isAI })),
    // Round header as currently revealed on the stream (never ahead of it).
    race: state.race?.shownHeader ?? null,
  };
}

/** What one player's own phone may know. */
export function privateView(state, playerId) {
  const p = getPlayer(state, playerId);
  if (!p) return null;
  return {
    id: p.id,
    hasCharacter: p.hasCharacter,
    name: p.name,
    gender: p.gender,
    pronouns: p.pronouns,
    personality: p.personality,
    mount: p.mount,
    picture: p.picture,
    // Race status as of the last fully revealed round, so a phone never
    // spoils the stream. Secrets (Worthiness, parts...) get added here only.
    race: p.shown ?? null,
  };
}

/** What the streamed host screen may show. Never put secrets here. */
export function hostScreenView(state) {
  return {
    phase: state.phase,
    seed: state.seed,
    settings: { ...state.settings },
    players: readyPlayers(state).map((p) => ({
      id: p.id,
      name: p.name,
      gender: p.gender, // host-only by design
      pronouns: PRONOUNS[p.pronouns].label,
      personality: PERSONALITIES.find((x) => x.id === p.personality)?.label ?? '',
      picture: p.picture,
      connected: p.connected,
      isAI: p.isAI,
      mount: p.mount,
    })),
    joining: state.players.filter((p) => !p.hasCharacter).length,
    feed: recentFeed(state, 12),
  };
}

// ---------------------------------------------------------------- helpers

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  // Collapse whitespace and strip control characters.
  return v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function fail(error) {
  return { ok: false, error };
}
