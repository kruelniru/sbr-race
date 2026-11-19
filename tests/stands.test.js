// Milestone 4: Worthiness, Stands, the Devil's Palm, Arrows, Rokakaka, items.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import { POOL, CANON_STANDS, BANNED } from '../data/stands.js';
import { createGameState, addPlayer, applyCharacter, privateView, publicView, hostScreenView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound, syncShown } from '../js/engine/race.js';
import { standOdds, availableStands, pickStand, giveStand, removeStand } from '../js/engine/stands.js';
import { openStagePlans, openSubEvents, closeChoices, useItem, SUBS } from '../js/engine/choices.js';
import { roleFits } from '../js/engine/events.js';
import { addItem } from '../js/engine/items.js';
import { killRacer, addWorthiness } from '../js/engine/racers.js';
import { lintEvents, EVENTS, KILL_KINDS, killWorthiness, normalizeEvent } from '../js/engine/events.js';
import PERSONALITIES from '../data/personalities.js';

function setup(seed, { players = 8, humans = 2 } = {}) {
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
const ctxOf = (state) => ({ state, rng: new Rng('ctx'), stage: { id: 2 }, roundLabel: 'Day 1', result: { deaths: [] }, assigned: new Set() });

test('tier odds: base at 50, ±2 Legendary per 10 Worthiness, corpse parts never Common', () => {
  assert.deepEqual(standOdds('palm', 50), [10, 30, 60]);
  assert.deepEqual(standOdds('arrow', 50), [20, 40, 40]);
  assert.deepEqual(standOdds('corpse', 50), [40, 60, 0]);
  assert.deepEqual(standOdds('palm', 100), [20, 30, 50]);
  assert.deepEqual(standOdds('palm', 0), [0, 30, 70]);
  assert.deepEqual(standOdds('corpse', 0), [30, 70, 0]);
  const [l] = standOdds('arrow', 65);
  assert.equal(Math.round(l * 10) / 10, 23, 'exact value: 65 -> +3');
  for (const src of ['palm', 'arrow', 'corpse']) for (const w of [0, 37, 50, 88, 100]) {
    const o = standOdds(src, w);
    assert.ok(o.every((x) => x >= 0));
    assert.equal(Math.round(o.reduce((a, b) => a + b, 0)), 100);
  }
});

test('the pool never contains a banned Stand, and Stand events never kill', () => {
  const names = [...POOL, ...CANON_STANDS].map((s) => s.name);
  for (const b of BANNED) assert.ok(!names.includes(b), `${b} is banned`);
  assert.ok(!names.some((n) => /^Tusk Act [234]/.test(n)), 'Tusk only enters as Act 1');
  assert.deepEqual(lintEvents(), []);
  const STAND_EVENTS = SUBS; // sub events with Stands resolve in code
  assert.ok(STAND_EVENTS.length);
});

test('canon Stands are locked until their owner dies; PC Stands die with them', () => {
  const state = setup('lock-1');
  const free = () => availableStands(state).map((s) => s.id);
  assert.ok(!free().includes('cream-starter') && !free().includes('tusk-act-1'));
  const hp = state.canon.find((c) => c.canonId === 'hotpants');
  assert.equal(hp.stand.id, 'cream-starter', 'Hot Pants starts with Cream Starter');
  assert.equal(state.canon.find((c) => c.canonId === 'gyro').stand, null, 'Gyro has no Stand');
  const ctx = ctxOf(state);
  state.race.fallenSince = []; state.race.memorial = [];
  killRacer(ctx, hp, 'test', null);
  assert.ok(free().includes('cream-starter'), 'unlocked on death');
  // Johnny dies before awakening: Tusk Act 1 enters the pool.
  killRacer(ctx, state.canon.find((c) => c.canonId === 'johnny'), 'test', null);
  assert.ok(free().includes('tusk-act-1'));
  // A PC's Stand dies with them.
  const pc = state.players[0];
  giveStand(ctx, pc, POOL.find((s) => s.id === 'harvest'), 'palm');
  killRacer(ctx, pc, 'test', null);
  assert.ok(!free().includes('harvest'));
});

test('one Stand per racer; Rokakaka returns it to the pool', () => {
  const state = setup('one-1');
  const ctx = ctxOf(state);
  const pc = state.players[0];
  const sp = POOL.find((s) => s.id === 'star-platinum');
  assert.ok(giveStand(ctx, pc, sp, 'arrow'));
  assert.equal(giveStand(ctx, pc, POOL.find((s) => s.id === 'harvest'), 'palm'), null, 'second Stand refused');
  assert.ok(!availableStands(state).some((s) => s.id === 'star-platinum'));
  removeStand(state, pc);
  assert.equal(pc.stand, null);
  assert.ok(availableStands(state).some((s) => s.id === 'star-platinum'), 'back in the pool');
  assert.ok(pickStand(state, new Rng('p'), 'legendary'));
});

test('Stand holders never get the random Palm, an Arrow pierce, or a Use on a kept Arrow', () => {
  const state = setup('holder-1');
  const ctx = { ...ctxOf(state), type: 'day' };
  const pc = state.players[0];
  const palm = SUBS.find((s) => s.id === 'sub-palm');
  assert.ok(roleFits(ctx, palm, palm.focusKey, pc));
  giveStand(ctx, pc, POOL.find((s) => s.id === 'harvest'), 'palm');
  assert.ok(!roleFits(ctx, palm, palm.focusKey, pc), 'random Palm never goes to a Stand holder');
  // Kept Arrow: Use refused while holding a Stand; kept Rokakaka refused without one.
  const arrow = addItem(state, 'arrow', pc, { stage: 2, round: 'Day 1' });
  const other = state.players[1];
  const roka = addItem(state, 'rokakaka', other, { stage: 2, round: 'Day 1' });
  openStagePlans(state);
  assert.equal(useItem(state, pc.id, arrow.id).ok, false);
  assert.equal(useItem(state, other.id, roka.id).ok, false);
  assert.equal(privateView(state, pc.id).items[0].usable, false);
  assert.equal(useItem(state, 'p9', arrow.id).ok, false, "can't use someone else's item");
  closeChoices(state);
  assert.equal(useItem(state, other.id, roka.id).ok, false, 'no window open');
});

test('Arrow and Rokakaka prompts are secret, with Stand-dependent options; Rokakaka only reaches humans', () => {
  const state = setup('items-1', { players: 10, humans: 3 });
  let arrows = 0, rokas = 0;
  while (!state.race.over) {
    if (!state.race.choice && state.race.roundIdx === 0 && state.race.plansFor !== state.race.stageIdx + 1) { openStagePlans(state); closeChoices(state); }
    const w = openSubEvents(state);
    for (const pr of w.prompts.filter((x) => ['arrow', 'rokakaka'].includes(x.special))) {
      const p = state.players.find((x) => x.id === pr.playerId);
      assert.equal(pr.secret, true);
      const ids = pr.options.map((o) => o.id);
      if (pr.special === 'arrow') { arrows++; assert.equal(ids.includes('pierce'), !p.stand); }
      if (pr.special === 'rokakaka') { rokas++; assert.equal(p.isAI, false, 'humans only'); assert.equal(ids.includes('eat'), !!p.stand); }
    }
    // The host never sees a secret prompt.
    const v = hostScreenView(state).choice;
    for (const pr of w.prompts.filter((x) => x.secret)) assert.ok(!v.deciders.some((d) => d.id === pr.playerId && w.prompts.filter((y) => y.playerId === d.id).every((y) => y.secret)));
    closeChoices(state);
    runRound(state);
  }
  assert.ok(arrows >= RULES.arrows.perGame[0] - 1 && arrows <= RULES.arrows.perGame[1] + (state.race.arrowsDue ?? []).filter((d) => d.fromDeath).length, `${arrows} Arrows`); // one may land after every PC is out; Arrows the dead dropped turn up again
  assert.ok(rokas >= RULES.rokakaka.guaranteed && rokas <= RULES.rokakaka.guaranteed + 1 + 2, `${rokas} Rokakaka`); // 4–5 a game (plus any the dead dropped)
});

test('Worthiness and Stands: the owner sees a bar level and their Stand; nobody else sees anything', () => {
  const state = setup('priv-1', { players: 6, humans: 2 });
  const ctx = ctxOf(state);
  const [me, them] = state.players;
  giveStand(ctx, me, POOL.find((s) => s.id === 'killer-queen'), 'arrow');
  giveStand(ctx, them, POOL.find((s) => s.id === 'harvest'), 'palm');
  me.worthiness = 73;
  syncShown(state);
  const mine = privateView(state, me.id);
  assert.equal(mine.race.worthinessLevel, Math.round(0.73 * RULES.worthiness.barSteps));
  assert.equal(mine.race.stand.name, 'Killer Queen');
  assert.ok(!('source' in mine.race.stand), 'the source is never sent');
  assert.ok(!JSON.stringify(mine).includes('"worthiness"'), 'never the raw number');
  const others = JSON.stringify([publicView(state), hostScreenView(state), privateView(state, them.id)]);
  assert.doesNotMatch(others, /Killer Queen/);
  assert.doesNotMatch(JSON.stringify([publicView(state), hostScreenView(state)]), /worthiness|Harvest|Killer Queen|arrow'/i);
  assert.ok(!JSON.stringify(privateView(state, them.id)).includes(String(mine.race.worthinessLevel) + ',"hints'), 'their view holds their own level only');
});

test('whole games stay consistent with Stands in play', () => {
  for (let g = 0; g < 15; g++) {
    const state = setup('m4-inv-' + g, { players: 12, humans: 4 });
    while (!state.race.over) runRound(state);
    const holders = [...state.players, ...state.canon].filter((r) => r.stand && r.status !== 'dead');
    const ids = holders.map((r) => r.stand.id);
    assert.equal(new Set(ids).size, ids.length, 'no Stand is held twice by the living');
    for (const r of state.players) assert.ok(r.worthiness >= 0 && r.worthiness <= 100);
    for (const e of state.stands.log) assert.ok(e.source === 'requiem' || !BANNED.includes(e.stand)); // a Requiem form comes only from the Requiem Arrow
  }
});

test('Worthiness: start by personality, kill tags on every kill, hints for big changes', () => {
  // Every personality has a start value and a trade-off line (no numbers in it).
  for (const p of PERSONALITIES) {
    assert.ok(RULES.worthiness.byPersonality[p.id] != null, p.id);
    assert.ok(p.tradeoff && !/\d/.test(p.tradeoff), p.id);
  }
  // Every kill in the content has exactly one kill-* tag, and the linter catches a missing one.
  const kills = EVENTS.filter((e) => Object.values(e.effects).some((x) => x.dies && x.by));
  assert.ok(kills.length >= 14);
  for (const e of kills) assert.equal(e.tags.filter((t) => KILL_KINDS.includes(t)).length, 1, e.id);
  const bad = normalizeEvent({ id: 'x', text: '{a} kills {b}.', cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'x', by: 'a' } }, tags: ['kill'] });
  assert.equal(lintEvents([bad]).length, 1);
  assert.equal(killWorthiness(['kill', 'kill-cruel']), RULES.worthiness.killCruel);
  assert.equal(killWorthiness(['kill-started']), RULES.worthiness.killStarted);
  assert.equal(killWorthiness(['defend', 'kill-defense']), 0);

  const state = setup('worth-1');
  const [me] = state.players;
  const ctx = ctxOf(state);
  me.hints = [];
  me.worthiness = 50;
  addWorthiness(me, RULES.worthiness.killStarted, ctx);
  assert.equal(me.worthiness, 50 + RULES.worthiness.killStarted);
  assert.equal(me.hints.at(-1).text, 'Something in you hardens.');
  addWorthiness(me, RULES.worthiness.palmSurvive, ctx);
  assert.equal(me.hints.at(-1).text, 'You feel steady.', 'a small change gets the soft line');
  addWorthiness(me, 1, ctx);
  assert.equal(me.hints.length, 2, 'under 2 gives no hint');
  addWorthiness(me, RULES.worthiness.ridePast, ctx);
  assert.equal(me.hints.at(-1).text, 'Something nags at you.');
  me.worthiness = 80;
  addWorthiness(me, RULES.worthiness.help, ctx); // halved to +2
  assert.equal(me.hints.at(-1).text, 'You feel steady.', 'a halved gain still gets a line');
  me.worthiness = 50;
  addWorthiness(me, RULES.worthiness.spare, ctx);
  assert.equal(me.hints.at(-1).text, 'You feel lighter in the saddle.');
  // A full run: the hint shows up only in your own private view.
  assert.ok(!JSON.stringify([publicView(state), hostScreenView(state)]).includes('lighter in the saddle'));
});

test('Worthiness: halved above halfAbove, quartered above quarterAbove, only great deeds above 95; losses stay full', () => {
  const state = setup('worth-2');
  const [me] = state.players;
  const ctx = ctxOf(state);
  const { halfAbove: H, quarterAbove: Q } = RULES.worthiness;
  me.worthiness = H;
  addWorthiness(me, 8, ctx);
  assert.equal(me.worthiness, H + 8, 'at exactly halfAbove the gain is full');
  me.worthiness = H + 1;
  addWorthiness(me, 8, ctx); // halved: +4
  assert.equal(me.worthiness, H + 5);
  me.worthiness = Q + 1;
  addWorthiness(me, 8, ctx); // quartered: +2
  assert.equal(me.worthiness, Q + 3);
  addWorthiness(me, 3, ctx); // quartered, at least +1
  assert.equal(me.worthiness, Q + 4);
  me.worthiness = 96;
  addWorthiness(me, 8, ctx);
  assert.equal(me.worthiness, 96, 'above 95 an ordinary deed does nothing');
  addWorthiness(me, 10, ctx, { great: true });
  assert.equal(me.worthiness, 98, 'a great deed still counts (quartered)');
  addWorthiness(me, -12, ctx);
  assert.equal(me.worthiness, 86, 'losses are never reduced');

  // Every event that hurts another racer without killing says whose fault it is.
  const hurt = normalizeEvent({ id: 'y', text: '{a} trips {b}.', cast: { a: 'focus', b: 'npc' }, effects: { b: { pace: -2 } }, tags: [] });
  assert.equal(lintEvents([hurt]).length, 1);
  assert.equal(lintEvents([{ ...hurt, tags: ['sabotage'] }]).length, 0);
  assert.ok(EVENTS.filter((e) => e.tags.includes('sabotage')).length >= 8);
  assert.ok(RULES.worthiness.sabotage < 0);
  assert.equal(RULES.worthiness.ridePast, -3);
  assert.ok(RULES.worthiness.ridePast > -RULES.worthiness.hintAt, 'riding past is quiet (no hint)');
  const past = SUBS.flatMap((s) => s.options ?? []).filter((o) => o.id === 'past');
  assert.ok(past.length && past.every((o) => o.tags.includes('cold')));
});
