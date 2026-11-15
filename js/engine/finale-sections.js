// Extra finale sections from later milestones (see finale.js).
// Sections with order < 100 come right after the awards; 100+ after the
// memorial (the secrets reveal in milestone 6).
import { registerFinaleSection } from './finale.js';
import { findRacerAnywhere } from './racers.js';

// Milestone 4: every Stand awakened during the race (not canon Stands held
// from the start), with its tier. Never where it came from.
registerFinaleSection({
  id: 'stands',
  order: 10,
  build: (state) => {
    const log = (state.stands?.log ?? []).filter((e) => e.source !== 'canon');
    if (!log.length) return null;
    const order = { legendary: 0, rare: 1, common: 2 };
    return {
      users: log.map((e) => {
        const r = findRacerAnywhere(state, e.racerId);
        return {
          id: e.racerId, name: r?.name ?? e.name, tier: e.racerTier, stand: e.stand, standTier: e.tier,
          dead: r?.status === 'dead', gaveUp: r ? r.stand?.id !== e.standId : false,
        };
      }).sort((a, b) => order[a.standTier] - order[b.standTier]),
    };
  },
});
