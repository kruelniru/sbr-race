// The full game log (exported only after the game ends). Pure engine code.
//
// While the game runs, the engine records what the reveal cards don't keep:
//   state.race.roundLog:  every round's lines, the Fallen and the top placements
//   state.race.choiceLog: every choice window: who was asked what, and what they answered
//   racer.wLog:           every Worthiness change, with numbers (PCs; racers.js addWorthiness)
// Everything else comes from the logs the systems already keep (fights,
// corpse parts, Stands, Valentine, trades, the dead's votes, the finale).
//
// buildGameLog(state) returns one JSON object with all of it, ids turned into
// names, and secret things marked `secret: true`. js/host/log-export.js turns
// it into a readable HTML page. Never call it before the race is over.

import { readyPlayers } from './state.js';
import { findRacerAnywhere } from './racers.js';
import { worthinessLevel } from './race.js';

/** End of runRound: keep this round's story. */
export function recordRound(state, result) {
  (state.race.roundLog ??= []).push({
    round: result.roundNo, stage: result.stage.id, stageName: result.stage.name, label: result.label,
    lines: result.events.map((e) => ({
      text: e.text,
      where: e.announce ? 'announce' : e.dead ? 'dead' : e.minor ? 'meanwhile' : e.side ? 'side' : 'main',
      death: !!e.death,
    })),
    field: result.fieldReport?.text ?? null,
    fallen: (result.fallen?.named ?? []).map((f) => ({ name: f.name, cause: f.cause, by: f.by ?? null })),
    fieldDead: result.fallen?.npcs ?? 0,
    placements: (result.placements ?? []).slice(0, 10).map((p) => ({ rank: p.rank, name: p.name ?? 'a rider from the pack', points: p.points })),
  });
}

/** When a choice window closes: every prompt, its options and the answer. */
export function recordChoices(state, choice) {
  const name = (id) => findRacerAnywhere(state, id)?.name ?? id;
  (state.race.choiceLog ??= []).push({
    round: choice.roundNo, stage: choice.stageId, kind: choice.kind,
    prompts: choice.prompts.map((x) => {
      const opt = x.options.find((o) => o.id === x.answer?.optionId);
      return {
        player: name(x.playerId), title: x.title, text: x.text, secret: !!x.secret,
        options: x.options.map((o) => o.label),
        answer: opt?.label ?? x.answer?.optionId ?? null,
        target: x.answer?.targetId ? name(x.answer.targetId) : null,
        by: x.answer?.by ?? null, // 'player' | 'ai' | 'auto' (timed out)
        buy: x.buy ?? null,
      };
    }),
  });
}


/** The whole game, as plain data with names instead of ids. */
export function buildGameLog(state) {
  if (!state.race?.over) return null; // never during a game
  const race = state.race ?? {};
  const name = (id) => (id == null ? null : id === 'president' ? 'the President' : findRacerAnywhere(state, id)?.name ?? id);
  const pcs = readyPlayers(state);
  const finale = race.finale ?? null;
  return {
    game: 'Steel Ball Run',
    exportedAt: new Date().toISOString(),
    createdAt: state.createdAt ? new Date(state.createdAt).toISOString() : null,
    seed: state.seed,
    settings: { ...state.settings },
    cheatsUsed: !!state.cheatsUsed,
    cheats: (state.cheats ?? []).map((c) => ({ ...c, target: name(c.target) })),
    players: pcs.map((p) => ({
      name: p.name, pronouns: p.pronouns, personality: p.personality, mount: p.mount, ai: !!p.isAI,
      status: p.status, points: p.points, kills: p.kills ?? 0, spares: p.spares ?? 0, helps: p.helps ?? 0,
      death: p.death ? { ...p.death } : null,
      worthiness: { start: p.wLog?.[0]?.from ?? p.worthiness, end: p.worthiness, level: worthinessLevel(p.worthiness), changes: p.wLog ?? [] },
      stand: p.stand ? { name: p.stand.name, tier: p.stand.tier, source: p.stand.source } : null,
      valentine: p.valentine ? { ...p.valentine } : null,
    })),
    canon: (state.canon ?? []).map((c) => ({ name: c.name, status: c.status, points: c.points, death: c.death ? { ...c.death } : null, stand: c.stand?.name ?? null })),
    rounds: race.roundLog ?? [],
    choices: race.choiceLog ?? [],
    secret: {
      fights: (race.fightLog ?? []).map((f) => ({ stage: f.stage, kind: f.kind, attacker: f.names?.[0], defender: f.names?.[1], masked: !!f.masked, win: f.win, defend: f.defend, outcome: f.outcome, scores: f.scores })),
      stands: (state.stands?.log ?? []).map((e) => ({ stage: e.stage, who: e.name, stand: e.stand, tier: e.tier, source: e.source })),
      corpse: (state.corpse?.log ?? []).map((e) => ({ stage: e.stage, round: e.round, part: e.name, event: e.event, how: e.how ?? null, to: name(e.to), from: name(e.from), band: e.band ?? null })),
      valentine: (race.valentineLog ?? []).map((e) => ({ ...e, id: name(e.id), from: name(e.from), to: name(e.to) })),
      trades: (race.tradeLog ?? []).map((t) => ({ ...t, from: name(t.from), to: name(t.to) })),
      deadVotes: (race.deadLog ?? []).map((d) => ({ ...d, target: name(d.target), votes: (d.votes ?? []).map((v) => ({ ...v, voter: name(v.voter), target: name(v.target) })) })),
      arrows: race.arrowLog ?? [], rokakaka: (race.rokakakaLog ?? []).map((e) => ({ ...e, racerId: undefined, who: name(e.racerId) })),
      horses: (race.horseLog ?? []).map((h) => ({ ...h, id: undefined, who: name(h.id) })),
      alliances: race.allyLog ?? [],
      finale: (race.finaleLog ?? []),
      boss: race.boss ?? null,
      d4c: race.d4c ? { ...race.d4c } : null,
      itemsFromTheDead: (race.itemLog ?? []).map((e) => ({ ...e, from: name(e.from), to: name(e.to) })),
      requiems: (race.requiems ?? []).map((x) => ({ ...x, id: name(x.id) })),
      valentineTalks: (race.valentineTalks ?? []).map((x) => ({ ...x, id: name(x.id) })),
      valentinePitches: (race.offerLog ?? []).map((x) => ({ ...x, id: name(x.id) })),
      requiemArrows: (race.requiemArrows ?? []).map((x) => ({ ...x, id: name(x.id) })),
      acts: (state.stands?.acts ?? []).map((x) => ({ ...x, racerId: undefined, who: name(x.racerId) })),
      requiemRefused: (race.requiemRefused ?? []).map((x) => ({ ...x, id: name(x.id) })),
      fv: race.fv ? { beaten: race.fv.beaten, dead: race.fv.dead, killers: (race.fv.killers ?? []).map(name), riders: (race.fv.riders ?? []).map(name), beatenBy: name(race.fv.beatenBy) } : null,
    },
    ending: race.ending ?? null,
    valentineEnding: race.valentineEnding ?? null,
    finale: finale ? { podium: finale.podium, awards: finale.awards, ending: finale.ending, epilogues: finale.epilogues } : null,
  };
}
