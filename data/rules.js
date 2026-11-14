// Tunable numbers for the race. Change these (and rerun the sim) instead of
// touching engine code.  Run: node sim/simulate.js --games 200
export default {
  // ---------------------------------------------------------------- points
  // Index 0 = 1st place. 1st–10th: 100 down to 10. 11th–20th: 5 each.
  points: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],

  // ---------------------------------------------------------------- placement
  // score = skill + pace*paceWeight - penalties + terrain + noise
  placement: {
    pcSkill: 60,          // every PC (canon skills live in canon-racers.js)
    paceWeight: 7,        // per point of pace earned in events this stage
    injuredPenalty: 15,
    onFootPenalty: 40,    // a Rider whose horse died
    noiseSd: 15,          // randomness (normal distribution)
  },

  // Runners (no horse, ever). Terrain modifiers add up per stage terrain tag.
  runner: {
    base: -6,              // flat modifier every stage (calibrate with the sim)
    terrain: { rough: 6, flat: -8 },
    aiRunnerChance: 0.15, // share of AI racers who pick Runner
  },

  // ---------------------------------------------------------------- the field
  fieldSize: 500,         // NPC racers at the start (host setting later)
  packLeaders: 6,         // unnamed NPCs who compete for placements
  packLeaderSkill: 52,
  keptNpcReuse: 0.2,      // chance an event's NPC is someone we've met before
  nightDeathMult: 1.5,    // field deaths are this much likelier at night

  // ---------------------------------------------------------------- events
  maxUsesPerRound: { full: 1, minor: 2 }, // stops the same line repeating in a round
  canonEventChance: 0.4,   // a canon racer gets their own event this often
  retiredEventChance: 0.25,// a retired racer gets an event this often
  // How likely an event that would kill this tier is (weight multiplier).
  deathOdds: { pc: 0.6, canon: 0.35, npc: 1 },
  canonImmuneStages: [1],  // canon racers can't die in these stages

  // Personality nudges: multiply an event's weight by tag for the FOCUS racer.
  personalityLean: {
    honorable: { help: 2.2, spare: 2.5, kill: 0.45, sabotage: 0.3, cold: 0.4 },
    ruthless: { kill: 2.2, sabotage: 2, cold: 2, help: 0.45, spare: 0.3 },
    cautious: { risky: 0.5, kill: 0.7, hazard: 0.8, help: 1.2, spare: 1.3 },
    glory: { risky: 1.8, sprint: 2, pace: 1.3 },
    opportunist: { sabotage: 1.6, kill: 1.2, cold: 1.4, sprint: 1.2 },
  },
  // Canon racers rarely start kills and often help (on top of personality).
  canonLean: { kill: 0.35, help: 1.6, sabotage: 0.4, spare: 1.5 },

  // ---------------------------------------------------------------- pacing
  // How long the host shows each card. Time comes mostly from how many words
  // are on it (reading speed), plus a pause per card. The host's speed
  // setting picks the column. The sim uses the same numbers at 'normal'.
  timing: {
    pageSize: 5,                                  // Main Story lines per page
    readingWps: { slow: 2.4, normal: 3.2, fast: 4.3 }, // words per second
    pauseScale: { slow: 1.3, normal: 1, fast: 0.75 },  // scales the fixed pauses
    perLine: 0.8,        // extra beat after each full event line
    perMinorLine: 0.3,
    maxMinorShown: 4,    // Meanwhile card shows this many; the rest go to the phone feed only
    perName: 2,          // each name on the Fallen / memorial cards
    base: {
      title: 3.5, page: 2.5, field: 2.5, fallen: 4, stage: 16, standings: 10,
      podium: 7, drumroll: 4, winner: 14, award: 4,
    },
    // Projected extra time once choices exist (milestone 3), for the sim.
    projectedStagePlan: 35,
    projectedSubEventsPerRound: 12,
  },
};
