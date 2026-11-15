// Tunable numbers for the race. Change these (and rerun the sim) instead of
// touching engine code.  Run: node sim/simulate.js --games 200
export default {
  // ---------------------------------------------------------------- points
  // Index 0 = 1st place. 1st–10th: 100 down to 10. 11th–20th: 5 each.
  points: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],

  // ---------------------------------------------------------------- placement
  // score = skill + pace*paceWeight - penalties + terrain + noise
  placement: {
    pcSkill: 65,          // every PC (canon skills live in canon-racers.js)
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
  deathOdds: { pc: 0.65, canon: 0.35, npc: 1 },
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

  // ---------------------------------------------------------------- worthiness
  // Hidden 0–100 stat. The owner's phone shows a bar (no number) from
  // milestone 4; nobody else sees it until the finale's secrets reveal.
  // Canon racers have their own value in canon-racers.js (worthiness).
  worthiness: {
    start: { pc: [50, 50], canon: [50, 80], npc: [5, 30] },
    help: 5,        // help or save a racer (events tagged 'help', help choices)
    spare: 8,       // spare someone you beat (sparedBy)
    palmSurvive: 5, // walk out of the Devil's Palm alive
    cruel: -5,      // kill someone helpless or fleeing (events tagged 'cruel')
    barSteps: 20,   // the phone gets a coarse level (0–20), never the number
  },

  // ---------------------------------------------------------------- Stands
  // Tier odds by source, at Worthiness 50: [legendary, rare, common] in %.
  // Worthiness shifts them: every point above 50 moves 0.2 points into
  // Legendary, taken from the lowest tier (Common; Rare for corpse parts),
  // and the reverse below 50. That's ±10 at Worthiness 0 or 100.
  standOdds: {
    corpse: [40, 60, 0],   // milestone 5; never Common
    arrow: [20, 40, 40],
    palm: [10, 30, 60],
    shiftPer10: 2,
  },
  // What a Stand does for its user, by tier. No Stand ever wins a fight or a
  // race outright: these shift odds, and randomness stays on top.
  standTier: {
    common: { placement: 1, hazardDeath: 0.92, fightBonus: 4 },
    rare: { placement: 1, hazardDeath: 0.85, fightBonus: 8 },
    legendary: { placement: 2, hazardDeath: 0.8, fightBonus: 12 }, // fightBonus: hook for milestone 5
  },
  standEventWeight: 1.5,     // weight multiplier on Stand events for Stand users

  // ---------------------------------------------------------------- Devil's Palm (Stages 2–3)
  // Outcome odds (%) for a racer who goes in, by Worthiness band (min is inclusive).
  palm: {
    stages: [2, 3],
    bands: [
      { min: 75, stand: 65, nothing: 27, lost: 6, dies: 2 },
      { min: 60, stand: 55, nothing: 30, lost: 10, dies: 5 },
      { min: 45, stand: 45, nothing: 30, lost: 15, dies: 10 },
      { min: 25, stand: 30, nothing: 30, lost: 20, dies: 20 },
      { min: 0, stand: 15, nothing: 25, lost: 25, dies: 35 },
    ],
    lostPace: -2,
    lostRetire: 0.25,       // a lost racer retires instead this often
    npcEventWeight: 1.2,    // NPCs wandering into the Palm (main event)
    breakoutCap: 5,         // NPCs promoted to named breakouts per game
  },

  // ---------------------------------------------------------------- Stand Arrows (our addition)
  arrows: {
    perGame: [6, 8],        // surface this many times (seeded)
    stages: [2, 8],         // between these stages
    // Survive the piercing (%), by Worthiness band.
    survive: [{ min: 75, p: 95 }, { min: 60, p: 88 }, { min: 45, p: 78 }, { min: 25, p: 65 }, { min: 0, p: 50 }],
    aiUseChance: 0.6,      // an AI racer with a kept Arrow uses it in a later window this often
  },

  // ---------------------------------------------------------------- Rokakaka (our addition)
  rokakaka: {
    guaranteed: 2,          // always found by human PCs, by the end of lastStage
    thirdChance: 0.35,      // a third may drop
    stages: [2, 6],
  },

  // ---------------------------------------------------------------- choices
  choices: {
    timerSeconds: 30,          // host setting (choiceTimer)
    // Expected sub events per round by the host's frequency setting.
    // At least one PC always gets one.
    subEventsPerRound: { low: 1, normal: 2.5, high: 4.5 },
    maxChancePerPc: 0.85,
    aiInCharacter: 0.8,        // AI racers pick the ★ option this often
    recentPenalty: 0.5,        // weight for the guaranteed pick if they had one last round
  },

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
    // Choice windows, for the sim's game-length estimate. A window lasts until
    // the slowest person answers (capped by the timer), plus the host's
    // announcement. Answer times are log-normal around these medians until
    // real games give us data: sim --choice-times <exported log.json>.
    choiceModel: {
      overhead: { plan: 4, sub: 3 },        // seconds of announcement per window
      medianSeconds: { plan: 12, sub: 8 },  // a typical person's answer time
      spread: 0.5,                          // log-normal sigma
    },
  },
};
