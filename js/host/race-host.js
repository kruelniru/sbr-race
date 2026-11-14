// Host-side race controller: runs rounds through the engine, then walks the
// host through the reveal one card at a time (auto-advancing by default).
//
// - Phones get each line in their mini feed as it's revealed on the stream,
//   and their private status once the round's reveal has finished.
// - Back/Next can step through earlier cards and earlier rounds. That's
//   view-only: it never changes the game or re-sends anything to phones.
// - Side Stories can be skipped (button) or skipped automatically (setting).
//   Skipped cards still go to the phone feed.
//
// - Choices (milestone 3): before each round the host opens a choice window
//   (sub events), and phones answer while the host shows "X has a decision
//   to make...". Stage Plans open when the stage results card appears, so
//   players choose while the results and standings are up; "Start Stage N"
//   then waits only for whatever time is left. A window closes when its timer
//   runs out, the host ends it, or every connected player has answered.
//   Unanswered players get their ★ option.
// - Every closed window is logged (state.race.timingLog) so real choice
//   times can be exported and replayed in the sim (--choice-times).
//
// Reveal state lives in state.race (reveal + history + choice timer) so a
// host reload resumes mid-round, even mid-choice.

import { startRace, runRound, syncShown, nextRoundHeader } from '../engine/race.js';
import { buildCards, cardSeconds } from '../engine/reveal.js';
import { needsStagePlans, openStagePlans, openSubEvents, closeChoices, answerPrompt } from '../engine/choices.js';
import { getPlayer } from '../engine/state.js';

export class RaceHost {
  /**
   * @param {object} opts
   * @param {import('./lobby.js').HostLobby} opts.lobby
   * @param {() => void} opts.onChange   re-render + save
   */
  constructor({ lobby, onChange }) {
    this.lobby = lobby;
    this.state = lobby.state;
    this.onChange = onChange;
    this.auto = false; // paused by default: the host clicks Next (Auto is a toggle)
    this.timer = null;
    this.cursor = null; // { r, i } while looking back; null = live
    this.onTick = null; // host-main: refresh countdowns without a full re-render
    this.ticker = setInterval(() => this.#tick(), 250);
    lobby.onChoice = (player, m) => this.answer(player, m);
    lobby.timerView = () => this.timerView();
  }

  get race() { return this.state.race; }
  get settings() { return this.state.settings; }
  get reveal() { return this.race?.reveal ?? null; }

  /** Every round's reveal so far, oldest first; the last one is live. */
  get rounds() {
    return this.reveal ? [...(this.race.history ?? []), this.reveal] : [];
  }

  get livePos() {
    return { r: this.rounds.length - 1, i: this.reveal?.index ?? -1 };
  }

  get viewing() {
    return this.cursor !== null;
  }

  /** The card on screen (live, or the one we stepped back to). */
  get card() {
    const pos = this.cursor ?? this.livePos;
    return this.rounds[pos.r]?.cards[pos.i] ?? null;
  }

  /** The round the on-screen card belongs to: { stage, label, type, roundNo }. */
  get cardRound() {
    const pos = this.cursor ?? this.livePos;
    return this.rounds[pos.r]?.meta ?? null;
  }

  /** Live reveal finished; waiting for "Start next round/stage". */
  get waiting() {
    const r = this.reveal;
    return !r || r.index >= r.cards.length - 1;
  }

  /** The host is waiting on a choice window (shows the waiting screen). */
  get choosing() {
    return !!this.race?.choosing && this.#windowOpen();
  }

  /** Is the live card a Side Story (shows the Skip button)? */
  get onSideStory() {
    return !this.viewing && !!this.card?.side;
  }

  // ------------------------------------------------------------ flow

  start() {
    startRace(this.state);
    syncShown(this.state);
    this.lobby.broadcastPublic();
    this.lobby.sendPrivateAll();
    this.nextRound(); // Stage 1's plan opens right away
  }

  /** After a host reload: pick up where the reveal left off. */
  resume() {
    if (!this.race) return;
    this.lobby.sendPrivateAll();
    this.schedule();
  }

  /**
   * The host's "go on" (and auto-advance): finish any open choice window,
   * open this round's sub events, wait for answers, then run the round.
   */
  nextRound() {
    if (this.race.over) return;
    clearTimeout(this.timer);
    this.cursor = null;
    const race = this.race;
    if (!race.choice && needsStagePlans(this.state)) this.#openWindow('plan');
    if (race.choice?.kind === 'plan') {
      if (!this.#windowDone()) return this.#wait();
      this.#closeWindow();
    }
    if (!race.choice) this.#openWindow('sub');
    if (race.choice && !race.choice.closed) {
      if (!this.#windowDone()) return this.#wait();
      this.#closeWindow();
    }
    race.choosing = false;
    this.#runRound();
  }

  #runRound() {
    if (this.reveal) (this.race.history ??= []).push(this.reveal);
    const result = runRound(this.state);
    this.race.reveal = {
      cards: buildCards(result),
      index: -1,
      meta: { roundNo: result.roundNo, stage: result.stage, label: result.label, type: result.type },
      stageEnd: result.lastRoundOfStage,
      over: result.over,
    };
    this.advance();
  }

  /** Show the next live card (auto-skipping Side Stories if that's on). */
  advance() {
    clearTimeout(this.timer);
    const r = this.reveal;
    if (!r) return;
    do {
      if (r.index >= r.cards.length - 1) break;
      r.index++;
      this.#reveal(r.cards[r.index]);
    } while (this.settings.autoSkipSide && r.cards[r.index].side && r.index < r.cards.length - 1);
    if (r.index === r.cards.length - 1) this.#roundRevealed();
    this.onChange();
    this.schedule();
  }

  /** "Skip side stories": jump past the Side Story cards in this round. */
  skipSide() {
    const r = this.reveal;
    if (!r || this.viewing) return;
    clearTimeout(this.timer);
    const last = r.cards.length - 1;
    const wasAtEnd = r.index === last;
    // Step past every Side Story card (they still reach the phone feed).
    while (r.cards[r.index]?.side && r.index < last) {
      r.index++;
      this.#reveal(r.cards[r.index]);
    }
    if (r.index === last && !wasAtEnd) this.#roundRevealed();
    // A Side Story was the round's last card: carry straight on.
    if (r.cards[r.index].side && !r.stageEnd && !r.over) return this.nextRound();
    this.onChange();
    this.schedule();
  }

  // ------------------------------------------------------------ looking back

  /** Step back one card (into earlier rounds too). View-only. */
  back() {
    const rounds = this.rounds;
    let { r, i } = this.cursor ?? this.livePos;
    do {
      i--;
      if (i < 0) {
        r--;
        if (r < 0) return;
        i = rounds[r].cards.length - 1;
      }
    } while (this.settings.autoSkipSide && rounds[r].cards[i].side);
    clearTimeout(this.timer);
    this.cursor = { r, i };
    this.onChange();
  }

  /** Next ▸ : forward through history, or reveal the next live card. */
  next() {
    if (!this.viewing) return this.advance();
    const rounds = this.rounds;
    const live = this.livePos;
    let { r, i } = this.cursor;
    do {
      i++;
      if (i >= rounds[r].cards.length) { r++; i = 0; }
    } while (this.settings.autoSkipSide && (r < live.r || i < live.i) && rounds[r].cards[i].side);
    this.cursor = r > live.r || (r === live.r && i >= live.i) ? null : { r, i };
    this.onChange();
    if (!this.cursor) this.schedule();
  }

  backToLive() {
    this.cursor = null;
    this.onChange();
    this.schedule();
  }

  // ------------------------------------------------------------ timing

  setAuto(on) {
    this.auto = on;
    this.schedule();
    this.onChange();
  }

  schedule() {
    clearTimeout(this.timer);
    const r = this.reveal;
    if (!this.auto || !r || this.viewing) return;
    const card = r.cards[r.index];
    const skipping = this.settings.autoSkipSide && card?.side;
    const ms = skipping ? 300 : cardSeconds(card ?? { kind: 'title' }, this.settings.revealSpeed) * 1000;
    if (r.index < r.cards.length - 1) {
      if (card?.hold) return;
      this.timer = setTimeout(() => this.advance(), ms);
    } else if (!r.stageEnd && !r.over) {
      // Mid-stage rounds roll straight on; stage ends wait for the host.
      this.timer = setTimeout(() => this.nextRound(), ms);
    }
  }

  /** Label for the host's "go on" button when the round's reveal is done. */
  nextLabel() {
    if (this.race.over) return null;
    const h = nextRoundHeader(this.state);
    return this.reveal?.stageEnd ? `Start Stage ${h.stageId}` : `Next round: ${h.label}`;
  }

  stop() {
    clearTimeout(this.timer);
    clearInterval(this.ticker);
  }

  // ------------------------------------------------------------ choices

  /** Timer for phones and the host: { remainingMs, durationMs, paused } or null. */
  timerView() {
    const t = this.race?.choiceTimer;
    if (!t || !this.#windowOpen()) return null;
    return { remainingMs: this.#remaining(), durationMs: t.durationMs, paused: t.paused };
  }

  /** Waiting-screen / overlap progress, from the host-safe view. */
  get windowKind() {
    return this.#windowOpen() ? this.race.choice.kind : null;
  }

  /** A phone's answer (untrusted). Answers can change until the window closes. */
  answer(player, m) {
    if (!this.#windowOpen()) return;
    const ms = this.#elapsed();
    const res = answerPrompt(this.state, player.id, m, ms);
    if (!res.ok) return;
    this.lobby.sendPrivate(player.id);
    if (this.#windowDone()) return this.#finishWindow();
    this.onChange();
  }

  /** Pause / resume the timer (the host is talking over the stream). */
  togglePause() {
    const t = this.race?.choiceTimer;
    if (!t || !this.#windowOpen()) return;
    const now = Date.now();
    if (t.paused) {
      t.endsAt = now + t.remainingMs;
      t.paused = false;
      if (this.race.timingLogOpen) this.race.timingLogOpen.pausedMs += now - t.pausedAt;
    } else {
      t.remainingMs = Math.max(0, t.endsAt - now);
      t.paused = true;
      t.pausedAt = now;
    }
    this.lobby.sendPrivateAll();
    this.onChange();
  }

  /** "End now": close the window; everyone unanswered gets their ★ option. */
  endWindow() {
    if (!this.#windowOpen()) return;
    this.race.choiceTimer.ended = true;
    this.#finishWindow();
  }

  /** Everything logged so far, as an exportable object (sim --choice-times). */
  timingExport() {
    return {
      version: 1,
      seed: this.state.seed,
      exportedAt: new Date().toISOString(),
      players: this.state.players.filter((p) => p.hasCharacter && !p.isAI).length,
      settings: { choiceTimer: this.settings.choiceTimer, subEventFreq: this.settings.subEventFreq },
      windows: this.race?.timingLog ?? [],
    };
  }

  #windowOpen() {
    const c = this.race?.choice;
    return !!c && !c.closed;
  }

  #remaining() {
    const t = this.race.choiceTimer;
    if (!t) return 0;
    if (t.ended) return 0;
    return t.paused ? t.remainingMs : Math.max(0, t.endsAt - Date.now());
  }

  #elapsed() {
    const t = this.race.choiceTimer;
    return t ? Math.max(0, t.durationMs - this.#remaining()) : 0;
  }

  /** Prompts still waiting on a connected person. */
  #waitingOn() {
    const c = this.race.choice;
    if (!c) return [];
    return c.prompts.filter((x) => !x.answer && getPlayer(this.state, x.playerId)?.connected);
  }

  #windowDone() {
    if (!this.#windowOpen()) return true;
    return this.#remaining() <= 0 || this.#waitingOn().length === 0;
  }

  #openWindow(kind) {
    const choice = kind === 'plan' ? openStagePlans(this.state) : openSubEvents(this.state);
    const now = Date.now();
    const durationMs = (Number(this.settings.choiceTimer) || 30) * 1000;
    this.race.choiceTimer = { durationMs, endsAt: now + durationMs, paused: false, remainingMs: durationMs, openedAt: now };
    const humans = choice.prompts.filter((x) => !getPlayer(this.state, x.playerId)?.isAI);
    this.race.timingLogOpen = {
      kind, stageId: choice.stageId, roundNo: choice.roundNo,
      timerSeconds: durationMs / 1000, prompts: choice.prompts.length, humans: humans.length,
      overlapMs: null, pausedMs: 0,
    };
    this.lobby.sendPrivateAll();
    this.onChange();
  }

  /** The host is now waiting on the window (no results card to cover it). */
  #wait() {
    const log = this.race.timingLogOpen;
    // Stage Plans: the time spent before this point overlapped the results.
    if (log && log.overlapMs == null) log.overlapMs = this.race.choice.kind === 'plan' && this.race.choice.overlap ? this.#elapsed() : 0;
    this.race.choosing = true;
    this.onChange();
  }

  /** Close the open window, then carry on if the host was waiting on it. */
  #finishWindow() {
    const waiting = this.race.choosing;
    this.#closeWindow();
    if (waiting) this.nextRound();
    else this.onChange();
  }

  #closeWindow() {
    const choice = this.race.choice;
    if (!choice || choice.closed) return;
    const log = this.race.timingLogOpen;
    const elapsed = this.#elapsed();
    const human = choice.prompts.filter((x) => !getPlayer(this.state, x.playerId)?.isAI);
    closeChoices(this.state);
    if (log) {
      if (log.overlapMs == null) log.overlapMs = choice.overlap ? elapsed : 0;
      Object.assign(log, {
        openMs: elapsed,
        waitMs: Math.max(0, elapsed - log.overlapMs),
        endedBy: this.race.choiceTimer?.ended ? 'host' : this.#remaining() <= 0 ? 'timer' : 'answers',
        answers: human.map((x) => ({ ms: x.answer.by === 'player' ? x.answer.ms : null, by: x.answer.by })),
      });
      (this.race.timingLog ??= []).push(log);
    }
    this.race.timingLogOpen = null;
    this.race.choiceTimer = null;
    this.lobby.sendPrivateAll();
  }

  #tick() {
    if (!this.#windowOpen()) return;
    if (this.race.choiceTimer && !this.race.choiceTimer.paused && this.#windowDone()) {
      this.#finishWindow();
      return;
    }
    this.onTick?.();
  }

  // ------------------------------------------------------------ internals

  /** First time a card goes live: header for phones + feed lines. */
  #reveal(card) {
    // Stage results: the next stage's plans open now, so players choose while
    // the results and standings are up.
    if (card.kind === 'stage' && !this.race.choice && needsStagePlans(this.state)) {
      this.#openWindow('plan');
      this.race.choice.overlap = true;
    }
    if (card.kind === 'title') {
      this.race.shownHeader = {
        stageId: card.stage.id, stageName: card.stage.name,
        route: `${card.stage.from} → ${card.stage.to}`, label: card.label,
      };
      this.lobby.broadcastPublic();
    }
    if (!card.fed) {
      this.#feedCard(card);
      card.fed = true;
    }
  }

  #roundRevealed() {
    const header = this.race.shownHeader; // keep showing the round just revealed
    syncShown(this.state);
    if (!this.race.over) this.race.shownHeader = header;
    this.lobby.broadcastPublic();
    this.lobby.sendPrivateAll();
  }

  #feedCard(card) {
    const L = this.lobby;
    switch (card.kind) {
      case 'title':
        L.feed(`Stage ${card.stage.id} · ${card.stage.name} · ${card.label}`, 'round');
        break;
      case 'events':
        for (const e of card.lines) L.feed(e.text, e.death ? 'death' : e.side ? 'minor' : 'event', e.ids);
        break;
      case 'minor':
        for (const e of [...card.lines, ...(card.feedOnly ?? [])]) L.feed(e.text, 'minor', e.ids);
        L.feed(card.report.text, 'report');
        break;
      case 'field':
        L.feed(card.report.text, 'report');
        break;
      case 'fallen': {
        const names = card.named.map((f) => f.name);
        const npc = card.npcs ? `${names.length ? ', and ' : ''}${card.npcs} from the field` : '';
        L.feed(`The Fallen: ${names.join(', ')}${npc}.`, 'fallen', card.named.map((f) => f.id));
        break;
      }
      case 'stage': {
        const top = card.placements.slice(0, 3).map((p) => `${p.rank}. ${p.name ?? 'a rider from the pack'}`);
        L.feed(`Stage ${card.stage.id} results: ${top.join(', ')}`, 'stage');
        break;
      }
      case 'podium':
        L.feed(card.winner
          ? `${card.place.name} wins the Steel Ball Run with ${card.place.points} points!`
          : `${card.place.rank === 2 ? '2nd' : '3rd'} place: ${card.place.name} (${card.place.points} points)`,
        card.winner ? 'final' : 'stage', [card.place.id]);
        break;
      case 'no-winner':
        L.feed('Nobody reached New York.', 'final');
        break;
      case 'awards':
        for (const a of card.awards) L.feed(`${a.title}: ${a.winners.map((w) => w.name).join(' & ')} (${a.detail})`, 'stage', a.winners.map((w) => w.id));
        break;
    }
  }
}
