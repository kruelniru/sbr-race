// Stage 3: Rocky Mountains
export default [
  { id: 's3-avalanche', text: 'An avalanche roars down the pass. {a} outruns it, {b} is buried alive, and {c} turns back for good.',
    cast: { a: 'focus', b: 'named', c: 'npc' }, effects: { b: { dies: 'buried by an avalanche' }, c: { retires: true } }, tags: ['hazard'], when: { stages: [3] }, weight: 0.6 },
  { id: 's3-ledge', text: '{a} slips on an icy ledge and falls into the ravine.',
    cast: { a: 'focus' }, effects: { a: { dies: 'fell from an icy ledge' } }, tags: ['hazard'], when: { stages: [3] }, weight: 0.8 },
  { id: 's3-freezing-night', text: '{a} shivers through a freezing night in the pass.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { stages: [3], rounds: ['night'] }, weight: 5 },
  { id: 's3-rockslide-horse', text: 'A rockslide crushes {a.horse}. {a} climbs on alone.',
    cast: { a: { is: 'focus', hasHorse: true } }, effects: { a: { horse: 'dies' } }, tags: ['hazard'], when: { stages: [3] }, weight: 0.5 },
  { id: 's3-guide', text: '{a} pays a mountain man to guide {a.them} over the pass.',
    cast: { a: 'focus' }, effects: { a: { pace: 2 } }, tags: ['pace'], when: { stages: [3], rounds: ['day'] }, weight: 2.5 },
  { id: 's3-frostbite', text: "{a} loses feeling in {a.their} fingers and has to stop to thaw them.",
    cast: { a: 'focus' }, effects: { a: { injured: true } }, tags: ['hazard'], when: { stages: [3] }, weight: 1.5 },
  { id: 's3-rescue-crevasse', text: '{b} slips into a crevasse. {a} lowers a rope and pulls {b.them} out.',
    cast: { a: 'focus', b: 'named' }, effects: { a: { points: 10, pace: -1 } }, tags: ['help'], when: { stages: [3] }, weight: 1.5 },
];
