// Host choice flow, driven headlessly with a fake lobby (no network, no DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, addPlayer, applyCharacter, PHASE, privateView, choiceWaitingView } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { RaceHost } from '../js/host/race-host.js';

function fakeLobby(seed, { humans = 2, players = 8 } = {}) {
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
  state.phase = PHASE.RACING;
  const sent = [];
  return {
    state, sent,
    broadcastPublic() {}, sendPrivateAll() { sent.push('all'); }, sendPrivate(id) { sent.push(id); }, feed() {},
    onChange() {},
  };
}

/** Answer every open human prompt with its ★ option. */
function answerAll(rh, lobby) {
  for (const p of lobby.state.players.filter((x) => !x.isAI)) {
    const pr = privateView(lobby.state, p.id).prompt;
    if (!pr) continue;
    const opt = pr.options.find((o) => o.id === pr.star) ?? pr.options[0];
    rh.answer(p, { promptId: pr.id, optionId: opt.id, targetId: opt.needsTarget ? pr.targets[0].id : undefined });
  }
}

test('host choice flow: Stage 1 plan, overlap with results, early close, timing log', () => {
  const lobby = fakeLobby('host-flow-1');
  const rh = new RaceHost({ lobby, onChange: () => {} });
  try {
    rh.start();
    assert.equal(rh.windowKind, 'plan', "Stage 1's plan opens right after Start");
    assert.ok(rh.choosing, 'and the host waits on it');
    const before = choiceWaitingView(lobby.state);
    assert.equal(before.total, 8);
    assert.ok(before.answered >= 6, 'AI racers answered at once');

    // Pause: the timer stops; resume restarts it.
    rh.togglePause();
    assert.equal(rh.timerView().paused, true);
    rh.togglePause();
    assert.equal(rh.timerView().paused, false);

    // Everyone answers -> the window closes early and the round runs (or the
    // first sub-event window opens).
    answerAll(rh, lobby);
    assert.notEqual(rh.windowKind, 'plan');

    let sawOverlap = false, stages = 0, guard = 0;
    while (!lobby.state.race.over && guard++ < 2000) {
      if (rh.choosing) {
        if (guard % 3 === 0) rh.endWindow(); else answerAll(rh, lobby);
        continue;
      }
      if (rh.windowKind === 'plan' && !rh.choosing) {
        // Results are on screen and the next stage's plan is open on phones.
        sawOverlap = true;
        const card = rh.card;
        assert.ok(card.kind === 'stage' || card.kind === 'standings', `plans open during results (on ${card.kind})`);
        if (stages++ % 2 === 0) {
          // Let the timer run out during the results: "Start Stage N" just closes it.
          lobby.state.race.choiceTimer.endsAt = Date.now() - 1;
        }
      }
      if (!rh.waiting) rh.advance();
      else rh.nextRound();
    }
    assert.ok(lobby.state.race.over, 'the race finishes');
    assert.ok(sawOverlap, 'Stage Plans overlapped the results');

    const log = rh.timingExport();
    const plans = log.windows.filter((w) => w.kind === 'plan');
    assert.equal(plans.length, 9, 'one Stage Plan window per stage');
    assert.equal(plans[0].overlapMs, 0, "Stage 1's plan has no results to overlap");
    for (const w of log.windows) {
      assert.ok(w.waitMs >= 0 && w.openMs >= w.waitMs);
      assert.equal(w.answers.length, w.humans);
      assert.ok(['timer', 'host', 'answers'].includes(w.endedBy));
    }
    assert.ok(log.windows.some((w) => w.kind === 'sub'));
    assert.equal(lobby.state.race.choice, null);
  } finally {
    rh.stop();
  }
});

test('a disconnected player does not hold up the window', () => {
  const lobby = fakeLobby('host-flow-2', { humans: 2, players: 4 });
  lobby.state.players[1].connected = false;
  const rh = new RaceHost({ lobby, onChange: () => {} });
  try {
    rh.start();
    assert.ok(rh.choosing);
    answerAll(rh, lobby); // only p1 is connected
    assert.notEqual(rh.windowKind, 'plan', 'closed once every connected player answered');
    assert.equal(lobby.state.players[1].plan !== null, true, 'the away player got their ★ plan');
  } finally {
    rh.stop();
  }
});
