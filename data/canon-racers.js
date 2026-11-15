// Canon racers. Each one is a host toggle in the lobby (all on by default).
//
//   skill:       riding skill for placements (PCs use rules.placement.pcSkill)
//   mount:       'horse' or 'runner'
//   horse:       canon horse name, or null for a random one
//   personality: one of data/personalities.js (drives event leanings)
//   lean:        extra tag multipliers on top of personality + rules.canonLean
//   side:        'valentine' for the President's people (used by rivals, and
//                by Valentine's agents in milestone 5)
//   rivals:      { side, lean } makes kill events against that side likelier
//   stand:       id of their Stand in data/stands.js (CANON_STANDS), or null.
//                It's locked while they live and joins the pool when they
//                die. Johnny and Diego awaken theirs mid-race (stands.js awakens).
//   worthiness:  their starting Worthiness (hidden; PCs start by personality, rules.worthiness.byPersonality)
//   palm:        true if they may walk into a Devil's Palm (Standless only)
//   animal:      'camel' for a camel rider (text says camel, not horse)
//   notes:       for writers; not used by the engine
export default [
  {
    id: 'hotpants',
    name: 'Hot Pants',
    pronouns: 'she',
    skill: 64,
    mount: 'horse',
    horse: null,
    personality: 'honorable',
    // Helps the wounded without hesitation; merciless toward enemies, and
    // most of all toward the President's people.
    lean: { help: 1.6, kill: 1.6 },
    rivals: { side: 'valentine', lean: 6 },
    stand: 'cream-starter',
    worthiness: 75,
    notes: 'Devout and secretive; races to recover the Corpse as atonement for her brother. A Vatican agent. Kind to the hurt, ruthless to enemies.',
  },
  {
    id: 'johnny', name: 'Johnny Joestar', pronouns: 'he', skill: 58, mount: 'horse', horse: 'Slow Dancer',
    personality: 'glory', lean: {}, stand: 'tusk-act-1', worthiness: 60,
    notes: 'Paraplegic former jockey. Fiercely determined.',
  },
  {
    id: 'gyro', name: 'Gyro Zeppeli', pronouns: 'he', skill: 63, mount: 'horse', horse: 'Valkyrie',
    personality: 'honorable', lean: { help: 1.3 }, stand: null, worthiness: 80,
    notes: 'Spares beaten enemies. Teaches Spin (later milestone). Takes in the worthy.',
  },
  {
    id: 'diego', name: 'Diego Brando', pronouns: 'he', skill: 67, mount: 'horse', horse: 'Silver Bullet',
    personality: 'opportunist', lean: { help: 0.3, sabotage: 1.5 }, stand: 'scary-monsters', worthiness: 25,
    notes: 'Champion jockey. Does whatever helps Diego.',
  },
  {
    id: 'sandman', name: 'Sandman', pronouns: 'he', skill: 60, mount: 'runner', horse: null,
    personality: 'opportunist', lean: {}, stand: 'in-a-silent-way', worthiness: 60,
    notes: 'Runs the race on foot to buy back his people\'s land.',
  },
  {
    id: 'mountaintim', name: 'Mountain Tim', pronouns: 'he', skill: 58, mount: 'horse', horse: null,
    personality: 'honorable', lean: { help: 1.3 }, stand: 'oh-lonesome-me', worthiness: 70,
    notes: 'Cowboy with a rope. Chivalrous.',
  },
  {
    id: 'pocoloco', name: 'Pocoloco', pronouns: 'he', skill: 54, mount: 'horse', horse: null,
    personality: 'glory', lean: {}, luck: 8, stand: 'hey-ya', worthiness: 65,
    notes: 'Absurdly lucky. `luck` is a flat placement bonus.',
  },
  {
    id: 'wekapipo', name: 'Wekapipo', pronouns: 'he', skill: 57, mount: 'horse', horse: null,
    personality: 'cautious', lean: { help: 1.2 }, stand: null, worthiness: 60,
    notes: 'Steel ball user (Wrecking Ball), no Stand. Races from Stage 1 here: a liberty, not canon timing.',
  },
  {
    id: 'norisuke', name: 'Norisuke Higashikata IV', pronouns: 'he', skill: 52, mount: 'horse', horse: null,
    personality: 'cautious', lean: {}, stand: null, worthiness: 55, palm: true,
    notes: 'Older Japanese racer. No Stand.',
  },
  {
    id: 'robinson', name: 'Mrs. Robinson', pronouns: 'he', skill: 52, mount: 'horse', horse: 'El Condor Pasa',
    personality: 'ruthless', lean: { kill: 1.5 }, stand: null, worthiness: 20, palm: true,
    notes: 'No Stand: raises insects in his body that set off cholla cactus needles. Horse: El Condor Pasa (Appaloosa).',
  },
  {
    id: 'oyecomova', name: 'Oyecomova', pronouns: 'he', skill: 50, mount: 'horse', horse: null,
    personality: 'ruthless', lean: { kill: 1.5 }, stand: 'boku-no-rhythm', worthiness: 15, side: 'valentine',
    notes: "Bomber; awakened his Stand in a Devil's Palm. Valentine's agent: he secretly posted the bounty on Gyro.",
  },
  {
    id: 'avdul', name: 'Urmd Avdul', pronouns: 'he', skill: 55, mount: 'horse', horse: null, animal: 'camel',
    personality: 'opportunist', lean: {}, stand: null, worthiness: 50, palm: true,
    notes: 'Egyptian nomad who rides an unnamed camel. No Stand.',
  },
  {
    id: 'benjamin', name: 'Benjamin Boom Boom', pronouns: 'he', skill: 50, mount: 'horse', horse: null,
    personality: 'ruthless', side: 'valentine', lean: { kill: 2 }, stand: 'tomb-of-the-boom-1', worthiness: 15,
    notes: "Father of the Boom Boom family. Came for the bounty Oyecomova posted on Gyro; Valentine's side. Tomb of the Boom came from a Devil's Palm.",
  },
  {
    id: 'andre', name: 'Andre Boom Boom', pronouns: 'he', skill: 49, mount: 'horse', horse: null,
    personality: 'ruthless', side: 'valentine', lean: { kill: 2 }, stand: 'tomb-of-the-boom-2', worthiness: 12,
    notes: 'Boom Boom family. Valentine\'s side.',
  },
  {
    id: 'la', name: 'L.A. Boom Boom', pronouns: 'he', skill: 48, mount: 'horse', horse: null,
    personality: 'ruthless', side: 'valentine', lean: { kill: 2 }, stand: 'tomb-of-the-boom-3', worthiness: 12,
    notes: 'Youngest of the Boom Boom family. Valentine\'s side.',
  },
];
