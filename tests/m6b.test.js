// Milestone 6b: the boss, Love Train, Bring down, Funny Valentine's last stand, endings, epilogues.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { killRacer } from '../js/engine/racers.js';
import { carried, markFinding, resolveFind } from '../js/engine/corpse.js';
import { chooseBoss, isLoveTrain, resolveBringDown, valentineBeaten, resolveValentineRematch } from '../js/engine/final-stage.js';
import { decideEnding, epilogues } from '../js/engine/endings.js';
import { joinValentine, valentineEnding } from '../js/engine/valentine.js';
import { resolveFight } from '../js/engine/fights.js';
import { EFFECTS } from '../js/engine/effects.js';
import { buildFinale } from '../js/engine/finale.js';

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
const ctxOf = (state, seed = 'ctx', stage = 9) => ({
  state, rng: new Rng(seed), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] },
  assigned: new Set(), usedNpcs: new Set(), tally: { died: 0, retired: 0 }, eventCounts: {},
});
function give(state, who, n) {
  for (let i = 0; i < n; i++) {
    const part = state.corpse.parts.find((p) => p.status !== 'held' && p.status !== 'finding' && p.status !== 'president');
    markFinding(part, who.id);
    resolveFind(ctxOf(state, 'g' + i), part.id, who, 'keep');
    carried(state, who).forEach((it) => { it.merged = true; });
  }
}
const toFinalStage = (state) => { state.race.stageIdx = 8; state.race.roundIdx = 0; };

test('the boss: most parts (3+), ties by Worthiness; only the boss is announced', () => {
  const state = setup('b1');
  const [a, b, c] = state.players;
  give(state, a, 3); give(state, b, 3); give(state, c, 2);
  a.worthiness = 40; b.worthiness = 70;
  toFinalStage(state);
  const boss = chooseBoss(state);
  assert.equal(boss.id, b.id, 'tie: higher Worthiness');
  assert.equal(boss.loveTrain, false);
  const note = state.race.pendingNotes.at(-1);
  assert.ok(note.text.includes(`chosen ${b.name}`));
  assert.ok(!note.text.includes(a.name), 'nothing about anyone else');
  const none = setup('b2');
  give(none, none.players[0], 2);
  toFinalStage(none);
  assert.equal(chooseBoss(none), null, 'fewer than 3 parts: no boss');
});

test('Love Train: nothing can kill the holder; a killing blow lands on someone else', () => {
  const state = setup('lt');
  const [a, b] = state.players;
  give(state, a, 5);
  toFinalStage(state);
  chooseBoss(state);
  assert.equal(isLoveTrain(state, a), true);
  assert.equal(EFFECTS.dies.fits(ctxOf(state), a), false);
  let redirected = 0;
  for (let i = 0; i < 300 && !redirected; i++) {
    a.status = b.status = 'racing';
    const f = resolveFight(ctxOf(state, 'k' + i), { kind: 'strike', attacker: b, defender: a, win: 'kill', defend: 'surrender' });
    assert.equal(a.status, 'racing');
    if (/misfortune slides off/.test(f.text)) redirected++;
  }
  assert.ok(redirected, 'someone else falls instead');
});

test('Bring down: a win splits the parts among the joiners; a loss hurts one of them', () => {
  let won = 0, lost = 0;
  for (let i = 0; i < 80; i++) {
    const state = setup('bd' + i);
    const [boss, x, y, z] = state.players;
    give(state, boss, 4);
    toFinalStage(state);
    chooseBoss(state);
    const res = resolveBringDown(ctxOf(state, 'bd' + i), [x.id, y.id, z.id]);
    if (carried(state, boss).length === 0) {
      won++;
      assert.equal([x, y, z].reduce((t, r) => t + carried(state, r).length, 0), 3, 'each joiner takes one');
      assert.equal(state.corpse.parts.filter((p) => p.status === 'loose').length, 1, 'the rest come loose');
    } else {
      lost++;
      assert.ok([x, y, z].some((r) => r.injured || r.status === 'dead'));
    }
    assert.match(res.text, /ride down/);
  }
  assert.ok(won > 40 && lost > 3, `won ${won}, lost ${lost} (a 3-4 part boss loses to 3 about 80%)`);
});

test('Funny Valentine: beaten once in the Final Stage, D4C; a second win kills him and frees his parts', () => {
  const state = setup('fv');
  const [a, b, j] = state.players;
  joinValentine(ctxOf(state, 'j', 5), j);
  state.corpse.parts[0].status = 'president';
  assert.equal(valentineBeaten(ctxOf(state, 'x', 8), a), '', 'never outside the Final Stage');
  assert.match(valentineBeaten(ctxOf(state), a), /Dirty Deeds Done Dirt Cheap/);
  assert.ok(state.race.fv.rematch);
  let res = null;
  for (let i = 0; i < 50 && !state.race.fv.dead; i++) {
    state.race.fv.rematch = { due: 1, beaterId: a.id };
    a.status = b.status = 'racing';
    res = resolveValentineRematch(ctxOf(state, 'r' + i), [a.id, b.id]);
  }
  assert.equal(state.race.fv.dead, true);
  assert.match(res.text, /Funny Valentine is dead/);
  assert.equal(state.corpse.parts[0].status, 'loose', 'his parts come loose');
  state.race.boss = null;
  assert.equal(decideEnding(state).id, 'president-dead');
  valentineEnding(state);
  assert.equal(j.valentine.outcome, 'dead');
  assert.ok(j.hints.some((h) => h.text === 'The President is dead. You rode for a dead man.'));
});

test('endings: one main ending, in priority order; the Double-Cross; the Corpse ending pays the boss', () => {
  let state = setup('e1');
  const [a] = state.players;
  give(state, a, 3);
  toFinalStage(state);
  chooseBoss(state);
  const before = a.points;
  assert.equal(decideEnding(state).id, 'corpse');
  assert.equal(a.points, before + RULES.finale.corpseBonus);
  // The boss died in the Final Stage: no Corpse ending.
  state = setup('e2');
  give(state, state.players[0], 3);
  toFinalStage(state);
  chooseBoss(state);
  killRacer(ctxOf(state), state.players[0], 'fell', null);
  assert.notEqual(decideEnding(state).id, 'corpse');
  // Double-Cross: a joiner boss keeps the parts; other joiners get nothing.
  state = setup('e3');
  const [t, o] = state.players;
  joinValentine(ctxOf(state, 'j1', 4), t); joinValentine(ctxOf(state, 'j2', 4), o);
  give(state, t, 3);
  toFinalStage(state);
  chooseBoss(state);
  assert.equal(decideEnding(state).id, 'double-cross');
  valentineEnding(state);
  assert.equal(t.valentine.outcome, 'traitor');
  assert.equal(o.valentine.outcome, 'betrayed');
  // The President beats the Double-Cross when he holds more than every racer combined.
  state = setup('e4');
  give(state, state.players[0], 3);
  for (const p of state.corpse.parts.filter((x) => x.status !== 'held').slice(0, 4)) p.status = 'president';
  toFinalStage(state);
  chooseBoss(state);
  assert.equal(decideEnding(state).id, 'president');
  // Bloodbath: 3 or fewer named racers left.
  state = setup('e5', { players: 3, humans: 3 });
  for (const c of state.canon) c.status = 'dead';
  state.race.boss = null;
  assert.equal(decideEnding(state).id, 'bloodbath');
});

test('epilogues: canon champions (Hot Pants), a Runner, the Saint Smiles', () => {
  const state = setup('ep');
  const hp = state.canon.find((c) => c.canonId === 'hotpants');
  state.race.ending = { id: 'normal' };
  let cards = epilogues(state, [{ id: hp.id, name: hp.name }]);
  assert.ok(cards.some((c) => c.id === 'canon-champion' && /Hot Pants crosses the line first/.test(c.text)));
  const p = state.players[0];
  p.mount = 'runner'; p.kills = 0; p.worthiness = 90;
  cards = epilogues(state, [{ id: p.id, name: p.name }]);
  assert.deepEqual(cards.map((c) => c.id).sort(), ['on-foot', 'saint-smiles']);
});

test('a whole game: the finale has its ending, epilogues and the Corpse Holder award', () => {
  for (let g = 0; g < 6; g++) {
    const state = setup('wg' + g, { players: 14, humans: 3 });
    while (!state.race.over) runRound(state);
    const f = buildFinale(state);
    assert.ok(['normal', 'president-dead', 'president', 'double-cross', 'corpse', 'bloodbath'].includes(state.race.ending.id));
    assert.equal(!!f.ending, state.race.ending.id !== 'normal');
    assert.ok(Array.isArray(f.epilogues));
    assert.ok(f.awards.some((a) => a.id === 'corpse'));
  }
});
