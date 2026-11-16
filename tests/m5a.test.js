// Milestone 5a: fights, horses, alliances, trading.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { POOL } from '../data/stands.js';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView, choiceWaitingView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { giveStand } from '../js/engine/stands.js';
import { openStagePlans, openSubEvents, closeChoices, chooseHorse } from '../js/engine/choices.js';
import { resolveFight } from '../js/engine/fights.js';
import { giveHorse, loseHorse, buyHorse, shopOffers, horseMod } from '../js/engine/horses.js';
import { formAlliance, breakAlliance, allyOf } from '../js/engine/alliances.js';
import { killRacer } from '../js/engine/racers.js';
import { offerTrade, resolveTrade } from '../js/engine/trades.js';
import { addItem } from '../js/engine/items.js';
import { EFFECTS } from '../js/engine/effects.js';

function setup(seed, { players = 8, humans = 2 } = {}) {
  const state = createGameState(seed);
  const rng = new Rng(seed + ':roster');
  const taken = new Set();
  for (let i = 0; i < players; i++) {
    const p = addPlayer(state, { isAI: i >= humans });
    p.connected = true;
    const c = makeAiCharacter(rng, taken);
    c.mount = 'horse';
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  startRace(state);
  return state;
}
const ctxOf = (state, seed = 'ctx', stage = 3) => ({ state, rng: new Rng(seed), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] }, assigned: new Set() });

test('fights: a Legendary Stand helps but never wins automatically', () => {
  const state = setup('f1');
  const [a, b] = state.players;
  giveStand(ctxOf(state), a, POOL.find((s) => s.tier === 'legendary'), 'arrow');
  let wins = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const ctx = ctxOf(state, 'f' + i);
    a.status = b.status = 'racing'; a.injured = b.injured = false;
    const f = resolveFight(ctx, { kind: 'strike', attacker: a, defender: b, win: 'spare', defend: 'fight-spare' });
    if (f.outcome === 'spare') wins++;
  }
  assert.ok(wins / N > 0.45 && wins / N < 0.8, `Legendary won ${wins / N}`);
  assert.equal(a.stand.revealed, true, 'fighting with a Stand reveals it');
});

test('fights: kill tags and mercy (started −8, caught fleeing −12, self-defense 0, spare +12 / +4 started)', () => {
  const W = RULES.worthiness;
  const seen = {};
  for (let i = 0; i < 400 && Object.keys(seen).length < 5; i++) {
    const state = setup('f2-' + i);
    const [a, b] = state.players;
    a.worthiness = 50; b.worthiness = 50;
    const defend = ['fight-kill', 'flee', 'fight-spare'][i % 3];
    const win = i % 2 ? 'kill' : 'spare';
    const f = resolveFight(ctxOf(state, 'k' + i), { kind: 'strike', attacker: a, defender: b, win, defend });
    const key = `${f.outcome}:${defend}`;
    if (f.outcome === 'kill' && defend === 'flee') { assert.equal(a.worthiness, 50 + W.killCruel); seen.cruel = 1; }
    else if (f.outcome === 'kill') { assert.equal(a.worthiness, 50 + W.killStarted); seen.started = 1; assert.equal(b.status, 'dead'); }
    else if (f.outcome === 'reversal-kill') { assert.equal(b.worthiness, 50 + W.killDefense); assert.equal(a.status, 'dead'); seen.defense = 1; }
    else if (f.outcome === 'reversal-spare') { assert.equal(b.worthiness, 50 + W.spare); seen.spare = 1; }
    else if (f.outcome === 'spare') { assert.equal(a.worthiness, 50 + W.spareStarted); seen.spareStarted = 1; }
    else if (f.outcome === 'kill-missed') { assert.equal(a.worthiness, 50); assert.equal(b.status, 'racing'); }
    void key;
  }
  assert.deepEqual(Object.keys(seen).sort(), ['cruel', 'defense', 'spare', 'spareStarted', 'started']);
});

test('canon racers never die in a Stage 1 fight', () => {
  for (let i = 0; i < 200; i++) {
    const state = setup('f3-' + i);
    const c = state.canon[0];
    const p = state.players[0];
    resolveFight(ctxOf(state, 's' + i, 1), { kind: 'strike', attacker: p, defender: c, win: 'kill', defend: 'flee' });
    resolveFight(ctxOf(state, 't' + i, 1), { kind: 'strike', attacker: c, defender: p, win: 'kill', defend: 'fight-kill' });
    assert.notEqual(c.status, 'dead');
  }
});

test('horses: quality plugs into placement, Runners never get one, the second loss asks', () => {
  const state = setup('h1');
  const [a, b] = state.players;
  const ctx = ctxOf(state);
  a.horseQuality = 'fine'; a.horseBase = null;
  assert.equal(horseMod(a), RULES.horses.quality.fine);
  const canon = state.canon.find((c) => c.canonId === 'gyro');
  assert.equal(canon.horseQuality, 'thoroughbred');
  assert.equal(horseMod(canon), 0, "canon horses are already in their skill");
  const avdul = state.canon.find((c) => c.canonId === 'avdul');
  assert.equal(avdul.horse, null, 'Avdul keeps his camel');

  b.mount = 'runner'; b.horse = null; b.onFoot = false;
  assert.equal(giveHorse(b, 'X', 'sound'), false);
  assert.equal(EFFECTS.getHorse.fits(ctx, b), false);
  assert.deepEqual(shopOffers(b), []);

  loseHorse(ctx, a);
  assert.equal(a.onFoot, true);
  assert.equal(a.secondHorseDecision, false);
  giveHorse(a, 'Y', 'sound');
  loseHorse(ctx, a);
  assert.equal(a.secondHorseDecision, true, 'second loss: retire or go on');

  a.points = 100;
  assert.ok(buyHorse(state, new Rng('b'), a, 'sound'));
  assert.equal(a.points, 100 - RULES.horses.prices.sound);
  assert.equal(a.onFoot, false);
});

test('horses: the trader only opens in town stages, during the Stage Plan', () => {
  const state = setup('h2');
  const me = state.players[0];
  me.onFoot = true; me.points = 200;
  // Stage 1: no trader.
  openStagePlans(state);
  assert.equal(chooseHorse(state, me.id, 'sound').ok, false);
  closeChoices(state);
  // Jump to Stage 5 (Kansas City).
  while (state.race.stageIdx < 4) runRound(state);
  me.status = 'racing'; me.onFoot = true; me.points = 200;
  openStagePlans(state);
  assert.ok(privateView(state, me.id).prompt.shop.length);
  assert.ok(chooseHorse(state, me.id, 'sound').ok);
  closeChoices(state);
  assert.equal(me.onFoot, false);
  assert.equal(me.points, 200 - RULES.horses.prices.sound);
});

test('alliances: one at a time, both sides, death ends it, abandoning costs −12', () => {
  const state = setup('a1');
  const [a, b, c] = state.players;
  const ctx = ctxOf(state);
  assert.ok(formAlliance(ctx, a, b, 'pc'));
  assert.equal(allyOf(state, a), b);
  assert.equal(allyOf(state, b), a);
  assert.equal(formAlliance(ctx, a, c, 'pc'), false, 'one ally at a time');
  a.worthiness = 50;
  breakAlliance(ctx, a, 'abandoned');
  assert.equal(a.worthiness, 50 + RULES.worthiness.abandonAlly);
  assert.equal(allyOf(state, b), null);
  formAlliance(ctx, a, c, 'pc');
  killRacer(ctx, c, 'test', null);
  assert.equal(a.ally, null, 'a death ends the alliance');
});

test('trading: secret, a gift counts as help, a trade swaps, a vanished item falls through', () => {
  const state = setup('t1');
  const [a, b] = state.players; // both human
  const ctx = ctxOf(state);
  const arrow = addItem(state, 'arrow', a, { stage: 1 });
  assert.ok(offerTrade(state, a.id, { give: arrow.id, to: b.id }).ok);
  assert.equal(offerTrade(state, a.id, { give: arrow.id, to: b.id }).ok, false, 'one offer out at a time');
  // The receiver's prompt is secret.
  while (state.race.choice) closeChoices(state);
  openSubEvents(state);
  const prompt = state.race.choice.prompts.find((x) => x.playerId === b.id);
  assert.equal(prompt.special, 'trade');
  assert.equal(prompt.secret, true);
  assert.ok(!JSON.stringify([publicView(state), hostScreenView(state), choiceWaitingView(state)]).includes(prompt.text));
  assert.ok(!JSON.stringify(privateView(state, state.players[2].id)).includes('Arrow'));
  const t = state.trades[0];
  a.worthiness = 50;
  resolveTrade(ctx, t, true);
  assert.equal(state.items[0].owner, b.id);
  assert.equal(a.worthiness, 50 + RULES.worthiness.help, 'a gift is help');

  // A trade: Rokakaka for an Arrow.
  const roka = addItem(state, 'rokakaka', a, { stage: 1 });
  assert.ok(offerTrade(state, a.id, { give: roka.id, to: b.id, ask: 'arrow' }).ok);
  a.worthiness = 50;
  resolveTrade(ctx, state.trades[1], true);
  assert.equal(state.items.find((i) => i.kind === 'arrow').owner, a.id);
  assert.equal(state.items.find((i) => i.kind === 'rokakaka').owner, b.id);
  assert.equal(a.worthiness, 50, 'a trade counts as nothing');

  // Falls through: the asked item is gone.
  state.items = state.items.filter((i) => i.kind !== 'arrow');
  const r2 = addItem(state, 'rokakaka', b, { stage: 1 });
  assert.ok(offerTrade(state, b.id, { give: r2.id, to: a.id, ask: 'arrow' }).ok);
  resolveTrade(ctx, state.trades[2], true);
  assert.equal(state.trades[2].status, 'failed');
});

test('a whole game with M5a runs clean (fights, horses, alliances)', () => {
  for (let g = 0; g < 6; g++) {
    const state = setup('m5a-' + g, { players: 16, humans: 0 });
    while (!state.race.over) runRound(state);
    assert.ok((state.race.fightLog ?? []).length > 0);
    for (const r of [...state.players, ...state.canon]) {
      if (r.ally) {
        const other = [...state.players, ...state.canon, ...state.field.kept].find((x) => x.id === r.ally);
        assert.ok(other && other.status !== 'dead' && other.ally === r.id, `${r.name}'s ally points back`);
      }
      if (r.mount === 'runner') assert.equal(r.horse, null);
    }
  }
});
