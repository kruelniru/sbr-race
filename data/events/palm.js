// The Devil's Palm in main events (Stages 2–3). PCs meet it as a sub event
// (data/sub-events.js); here canon racers with palm: true (Norisuke, Mrs.
// Robinson, Avdul) and NPCs walk in. For canon racers, palmOutcome weights
// each line by their Worthiness band (rules.palm.bands): 'out' = Stand or
// nothing (the stream can't tell which), 'lost', 'dies'.
const CANON_IN = { is: 'focus', tier: 'canon', palm: true, hasStand: false };
const when = { stages: [2, 3] };

export default [
  { id: 'palm-canon-out', text: '{a} walks into a Devil\'s Palm at noon and walks back out at dusk, silent.',
    cast: { a: CANON_IN }, effects: { a: { palm: 'out' } }, palmOutcome: 'out', tags: ['risky'], when, weight: 2 },
  { id: 'palm-canon-lost', text: '{a} wanders into a Devil\'s Palm and loses a day walking in circles.',
    cast: { a: CANON_IN }, effects: { a: { palm: 'lost' } }, palmOutcome: 'lost', tags: ['risky'], when, weight: 2 },
  { id: 'palm-canon-dies', text: '{a} walks into a Devil\'s Palm and never comes out.',
    cast: { a: CANON_IN }, effects: { a: { dies: "swallowed by the Devil's Palm", palm: 'dies' } }, palmOutcome: 'dies', tags: ['risky'], when, weight: 2 },

  // NPCs, seen by a named racer. An NPC who awakens a Stand becomes a breakout.
  { id: 'palm-npc-out', text: '{a} watches {b} walk into a Devil\'s Palm. At dawn {b.they} walk{b:s} back out, silent.',
    cast: { a: 'focus', b: { is: 'npc', palm: true } }, effects: { b: { palm: 'out' } }, when, weight: 0.8 },
  { id: 'palm-npc-dies', text: '{a} watches {b} walk into a Devil\'s Palm. {b.They} never come{b:s} out.',
    cast: { a: 'focus', b: { is: 'npc', palm: true } }, effects: { b: { dies: "swallowed by the Devil's Palm", palm: 'dies' } }, when, weight: 0.5 },
];
