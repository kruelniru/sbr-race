// Stands (DESIGN.md → Stands). Add a Stand by adding a line to POOL.
//
//   id, name, tier: 'legendary' | 'rare' | 'common', part (JoJo part number),
//   flavor: one short line the owner's phone shows ("what it does").
//
// Design rule: every Stand can be beaten. Stands shift odds in race events
// and (milestone 5) fights; none ever wins outright. Write Stand events so no
// Stand time-stops, erases, or instantly kills anyone.
//
// Canon racers' Stands are in CANON_STANDS: locked while their owner lives,
// then they join the pool. A PC's or NPC's Stand dies with them. A Stand
// given up to Rokakaka goes back into the pool.

export const POOL = [
  // ------------------------------------------------------------ Legendary
  { id: 'star-platinum', name: 'Star Platinum', tier: 'legendary', part: 3, flavor: 'Overwhelming speed, strength and precision. (No time stop.)' },
  { id: 'killer-queen', name: 'Killer Queen', tier: 'legendary', part: 4, flavor: 'Turns what it touches into a bomb. (No Bites the Dust.)' },
  { id: 'gold-experience', name: 'Gold Experience', tier: 'legendary', part: 5, flavor: 'Gives life: turns objects into creatures and patches wounds.' },
  { id: 'crazy-diamond', name: 'Crazy Diamond', tier: 'legendary', part: 4, flavor: 'Restores anything broken to how it was. Never itself.' },
  { id: 'stone-free', name: 'Stone Free', tier: 'legendary', part: 6, flavor: 'Unravels its user into string: nets, lines and stitches.' },
  { id: 'weather-report', name: 'Weather Report', tier: 'legendary', part: 6, flavor: 'Calls wind, rain, fog and lightning. (No Heavy Weather.)' },
  { id: 'cream', name: 'Cream', tier: 'legendary', part: 3, flavor: 'Swallows its user into a void that devours what it touches. Blind inside it: it can miss, overshoot, or hurt you.' },

  // ------------------------------------------------------------ Rare
  { id: 'magicians-red', name: "Magician's Red", tier: 'rare', part: 3, flavor: 'Controls fire: flames, heat and burning ropes.' },
  { id: 'hierophant-green', name: 'Hierophant Green', tier: 'rare', part: 3, flavor: 'Long-range tendrils and a spray of emerald shots.' },
  { id: 'silver-chariot', name: 'Silver Chariot', tier: 'rare', part: 3, flavor: 'A swift armored fencer with a rapier.' },
  { id: 'anubis', name: 'Anubis', tier: 'rare', part: 3, flavor: 'A sword that learns every move it sees.' },
  { id: 'hermit-purple', name: 'Hermit Purple', tier: 'rare', part: 3, flavor: 'Thorny vines that bind, climb and divine.' },
  { id: 'sticky-fingers', name: 'Sticky Fingers', tier: 'rare', part: 5, flavor: 'Zippers on anything: open a wall, a rock, the ground.' },
  { id: 'purple-haze', name: 'Purple Haze', tier: 'rare', part: 5, flavor: 'A killer virus in glass capsules. Dangerous to everyone, even you.' },
  { id: 'spice-girl', name: 'Spice Girl', tier: 'rare', part: 5, flavor: 'Makes things soft and elastic: rock, steel, the ground.' },
  { id: 'sex-pistols', name: 'Sex Pistols', tier: 'rare', part: 5, flavor: 'Six tiny gremlins who redirect bullets mid-flight.' },
  { id: 'echoes-act-3', name: 'Echoes Act 3', tier: 'rare', part: 4, flavor: 'Makes things impossibly heavy: three freeze!' },
  { id: 'aerosmith', name: 'Aerosmith', tier: 'rare', part: 5, flavor: 'A tiny fighter plane that tracks breath by its CO2.' },
  { id: 'kraft-work', name: 'Kraft Work', tier: 'rare', part: 5, flavor: 'Pins anything it touches in place.' },
  { id: 'soft-and-wet', name: 'Soft & Wet', tier: 'rare', part: 8, flavor: 'Bubbles that steal a property from whatever they pop on.' },
  { id: 'the-hand', name: 'The Hand', tier: 'rare', part: 4, flavor: 'Erases space to pull things closer. Never a person.' },

  // ------------------------------------------------------------ Common
  { id: 'echoes-act-1', name: 'Echoes Act 1', tier: 'common', part: 4, flavor: 'Sticks sound effects onto things.' },
  { id: 'harvest', name: 'Harvest', tier: 'common', part: 4, flavor: 'Hundreds of tiny fetchers who bring you things.' },
  { id: 'pearl-jam', name: 'Pearl Jam', tier: 'common', part: 4, flavor: 'Cooking that heals what ails you.' },
  { id: 'highway-star', name: 'Highway Star', tier: 'common', part: 4, flavor: 'Chases at a fixed speed and drains stamina.' },
  { id: 'moody-blues', name: 'Moody Blues', tier: 'common', part: 5, flavor: 'Replays what happened in a place.' },
  { id: 'beach-boy', name: 'Beach Boy', tier: 'common', part: 5, flavor: 'A fishing rod whose line passes through walls.' },
  { id: 'little-feet', name: 'Little Feet', tier: 'common', part: 5, flavor: 'Shrinks whatever it cuts.' },
  { id: 'tower-of-gray', name: 'Tower of Gray', tier: 'common', part: 3, flavor: 'A stag beetle, too fast to swat.' },
  { id: 'ebony-devil', name: 'Ebony Devil', tier: 'common', part: 3, flavor: 'Possesses a doll and grows with its user\'s grudge.' },
  { id: 'surface', name: 'Surface', tier: 'common', part: 4, flavor: 'A wooden mannequin that copies someone and their moves.' },
  { id: 'planet-waves', name: 'Planet Waves', tier: 'common', part: 6, flavor: 'Calls down meteorites.' },
  { id: 'paisley-park', name: 'Paisley Park', tier: 'common', part: 8, flavor: 'Guides you down the right path.' },
];

// Canon racers' Stands. Locked while their owner lives; on death they join the
// pool at this tier. Tusk only ever enters as Act 1.
export const CANON_STANDS = [
  { id: 'cream-starter', name: 'Cream Starter', tier: 'rare', part: 7, owner: 'hotpants', flavor: 'A spray of living flesh: heals and seals wounds, fills a throat, remakes a face.' },
  { id: 'oh-lonesome-me', name: 'Oh! Lonesome Me', tier: 'common', part: 7, owner: 'mountaintim', flavor: 'Splits its user\'s body apart along a rope.' },
  { id: 'hey-ya', name: 'Hey Ya!', tier: 'common', part: 7, owner: 'pocoloco', flavor: 'A cheerful voice that talks its user into their luck.' },
  { id: 'in-a-silent-way', name: 'In a Silent Way', tier: 'rare', part: 7, owner: 'sandman', flavor: 'Turns sounds into things: a written sound cuts, burns or explodes.' },
  { id: 'boku-no-rhythm', name: 'Boku no Rhythm wo Kiitekure', tier: 'rare', part: 7, owner: 'oyecomova', flavor: 'Turns anything into a bomb with a pin to pull.' },
  { id: 'tomb-of-the-boom-1', name: 'Tomb of the Boom 1', tier: 'common', part: 7, owner: 'benjamin', flavor: 'Magnetism: reshapes iron, even inside its user.' },
  { id: 'tomb-of-the-boom-2', name: 'Tomb of the Boom 2', tier: 'common', part: 7, owner: 'andre', flavor: 'Magnetism: whoever its blood touches pulls iron into themself.' },
  { id: 'tomb-of-the-boom-3', name: 'Tomb of the Boom 3', tier: 'common', part: 7, owner: 'la', flavor: 'Magnetism: gathers iron sand to bind and strike.' },
  { id: 'tusk-act-1', name: 'Tusk Act 1', tier: 'rare', part: 7, owner: 'johnny', awakens: [2, 3], flavor: 'Spinning fingernail bullets.' },
  { id: 'scary-monsters', name: 'Scary Monsters', tier: 'rare', part: 7, owner: 'diego', awakens: [3], flavor: 'Turns its user, and those it infects, into dinosaurs.' },
];

// Never obtainable from any source. Non-racer agents' Stands are here;
// Valentine-side racers (Oyecomova, the Boom Booms) are in CANON_STANDS.
export const BANNED = [
  'The World', 'Star Platinum: The World', 'King Crimson', 'Made in Heaven', 'Gold Experience Requiem',
  'Silver Chariot Requiem', 'Tusk Act 2', 'Tusk Act 3', 'Tusk Act 4', 'Wonder of U', 'C-Moon', 'Bites the Dust',
  'Green Day', 'Metallica', 'Whitesnake', 'D4C', 'Dirty Deeds Done Dirt Cheap',
  // Valentine's non-racer agents
  // (Ringo Roadagain, Blackmore, Magent Magent, Mike O., Axl RO, the Tatoo You!
  // group, Pork Pie Hat Kid). Add more agents' Stands here as they appear.
  'Mandom', 'Catch the Rainbow', '20th Century Boy', 'Tubular Bells', 'Civil War', 'Tatoo You!', 'Wired',
];

export const ALL_STANDS = [...POOL, ...CANON_STANDS];
export const STAND_BY_ID = Object.fromEntries(ALL_STANDS.map((s) => [s.id, s]));
