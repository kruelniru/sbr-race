// Race engine tests. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound, roundTypes, roundLabel } from '../js/engine/race.js';
import { namedRacers } from '../js/engine/racers.js';
import { lintEvents, EVENTS } from '../js/engine/events.js';
import { buildCards } from '../js/engine/reveal.js';

function game(seed, players = 16, { runners = 0.3 } = {}) {
  const state = createGameState(seed);
  const rng = new Rng(seed + ':roster');
  const taken = new Set();
  for (let i = 0; i < players; i++) {
    const p = addPlayer(state, { isAI: true });
    const c = makeAiCharacter(rng, taken);
    c.mount = rng.chance(runners) ? 'runner' : 'horse';
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  startRace(state);
  const results = [];
  while (!state.race.over) results.push(runRound(state));
  return { state, results };
}

test('every event passes the content linter', () => {
  assert.deepEqual(lintEvents(), []);
  assert.ok(EVENTS.length > 100);
});

test('round types: Day/Night alternate, last is the Finish Line', () => {
  assert.deepEqual(roundTypes(2), ['day', 'finish']);
  assert.deepEqual(roundTypes(4), ['day', 'night', 'day', 'finish']);
  assert.equal(roundLabel(roundTypes(4), 2), 'Day 2');
  assert.equal(roundLabel(roundTypes(4), 1), 'Night 1');
});

test('a whole game is deterministic from its seed', () => {
  const a = game('det-1').results.map((r) => r.events.map((e) => e.text));
  const b = game('det-1').results.map((r) => r.events.map((e) => e.text));
  assert.deepEqual(a, b);
});

test('game invariants over many seeds', () => {
  for (let g = 0; g < 25; g++) {
    const { state, results } = game('inv-' + g);
    const f = state.field;
    assert.equal(f.racing + f.retired + f.dead, RULES.fieldSize, 'NPC counts add up');
    assert.equal(results.filter((r) => r.type === 'finish').length, 9, 'nine Finish Lines');

    for (const r of namedRacers(state)) {
      if (r.tier === 'canon' && r.death) assert.notEqual(r.death.stage, 1, `${r.name} died in Stage 1`);
      if (r.mount === 'runner') assert.equal(r.onFoot, false, 'Runners never lose a horse');
      if (r.status === 'dead') assert.ok(r.death?.cause);
    }

    for (const res of results) {
      // Each named racer appears in at most one event per round.
      const seen = new Set();
      for (const e of res.events) {
        for (const id of e.ids) {
          assert.ok(!seen.has(id), `round ${res.roundNo}: ${id} in two events`);
          seen.add(id);
        }
        assert.doesNotMatch(e.text, /⟦/, 'no broken template tokens');
      }
      // Fallen screens only after Night rounds and Finish Lines.
      if (res.fallen) assert.ok(res.type === 'night' || res.type === 'finish');
      if (res.placements) {
        const pts = res.placements.map((p) => p.points);
        assert.deepEqual(pts.slice(0, 10), [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
      }
      for (const c of buildCards(res)) assert.ok(c.seconds >= 0);
    }
  }
});

test('dead racers stay dead and get no more events', () => {
  const { results } = game('dead-1');
  const dead = new Set();
  for (const res of results) {
    for (const e of res.events) for (const id of e.ids) assert.ok(!dead.has(id), `${id} acted after dying`);
    for (const id of res.deaths) dead.add(id);
  }
});
