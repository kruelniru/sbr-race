// Host-side race controller: runs rounds through the engine, then walks the
// host through the reveal one card at a time (auto-advancing by default).
// Phones get each line in their mini feed as it's revealed on the stream, and
// their private status once the round's reveal has finished.
//
// Reveal state lives in state.race.reveal so a host reload resumes mid-round.

import { startRace, runRound, syncShown, nextRoundHeader } from '../engine/race.js';
import { buildCards } from '../engine/reveal.js';

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
    this.auto = true;
    this.timer = null;
  }

  get race() {
    return this.state.race;
  }

  get reveal() {
    return this.race?.reveal ?? null;
  }

  get card() {
    const r = this.reveal;
    return r && r.index >= 0 ? r.cards[r.index] : null;
  }

  /** Waiting for the host to press "Start next round/stage"? */
  get waiting() {
    const r = this.reveal;
    return !r || r.index >= r.cards.length - 1;
  }

  start() {
    startRace(this.state);
    syncShown(this.state);
    this.lobby.broadcastPublic();
    this.lobby.sendPrivateAll();
    this.nextRound();
  }

  /** After a host reload: pick up where the reveal left off. */
  resume() {
    if (!this.race) return;
    this.schedule();
  }

  nextRound() {
    if (this.race.over) return;
    clearTimeout(this.timer);
    const result = runRound(this.state);
    this.race.reveal = {
      cards: buildCards(result),
      index: -1,
      roundNo: result.roundNo,
      stageEnd: result.lastRoundOfStage,
      over: result.over,
    };
    this.advance();
  }

  /** Show the next card. */
  advance() {
    clearTimeout(this.timer);
    const r = this.reveal;
    if (!r || r.index >= r.cards.length - 1) return;
    r.index++;
    const card = r.cards[r.index];
    if (card.kind === 'title') {
      // The header phones show follows the stream.
      this.race.shownHeader = { ...headerFromCard(card) };
      this.lobby.broadcastPublic();
    }
    if (!card.fed) {
      this.#feedCard(card);
      card.fed = true;
    }
    if (r.index === r.cards.length - 1) this.#roundRevealed();
    this.onChange();
    this.schedule();
  }

  setAuto(on) {
    this.auto = on;
    this.schedule();
    this.onChange();
  }

  schedule() {
    clearTimeout(this.timer);
    const r = this.reveal;
    if (!this.auto || !r) return;
    const card = this.card;
    if (r.index < r.cards.length - 1) {
      if (card?.hold) return;
      this.timer = setTimeout(() => this.advance(), (card?.seconds ?? 2) * 1000);
    } else if (!r.stageEnd && !r.over) {
      // Mid-stage rounds roll straight on; stage ends wait for the host.
      this.timer = setTimeout(() => this.nextRound(), (card?.seconds ?? 2) * 1000);
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
        for (const e of card.lines) L.feed(e.text, e.death ? 'death' : 'event', e.ids);
        break;
      case 'minor':
        for (const e of card.lines) L.feed(e.text, 'minor', e.ids);
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
      case 'final': {
        const w = card.final.winner;
        L.feed(w ? `${w.name} wins the Steel Ball Run with ${w.points} points!` : 'Nobody reached New York.', 'final');
        break;
      }
    }
  }
}

function headerFromCard(card) {
  return { stageId: card.stage.id, stageName: card.stage.name, route: `${card.stage.from} → ${card.stage.to}`, label: card.label };
}
