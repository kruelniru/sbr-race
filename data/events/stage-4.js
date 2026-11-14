// Stage 4: The Prairie
export default [
  { id: 's4-stampede', text: 'A bison stampede thunders across the prairie. {a} gets clear, but {b} goes under.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'trampled by bison' } }, tags: ['hazard'], when: { stages: [4] }, weight: 3 },
  { id: 's4-stampede-death', text: '{a} is caught in the open when the bison stampede hits.',
    cast: { a: 'focus' }, effects: { a: { dies: 'trampled by bison' } }, tags: ['hazard'], when: { stages: [4], rounds: ['day'] }, weight: 0.6 },
  { id: 's4-sniper', text: '{b} snipes at riders from the tall grass. {a} takes a bullet in the shoulder.',
    cast: { a: 'focus', b: 'npc' }, effects: { a: { injured: true } }, tags: ['hazard'], when: { stages: [4] }, weight: 2 },
  { id: 's4-sniper-hunted', text: '{b} snipes at riders from the tall grass until {a} circles around and ends it.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'shot in the grass', by: 'a' }, a: { points: 10 } }, tags: ['defend', 'help'], when: { stages: [4] }, weight: 1.5 },
  { id: 's4-flat-out', text: '{a} gallops flat out across the open grass.',
    cast: { a: { is: 'focus', hasHorse: true } }, effects: { a: { pace: 1 } }, tags: ['minor', 'pace'], when: { stages: [4] }, weight: 5 },
  { id: 's4-little-tomb', text: '{a} stops at a lonely grave on the prairie to pay {a.their} respects.',
    cast: { a: 'focus' }, tags: ['minor'], when: { stages: [4] }, weight: 3 },
  { id: 's4-thunderstorm', text: 'Lightning strikes the prairie beside {a}. {a.horse} bolts for an hour.',
    cast: { a: { is: 'focus', hasHorse: true } }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { stages: [4] }, weight: 3 },
];
