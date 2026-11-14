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
//   stand:       their Stand, LOCKED until this character dies (milestone 4).
//                awakens: 'start' (has it from the start) or 'race' (awakens
//                mid-race). Tiers get added in milestone 4.
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
    stand: {
      name: 'Cream Starter',
      awakens: 'start',
      description: 'A spray of living flesh: it heals and seals wounds, fills an enemy\'s throat, or remakes a face as a disguise.',
    },
    notes: 'Devout and secretive; races to recover the Corpse as atonement for her brother. A Vatican agent. Kind to the hurt, ruthless to enemies.',
  },
  {
    id: 'johnny', name: 'Johnny Joestar', pronouns: 'he', skill: 58, mount: 'horse', horse: 'Slow Dancer',
    personality: 'glory', lean: {}, stand: { name: 'Tusk', awakens: 'race' },
    notes: 'Paraplegic former jockey. Fiercely determined.',
  },
  {
    id: 'gyro', name: 'Gyro Zeppeli', pronouns: 'he', skill: 63, mount: 'horse', horse: 'Valkyrie',
    personality: 'honorable', lean: { help: 1.3 }, stand: { name: 'Ball Breaker', awakens: 'race' },
    notes: 'Spares beaten enemies. Teaches Spin (later milestone). Takes in the worthy.',
  },
  {
    id: 'diego', name: 'Diego Brando', pronouns: 'he', skill: 67, mount: 'horse', horse: 'Silver Bullet',
    personality: 'opportunist', lean: { help: 0.3, sabotage: 1.5 }, stand: { name: 'Scary Monsters', awakens: 'race' },
    notes: 'Champion jockey. Does whatever helps Diego.',
  },
  {
    id: 'sandman', name: 'Sandman', pronouns: 'he', skill: 60, mount: 'runner', horse: null,
    personality: 'opportunist', lean: {}, stand: { name: 'In a Silent Way', awakens: 'start' },
    notes: 'Runs the race on foot to buy back his people\'s land.',
  },
  {
    id: 'mountaintim', name: 'Mountain Tim', pronouns: 'he', skill: 58, mount: 'horse', horse: null,
    personality: 'honorable', lean: { help: 1.3 }, stand: { name: 'Oh! Lonesome Me', awakens: 'start' },
    notes: 'Cowboy with a rope. Chivalrous.',
  },
  {
    id: 'pocoloco', name: 'Pocoloco', pronouns: 'he', skill: 54, mount: 'horse', horse: null,
    personality: 'glory', lean: {}, luck: 8, stand: { name: 'Hey Ya!', awakens: 'start' },
    notes: 'Absurdly lucky. `luck` is a flat placement bonus.',
  },
  {
    id: 'wekapipo', name: 'Wekapipo', pronouns: 'he', skill: 57, mount: 'horse', horse: null,
    personality: 'cautious', lean: { help: 1.2 }, stand: null,
    notes: 'Steel ball user (Wrecking Ball). Races from Stage 1 here: a liberty, not canon timing.',
  },
  {
    id: 'norisuke', name: 'Norisuke Higashikata IV', pronouns: 'he', skill: 52, mount: 'horse', horse: null,
    personality: 'cautious', lean: {}, stand: null,
    notes: 'Older Japanese racer.',
  },
  {
    id: 'robinson', name: 'Mrs. Robinson', pronouns: 'he', skill: 52, mount: 'horse', horse: null,
    personality: 'ruthless', lean: { kill: 1.5 }, stand: null,
    notes: 'Commands insects. Stand details to settle in milestone 4.',
  },
  {
    id: 'oyecomova', name: 'Oyecomova', pronouns: 'he', skill: 50, mount: 'horse', horse: null,
    personality: 'ruthless', lean: { kill: 1.5 }, stand: { name: 'Boku no Rhythm wo Kiitekure', awakens: 'start' },
    notes: 'Bomber. Verify Stand name in milestone 4.',
  },
  {
    id: 'avdul', name: 'Urmd Avdul', pronouns: 'he', skill: 55, mount: 'horse', horse: null,
    personality: 'opportunist', lean: {}, stand: null,
    notes: 'Desert-savvy racer.',
  },
  {
    id: 'benjamin', name: 'Benjamin Boom Boom', pronouns: 'he', skill: 50, mount: 'horse', horse: null,
    personality: 'ruthless', side: 'valentine', lean: { kill: 2 }, stand: { name: 'Tomb of the Boom', awakens: 'start' },
    notes: 'Father of the Boom Boom family. Valentine\'s side.',
  },
  {
    id: 'andre', name: 'Andre Boom Boom', pronouns: 'he', skill: 49, mount: 'horse', horse: null,
    personality: 'ruthless', side: 'valentine', lean: { kill: 2 }, stand: { name: 'Tomb of the Boom', awakens: 'start' },
    notes: 'Boom Boom family. Valentine\'s side.',
  },
  {
    id: 'la', name: 'L.A. Boom Boom', pronouns: 'he', skill: 48, mount: 'horse', horse: null,
    personality: 'ruthless', side: 'valentine', lean: { kill: 2 }, stand: { name: 'Tomb of the Boom', awakens: 'start' },
    notes: 'Youngest of the Boom Boom family. Valentine\'s side.',
  },
];
