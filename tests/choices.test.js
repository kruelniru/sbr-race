// Choice engine tests: Stage Plans, sub events, Hunt a rival, secret prompts.
import RULES from '../data/rules.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import {
  needsStagePlans, openStagePlans, openSubEvents, closeChoices, answerPrompt, rivalTargets, SUBS,
} from '../js/engine/choices.js';
import { lintTemplate } from '../js/engine/text.js';

/** A game with `humans` real players (not AI) and the rest AI. */
function setup(seed, { players = 12, humans = 2 } = {}) {
  const state = createGameState(seed);
  const rng = new Rng(seed + ':roster');
  const taken = new Set();
  for (let i = 0; i < players; i++) {
    const p = addPlayer(state, { isAI: i >= humans });
    if (!p.isAI) p.connected = true;
    const c = makeAiCharacter(rng, taken);
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  startRace(state);
  return state;
}

test('sub event templates are valid', () => {
  for (const s of SUBS) {
    const roles = Object.keys(s.cast);
    assert.deepEqual(lintTemplate(s.text, roles), [], s.id);
    for (const o of s.options) for (const out of o.outcomes ?? []) assert.deepEqual(lintTemplate(out.text, roles), [], `${s.id}:${o.id}`);
  }
});

test('Stage Plans: AI answers at once, humans get ★ when the timer runs out', () => {
  const state = setup('plans-1');
  assert.ok(needsStagePlans(state));
  const w = openStagePlans(state);
  const human = w.prompts.find((x) => x.playerId === 'p1');
  assert.equal(human.answer, null, 'humans start unanswered');
  assert.ok(w.prompts.filter((x) => x.playerId !== 'p1' && x.playerId !== 'p2').every((x) => x.answer?.by === 'ai'));
  // Only real options are accepted; answers can change until close.
  assert.equal(answerPrompt(state, 'p1', { promptId: human.id, optionId: 'nope' }).ok, false);
  assert.equal(answerPrompt(state, 'p2', { promptId: human.id, optionId: 'push' }).ok, false, "can't answer someone else's prompt");
  assert.equal(answerPrompt(state, 'p1', { promptId: human.id, optionId: 'push' }).ok, true);
  assert.equal(answerPrompt(state, 'p1', { promptId: human.id, optionId: 'laylow' }).ok, true);
  assert.equal(answerPrompt(state, 'p1', { promptId: human.id, optionId: 'rival' }).ok, false, 'Hunt a rival needs a target');
  closeChoices(state);
  const p1 = state.players[0], p2 = state.players[1];
  assert.equal(p1.plan, 'laylow');
  assert.equal(p2.plan, w.prompts.find((x) => x.playerId === 'p2').star, 'timed out -> ★ plan');
  assert.ok(!needsStagePlans(state));
  // Hidden plans never appear.
  for (const x of w.prompts) for (const o of x.options) assert.ok(!['palm', 'corpse'].includes(o.id));
});

test('rival targets: racing named racers only, never yourself', () => {
  const state = setup('rival-targets');
  const me = state.players[0];
  state.players[3].status = 'dead';
  state.players[4].status = 'retired';
  const ids = rivalTargets(state, me).map((t) => t.id);
  assert.ok(!ids.includes(me.id));
  assert.ok(!ids.includes(state.players[3].id) && !ids.includes(state.players[4].id));
  assert.ok(ids.some((id) => id.startsWith('c-')), 'canon racers can be targets');
});

test('Hunt a rival: a gone target gives "rival is gone"; one showdown per target per round', () => {
  const state = setup('rival-1', { players: 12, humans: 0 });
  openStagePlans(state);
  const target = state.players[5];
  for (const x of state.race.choice.prompts) {
    if (x.playerId === target.id) x.answer = { optionId: 'pace', by: 'ai' };
    else x.answer = { optionId: 'rival', targetId: target.id, by: 'ai' };
  }
  closeChoices(state);
  // Stage 1 has 2 rounds: many hunters, one target -> at most one showdown a round.
  for (let r = 0; r < 2; r++) {
    const w = openSubEvents(state);
    const keys = new Set(w.prompts.filter((x) => x.rivalKey && x.roles.b === target.id).map((x) => x.rivalKey));
    assert.ok(keys.size <= 1, 'one showdown per target per round');
    if (r === 1) assert.ok(w.notes.some((n) => /never catches up/.test(n.text)), 'unlucky hunters miss out at stage end');
    closeChoices(state);
    runRound(state);
  }

  // Target dies before the showdown fires.
  const s2 = setup('rival-2', { players: 8, humans: 0 });
  openStagePlans(s2);
  const hunter = s2.players[0], victim = s2.players[1];
  for (const x of s2.race.choice.prompts) x.answer = x.playerId === hunter.id ? { optionId: 'rival', targetId: victim.id, by: 'ai' } : { optionId: 'pace', by: 'ai' };
  closeChoices(s2);
  victim.status = 'dead';
  const w = openSubEvents(s2);
  assert.ok(w.notes.some((n) => n.text.includes(`${hunter.name}'s rival is gone`)));
  assert.ok(!w.prompts.some((x) => x.rivalKey), 'no showdown');
  closeChoices(s2);
  const res = runRound(s2);
  assert.ok(res.events.some((e) => !e.note && e.ids.includes(hunter.id)) || hunter.status !== 'racing', 'the hunter still gets a normal event');
});

test('every round gives at least one PC a choice', () => {
  const state = setup('freq-1', { players: 12, humans: 3 });
  state.settings.subEventFreq = 'low';
  for (let i = 0; i < 12; i++) {
    if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
    const w = openSubEvents(state);
    if (state.players.some((p) => p.status === 'racing')) assert.ok(w.prompts.length >= 1);
    closeChoices(state);
    runRound(state);
  }
});

test('secret prompts never reach the host screen', () => {
  const state = setup('secret-1', { players: 6, humans: 2 });
  openStagePlans(state); closeChoices(state);
  const w = openSubEvents(state);
  for (const x of w.prompts) x.secret = true;
  const view = hostScreenView(state).choice;
  assert.equal(view.allSecret, true);
  assert.equal(view.total, 0);
  assert.deepEqual(view.deciders, []);
  // The phone still sees its own prompt.
  const mine = w.prompts[0];
  assert.equal(privateView(state, mine.playerId).prompt.id, mine.id);
  // Mixed: only non-secret prompts are named and counted.
  if (w.prompts.length > 1) {
    w.prompts[1].secret = false;
    const v2 = hostScreenView(state).choice;
    assert.equal(v2.allSecret, false);
    assert.deepEqual(v2.deciders.map((d) => d.id), [w.prompts[1].playerId]);
  }
});

test('Worthiness and engine internals stay out of every view', () => {
  const state = setup('privacy-1', { players: 6, humans: 2 });
  openStagePlans(state);
  for (const p of state.players) assert.equal(p.worthiness, RULES.worthiness.byPersonality[p.personality], "PCs start by personality");
  assert.equal(state.canon.find((c) => c.canonId === "gyro").worthiness, 80);
  assert.equal(state.canon.find((c) => c.canonId === "diego").worthiness, 25);
  const all = JSON.stringify([publicView(state), hostScreenView(state), ...state.players.map((p) => privateView(state, p.id))]);
  assert.doesNotMatch(all, /worthiness/i);
  assert.doesNotMatch(all, /"roles"|"subId"|"rivalKey"/);
});
