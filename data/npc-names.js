// Name parts for the NPC field. NPCs get a name when an event pulls them in
// ("spares a racer named Silas Crane") or when a pack leader places top 10.
// First names are grouped by pronouns so event text reads naturally.
export default {
  first: {
    he: ['Silas', 'Jebediah', 'Thaddeus', 'Augustus', 'Bartholomew', 'Ezekiel', 'Cornelius', 'Obadiah', 'Ambrose',
      'Horace', 'Ignatius', 'Percival', 'Lucius', 'Fitzgerald', 'Barnabas', 'Leopold', 'Casimir', 'Mortimer',
      'Rupert', 'Wendell', 'Elias', 'Dmitri', 'Hiroshi', 'Matteo', 'Lars', 'Kofi', 'Yusuf'],
    she: ['Clara', 'Wilhelmina', 'Hester', 'Lucinda', 'Prudence', 'Temperance', 'Josephine', 'Delphine', 'Matilda',
      'Rosalind', 'Adelaide', 'Henrietta', 'Marguerite', 'Imogen', 'Winifred', 'Philippa', 'Ottoline', 'Seraphina',
      'Beatrix', 'Ingrid', 'Aiyana', 'Paloma', 'Ines'],
    they: ['Ash', 'Bellamy', 'Corey', 'Dakota', 'Finley', 'Harper', 'Jordan', 'Kit', 'Lane', 'Remy', 'Sawyer', 'Tatum'],
  },
  last: [
    'Crane', 'Blackwell', 'Hartley', 'Vandermeer', 'Okafor', 'Castellanos', 'Lindqvist', 'Moreau', 'Tanaka', 'Gallagher',
    'Pemberton', 'Ashcroft', 'Delacroix', 'Fairweather', 'Grimsby', 'Holloway', 'Ingram', 'Jessup', 'Kincaid', 'Lockhart',
    'McAllister', 'Nightingale', 'Oakes', 'Prentiss', 'Quigley', 'Rourke', 'Sinclair', 'Thibodeaux', 'Underhill', 'Voss',
    'Whitaker', 'Yardley', 'Zamora', 'Barlow', 'Coburn', 'Dunmore', 'Everhart', 'Faraday', 'Goodnight', 'Hawthorne',
  ],
  // Pronouns for NPCs, weighted.
  pronouns: [['he', 45], ['she', 40], ['they', 15]],
};
