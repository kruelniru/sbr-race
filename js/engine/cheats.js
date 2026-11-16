// The secret cheat menu (testing only). Pure engine code.
//
// Opened by tapping the connection status 7 times quickly and entering a PIN.
// The PIN itself is never stored: js/config.js holds only CHEAT_PIN_HASH, a
// SHA-256 of `sbr-cheat-v1:<PIN>` written by tools/set-cheat-pin.js. An empty
// hash means the menu can never open.
//
// Every cheat is recorded in state.cheats and sets state.cheatsUsed, so a
// cheated game says so on the finale and in both exported game logs.

import STAGES from '../../data/stages.js';
import { ALL_STANDS, REQUIEM_STANDS } from '../../data/stands.js';
import { readyPlayers } from './state.js';
import { addWorthiness, killRacer } from './racers.js';
import { Rng } from './rng.js';
import { giveStand, removeStand, pickStand } from './stands.js';
import { d4cReturn } from './secret-endings.js';
import { addItem } from './items.js';
import { joinValentine } from './valentine.js';
import { cheatGiveAllParts, cheatDropAllParts } from './corpse.js';
import { canHaveHorse, giveHorse, loseHorse, newHorseName } from './horses.js';

export const PIN_SALT = 'sbr-cheat-v1:';

/** SHA-256 (hex) of the salted PIN. Works in browsers (https) and Node. */
export async function hashPin(pin) {
  const data = new TextEncoder().encode(PIN_SALT + String(pin));
  const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Does this PIN match the stored hash? (An empty hash never matches.) */
export async function verifyPin(pin, hash) {
  if (!hash || typeof pin !== 'string' || !/^\d{1,12}$/.test(pin)) return false;
  return (await hashPin(pin)) === hash;
}

/** Every Stand a cheat can give, Requiem included. */
export const CHEAT_STANDS = [...ALL_STANDS, ...REQUIEM_STANDS].map((s) => ({ id: s.id, name: s.name, tier: s.requiem ? 'requiem' : s.tier }));

export const CHEAT_ACTIONS = [
  'worthiness+10', 'worthiness-10', 'worthiness-set',
  'valentine-join', 'valentine-leave',
  'parts-all', 'parts-none',
  'stand-give', 'stand-remove',
  'item-arrow', 'item-rokakaka',
  'horse-lose', 'horse-thoroughbred',
  'skip-stage9', 'kill', 'revive',
  'force-palm', 'force-offer', 'force-fv', 'force-fight',
  'setup-requiem', 'trigger-d4c',
];

function cheatCtx(state) {
  const race = state.race;
  return {
    state, rng: Rng.fromState(state.rngState), stage: STAGES[Math.min(race?.stageIdx ?? 0, STAGES.length - 1)], roundLabel: 'cheat',
    result: { deaths: [] }, assigned: new Set(), usedNpcs: new Set(), tally: { died: 0, retired: 0 }, eventCounts: {},
  };
}

/**
 * Apply one cheat (untrusted input from the host's menu or an unlocked phone).
 * `skip-stage9` is done by the host (it has to fast-forward rounds); this only validates and records it.
 * Returns { ok } or { ok: false, error }.
 */
export function applyCheat(state, { by, target, action, value = null }) {
  if (!CHEAT_ACTIONS.includes(action)) return { ok: false, error: 'no such cheat' };
  if (!state.race) return { ok: false, error: 'Start the race first.' };
  const p = readyPlayers(state).find((x) => x.id === target);
  if (!p) return { ok: false, error: 'no such player' };
  const ctx = cheatCtx(state);
  const alive = p.status !== 'dead';
  let warning = null;
  switch (action) {
    case 'worthiness+10': addWorthiness(p, 10, ctx); break;
    case 'worthiness-10': addWorthiness(p, -10, ctx); break;
    case 'worthiness-set': {
      const n = Math.round(Number(value));
      if (!(n >= 0 && n <= 100)) return { ok: false, error: '0–100' };
      p.worthiness = n;
      break;
    }
    case 'valentine-join': if (!p.valentine?.joined && alive) joinValentine(ctx, p); break;
    case 'valentine-leave': if (p.valentine) p.valentine = null; break;
    case 'parts-all': if (!alive) return { ok: false, error: 'They are dead.' }; cheatGiveAllParts(ctx, p); break;
    case 'parts-none': cheatDropAllParts(ctx, p); break;
    case 'stand-give': {
      const def = [...ALL_STANDS, ...REQUIEM_STANDS].find((s) => s.id === value);
      if (!def) return { ok: false, error: 'no such Stand' };
      // Two living racers never share a Stand: the cheat takes it from whoever holds it (and says so).
      const f = state.field;
      for (const r of [...readyPlayers(state), ...(state.canon ?? []), ...(f?.kept ?? []), ...(f?.packLeaders ?? [])]) {
        if (r.id !== p.id && r.stand?.id === def.id) {
          removeStand(state, r);
          warning = `${def.name} was held by ${r.name ?? 'a rider from the pack'}${r.status === 'dead' ? ' (dead)' : ''}: the cheat took it from them.`;
        }
      }
      if (p.stand) removeStand(state, p);
      giveStand(ctx, p, def, 'cheat');
      break;
    }
    case 'stand-remove': if (p.stand) removeStand(state, p); break;
    case 'item-arrow': addItem(state, 'arrow', p, { stage: ctx.stage.id, round: 'cheat' }); break;
    case 'item-rokakaka': addItem(state, 'rokakaka', p, { stage: ctx.stage.id, round: 'cheat' }); break;
    case 'horse-lose': loseHorse(ctx, p); break;
    case 'horse-thoroughbred': if (!canHaveHorse(p)) return { ok: false, error: 'Runners never get a horse.' }; giveHorse(p, newHorseName(state, ctx.rng), 'thoroughbred'); break;
    case 'skip-stage9': if (state.race.stageIdx >= STAGES.length - 1) return { ok: false, error: 'Already in the Final Stage.' }; break;
    case 'kill': if (!alive) return { ok: false, error: 'Already dead.' }; killRacer(ctx, p, 'struck down (cheat)', null); break;
    case 'revive':
      if (alive) return { ok: false, error: 'Not dead.' };
      p.status = 'racing'; p.death = null;
      state.race.memorial = state.race.memorial.filter((f) => f.id !== p.id);
      state.race.fallenSince = state.race.fallenSince.filter((f) => f.id !== p.id);
      break;
    case 'setup-requiem': {
      // An Arrow, 2 Rokakaka, a Legendary Stand (kept if they have one) and Worthiness 80.
      if (!alive) return { ok: false, error: 'They are dead.' };
      addItem(state, 'arrow', p, { stage: ctx.stage.id, round: 'cheat' });
      addItem(state, 'rokakaka', p, { stage: ctx.stage.id, round: 'cheat' });
      addItem(state, 'rokakaka', p, { stage: ctx.stage.id, round: 'cheat' });
      if (p.stand?.tier !== 'legendary' || p.stand.requiem) {
        if (p.stand) removeStand(state, p);
        giveStand(ctx, p, pickStand(state, ctx.rng, 'legendary'), 'cheat');
      }
      p.worthiness = Math.max(p.worthiness ?? 0, 80);
      break;
    }
    case 'trigger-d4c': {
      if (alive) return { ok: false, error: 'Pick a dead player.' };
      if (state.race.d4c) return { ok: false, error: 'D4C already happened this game.' };
      state.race.d4cPick = p.id; // at the Final Stage's start; now, if it has begun
      if (state.race.stageIdx === STAGES.length - 1 && state.race.plansFor === STAGES.length) d4cReturn(state, ctx.rng, p.id);
      else warning = 'Queued: they come back when Stage 9 plans close.';
      break;
    }
    case 'force-palm': p.forceSub = 'palm'; break;
    case 'force-offer': p.forceSub = 'offer'; break;
    case 'force-fv': p.forceSub = 'fv'; break;
    case 'force-fight': p.forceSub = 'fight'; break;
    default: break;
  }
  state.rngState = ctx.rng.getState();
  (state.cheats ??= []).push({ at: Date.now(), round: state.race.roundNo, stage: ctx.stage.id, by, target: p.id, action, value });
  state.cheatsUsed = true;
  return { ok: true, warning };
}
