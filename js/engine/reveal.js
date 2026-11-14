// Turns a RoundResult into the cards the host shows, in order:
//
//   title
//   Main Story   (events with a PC, canon racer or breakout NPC who's still racing)
//   Side Stories (side: true) — retired racers / NPC-only lines, then the
//                "Meanwhile on the trail..." card with the field report
//   fallen, stage results, standings  (always shown)
//   finale sequence (after the last Finish Line)
//
// Card time comes from how much text is on it (cardSeconds), at the host's
// speed. Pure, so the sim uses the exact same pacing to estimate length.

import RULES from '../../data/rules.js';

export function buildCards(result) {
  const T = RULES.timing;
  const cards = [{ kind: 'title', stage: result.stage, label: result.label, type: result.type }];

  const main = result.events.filter((e) => !e.side);
  const sideFull = result.events.filter((e) => e.side && !e.minor);
  const minor = result.events.filter((e) => e.minor);

  for (let i = 0; i < main.length; i += T.pageSize) cards.push({ kind: 'events', lines: main.slice(i, i + T.pageSize) });
  for (let i = 0; i < sideFull.length; i += T.pageSize) cards.push({ kind: 'events', side: true, lines: sideFull.slice(i, i + T.pageSize) });
  if (minor.length) {
    // Show a handful on stream; the rest only reach the phone feed.
    cards.push({ kind: 'minor', side: true, lines: minor.slice(0, T.maxMinorShown), feedOnly: minor.slice(T.maxMinorShown), report: result.fieldReport });
  }
  else {
    cards.push({ kind: 'field', side: true, report: result.fieldReport });
  }

  if (result.fallen) cards.push({ kind: 'fallen', named: result.fallen.named, npcs: result.fallen.npcs });
  if (result.placements) {
    cards.push({ kind: 'stage', stage: result.stage, placements: result.placements.slice(0, 20), hold: !result.over });
    cards.push({ kind: 'standings', rows: result.standings.slice(0, 12) });
  }
  if (result.finale) cards.push(...finaleCards(result.finale));
  return cards;
}

function finaleCards(f) {
  const cards = [{ kind: 'finale-title' }];
  const [first, second, third] = f.podium;
  if (third) cards.push({ kind: 'podium', place: third });
  if (second) cards.push({ kind: 'podium', place: second });
  if (first) {
    cards.push({ kind: 'drumroll' });
    cards.push({ kind: 'podium', place: first, winner: true, hold: true });
  } else {
    cards.push({ kind: 'no-winner' });
  }
  if (f.awards.length) cards.push({ kind: 'awards', awards: f.awards });
  cards.push({ kind: 'survivors', survivors: f.survivors, fieldFinished: f.fieldFinished });
  cards.push({ kind: 'memorial', fallen: f.memorial });
  for (const x of f.extras) cards.push({ kind: 'extra', id: x.id, data: x.data, hold: true });
  cards.push({ kind: 'the-end', standings: f.standings, hold: true });
  return cards;
}

// ---------------------------------------------------------------- timing

const words = (s) => (s ? s.trim().split(/\s+/).length : 0);

/** How long a card stays up, from its text, at 'slow' | 'normal' | 'fast'. */
export function cardSeconds(card, speed = 'normal') {
  const T = RULES.timing;
  const wps = T.readingWps[speed] ?? T.readingWps.normal;
  const pause = T.pauseScale[speed] ?? 1;
  const read = (s) => words(s) / wps;
  const B = T.base;
  let s;
  switch (card.kind) {
    case 'title': s = B.title * pause; break;
    case 'events': s = B.page * pause + card.lines.reduce((t, e) => t + read(e.text) + T.perLine, 0); break;
    case 'minor': s = B.page * pause + card.lines.reduce((t, e) => t + read(e.text) + T.perMinorLine, 0) + read(card.report.text); break;
    case 'field': s = B.field * pause + read(card.report.text); break;
    case 'fallen': s = B.fallen * pause + card.named.reduce((t, f) => t + T.perName + read(f.cause), 0); break;
    case 'stage': s = B.stage * pause; break;
    case 'standings': s = B.standings * pause; break;
    case 'finale-title': s = B.title * pause; break;
    case 'podium': s = (card.winner ? B.winner : B.podium) * pause; break;
    case 'drumroll': s = B.drumroll; break; // the dramatic pause doesn't speed up
    case 'no-winner': s = B.podium * pause; break;
    case 'awards': s = B.page * pause + card.awards.length * B.award * pause; break;
    case 'survivors': s = B.page * pause + card.survivors.length * T.perName * 0.5; break;
    case 'memorial': s = B.page * pause + card.fallen.reduce((t, f) => t + T.perName + read(f.cause), 0); break;
    default: s = B.page * pause;
  }
  return Math.round(s * 10) / 10;
}

export function cardsSeconds(cards, speed = 'normal', { skipSide = false } = {}) {
  return cards.filter((c) => !(skipSide && c.side)).reduce((t, c) => t + cardSeconds(c, speed), 0);
}
