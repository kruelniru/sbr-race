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
    base: -7,              // flat modifier every stage (calibrate with the sim)
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
  deathOdds: { pc: 0.46, canon: 0.35, npc: 1 },
  canonImmuneStages: [1],  // canon racers can't die in these stages

  // Personality nudges: multiply an event's weight by tag for the FOCUS racer.
  personalityLean: {
    // 'kill' = kills they start (kill-started / kill-cruel events). Tuned so
    // end-of-race Worthiness lands near Honorable 80, Cautious 75, Glory 60,
    // Opportunist 60, Ruthless 35 (sim).
    honorable: { help: 0.9, spare: 1.15, kill: 0.45, sabotage: 0.3, cold: 1.3 },
    ruthless: { kill: 2.2, sabotage: 2.4, cold: 2, help: 0.4, spare: 0.3 },
    cautious: { risky: 0.5, kill: 0.7, hazard: 0.8, help: 0.72, spare: 0.72 },
    glory: { risky: 1.8, sprint: 2, pace: 1.3, cold: 2.4, help: 0.5, sabotage: 1.3 },
    opportunist: { sabotage: 2.4, kill: 1.6, cold: 2, sprint: 1.2, help: 0.7 },
  },
  // Canon racers rarely start kills and often help (on top of personality).
  canonLean: { kill: 0.35, help: 1.6, sabotage: 0.4, spare: 1.5 },

  // ---------------------------------------------------------------- worthiness
  // Hidden 0–100 stat. The owner's phone shows a bar (no number) from
  // milestone 4; nobody else sees it until the finale's secrets reveal.
  // Canon racers have their own value in canon-racers.js (worthiness).
  worthiness: {
    // PCs (people and AI) start by personality; canon and NPCs by range.
    byPersonality: { honorable: 60, cautious: 55, opportunist: 50, glory: 50, ruthless: 40 },
    start: { pc: [50, 50], canon: [50, 80], npc: [5, 30] }, // pc: fallback only
    help: 8,          // help someone (events / choices tagged 'help')
    save: 10,         // save a life (tagged 'help' + 'save'); instead of help, not on top
    spare: 12,        // spare someone you beat (sparedBy; a defender who drives off the attacker)
    spareStarted: 4,  // ...but in a fight you started yourself (attacking and sparing isn't mercy)
    palmSurvive: 5,   // walk out of the Devil's Palm alive
    ridePast: -3,     // ride past someone who needs help (tagged 'cold'; sub event 'Ride past')
    sabotage: -8,     // sabotage or cheat (tagged 'sabotage'; see KILL_KINDS / HARM_KINDS)
    halfAbove: 80,    // above this, gains are halved (rounded down); losses stay full
    // Kills, for the racer with the kill credit (`by`). Every kill event has
    // exactly one of these tags (tests/stands.test.js checks it).
    killDefense: 0,   // 'kill-defense': they attacked you (or an accident)
    killStarted: -8,  // 'kill-started': you attacked, hunted or ambushed
    killCruel: -12,   // 'kill-cruel': helpless, fleeing or asleep (instead of -8)
    // Milestone 5 (recorded now, not used yet):
    givePart: 15,     // give away a corpse part
    stealPart: -8,    // steal a part
    abandonAlly: -12, // abandon an ally
    joinValentine: -30,
    hintAt: 8,        // a change this big gives the phone a private hint line
    softHintAt: 3,    // 3–7 gets a softer one ("You feel steady." / "Something nags at you.")
    barSteps: 20,     // the phone gets a coarse level (0–20), never the number
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
  // Fight target (milestone 5): a Stand user beats an equal racer without one
  // about 57% / 63% / 70% of decided fights (the sim prints it).
  standTier: {
    common: { placement: 1, hazardDeath: 0.92, fightBonus: 2.5 },
    rare: { placement: 1, hazardDeath: 0.85, fightBonus: 5 },
    legendary: { placement: 1.5, hazardDeath: 0.88, fightBonus: 7.5 }, // fightBonus: added to fight scores (milestone 5)
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

  // A Stand tier's share of PC race wins may be at most this many times its
  // share of PCs (sim check; survivorship alone puts every tier near 1.7x).
  tierWinLimit: { common: 2, rare: 2, legendary: 2.5 },

  // ---------------------------------------------------------------- fights (milestone 5)
  // score = skill (NPCs npcSkill) + Stand fightBonus + Spin + ally + noise.
  // Nobody wins automatically: noise sd 12 keeps a Legendary Stand user at
  // about 75% against an equal racer without one.
  fights: {
    npcSkill: 50,
    sd: 12,
    spin: 6,                   // Gyro and Wekapipo
    spinUsers: ['gyro', 'wekapipo'],
    ally: 5,                   // your ally rides in to help...
    allyChance: 0.5,           // ...this often
    close: 4,                  // a margin under this: both get hurt
    fleeEscape: 0.55,          // a defender who flees gets away this often
    caughtPenalty: 6,          // ...and fights at this minus if caught
    killEscape: 0.15,          // a loser the winner tries to kill still gets away (hurt)
    killMargin: 14,            // a kill needs a clear win; closer, the loser gets away hurt (or is driven off)
    winPoints: 5, winPace: 1,  // a rival showdown won (plain sprint challenges keep +10)
    // What racers nobody controls do when they win: weights for kill / spare / horse.
    npcWins: { kill: 6, spare: 2, horse: 2 },
    canonWins: { kill: 1, spare: 8, horse: 1 },
    // What they do when attacked: fight-kill / fight-spare / flee.
    npcDefends: { 'fight-kill': 5, 'fight-spare': 2, flee: 3 },
    canonDefends: { 'fight-kill': 1, 'fight-spare': 7, flee: 2 },
  },

  // ---------------------------------------------------------------- horses (milestone 5)
  horses: {
    // Placement modifier by quality. Canon racers' own horses are already in
    // their skill, so a canon racer's modifier counts from their first horse.
    quality: { nag: -4, sound: 0, fine: 3, thoroughbred: 6 },
    start: { nag: 20, sound: 60, fine: 20 },          // PCs' first horse (%)
    canonThoroughbreds: ['Slow Dancer', 'Valkyrie', 'Silver Bullet'], // other canon horses are fine
    // The horse trader, in the Stage Plan window of stages that start in a town.
    townStages: [5, 6, 8, 9],  // leaving Kansas City, Chicago, Philadelphia, Union Beach
    prices: { sound: 40, fine: 70 },
    riderless: { nag: 30, sound: 55, fine: 15 },       // a dead racer's horse (%)
    doubleRide: 0.5,           // on foot with an ally on a horse: this share of the on-foot penalty
  },

  // ---------------------------------------------------------------- alliances (milestone 5)
  alliances: {
    npcAccept: 0.6,            // a named NPC agrees to ride with you
    // Canon racers by character fit: accept if Worthiness >= min, with this chance.
    canon: {
      gyro: { min: 60, p: 0.9 },
      johnny: { min: 55, p: 0.8 },
      diego: { min: 0, p: 0.1, topFive: 0.4 },  // rarely, unless you're near the top
      hotpants: { min: 65, p: 0.6 },
      sandman: { min: 50, p: 0.5 },
      mountaintim: { min: 50, p: 0.8 },
      pocoloco: { min: 0, p: 0.8 },
      wekapipo: { min: 60, p: 0.6 },
      norisuke: { min: 40, p: 0.7 },
      avdul: { min: 40, p: 0.6 },
      default: { min: 0, p: 0.15 },             // Valentine's side, Mrs. Robinson...
    },
  },

  // ---------------------------------------------------------------- trading (milestone 5)
  trading: {
    // How much AI racers value things when deciding on a trade.
    value: { horse: 5, horseMounted: 1, arrow: 3, arrowHasStand: 0, rokakaka: 1, rokakakaHasStand: 2 },
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
