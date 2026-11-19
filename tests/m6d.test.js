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
import { requiemReady, craftReady, pierceStand, requiemChance } from '../js/engine/secret-endings.js';
import { requiemFor } from '../data/stands.js';
import { applyCheat } from '../js/engine/cheats.js';
import { buildFinale } from '../js/engine/finale.js';
import { buildGameLog } from '../js/engine/game-log.js';
import { renderLogHtml } from '../js/host/log-export.js';
import { resolveFight } from '../js/engine/fights.js';
import { readFileSync, readdirSync } from 'node:fs';
import { storyFor } from '../js/engine/secrets.js';

// The Arrow's odds (milestone 7c: by Worthiness), forced for a test.
const SUCCESS = RULES.requiem.success;
const forceArrow = (p) => { RULES.requiem.success = [[0, p], [100, p]]; };

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

test('the Requiem Arrow: combine an Arrow and 2 Rokakaka, then pierce; a Requiem no longer wins outright', () => {
  const state = setup('rq');
  const a = state.players[0];
  giveStand(ctx(state), a, POOL.find((s) => s.id === 'gold-experience'), 'arrow');
  a.worthiness = 20; // no Worthiness gate any more
  addItem(state, 'arrow', a, {});
  addItem(state, 'rokakaka', a, {});
  assert.equal(craftReady(state, a), false, 'one Rokakaka is not enough');
  addItem(state, 'rokakaka', a, {});
  assert.equal(craftReady(state, a), true);
  assert.equal(requiemReady(state, a), false, 'the pieces alone are not a Requiem Arrow');
  const recipe = state.items.filter((i) => i.owner === a.id).map((i) => i.id);
  forceArrow(1);
  try {
    let craftPrompt = null;
    finish(state, (p) => {
      if (p.special === 'requiem-craft') { craftPrompt = p; return 'combine'; }
      return p.special === 'requiem' ? 'pierce' : null;
    });
    assert.ok(craftPrompt?.secret, 'a secret prompt');
    assert.equal(craftPrompt.text, 'Your Arrow and the fruit hum together. Combine them?');
  } finally { RULES.requiem.success = SUCCESS; }
  assert.ok(!state.items.some((i) => recipe.includes(i.id)), 'all three consumed');
  assert.ok(state.race.requiemArrows.some((x) => x.id === a.id && x.stage === 1), 'combined at once');
  assert.equal(state.race.requiems.find((x) => x.id === a.id).stand, 'Gold Experience Requiem');
  assert.notEqual(state.race.ending.id, 'requiem', 'no Requiem ending');
  const f = buildFinale(state);
  if (a.status === 'racing') assert.ok(f.epilogues.some((e) => e.id === 'requiem'), 'the Requiem epilogue');
  const card = f.extras.find((x) => x.id === 'secrets-requiem').data;
  assert.ok(card.holders.some((q) => q.id === a.id && q.stand === 'Gold Experience Requiem' && q.stage >= 1), 'its own card in the secrets reveal');
  assert.ok(f.epilogues.some((e) => e.id === 'requiem') || a.status !== 'racing');
  assert.ok(storyFor(state, a).lines.some((l) => /Requiem/.test(l)));
  assert.ok(buildGameLog(state).secret.requiems.some((x) => x.stand === 'Gold Experience Requiem'));
});

test('every Stand has its own Requiem; Echoes and Tusk share one across Acts', () => {
  const state = setup('rq2');
  const a = state.players[0];
  applyCheat(state, { by: 'test', target: a.id, action: 'setup-requiem' });
  assert.equal(requiemReady(state, a), true, 'the cheat gives a Requiem Arrow (and a Stand if needed)');
  const before = a.stand.id;
  forceArrow(1);
  try {
    assert.ok(pierceStand({ state, rng: new Rng('p'), stage: { id: 5 }, roundLabel: 'Day 1' }, a));
  } finally { RULES.requiem.success = SUCCESS; }
  assert.equal(a.stand.id, requiemFor(before).id);
  assert.equal(requiemFor('echoes-act-1').id, requiemFor('echoes-act-3').id);
  assert.equal(requiemFor('tusk-act-2').name, 'Tusk Act 4');
  assert.equal(requiemFor('silver-chariot').name, 'Silver Chariot Requiem');
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
  resolveFight; // (imported for parity with other suites)
});

test('the Arrow chooses: when it refuses, the Requiem Arrow is used up, the Stand stays, and only the phone knows', () => {
  const state = setup('refuse');
  const a = state.players[0];
  applyCheat(state, { by: 'test', target: a.id, action: 'setup-requiem' });
  const before = a.stand.name;
  forceArrow(0);
  try {
    const got = pierceStand({ state, rng: new Rng('r'), stage: { id: 5 }, roundLabel: 'Day 1' }, a);
    assert.equal(got, null);
  } finally { RULES.requiem.success = SUCCESS; }
  assert.equal(a.stand.name, before, 'the Stand stays as it was');
  assert.equal(state.items.filter((i) => i.owner === a.id && i.kind === 'requiem-arrow').length, 0, 'used up');
  assert.ok(a.hints.some((h) => h.text === 'The Arrow turns in your hand and will not pierce. It has judged you.'));
  assert.equal(state.corpse.announce.length, 0, 'nothing on stream');
  assert.equal((state.race.requiems ?? []).length, 0);
  // The odds by Worthiness.
  assert.equal(requiemChance(30), 0.15); assert.equal(requiemChance(10), 0.15);
  assert.equal(requiemChance(50), 0.3); assert.equal(requiemChance(60), 0.4);
  assert.equal(requiemChance(90), 0.65); assert.equal(requiemChance(100), 0.7);
});
