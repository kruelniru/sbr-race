// Milestone 6c: the secrets reveal, each player's story, and the M6b fixes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound, syncShown } from '../js/engine/race.js';
import { buildFinale } from '../js/engine/finale.js';
import { carried, markFinding, resolveFind } from '../js/engine/corpse.js';
import { chooseBoss } from '../js/engine/final-stage.js';
import { decideEnding } from '../js/engine/endings.js';
import { joinValentine } from '../js/engine/valentine.js';
import { resolveFight } from '../js/engine/fights.js';
import { partStory, storyFor } from '../js/engine/secrets.js';
import { buildCards } from '../js/engine/reveal.js';

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
const ctxOf = (state, seed = 'ctx', stage = 5) => ({
  state, rng: new Rng(seed), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] },
  assigned: new Set(), usedNpcs: new Set(), tally: { died: 0, retired: 0 }, eventCounts: {},
});
function give(state, who, n) {
  for (let i = 0; i < n; i++) {
    const part = state.corpse.parts.find((p) => !['held', 'finding', 'president'].includes(p.status));
    markFinding(part, who.id);
    resolveFind(ctxOf(state, 'g' + i), part.id, who, 'keep');
    carried(state, who).forEach((it) => { it.merged = true; });
  }
}

test('a whole game ends with the secrets reveal, after the memorial, before the final standings', () => {
  const state = setup('sr', { players: 14, humans: 3 });
  let last;
  while (!state.race.over) last = runRound(state);
  const kinds = buildCards(last).map((c) => (c.kind === 'extra' ? c.id : c.kind));
  const mem = kinds.indexOf('memorial');
  const end = kinds.indexOf('the-end');
  for (const id of ['secrets-title', 'secrets-worthiness', 'secrets-corpse-1', 'secrets-corpse-2', 'secrets-finale']) {
    const i = kinds.indexOf(id);
    assert.ok(i > mem && i < end, `${id} between the memorial and the final standings`);
  }
  const f = buildFinale(state);
  const corpse = f.extras.find((x) => x.id === 'secrets-corpse-1').data.parts;
  assert.equal(corpse.length, 5);
  for (const p of corpse) assert.ok(p.story.length > 0);
});

test('the Fallen screen never names a masked killer; the reveal does', () => {
  const state = setup('mk');
  const [a, b] = state.players;
  joinValentine(ctxOf(state, 'j', 4), a);
  let killed = false;
  for (let i = 0; i < 400 && !killed; i++) {
    b.status = 'racing'; b.death = null;
    resolveFight(ctxOf(state, 'f' + i), { kind: 'errand', attacker: a, defender: b, win: 'kill', defend: 'surrender', masked: true });
    killed = b.status === 'dead';
  }
  assert.ok(killed);
  assert.equal(b.death.by, 'a rider in a dark hat');
  assert.equal(state.race.memorial.at(-1).by, 'a rider in a dark hat');
  assert.equal(b.death.secretBy, a.name);
  state.race.over = true; state.race.ending = { id: 'normal' };
  const deaths = buildFinale(state).extras.find((x) => x.id === 'secrets-deaths').data.rows;
  assert.ok(deaths.some((r) => r.real.includes(a.name)));
});

test("a part's journey reads in order", () => {
  const state = setup('pj');
  const [a, b] = state.players;
  give(state, a, 1);
  const item = carried(state, a)[0];
  resolveFight(ctxOf(state, 's'), { kind: 'strike', attacker: b, defender: a, win: 'part', defend: 'surrender' });
  const steps = partStory(state, item.partId);
  assert.match(steps[0], new RegExp(`found by ${a.name}`));
  assert.match(steps[1], new RegExp(`taken by ${b.name} in a fight`));
});

test("each phone gets its own story, only after the last reveal, and nobody else's", () => {
  const state = setup('st', { players: 6, humans: 6 });
  while (!state.race.over) runRound(state);
  const [a, b] = state.players;
  assert.equal(storyFor(state, a).name, a.name);
  syncShown(state);
  const mine = privateView(state, a.id).race.story;
  assert.ok(mine.lines.length >= 4);
  assert.ok(!JSON.stringify(privateView(state, b.id)).includes(JSON.stringify(mine.lines)), 'not on anyone else\'s phone');
  for (const v of [publicView(state), hostScreenView(state)]) assert.ok(!JSON.stringify(v).includes('Your best stage'));
});

test('Love Train: the bonus follows the boss chosen with Love Train, even after losing a part', () => {
  const state = setup('ltb');
  const a = state.players[0];
  give(state, a, 5);
  state.race.stageIdx = 8; state.race.roundIdx = 0;
  chooseBoss(state);
  // A fight took one part: 4 left, still the Love Train bonus.
  const it = carried(state, a)[0];
  state.items = state.items.filter((x) => x !== it);
  state.corpse.parts.find((p) => p.id === it.partId).status = 'president';
  const before = a.points;
  const e = decideEnding(state);
  assert.equal(e.id, 'corpse');
  assert.equal(a.points, before + RULES.finale.loveTrainBonus);
});

test('the Double-Cross, forced: a joiner boss reaches New York with the Corpse', () => {
  const state = setup('dc', { players: 8, humans: 8 });
  const [t, o] = state.players;
  joinValentine(ctxOf(state, 'j1', 4), t);
  joinValentine(ctxOf(state, 'j2', 4), o);
  give(state, t, 4);
  state.race.stageIdx = 8; state.race.roundIdx = 0;
  chooseBoss(state);
  state.race.over = true;
  decideEnding(state);
  const f = buildFinale(state);
  assert.equal(f.ending.id, 'double-cross');
  assert.match(f.ending.text, /The President's own rider has betrayed him/);
  assert.match(f.extras.find((x) => x.id === 'secrets-finale').data.lines[0], /secretly rode for Valentine/);
});
