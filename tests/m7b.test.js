// Milestone 7b: Worthiness retune, good-aligned drama, no theft without a choice,
// agents' cooldown and "Ride after them", fight alerts, item confirmations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { createGameState, addPlayer, applyCharacter, privateView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound, syncShown } from '../js/engine/race.js';
import { openSubEvents, closeChoices, openStagePlans, needsStagePlans, answerPrompt, useItem } from '../js/engine/choices.js';
import { ambushChance } from '../js/engine/agents.js';
import { fightAlerts } from '../js/engine/fights.js';
import { carried, markFinding, resolveFind } from '../js/engine/corpse.js';
import { addItem } from '../js/engine/items.js';
import { giveStand, pickStand } from '../js/engine/stands.js';

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
const ctxOf = (state, stage = 4) => ({ state, rng: new Rng('c'), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] }, assigned: new Set(), usedNpcs: new Set(), eventCounts: {} });
function give(state, who) {
  const part = state.corpse.parts.find((p) => p.status !== 'held' && p.status !== 'finding' && p.status !== 'president');
  markFinding(part, who.id);
  resolveFind(ctxOf(state), part.id, who, 'keep');
  carried(state, who).forEach((it) => { it.merged = true; });
  return part;
}

/** Play whole games; `answer(prompt, state)` may pick an option for a human's prompt. */
function play(seed, answer, opts) {
  const state = setup(seed, opts);
  const prompts = [];
  const results = [];
  while (!state.race.over) {
    if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
    const w = openSubEvents(state);
    for (const pr of w.prompts) {
      prompts.push(pr);
      const pick = answer?.(pr, state);
      if (pick) answerPrompt(state, pr.playerId, { promptId: pr.id, optionId: pick });
    }
    closeChoices(state);
    results.push(runRound(state));
    syncShown(state);
  }
  return { state, prompts, results };
}

test('no theft from a human without a choice: theft events only hit AI racers and NPCs', () => {
  const THEFT = new Set(['night-robbed', 'night-horse-stolen', 's2-water-thief', 's5-pickpocket']);
  for (let g = 0; g < 8; g++) {
    const { state, results } = play('theft' + g);
    const humans = new Set(state.players.filter((p) => !p.isAI).map((p) => p.id));
    for (const r of results) for (const e of r.events) if (THEFT.has(e.eventId)) assert.ok(!e.ids.some((id) => humans.has(id)), `${e.eventId}: ${e.text}`);
  }
});

test('repeat limits: a sub event title at most twice per player per game, never twice in a row', () => {
  for (let g = 0; g < 10; g++) {
    const { prompts } = play('rep' + g);
    const by = {};
    for (const pr of prompts.filter((x) => x.kind === 'sub' && x.subId)) (by[pr.playerId] ??= []).push(pr.title);
    for (const titles of Object.values(by)) {
      // (the Devil's Palm has its own schedule: no cap, but it still breaks a run)
      for (const t of new Set(titles)) if (t !== "The edge of the Devil's Palm") assert.ok(titles.filter((x) => x === t).length <= RULES.good.maxPerTitle, `${t} ${titles.filter((x) => x === t).length} times`);
      for (let i = 1; i < titles.length; i++) if (titles[i] !== "The edge of the Devil's Palm") assert.notEqual(titles[i], titles[i - 1], `${titles[i]} twice in a row`);
    }
  }
});

test('good drama: rescues, standing guard, hard choices and the camp thief play out on stream', () => {
  const seen = { rescue: 0, saved: 0, guard: 0, hard: 0, thief: 0 };
  for (let g = 0; g < 12 && Object.values(seen).some((n) => !n); g++) {
    const { state, prompts, results } = play('good' + g, (pr) => {
      if (/^sub-rescue/.test(pr.subId)) return 'spare';
      if (/^sub-guard/.test(pr.subId)) return 'watch';
      if (pr.subId === 'sub-camp-thief') return 'let';
      if (pr.subId === 'sub-hard-river') return 'help';
      return null;
    });
    for (const pr of prompts.filter((x) => /^sub-(rescue|guard|hard|camp)/.test(x.subId ?? ''))) assert.equal(pr.secret, false, 'on stream');
    const lines = results.flatMap((r) => r.events);
    seen.rescue += lines.filter((e) => /^sub-rescue/.test(e.eventId)).length;
    seen.saved += lines.filter((e) => /gets away safe\.$/.test(e.text)).length;
    seen.guard += lines.filter((e) => /^sub-guard/.test(e.eventId) && /keeps watch/.test(e.text)).length;
    seen.hard += lines.filter((e) => /^sub-hard-river:help/.test(e.eventId)).length;
    const lets = lines.filter((e) => e.eventId === 'sub-camp-thief:let');
    seen.thief += lets.length;
    for (const e of lets) {
      const p = state.players.find((x) => x.id === e.ids[0]);
      assert.ok((p.alerts ?? []).some((a) => a.title === 'You let them go') || p.status !== 'racing' || (p.alerts ?? []).length === 6);
    }
  }
  for (const [k, n] of Object.entries(seen)) assert.ok(n > 0, `no ${k}`);
});

test('a rescue: killing the attacker counts as defense; saving them is a great deed', () => {
  const W = RULES.worthiness;
  assert.ok(W.save > 0 && W.killDefense >= 0);
  // Above greatOnlyAbove, only great deeds count: a rescue still raises Worthiness.
  let raised = 0;
  for (let g = 0; g < 10 && !raised; g++) {
    const state = setup('resc' + g);
    for (const p of state.players) p.worthiness = 96;
    while (!state.race.over && !raised) {
      if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
      const w = openSubEvents(state);
      const mine = w.prompts.filter((x) => /^sub-rescue/.test(x.subId ?? ''));
      for (const pr of mine) answerPrompt(state, pr.playerId, { promptId: pr.id, optionId: 'kill' });
      const before = Object.fromEntries(state.players.map((p) => [p.id, p.worthiness]));
      closeChoices(state);
      const res = runRound(state);
      for (const pr of mine) {
        const p = state.players.find((x) => x.id === pr.playerId);
        const line = res.events.find((e) => /^sub-rescue/.test(e.eventId) && e.ids.includes(p.id));
        if (line?.eventId.endsWith(':saved') && p.status === 'racing' && !/turns the fight around/.test(line.text)) {
          assert.ok(p.worthiness >= before[p.id], 'a kill in a rescue costs nothing');
          if (p.worthiness > before[p.id]) raised++;
        }
      }
      for (const p of state.players) p.worthiness = 96;
    }
  }
  assert.ok(raised, 'a rescue is a great deed, even above 95');
});

test("agents' cooldown: after they beat or rob a PC, they leave them alone for 2 stages", () => {
  const state = setup('cool');
  const p = state.players[0];
  give(state, p);
  state.race.stageIdx = 3; // Stage 4
  assert.ok(ambushChance(state, p) > 0);
  p.agentsLeaveUntil = 4 + RULES.agents.cooldownStages;
  for (const s of [4, 5, 6]) { state.race.stageIdx = s - 1; assert.equal(ambushChance(state, p), 0, `stage ${s}`); }
  state.race.stageIdx = 6; // Stage 7
  assert.ok(ambushChance(state, p) > 0);
});

test('Ride after them: offered the next round; win and the part is yours again', () => {
  let won = 0, offered = 0;
  for (let g = 0; g < 40 && !won; g++) {
    const state = setup('ride' + g, { players: 4, humans: 4 });
    const p = state.players[0];
    p.skill = 90;
    const part = give(state, p);
    const it = carried(state, p)[0];
    state.items = state.items.filter((i) => i.id !== it.id);
    part.status = 'president';
    p.rideAfter = { agentId: state.agents[0].id, partIds: [part.id], stage: 1 };
    const w = openSubEvents(state);
    const pr = w.prompts.find((x) => x.special === 'ride-after' && x.playerId === p.id);
    assert.ok(pr, 'offered');
    offered++;
    assert.equal(p.rideAfter, null, 'only once');
    assert.ok(!/Spine|Heart|Arm|Eyes|Ears|Legs|Torso|Head/.test(pr.text), 'never which part');
    answerPrompt(state, p.id, { promptId: pr.id, optionId: 'chase' });
    closeChoices(state);
    runRound(state);
    if (carried(state, p).some((x) => x.partId === part.id)) won++;
  }
  assert.ok(offered && won, `won back ${won}`);
});

test('fight alerts: the phone says exactly what happened', () => {
  const agent = { name: 'Ringo Roadagain', tier: 'agent', status: 'racing' };
  const pc = { name: 'Ezra Ashby', tier: 'pc', status: 'racing' };
  fightAlerts(agent, pc, 'part', { took: ['the Spine'] });
  assert.deepEqual(pc.pendingAlerts.at(-1), { level: 'calm', title: 'You lost the fight', text: 'Ringo Roadagain beat you and took the Spine.' });
  fightAlerts(agent, pc, 'reversal-spare');
  assert.equal(pc.pendingAlerts.at(-1).text, 'You drove Ringo Roadagain off and kept everything.');
  fightAlerts({ name: 'the Pork Pie Hat Kid', tier: 'agent', status: 'racing' }, pc, 'searched');
  assert.match(pc.pendingAlerts.at(-1).text, /^The Pork Pie Hat Kid beat you/);
  const joiner = { name: 'Mae Whitlock', tier: 'pc', status: 'racing' };
  fightAlerts(joiner, pc, 'horse', { masked: true, horse: { name: 'Shiloh' } });
  assert.equal(pc.pendingAlerts.at(-1).text, 'A rider in a dark hat beat you and took Shiloh.');
  assert.ok(!JSON.stringify(pc.pendingAlerts).includes('Mae'), 'a masked rider stays masked');
  assert.equal(joiner.pendingAlerts.at(-1).text, 'You beat Ezra Ashby and took their horse.');
});

test('eating a Rokakaka: an alert after the reveal, and the Stand card says why', () => {
  const state = setup('eat', { players: 4, humans: 4 });
  const p = state.players[0];
  giveStand(ctxOf(state), p, pickStand(state, new Rng('s'), 'common'), 'test');
  const roka = addItem(state, 'rokakaka', p, {});
  syncShown(state);
  openSubEvents(state);
  assert.equal(useItem(state, p.id, roka.id).ok, true);
  closeChoices(state);
  runRound(state);
  syncShown(state);
  const v = privateView(state, p.id).race;
  assert.equal(v.stand, null);
  assert.equal(v.ateRokakaka, true);
  assert.ok(v.alerts.some((a) => a.title === 'You ate the Rokakaka'));
  assert.ok(!v.alerts.some((a) => a.title === 'Your Stand is gone'), 'not twice');
  giveStand(ctxOf(state), p, pickStand(state, new Rng('t'), 'common'), 'test');
  syncShown(state);
  assert.equal(privateView(state, p.id).race.ateRokakaka, false, 'until a new one arrives');
});
