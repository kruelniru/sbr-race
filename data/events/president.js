// Funny Valentine on stream (milestone 7d). He is not a racer: these are
// flavor scenes, scheduled 2–3 times in each band of stages (js/engine/race.js
// presidentScene), never chosen as ordinary events. They change nothing in the
// Valentine systems, and they never name or hint at who joined him: anyone
// seen with him is an NPC ({b}, {c}); the racer in the line ({a}) only watches.
//
//   early (Stages 1–3): the friendly President, the race's patron. Heavyset, jovial.
//   mid   (Stages 4–6): something's off. Men in dark hats, a vanishing, two cities at once.
//   late  (Stages 7–9): the villain on his own ground. Lean, sun-darkened, scarred.
//
// Every line names "Funny Valentine" once, so the host can give him his badge.
const A = { a: 'focus' };

export default [
  // ------------------------------------------------------------ early: the patron
  { id: 'fv-checkpoint', band: 'early', text: 'At the checkpoint, a heavyset man in a fine coat claps {a} on the back and roars with laughter. It is the President of the United States himself, Funny Valentine, cheering every rider through.',
    cast: A, effects: { a: { pace: 1 } }, tags: ['president'] },
  { id: 'fv-speech', band: 'early', text: "Funny Valentine, round-faced and beaming, gives a speech from a bunting-draped stage about American spirit. {a} hears the crowd's roar from a mile away.",
    cast: A, tags: ['president'] },
  { id: 'fv-handshakes', band: 'early', text: 'Funny Valentine shakes hands with every race official in town, laughing his big laugh. {a} rides past the photographers.',
    cast: A, tags: ['president'], when: { rounds: ['day'] } },
  { id: 'fv-papers-praise', band: 'early', text: '{a} reads the morning paper by the fire: Funny Valentine calls the Steel Ball Run "the greatest race this nation will ever see," and promises to greet the winner in person.',
    cast: A, tags: ['president'], when: { rounds: ['night'] } },
  { id: 'fv-prize', band: 'early', text: 'A cheerful, heavyset Funny Valentine poses with the prize purse for the newspapers. {a} sees the picture at a general store and rides a little faster.',
    cast: A, effects: { a: { pace: 1 } }, tags: ['president'] },

  // ------------------------------------------------------------ mid: something's off
  { id: 'fv-dark-hats', band: 'mid', text: 'Funny Valentine waves to the crowd from a train platform, jolly as ever. {a} notices the men in dark hats standing near him, who never smile and never look at the crowd.',
    cast: A, tags: ['president'] },
  { id: 'fv-last-seen', band: 'mid', text: '{b} was seen talking with Funny Valentine behind the hotel last night. This morning {b.their} horse is still tied out front, and nobody can find {b.them}. {a} rides on uneasy.',
    cast: { a: 'focus', b: 'npc' }, tags: ['president'] },
  { id: 'fv-two-cities', band: 'mid', text: 'Two newspapers at the same stand: one has Funny Valentine dedicating a bridge in Washington, the other has him at a dinner in Chicago. Same day, same hour. {a} reads them twice.',
    cast: A, tags: ['president'] },
  { id: 'fv-passing-through', band: 'mid', text: "Funny Valentine's private train stops in town for an hour and leaves again. By nightfall, two riders who camped near the tracks are missing, and {a} hears the story three different ways.",
    cast: A, tags: ['president'], when: { rounds: ['night'] } },
  { id: 'fv-smile', band: 'mid', text: "Funny Valentine smiles for the photographers outside a bank, broad and genial. For a moment, when the flash goes off, {a} could swear the smile isn't anywhere near his eyes.",
    cast: A, tags: ['president'], when: { rounds: ['day'] } },

  // ------------------------------------------------------------ late: the villain
  { id: 'fv-philadelphia', band: 'late', text: 'Philadelphia is his city. Funny Valentine walks the station platform, lean and sun-darkened now, a scar at his brow, and the men in dark hats part for him without being told. {a} keeps {a.their} head down.',
    cast: A, tags: ['president'], when: { stages: [7, 8] } },
  { id: 'fv-orders', band: 'late', text: 'From the shadow of a carriage, Funny Valentine gives a quiet order. Four riders in dark hats split off into the trees. {a} rides the other way.',
    cast: A, effects: { a: { pace: 1 } }, tags: ['president'] },
  { id: 'fv-threat', band: 'late', text: 'Funny Valentine speaks to a crowd of reporters without raising his voice: whatever is found on the trail belongs to the nation, and the nation will collect. {a} hears it and feels cold.',
    cast: A, tags: ['president'] },
  { id: 'fv-eyes', band: 'late', text: 'A lean, scarred Funny Valentine watches the racers pass from a hotel balcony, perfectly still. {a} feels his eyes all the way down the street.',
    cast: A, tags: ['president'], when: { rounds: ['day'] } },
  { id: 'fv-flag', band: 'late', text: "{b} raises a toast to Funny Valentine in a tavern and is shown the door by men in dark hats. The President's name is not a joke anymore. {a} finishes {a.their} drink in silence.",
    cast: { a: 'focus', b: 'npc' }, tags: ['president'], when: { rounds: ['night'] } },
];
