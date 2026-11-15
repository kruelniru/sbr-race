// Stage 9: Manhattan Rhapsody
export default [
  { id: 's9-ferry', text: '{a} catches the ferry across to Manhattan just as it pulls away.',
    cast: { a: 'focus' }, effects: { a: { pace: 1 } }, tags: ['minor'], when: { stages: [9] }, weight: 4 },
  { id: 's9-streets', text: '{a} gallops through the streets of Manhattan as crowds scatter.',
    cast: { a: { is: 'focus', hasHorse: true } }, effects: { a: { pace: 1 } }, tags: ['minor'], when: { stages: [9] }, weight: 4 },
  { id: 's9-crossfire', text: 'Shots ring out near Trinity Church. {b} is killed in the crossfire as {a} rides past.',
    cast: { a: 'focus', b: 'npc' }, effects: { b: { dies: 'caught in crossfire' } }, tags: ['hazard'], when: { stages: [9] }, weight: 2.5 },
  { id: 's9-rooftop', text: '{a} is shot from a rooftop within sight of the finish.',
    cast: { a: 'focus' }, effects: { a: { dies: 'shot from a rooftop' } }, tags: ['hazard'], when: { stages: [9] }, weight: 0.5 },
  { id: 's9-last-rivals', text: '{a} and {b} trade blows on a crowded avenue, neither willing to yield.',
    cast: { a: 'focus', b: 'named' }, effects: { a: { injured: true }, b: { injured: true } }, tags: ['risky', 'no-fault'], when: { stages: [9] }, weight: 1.5 },
];
