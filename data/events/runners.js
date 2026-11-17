// Runner-only events (racers on foot by choice, like Sandman).
const runner = { is: 'focus', mount: 'runner' };

export default [
  { id: 'runner-steady-stride', text: '{a} settles into a long-distance stride.',
    cast: { a: runner }, effects: { a: { pace: 1 } }, tags: ['minor', 'pace'], weight: 3 },
  { id: 'runner-exhaustion', text: '{a} runs until {a.their} legs give out and has to rest for hours.',
    cast: { a: runner }, effects: { a: { pace: -2 } }, tags: ['hazard'], weight: 4 },
  { id: 'runner-blisters', text: "{a}'s feet are raw and bleeding.",
    cast: { a: runner }, effects: { a: { pace: -1 } }, tags: ['minor'], weight: 3 },
  { id: 'runner-leg-injury', text: '{a} lands badly on loose rock and tears a muscle in {a.their} leg.',
    cast: { a: runner }, effects: { a: { injured: true } }, tags: ['hazard'], weight: 2 },
  { id: 'runner-canyon-gap', text: '{a} leaps a canyon gap that no horse could cross and gains half a day.',
    cast: { a: runner }, effects: { a: { pace: 2, points: 5 } }, tags: ['risky', 'pace'], when: { terrain: ['desert', 'mountains'] }, weight: 3 },
  { id: 'runner-cliff-path', text: '{a} climbs a goat path straight up the ridge while the riders take the long way round.',
    cast: { a: runner }, effects: { a: { pace: 2 } }, tags: ['risky', 'pace'], when: { terrain: ['mountains'] }, weight: 2.5 },
  { id: 'runner-thin-ice', text: "{a} runs across thin ice that the horses won't risk.",
    cast: { a: runner }, effects: { a: { pace: 2, points: 5 } }, tags: ['risky', 'pace'], when: { terrain: ['ice'] }, weight: 3 },
  { id: 'runner-through-ice', text: 'The ice gives way under {a}. {a.They} {a:is/are} gone in an instant.',
    cast: { a: runner }, effects: { a: { dies: 'fell through the ice' } }, tags: ['risky', 'hazard'], when: { terrain: ['ice'] }, weight: 0.4 },
  { id: 'runner-heat-collapse', text: 'The midday heat catches {a} in the open, and {a.they} collapse{a:s} for good.',
    cast: { a: runner }, effects: { a: { dies: 'collapsed from exhaustion' } }, tags: ['risky', 'hazard'], when: { terrain: ['desert'], rounds: ['day'] }, weight: 0.4 },
  { id: 'runner-legs-give-out', text: "{a}'s legs finally give out. {a.They} can't run another mile, and {a.their} race is over.",
    cast: { a: runner }, effects: { a: { retires: true } }, tags: ['hazard'], weight: 0.6 },
  { id: 'runner-mocked', text: 'Riders laugh as they pass {a}. By evening, {a} has caught every one of them.',
    cast: { a: runner }, effects: { a: { pace: 1 } }, tags: ['pace'], weight: 2 },
  { id: 'runner-flats', text: 'On the open flats, {a} watches rider after rider gallop away.',
    cast: { a: runner }, effects: { a: { pace: -1 } }, tags: ['minor'], when: { terrain: ['flat'] }, weight: 4 },
];
