// The five personalities from DESIGN.md. A personality picks for a player
// when their timer runs out or they're disconnected, marks "★ In character"
// options, and nudges which random events they get (milestone 2–3).
// `tradeoff` is shown under the blurb on character creation: words, never
// numbers. It matches rules.worthiness.byPersonality.
export default [
  {
    id: 'honorable',
    label: 'Honorable',
    blurb: 'Spares the beaten, helps the fallen, keeps their word.',
    tradeoff: 'Starts more worthy, but stops to help, which costs time.',
  },
  {
    id: 'ruthless',
    label: 'Ruthless',
    blurb: 'Wins at any cost. Takes what the weak drop.',
    tradeoff: 'Starts less worthy, but gets more chances to kill and sabotage.',
  },
  {
    id: 'cautious',
    label: 'Cautious',
    blurb: 'Lives to ride another day. Avoids every risk it can.',
    tradeoff: 'Somewhat worthy and safer, but places worse.',
  },
  {
    id: 'glory',
    label: 'Glory-Seeker',
    blurb: 'Wants the crowd, the podium and the legend.',
    tradeoff: 'Middle of the road; pushes for the podium and takes risks.',
  },
  {
    id: 'opportunist',
    label: 'Opportunist',
    blurb: 'Goes wherever the wind blows best for them.',
    tradeoff: 'Middle of the road; bends whichever way pays.',
  },
];
