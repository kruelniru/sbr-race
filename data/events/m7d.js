// Milestone 7d: more events. Canon moments (two more for every canon racer,
// four for Hot Pants), new stage events (3–4 a stage), and Stands that had no
// events. All in our own words.
const focus = (id, extra = {}) => ({ is: 'focus', canon: id, ...extra });
const S = (stand) => ({ is: 'focus', stand });
const ST = (n, extra = {}) => ({ stages: [n], ...extra });

export default [
  // ============================================================ canon moments
  // Hot Pants (four more)
  { id: 'hp-cross', text: '{a} stops at a roadside cross, says nothing for a long minute, and rides on harder than before.',
    cast: { a: focus('hotpants') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 2 },
  { id: 'hp-shares-water', text: '{a} hands {b} a full canteen without a word and is gone before {b} can thank {a.them}.',
    cast: { a: focus('hotpants'), b: 'named' }, effects: { b: { pace: 1 } }, tags: ['help'], weight: 2.5 },
  { id: 'hp-seals-horse', text: "{b}'s horse is gashed on barbed wire. {a} closes the wound with Cream Starter, and the horse walks it off.",
    cast: { a: focus('hotpants'), b: { is: 'named', hasHorse: true } }, effects: { a: { points: 5 } }, tags: ['help'], weight: 2 },
  { id: 'hp-watches-agents', text: "{a} watches two men in dark hats from the treeline for an hour, memorizing their faces. {a.They} {a:is/are} not here only to race.",
    cast: { a: focus('hotpants') }, tags: ['minor'], when: { stages: [4, 5, 6, 7, 8] }, weight: 2 },

  // Johnny
  { id: 'johnny-nails', text: '{a} stares at {a.their} own fingernails for a long time, as if expecting them to move.',
    cast: { a: focus('johnny') }, tags: ['minor'], when: { stages: [1, 2, 3] }, weight: 2 },
  { id: 'johnny-falls', text: "{a} slips from the saddle at a creek and drags {a.themself} back up by the stirrup. {a.They} won't let anyone help.",
    cast: { a: focus('johnny') }, effects: { a: { pace: -1 } }, tags: ['minor'], weight: 2 },

  // Gyro
  { id: 'gyro-lesson', text: '{a} shows {b} how to throw a stone with a little spin on it. {b} gets it on the ninth try.',
    cast: { a: focus('gyro'), b: 'named' }, tags: ['minor'], when: { rounds: ['night'] }, weight: 2 },
  { id: 'gyro-gold-teeth', text: '{a} grins at a rival, flashing {a.their} gold teeth, and leaves {b} in the dust.',
    cast: { a: focus('gyro'), b: 'named' }, effects: { a: { pace: 1 }, b: { pace: -1 } }, tags: ['no-fault', 'sprint'], when: { rounds: ['day'] }, weight: 2 },

  // Diego
  { id: 'diego-sneer', text: '{a} laughs at {b} as {a.they} pass{a:es}. It costs nothing, and it gets under {b.their} skin all day.',
    cast: { a: focus('diego'), b: 'named' }, effects: { b: { pace: -1 } }, tags: ['no-fault'], weight: 2 },
  { id: 'diego-mother', text: '{a} rides alone at night, saying nothing to anyone, jaw set.',
    cast: { a: focus('diego') }, tags: ['minor'], when: { rounds: ['night'] }, weight: 2 },

  // Sandman
  { id: 'sandman-tracks', text: "{a} runs on the hard ground where no hoof can grip, and leaves no tracks at all.",
    cast: { a: focus('sandman') }, effects: { a: { pace: 1 } }, tags: ['pace'], when: { terrain: ['rough', 'mountains', 'desert'] }, weight: 3 },
  { id: 'sandman-books', text: '{a} reads a law book by firelight. {a.They} plan{a:s} to buy back the land the honest way.',
    cast: { a: focus('sandman') }, tags: ['minor'], when: { rounds: ['night'] }, weight: 2 },

  // Mountain Tim
  { id: 'tim-rope-bridge', text: '{a} throws a rope across a gorge and helps three riders over before crossing {a.themself}.',
    cast: { a: focus('mountaintim') }, effects: { a: { points: 5 } }, tags: ['help'], when: { terrain: ['mountains', 'rough'] }, weight: 3 },
  { id: 'tim-letter', text: '{a} reads the same letter for the tenth time and tucks it back inside {a.their} vest.',
    cast: { a: focus('mountaintim') }, tags: ['minor'], when: { rounds: ['night'] }, weight: 2 },

  // Pocoloco
  { id: 'poco-coin', text: "{a} flips a coin to choose a fork. Of course it's the right one.",
    cast: { a: focus('pocoloco') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 3 },
  { id: 'poco-dance', text: '{a} dances a little jig at a water stop, for no reason anyone can tell.',
    cast: { a: focus('pocoloco') }, tags: ['minor'], weight: 2 },

  // Wekapipo
  { id: 'weka-steel', text: "{a} drives off three bandits with a single spinning steel ball. Nobody else even sees it thrown.",
    cast: { a: focus('wekapipo') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 3 },
  { id: 'weka-alone', text: '{a} camps far from the others, back to a rock, and watches the dark until dawn.',
    cast: { a: focus('wekapipo') }, tags: ['minor'], when: { rounds: ['night'] }, weight: 2 },

  // Norisuke Higashikata IV
  { id: 'norisuke-fruit', text: '{a} hands out dried fruit from a bottomless saddlebag and charges nobody for it.',
    cast: { a: focus('norisuke'), b: 'named' }, effects: { b: { pace: 1 } }, tags: ['help'], weight: 3 },
  { id: 'norisuke-steady', text: '{a} rides at exactly the same pace from dawn to dusk, like a clock.',
    cast: { a: focus('norisuke') }, effects: { a: { pace: 1 } }, tags: ['minor', 'pace'], weight: 3 },

  // Mrs. Robinson
  { id: 'robinson-eyes', text: '{a} lets a beetle crawl out of {a.their} eye socket, just to watch {b} go pale.',
    cast: { a: focus('robinson'), b: 'named' }, effects: { b: { pace: -1 } }, tags: ['sabotage'], weight: 2 },
  { id: 'robinson-hive', text: '{a} rides through a cloud of {a.their} own insects, and nobody comes near {a.them} all day.',
    cast: { a: focus('robinson') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 2 },

  // Oyecomova
  { id: 'oyecomova-pins', text: '{a} pulls the pin out of an old tree stump. It blows apart and clears the trail.',
    cast: { a: focus('oyecomova') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 3 },
  { id: 'oyecomova-patriot', text: "{a} salutes a flag at a post office and keeps saluting until it's out of sight.",
    cast: { a: focus('oyecomova') }, tags: ['minor'], weight: 2 },

  // Urmd Avdul
  { id: 'avdul-camel', text: "{a}'s camel drinks once and walks for three days. The horses around it look on in envy.",
    cast: { a: focus('avdul') }, effects: { a: { pace: 1 } }, tags: ['pace'], when: { terrain: ['desert', 'prairie', 'rough'] }, weight: 3 },
  { id: 'avdul-stars', text: '{a} steers by the stars all night while the rest of the field sleeps.',
    cast: { a: focus('avdul') }, effects: { a: { pace: 1 } }, tags: ['pace'], when: { rounds: ['night'] }, weight: 2 },

  // Benjamin Boom Boom
  { id: 'benjamin-orders', text: '{a} barks orders at {a.their} sons all morning. Only one of them listens.',
    cast: { a: focus('benjamin') }, tags: ['minor'], weight: 2 },
  { id: 'benjamin-iron', text: '{a} pulls the nails out of a rickety bridge with magnetism, right after crossing it. {b} has to go around.',
    cast: { a: focus('benjamin'), b: 'named' }, effects: { b: { pace: -1 } }, tags: ['sabotage'], weight: 2 },

  // Andre Boom Boom
  { id: 'andre-blood', text: "{a} cuts {a.their} own palm and flicks blood at a rival's stirrup. Every spur on the trail drags at {b}.",
    cast: { a: focus('andre'), b: { is: 'named', hasHorse: true } }, effects: { b: { pace: -1 } }, tags: ['sabotage'], weight: 2 },
  { id: 'andre-father', text: '{a} rides ahead of the family for once, just to see what it feels like.',
    cast: { a: focus('andre') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 2 },

  // L.A. Boom Boom
  { id: 'la-sand', text: '{a} gathers iron sand into a little whirlwind for fun, until it spooks {a.their} own horse.',
    cast: { a: focus('la') }, effects: { a: { pace: -1 } }, tags: ['minor'], weight: 2 },
  { id: 'la-youngest', text: '{a} sneaks off from the family at night to watch the other racers, and is back before anyone notices.',
    cast: { a: focus('la') }, tags: ['minor'], when: { rounds: ['night'] }, weight: 2 },

  // ============================================================ new stage events
  // Stage 1: the beach sprint
  { id: 's1-crowd-surge', text: 'The crowd at San Diego spills onto the sand, and {a} threads through the gap they leave.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(1, { rounds: ['day'] }), weight: 3 },
  { id: 's1-tide', text: 'The tide comes in early and swallows the hard sand. {a} slogs through the soft stuff.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(1), weight: 3 },
  { id: 's1-reporter', text: 'A newspaperman chases {a} along the beach shouting questions. {a} has no breath to answer.',
    cast: { a: 'focus' }, tags: ['minor'], when: ST(1), weight: 2 },

  // Stage 2: the Arizona desert
  { id: 's2-dust-devil', text: "A dust devil spins across the trail and fills {a}'s eyes with grit.",
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(2, { rounds: ['day'] }), weight: 3 },
  { id: 's2-cactus-water', text: '{a} cuts open a barrel cactus and drinks while the others ration their canteens.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(2), weight: 3 },
  { id: 's2-scorpion-camp', text: '{a} wakes with a scorpion on {a.their} chest and lies still for an hour until it wanders off.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(2, { rounds: ['night'] }), weight: 2 },
  { id: 's2-share-shade', text: '{a} lets {b}, sunstruck and dizzy, share the only shade for miles.',
    cast: { a: 'focus', b: 'npc' }, tags: ['help'], when: ST(2, { rounds: ['day'] }), weight: 2 },

  // Stage 3: the Rockies
  { id: 's3-thin-air', text: '{a} gasps in the thin air on the high pass and has to stop every mile.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(3), weight: 3 },
  { id: 's3-elk', text: 'A herd of elk blocks the trail, and {a} picks a way around them before anyone else does.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(3, { rounds: ['day'] }), weight: 2 },
  { id: 's3-snowblind', text: 'The glare off the snow leaves {a} half blind for a day.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['hazard'], when: ST(3), weight: 2 },

  // Stage 4: the prairie
  { id: 's4-grass-fire', text: 'A grass fire races across the prairie. {a} outruns it with smoke in {a.their} lungs.',
    cast: { a: 'focus' }, effects: { a: { injured: true } }, tags: ['hazard'], when: ST(4), weight: 2 },
  { id: 's4-buffalo', text: 'A buffalo herd crosses the trail for an hour. {a} waits, and counts.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(4, { rounds: ['day'] }), weight: 3 },
  { id: 's4-tailwind', text: 'A strong wind at {a}\'s back pushes {a.them} across the flat miles.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['minor', 'pace'], when: ST(4), weight: 3 },

  // Stage 5: Chicago
  { id: 's5-stockyards', text: '{a} cuts through the stockyards to save a mile and comes out smelling like it.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(5), weight: 3 },
  { id: 's5-fire-bell', text: 'A fire bell clangs and the streets clear. {a} rides through behind the fire wagon.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(5, { rounds: ['day'] }), weight: 2 },
  { id: 's5-elevated', text: '{a} follows the elevated railway through the city, the one street in Chicago nobody else is using.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(5), weight: 2 },
  { id: 's5-lunch-counter', text: '{a} spends a dollar at a lunch counter and eats the best meal of the race on the move.',
    cast: { a: 'focus' }, tags: ['minor'], when: ST(5), weight: 2 },
  { id: 's6-lake-wind', text: 'Wind off the lake freezes {a} to the bone. {a.They} ride{a:s} with numb hands all day.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(6), weight: 3 },
  { id: 's6-ice-fishers', text: 'Ice fishers point {a} to the safest crossing, and {a} saves an hour.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(6), weight: 3 },
  { id: 's6-stray-dog', text: '{a} follows a stray dog across the frozen marsh, and it leads {a.them} to solid ground.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(6), weight: 2 },
  { id: 's7-forest-dark', text: 'The forest is so thick {a} rides at noon by lantern light.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(7), weight: 3 },
  { id: 's7-watched', text: '{a} feels watched from the trees all day. Nobody ever shows.',
    cast: { a: 'focus' }, tags: ['minor'], when: ST(7), weight: 3 },
  { id: 's7-old-road', text: '{a} finds an old colonial road under the leaves and follows it straight east.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(7), weight: 2 },

  // Stage 8: Both Sides Now
  { id: 's8-fog-coast', text: 'Sea fog rolls in, and {a} rides by the sound of the surf alone.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(8), weight: 3 },
  { id: 's8-boardwalk', text: '{a} takes the boardwalk through a seaside town while the others fight the sand.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(8, { rounds: ['day'] }), weight: 3 },
  { id: 's8-gulls', text: 'Gulls steal half of {a}\'s supplies while {a.they} water{a:s} up.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(8), weight: 2 },

  // Stage 9: Manhattan Rhapsody
  { id: 's9-skyline', text: '{a} sees the New York skyline for the first time and forgets to breathe.',
    cast: { a: 'focus' }, tags: ['minor'], when: ST(9), weight: 3 },
  { id: 's9-bridge', text: '{a} crosses the great bridge into Manhattan with half the city leaning over the rails to watch.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['pace'], when: ST(9), weight: 2 },
  { id: 's9-traffic', text: 'Carriages, carts and crowds jam the streets. {a} loses ten minutes to a single intersection.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: ST(9), weight: 3 },

  // ============================================================ Stands with no events
  { id: 'stand-anubis', text: '{b} draws on {a} at a crossing. {a.stand} has seen that move before, and the gun is in the river before it clears the holster.',
    cast: { a: S('anubis'), b: 'npc' }, tags: ['stand'], weight: 2 },
  { id: 'stand-spice-girl', text: '{a} softens a boulder with {a.stand} and rides right through it.',
    cast: { a: S('spice-girl') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-aerosmith', text: '{a} sends {a.stand} up ahead to scout, and picks the fastest valley from the air.',
    cast: { a: S('aerosmith') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-kraft-work', text: 'A rockslide comes down on {a}. {a.stand} pins the rocks in midair until {a.they} {a:is/are} clear.',
    cast: { a: S('kraft-work') }, tags: ['stand'], when: { terrain: ['mountains', 'rough'] }, weight: 2 },
  { id: 'stand-soft-and-wet', text: '{a} pops a bubble from {a.stand} on a raging stream and steals its current. {a} wades across a still river.',
    cast: { a: S('soft-and-wet') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-echoes-act-1', text: "{a} sticks a CLANG to a snake's tail with {a.stand}. It flees, rattling like a cowbell.",
    cast: { a: S('echoes-act-1') }, tags: ['stand'], weight: 2 },
  { id: 'stand-echoes-act-1-night', text: '{a} sticks a soft lullaby to {a.their} bedroll with {a.stand} and sleeps through a storm.',
    cast: { a: S('echoes-act-1') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], when: { rounds: ['night'] }, weight: 1.5 },
  { id: 'stand-harvest', text: "{a}'s {a.stand} brings back a dropped canteen, three coins and a lost compass from the trail.",
    cast: { a: S('harvest') }, effects: { a: { points: 5 } }, tags: ['stand'], weight: 2 },
  { id: 'stand-pearl-jam', text: '{a} cooks a meal with {a.stand} at camp, and wakes with every ache gone.',
    cast: { a: S('pearl-jam') }, effects: { a: { heal: true } }, tags: ['stand'], when: { rounds: ['night'] }, weight: 2 },
  { id: 'stand-highway-star', text: "{a}'s {a.stand} runs the road ahead and comes back to say where the washouts are.",
    cast: { a: S('highway-star') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-moody-blues', text: '{a} has {a.stand} replay the last rider through a fork, and follows the right tracks.',
    cast: { a: S('moody-blues') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-beach-boy', text: "{a} casts {a.stand}'s line through a wall of rock, hooks a supply sack on the far side and reels it in.",
    cast: { a: S('beach-boy') }, effects: { a: { points: 5 } }, tags: ['stand'], weight: 2 },
  { id: 'stand-little-feet', text: '{a} shrinks a fallen log with {a.stand} and steps over it.',
    cast: { a: S('little-feet') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-tower-of-gray', text: "{a}'s {a.stand} buzzes ahead and snips every snare a trapper left across the trail.",
    cast: { a: S('tower-of-gray') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-ebony-devil', text: "{b} insults {a} at a water stop. That night, {a.stand} sneaks into {b}'s camp and cuts {b.their} reins.",
    cast: { a: S('ebony-devil'), b: { is: 'named', hasHorse: true } }, effects: { b: { pace: -1 } }, tags: ['stand', 'sabotage'], when: { rounds: ['night'] }, weight: 1.5 },
  { id: 'stand-surface', text: "{a} sends {a.stand}, wearing {a.their} face, down the wrong road. The men tailing {a.them} follow it.",
    cast: { a: S('surface') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
  { id: 'stand-planet-waves', text: 'Wolves corner {a} at dusk. A small meteorite from {a.stand} lands between them, and the pack scatters.',
    cast: { a: S('planet-waves') }, tags: ['stand'], when: { rounds: ['night'] }, weight: 2 },
  { id: 'stand-paisley-park', text: "{a}'s {a.stand} lights up the way through a maze of canyons. {a} never takes a wrong turn.",
    cast: { a: S('paisley-park') }, effects: { a: { pace: 1 } }, tags: ['stand', 'pace'], weight: 2 },
];
