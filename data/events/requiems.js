// Requiem signature events (milestone 7c). Only a racer whose Stand became a
// Requiem gets these (the Requiem Arrow, DESIGN.md → Secret endings). Like
// every Stand line, naming {a.stand} reveals it on stream. A Requiem is the
// strongest power in the game, but it still never kills anyone in an event,
// and it can still be beaten.
const S = (stand) => ({ is: 'focus', stand });
const R = (id, text, effects = { a: { pace: 2 } }, extra = {}) => ({
  id: `requiem-${id}`, text, cast: { a: S(id === 'tusk' ? 'tusk-act-4' : `${id}-requiem`) }, effects, tags: ['stand', 'requiem', 'pace'], weight: 3, ...extra,
});

export default [
  // ------------------------------------------------------------ Acts (milestone 7c)
  { id: 'stand-echoes-act-2', text: '{a} writes a WHOOSH on a boulder with {a.stand}, and the boulder rolls itself off the trail.',
    cast: { a: S('echoes-act-2') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-echoes-act-2-boom', text: 'Wolves circle {a} at dusk. {a.stand} sticks a BOOM to the ground, and the pack scatters.',
    cast: { a: S('echoes-act-2') }, tags: ['stand'], when: { rounds: ['night'] }, weight: 1.5 },
  { id: 'stand-tusk-act-2', text: "{a}'s spinning hole crawls up a cliff after {a.stand}'s nail and drags a rope to the top.",
    cast: { a: S('tusk-act-2') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-tusk-act-3', text: '{a} fires {a.themself} into {a.their} own spinning hole with {a.stand} and comes out on the far side of the ravine.',
    cast: { a: S('tusk-act-3') }, effects: { a: { pace: 2 } }, tags: ['stand', 'pace'], weight: 2 },

  // ------------------------------------------------------------ Requiem forms
  R('star-platinum', "Rocks fall on {a} in a canyon. {a.stand} answers every one of them at once, and the canyon floor is dust before the first one lands."),
  R('killer-queen', 'Everything {a} touched on the trail today goes off at once behind {a.them}, in perfect order, and the road ahead is clear for miles. {a.stand} never even turns around.'),
  R('gold-experience', 'A rockslide comes down on {a}. With {a.stand}, it simply never arrives: {a.they} ride{a:s} on as if the mountain had stayed where it was.'),
  R('crazy-diamond', '{a} lays a hand on the ground, and {a.stand} restores the washed-out road ahead as it was a year ago: bridges, ruts and all.'),
  R('stone-free', '{a} unravels into string with {a.stand} and spans the gorge in a single web. By the time the others find a ford, {a.they} {a:is/are} gone.'),
  R('weather-report', 'A storm opens over the plains wherever {a} rides, and closes behind {a.them}. {a.stand} gives {a.them} the tailwind and everyone else the hail.'),
  R('cream', '{a} vanishes into {a.stand} at sunrise. A line of nothing runs straight across the land, and {a.they} step{a:s} out of it at sunset, miles ahead.'),
  R('magicians-red', '{a.stand} rises over {a} as a firebird the size of a storm front and burns a straight road through the scrub.'),
  R('hierophant-green', "{a.stand}'s tendrils already lie under every trail for a hundred miles. {a} knows the fastest way before {a.they} ask{a:s}."),
  R('silver-chariot', 'Riders near {a} doze off in the saddle and wake confused, wearing each other\'s hats. {a.stand} has already moved on, and so has {a}.'),
  R('anubis', 'Bandits jump {a}. {a.stand} has already learned every move they will ever make, and disarms all six before the first draws.', { a: { pace: 1, points: 10 } }),
  R('hermit-purple', "{a.stand}'s vines find a hidden spring, a short cut and a lost bridle before {a} even thinks to look."),
  R('sticky-fingers', '{a} unzips the land itself with {a.stand} and rides through the seam. It closes behind {a.them} with a soft zip.'),
  R('purple-haze', 'A gang closes in on {a}. {a.stand} breathes out, and the haze takes their guns and their nerve, and leaves everyone else untouched.', { a: { pace: 1, points: 10 } }),
  R('spice-girl', '{a} rides off a bluff. With {a.stand}, the ground goes soft as a feather bed beneath {a.them}, and {a.they} land{a:s} running.'),
  R('sex-pistols', 'Shots ring out at {a} from three directions. Six hundred tiny gremlins of {a.stand} catch every bullet and drop them in a neat pile.', { a: { pace: 1, points: 10 } }),
  R('aerosmith', '{a.stand} blots out the sun over {a} like a squadron and maps every breath for a hundred miles. {a} rides straight past every ambush.'),
  R('kraft-work', 'A stampede thunders toward {a}. {a.stand} pins the moment in place, and {a.they} ride{a:s} calmly through the frozen herd.'),
  R('soft-and-wet', "{a.stand}'s bubbles drift across the field and pop. For the rest of the day, the trail is shorter for {a} than for anyone else."),
  R('the-hand', '{a.stand} erases the miles between {a} and the next town. The others are still on the ridge when {a.they} water{a:s} up.'),
  R('echoes', 'Every sound on the trail falls into rhythm with {a}. {a.stand} keeps the beat, and nothing breaks {a.their} stride all day.'),
  R('harvest', 'A living tide of {a.stand} carries {a} across the salt flats, thousands of tiny hands passing {a.them} forward.'),
  R('pearl-jam', '{a} eats a meal from {a.stand} at dawn. A fall that should have broken {a.their} leg at noon does nothing at all.'),
  R('highway-star', 'The road unrolls itself ahead of {a} at whatever speed {a.they} like{a:s}. {a.stand} keeps the others a mile behind, always.'),
  R('moody-blues', '{a.stand} replays not what happened, but what will. {a} steps around a sinkhole an hour before it opens.'),
  R('beach-boy', "{a} casts {a.stand}'s line into the horizon and reels the next ridge in."),
  R('little-feet', '{a.stand} shrinks the miles themselves. The stage is shorter for {a} than for anyone else in the race.'),
  R('tower-of-gray', 'A swarm of countless {a.stand}, too fast to see, clears the trail ahead of {a}: every snake, every snare, every loose stone.'),
  R('ebony-devil', 'A rider spits at {a} as {a.they} pass{a:es}. {a.stand} turns the grudge back, and the rider\'s own horse throws them into the mud.', { a: { pace: 2 } }, { tags: ['stand', 'requiem', 'pace'] }),
  R('surface', 'A hundred wooden riders gallop out of the trees with {a.stand}. Any one of them could be {a}, and the others never find out which.'),
  R('planet-waves', 'Stars fall around {a} all night where {a.stand} points, lighting the trail like noon. Not one lands near {a.them}.', { a: { pace: 2 } }, { when: { rounds: ['night'] } }),
  R('paisley-park', 'Every fork {a} takes is the right one. {a.stand} makes sure no path {a.they} choose{a:s} can be wrong today.'),
  R('cream-starter', "A gunshot opens {a}'s side. {a.stand} seals it before the smoke clears, and {a.they} never slow{a:s} down."),
  R('oh-lonesome-me', '{a} comes apart along the rope with {a.stand} and puts {a.themself} back together at the far end of the canyon.'),
  R('hey-ya', '{a.stand} tells {a} which way the river will flood, which pass will close, and which stranger is lying. It is right every time.'),
  R('in-a-silent-way', '{a} gathers every sound on the trail with {a.stand} and writes them into a road: hoofbeats to cross the river, wind to climb the hill.'),
  R('boku-no-rhythm', 'Every danger near {a} grows a pin. {a.stand} pulls them one by one, far from {a.them}, and the trail goes quiet.'),
  R('tomb-of-the-boom-1', '{a} raises a hand, and {a.stand} pulls the iron out of every gun aimed {a.their} way.', { a: { pace: 1, points: 10 } }),
  R('tomb-of-the-boom-2', "{a.stand} turns the whole trail into iron for {a}: every rail, nail and horseshoe pulls {a.them} forward."),
  R('tomb-of-the-boom-3', 'Iron sand rises around {a} in a storm that answers only {a.them}. {a.stand} carries {a.them} across the plain inside it.'),
  R('tusk', "A rider fires at {a}. {a.stand}'s infinite rotation catches the bullet, and it is still spinning, still falling, somewhere it will never reach the end of.", { a: { pace: 1, points: 10 } }),
  R('scary-monsters', 'A herd of dinosaurs crosses the plains at full gallop, with {a} at the head. {a.stand} does not slow down for anything.'),
];
