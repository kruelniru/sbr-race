// Epilogue cards after the podium (milestone 6b). Any number can show in one
// game. To add one: push an entry with an id, a title, `when(c)` and `text(c)`.
//
//   c = { state, winner, podium, ending, racers }
//     winner: the racer who crossed first (a full racer object) or null
//     podium: finale.podium ([{ id, name, ... }])
//     ending: the main ending id ('normal', 'corpse', 'president', ...)
//     racers: every named racer (PCs and canon)

// Canon champions, written in character. Hot Pants gets the long one.
export const CANON_EPILOGUES = {
  gyro: 'Gyro Zeppeli rides home to Naples with the prize money, and a boy who was condemned to hang walks free.',
  johnny: 'Johnny Joestar finishes the race on his own two feet. Somewhere behind him, Gyro is laughing.',
  diego: 'Diego Brando takes the crown he always said was his, and for once, nobody argues.',
  hotpants: [
    'Hot Pants crosses the line first, and nobody on the trail is surprised.',
    'She spent the race healing strangers and hunting the President\'s men, and she never once asked to be forgiven.',
    'Somewhere in New York, a church bell rings for her.',
  ].join(' '),
  sandman: 'Sandman ran the whole way. The prize money buys back his people\'s land.',
  mountaintim: 'Mountain Tim tips his hat to the crowd and rides off to find the woman he promised to protect.',
  pocoloco: 'Pocoloco wins. Of course he does. His luck was always going to hold.',
  wekapipo: 'Wekapipo wins a new life in America, and finally stops looking over his shoulder.',
  norisuke: 'Norisuke Higashikata IV wins the Steel Ball Run, and a fortune his great-grandchildren will hear about.',
  robinson: 'Mrs. Robinson rides into New York in a swarm of insects and a blaze of glory.',
  oyecomova: 'Oyecomova wins, and New York doesn\'t know what to make of him.',
  avdul: 'Urmd Avdul and his camel cross the line first. The camel takes most of the credit.',
  benjamin: 'Benjamin Boom Boom wins, and the whole Boom Boom family hears about it for years.',
  andre: 'Andre Boom Boom wins the Steel Ball Run, and finally steps out of his father\'s shadow.',
  la: 'L.A. Boom Boom, the youngest, wins it all.',
};

export const EPILOGUES = [
  {
    // Milestone 7c: a Requiem no longer wins outright; anyone who held one gets this card.
    id: 'requiem', title: 'A Requiem rode in the Steel Ball Run',
    when: (c) => (c.state.race.requiems ?? []).length > 0,
    text: (c) => (c.state.race.requiems ?? []).map((q) => {
      const r = c.racers.find((x) => x.id === q.id);
      const place = c.podium.findIndex((x) => x.id === q.id);
      const how = !r ? '' : place === 0 ? ' and won the race'
        : r.status === 'dead' ? ` until Stage ${r.death?.stage ?? '?'}, when even a Requiem was not enough`
          : r.status === 'racing' ? ' all the way to New York' : '';
      return `${q.name} rode with ${q.stand}${how}.`;
    }).join(' ') + ' No one ever reached the end of it.',
  },
  {
    id: 'saint-smiles', title: 'The Saint Smiles',
    when: (c) => c.winner && (c.winner.kills ?? 0) === 0 && (c.winner.worthiness ?? 0) >= 75,
    text: (c) => `${c.winner.name} won the Steel Ball Run without taking a single life.`,
  },
  {
    id: 'devils-champion', title: "The Devil's Champion",
    when: (c) => c.winner && (c.winner.kills ?? 0) > 0 && c.winner.kills >= Math.max(...c.racers.map((r) => r.kills ?? 0)),
    text: (c) => `${c.winner.name} won with the most blood on ${c.winner.pronouns === 'she' ? 'her' : c.winner.pronouns === 'he' ? 'his' : 'their'} hands: ${c.winner.kills} ${c.winner.kills === 1 ? 'kill' : 'kills'}.`,
  },
  {
    id: 'on-foot', title: 'On Foot to Glory',
    when: (c) => c.winner && c.winner.mount === 'runner',
    text: (c) => `${c.winner.name} ran the whole continent, and beat every horse in America.`,
  },
  {
    id: 'ride-together', title: 'Ride Together',
    when: (c) => {
      const [a, b] = c.podium;
      if (!a || !b) return false;
      const ra = c.racers.find((r) => r.id === a.id);
      return !!ra && ra.ally === b.id;
    },
    text: (c) => `${c.podium[0].name} and ${c.podium[1].name} rode together, and finished first and second.`,
  },
  {
    id: 'canon-champion', title: 'A legend of the Steel Ball Run',
    when: (c) => c.winner?.tier === 'canon' && !!CANON_EPILOGUES[c.winner.canonId],
    text: (c) => CANON_EPILOGUES[c.winner.canonId],
  },
];
