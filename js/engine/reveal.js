// Turns a RoundResult into the sequence of cards the host shows, each with a
// duration. Pure, so the sim uses the exact same pacing to estimate length.
//
// Card kinds: title, events (a page of up to pageSize full lines), minor
// ("Meanwhile on the trail..." + the field report), field (report alone), fallen, stage (placements),
// standings, final.

import RULES from '../../data/rules.js';

export function buildCards(result, timing = RULES.timing) {
  const cards = [];
  const T = timing;

  cards.push({ kind: 'title', stage: result.stage, label: result.label, type: result.type, seconds: T.roundTitle });

  const full = result.events.filter((e) => !e.minor);
  const minor = result.events.filter((e) => e.minor);
  for (let i = 0; i < full.length; i += T.pageSize) {
    const lines = full.slice(i, i + T.pageSize);
    cards.push({ kind: 'events', lines, seconds: T.pageBase + lines.length * T.fullLine });
  }
  // The field report rides along at the bottom of the Meanwhile card.
  if (minor.length) {
    cards.push({
      kind: 'minor', lines: minor, report: result.fieldReport,
      seconds: T.minorBase + minor.length * T.minorLine + T.fieldReportInMinor,
    });
  } else {
    cards.push({ kind: 'field', report: result.fieldReport, seconds: T.fieldReport });
  }

  if (result.fallen) {
    cards.push({
      kind: 'fallen', named: result.fallen.named, npcs: result.fallen.npcs,
      seconds: T.fallenBase + result.fallen.named.length * T.fallenPerName,
    });
  }
  if (result.placements) {
    cards.push({ kind: 'stage', stage: result.stage, placements: result.placements.slice(0, 20), seconds: T.stageResults, hold: true });
    cards.push({ kind: 'standings', rows: result.standings.slice(0, 12), seconds: T.standings });
  }
  if (result.over) cards.push({ kind: 'final', final: result.final, seconds: 0, hold: true });
  return cards;
}

export function cardsSeconds(cards) {
  return cards.reduce((s, c) => s + c.seconds, 0);
}
