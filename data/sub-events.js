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
// Corpse parts, agents and Valentine (milestone 5b) are at the end of this file.

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
    through: '{a} races through the smoke and past the fire.',
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

  // ------------------------------------------------------------ milestone 5: alliances
  {
    id: 'sub-ally-trouble', title: 'Your ally is in trouble', weight: 2,
    text: '{b} is pinned under a fallen horse, and the rest of the field is closing in.',
    cast: { a: 'focus', b: { is: 'ally', hasHorse: true } },
    options: [
      { id: 'help', label: 'Stop and help', hint: 'Lose time', lean: L(5, 0.6, 2, 1.5, 1.2), tags: ['help'],
        outcomes: [{ weight: 1, text: '{a} drags {b} clear and loses an hour doing it.', effects: { a: { pace: -1 } } }] },
      { id: 'abandon', label: 'Ride on without them', hint: 'Keep your pace; the alliance ends', lean: L(0.1, 2.5, 0.6, 1.5, 2),
        outcomes: [{ weight: 1, text: '{a} rides on and leaves {b} under the horse.', effects: { a: { breakAlly: 'abandoned' }, b: { injured: true, pace: -1 } } }] },
    ],
  },
  {
    // The same moment for an ally who runs (milestone 7a: no horse words for Runners).
    id: 'sub-ally-trouble-runner', title: 'Your ally is in trouble', weight: 2,
    text: '{b} is pinned under a rockslide, and the rest of the field is closing in.',
    cast: { a: 'focus', b: { is: 'ally', mount: 'runner' } },
    options: [
      { id: 'help', label: 'Stop and help', hint: 'Lose time', lean: L(5, 0.6, 2, 1.5, 1.2), tags: ['help'],
        outcomes: [{ weight: 1, text: '{a} heaves the rocks off {b} and loses an hour doing it.', effects: { a: { pace: -1 } } }] },
      { id: 'abandon', label: 'Go on without them', hint: 'Keep your pace; the alliance ends', lean: L(0.1, 2.5, 0.6, 1.5, 2),
        outcomes: [{ weight: 1, text: '{a} goes on and leaves {b} under the rocks.', effects: { a: { breakAlly: 'abandoned' }, b: { injured: true, pace: -1 } } }] },
    ],
  },
  {
    id: 'sub-ally-betray', title: 'A chance to betray', weight: 1.2,
    text: '{b} is fast asleep, and {b.their} horse is tied right next to you.',
    cast: { a: { is: 'focus', mount: 'horse' }, b: { is: 'ally', hasHorse: true } },
    options: [
      { id: 'betray', label: 'Take their horse and go', hint: 'The alliance ends', lean: L(0.05, 3, 0.2, 0.5, 2.5),
        outcomes: [{ weight: 1, text: '{a} slips away in the night on {b.horse}, leaving {b} on foot.', effects: { a: { breakAlly: 'betrayed' }, b: { stolenBy: 'a' } } }] },
      { id: 'stay', label: 'Stay loyal', hint: 'Nothing changes', lean: L(4, 0.6, 3, 2, 1),
        outcomes: [{ weight: 1, text: '{a} keeps watch while {b} sleeps.', effects: {}, minor: true }] },
    ],
  },
];

// ------------------------------------------------------------ milestone 5: fights
// Every fight asks both sides at once (js/engine/fights.js). The attacker
// says what happens "If you win"; the defender fights back or flees.
// Every option says it's a fight, so "let them go" never reads as "skip it".
// `verb`: 'Attack' when you can still say no (A chance to strike), 'Fight'
// when the fight is happening anyway (Hunt a rival).
export const fightWin = (verb) => [
  { id: 'kill', label: `${verb}: if you win, kill them`, hint: 'Worthiness drops', lean: L(0.1, 4, 0.4, 1.2, 2) },
  { id: 'spare', label: `${verb}: if you win, let them go`, hint: 'Mercy', lean: L(4, 0.5, 3, 2, 1.5) },
  { id: 'horse', label: `${verb}: if you win, take their horse`, hint: 'They go on foot', lean: L(0.6, 2, 0.8, 1, 3), needsHorse: true },
  // Milestone 5b: you never know if they carry one. Same line on stream either way.
  { id: 'part', label: `${verb}: if you win, search them`, hint: 'Take a corpse part if they carry one', lean: L(0.2, 1.2, 0.3, 0.6, 1.6) },
];
export const FIGHT_WIN = fightWin('Attack');
export const FIGHT_DEFEND = [
  { id: 'fight-kill', label: 'Fight back: if you win, kill them', hint: 'Self-defense', lean: L(0.3, 4, 0.5, 2, 2) },
  { id: 'fight-spare', label: 'Fight back: if you win, let them go', hint: 'Mercy if you win', lean: L(4, 0.6, 1.5, 2.5, 1.5) },
  { id: 'flee', label: 'Flee', hint: 'Often gets away; caught, you fight at a disadvantage', lean: L(1, 0.4, 4, 0.3, 2) },
  // Milestone 5b: they get what they chose if they'd won (a kill counts as cruel).
  { id: 'surrender', label: 'Give up without a fight', hint: 'They get what they came for', lean: L(0.2, 0.05, 0.6, 0.05, 0.3) },
];

// Hunt a rival (Stage Plan): a guaranteed fight with the target, started by
// the hunter (a kill costs Worthiness −8, rules.worthiness.killStarted).
// A PC target chooses at the same time; canon and NPC targets by tier.
export const RIVAL = {
  killKind: 'kill-started',
  title: 'Rival showdown',
  hunterText: '{a} has finally caught up with {b}. It comes to a fight.',
  targetText: '{a} has been hunting you, and now {a.they} {a:is/are} right beside you.',
  hunter: fightWin('Fight'),
  target: FIGHT_DEFEND,
  lines: {
    gone: "{a}'s rival is gone.",
    missed: '{a} never catches up with {b} this stage.',
  },
};

// Attacked on the trail: the PC defends. The attacker is an NPC.
export const ATTACKED = {
  id: 'sub-attacked', title: 'Attacked on the trail', special: 'fight', fightKind: 'attacked',
  cast: { a: 'focus', b: 'npc' }, weight: 2.2,
  text: '{b} rides at {a} out of nowhere, knife drawn.',
  options: FIGHT_DEFEND,
};

// A chance to strike: the PC may attack. A PC target answers at the same time.
export const STRIKE = {
  id: 'sub-strike', title: 'A chance to strike', special: 'fight', fightKind: 'strike', leanTag: 'kill',
  cast: { a: 'focus', b: { is: 'named', notAlly: true } }, weight: 1.6,
  text: "{b} is alone at a water hole and hasn't seen {a} yet.",
  targetText: '{a} is riding up on you at the water hole, hand on {a.their} gun.',
  options: [
    { id: 'leave', label: "Don't attack: leave them be", hint: 'Ride on. Nothing happens.', lean: L(4, 0.2, 3, 1, 1.2) },
    ...FIGHT_WIN,
  ],
};

// ------------------------------------------------------------ milestone 5: horses
export const HORSE_TWO = {
  id: 'horse-two', title: 'Your second horse is gone',
  text: "You've lost two horses now. You can go on, on foot, far behind the pack, or retire with your life.",
  options: [
    { id: 'foot', label: 'Go on, on foot', hint: 'Much worse placements', lean: L(2, 3, 1, 4, 2) },
    { id: 'retire', label: 'Retire', hint: 'Out of the points race, alive', lean: L(0.3, 0.1, 1.2, 0.05, 0.4) },
  ],
  lines: {
    foot: '{a} loses a second horse and goes on, on foot.',
    retire: '{a} loses a second horse and retires from the race.',
  },
};

// ------------------------------------------------------------ milestone 5: alliances
export const ALLY_INVITE = {
  id: 'ally-invite', title: 'Ride together?',
  text: '{b} asks to ride with you. Allies help in fights, share food, and let each other ride double.',
  options: [
    { id: 'accept', label: 'Ride together', hint: 'One ally at a time', lean: L(2.5, 0.6, 2, 1, 1.5) },
    { id: 'refuse', label: 'Ride alone', hint: 'Turn them down', lean: L(0.6, 1.5, 1, 1.2, 1) },
  ],
  lines: {
    formed: '{a} and {b} agree to ride together.',
    refused: '{b} asks {a} to ride together. {a} turns {b.them} down.',
    busy: '{b} asks {a} to ride together, but {a} already rides with someone.',
  },
};

// ------------------------------------------------------------ milestone 5: trading
// Secret: the stream never hears about it. The receiver answers in their next window.
export const TRADE = {
  id: 'trade', title: 'A trade offer', secret: true,
  options: [
    { id: 'accept', label: 'Accept', hint: 'It happens with this round' },
    { id: 'refuse', label: 'Refuse', hint: 'Nothing changes' },
  ],
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
  textHasStand: "You've found a Devil's Palm. You already have a Stand, but they say the Palm sometimes hides a corpse part.",
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

// ------------------------------------------------------------ milestone 5b: corpse parts
// Resolved in code (js/engine/corpse.js). Finds and steals are SECRET.
export const FOUND_PART = {
  id: 'found-part', title: 'You found a corpse part', secret: true,
  text: "Something lies half-buried by the trail: {part} of the Saint's Corpse. It's warm to the touch.",
  options: [
    { id: 'keep', label: 'Keep it', hint: 'It merges with you: maybe a Stand, maybe rejection. Agents hunt holders.', lean: L(1.5, 3, 0.8, 3, 3) },
    { id: 'hide', label: 'Hide it on you', hint: "Wrapped, it can't touch you: no Stand, no rejection. Agents notice it less.", lean: L(1.5, 1, 4, 0.8, 1.5) },
    { id: 'give', label: 'Give it to someone', hint: 'A good deed. Pick who.', lean: L(3, 0.1, 0.8, 0.3, 0.3), needsTarget: true },
  ],
};

export const STEAL_PART = {
  id: 'steal-part', title: 'A chance to steal', secret: true,
  text: '{b} is asleep by the fire. Something in {b.their} pack glows faintly.',
  options: [
    { id: 'take', label: 'Take it', hint: 'Worthiness drops. They might wake.', lean: L(0.1, 3, 0.5, 1, 3) },
    { id: 'leave', label: 'Leave it', hint: 'Let them sleep', lean: L(4, 0.5, 2, 1.5, 1) },
  ],
};

// ------------------------------------------------------------ milestone 5b: Valentine
// Agents ambush holders (and sometimes anyone). Not secret: the stream sees
// the ambush, never whether a part changed hands.
export const AMBUSH = {
  id: 'agent-ambush', title: 'Ambushed by agents',
  text: "{b} steps into the trail ahead of {a}. \"The President would like a word.\"",
  options: FIGHT_DEFEND.map((o) => o.id === 'surrender'
    ? { ...o, label: 'Let them search you', hint: 'They take a corpse part if you carry one, then ride off', lean: L(1.5, 0.3, 3, 0.3, 1.5) }
    : o),
};

export const FUNNY_VALENTINE = {
  id: 'funny-valentine', title: 'Funny Valentine',
  text: 'The President himself is waiting on the road, alone. "Hand over what belongs to America."',
  options: [
    { id: 'face', label: 'Face him', hint: 'Win and drive him off: +50 points. Lose, and you may die or lose every part you carry.', lean: L(1, 2, 0.2, 4, 0.8) },
    { id: 'avoid', label: 'Avoid him', hint: 'Take the long way round. Lose time.', lean: L(2, 1, 4, 0.5, 3) },
  ],
  lines: {
    open: '{y} stands {y.their} ground against Funny Valentine.',
    win: ' {y} drives the President off!',
    avoid: '{a} leaves the road and takes the long way round.',
  },
};

export const VALENTINE_OFFER = {
  id: 'valentine-offer', title: 'A man in a dark hat', secret: true,
  text: 'A man in a dark hat rides beside you for a mile. "The President could use someone like you. Fresh horses at every relay, his agents off your back, and when he holds the Corpse, a share of the glory."',
  // Runners never get horse words (milestone 7a).
  textRunner: 'A man in a dark hat falls into step beside you for a mile. "The President could use someone like you. Water and a clear road at every relay, his agents off your back, and when he holds the Corpse, a share of the glory."',
  options: [
    { id: 'join', label: 'Join Valentine', hint: 'Secret. Agents never attack you, help at every relay, a Stand if you have none, errands. Worthiness drops hard.', lean: L(0.05, 3, 0.4, 1, 3) },
    { id: 'refuse', label: 'Refuse', hint: 'He tips his hat and is gone', lean: L(5, 0.6, 3, 1.5, 0.8) },
  ],
};

export const ERRAND = {
  id: 'valentine-errand', title: "Valentine's errand", secret: true,
  text: 'A note slipped into your pack: "Bring me what they carry." Next round, you go out in a dark hat with two agents at your back.',
  options: [
    { id: 'ride', label: 'Ride the errand', hint: 'Ambush them, masked. Win and take a corpse part for the President, or their horse.', lean: L(0.3, 3, 0.5, 2, 3), needsTarget: true },
    { id: 'skip', label: 'Not this time', hint: 'Nothing happens', lean: L(4, 0.5, 3, 1, 0.8) },
  ],
};

// ------------------------------------------------------------ milestone 6b: the Final Stage
// Group fights: everyone who says yes fights together (js/engine/final-stage.js).
export const BRING_DOWN = {
  id: 'bring-down', title: 'Bring them down',
  text: "{b} holds the Saint's Corpse. Others are riding for it right now. Ride with them?",
  options: [
    { id: 'join', label: 'Ride with them', hint: 'One fight, all of you together. Win and you each take a corpse part.', lean: L(1, 3, 0.6, 3, 3) },
    { id: 'stay', label: 'Stay out of it', hint: 'Keep riding', lean: L(2, 0.5, 3, 0.5, 0.8) },
  ],
};
export const VALENTINE_RIDE = {
  id: 'valentine-ride', title: 'The President rides', secret: true,
  text: 'Funny Valentine is going after {b} and the Corpse himself. Ride at his side, in a dark hat?',
  options: [
    { id: 'join', label: 'Ride with him', hint: 'Secret. You help him take the Corpse.', lean: L(1, 3, 0.8, 2, 2.5) },
    { id: 'stay', label: 'Stay back', hint: 'Nothing happens', lean: L(2, 0.6, 2, 1, 1) },
  ],
};
export const VALENTINE_REMATCH = {
  id: 'valentine-rematch', title: 'The other Valentine',
  text: 'Another Funny Valentine has stepped out of another world, and he is coming. Face him together?',
  options: [
    { id: 'join', label: 'Face him', hint: 'One fight, all of you together. Win and he dies for good: a big bonus.', lean: L(2, 2, 0.6, 4, 1.5) },
    { id: 'stay', label: 'Stay out of it', hint: 'Keep riding', lean: L(1, 1, 3, 0.3, 1.5) },
  ],
};

// ------------------------------------------------------------ milestone 6d (secret: see DESIGN.md → Secret endings)
export const REQUIEM = {
  id: 'requiem', title: 'Your Stand is listening', secret: true,
  text: 'The Arrow in your pack is humming, and your Stand is humming back. You could drive the Arrow into it.',
  options: [
    { id: 'pierce', label: 'Pierce your Stand', hint: 'There is no going back', lean: L(2, 3, 1, 4, 3) },
    { id: 'wait', label: 'Not yet', hint: 'Nothing happens', lean: L(1, 0.5, 2, 0.3, 0.5) },
  ],
};

export const ERRAND_TARGET = {
  id: 'errand-target', title: 'Someone is coming for you',
  text: 'A rider in a dark hat is closing in on you, with two more riders close behind.',
  options: AMBUSH.options,
};

// ------------------------------------------------------------ milestone 7b: good-aligned drama, the camp thief
// They play out on stream (never secret) and lean toward Honorable and Cautious
// players (leanTag 'heroic', rules.personalityLean), the way strikes lean toward Ruthless.
// 'rescue' and 'guard' are resolved in code (js/engine/choices.js); the hard
// choices are ordinary outcomes.
const rescueOptions = [
  { id: 'kill', label: 'Ride in: if you win, kill them', hint: 'Save them. A real fight: you might get hurt, or worse.', lean: L(0.6, 3, 0.4, 2, 1.5) },
  { id: 'spare', label: 'Ride in: if you win, let them go', hint: 'Save them, and show mercy', lean: L(4, 0.6, 2.5, 2, 1.2) },
  { id: 'leave', label: 'Not your fight', hint: 'Ride on', lean: L(0.3, 2, 1.5, 0.5, 2.5), tags: ['cold'] },
];
export const GOOD_SUBS = [
  {
    id: 'sub-rescue', title: 'A rescue', special: 'rescue', leanTag: 'heroic', weight: 1.6,
    cast: { a: 'focus', b: 'npc', c: 'npc' },
    text: '{b} has {c} on the ground by the creek, a gun at {c.their} head and a hand in {c.their} pack.',
    options: rescueOptions,
  },
  {
    id: 'sub-rescue-canon', title: 'A rescue', special: 'rescue', leanTag: 'heroic', weight: 0.8,
    cast: { a: 'focus', b: 'npc', c: { is: 'named', tier: 'canon' } },
    text: '{b} has {c} pinned against a wagon, gun drawn, and nobody else is stopping.',
    options: rescueOptions,
  },
  {
    id: 'sub-guard-ally', title: 'Stand guard', special: 'guard', leanTag: 'heroic', weight: 1.4,
    cast: { a: 'focus', b: 'ally' }, when: { rounds: ['night'] },
    text: '{b} is too hurt to keep watch tonight, and there are riders moving in the dark.',
    options: [
      { id: 'watch', label: 'Keep watch all night', hint: 'Lose time. If they come, you fight.', lean: L(4, 0.6, 3, 1.5, 1), tags: ['help'] },
      { id: 'sleep', label: 'Get some sleep', hint: 'Keep your pace', lean: L(0.4, 2, 0.8, 1, 2), tags: ['cold'] },
    ],
  },
  {
    id: 'sub-guard-stranger', title: 'Stand guard', special: 'guard', leanTag: 'heroic', weight: 1.2,
    cast: { a: 'focus', b: 'npc' }, when: { rounds: ['night'] },
    text: '{b} is camped alone and feverish near you, and there are riders moving in the dark.',
    options: [
      { id: 'watch', label: 'Keep watch over them', hint: 'Lose time. If they come, you fight.', lean: L(4, 0.4, 2.5, 1.2, 0.8), tags: ['help'] },
      { id: 'sleep', label: 'Get some sleep', hint: 'Keep your pace', lean: L(0.5, 2, 1, 1, 2), tags: ['cold'] },
    ],
  },
  {
    id: 'sub-hard-horse', title: 'A hard choice', leanTag: 'heroic', weight: 1,
    cast: { a: { is: 'focus', hasHorse: true }, b: 'npc' },
    text: '{b} has a broken leg and a wife in labor two towns over. {b.They} need{b:s} a horse, and yours is the only one in sight.',
    options: [
      { id: 'give', label: 'Give them your horse', hint: 'You go on foot. A great deed, +10 points.', lean: L(3, 0.1, 0.8, 0.6, 0.3), tags: ['help', 'save'],
        outcomes: [{ weight: 1, text: '{a} hands {a.horse} to {b} and walks on alone.', effects: { a: { horseGiven: true, points: 10 } } }] },
      { id: 'keep', label: 'Keep your horse', hint: 'Ride on', lean: L(1.5, 3, 3, 3, 3), tags: ['cold'],
        outcomes: [{ weight: 1, text: '{a} wishes {b} luck and rides on.', effects: {}, minor: true }] },
    ],
  },
  {
    id: 'sub-hard-river', title: 'A hard choice', leanTag: 'heroic', weight: 1.2,
    cast: { a: 'focus' }, when: { terrain: ['lake', 'coast', 'prairie', 'mountains', 'forest', 'desert'] },
    text: "A family's wagon is stuck in the river with children aboard, and the water is rising.",
    options: [
      { id: 'help', label: 'Go in after them', hint: 'Lose a lot of time. A great deed, +10 points.', lean: L(4, 0.2, 2, 1.5, 0.5), tags: ['help', 'save'],
        outcomes: [
          { weight: 4, text: '{a} wades in and gets every child out. It costs {a.them} half a day.', effects: { a: { pace: -3, points: 10 } } },
          { weight: 1, text: '{a} gets every child out, and comes out of the water hurt.', effects: { a: { pace: -2, points: 10, injured: true } } },
        ] },
      { id: 'past', label: 'Someone else will help', hint: 'Keep your pace', lean: L(0.3, 2.5, 1.2, 1.5, 2.5), tags: ['cold'],
        outcomes: [{ weight: 1, text: '{a} looks away from the river and keeps going.', effects: {}, minor: true }] },
    ],
  },
  {
    id: 'sub-hard-doctor', title: 'A hard choice', leanTag: 'heroic', weight: 1, when: { terrain: ['city'] },
    cast: { a: 'focus', b: 'npc' },
    text: "A doctor won't treat {b}, dying in the street, without payment up front.",
    options: [
      { id: 'pay', label: 'Pay for it (−15 points)', hint: 'A great deed', lean: L(3, 0.1, 1.2, 1, 0.3), tags: ['help', 'save'],
        outcomes: [{ weight: 1, text: '{a} pays the doctor for {b}, and {b} lives.', effects: { a: { points: -15 } } }] },
      { id: 'no', label: 'Walk away', hint: 'Keep your points', lean: L(0.5, 3, 2, 2, 3), tags: ['cold'],
        outcomes: [{ weight: 1, text: '{a} walks away from the doctor\'s door.', effects: {}, minor: true }] },
    ],
  },
  {
    // A theft only ever reaches a human through a choice (plain theft events are for AI racers and NPCs).
    id: 'sub-camp-thief', title: "Someone's in your camp", special: 'fight', fightKind: 'chase', weight: 1.4,
    cast: { a: 'focus', b: 'npc' }, when: { rounds: ['night'] },
    text: 'You wake to {b} going through your pack in the dark.',
    options: [
      { id: 'chase-spare', label: 'Chase them: if you catch them, let them go', hint: 'Get it all back. They might fight.', lean: L(3, 0.8, 1, 2.5, 1.5) },
      { id: 'chase-kill', label: 'Chase them: if you catch them, kill them', hint: 'Get it all back. Killing a thief costs Worthiness.', lean: L(0.3, 4, 0.4, 1.5, 2) },
      { id: 'let', label: 'Let them go', hint: 'They take food and water. You lose time.', lean: L(1, 0.5, 3, 0.4, 1) },
    ],
  },
];

// Agents took a part from you: next round, you can ride after them.
export const RIDE_AFTER = {
  id: 'ride-after', title: 'Ride after them',
  text: "{b}'s dust is still hanging over the trail. You could still catch {b.them}.",
  lines: {
    open: '{x} rides after {y}.',
    won: ' {x} runs {y} down and makes {y.them} hand it back.',
    back: ' {y} turns and drives {x} off.',
    let: '{a} lets {b} go.',
  },
  options: [
    { id: 'chase', label: 'Ride after them', hint: "They're running: you fight at an edge. Win and it's yours again.", lean: L(2, 3, 1.5, 4, 3) },
    { id: 'let', label: 'Let it go', hint: 'Nothing happens', lean: L(1.5, 0.5, 2, 0.3, 0.8) },
  ],
};
