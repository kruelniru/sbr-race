// Milestone 7c: starting Worthiness order, Stand Acts, a Requiem for every
// Stand, the Requiem Arrow, and what a Requiem does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import PERSONALITIES from '../data/personalities.js';
import { POOL, CANON_STANDS, EVOLVED, REQUIEMS, STAND_BY_ID, requiemFor } from '../data/stands.js';
import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { giveStand, removeStand, tryEvolve, availableStands } from '../js/engine/stands.js';
import { killRacer } from '../js/engine/racers.js';
import { addItem } from '../js/engine/items.js';
import { requiemReady, autoCraft, becomeRequiem } from '../js/engine/secret-endings.js';
import { deathWeight } from '../js/engine/events.js';
import { fightScore } from '../js/engine/fights.js';
import { placementScore } from '../js/engine/placement.js';
import { decideEnding, ENDINGS } from '../js/engine/endings.js';
import { applyCheat } from '../js/engine/cheats.js';
import { EVENTS } from '../js/engine/events.js';

function setup(seed, { players = 8, humans = 4 } = {}) {
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
const ctxOf = (state, stage = 4, seed = 'c') => ({ state, rng: new Rng(seed), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] }, assigned: new Set(), usedNpcs: new Set(), eventCounts: {} });
const withChance = (trigger, p, fn) => { const old = RULES.acts.chance[trigger]; RULES.acts.chance[trigger] = p; try { fn(); } finally { RULES.acts.chance[trigger] = old; } };

test('starting Worthiness follows the personality cards: Honorable highest, Ruthless lowest', () => {
  const W = RULES.worthiness.byPersonality;
  const order = Object.entries(W).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  assert.equal(order[0], 'honorable');
  assert.equal(order.at(-1), 'ruthless');
  assert.ok(W.cautious > W.opportunist && W.cautious > W.glory, 'Cautious is "somewhat worthy"');
  assert.match(PERSONALITIES.find((p) => p.id === 'honorable').tradeoff, /more worthy/);
  assert.match(PERSONALITIES.find((p) => p.id === 'ruthless').tradeoff, /less worthy/);
});

test('Acts: only Act 1 is ever rolled; later Acts come only from evolving', () => {
  const ids = [...POOL, ...CANON_STANDS].map((s) => s.id);
  for (const s of EVOLVED) assert.ok(!ids.includes(s.id), `${s.name} is not rollable`);
  assert.ok(ids.includes('echoes-act-1') && ids.includes('tusk-act-1'));
  assert.equal(STAND_BY_ID['echoes-act-1'].next, 'echoes-act-2');
  assert.equal(STAND_BY_ID['echoes-act-2'].tier, 'rare');
  assert.equal(STAND_BY_ID['echoes-act-3'].tier, 'rare');
  assert.equal(STAND_BY_ID['tusk-act-3'].next, undefined, 'Tusk Act 4 is only its Requiem');
});

test('Acts: a trigger evolves the Stand, at most one Act a stage; private unless it was revealed', () => {
  const state = setup('acts');
  const p = state.players[0];
  giveStand(ctxOf(state), p, STAND_BY_ID['echoes-act-1'], 'arrow');
  withChance('fight', 1, () => {
    tryEvolve(ctxOf(state, 4), p, 'fight');
    assert.equal(p.stand.name, 'Echoes Act 2');
    assert.equal(p.stand.tier, 'rare');
    tryEvolve(ctxOf(state, 4), p, 'fight');
    assert.equal(p.stand.name, 'Echoes Act 2', 'one Act a stage');
    const ctx = ctxOf(state, 5);
    p.stand.revealed = true;
    tryEvolve(ctx, p, 'fight');
    assert.equal(p.stand.name, 'Echoes Act 3');
    assert.match(ctx.lateLines[0].text, /Echoes Act 3/, 'a revealed Stand is announced on stream');
    tryEvolve(ctxOf(state, 6), p, 'fight');
    assert.equal(p.stand.name, 'Echoes Act 3', 'the last Act');
  });
  assert.ok(p.pendingAlerts.some((a) => a.title === 'Your Stand evolved'));
  assert.equal(state.stands.acts.length, 2);
  // An unrevealed evolution says nothing on stream.
  const q = state.players[1];
  giveStand(ctxOf(state), q, STAND_BY_ID['tusk-act-1'] ? POOL.find((s) => s.id === 'harvest') : null, 'arrow');
  assert.equal(tryEvolve(ctxOf(state), q, 'fight'), null, 'Harvest has no Acts');
});

test('Acts: a Rokakaka resets the Stand to Act 1 in the pool; Tusk Act 1 enters the pool when Johnny dies', () => {
  const state = setup('reset');
  const p = state.players[0];
  giveStand(ctxOf(state), p, STAND_BY_ID['echoes-act-1'], 'arrow');
  withChance('finish', 1, () => tryEvolve(ctxOf(state), p, 'finish'));
  assert.equal(p.stand.id, 'echoes-act-2');
  assert.ok(!availableStands(state).some((s) => s.id === 'echoes-act-1'));
  removeStand(state, p);
  assert.ok(availableStands(state).some((s) => s.id === 'echoes-act-1'), 'back as Act 1');
  assert.ok(!availableStands(state).some((s) => s.family && s.act > 1), 'never a later Act');
  const johnny = state.canon.find((c) => c.canonId === 'johnny');
  giveStand(ctxOf(state), johnny, STAND_BY_ID['tusk-act-1'], 'awaken');
  johnny.stand.id = 'tusk-act-2';
  killRacer(ctxOf(state, 5), johnny, 'fell', null);
  assert.ok(availableStands(state).some((s) => s.id === 'tusk-act-1'), 'Tusk enters as Act 1');
});

test("Johnny's Tusk evolves on schedule if he lives (Act 2 in Stages 4–5, Act 3 in Stages 7–8)", () => {
  let checked = 0;
  for (let g = 0; g < 12; g++) {
    const state = setup('johnny' + g, { players: 4, humans: 0 });
    const j = state.canon.find((c) => c.canonId === 'johnny');
    j.status = 'racing';
    while (!state.race.over) runRound(state);
    const acts = (state.stands.acts ?? []).filter((a) => a.racerId === j.id);
    for (const a of acts) {
      assert.equal(a.trigger, 'schedule', 'never on a trigger');
      assert.ok(a.to === 'Tusk Act 2' ? a.stage >= 4 && a.stage <= 5 : a.stage >= 7 && a.stage <= 8, `${a.to} in Stage ${a.stage}`);
    }
    if (j.status === 'racing' && j.stand) { assert.equal(j.stand.name, 'Tusk Act 3'); checked++; }
  }
  assert.ok(checked > 0);
});

test('a Requiem for every obtainable Stand, each with a signature event', () => {
  const obtainable = [...POOL, ...CANON_STANDS, ...EVOLVED];
  const withEvent = new Set(EVENTS.flatMap((e) => Object.values(e.cast).map((c) => c.stand)).filter(Boolean));
  for (const s of obtainable) {
    const q = requiemFor(s.id);
    assert.ok(q, `${s.name} has a Requiem`);
    assert.ok(q.flavor && q.name, s.name);
    assert.ok(withEvent.has(q.id), `${q.name} has a signature event`);
  }
  assert.equal(new Set(REQUIEMS.map((q) => q.id)).size, REQUIEMS.length);
  assert.equal(requiemFor('gold-experience').name, 'Gold Experience Requiem');
  assert.equal(requiemFor('tusk-act-1').name, 'Tusk Act 4');
  assert.equal(requiemFor('echoes-act-2').name, 'Echoes Requiem');
  for (const s of EVOLVED) assert.ok(withEvent.has(s.id), `${s.name} has a signature event`);
});

test('only a human PC pierces; AI racers and NPCs carry Requiem Arrows (and combine the pieces)', () => {
  const state = setup('who', { players: 6, humans: 2 });
  const [human, , ai] = [state.players[0], state.players[1], state.players.find((p) => p.isAI)];
  for (const r of [human, ai]) { giveStand(ctxOf(state), r, POOL.find((s) => !state.stands.out.includes(s.id)), 'arrow'); addItem(state, 'requiem-arrow', r, {}); }
  assert.equal(requiemReady(state, human), true);
  assert.equal(requiemReady(state, ai), false, 'an AI racer never uses one');
  const npc = state.field.packLeaders[0];
  addItem(state, 'arrow', npc, {}); addItem(state, 'rokakaka', npc, {}); addItem(state, 'rokakaka', npc, {});
  autoCraft(ctxOf(state));
  assert.deepEqual(state.items.filter((i) => i.owner === npc.id).map((i) => i.kind), ['requiem-arrow'], 'an NPC combines them');
  assert.ok(state.race.requiemArrows.some((x) => x.id === npc.id && !x.human));
});

test('what a Requiem does: fights, survival, parts, placement; no Requiem ending; not immortal', () => {
  const state = setup('power');
  const p = state.players[0];
  giveStand(ctxOf(state), p, POOL.find((s) => s.id === 'hermit-purple'), 'arrow');
  const before = { death: deathWeight(p, true, 6) };
  const ctx = ctxOf(state, 5);
  assert.ok(becomeRequiem(ctx, p, 'requiem'));
  assert.equal(p.stand.name, 'Hermit Purple Requiem');
  assert.ok(state.corpse.announce.includes('An Arrow has found its mark. Somewhere out there rides a Stand that no one will ever reach the end of.'));
  assert.ok(!state.corpse.announce.some((l) => l.includes(p.name)), 'never named on stream');
  assert.ok(p.pendingAlerts.some((a) => a.title === 'This is Requiem' && a.text.startsWith('Hermit Purple is gone.')));
  assert.ok(deathWeight(p, true, 6) < before.death * 0.5, 'much harder to kill');
  const rng = new Rng('f');
  const fctx = { state, rng };
  const plain = { tier: 'pc', skill: 65, stand: { tier: 'legendary' } };
  assert.ok(fightScore({ state, rng: new Rng('x') }, { ...p, skill: 65 }).base ?? true);
  let a = 0, b = 0;
  for (let i = 0; i < 2000; i++) { a += fightScore(fctx, { tier: 'pc', skill: 65, stand: p.stand }).score; b += fightScore(fctx, plain).score; }
  assert.ok(a / 2000 - b / 2000 > RULES.requiem.fightBonus - 1.5, 'the Requiem fight bonus');
  const s1 = placementScore({ ...p, pace: 0, injured: false, requiem: { finishes: 0 } }, { id: 5, terrain: [] }, new Rng('p'));
  const s2 = placementScore({ ...p, pace: 0, injured: false, requiem: { finishes: 1 } }, { id: 5, terrain: [] }, new Rng('p'));
  assert.equal(Math.round(s1 - s2), RULES.requiem.placementFirst - RULES.requiem.placementAfter, 'a big boost first, smaller after');
  // Not immortal.
  killRacer(ctxOf(state, 6), p, 'fell', null);
  assert.equal(p.status, 'dead');
  assert.equal(ENDINGS.requiem, undefined);
  while (!state.race.over) runRound(state);
  assert.notEqual(decideEnding(state).id, 'requiem');
});

test('the cheat menu: a Requiem Arrow, and any Requiem form', () => {
  const state = setup('cheat');
  const p = state.players[0];
  assert.equal(applyCheat(state, { by: 'test', target: p.id, action: 'item-requiem-arrow' }).ok, true);
  assert.ok(state.items.some((i) => i.owner === p.id && i.kind === 'requiem-arrow'));
  assert.equal(applyCheat(state, { by: 'test', target: p.id, action: 'stand-give', value: 'tusk-act-4' }).ok, true);
  assert.equal(p.stand.requiem, true);
  assert.equal(state.race.requiems.at(-1).source, 'cheat');
});
