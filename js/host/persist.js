// Saves the host's whole game to localStorage so an accidental reload of the
// streaming tab resumes the same room instead of ending the game.
import { store } from '../ui/dom.js';
import { STATE_VERSION } from '../engine/state.js';

const KEY = 'sbr:host';
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // older saves are treated as abandoned

export function loadSavedGame() {
  const saved = store.get(KEY);
  if (!saved || saved.state?.version !== STATE_VERSION) return null;
  if (Date.now() - (saved.savedAt ?? 0) > MAX_AGE_MS) return null;
  return saved; // { code, state, sessions, savedAt }
}

let timer = null;
/** Debounced save: many changes in a burst write once. */
export function saveGame(code, state, sessions) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    store.set(KEY, { code, state, sessions, savedAt: Date.now() });
  }, 250);
}

export function clearSavedGame() {
  clearTimeout(timer);
  store.remove(KEY);
}
