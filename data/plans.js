// Stage Plans (DESIGN.md → Choices). Every PC picks one at the start of each
// stage. Plans for systems that don't exist yet stay hidden (`enabled: false`)
// until their milestone turns them on.
//
//   placement:  added to the Finish Line score this stage
//   eventMult:  multiplies the weight of main events with these tags (focus racer)
//   deathMult:  multiplies the odds of events that would kill this racer
//   horseMult:  multiplies the odds of events that would kill their horse
//   subEventMult: multiplies this racer's chance of a sub event each round
//   lean:       how much each personality likes this plan; the highest is
//               marked "★ In character", and AI racers pick by it
//   needsTarget: the player also picks a racer (Hunt a rival)
//
// Tune with: node sim/simulate.js --games 500 --plans random
export default [
  {
    id: 'push', label: 'Push hard', upside: 'Better placement', downside: 'More hazards, more risk to your horse',
    placement: 6,
    eventMult: { risky: 1.6, hazard: 1.5, sprint: 1.3, pace: 1.2 },
    deathMult: 1.45, horseMult: 1.6, subEventMult: 1.2,
    lean: { honorable: 1, ruthless: 2, cautious: 0.3, glory: 4, opportunist: 1.5 },
    enabled: true,
  },
  {
    id: 'pace', label: 'Pace yourself', upside: 'Safe', downside: 'Average placement',
    placement: 0,
    eventMult: {}, deathMult: 0.85, horseMult: 1, subEventMult: 1,
    lean: { honorable: 3, ruthless: 1, cautious: 2, glory: 1, opportunist: 1.5 },
    enabled: true,
  },
  {
    id: 'rival', label: 'Hunt a rival', upside: 'A guaranteed sprint showdown with your pick', downside: 'You might lose it',
    placement: -5,
    eventMult: { kill: 1.3 }, deathMult: 1.45, horseMult: 1, subEventMult: 0.8,
    lean: { honorable: 0.8, ruthless: 3, cautious: 0.3, glory: 2, opportunist: 3.2 },
    needsTarget: true,
    enabled: true,
  },
  {
    id: 'laylow', label: 'Lay low', upside: 'Very safe', downside: 'Bad placement',
    placement: -10,
    eventMult: { risky: 0.5, hazard: 0.6, sprint: 0.5, kill: 0.7 },
    deathMult: 0.4, horseMult: 0.5, subEventMult: 0.6,
    lean: { honorable: 1, ruthless: 0.3, cautious: 4, glory: 0.2, opportunist: 1 },
    enabled: true,
  },
  // ---- later milestones (hidden until their systems exist)
  {
    id: 'palm', label: "Seek the Devil's Palm", upside: 'A Stand gamble', downside: 'Low Worthiness can kill you',
    stages: [2, 3], placement: -5, eventMult: {}, deathMult: 1, horseMult: 1, subEventMult: 1,
    lean: { honorable: 0.5, ruthless: 1.5, cautious: 0.2, glory: 2.5, opportunist: 2 },
    enabled: false, // milestone 4: guarantees the "Edge of the Devil's Palm" sub event
  },
  {
    id: 'corpse', label: 'Hunt a corpse part', upside: 'Better odds of finding one', downside: "Valentine's agents notice you",
    placement: -5, eventMult: {}, deathMult: 1, horseMult: 1, subEventMult: 1,
    lean: { honorable: 1, ruthless: 1.5, cautious: 0.3, glory: 1.5, opportunist: 2.5 },
    enabled: false, // milestone 5: part-finding ×3, agent ambushes ×2
  },
  {
    id: 'ally', label: 'Ally up', upside: 'Ride with someone (they accept or refuse)', downside: 'They might betray you',
    placement: 0, eventMult: {}, deathMult: 0.8, horseMult: 1, subEventMult: 1,
    needsTarget: true,
    lean: { honorable: 2, ruthless: 0.5, cautious: 2, glory: 0.5, opportunist: 1.5 },
    enabled: false, // milestone 5: alliances
  },
];
