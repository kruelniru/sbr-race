// Milestone 6d: secret endings (D4C, The Saint Walks Again, the Requiem Arrow), forced.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { POOL } from '../data/stands.js';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { killRacer } from '../js/engine/racers.js';
import { giveStand } from '../js/engine/stands.js';
import { addItem } from '../js/engine/items.js';
import { openSubEvents, closeChoices, answerPrompt, openStagePlans, needsStagePlans } from '../js/engine/choices.js';
import { requiemReady } from '../js/engine/secret-endings.js';
import { applyCheat } from '../js/engine/cheats.js';
import { buildFinale } from '../js/engine/finale.js';
import { buildGameLog } from '../js/engine/game-log.js';
import { renderLogHtml } from '../js/host/log-export.js';
import { resolveFight } from '../js/engine/fights.js';
import { readFileSync, readdirSync } from 'node:fs';
import { storyFor } from '../js/engine/secrets.js';

function setup(seed, { players = 8, humans = 8 } = {}) {
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
const ctx = (state, stage = 3) => ({ state, rng: new Rng('k'), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] } });
/** Run to the end, answering every human prompt by `answer(prompt)` (or ★). */
function finish(state, answer = () => null) {
  while (!state.race.over) {
    if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
    const w = openSubEvents(state);
    for (const p of w.prompts) { const o = answer(p); if (o) answerPrompt(state, p.playerId, { promptId: p.id, optionId: o }); }
    closeChoices(state);
    runRound(state);
  }
}

test('the Requiem Arrow: the hidden prompt appears only with the full recipe, and its holder wins outright', () => {
  const state = setup('rq');
  const a = state.players[0];
  giveStand(ctx(state), a, POOL.find((s) => s.id === 'gold-experience'), 'arrow');
  a.worthiness = 85;
  addItem(state, 'arrow', a, {});
  addItem(state, 'rokakaka', a, {});
  assert.equal(requiemReady(state, a), false, 'one Rokakaka is not enough');
  addItem(state, 'rokakaka', a, {});
  assert.equal(requiemReady(state, a), true);
  a.worthiness = 79;
  assert.equal(requiemReady(state, a), false, 'Worthiness 80+');
  a.worthiness = 85;
  const recipe = state.items.filter((i) => i.owner === a.id).map((i) => i.id);
  finish(state, (p) => (p.special === 'requiem' ? 'pierce' : null));
  assert.equal(a.stand.name, 'Gold Experience Requiem');
  assert.ok(!state.items.some((i) => recipe.includes(i.id)), 'all three consumed');
  assert.equal(a.status, 'racing', 'nothing can kill its user');
  assert.equal(state.race.ending.id, 'requiem');
  const f = buildFinale(state);
  assert.equal(f.podium[0].id, a.id, 'wins outright');
  assert.match(f.ending.text, /became Gold Experience Requiem/);
  assert.ok(f.extras.find((x) => x.id === 'secrets-finale').data.lines.some((l) => /Requiem/.test(l)));
  assert.ok(storyFor(state, a).lines.some((l) => /Requiem/.test(l)));
  assert.equal(buildGameLog(state).secret.requiem.stand, 'Gold Experience Requiem');
});

test('"[Stand] Requiem" for other Legendary Stands', () => {
  const state = setup('rq2');
  const a = state.players[0];
  applyCheat(state, { by: 'test', target: a.id, action: 'setup-requiem' });
  assert.equal(requiemReady(state, a), true, 'the cheat sets up the whole recipe');
  const before = a.stand.name;
  finish(state, (p) => (p.special === 'requiem' ? 'pierce' : null));
  assert.ok(a.stand.name === `${before} Requiem` || a.stand.name.endsWith('Requiem'));
});

test('the recipe is never hinted at: no Requiem prompt without it, and no recipe words on any screen', () => {
  const state = setup('rq3');
  const w = openSubEvents(state);
  assert.ok(!w.prompts.some((p) => p.special === 'requiem'));
  for (const v of [publicView(state), hostScreenView(state), privateView(state, state.players[0].id)]) assert.ok(!/Requiem|requiem/.test(JSON.stringify(v).replace(/"stands":\[[^\]]*\]/, '')));
  // The phone and host code never mention the recipe.
  for (const dir of ['js/phone', 'js/host']) {
    for (const f of readdirSync(dir)) assert.ok(!/2 Rokakaka|two Rokakaka|Worthiness 80/.test(readFileSync(`${dir}/${f}`, 'utf8')), `${dir}/${f}`);
  }
});

test('The Saint Walks Again: all 9 parts at the final Finish Line wins outright', () => {
  const state = setup('saint');
  const last = () => state.race.stageIdx === 8 && state.race.roundIdx === state.race.plan[8].types.length - 1;
  while (!last()) runRound(state);
  // Someone still racing in this world (not a D4C rider).
  const a = state.players.find((p) => p.status === 'racing' && !p.otherWorld);
  const w = openSubEvents(state);
  // Keep the holder out of this round's fights, and safe for it, so the test is about the ending.
  w.prompts = w.prompts.filter((x) => x.playerId !== a.id && !Object.values(x.roles ?? {}).includes(a.id));
  closeChoices(state);
  a.blessedRound = state.race.roundNo + 1;
  applyCheat(state, { by: 'test', target: a.id, action: 'parts-all' });
  runRound(state); // the final Finish Line
  assert.equal(state.items.filter((i) => i.kind === 'part' && i.owner === a.id).length, 9);
  assert.equal(state.race.ending.id, 'saint');
  const f = buildFinale(state);
  assert.equal(f.podium[0].id, a.id, 'wins outright, whatever the points');
  assert.match(f.ending.text, /The Saint walks again/);
  assert.ok(f.extras.find((x) => x.id === 'secrets-finale').data.lines.some((l) => /all nine parts/.test(l)));
});

test('D4C: a dead human PC comes back for the Final Stage on Valentine\'s side, controlled by that player', () => {
  const state = setup('d4c');
  const [a] = state.players;
  while (state.race.stageIdx < 4) runRound(state);
  killRacer({ ...ctx(state, 4), result: { deaths: [] } }, a, 'fell', null);
  assert.equal(applyCheat(state, { by: 'test', target: a.id, action: 'trigger-d4c' }).ok, true);
  while (state.race.stageIdx < 8) runRound(state);
  openStagePlans(state); closeChoices(state); // Stage 9 plans close: D4C happens
  assert.equal(state.race.d4c.id, a.id);
  assert.equal(a.status, 'racing');
  assert.equal(a.stand.tier, 'legendary');
  assert.ok(a.valentine.joined && a.valentine.otherWorld);
  assert.ok(state.race.pendingNotes.some((n) => /Dirty Deeds Done Dirt Cheap\. .* rides again… from another world\./.test(n.text)));
  const w = openSubEvents(state);
  assert.ok(w.prompts.every((p) => p.playerId !== a.id || p.special !== 'bring-down'), 'never asked to bring down the boss');
  closeChoices(state);
  finish(state);
  const f = buildFinale(state);
  assert.ok(!f.podium.some((p) => p.id === a.id), 'they can\'t win the race');
  if (state.race.ending.id === 'president') assert.equal(a.status, 'racing', 'Valentine won: they stay');
  else assert.equal(a.status, 'dead', 'they fade back');
  assert.ok(f.extras.find((x) => x.id === 'secrets-finale').data.lines.some((l) => /another world/.test(l)));
  assert.ok(storyFor(state, a).lines.some((l) => /another world/.test(l)));
  assert.equal(buildGameLog(state).secret.d4c.name, a.name);
  assert.match(renderLogHtml(buildGameLog(state)), /CHEATS USED/);
});

test('the cheat menu warns when a Stand it gives was held by someone (an NPC too)', () => {
  const state = setup('dup');
  const a = state.players[0];
  const npc = state.field.packLeaders[0];
  giveStand(ctx(state), npc, POOL.find((s) => s.id === 'cream'), 'corpse');
  const res = applyCheat(state, { by: 'test', target: a.id, action: 'stand-give', value: 'cream' });
  assert.ok(res.ok && /took it from them/.test(res.warning));
  assert.equal(a.stand.id, 'cream');
  assert.equal(npc.stand, null, 'never two holders');
  assert.ok(RULES.requiem.minWorthiness === 80);
  resolveFight; // (imported for parity with other suites)
});
