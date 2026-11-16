// Milestone 5b: corpse parts, Valentine's agents, Funny Valentine, the Valentine offer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { POOL } from '../data/stands.js';
import { PART_LINES } from '../data/corpse.js';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
import { giveStand } from '../js/engine/stands.js';
import { openSubEvents, closeChoices, answerPrompt } from '../js/engine/choices.js';
import { resolveFight } from '../js/engine/fights.js';
import { killRacer } from '../js/engine/racers.js';
import { offerTrade, resolveTrade } from '../js/engine/trades.js';
import { carried, takePart, processMerges, corpseFinishLine, rejectionChance, presidentParts, resolveFind, markFinding, announcements, corpseSummary } from '../js/engine/corpse.js';
import { ambushChance, canFaceValentine, valentineFighter, livingAgents } from '../js/engine/agents.js';
import { joinValentine, isJoiner, valentineEnding } from '../js/engine/valentine.js';
import { placementScore } from '../js/engine/placement.js';

function setup(seed, { players = 8, humans = 2 } = {}) {
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
const ctxOf = (state, seed = 'ctx', stage = 3) => ({
  state, rng: new Rng(seed), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] },
  assigned: new Set(), usedNpcs: new Set(), tally: { died: 0, retired: 0 },
});

/** Hand a racer a part directly (as if they found and kept it). */
function givePart(state, who, n = 0, { hidden = false } = {}) {
  const ctx = ctxOf(state, 'give' + n);
  const part = state.corpse.parts[n];
  markFinding(part, who.id);
  resolveFind(ctx, part.id, who, hidden ? 'hide' : 'keep');
  return carried(state, who).find((i) => i.partId === part.id);
}

test('corpse parts: nine, one per stage, secret like Stands', () => {
  const state = setup('c1');
  assert.equal(state.corpse.parts.length, 9);
  assert.deepEqual(state.corpse.parts.map((p) => p.stage), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [a, b] = state.players;
  const it = givePart(state, a);
  assert.ok(it && !it.hidden);
  // Only the holder's phone knows.
  assert.ok(privateView(state, a.id).items.some((i) => i.kind === 'part' && /Left Arm/.test(i.label)));
  assert.ok(!privateView(state, b.id).items.some((i) => i.kind === 'part'));
  for (const v of [publicView(state), hostScreenView(state), privateView(state, b.id)]) {
    assert.doesNotMatch(JSON.stringify(v), /Left Arm|corpse|"part"/i);
  }
});

test('corpse parts: a find is a secret prompt; keep / hide / give', () => {
  let found = null;
  for (let g = 0; g < 30 && !found; g++) {
    const state = setup('c2-' + g, { players: 6, humans: 6 });
    for (let r = 0; r < 12 && !found; r++) {
      if (!state.race.choice) runRound(state);
      const w = openSubEvents(state);
      const p = w.prompts.find((x) => x.special === 'found-part');
      if (p) found = { state, p };
      else { closeChoices(state); runRound(state); }
    }
  }
  assert.ok(found, 'someone finds a part');
  const { state, p } = found;
  assert.equal(p.secret, true);
  assert.ok(p.options.some((o) => o.id === 'give' && o.needsTarget) && p.targets.length);
  assert.ok(hostScreenView(state).choice.deciders.every((d) => d.id !== p.playerId || state.race.choice.prompts.some((x) => x.playerId === d.id && !x.secret)));
  // Hide it: carried, not merged, usable later.
  assert.equal(answerPrompt(state, p.playerId, { promptId: p.id, optionId: 'hide' }).ok, true);
  closeChoices(state);
  const res = runRound(state);
  const me = state.players.find((x) => x.id === p.playerId);
  const it = carried(state, me).find((i) => i.partId === p.partId);
  assert.ok(it?.hidden && !it.merged);
  assert.ok(privateView(state, me.id).items.find((i) => i.id === it.id).usable, 'a hidden part can be held later');
  // Nothing on stream names the part or the find.
  for (const e of res.events) assert.doesNotMatch(e.text, /corpse|Left Arm|Heart|Eyes|Spine|Ears|Right Arm|Legs|Torso|Head/);
});

test('rejection: by Worthiness band; two thirds die, the rest lose it; the merge waits a round', () => {
  assert.equal(rejectionChance(80), 0);
  assert.equal(rejectionChance(65), 0.03);
  assert.equal(rejectionChance(50), 0.08);
  assert.equal(rejectionChance(30), 0.18);
  assert.equal(rejectionChance(10), 0.35);
  const out = { merged: 0, died: 0, lost: 0 };
  for (let i = 0; i < 300; i++) {
    const state = setup('rj' + i, { players: 3 });
    const a = state.players[0];
    a.worthiness = 5;
    givePart(state, a);
    const ctx = ctxOf(state, 'm' + i);
    assert.equal(processMerges(ctx).length, 0, 'not this round');
    state.race.roundNo++;
    const lines = processMerges(ctx);
    if (a.status === 'dead') {
      out.died++;
      assert.equal(lines.length, 1);
      assert.ok(PART_LINES.rejected.some((l) => l.cause === a.death.cause));
      assert.equal(a.death.secretCause, 'rejected by a corpse part');
      assert.doesNotMatch(lines[0].text, /corpse/i);
    } else if (carried(state, a).length) out.merged++;
    else out.lost++;
    if (a.status === 'dead' || !carried(state, a).length) assert.equal(state.corpse.parts[0].status, 'loose', 'back into play');
  }
  const rej = (out.died + out.lost) / 300;
  assert.ok(rej > 0.25 && rej < 0.45, `rejected ${rej}`);
  assert.ok(out.died > out.lost, 'most rejections kill');
});

test('a merge announces "deemed worthy" anonymously; a Standless holder may awaken a Stand', () => {
  let stands = 0;
  for (let i = 0; i < 40; i++) {
    const state = setup('w' + i, { players: 3 });
    const a = state.players[0];
    a.worthiness = 90;
    givePart(state, a);
    state.race.roundNo++;
    processMerges(ctxOf(state, 'w' + i));
    assert.ok(carried(state, a)[0].merged);
    if (a.stand?.source === 'corpse') { stands++; assert.notEqual(a.stand.tier, 'common', 'corpse parts never give Common'); }
    const lines = announcements(state);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].text, PART_LINES.worthy);
    assert.deepEqual(lines[0].ids, []);
    assert.deepEqual(lines[0].names, []);
  }
  assert.ok(stands > 30, 'nearly every Standless merge awakens a Stand (unless the pool is empty)');
});

test('parts change hands: killer takes from the body, a lone death drops it, the Finish Line gives loose parts to the President', () => {
  const state = setup('h1');
  const [a, b, c] = state.players;
  givePart(state, a, 0);
  killRacer(ctxOf(state), a, 'killed in a fight', b);
  assert.equal(carried(state, b).length, 1, 'the killer takes it');
  killRacer(ctxOf(state), b, 'fell', null);
  assert.equal(state.corpse.parts[0].status, 'loose');
  corpseFinishLine(ctxOf(state, 'f', 3));
  assert.equal(state.corpse.parts[0].status, 'president');
  assert.ok(presidentParts(state) >= 1);
  // An agent's kill sends it to the President.
  givePart(state, c, 4);
  killRacer(ctxOf(state), c, "killed by Valentine's agents", livingAgents(state)[0]);
  assert.equal(state.corpse.parts[4].status, 'president');
});

test('fights: search them for a part; giving up to agents never gets you killed', () => {
  const state = setup('sf');
  const [a, b] = state.players;
  givePart(state, b, 1);
  b.worthiness = 50;
  const W = a.worthiness = 50;
  const f = resolveFight(ctxOf(state, 's1'), { kind: 'strike', attacker: a, defender: b, win: 'part', defend: 'surrender' });
  assert.equal(f.outcome, 'part');
  assert.equal(carried(state, a).length, 1);
  assert.equal(a.worthiness, W + RULES.worthiness.stealPart, 'taking a part is stealing');
  assert.match(f.text, /gives up without a fight/);
  // Agents: let them search you. Holder: they take it for the President. Non-holder: hurt, alive.
  const agent = livingAgents(state)[0];
  const g = resolveFight(ctxOf(state, 's2'), { kind: 'agents', attacker: agent, defender: a, win: 'kill', defend: 'surrender' });
  assert.equal(g.outcome, 'part');
  assert.equal(a.status, 'racing');
  assert.equal(state.corpse.parts[1].status, 'president');
  const h = resolveFight(ctxOf(state, 's3'), { kind: 'agents', attacker: agent, defender: b, win: 'kill', defend: 'surrender' });
  assert.equal(h.outcome, 'searched');
  assert.equal(b.status, 'racing');
  assert.equal(f.text.includes('Heart'), false, 'the stream never names the part');
});

test('agents: holders far likelier, non-holders sometimes, joiners never', () => {
  const state = setup('ag');
  const [a, b, c] = state.players;
  givePart(state, a, 0);
  givePart(state, a, 1, { hidden: true });
  const A = RULES.agents;
  assert.equal(ambushChance(state, a), A.perHolder + A.perPart + A.perHidden);
  assert.equal(ambushChance(state, b), A.nonHolder);
  b.plan = 'corpse';
  assert.equal(ambushChance(state, b), A.nonHolder * A.huntMult);
  joinValentine(ctxOf(state, 'j', 4), c);
  givePart(state, c, 2);
  assert.equal(ambushChance(state, c), 0);
});

test('Funny Valentine: Rare+ and Worthiness 60+, never a joiner, never killable', () => {
  const state = setup('fv');
  const [a, b] = state.players;
  giveStand(ctxOf(state), a, POOL.find((s) => s.tier === 'rare'), 'arrow');
  a.worthiness = 70;
  assert.equal(canFaceValentine(a, 8), true);
  assert.equal(canFaceValentine(a, 7), false, 'Stages 8–9 only');
  a.worthiness = 55;
  assert.equal(canFaceValentine(a, 8), false);
  a.worthiness = 70;
  joinValentine(ctxOf(state, 'j', 5), a);
  assert.equal(canFaceValentine(a, 8), false, 'never a joiner');
  // He never dies, however badly he loses.
  const fv = valentineFighter();
  for (let i = 0; i < 300; i++) {
    b.status = 'racing';
    const f = resolveFight(ctxOf(state, 'v' + i, 8), { kind: 'valentine', attacker: fv, defender: b, win: 'spare', defend: 'fight-kill', bonusD: 60 });
    assert.notEqual(f.outcome, 'reversal-kill');
  }
});

test('joining Valentine: −30, an anonymous announcement, a Stand if Standless, agents leave you alone', () => {
  const state = setup('jv');
  const a = state.players[0];
  a.stand = null;
  a.worthiness = 50;
  joinValentine(ctxOf(state, 'j', 4), a);
  assert.ok(isJoiner(a));
  assert.equal(a.worthiness, 20);
  assert.equal(a.stand?.source, 'valentine');
  const lines = announcements(state);
  assert.deepEqual(lines.map((l) => l.text), [PART_LINES.darkSide]);
  assert.deepEqual(lines[0].ids, []);
  // Secret everywhere but their own phone (M6 reveals it).
  for (const v of [publicView(state), hostScreenView(state)]) assert.doesNotMatch(JSON.stringify(v), /valentine/i);
  assert.equal(privateView(state, state.players[1].id).valentine, null);
  assert.ok(privateView(state, a.id).valentine, 'their own phone knows');
  // Relay horses (reward 2) follow rules.valentine.relay.
  const plain = placementScore({ ...a, valentine: null, pace: 0, injured: false }, { terrain: [] }, new Rng('x'));
  const joined = placementScore({ ...a, pace: 0, injured: false }, { terrain: [] }, new Rng('x'));
  assert.equal(joined - plain, RULES.valentine.relay);
});

test('a Valentine errand fights masked: the stream never names the joiner', () => {
  const state = setup('er');
  const [a, b] = state.players;
  joinValentine(ctxOf(state, 'j', 4), a);
  givePart(state, b, 3);
  for (let i = 0; i < 60; i++) {
    a.status = b.status = 'racing';
    const f = resolveFight(ctxOf(state, 'e' + i, 5), {
      kind: 'errand', attacker: a, defender: b, win: 'part', defend: 'fight-spare', bonusA: 8,
      masked: true, partTo: 'president', fallback: 'horse',
    });
    assert.ok(!f.text.includes(a.name), f.text);
    if (a.stand) assert.ok(!f.text.includes(a.stand.name), 'no Stand on stream either');
    assert.match(f.text, /dark hat/);
  }
});

test('reward 5: joiners get the bonus only if the President beats every racer combined', () => {
  const state = setup('end');
  const a = state.players[0];
  joinValentine(ctxOf(state, 'j', 4), a);
  const before = a.points;
  for (const p of state.corpse.parts.slice(0, 5)) p.status = 'president';
  givePart(state, state.players[1], 5);
  valentineEnding(state);
  assert.equal(a.points, before + RULES.valentine.endingBonus);
  assert.equal(state.race.valentineEnding.triggered, true);
});

test('trading a corpse part: a gift is +15 and it merges with the receiver', () => {
  const state = setup('tp', { players: 4, humans: 4 });
  const [a, b] = state.players;
  const it = givePart(state, a, 2);
  a.worthiness = 50;
  assert.equal(offerTrade(state, a.id, { give: it.id, to: b.id }).ok, true);
  const t = state.trades[0];
  resolveTrade(ctxOf(state, 't', 3), t, true);
  assert.equal(carried(state, b)[0]?.partId, state.corpse.parts[2].id);
  assert.equal(a.worthiness, 50 + RULES.worthiness.givePart);
  assert.ok(state.race.mergeQueue.some((q) => q.id === it.id), 'it will merge with them');
});

test('whole games: every part is accounted for, once', () => {
  for (let g = 0; g < 12; g++) {
    const state = setup('wg' + g, { players: 14, humans: 3 });
    while (!state.race.over) runRound(state);
    const items = (state.items ?? []).filter((i) => i.kind === 'part');
    assert.equal(new Set(items.map((i) => i.partId)).size, items.length, 'no part held twice');
    for (const p of state.corpse.parts) {
      const held = items.some((i) => i.partId === p.id);
      assert.equal(held, p.status === 'held', `${p.id} ${p.status}`);
      assert.ok(['held', 'president'].includes(p.status), `${p.id} ends ${p.status}`);
    }
    const sum = corpseSummary(state);
    assert.equal(sum.holders.reduce((t, h) => t + h.parts.length, 0) + sum.president, 9);
    for (const it of items) assert.notEqual(state.players.find((x) => x.id === it.owner)?.status, 'dead', 'the dead hold nothing');
  }
});

// ---------------------------------------------------------------- after the first live tests
import { useItem, rollHunts } from '../js/engine/choices.js';
import { syncShown } from '../js/engine/race.js';
import { loseHorse } from '../js/engine/horses.js';
import { addItem } from '../js/engine/items.js';
import { STRIKE, RIVAL } from '../data/sub-events.js';

test('fight prompts say they are fights; A chance to strike can be declined', () => {
  assert.equal(STRIKE.options[0].id, 'leave');
  assert.match(STRIKE.options[0].label, /Don't attack/);
  for (const o of STRIKE.options.slice(1)) assert.match(o.label, /^Attack: if you win, /);
  for (const o of RIVAL.hunter) assert.match(o.label, /^Fight: if you win, /);
  for (const o of RIVAL.target.filter((x) => x.id.startsWith('fight'))) assert.match(o.label, /^Fight back: if you win, /);
});

test('Stand Arrow: piercing without a Stand always gives one or kills; a second piercing in one round keeps the Arrow', () => {
  for (let i = 0; i < 60; i++) {
    const state = setup('ar' + i, { players: 3, humans: 3 });
    const a = state.players[0];
    a.stand = null;
    addItem(state, 'arrow', a, { stage: 1 });
    addItem(state, 'arrow', a, { stage: 1 });
    openSubEvents(state);
    for (const it of state.items.filter((x) => x.owner === a.id)) assert.equal(useItem(state, a.id, it.id).ok, true);
    closeChoices(state);
    runRound(state);
    if (a.status === 'dead' && a.death.cause === 'pierced by a strange arrow') continue;
    assert.ok(a.stand, 'survived: a Stand');
    assert.equal(state.items.filter((x) => x.owner === a.id && x.kind === 'arrow').length, 1, 'the second Arrow is kept, not wasted');
  }
});

test('a joiner holding a merged part is hunted until they deliver it (+points, protection back)', () => {
  const state = setup('dl', { players: 4, humans: 4 });
  const a = state.players[0];
  joinValentine(ctxOf(state, 'j', 4), a);
  const it = givePart(state, a, 2);
  assert.equal(ambushChance(state, a), 0, 'not merged yet');
  state.race.roundNo++;
  processMerges(ctxOf(state, 'm'));
  if (!carried(state, a).length) return; // rejected (possible at low Worthiness)
  assert.ok(ambushChance(state, a) > 0, 'the President wants what you carry');
  assert.ok(a.hints.some((h) => /President wants what you carry/.test(h.text)));
  openSubEvents(state);
  assert.equal(useItem(state, a.id, it.id, 'deliver').ok, true);
  assert.equal(useItem(state, state.players[1].id, it.id, 'deliver').ok, false, 'only the owner');
  const before = a.points;
  closeChoices(state);
  runRound(state);
  assert.equal(state.corpse.parts[2].status, 'president');
  assert.ok(a.points >= before + RULES.valentine.deliverPoints);
  assert.equal(ambushChance(state, a), 0, 'protected again');
});

test('joiners on the losing side are told so (and it is kept for M6)', () => {
  const state = setup('ls');
  const a = state.players[0];
  joinValentine(ctxOf(state, 'j', 4), a);
  givePart(state, state.players[1], 0);
  valentineEnding(state);
  assert.equal(a.valentine.outcome, 'lost');
  assert.ok(a.hints.some((h) => h.text === "The President's plan failed. You rode for the losing side."));
  syncShown(state);
  assert.equal(privateView(state, a.id).valentine.outcome, 'lost');
});

test('phone alerts: your horse is dead, only after the reveal; ON FOOT names the next trader; a settling part', () => {
  const state = setup('al', { players: 3, humans: 3 });
  const a = state.players[0];
  syncShown(state);
  loseHorse(ctxOf(state, 'h', 3), a);
  assert.equal((privateView(state, a.id).race.alerts ?? []).length, 0, 'nothing before the round is revealed');
  syncShown(state);
  const al = privateView(state, a.id).race.alerts.at(-1);
  assert.equal(al.level, 'big');
  assert.equal(al.title, 'YOUR HORSE IS DEAD');
  assert.match(al.text, /next horse trader is at the start of Stage \d/);
  assert.match(privateView(state, a.id).race.nextTrader, /Stage \d/);
  a.stand = null;
  givePart(state, a, 1);
  syncShown(state);
  assert.equal(privateView(state, a.id).race.settling, true);
  assert.ok(privateView(state, a.id).race.alerts.some((x) => x.title === 'A corpse part is yours'));
  for (const v of [hostScreenView(state), publicView(state), privateView(state, state.players[1].id)]) assert.doesNotMatch(JSON.stringify(v), /HORSE IS DEAD|corpse part is yours/);
});

test('hunting: a dry stage adds pity; a find resets it', () => {
  const state = setup('hp', { players: 3, humans: 3 });
  const a = state.players[0];
  a.plan = 'corpse';
  rollHunts(state, new Rng('h1'), 2);
  rollHunts(state, new Rng('h2'), 3);
  assert.equal(a.huntPity, 1, 'stage 2 found nothing');
  state.corpse.log.push({ stage: 3, event: 'found', to: a.id });
  rollHunts(state, new Rng('h3'), 4);
  assert.equal(a.huntPity, 0);
});
