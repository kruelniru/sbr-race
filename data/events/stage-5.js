// Stage 5: Illinois Skyline
export default [
  { id: 's5-crowds', text: "Chicago's crowds slow {a} to a walk.",
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { stages: [5] }, weight: 4 },
  { id: 's5-pickpocket', text: "{b} lifts {a}'s wallet on a crowded street.",
    cast: { a: 'focus', b: 'npc' }, tags: ['minor'], when: { stages: [5] }, weight: 3 },
  { id: 's5-alley', text: '{b} corners {a} in an alley. Only {a} walks out.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'killed in an alley', by: 'a' } }, tags: ['defend', 'kill-defense'], when: { stages: [5] }, weight: 2 },
  { id: 's5-hotel', text: '{a} sleeps in a real bed for once and rides out refreshed.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['minor'], when: { stages: [5], rounds: ['night'] }, weight: 4 },
  { id: 's5-streetcar', text: '{a} is clipped by a streetcar and limps away bruised.',
    cast: { a: 'focus' }, effects: { a: { injured: true } }, tags: ['hazard'], when: { stages: [5] }, weight: 1.5 },
  { id: 's5-newspaper', text: "{a}'s name is in the Chicago papers. The crowds want to see {a.them} win.",
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['minor', 'sprint'], when: { stages: [5] }, weight: 2 },
];
