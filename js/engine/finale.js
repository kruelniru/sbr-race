// The ending, as data: podium, awards, survivors, the Fallen memorial, and
// any extra sections later milestones register. Pure (the sim prints it too).
//
// ADDING A FINALE SECTION (milestones 4–6):
//   import { registerFinaleSection } from './finale.js';
//   registerFinaleSection({
//     id: 'secrets',
//     order: 100,                       // higher = later; 100+ comes after the memorial
//     build: (state) => ({ ... }) | null,
//   });
// The host renders each section with a renderer registered under the same id
// in js/host/race-view.js (FINALE_RENDERERS). The secrets reveal (who joined
// Valentine, everyone's Worthiness bar, who held which corpse parts) goes here
// as the last, biggest moment.

import { namedRacers, findRacerAnywhere } from './racers.js';
import { standings } from './placement.js';
import { endingCard, epilogues } from './endings.js';
import { corpseSummary } from './corpse.js';

const SECTIONS = [];

export function registerFinaleSection(section) {
  SECTIONS.push(section);
  SECTIONS.sort((a, b) => a.order - b.order);
}

export function buildFinale(state) {
  const racers = namedRacers(state);
  const finishers = racers.filter((r) => r.status === 'racing');
  const namedNpcFinishers = state.field.packLeaders.filter((n) => n.status === 'racing' && n.name);
  const ranked = [...finishers, ...namedNpcFinishers].sort((a, b) => b.points - a.points);
  const brief = (r) => ({ id: r.id, name: r.name, tier: r.tier, points: r.points, mount: r.mount ?? 'horse' });

  const podium = ranked.slice(0, 3).map((r, i) => ({ rank: i + 1, ...brief(r) }));
  return {
    podium,
    // Milestone 6b: the main ending (null when normal) and epilogue cards.
    ending: endingCard(state),
    epilogues: epilogues(state, podium),
    awards: awards(state, racers, finishers),
    survivors: finishers.map(brief).sort((a, b) => b.points - a.points),
    fieldFinished: state.field.racing,
    memorial: state.race.memorial.map((f) => ({ ...f })),
    standings: standings(state).slice(0, 20),
    extras: SECTIONS.map((s) => {
      const data = s.build(state);
      return data ? { id: s.id, order: s.order, data } : null;
    }).filter(Boolean),
  };
}

/** Each award: { id, title, winners: [{id, name, tier}], detail }. Skipped when nobody qualifies. */
function awards(state, racers, finishers) {
  const out = [];
  const pick = (r) => ({ id: r.id, name: r.name, tier: r.tier });

  const most = (list, key) => {
    const max = Math.max(0, ...list.map((r) => r[key] ?? 0));
    return max > 0 ? { max, winners: list.filter((r) => (r[key] ?? 0) === max) } : null;
  };

  const kills = most(racers, 'kills');
  if (kills) out.push({ id: 'kills', title: 'Most Kills', winners: kills.winners.map(pick), detail: `${kills.max} ${kills.max === 1 ? 'kill' : 'kills'}` });

  const spares = most(racers, 'spares');
  if (spares) out.push({ id: 'spares', title: 'Most Merciful', winners: spares.winners.map(pick), detail: `spared ${spares.max} ${spares.max === 1 ? 'rider' : 'riders'}` });

  // Milestone 6b: Corpse Holder (most parts at the end), and the President's count.
  const sum = corpseSummary(state);
  const topParts = sum.holders[0]?.parts.length ?? 0;
  if (topParts > 0 || sum.president > 0) {
    const winners = sum.holders.filter((h) => h.parts.length === topParts && topParts > 0).map((h) => findRacerAnywhere(state, h.id)).filter(Boolean);
    out.push({
      id: 'corpse', title: 'Corpse Holder', winners: winners.map(pick),
      detail: `${topParts ? `${topParts} ${topParts === 1 ? 'part' : 'parts'}` : 'No racer holds a part'} · the President held ${sum.president}`,
    });
  }

  const runners = racers.filter((r) => r.mount === 'runner');
  if (runners.length) {
    const best = runners.reduce((a, b) => (b.points > a.points ? b : a));
    out.push({ id: 'runner', title: 'Best Runner', winners: [pick(best)], detail: `${best.points} points on foot${best.status === 'racing' ? '' : best.status === 'dead' ? ' (fallen)' : ' (retired)'}` });
  }

  // Biggest comeback: most places climbed from a racer's worst standing to the final one.
  const finalRank = new Map(standings(state).map((row, i) => [row.id, i + 1]));
  let comeback = null;
  for (const r of finishers) {
    if (r.rankHistory.length < 2) continue;
    const worst = Math.max(...r.rankHistory.slice(0, -1));
    const climb = worst - finalRank.get(r.id);
    if (climb >= 3 && (!comeback || climb > comeback.climb)) comeback = { r, climb, worst };
  }
  if (comeback) {
    out.push({
      id: 'comeback', title: 'Biggest Comeback', winners: [pick(comeback.r)],
      detail: `from ${ordinal(comeback.worst)} to ${ordinal(finalRank.get(comeback.r.id))}`,
    });
  }
  return out;
}

export function ordinal(n) {
  const teens = n % 100 >= 11 && n % 100 <= 13;
  return n + (teens ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
}
