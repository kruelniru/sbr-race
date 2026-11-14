// Stage 6: Michigan Lakeline
export default [
  { id: 's6-ice-death', text: 'The ice of the Straits of Mackinac cracks under {a}.',
    cast: { a: { is: 'focus', mount: 'horse' } }, effects: { a: { dies: 'fell through the ice' } }, tags: ['hazard'], when: { stages: [6] }, weight: 0.7 },
  { id: 's6-ice-horse', text: '{a.horse} breaks through the ice. {a} scrambles out, but the horse is gone.',
    cast: { a: { is: 'focus', hasHorse: true } }, effects: { a: { horse: 'dies' } }, tags: ['hazard'], when: { stages: [6] }, weight: 0.6 },
  { id: 's6-ice-rescue', text: '{b} falls through the ice, and {a} hauls {b.them} out by the collar.',
    cast: { a: 'focus', b: 'named' }, effects: { a: { points: 10 }, b: { injured: true } }, tags: ['help'], when: { stages: [6] }, weight: 1.5 },
  { id: 's6-fog', text: 'Fog rolls off the lake and {a} loses the trail for hours.',
    cast: { a: 'focus' }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { stages: [6] }, weight: 4 },
  { id: 's6-npc-ice', text: '{a} hears the ice crack behind {a.them} and turns to see {b} disappear.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'fell through the ice' } }, tags: ['hazard'], when: { stages: [6] }, weight: 2.5 },
  { id: 's6-lakeshore', text: '{a} follows the lakeshore at a steady clip.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['minor'], when: { stages: [6] }, weight: 3 },
];
