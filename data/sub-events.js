// Sub events (DESIGN.md → Choices): a decision for one PC, answered on their
// phone while the host waits. The engine picks who gets one each round
// (rules.choices), shows the prompt, then resolves the chosen option.
//
// {
//   id, title,                        // title shows on the phone
//   text: '{b} lies by the trail...', // the situation, with {a} = the PC
//   cast: { a: 'focus', b: 'npc' },   // same role format as events (see events/README.md)
//   when: { stages, terrain, rounds },
//   weight,
//   secret: false,                    // true: never named on the host waiting screen
//   options: [{
//     id, label, hint,                // hint: the trade-off, shown under the label
//     lean: { honorable: 3, ... },    // highest = "★ In character"; AI picks by it
//     tags: ['help'],                 // 'help' gives hidden Worthiness +8 ('save' too: +10)
//     outcomes: [{ weight, text, effects: { a: {...}, b: {...} }, minor? }],
//     // minor: a quiet result, shown on the Meanwhile card (phones still get it)
//   }],
// }
//
// Outcome effects use the same effect keys as events. Outcomes whose effects
// can't happen (a horse death for a Runner) are skipped. Deaths and horse
// deaths are scaled by rules.deathOdds and the racer's Stage Plan.
//
// Kill or spare, corpse parts, agents, the Devil's Palm and Valentine's offer
// arrive with their milestones (4–5) as new entries here.

const L = (honorable, ruthless, cautious, glory, opportunist) => ({ honorable, ruthless, cautious, glory, opportunist });

// ------------------------------------------------------------ helpers for families

function injuredRacer(id, { text, when, help, past, pastDies }) {
  return {
    id, title: 'Injured racer on the trail', text, cast: { a: 'focus', b: 'npc' }, when, weight: 3,
    options: [
      { id: 'help', label: 'Stop to help', hint: 'Lose time, +5 points', lean: L(5, 0.4, 2, 0.8, 1), tags: ['help', 'save'],
        outcomes: [{ weight: 1, text: help, effects: { a: { pace: -1, points: 5 } } }] },
      { id: 'past', label: 'Ride past', hint: 'Keep your pace', lean: L(0.5, 3, 1.5, 2, 2.2), tags: ['cold'],
        outcomes: [
          { weight: 3, text: past, effects: {}, minor: true },
          { weight: 1, text: pastDies, effects: { b: { dies: 'left injured on the trail' } } },
        ] },
    ],
  };
}

function shortcut(id, { title, text, when, made, hurt, horse, fell, road }) {
  const take = [
    { weight: 5, text: made, effects: { a: { pace: 2, points: 5 } } },
    { weight: 2, text: hurt, effects: { a: { injured: true, pace: -1 } } },
    { weight: 0.6, text: fell, effects: { a: { dies: 'fell taking a shortcut' } } },
  ];
  if (horse) take.push({ weight: 1.2, text: horse, effects: { a: { horse: 'dies' } } });
  return {
    id, title, text, cast: { a: 'focus' }, when, weight: 2.5,
    options: [
      { id: 'take', label: 'Take the shortcut', hint: 'Gain time, or get hurt', lean: L(1, 1.5, 0.3, 3, 2.5),
        tags: ['risky'], outcomes: take },
      { id: 'road', label: 'Stay on the road', hint: 'Safe, no gain', lean: L(2, 1, 4, 0.5, 1.2),
        outcomes: [{ weight: 1, text: road, effects: {}, minor: true }] },
    ],
  };
}

function hazard(id, { title, text, when, through, hurt, died, cause, horse, shelter }) {
  const push = [
    { weight: 4, text: through, effects: { a: { pace: 1 } } },
    { weight: 2, text: hurt, effects: { a: { injured: true } } },
    { weight: 0.7, text: died, effects: { a: { dies: cause } } },
  ];
  if (horse) push.push({ weight: 1, text: horse, effects: { a: { horse: 'dies' } } });
  return {
    id, title, text, cast: { a: 'focus' }, when, weight: 3,
    options: [
      { id: 'push', label: 'Push through', hint: 'Keep your pace, risk injury', lean: L(1, 1.5, 0.2, 3, 1.2),
        tags: ['risky'], outcomes: push },
      { id: 'shelter', label: 'Take shelter', hint: 'Safe, lose time', lean: L(2, 0.8, 4, 0.3, 1.5),
        outcomes: [{ weight: 1, text: shelter, effects: { a: { pace: -1 } }, minor: true }] },
    ],
  };
}

export const SUB_EVENTS = [
  // ------------------------------------------------------------ injured racer
  injuredRacer('sub-injured-trail', {
    text: '{b} lies beside the trail with a broken leg, calling for help.',
    help: '{a} stops to splint the leg of {b} and gets {b.them} onto the road to town.',
    past: '{a} rides past {b}, who is still calling out.',
    pastDies: '{a} rides past {b}. Nobody else stops for {b.them} either.',
  }),
  injuredRacer('sub-injured-desert', {
    when: { terrain: ['desert'] },
    text: '{b} has collapsed in the sand, lips cracked, begging for water.',
    help: '{a} gives {b} half a canteen and sits with {b.them} until {b.they} can stand.',
    past: '{a} rides past {b} without slowing down.',
    pastDies: '{a} rides past {b}. The desert does the rest.',
  }),
  injuredRacer('sub-injured-cold', {
    when: { terrain: ['cold'] },
    text: '{b} is curled up in the snow, too cold to get back on {b.their} feet.',
    help: '{a} builds a fire for {b} and wraps {b.them} in {a.their} spare blanket.',
    past: '{a} rides past {b} and keeps {a.their} blanket.',
    pastDies: '{a} rides past {b}. By morning, the snow has covered {b.them}.',
  }),

  // ------------------------------------------------------------ risky shortcut
  shortcut('sub-shortcut-canyon', {
    title: 'A risky shortcut', when: { terrain: ['desert'] },
    text: 'A narrow gap across the canyon would save {a} half a day, if {a.they} can make the jump.',
    made: '{a} clears the canyon gap and gains half a day.',
    hurt: '{a} barely makes the canyon jump and lands hard, hurting {a.their} shoulder.',
    horse: '{a.horse} falls short of the canyon gap. {a} scrambles clear, but has to go on foot.',
    fell: '{a} tries to jump the canyon gap and falls.',
    road: '{a} takes the long way around the canyon.',
  }),
  shortcut('sub-shortcut-goat', {
    title: 'A risky shortcut', when: { terrain: ['mountains'] },
    text: 'A goat path cuts straight over the ridge. It is steep, narrow and covered in loose rock.',
    made: '{a} picks {a.their} way over the goat path and comes out ahead of the pack.',
    hurt: '{a} slips on the goat path and twists {a.their} knee.',
    horse: '{a.horse} loses its footing on the goat path and goes over the edge. {a} is on foot.',
    fell: '{a} loses {a.their} footing on the goat path and falls from the ridge.',
    road: '{a} stays on the switchbacks.',
  }),
  shortcut('sub-shortcut-ice', {
    title: 'Thin ice', when: { terrain: ['ice'] },
    text: 'Straight across the frozen Straits is hours faster than the shore road, but the ice is groaning.',
    made: '{a} crosses the ice in one nervous dash and saves hours.',
    hurt: 'The ice cracks under {a}, who drags {a.themself} out soaked and shivering.',
    horse: 'The ice gives way under {a.horse}. {a} gets out alive, but on foot.',
    fell: 'The ice gives way under {a}.',
    road: '{a} takes the long shore road around the ice.',
  }),
  shortcut('sub-shortcut-alleys', {
    title: 'A risky shortcut', when: { terrain: ['city'] },
    text: 'A newsboy offers {a} a way through the back alleys, for a coin.',
    made: '{a} cuts through the back alleys and comes out three blocks ahead.',
    hurt: '{a} is jumped in a back alley and gets away with a cracked rib.',
    fell: '{a} follows the newsboy into a back alley and is never seen again.',
    road: '{a} sticks to the main avenue.',
  }),
  shortcut('sub-shortcut-riverbed', {
    title: 'A risky shortcut', when: { terrain: ['prairie', 'forest', 'coast'] },
    text: 'A dry riverbed runs straight toward the next checkpoint, if no storm comes.',
    made: '{a} follows the riverbed and gains hours on the field.',
    hurt: '{a} hits a hidden rut in the riverbed and goes down hard.',
    horse: '{a.horse} breaks a leg in the riverbed. {a} has to go on foot.',
    fell: 'A flash flood comes down the riverbed while {a} is in it.',
    road: '{a} keeps to the trail.',
  }),

  // ------------------------------------------------------------ hazards
  hazard('sub-hazard-sandstorm', {
    title: 'Sandstorm', when: { terrain: ['desert'] },
    text: 'A wall of sand is rolling in. {a} can push through it or wait it out behind the rocks.',
    through: '{a} rides blind through the sandstorm and comes out ahead.',
    hurt: '{a} rides into the sandstorm and comes out cut and half-blind.',
    died: '{a} rides into the sandstorm and never comes out.', cause: 'lost in a sandstorm',
    horse: '{a.horse} bolts in the sandstorm and is lost. {a} walks out on foot.',
    shelter: '{a} waits out the sandstorm behind the rocks.',
  }),
  hazard('sub-hazard-blizzard', {
    title: 'Blizzard', when: { terrain: ['cold'] },
    text: 'Snow is coming down hard. {a} can push on or dig in and wait.',
    through: '{a} pushes through the blizzard while the others dig in.',
    hurt: '{a} pushes through the blizzard and loses feeling in {a.their} fingers.',
    died: '{a} pushes into the blizzard and freezes on the trail.', cause: 'froze in a blizzard',
    horse: '{a.horse} collapses in the snow. {a} goes on alone, on foot.',
    shelter: '{a} digs in and waits out the blizzard.',
  }),
  hazard('sub-hazard-stampede', {
    title: 'Stampede', when: { terrain: ['prairie'] },
    text: 'Thunder on the horizon: a buffalo herd is stampeding across the trail ahead.',
    through: '{a} races the stampede across the trail and makes it.',
    hurt: '{a} is clipped by the stampede and thrown to the ground.',
    died: '{a} is caught in the buffalo stampede.', cause: 'trampled in a stampede',
    horse: '{a.horse} is trampled in the stampede. {a} crawls clear, on foot.',
    shelter: '{a} waits for the herd to pass.',
  }),
  hazard('sub-hazard-fog', {
    title: 'Fog', when: { terrain: ['forest', 'coast', 'lake'] },
    text: 'A thick fog has come down. {a} can ride on blind or wait for it to lift.',
    through: '{a} rides through the fog by compass and comes out on course.',
    hurt: '{a} rides into a low branch in the fog.',
    died: '{a} rides off a bluff in the fog.', cause: 'rode off a bluff in the fog',
    shelter: '{a} waits for the fog to lift.',
  }),
  hazard('sub-hazard-fire', {
    title: 'Fire', when: { terrain: ['city'] },
    text: 'A warehouse fire is spreading across the street ahead.',
    through: '{a} gallops through the smoke and past the fire.',
    hurt: '{a} gets through the fire with bad burns.',
    died: 'A burning wall comes down on {a}.', cause: 'caught in a fire',
    shelter: '{a} waits for the fire brigade to clear the street.',
  }),
  hazard('sub-hazard-flood', {
    title: 'Flash flood', when: { stages: [1, 2, 3, 4, 7, 8] },
    text: 'The river ahead is rising fast. {a} can try to ford it now or wait for the water to drop.',
    through: '{a} fords the river just before the flood hits.',
    hurt: '{a} is swept against the rocks while fording the river.',
    died: '{a} is swept away fording the flooded river.', cause: 'drowned in a flash flood',
    horse: '{a.horse} is swept away in the flood. {a} reaches the far bank on foot.',
    shelter: '{a} waits for the river to drop.',
  }),

  // ------------------------------------------------------------ worn out
  {
    id: 'sub-spent-horse', title: 'Your horse is spent', weight: 2.5,
    text: '{a.horse} is lathered and stumbling. {a} can rest {a.them} or push on.',
    cast: { a: { is: 'focus', hasHorse: true } },
    options: [
      { id: 'rest', label: 'Rest the horse', hint: 'Lose time', lean: L(3, 0.5, 4, 0.5, 1.5),
        outcomes: [{ weight: 1, text: '{a} walks {a.horse} for an afternoon and lets the horse recover.', effects: { a: { pace: -1 } }, minor: true }] },
      { id: 'push', label: 'Push on', hint: 'Keep your pace, risk the horse', lean: L(0.5, 3, 0.3, 3, 2), tags: ['risky'],
        outcomes: [
          { weight: 3, text: '{a} pushes {a.horse} on, and the horse finds a second wind.', effects: { a: { pace: 1 } } },
          { weight: 1.5, text: '{a} pushes {a.horse} too hard, and the horse drops dead under {a.them}. {a} is on foot.', effects: { a: { horse: 'dies' } } },
        ] },
    ],
  },
  {
    id: 'sub-sore-legs', title: 'Your legs are giving out', weight: 2.5,
    text: "{a}'s feet are raw and {a.their} legs are cramping. {a.They} can rest or keep running.",
    cast: { a: { is: 'focus', mount: 'runner' } },
    options: [
      { id: 'rest', label: 'Rest', hint: 'Lose time', lean: L(3, 0.5, 4, 0.5, 1.5),
        outcomes: [{ weight: 1, text: '{a} binds {a.their} feet and rests for half a day.', effects: { a: { pace: -1 } }, minor: true }] },
      { id: 'run', label: 'Keep running', hint: 'Keep your pace, risk a leg injury', lean: L(0.5, 3, 0.3, 3, 2), tags: ['risky'],
        outcomes: [
          { weight: 3, text: '{a} runs through the pain and finds {a.their} stride again.', effects: { a: { pace: 1 } } },
          { weight: 1.5, text: '{a} keeps running until {a.their} leg gives out.', effects: { a: { injured: true } } },
        ] },
    ],
  },

  // ------------------------------------------------------------ sprint challenge
  ...['canon', 'npc'].map((kind) => ({
    id: `sub-sprint-${kind}`, title: 'Sprint challenge', weight: kind === 'canon' ? 1.5 : 2,
    when: { rounds: ['day', 'finish'] },
    text: '{b} pulls alongside {a} and nods at the next checkpoint. A race?',
    cast: { a: 'focus', b: kind === 'canon' ? { is: 'named', tier: 'canon' } : 'npc' },
    options: [
      { id: 'race', label: 'Race them', hint: 'Win +10 points, or fall behind', lean: L(1, 2, 0.3, 4, 2), tags: ['sprint'],
        outcomes: [
          { weight: 5, text: '{a} beats {b} to the checkpoint and takes the sprint bonus.', effects: { a: { points: 10, pace: 1 } } },
          { weight: 4, text: '{b} beats {a} to the checkpoint, and {a} has burned {a.their} legs for nothing.', effects: { a: { pace: -1 }, b: { pace: 1 } } },
          { weight: 1, text: '{a} pushes too hard racing {b} and comes off at full speed.', effects: { a: { injured: true } } },
        ] },
      { id: 'decline', label: 'Let them go', hint: 'Safe, no gain', lean: L(1.5, 0.5, 4, 0.2, 1),
        outcomes: [{ weight: 1, text: '{a} waves {b} on and keeps {a.their} own pace.', effects: {}, minor: true }] },
    ],
  })),

  // ------------------------------------------------------------ bad injury
  {
    id: 'sub-bad-injury', title: 'Your injury is getting worse', weight: 6,
    text: "{a}'s wound has opened up again. Every mile hurts more.",
    cast: { a: { is: 'focus', injured: true } },
    options: [
      { id: 'ride', label: 'Keep riding', hint: 'Keep your pace, risk your life', lean: L(1.5, 2.5, 0.3, 3, 1.5), tags: ['risky'],
        outcomes: [
          { weight: 4, text: '{a} grits {a.their} teeth and keeps going.', effects: {} },
          { weight: 1, text: "{a}'s wound gets worse, and {a.they} collapse{a:s} on the trail.", effects: { a: { dies: 'died of wounds' } } },
        ] },
      { id: 'heal', label: 'Stop and heal', hint: 'Lose a lot of time', lean: L(2, 1, 4, 0.5, 2),
        outcomes: [{ weight: 1, text: '{a} finds a doctor in town and loses a day getting patched up.', effects: { a: { heal: true, pace: -2 } } }] },
      { id: 'retire', label: 'Retire', hint: 'Out of the points race, but alive', lean: L(0.1, 0.05, 0.6, 0.02, 0.2),
        outcomes: [{ weight: 1, text: '{a} decides {a.their} race is over and retires.', effects: { a: { retires: true } } }] },
    ],
  },
];

// Hunt a rival (Stage Plan): a guaranteed sprint showdown with the target.
// Both choose if both are PCs. The engine scores it as a contest (skill +
// option bonus + randomness). Milestone 5 turns it into a real fight.
// Showdowns don't kill yet. When milestone 5 fights can end in a kill, the
// hunter's kill counts as 'kill-started' (rules.worthiness.killStarted).
export const RIVAL = {
  killKind: 'kill-started',
  title: 'Rival showdown',
  hunterText: '{a} has finally caught up with {b}. Time to settle it.',
  targetText: '{a} has been hunting you, and now {a.they} {a:is/are} right beside you.',
  hunter: [
    { id: 'all-out', label: 'Go all out', hint: 'Best odds to win, risk injury', bonus: 8, risk: 0.15, lean: L(1, 3, 0.4, 4, 2) },
    { id: 'smart', label: 'Ride smart', hint: 'Safer, lower odds', bonus: 0, risk: 0, lean: L(2, 1, 4, 1, 2.2) },
  ],
  target: [
    { id: 'race', label: 'Race them', hint: 'Win +5 points', bonus: 4, risk: 0.08, lean: L(2, 3, 0.8, 4, 1.5) },
    { id: 'refuse', label: "Don't take the bait", hint: 'They gain a little time on you', bonus: 0, risk: 0, lean: L(1.5, 0.3, 4, 0.1, 2) },
  ],
  contestSd: 12,
  win: { points: 5, pace: 1 },   // plain sprint challenges keep +10
  lose: { pace: -1 },
  lines: {
    win: '{a} hunts down {b} and beats {b.them} in a sprint showdown.',
    lose: '{a} hunts down {b}, but {b} wins the sprint showdown.',
    refused: '{a} catches up with {b}, but {b} refuses to race. {a} rides on ahead.',
    hurt: ' {x} pushes too hard and gets hurt.',
    gone: "{a}'s rival is gone.",
    missed: '{a} never catches up with {b} this stage.',
  },
};

// ------------------------------------------------------------ milestone 4: Stands
// These prompts resolve in code (js/engine/choices.js), not from outcome
// lists: the Devil's Palm uses rules.palm.bands, the Arrow rules.arrows,
// and Rokakaka removes a Stand. Arrow and Rokakaka prompts are SECRET: never
// named on the host, and their results never reach the stream (except a death).

// The Edge of the Devil's Palm: random in Stages 2–3 for racers without a
// Stand, and guaranteed once that stage by the "Seek the Devil's Palm" plan.
export const PALM = {
  id: 'sub-palm', title: "The edge of the Devil's Palm", special: 'palm', weight: 7,
  text: "The ground ahead drops away into a Devil's Palm. People say it gives some riders a gift, and swallows the rest.",
  textHasStand: "You've found a Devil's Palm. You already have a Stand; the Palm has nothing more to give you.",
  cast: { a: { is: 'focus', hasStand: false } }, when: { stages: [2, 3] },
  options: [
    { id: 'in', label: 'Go in', hint: 'A Stand, nothing, lost, or death. Worthiness decides.', lean: L(1.2, 2, 0.3, 3, 2.5) },
    { id: 'back', label: 'Turn back', hint: 'Safe', lean: L(2, 1, 4, 0.5, 1.2) },
  ],
  lines: {
    out: "{a} walks into the Devil's Palm and walks back out at dusk, silent.",
    lost: "{a} loses a day walking in circles in the Devil's Palm.",
    retired: "{a} wanders the Devil's Palm for days, and gives up the race.",
    dies: "{a} walks into the Devil's Palm and never comes out.",
    back: "{a} turns back at the edge of the Devil's Palm.",
    missed: "{a} searches for the Devil's Palm all stage, but never finds it.",
  },
};

export const ARROW = {
  id: 'sub-arrow', title: 'You found a Stand Arrow', special: 'arrow', secret: true,
  text: 'An old arrowhead glints in the dirt, still sharp. You can feel it humming.',
  textHasStand: 'An old arrowhead glints in the dirt, still sharp. The Arrow won\'t take: you already have a Stand.',
  options: [
    { id: 'pierce', label: 'Pierce yourself now', hint: 'Survive it and awaken a Stand. Worthiness decides.', lean: L(1, 2.5, 0.4, 3, 2), noStandOnly: true },
    { id: 'keep', label: 'Keep it for later', hint: 'Use it from your phone in any decision', lean: L(2, 1.5, 2, 1, 3) },
    { id: 'leave', label: 'Leave it', hint: 'Walk away', lean: L(1.2, 0.3, 1.5, 0.3, 0.3) },
  ],
  deathLine: '{a} is found at dawn with a strange arrow through {a.their} chest.',
  deathCause: 'pierced by a strange arrow',
};

export const ROKAKAKA = {
  id: 'sub-rokakaka', title: 'You found a Rokakaka fruit', special: 'rokakaka', secret: true,
  text: 'A strange fruit grows from a dead branch. Eat it, and your Stand is gone: equivalent exchange.',
  textNoStand: 'A strange fruit grows from a dead branch. They say it takes a Stand away from whoever eats it.',
  options: [
    { id: 'eat', label: 'Eat it now', hint: 'Your Stand leaves you, for good', lean: L(0.3, 0.3, 0.5, 0.3, 0.4), standOnly: true },
    { id: 'keep', label: 'Keep it', hint: 'Use it from your phone in any decision', lean: L(2, 2, 2, 2, 3) },
    { id: 'leave', label: 'Leave it', hint: 'Walk away', lean: L(1, 1, 1, 1, 1) },
  ],
};
