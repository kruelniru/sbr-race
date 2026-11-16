// The Saint's Corpse, Valentine's agents and the President (milestone 5b,
// DESIGN.md → Corpse parts, Valentine). Text and names only; the numbers live
// in rules.js (corpse, agents, funnyValentine, valentine).

// One part surfaces per stage, in this order.
export const PARTS = [
  'the Left Arm', 'the Heart', 'the Eyes', 'the Spine', 'the Ears',
  'the Right Arm', 'the Legs', 'the Torso', 'the Head',
];

// Valentine's agents attack as events, never as racers. Their Stands are
// banned from the pool (data/stands.js) and never named in their lines.
export const AGENTS = [
  { id: 'ringo', name: 'Ringo Roadagain', pronouns: 'he', skill: 66 },
  { id: 'blackmore', name: 'Blackmore', pronouns: 'he', skill: 63 },
  { id: 'magent', name: 'Magent Magent', pronouns: 'he', skill: 60 },
  { id: 'mikeo', name: 'Mike O.', pronouns: 'he', skill: 60 },
  { id: 'ferdinand', name: 'Dr. Ferdinand', pronouns: 'he', skill: 58 },
  { id: 'axl', name: 'Axl RO', pronouns: 'he', skill: 62 },
  { id: 'porkpie', name: 'the Pork Pie Hat Kid', pronouns: 'he', skill: 59 },
  { id: 'tattoo', name: 'one of the Tattoo You men', pronouns: 'he', skill: 58 },
  { id: 'eleven', name: 'one of the Eleven Men', pronouns: 'he', skill: 57 },
];

export const VALENTINE = { id: 'funny-valentine', name: 'Funny Valentine', pronouns: 'he' };

// What the stream shows. Rejection lines never say "corpse"; the cause on
// the Fallen screen is vague too (the real cause is kept for the M6 reveal).
export const PART_LINES = {
  rejected: [
    { text: "{a} cries out on the trail. By the time anyone reaches {a.them}, there's only sand.", cause: 'turned to sand' },
    { text: '{a} vanishes from the trail. Nobody sees where {a.they} went.', cause: 'vanished on the trail' },
    { text: '{a} drops dead in the middle of the trail. Nobody can say why.', cause: 'dropped dead on the trail' },
  ],
  worthy: 'Someone has been deemed worthy of the Saint.',
  darkSide: 'Someone has fallen to the dark side.',
};

// Private phone hints.
export const PART_HINTS = {
  found: 'You found a corpse part: {part}.',
  kept: '{Part} sinks into your skin. It feels warm.',
  hidden: 'You wrap {part} in cloth and keep it from touching you.',
  given: 'You hand {part} to {to}.',
  received: '{from} presses a corpse part into your hands: {part}.',
  receivedQuiet: 'You come away with a corpse part: {part}.',
  palm: "You walk out of the Palm holding something that wasn't there before: {part}.",
  merged: '{Part} accepts you.',
  stand: 'Something wakes inside you, and it answers to you.',
  lost: "{Part} won't stay with you. By morning it's gone.",
  taken: 'Someone took {part} from you.',
  stolen: 'When you wake, {part} is gone.',
  stealFail: 'You wake to someone going through your things. They run.',
  stealMiss: '{b} stirs, and you back away empty-handed.',
  stoleIt: 'You slip {part} out of the bag and ride off into the dark.',
};
