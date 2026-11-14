// Stage 7: Philadelphia Triangle
export default [
  { id: 's7-forest', text: '{a} rides through dense forest toward Philadelphia.',
    cast: { a: 'focus' }, tags: ['minor'], when: { stages: [7] }, weight: 4 },
  { id: 's7-dark-rider', text: 'A rider in a dark hat ambushes {a} on a forest road. {a} barely escapes.',
    cast: { a: 'focus' }, effects: { a: { injured: true } }, tags: ['hazard'], when: { stages: [7] }, weight: 2 },
  { id: 's7-body', text: '{a} finds {b} shot dead on the road, saddlebags slashed open.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'shot on a forest road' } }, tags: ['hazard'], when: { stages: [7] }, weight: 2.5 },
  { id: 's7-lost', text: '{a} loses the trail in the woods and wanders until dawn.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { stages: [7], rounds: ['night'] }, weight: 3 },
  { id: 's7-ambush-death', text: 'Gunfire from the trees cuts {a} down on the Philadelphia road.',
    cast: { a: 'focus' }, effects: { a: { dies: 'shot from the trees' } }, tags: ['hazard'], when: { stages: [7] }, weight: 0.6 },
];
