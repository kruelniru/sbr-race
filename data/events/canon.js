// Events written for specific canon racers.
const focus = (id, extra = {}) => ({ is: 'focus', canon: id, ...extra });

export default [
  // ============================================================ Hot Pants
  // Kind to the wounded, merciless to enemies, and above all to the President's people.
  { id: 'hp-heal-racer', text: "{a} sprays Cream Starter over {b}'s wounds, and the flesh knits shut. {b} can ride again.",
    cast: { a: focus('hotpants'), b: { is: 'named', injured: true } },
    effects: { a: { points: 5 }, b: { heal: true } }, tags: ['help'], weight: 10 },
  { id: 'hp-heal-stranger', text: '{a} finds {b} bleeding out on the trail and seals the wound with Cream Starter.',
    cast: { a: focus('hotpants'), b: 'npc' }, effects: { a: { points: 5 } }, tags: ['help', 'save'], weight: 4 },
  { id: 'hp-disguise', text: '{a} reshapes {a.their} face with Cream Starter and slips past a knot of rivals unnoticed.',
    cast: { a: focus('hotpants') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 3 },
  { id: 'hp-ambushed', text: "{b} ambushes {a} and opens a gash in {a.their} arm. {a} seals it with Cream Starter, then fills {b}'s throat with flesh spray. {b} doesn't get up.",
    cast: { a: focus('hotpants'), b: 'npc' }, effects: { b: { dies: 'choked by Cream Starter', by: 'a' } }, tags: ['defend', 'kill-defense'], weight: 3 },
  { id: 'hp-vs-valentine', text: "{a} recognizes {b} as one of the President's men. Cream Starter fills {b}'s lungs before {b.they} can strike.",
    cast: { a: focus('hotpants'), b: { is: 'named', side: 'valentine' } },
    effects: { b: { dies: 'smothered by Cream Starter', by: 'a' } }, tags: ['kill', 'kill-started'], weight: 2 },
  { id: 'hp-prayer', text: '{a} kneels alone by the fire and prays for {a.their} brother.',
    cast: { a: focus('hotpants') }, tags: ['minor'], when: { rounds: ['night'] }, weight: 3 },
  { id: 'hp-mends-herself', text: "{a} takes a fall on the rocks, sprays the wound closed, and doesn't slow down.",
    cast: { a: focus('hotpants') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 2 },

  // ============================================================ Gyro
  { id: 'gyro-spare', text: "{b} draws on {a}. A spinning steel ball knocks the gun away, and {a} lets {b.them} go.",
    cast: { a: focus('gyro'), b: 'npc' }, effects: { b: { sparedBy: 'a' } }, tags: ['spare'], weight: 3 },
  { id: 'gyro-shares-food', text: '{a} shares {a.their} cheese and dried meat with {b}.',
    cast: { a: focus('gyro'), b: 'named' }, effects: { b: { pace: 1 } }, tags: ['help'], weight: 3 },
  { id: 'gyro-song', text: '{a} hums a made-up song about cheese to pass the miles.',
    cast: { a: focus('gyro') }, tags: ['minor'], weight: 3 },

  // ============================================================ Johnny
  { id: 'johnny-grit', text: "{a} grips the reins with {a.their} legs useless beneath {a.them} and refuses to fall behind.",
    cast: { a: focus('johnny') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 3 },
  { id: 'johnny-with-gyro', text: '{a} and {b} ride together, bickering the whole way.',
    cast: { a: focus('johnny'), b: { is: 'named', canon: 'gyro' } }, tags: ['minor'], weight: 4 },

  // ============================================================ Diego
  { id: 'diego-slipstream', text: "{a} rides in {b}'s slipstream all afternoon, then overtakes {b.them} at the last moment.",
    cast: { a: focus('diego'), b: 'named' }, effects: { a: { pace: 1 }, b: { pace: -1 } }, tags: ['no-fault'], weight: 3 },
  { id: 'diego-reads-horse', text: '{a} reads the terrain like a jockey reads a track and finds the fastest line.',
    cast: { a: focus('diego') }, effects: { a: { pace: 1 } }, tags: ['minor', 'pace'], weight: 3 },

  // ============================================================ Sandman (Runner)
  { id: 'sandman-silent', text: '{a} runs in long, silent strides and keeps pace with the horses.',
    cast: { a: focus('sandman') }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 3 },
  { id: 'sandman-land', text: "{a} thinks of {a.their} people's land and runs harder.",
    cast: { a: focus('sandman') }, tags: ['minor'], weight: 2 },

  // ============================================================ Mountain Tim
  { id: 'tim-lasso', text: '{a} lassoes {b} out of a flash flood.',
    cast: { a: focus('mountaintim'), b: 'named' }, effects: { a: { points: 10 } }, tags: ['help', 'save'], weight: 2.5 },
  { id: 'tim-cowboy', text: '{a} tips {a.their} hat to every rider {a.they} pass{a:es}.',
    cast: { a: focus('mountaintim') }, tags: ['minor'], weight: 3 },

  // ============================================================ Pocoloco
  { id: 'poco-luck', text: "{a}'s luck holds again: a full canteen lying in the dirt, right where {a.they} need{a:s} it.",
    cast: { a: focus('pocoloco') }, effects: { a: { pace: 1 } }, tags: ['minor'], weight: 4 },
  { id: 'poco-dodges', text: "A bullet meant for {a} hits {a.their} hat instead. {a} laughs and rides on.",
    cast: { a: focus('pocoloco') }, tags: [], weight: 2 },

  // ============================================================ Wekapipo
  { id: 'weka-warns', text: '{a} warns {b} about an ambush ahead.',
    cast: { a: focus('wekapipo'), b: 'named' }, tags: ['help'], weight: 3 },

  // ============================================================ Mrs. Robinson
  { id: 'robinson-swarm', text: '{a} sends a swarm of insects after {b}, who flees the trail screaming.',
    cast: { a: focus('robinson'), b: 'named' }, effects: { b: { pace: -2 } }, tags: ['sabotage'], weight: 3 },

  // ============================================================ Oyecomova
  { id: 'oyecomova-bomb', text: '{a} plants a bomb under a bridge. {b} rides over it.',
    cast: { a: focus('oyecomova'), b: 'npc' }, effects: { b: { dies: 'blown up on a bridge', by: 'a' } }, tags: ['kill', 'kill-started'], weight: 2 },

  // ============================================================ Urmd Avdul
  { id: 'avdul-desert', text: '{a} reads the desert like a map and finds water where no one else can.',
    cast: { a: focus('avdul') }, effects: { a: { pace: 1 } }, tags: ['minor'], when: { terrain: ['desert'] }, weight: 4 },

  // ============================================================ The Boom Boom family (Valentine's side)
  { id: 'boom-wire', text: "{a} strings wire across the trail. {b}'s horse goes down hard.",
    cast: { a: { is: 'focus', side: 'valentine' }, b: { is: 'named', notSide: 'valentine', hasHorse: true } },
    effects: { b: { injured: true } }, tags: ['sabotage'], weight: 3 },
  { id: 'boom-family-ride', text: '{a} rides with the rest of the Boom Boom family, eyeing the other racers.',
    cast: { a: { is: 'focus', side: 'valentine' } }, tags: ['minor'], weight: 3 },
];
