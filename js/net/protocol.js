// The message protocol between the host and phones.
// Every message is a plain JSON object: { t: '<type>', ...payload }.
// Keep this file the single list of message types so both sides agree.

export const PROTOCOL_VERSION = 1;

// Phone -> host
export const TO_HOST = Object.freeze({
  HELLO: 'hello',         // { v, token? }  first message on every connection
  CHARACTER: 'character', // { name, gender, pronouns, personality, picture? }
  CHOICE: 'choice',       // { promptId, optionId, targetId? }  answer a Stage Plan or sub event
  USE_ITEM: 'use_item',   // { itemId, action? }  use (or cancel using) a kept item while a choice is open; action 'deliver': a joiner hands a corpse part to the President
  BUY_HORSE: 'buy_horse', // { quality | null }  pick a horse at the trader (Stage Plan window, town stages)
  OFFER: 'offer',         // { give: itemId | 'horse', to, ask: null | 'arrow' | 'rokakaka' | 'horse' }  secret trade offer
  CANCEL_OFFER: 'cancel_offer', // {}
  VOTE: 'vote',           // { promptId, optionId }        (milestone 6)
  PING: 'ping',           // {}
});

// Host -> phone
export const TO_PHONE = Object.freeze({
  WELCOME: 'welcome',     // { token, playerId, needsCharacter }
  REJECTED: 'rejected',   // { reason, message }
  YOU: 'you',             // { you, timer, notice? }  private snapshot (+ choice timer: { remainingMs, durationMs, paused }; notice: a short message for this phone)
  PUBLIC: 'public',       // { phase, players: [{ id, name, connected }] }
  FEED: 'feed',           // { items: [{ id, text }], reset? }
  CHAR_ERROR: 'char_error', // { message }  character was refused (e.g. name taken)
  KICKED: 'kicked',       // { message }
  ROOM_CLOSED: 'room_closed', // { message }  host closed the room on purpose; forget it
  PONG: 'pong',           // {}
});

export const REJECT = Object.freeze({
  ROOM_FULL: 'room_full',
  GAME_STARTED: 'game_started',
  BAD_VERSION: 'bad_version',
  BAD_MESSAGE: 'bad_message',
});

export function msg(t, payload = {}) {
  return { t, ...payload };
}

// Very small shape check. Anything a phone sends is untrusted input.
export function isMessage(data) {
  return data !== null && typeof data === 'object' && typeof data.t === 'string';
}
