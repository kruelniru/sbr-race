// Milestone 7d: more events, alternatives and a per-game line cap, Funny
// Valentine on stream, more recruitment pitches, and joiners' talks with him.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RULES from '../data/rules.js';
import CANON from '../data/canon-racers.js';
import { ALL_STANDS } from '../data/stands.js';
import { VALENTINE_OFFER, PRESIDENT_TALK } from '../data/sub-events.js';
import { createGameState, addPlayer, applyCharacter, hostScreenView, privateView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound, syncShown } from '../js/engine/race.js';
import { openSubEvents, closeChoices, answerPrompt, openStagePlans, needsStagePlans } from '../js/engine/choices.js';
import { EVENTS, PRESIDENT_EVENTS, lintEvents } from '../js/engine/events.js';
import { joinValentine } from '../js/engine/valentine.js';
import { buildGameLog } from '../js/engine/game-log.js';
import { storyFor } from '../js/engine/secrets.js';

function setup(seed, { players = 18, humans = 5 } = {}) {
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
const ctxOf = (state, stage = 4) => ({ state, rng: new Rng('c'), stage: { id: stage }, roundLabel: 'Day 1', result: { deaths: [] } });

test('the same event line at most 3 times a game; alternatives share the load', () => {
  for (let g = 0; g < 8; g++) {
    const state = setup('cap' + g);
    const uses = {};
    while (!state.race.over) {
      for (const e of runRound(state).events) {
        if (e.variant == null) continue;
        const k = `${e.eventId}#${e.variant}`;
        uses[k] = (uses[k] ?? 0) + 1;
      }
    }
    for (const [k, n] of Object.entries(uses)) assert.ok(n <= RULES.lineCap, `${k} used ${n} times`);
    assert.ok(Object.keys(uses).some((k) => k.startsWith('common-good-rhythm#') && !k.endsWith('#0')), 'an alternative shows up');
  }
  assert.deepEqual(lintEvents([...EVENTS, ...PRESIDENT_EVENTS]), []);
  const withAlts = EVENTS.filter((e) => e.texts.length >= 5);
  assert.ok(withAlts.length >= 15, `${withAlts.length} lines have 5+ versions`);
});

test('every canon racer has at least 2 moments of their own; every Stand has an event', () => {
  const count = {};
  for (const e of EVENTS) for (const c of Object.values(e.cast)) for (const id of [].concat(c.canon ?? [])) count[id] = (count[id] ?? 0) + 1;
  for (const c of CANON) assert.ok((count[c.id] ?? 0) >= 2, `${c.name}: ${count[c.id] ?? 0}`);
  assert.ok(count.hotpants >= 11, 'Hot Pants: four more');
  const stands = new Set(EVENTS.flatMap((e) => Object.values(e.cast).map((c) => c.stand)).filter(Boolean));
  for (const s of ALL_STANDS) assert.ok(stands.has(s.id), `${s.name} has an event`);
  for (let st = 1; st <= 9; st++) assert.ok(EVENTS.filter((e) => e.id.startsWith(`s${st}-`)).length >= 6, `Stage ${st}`);
});

test('Funny Valentine on stream: 2–3 scenes a band, his badge, early then late, never a joiner beside him', () => {
  for (const e of PRESIDENT_EVENTS) {
    assert.match(e.text, /Funny Valentine/, e.id);
    for (const [k, c] of Object.entries(e.cast)) if (k !== e.focusKey) assert.equal(c.is, 'npc', `${e.id}: only NPCs are seen with him`);
    if (e.band !== 'late') assert.doesNotMatch(e.text, /scar|lean,/, `${e.id}: early design`);
    if (e.band === 'late') assert.doesNotMatch(e.text, /heavyset|jovial|round-faced/, `${e.id}: late design`);
  }
  for (let g = 0; g < 6; g++) {
    const state = setup('fv' + g);
    const bands = { early: 0, mid: 0, late: 0 };
    while (!state.race.over) {
      const res = runRound(state);
      for (const e of res.events.filter((x) => x.tags?.includes('president'))) {
        const band = PRESIDENT_EVENTS.find((x) => x.id === e.eventId).band;
        bands[band]++;
        const late = res.stage.id >= RULES.president.lateFrom;
        assert.deepEqual(e.faces, [late ? 'fv:late' : 'fv:early']);
        assert.ok(e.names.some((n) => n.name === 'Funny Valentine'));
        assert.ok(band === 'early' ? res.stage.id <= 3 : band === 'mid' ? res.stage.id >= 4 && res.stage.id <= 6 : res.stage.id >= 7);
      }
    }
    for (const [b, n] of Object.entries(bands)) assert.ok(n >= 1 && n <= 3, `${b}: ${n}`);
  }
});

test("Valentine's offer: the pitches rotate; in Stage 6 the President asks in person", () => {
  const texts = new Set(VALENTINE_OFFER.pitches.flatMap((p) => [p.text, p.runner]));
  let seen = 0, inPerson = 0;
  for (let g = 0; g < 10; g++) {
    const state = setup('offer' + g);
    const got = [];
    while (!state.race.over) {
      if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
      const w = openSubEvents(state);
      for (const p of w.prompts.filter((x) => x.special === 'valentine-offer')) {
        seen++;
        if (state.race.stageIdx + 1 === 6) { inPerson++; assert.equal(p.title, 'The President'); assert.match(p.text, /Funny Valentine himself/); }
        else { assert.ok(texts.has(p.text)); got.push(p.text.slice(0, 40)); }
        assert.equal(p.secret, true);
      }
      closeChoices(state);
      runRound(state);
    }
    // No pitch twice until every pitch has been used (Runners share a pitch's slot).
    const ix = (state.race.offerLog ?? []).filter((x) => x.pitch !== 'in-person').map((x) => x.pitch);
    for (let i = 0; i < ix.length; i++) {
      const round = Math.floor(i / VALENTINE_OFFER.pitches.length);
      const slice = ix.slice(round * VALENTINE_OFFER.pitches.length, (round + 1) * VALENTINE_OFFER.pitches.length);
      assert.equal(new Set(slice).size, slice.length, 'no repeat before all are used');
    }
  }
  assert.ok(seen && inPerson, `${seen} offers, ${inPerson} in person`);
});

test('a word with the President: 2–3 secret talks, spread out, with their effects; in the story and the log', () => {
  // A game where the joiner lives to the end (deaths depend on the seed).
  let state, p;
  for (let g = 0; g < 20; g++) {
    state = setup('talk' + g, { players: 8, humans: 8 });
    p = state.players[0];
    while (state.race.stageIdx < 3) runRound(state);
    if (p.status === 'racing') break;
  }
  joinValentine({ ...ctxOf(state, 4), rng: new Rng('j') }, p);
  const picks = ['swear', 'corpse', 'more'];
  const at = [];
  while (!state.race.over) {
    if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
    const w = openSubEvents(state);
    const pr = w.prompts.find((x) => x.special === 'president-talk' && x.playerId === p.id);
    if (pr) {
      assert.equal(pr.secret, true);
      assert.ok(pr.options.length === 3);
      assert.ok(PRESIDENT_TALK.openers[pr.tone].includes(pr.text));
      assert.ok(!JSON.stringify(hostScreenView(state)).includes(pr.text), 'never on the host');
      const pick = picks.find((k) => pr.options.some((o) => o.id === k));
      answerPrompt(state, p.id, { promptId: pr.id, optionId: pick });
      picks.splice(picks.indexOf(pick), 1);
      at.push(state.race.roundNo + 1);
    }
    closeChoices(state);
    const res = runRound(state);
    assert.ok(!res.events.some((e) => /President/.test(e.text) && e.ids.includes(p.id) && !e.tags?.includes('president')), 'nothing on stream');
  }
  assert.ok(at.length <= 3 && (at.length >= 2 || p.status === 'dead'), `${at.length} talks`);
  if (!at.length) { assert.notEqual(p.status, 'racing', 'only a joiner who fell early misses them'); return; }
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 2, 'never two in a row');
  const talks = state.race.valentineTalks.filter((x) => x.id === p.id);
  if (talks.some((t) => t.topic === 'swear')) { assert.equal(p.valentine.rightHand, true); assert.ok(p.wLog.some((x) => x.change === RULES.valentine.talk.swearWorthiness), 'Worthiness drops a little'); }
  if (talks.some((t) => t.topic === 'more')) assert.ok(p.valentine.trust < 0);
  if (talks.some((t) => t.topic === 'corpse')) assert.ok(p.valentine.partTip);
  const replies = Object.values(PRESIDENT_TALK.replies).flatMap((r) => Object.values(r)).map((t) => t.split('{place}')[0]);
  assert.ok(p.hints.some((h) => replies.some((r) => h.text.startsWith(r))), 'his reply reaches the phone');
  syncShown(state);
  assert.ok(storyFor(state, p).lines.some((l) => /a word with the President/.test(l)));
  assert.equal(buildGameLog(state).secret.valentineTalks.filter((x) => x.id === p.name).length, talks.length);
  const other = state.players.find((x) => !x.valentine?.joined);
  if (other) assert.ok(!JSON.stringify(privateView(state, other.id)).includes('a word with the President'), 'only the joiner knows');
});
