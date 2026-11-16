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
import { ITEM_KINDS, canUse } from './items.js';
import { myOffer, tradeTargets } from './trades.js';
import { hasHorse } from './horses.js';
import RULES from '../../data/rules.js';

export const PHASE = Object.freeze({
  LOBBY: 'lobby',
  RACING: 'racing', // lobby is locked from here on; only reconnects get in
});

export const STATE_VERSION = 7; // bump when the saved shape changes (old host saves are ignored)

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
      subEventFreq: 'normal', // 'low' | 'normal' | 'high'
      choiceTimer: 30,       // seconds per choice window
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
    // An open choice for this player (Stage Plan or sub event), phone-safe.
    prompt: promptView(state, p.id),
    plan: p.plan ?? null, // this stage's Stage Plan (their own choice)
    // A choice window is open (items can be used now), for this player if racing.
    choiceOpen: !!(state.race?.choice && !state.race.choice.closed && p.status === 'racing'),
    // Trading (milestone 5): your open offer, and who could take what.
    offer: p.status === 'racing' ? myOffer(state, p.id) : null,
    tradeTargets: p.status === 'racing' && state.race && !state.race.over ? {
      item: tradeTargets(state, p, 'item'),
      horse: hasHorse(p) ? tradeTargets(state, p, 'horse') : [],
    } : null,
    canAskHorse: p.mount === 'horse' && !!p.onFoot,
    // Milestone 5b: only the joiner's own phone knows (the M6 secrets reveal tells everyone).
    valentine: p.valentine?.joined ? {
      errand: (state.race?.errands ?? []).some((e) => e.from === p.id && !e.done) ? 'next round' : null,
      bonus: RULES.valentine.endingBonus,
      relay: RULES.valentine.relay,
      deliverPoints: RULES.valentine.deliverPoints,
      // Live, like Items: the agents hunt you while you carry a merged part.
      hunted: (state.items ?? []).some((i) => i.kind === 'part' && i.owner === p.id && i.merged),
      outcome: p.shown?.valentineOutcome ?? null, // 'won' | 'lost', after the last reveal
    } : null,
    // Kept Stand Arrows and Rokakaka. Usable while a choice window is open.
    // Corpse parts are items too (secret, like Stands): hidden ones can be held later.
    items: (state.items ?? []).filter((i) => i.owner === p.id).map((i) => ({
      id: i.id, kind: i.kind, label: i.kind === 'part' ? `${cap(i.label)} (corpse part)` : ITEM_KINDS[i.kind]?.label ?? i.kind, blurb: ITEM_KINDS[i.kind]?.blurb ?? '',
      pending: !!i.pendingUse,
      hidden: i.kind === 'part' ? !!i.hidden : undefined,
      deliverable: i.kind === 'part' && !!i.merged && !!p.valentine?.joined && p.status === 'racing',
      delivering: !!i.pendingDeliver,
      usable: canUse(i, p),
      why: p.status !== 'racing' ? '' : i.kind === 'part' ? (i.hidden ? '' : 'It has merged with you.') : ITEM_KINDS[i.kind]?.needs === 'noStand' && p.stand ? 'You already have a Stand.' : ITEM_KINDS[i.kind]?.needs === 'stand' && !p.stand ? 'You have no Stand to give up.' : '',
    })),
  };
}

/**
 * This player's open prompt, without the engine's internals. The host adds
 * the timer (remaining time, paused) when it sends it.
 */
export function promptView(state, playerId) {
  const c = state.race?.choice;
  if (!c || c.closed) return null;
  const x = c.prompts.find((pr) => pr.playerId === playerId);
  if (!x) return null;
  return {
    id: x.id, kind: x.kind, title: x.title, text: x.text, star: x.star, secret: !!x.secret,
    options: x.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint, needsTarget: !!o.needsTarget })),
    targets: x.targets?.map((t) => ({ id: t.id, name: t.name, tier: t.tier })) ?? null,
    answer: x.answer && x.answer.by === 'player' ? { optionId: x.answer.optionId, targetId: x.answer.targetId ?? null } : null,
    // The horse trader (town stages, Stage Plan window): what you can buy, and your pick.
    shop: x.shop?.map((o) => ({ quality: o.quality, label: o.label, price: o.price })) ?? null,
    buy: x.shop ? x.buy ?? null : null,
  };
}

/**
 * The host's waiting screen while a choice window is open. Secret prompts are
 * never named or counted; if every prompt is secret it just says decisions
 * are being made. Never shows what anyone picked.
 */
export function choiceWaitingView(state) {
  const c = state.race?.choice;
  if (!c || c.closed) return null;
  const visible = c.prompts.filter((x) => !x.secret);
  const deciders = [];
  for (const x of visible) {
    const p = getPlayer(state, x.playerId);
    if (!p || deciders.some((d) => d.id === p.id)) continue;
    deciders.push({ id: p.id, name: p.name, picture: p.picture, isAI: p.isAI, connected: p.connected, answered: !!x.answer });
  }
  return {
    kind: c.kind, // 'plan' | 'sub'
    deciders,
    answered: deciders.filter((d) => d.answered).length,
    total: deciders.length,
    allSecret: c.prompts.length > 0 && visible.length === 0,
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
    choice: choiceWaitingView(state),
  };
}

// ---------------------------------------------------------------- helpers

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  // Collapse whitespace and strip control characters.
  return v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function fail(error) {
  return { ok: false, error };
}
