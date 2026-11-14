// Stage 8: Both Sides Now
export default [
  { id: 's8-tide', text: '{a} fords a river mouth near Union Beach as the tide comes in.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { stages: [8] }, weight: 3 },
  { id: 's8-coast-road', text: '{a} races along the coast road at full speed.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['minor', 'pace'], when: { stages: [8] }, weight: 4 },
  { id: 's8-bridge', text: '{b} offers to ride with {a}, then tries to push {a.them} off a bridge. {a} kills {b.them} instead.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'killed on a bridge', by: 'a' } }, tags: ['defend'], when: { stages: [8] }, weight: 2 },
  { id: 's8-drowned', text: '{a} is swept off a causeway by a rogue wave.',
    cast: { a: 'focus' }, effects: { a: { dies: 'drowned' } }, tags: ['hazard'], when: { stages: [8] }, weight: 0.5 },
];
