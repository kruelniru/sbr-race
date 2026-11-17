// Milestone 5: horses and alliances in main events.
//   getHorse: 'riderless'  an on-foot Rider catches a horse (rules.horses.riderless)
//   ally: '<role>'         the focus and that racer start riding together
//   cast 'ally'            the focus's ally (only if they have one)
export default [
  // ---- horses
  { id: 'horse-riderless', text: "{a} catches a riderless horse on the trail. Its rider won't be needing it anymore.",
    cast: { a: 'focus' }, effects: { a: { getHorse: 'riderless' } }, tags: [], weight: 3 },
  { id: 'horse-riderless-night', text: '{a} finds a horse still saddled beside a cold campfire, and nobody comes back for it.',
    cast: { a: 'focus' }, effects: { a: { getHorse: 'riderless' } }, tags: [], when: { rounds: ['night'] }, weight: 2 },

  // ---- alliances
  { id: 'ally-share-food', text: '{a} shares the last of {a.their} food with {b}, who rides with {a.them}.',
    cast: { a: 'focus', b: 'ally' }, tags: ['help'], weight: 1.2 },
  { id: 'ally-watch', text: '{a} and {b} take turns keeping watch.',
    cast: { a: 'focus', b: 'ally' }, tags: ['minor'], when: { rounds: ['night'] }, weight: 2 },
  { id: 'ally-draft', text: '{a} and {b} trade the lead all day and save their horses.',
    cast: { a: { is: 'focus', hasHorse: true }, b: { is: 'ally', hasHorse: true } }, effects: { a: { pace: 1 }, b: { pace: 1 } }, tags: ['minor', 'pace'], weight: 1.5 },
  { id: 'ally-npc-falls-in', text: '{a} falls in with {b}, and the two agree to ride together for a while.',
    cast: { a: { is: 'focus', hasAlly: false }, b: 'npc' }, effects: { a: { ally: 'b' } }, tags: [], weight: 0.6 },
];
