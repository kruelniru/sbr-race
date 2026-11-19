// Stage 1: 15,000 Meters (beach sprint)
export default [
  { id: 's1-pileup', text: 'Dozens of horses collide off the start line. {a} gets clear, but {b} is trampled.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'trampled at the start' } }, tags: ['hazard'], when: { stages: [1], rounds: ['day'] }, weight: 5 },
  { id: 's1-trampled', text: '{a} goes down in the stampede off the start and is trampled.',
    cast: { a: 'focus' }, effects: { a: { dies: 'trampled at the start' } }, tags: ['hazard'], when: { stages: [1], rounds: ['day'] }, weight: 1.1 },
  { id: 's1-cliff-path', text: '{a} takes the cliff path along the coast while the pack fights over the beach.',
    cast: { a: 'focus' }, effects: { a: { pace: 2 } }, tags: ['risky', 'pace'], when: { stages: [1] }, weight: 3 },
  { id: 's1-deep-sand', text: '{a.horse} bogs down in the deep sand.',
    cast: { a: { is: 'focus', hasHorse: true } }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { stages: [1] }, weight: 4 },
  { id: 's1-runner-weave', text: 'With no horse to steer, {a} weaves through the chaos at the start.',
    cast: { a: { is: 'focus', mount: 'runner' } }, effects: { a: { pace: 1 } }, tags: ['pace'], when: { stages: [1], rounds: ['day'] }, weight: 4 },
  { id: 's1-knocked-out', text: "{a} is knocked from the saddle in the first mile. {a.Their} race is over before it began.",
    cast: { a: { is: 'focus', hasHorse: true } }, effects: { a: { retires: true } }, tags: ['hazard'], when: { stages: [1], rounds: ['day'] }, weight: 0.8 },
  { id: 's1-whip', text: "{a} lashes {b} across the face with a riding crop to get past.",
    cast: { a: 'focus', b: 'npc' }, effects: { a: { pace: 1 }, b: { retires: true } }, tags: ['sabotage'], when: { stages: [1] }, weight: 2 },
  { id: 's1-gunfire', text: 'Shots ring out in the crush at the start. {b} falls. {a} keeps {a.their} head down and rides.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'shot in the chaos at the start' } }, tags: ['hazard'], when: { stages: [1], rounds: ['day'] }, weight: 3 },
];
