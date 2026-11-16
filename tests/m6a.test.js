// Milestone 6a: dead players vote; the NPC field size setting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { killRacer } from '../js/engine/racers.js';
import { castDeadVote, deadVoters, blessed } from '../js/engine/dead.js';
import { resolveFight } from '../js/engine/fights.js';
import { EFFECTS } from '../js/engine/effects.js';

function setup(seed, { players = 8, humans = 4, fieldSize } = {}) {
  const state = createGameState(seed);
  if (fieldSize) state.settings.fieldSize = fieldSize;
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
const kill = (state, p) => killRacer({ state, stage: { id: 1 }, roundLabel: 'Day 1', result: { deaths: [] } }, p, 'fell', null);

test('only dead human players vote; the vote opens at a reveal and applies to the next round', () => {
  const state = setup('dv1');
  const [a, b, c] = state.players;
  const ai = state.players.at(-1);
  kill(state, a); kill(state, ai);
  assert.deepEqual(deadVoters(state).map((p) => p.id), [a.id], 'AI racers who die never vote');
  runRound(state);
  const v = privateView(state, a.id).deadVote;
  assert.ok(v && v.forRound === state.race.roundNo + 1);
  assert.equal(privateView(state, b.id).deadVote, null, 'the living see no vote');
  assert.equal(castDeadVote(state, b.id, { category: 'hazard' }).ok, false, 'the living cannot vote');
  assert.equal(castDeadVote(state, a.id, { category: 'nonsense' }).ok, false);
  assert.equal(castDeadVote(state, a.id, { category: 'blessing' }).ok, false, 'a blessing needs a target');
  assert.equal(castDeadVote(state, a.id, { category: 'blessing', targetId: c.id }).ok, true);
  // Nothing about the vote reaches the host, the public view, or another phone.
  for (const view of [hostScreenView(state), publicView(state), privateView(state, b.id)]) assert.doesNotMatch(JSON.stringify(view), /blessing|deadVote":\{/);
  const res = runRound(state);
  const line = res.events.find((e) => e.eventId === 'dead-blessing');
  assert.ok(line, 'the blessing happens');
  assert.equal(line.text, `The dead have chosen a blessing for ${c.name}.`);
  assert.equal(c.blessedRound, state.race.roundNo);
});

test('no votes, nothing happens; the majority wins; one anonymous line', () => {
  const state = setup('dv2', { players: 8, humans: 6 });
  const [a, b, c] = state.players;
  for (const p of [a, b, c]) kill(state, p);
  runRound(state);
  let res = runRound(state); // nobody voted
  assert.ok(!res.events.some((e) => e.dead));
  castDeadVote(state, a.id, { category: 'hazard' });
  castDeadVote(state, b.id, { category: 'hazard' });
  castDeadVote(state, c.id, { category: 'ambush' });
  res = runRound(state);
  const lines = res.events.filter((e) => e.dead);
  assert.equal(lines.length, 1);
  assert.match(lines[0].text, /^The dead stir\. /);
  assert.equal(state.race.deadLog.at(-1).category, 'hazard');
  for (const p of [a, b, c]) assert.ok(!lines[0].text.includes(p.name), 'never who voted');
});

test('a hazard never kills a named racer; a blessing protects for the round', () => {
  for (let i = 0; i < 30; i++) {
    const state = setup('dv3-' + i);
    const a = state.players[0];
    kill(state, a);
    runRound(state);
    const before = state.players.concat(state.canon).filter((r) => r.status !== 'dead').length;
    castDeadVote(state, a.id, { category: 'hazard' });
    const res = runRound(state);
    const line = res.events.find((e) => e.eventId === 'dead-hazard');
    assert.ok(line && !line.death);
    assert.ok(state.players.concat(state.canon).filter((r) => r.status !== 'dead').length >= before - res.deaths.length);
  }
  const state = setup('dv4');
  const [a, b, c] = state.players;
  const ctx = { state, rng: new Rng('x'), stage: { id: 3 }, roundLabel: 'Day 1', result: { deaths: [] }, assigned: new Set() };
  b.blessedRound = state.race.roundNo;
  assert.equal(blessed(ctx, b), true);
  assert.equal(EFFECTS.dies.fits(ctx, b), false, 'no deadly event can pick them');
  for (let i = 0; i < 200; i++) {
    b.status = c.status = 'racing';
    resolveFight({ ...ctx, rng: new Rng('f' + i) }, { kind: 'strike', attacker: c, defender: b, win: 'kill', defend: 'surrender' });
    assert.equal(b.status, 'racing', 'a fight cannot kill them');
  }
});

test('the NPC field size is a host setting', () => {
  const state = setup('fs', { fieldSize: 200 });
  assert.equal(state.field.racing, 200);
  while (!state.race.over) runRound(state);
  const f = state.field;
  assert.equal(f.racing + f.retired + f.dead, 200);
  assert.equal(setup('fs2').field.racing, RULES.fieldSize);
});
