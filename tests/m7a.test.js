// Milestone 7a: fixes from the first real game nights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, addPlayer, applyCharacter, privateView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound, syncShown } from '../js/engine/race.js';
import { openSubEvents, closeChoices, openStagePlans, needsStagePlans } from '../js/engine/choices.js';
import { offerTrade, resolveTrade, tradeTargets } from '../js/engine/trades.js';
import { addItem } from '../js/engine/items.js';
import { killRacer } from '../js/engine/racers.js';
import { announcements } from '../js/engine/corpse.js';
import { compareRacers } from '../js/engine/placement.js';
import { buildFinale } from '../js/engine/finale.js';
import { buildGameLog } from '../js/engine/game-log.js';

function setup(seed, { players = 8, humans = 8, mount = null } = {}) {
  const state = createGameState(seed);
  const rng = new Rng(seed + ':roster');
  const taken = new Set();
  for (let i = 0; i < players; i++) {
    const p = addPlayer(state, { isAI: i >= humans });
    p.connected = true;
    const c = makeAiCharacter(rng, taken);
    if (mount) c.mount = mount;
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  startRace(state);
  return state;
}
const ctx = (state, stage = 4) => ({ state, rng: new Rng('k'), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] } });

test('Runners never get horse wording about themselves (whole games full of Runners)', () => {
  const OWN = /\b(saddle\w*|stirrups?|spurs?|gallop\w*|reins|fresh horses|relay horses)\b/i; // (an ally's fallen horse is theirs: the template test covers whose horse)
  for (let g = 0; g < 12; g++) {
    const state = setup('runners' + g, { players: 14, humans: 7, mount: 'runner' });
    const runners = new Set(state.players.map((p) => p.id));
    while (!state.race.over) {
      if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
      const w = openSubEvents(state);
      for (const p of w.prompts.filter((x) => runners.has(x.playerId))) {
        const me = state.players.find((x) => x.id === p.playerId);
        assert.doesNotMatch(`${p.text} ${p.options.map((o) => `${o.label} ${o.hint}`).join(' ')}`, OWN, `${me.name} (Runner) got: ${p.title}: ${p.text}`);
      }
      closeChoices(state);
      runRound(state);
    }
  }
});

test("events a Runner can be the focus of never mention the focus's own horse", async () => {
  const { default: E } = await import('../data/events/index.js');
  for (const e of E) {
    const [k, c] = Object.entries(e.cast).find(([, x]) => (typeof x === 'string' ? x : x.is) === 'focus');
    const spec = typeof c === 'string' ? {} : c;
    if (spec.hasHorse || spec.mount === 'horse' || spec.canon) continue; // Riders (or a specific canon racer) only
    const own = new RegExp(`\\{${k}\\.(horse|steed)\\}|\\{${k}\\.their\\} (saddle|stirrup|horse|reins)|saddle-sore|\\{${k}\\} (gallops|spurs|rides double)`);
    assert.doesNotMatch(e.text, own, `${e.id}: ${e.text}`);
  }
});

test('trades: never a horse from or to a Runner, never the same thing back; a failed trade tells both', () => {
  const state = setup('trade', { players: 4, humans: 4 });
  const [a, b, c] = state.players;
  b.mount = 'runner'; b.horse = null;
  a.onFoot = true;
  const roka = addItem(state, 'rokakaka', a, {});
  assert.equal(tradeTargets(state, a, 'item').find((t) => t.id === b.id).hasHorse, false);
  assert.equal(offerTrade(state, a.id, { give: roka.id, to: b.id, ask: 'horse' }).ok, false, 'a Runner has no horse');
  assert.equal(offerTrade(state, a.id, { give: roka.id, to: c.id, ask: 'rokakaka' }).ok, false, 'not the same thing back');
  assert.equal(offerTrade(state, a.id, { give: roka.id, to: c.id, ask: 'arrow' }).ok, true);
  const t = state.trades.at(-1);
  resolveTrade(ctx(state), t, true); // c has no Arrow: it falls through
  syncShown(state);
  for (const p of [a, c]) assert.ok(privateView(state, p.id).race.alerts.some((x) => x.title === 'The trade fell through'));
  assert.ok(!JSON.stringify(privateView(state, a.id).race.alerts).includes('Arrow'), 'never why');
});

test('announcements: once per round each', () => {
  const state = setup('ann');
  state.corpse.announce.push('Someone has been deemed worthy of the Saint.', 'Someone has been deemed worthy of the Saint.', 'Someone has fallen to the dark side.', 'Someone has been deemed worthy of the Saint.');
  assert.deepEqual(announcements(state).map((l) => l.text), ['Someone has been deemed worthy of the Saint.', 'Someone has fallen to the dark side.']);
});

test('ties: stage wins, then the Final Stage, then a PC; the podium says so', () => {
  const pc = { tier: 'pc', points: 495, stageWins: 1, lastStageRank: { stage: 9, rank: 4 } };
  const canon = { tier: 'canon', points: 495, stageWins: 2, lastStageRank: { stage: 9, rank: 9 } };
  assert.ok(compareRacers(canon, pc) < 0, 'more stage wins first');
  canon.stageWins = 1;
  assert.ok(compareRacers(pc, canon) < 0, 'then the Final Stage');
  canon.lastStageRank.rank = 4;
  assert.ok(compareRacers(pc, canon) < 0, 'then a PC');
  const state = setup('tie');
  while (!state.race.over) runRound(state);
  const [x, y] = [state.players[0], state.canon[0]];
  for (const r of [...state.players, ...state.canon]) r.points = 0;
  Object.assign(x, { status: 'racing', points: 900, stageWins: 1 });
  Object.assign(y, { status: 'racing', points: 900, stageWins: 3 });
  state.race.ending = { id: 'normal' }; // (a seed can end in a secret ending, which wins outright)
  const f = buildFinale(state);
  assert.equal(f.podium[0].id, y.id);
  assert.equal(f.podium[0].tieBroken, 'stage wins');
});

test('items on death: a PC killer takes them; otherwise they drop and turn up later', () => {
  const state = setup('items', { players: 6, humans: 4 });
  const [a, b, c] = state.players;
  const ai = state.players.find((p) => p.isAI);
  addItem(state, 'arrow', a, {}); addItem(state, 'rokakaka', a, {});
  killRacer(ctx(state), a, 'killed', b);
  assert.equal(state.items.filter((i) => i.owner === b.id).length, 2, 'a human killer takes both');
  addItem(state, 'rokakaka', c, {}); addItem(state, 'arrow', c, {});
  const due = (state.race.rokakakaDue ?? []).length;
  killRacer(ctx(state), c, 'killed', ai);
  assert.equal(state.items.filter((i) => i.owner === ai.id && i.kind === 'arrow').length, 1, 'an AI PC killer takes the Arrow');
  assert.equal(state.items.some((i) => i.kind === 'rokakaka' && i.owner === ai.id), false, '...never a Rokakaka');
  assert.equal(state.race.rokakakaDue.length, due + 1, 'the Rokakaka turns up again later');
  assert.ok(state.race.itemLog.length === 4);
  state.race.over = true;
  assert.equal(buildGameLog(state).secret.itemsFromTheDead.length, 4);
});
