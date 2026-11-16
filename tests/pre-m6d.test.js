// Before M6d: safe early stages, the game log export, the secret cheat menu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { buildFinale } from '../js/engine/finale.js';
import { buildGameLog } from '../js/engine/game-log.js';
import { renderLogHtml } from '../js/host/log-export.js';
import { hashPin, verifyPin, applyCheat } from '../js/engine/cheats.js';
import { CHEAT_PIN_HASH } from '../js/config.js';
import { resolveFight } from '../js/engine/fights.js';
import { EFFECTS } from '../js/engine/effects.js';
import { carried } from '../js/engine/corpse.js';
import { openSubEvents } from '../js/engine/choices.js';

function setup(seed, { players = 10, humans = 4 } = {}) {
  const state = createGameState(seed);
  const rng = new Rng(seed + ':roster');
  const taken = new Set();
  for (let i = 0; i < players; i++) {
    const p = addPlayer(state, { isAI: i >= humans });
    p.connected = true;
    const c = makeAiCharacter(rng, taken);
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  startRace(state);
  return state;
}
const ctxOf = (state, stage, seed = 'c') => ({ state, rng: new Rng(seed), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] }, assigned: new Set(), usedNpcs: new Set(), tally: { died: 0, retired: 0 } });

test('Stages 1–2 are safe for PCs, except the Palm and the Arrow', () => {
  const state = setup('safe');
  const [a, b] = state.players;
  for (const stage of [1, 2]) {
    assert.equal(EFFECTS.dies.fits(ctxOf(state, stage), a), false, 'no deadly event picks a PC');
    for (let i = 0; i < 200; i++) {
      a.status = b.status = 'racing';
      resolveFight(ctxOf(state, stage, 'f' + i), { kind: 'strike', attacker: b, defender: a, win: 'kill', defend: 'surrender' });
      assert.equal(a.status, 'racing', 'a beaten PC gets away hurt');
    }
  }
  assert.equal(EFFECTS.dies.fits(ctxOf(state, 3), a), true, 'from Stage 3 on, they can die');
  // Whole games: every PC death in Stages 1–2 is the Palm or an Arrow.
  for (let g = 0; g < 30; g++) {
    const s = setup('sg' + g, { players: 18, humans: 18 });
    while (s.race.stageIdx < 2) runRound(s);
    for (const p of s.players.filter((x) => x.death)) {
      assert.ok(/Devil's Palm|strange arrow/.test(p.death.cause), `${p.name}: ${p.death.cause}`);
    }
  }
});

test('the game log exports only after the game, with every round, the choices and the secrets', () => {
  const state = setup('log', { players: 8, humans: 3 });
  runRound(state);
  assert.equal(buildGameLog(state), null, 'never during a game');
  while (!state.race.over) runRound(state);
  const log = buildGameLog(state);
  assert.equal(log.seed, 'log');
  assert.equal(log.cheatsUsed, false);
  assert.equal(log.rounds.length, state.race.roundNo);
  assert.ok(log.choices.length > 10);
  assert.ok(log.players.every((p) => Array.isArray(p.worthiness.changes)));
  assert.ok(log.secret.fights.every((f) => f.attacker));
  const html = renderLogHtml(log);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /class="secret"/);
  assert.match(html, /No cheats were used/);
  assert.ok(html.includes(state.players[0].name));
  JSON.parse(JSON.stringify(log)); // plain data
});

test('cheat PIN: only a hash is stored, never the PIN; a wrong PIN fails', async () => {
  const TEST_PIN = '24680'; // test-only; the real PIN is set with tools/set-cheat-pin.js
  const testHash = await hashPin(TEST_PIN);
  assert.match(testHash, /^[0-9a-f]{64}$/);
  assert.equal(await verifyPin(TEST_PIN, testHash), true);
  assert.equal(await verifyPin('2468', testHash), false);
  assert.equal(await verifyPin(TEST_PIN, ''), false, 'an empty hash never opens');
  assert.equal(await verifyPin('abc', testHash), false, 'digits only');
  assert.match(CHEAT_PIN_HASH, /^([0-9a-f]{64})?$/, 'config holds a hash or nothing');
  const config = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
  assert.ok(!/CHEAT_PIN\s*=/.test(config), 'no PIN constant anywhere');
});

test('cheats work, are recorded, and mark the game; the menu stays hidden until unlocked', () => {
  const state = setup('ch');
  const [a, b] = state.players;
  assert.equal(privateView(state, a.id).cheat, null, 'hidden until the PIN');
  a.cheatUnlocked = true;
  assert.ok(privateView(state, a.id).cheat.stands.some((s) => s.tier === 'requiem'));
  assert.equal(privateView(state, b.id).cheat, null);
  assert.equal(applyCheat(state, { by: 'host', target: a.id, action: 'worthiness-set', value: 90 }).ok, true);
  assert.equal(a.worthiness, 90);
  applyCheat(state, { by: 'host', target: a.id, action: 'parts-all' });
  assert.equal(carried(state, a).length, 9);
  applyCheat(state, { by: 'host', target: a.id, action: 'stand-give', value: 'gold-experience-requiem' });
  assert.equal(a.stand.name, 'Gold Experience Requiem');
  applyCheat(state, { by: 'host', target: b.id, action: 'kill' });
  assert.equal(b.status, 'dead');
  applyCheat(state, { by: 'host', target: b.id, action: 'revive' });
  assert.equal(b.status, 'racing');
  applyCheat(state, { by: 'host', target: b.id, action: 'force-offer' });
  const w = openSubEvents(state);
  assert.ok(w.prompts.some((x) => x.playerId === b.id && x.special === 'valentine-offer'), 'forced sub event');
  assert.equal(applyCheat(state, { by: 'host', target: a.id, action: 'nonsense' }).ok, false);
  assert.equal(state.cheatsUsed, true);
  assert.equal(state.cheats.length, 6, "the failed one is not recorded");
  for (const v of [publicView(state), hostScreenView(state)]) assert.ok(!JSON.stringify(v).includes('cheat'), 'nothing on the stream');
  state.race.over = true;
  assert.equal(buildFinale(state).cheatsUsed, true);
  const log = buildGameLog(state);
  assert.equal(log.cheatsUsed, true);
  assert.match(renderLogHtml(log), /CHEATS USED/);
});
