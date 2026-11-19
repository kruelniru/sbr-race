// Stands (DESIGN.md → Stands). Add a Stand by adding a line to POOL.
//
//   id, name, tier: 'legendary' | 'rare' | 'common', part (JoJo part number),
//   flavor: one short line the owner's phone shows ("what it does").
//   Acts (milestone 7c): family, act, next (the id it evolves into). Only Act 1
//   is ever rolled; later Acts live in EVOLVED (never in the pool). Every Act
//   of a family shares one Requiem form (REQUIEMS, keyed by family or id).
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
  { id: 'aerosmith', name: 'Aerosmith', tier: 'rare', part: 5, flavor: 'A tiny fighter plane that tracks breath by its CO2.' },
  { id: 'kraft-work', name: 'Kraft Work', tier: 'rare', part: 5, flavor: 'Pins anything it touches in place.' },
  { id: 'soft-and-wet', name: 'Soft & Wet', tier: 'rare', part: 8, flavor: 'Bubbles that steal a property from whatever they pop on.' },
  { id: 'the-hand', name: 'The Hand', tier: 'rare', part: 4, flavor: 'Erases space to pull things closer. Never a person.' },

  // ------------------------------------------------------------ Common
  { id: 'echoes-act-1', name: 'Echoes Act 1', tier: 'common', part: 4, family: 'echoes', act: 1, next: 'echoes-act-2', flavor: 'Sticks sound effects onto things.' },
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
  { id: 'tusk-act-1', name: 'Tusk Act 1', tier: 'rare', part: 7, owner: 'johnny', awakens: [2, 3], family: 'tusk', act: 1, next: 'tusk-act-2', flavor: 'Spinning fingernail bullets.' },
  { id: 'scary-monsters', name: 'Scary Monsters', tier: 'rare', part: 7, owner: 'diego', awakens: [3], flavor: 'Turns its user, and those it infects, into dinosaurs.' },
];

// Later Acts (milestone 7c): reached only by evolving (js/engine/stands.js
// evolveStand). evolveLine: the stream line when the Stand was already revealed.
export const EVOLVED = [
  { id: 'echoes-act-2', name: 'Echoes Act 2', tier: 'rare', part: 4, family: 'echoes', act: 2, next: 'echoes-act-3', flavor: 'Writes sounds onto things, and the sounds come true: a BOOM that bursts, a WHOOSH that blows.',
    evolveLine: "{a}'s Echoes splits its shell and crawls out bigger. Echoes Act 2." },
  { id: 'echoes-act-3', name: 'Echoes Act 3', tier: 'rare', part: 4, family: 'echoes', act: 3, flavor: 'Makes things impossibly heavy: three freeze!',
    evolveLine: "{a}'s Echoes cracks open one last time. Something small and sharp-eyed steps out: Echoes Act 3." },
  { id: 'tusk-act-2', name: 'Tusk Act 2', tier: 'rare', part: 7, family: 'tusk', act: 2, next: 'tusk-act-3', flavor: 'Spinning nails that leave a spinning hole behind: the hole crawls after its target.',
    evolveLine: "{a}'s nails spin faster, and the holes they leave begin to move. Tusk Act 2." },
  { id: 'tusk-act-3', name: 'Tusk Act 3', tier: 'legendary', part: 7, family: 'tusk', act: 3, flavor: 'Fires its user into their own spinning hole, out of reach, and out somewhere else.',
    evolveLine: '{a} shoots a hole into {a.their} own body and drops out of sight. Tusk Act 3.' },
];

// Never obtainable from any source. Non-racer agents' Stands are here;
// Valentine-side racers (Oyecomova, the Boom Booms) are in CANON_STANDS.
export const BANNED = [
  // (Requiem forms, Tusk Act 4 among them, come only from the Requiem Arrow: REQUIEMS below.)
  'The World', 'Star Platinum: The World', 'King Crimson', 'Made in Heaven', 'Gold Experience Requiem',
  'Silver Chariot Requiem', 'Tusk Act 4', 'Wonder of U', 'C-Moon', 'Bites the Dust',
  'Green Day', 'Metallica', 'Whitesnake', 'D4C', 'Dirty Deeds Done Dirt Cheap',
  // Valentine's non-racer agents
  // (Ringo Roadagain, Blackmore, Magent Magent, Mike O., Axl RO, the Tatoo You!
  // group, Pork Pie Hat Kid). Add more agents' Stands here as they appear.
  'Mandom', 'Catch the Rainbow', '20th Century Boy', 'Tubular Bells', 'Civil War', 'Tatoo You!', 'Wired',
];

export const ALL_STANDS = [...POOL, ...CANON_STANDS, ...EVOLVED];

// Requiem forms (milestone 7c): one for every obtainable Stand, keyed by the
// Stand's family (every Act of Echoes or Tusk shares one) or id. Only the
// Requiem Arrow gives one (DESIGN.md → Secret endings), and the cheat menu.
// Add a Requiem here when you add a Stand; each has signature events in
// data/events/requiems.js.
const RQ = (key, name, flavor) => ({ key, name, flavor });
export const REQUIEMS = [
  // Legendary
  RQ('star-platinum', 'Star Platinum Requiem', 'Every blow it has ever thrown, thrown again at once, from every side. (Still no time stop.)'),
  RQ('killer-queen', 'Killer Queen Requiem', 'Everything it has ever touched remembers being a bomb, and waits for its word.'),
  RQ('gold-experience', 'Gold Experience Requiem', 'Returns every action to zero. Whatever was done to you never arrives.'),
  RQ('crazy-diamond', 'Crazy Diamond Requiem', 'Restores the whole trail to how it was before anyone hurt it, its user included.'),
  RQ('stone-free', 'Stone Free Requiem', 'Its user unravels into a web of string that spans the whole valley.'),
  RQ('weather-report', 'Weather Report Requiem', 'The sky itself answers to it: storms open where it walks and close behind.'),
  RQ('cream', 'Cream Requiem', 'The void no longer misses. It eats the distance between its user and the finish.'),
  // Rare
  RQ('magicians-red', "Magician's Red Requiem", 'A firebird the size of a storm front, burning a road ahead of its user.'),
  RQ('hierophant-green', 'Hierophant Green Requiem', 'Its tendrils lace the whole country together: every path is already under its watch.'),
  RQ('silver-chariot', 'Silver Chariot Requiem', 'Puts every soul around it to sleep, and wakes them in the wrong bodies.'),
  RQ('anubis', 'Anubis Requiem', 'A blade that has already learned every move anyone will ever make.'),
  RQ('hermit-purple', 'Hermit Purple Requiem', 'Its vines find what anyone is looking for, anywhere, before they look.'),
  RQ('sticky-fingers', 'Sticky Fingers Requiem', 'Zips open the land itself: a seam from here to the finish.'),
  RQ('purple-haze', 'Purple Haze Requiem', 'The virus learns. It burns through anything that means its user harm, and nothing else.'),
  RQ('spice-girl', 'Spice Girl Requiem', 'Softens the world around it: no fall, no blade, no bullet lands hard.'),
  RQ('sex-pistols', 'Sex Pistols Requiem', 'Six hundred tiny gremlins, and no bullet anywhere goes where its shooter meant.'),
  RQ('aerosmith', 'Aerosmith Requiem', 'A squadron that blots out the sun and knows every breath for a hundred miles.'),
  RQ('kraft-work', 'Kraft Work Requiem', 'Pins the moment in place: whatever is coming for its user simply stops.'),
  RQ('soft-and-wet', 'Soft & Wet Requiem', 'Bubbles that steal the distance, the danger, the very luck of everyone else.'),
  RQ('the-hand', 'The Hand Requiem', 'Erases the miles between its user and wherever they mean to be.'),
  // Common
  RQ('echoes', 'Echoes Requiem', 'Every sound on the trail obeys it. Its user moves to a rhythm nothing can interrupt.'),
  RQ('harvest', 'Harvest Requiem', 'Countless fetchers, a living tide, carrying their user across the land.'),
  RQ('pearl-jam', 'Pearl Jam Requiem', 'A feast that heals anything, even a wound that has not happened yet.'),
  RQ('highway-star', 'Highway Star Requiem', 'A road that runs itself, at any speed its user wishes, and always ahead of everyone.'),
  RQ('moody-blues', 'Moody Blues Requiem', 'Replays not what happened, but what will: its user is always one step ahead.'),
  RQ('beach-boy', 'Beach Boy Requiem', 'Its line passes through walls, mountains and miles, and reels in the horizon.'),
  RQ('little-feet', 'Little Feet Requiem', 'Shrinks the miles themselves. The trail is shorter for its user than for anyone.'),
  RQ('tower-of-gray', 'Tower of Gray Requiem', 'A swarm of countless Towers, too fast to see, too many to stop.'),
  RQ('ebony-devil', 'Ebony Devil Requiem', 'Every grudge anyone holds against its user turns back on the one holding it.'),
  RQ('surface', 'Surface Requiem', 'A hundred wooden copies, and any one of them might be the real rider.'),
  RQ('planet-waves', 'Planet Waves Requiem', 'Stars fall where it points, and never on its user.'),
  RQ('paisley-park', 'Paisley Park Requiem', 'Every path is the right one. Its user cannot get lost, or caught.'),
  // Canon racers' Stands (they enter the pool when their owner dies)
  RQ('cream-starter', 'Cream Starter Requiem', 'Living flesh that seals any wound the moment it opens.'),
  RQ('oh-lonesome-me', 'Oh! Lonesome Me Requiem', 'Its user comes apart along the rope and puts themself back together anywhere along it.'),
  RQ('hey-ya', 'Hey Ya! Requiem', 'The cheerful voice is right every time now: luck itself listens.'),
  RQ('in-a-silent-way', 'In a Silent Way Requiem', 'Every sound on the trail can be picked up and turned into a weapon or a road.'),
  RQ('boku-no-rhythm', 'Boku no Rhythm wo Kiitekure Requiem', 'Every danger near its user gets a pin, and only they get to pull it.'),
  RQ('tomb-of-the-boom-1', 'Tomb of the Boom 1 Requiem', 'Pulls the iron out of every gun and spur that turns against it.'),
  RQ('tomb-of-the-boom-2', 'Tomb of the Boom 2 Requiem', 'Every drop of its blood is a magnet, and the whole trail is iron.'),
  RQ('tomb-of-the-boom-3', 'Tomb of the Boom 3 Requiem', 'Iron sand rises in a storm that answers only its user.'),
  RQ('tusk', 'Tusk Act 4', 'Infinite rotation: a spin that never stops, and nothing it touches ever reaches the end of falling.'),
  RQ('scary-monsters', 'Scary Monsters Requiem', 'A herd of dinosaurs crossing the plains, with its user at the head.'),
].map(({ key, name, flavor }) => ({ id: key === 'tusk' ? 'tusk-act-4' : `${key}-requiem`, key, name, tier: 'legendary', requiem: true, flavor }));

/** Every Requiem form as a Stand def ("from" is the family or Stand id it belongs to). */
export const REQUIEM_STANDS = REQUIEMS.map((q) => ({ ...q, from: q.key }));
const REQUIEM_BY_KEY = Object.fromEntries(REQUIEMS.map((q) => [q.key, q]));

export const STAND_BY_ID = Object.fromEntries([...ALL_STANDS, ...REQUIEM_STANDS].map((s) => [s.id, s]));

/** The Requiem form of a Stand (every Act of a family shares one), or null. */
export function requiemFor(standId) {
  const def = STAND_BY_ID[standId];
  if (def?.requiem) return null;
  return REQUIEM_BY_KEY[def?.family ?? standId] ?? null;
}

/** The first Act of a Stand's family (or the Stand itself). */
export function baseStandId(standId) {
  const def = STAND_BY_ID[standId];
  if (!def?.family) return standId;
  return ALL_STANDS.find((s) => s.family === def.family && s.act === 1)?.id ?? standId;
}
