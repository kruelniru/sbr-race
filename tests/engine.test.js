// Engine unit tests. Run: npm test   (or: node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../js/engine/rng.js';
import { render, lintTemplate } from '../js/engine/text.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import {
  createGameState, addPlayer, applyCharacter, validateCharacter, publicView, privateView, hostScreenView,
} from '../js/engine/state.js';

test('rng is deterministic per seed and resumable', () => {
  const a = new Rng('gyro-1');
  const b = new Rng('gyro-1');
  const seqA = Array.from({ length: 5 }, () => a.next());
  assert.deepEqual(seqA, Array.from({ length: 5 }, () => b.next()));
  assert.notDeepEqual(seqA, Array.from({ length: 5 }, () => new Rng('gyro-2').next()));

  const saved = a.getState();
  const resumed = Rng.fromState(saved);
  assert.equal(resumed.next(), a.next());
});

test('rng helpers stay in range', () => {
  const r = new Rng('x');
  for (let i = 0; i < 1000; i++) {
    const n = r.int(3, 7);
    assert.ok(n >= 3 && n <= 7 && Number.isInteger(n));
  }
  assert.equal(r.weighted(['a', 'b'], (x) => (x === 'b' ? 1 : 0)), 'b');
  assert.equal(r.weighted(['a'], () => 0), undefined);
});

test('templates read right for he/she/they', () => {
  const t = '{racer} spots {other}. {racer.They} {racer:is/are} out of water, so {racer.they} ride{racer:s} to {other.them}.';
  const kruel = (pronouns) => ({ name: 'Kruel', pronouns });
  const silas = { name: 'Silas', pronouns: 'he' };
  assert.equal(render(t, { racer: kruel('she'), other: silas }),
    'Kruel spots Silas. She is out of water, so she rides to him.');
  assert.equal(render(t, { racer: kruel('they'), other: silas }),
    'Kruel spots Silas. They are out of water, so they ride to him.');
  assert.equal(render('{a.Their} horse; {a.themself}; push{a:es}', { a: { name: 'A', pronouns: 'he' } }),
    'His horse; himself; pushes');
});

test('template mistakes are visible and lintable', () => {
  assert.match(render('{nobody} waves', {}), /⟦nobody⟧/);
  assert.deepEqual(lintTemplate('{racer} rides', ['racer']), []);
  assert.equal(lintTemplate('{racer.thy} {x}', ['racer']).length, 2);
});

test('character validation', () => {
  const s = createGameState('seed');
  const p1 = addPlayer(s);
  const good = { name: '  Kruel   Niru ', gender: 'Woman', pronouns: 'she', personality: 'glory' };
  const r = validateCharacter(s, p1.id, good);
  assert.ok(r.ok);
  assert.equal(r.value.name, 'Kruel Niru');
  applyCharacter(p1, r.value);

  const p2 = addPlayer(s);
  assert.equal(validateCharacter(s, p2.id, { ...good, name: 'kruel niru' }).ok, false, 'duplicate name');
  assert.equal(validateCharacter(s, p1.id, good).ok, true, 'own name is fine when editing');
  assert.equal(validateCharacter(s, p2.id, { ...good, name: 'X', pronouns: 'xe' }).ok, false);
  assert.equal(validateCharacter(s, p2.id, { ...good, name: 'X', personality: 'evil' }).ok, false);
  assert.equal(validateCharacter(s, p2.id, { ...good, name: 'X', picture: 'javascript:alert(1)' }).ok, false);
});

test('AI racers: deterministic, unique names, valid characters', () => {
  const make = (seed) => {
    const rng = new Rng(seed);
    const taken = new Set();
    return Array.from({ length: 24 }, () => {
      const c = makeAiCharacter(rng, taken);
      taken.add(c.name.toLowerCase());
      return c;
    });
  };
  const a = make('ai-seed');
  assert.deepEqual(a, make('ai-seed'));
  assert.equal(new Set(a.map((c) => c.name)).size, 24, 'names are unique');
  const s = createGameState('x');
  for (const c of a) assert.ok(validateCharacter(s, 'none', c).ok, c.name);
  assert.equal(s.settings.minPlayers, 12);
});

test('views do not leak private fields', () => {
  const s = createGameState('seed');
  const p = addPlayer(s);
  applyCharacter(p, { name: 'Kruel', gender: 'Woman', pronouns: 'she', personality: 'glory', picture: null });
  p.worthiness = 70; // a future secret: must never show up in shared views

  const pub = JSON.stringify(publicView(s));
  assert.ok(!pub.includes('Woman'), 'gender is host-only');
  assert.ok(!pub.includes('worthiness'));
  assert.ok(!JSON.stringify(hostScreenView(s)).includes('worthiness'));
  assert.equal(privateView(s, p.id).name, 'Kruel');
});

test('names ending in "." or "!" never start a new sentence (Mike O., Hey Ya!)', async () => {
  const { render } = await import('../js/engine/text.js');
  const r = { a: { name: 'Mike O.', pronouns: 'he' }, b: { name: 'Pocoloco', pronouns: 'he', stand: 'Hey Ya!', horse: 'Mr. Ed' }, c: { name: 'Kruel', pronouns: 'they' } };
  assert.equal(render('{a} steps into the trail.', r), 'Mike O. steps into the trail.');
  assert.equal(render('{c} drives {a} off.', r), 'Kruel drives Mike O. off.');
  assert.equal(render("{b}'s {b.stand} bristles as {b.horse} rears. {b.they} {b:is/are} calm.", r), "Pocoloco's Hey Ya! bristles as Mr. Ed rears. He is calm.");
});

test('plain events never blame a racer for a choice they never made (milestone 7a)', async () => {
  const { default: E } = await import('../data/events/index.js');
  const BLAME = /\b(gambl\w*|decid\w*|choos\w*|chose|bets?|insist\w*|ignor\w*|misjudg\w*|too far|reckless\w*|foolish\w*|stubborn\w*)\b/i;
  for (const e of E) {
    const focus = Object.entries(e.cast).find(([, c]) => (typeof c === 'string' ? c : c.is) === 'focus')[0];
    const x = e.effects?.[focus] ?? {};
    if (x.dies || x.injured || x.horse || x.retires) assert.doesNotMatch(e.text, BLAME, `${e.id}: "${e.text}"`);
  }
});
