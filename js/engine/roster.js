// Making game-controlled racers. Pure: uses the game's seeded Rng.
import AI_NAMES from '../../data/ai-names.js';
import PERSONALITIES from '../../data/personalities.js';

const GENDER_FOR = { he: 'Man', she: 'Woman', they: '' };

/**
 * A random character for an AI racer.
 * @param {import('./rng.js').Rng} rng
 * @param {Set<string>} takenNames  lower-cased names already in the race
 */
export function makeAiCharacter(rng, takenNames) {
  let name;
  for (let tries = 0; tries < 200; tries++) {
    name = `${rng.pick(AI_NAMES.first)} ${rng.pick(AI_NAMES.last)}`;
    if (!takenNames.has(name.toLowerCase())) break;
  }
  // 1-in-3 each, so all three pronoun sets show up in testing.
  const pronouns = rng.pick(['he', 'she', 'they']);
  return {
    name,
    gender: GENDER_FOR[pronouns],
    pronouns,
    personality: rng.pick(PERSONALITIES).id,
    picture: null,
  };
}
