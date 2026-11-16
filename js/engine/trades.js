// Trading (milestone 5, DESIGN.md → Trading). Secret, not real-time.
//
// A player offers an item (Stand Arrow, Rokakaka) or their horse to another
// racing PC from the phone, for nothing (a gift) or for one thing back
// (`ask`: 'arrow' | 'rokakaka' | 'horse' | 'part'). The receiver gets a SECRET prompt
// in their next sub-event window; the swap resolves with that round. If
// either side no longer has what was offered, it quietly falls through.
//
// A gift counts as help (Worthiness +8); a corpse part given for nothing +15
// instead (milestone 5b). A trade counts as nothing. A part that changes
// hands merges with its new holder (corpse.js).
//
// state.trades: [{ id, from, to, give: itemId | 'horse', ask: null | kind,
//                  status: 'pending' | 'asked' | 'done' | 'refused' | 'failed' | 'cancelled' }]

import RULES from '../../data/rules.js';
import { readyPlayers } from './state.js';
import { addWorthiness, addHint } from './racers.js';
import { ITEM_KINDS, itemsOf } from './items.js';
import { hasHorse, canHaveHorse, loseHorse, giveHorse, QUALITY_LABEL } from './horses.js';
import { takePart, partGiftWorthiness } from './corpse.js';

const ASKS = ['arrow', 'rokakaka', 'horse', 'part'];

const pc = (state, id) => readyPlayers(state).find((p) => p.id === id);

function giveLabel(state, t) {
  if (t.give === 'horse') return `${pc(state, t.from)?.horse ?? 'their horse'} (a ${QUALITY_LABEL[t.giveQuality] ?? 'horse'})`;
  const it = (state.items ?? []).find((i) => i.id === t.give);
  if (it?.kind === 'part') return `a corpse part (${it.label})`;
  return `a ${ITEM_KINDS[it?.kind]?.label ?? 'thing'}`;
}
const askLabel = (ask) => (ask === 'horse' ? 'your horse' : ask === 'part' ? 'a corpse part' : ask ? `a ${ITEM_KINDS[ask]?.label ?? ask}` : null);

/** Who can receive this: racing PCs (no Runners or riders with a horse for a horse gift). */
export function tradeTargets(state, from, give) {
  return readyPlayers(state).filter((p) => p.id !== from.id && p.status === 'racing'
    && (give !== 'horse' || (canHaveHorse(p) && p.onFoot)))
    .map((p) => ({ id: p.id, name: p.name }));
}

/** A phone makes an offer (untrusted input). */
export function offerTrade(state, playerId, { give, to, ask = null } = {}) {
  const me = pc(state, playerId);
  if (!state.race || state.race.over || !me || me.status !== 'racing') return { ok: false, error: 'You can only trade while racing.' };
  if (ask != null && !ASKS.includes(ask)) return { ok: false, error: 'no such ask' };
  if (give === 'horse') {
    if (!hasHorse(me)) return { ok: false, error: "You don't have a horse to give." };
  } else if (!(state.items ?? []).some((i) => i.id === give && i.owner === me.id)) {
    return { ok: false, error: 'no such item' };
  }
  if (!tradeTargets(state, me, give).some((t) => t.id === to)) return { ok: false, error: "They can't take that." };
  if (ask === 'horse' && !(canHaveHorse(me) && me.onFoot)) return { ok: false, error: 'You can only ask for a horse while on foot.' };
  if ((state.trades ?? []).some((t) => t.from === me.id && ['pending', 'asked'].includes(t.status))) {
    return { ok: false, error: 'You already have an offer out. Cancel it first.' };
  }
  const t = { id: `t${(state.trades ?? []).length + 1}`, from: me.id, to, give, giveQuality: give === 'horse' ? me.horseQuality : null, ask, status: 'pending' };
  (state.trades ??= []).push(t);
  return { ok: true, id: t.id };
}

export function cancelTrade(state, playerId) {
  const t = (state.trades ?? []).find((x) => x.from === playerId && ['pending', 'asked'].includes(x.status));
  if (!t) return { ok: false, error: 'No offer to cancel.' };
  if (state.race?.choice && !state.race.choice.closed && t.status === 'asked') return { ok: false, error: "They're deciding right now." };
  t.status = 'cancelled';
  return { ok: true };
}

/** The giver's open offer, for their phone. */
export function myOffer(state, playerId) {
  const t = (state.trades ?? []).find((x) => x.from === playerId && ['pending', 'asked'].includes(x.status));
  if (!t) return null;
  return { id: t.id, to: pc(state, t.to)?.name ?? '?', give: giveLabel(state, t), ask: askLabel(t.ask), asked: t.status === 'asked' };
}

/** How an AI racer values a thing (rules.trading.value). */
function value(state, who, kind) {
  const V = RULES.trading.value;
  if (kind === 'horse') return who.onFoot ? V.horse : V.horseMounted;
  if (kind === 'arrow') return who.stand ? V.arrowHasStand : V.arrow;
  if (kind === 'rokakaka') return who.stand ? V.rokakakaHasStand : V.rokakaka;
  if (kind === 'part') return V.part;
  return 0;
}

/** Offers waiting for this receiver; the engine turns the first into a prompt. */
export function pendingFor(state, playerId) {
  return (state.trades ?? []).filter((t) => t.to === playerId && t.status === 'pending');
}

/** Build the receiver's secret prompt (choices.js adds id, star, leans). */
export function tradePromptText(state, t) {
  const from = pc(state, t.from);
  const what = giveLabel(state, t);
  return t.ask ? `${from?.name} offers you ${what} for ${askLabel(t.ask)}.` : `${from?.name} offers you ${what}, for nothing.`;
}

/** AI leans for accept / refuse. */
export function tradeLeans(state, t) {
  const to = pc(state, t.to);
  const giveKind = t.give === 'horse' ? 'horse' : (state.items ?? []).find((i) => i.id === t.give)?.kind;
  const good = value(state, to, giveKind) >= (t.ask ? value(state, to, t.ask) : 0) && value(state, to, giveKind) > 0;
  const L = (x) => ({ honorable: x, ruthless: x, cautious: x, glory: x, opportunist: x });
  return { accept: L(good ? 4 : 0.3), refuse: L(good ? 0.3 : 4) };
}

function hasAsk(state, who, ask) {
  if (ask === 'horse') return hasHorse(who);
  return itemsOf(state, who.id).some((i) => i.kind === ask);
}

/** Resolve an answered trade prompt (inside runRound). */
export function resolveTrade(ctx, t, accepted) {
  const { state } = ctx;
  const from = pc(state, t.from);
  const to = pc(state, t.to);
  const log = (outcome) => (state.race.tradeLog ??= []).push({ outcome, gift: !t.ask, give: t.give === 'horse' ? 'horse' : 'item', stage: ctx.stage.id });
  if (!accepted) {
    t.status = 'refused';
    addHint(from, `${to?.name} turns down your offer.`, ctx);
    return log('refused');
  }
  const stillGive = t.give === 'horse' ? from && hasHorse(from) : (state.items ?? []).some((i) => i.id === t.give && i.owner === t.from);
  const okTo = to && to.status === 'racing' && (t.give !== 'horse' || (canHaveHorse(to) && to.onFoot));
  if (!from || from.status !== 'racing' || !stillGive || !okTo || (t.ask && !hasAsk(state, to, t.ask))) {
    t.status = 'failed';
    for (const w of [from, to]) if (w) addHint(w, 'The trade falls through.', ctx);
    return log('failed');
  }
  // Swap.
  t.giveKind = t.give === 'horse' ? 'horse' : (state.items ?? []).find((i) => i.id === t.give)?.kind;
  move(ctx, from, to, t.give === 'horse' ? 'horse' : t.give);
  if (t.ask) {
    const back = t.ask === 'horse' ? 'horse' : itemsOf(state, to.id).find((i) => i.kind === t.ask).id;
    move(ctx, to, from, back);
  }
  t.status = 'done';
  if (!t.ask) {
    // A gift with nothing back is help (a corpse part: +15 instead).
    from.helps = (from.helps ?? 0) + 1;
    if (t.giveKind === 'part') partGiftWorthiness(ctx, from);
    else addWorthiness(from, RULES.worthiness.help, ctx);
  }
  addHint(to, t.ask ? `The trade with ${from.name} is done.` : `${from.name}'s gift is yours.`, ctx);
  addHint(from, t.ask ? `The trade with ${to.name} is done.` : `${to.name} takes your gift.`, ctx);
  return log('done');
}

function move(ctx, from, to, what) {
  if (what === 'horse') {
    const lost = loseHorse(ctx, from, { counts: false });
    if (lost) giveHorse(to, lost.name, lost.quality);
  } else {
    const it = ctx.state.items.find((i) => i.id === what);
    if (it?.kind === 'part') takePart(ctx, it, to, 'traded', from, { quiet: true });
    else if (it) { it.owner = to.id; it.pendingUse = false; }
  }
}
