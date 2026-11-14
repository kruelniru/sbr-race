// The nine stages from DESIGN.md.
//   rounds:  a number, or [min, max] picked per game by the seed. The last
//            round is always the Finish Line; before it Day/Night alternate.
//   terrain: tags used by events (when.terrain) and Runner modifiers
//            ('rough' / 'flat' in rules.js).
//   field:   NPC attrition per round, as fractions of the remaining field.
//   flavor:  optional lines added to that stage's field reports.
export default [
  {
    id: 1, name: '15,000 Meters', from: 'San Diego West Coast Beach', to: 'Santa Maria Novella Church',
    rounds: 2, terrain: ['beach', 'sprint'],
    field: { retire: 0.012, die: 0.008 },
    flavor: ['The first stretch of the race is a bloodbath.', 'Riderless horses wander the beach.'],
  },
  {
    id: 2, name: 'Across the Arizona Desert', from: 'Santa Maria Novella Church', to: 'Monument Valley',
    rounds: 4, terrain: ['desert', 'rough'],
    field: { retire: 0.006, die: 0.016 },
    flavor: ['The desert keeps what it takes.', 'Vultures follow the field.'],
  },
  {
    id: 3, name: 'Rocky Mountain Breakdown', from: 'Monument Valley', to: 'Cañon City',
    rounds: 4, terrain: ['mountains', 'rough', 'cold'],
    field: { retire: 0.006, die: 0.015 },
    flavor: ['Snow covers the passes.'],
  },
  {
    id: 4, name: 'Little Tomb on the Wide, Wide Prairie', from: 'Cañon City', to: 'Kansas City',
    rounds: 4, terrain: ['prairie', 'flat'],
    field: { retire: 0.045, die: 0.008 },
    flavor: ['Nothing but grass to the horizon.'],
  },
  {
    id: 5, name: 'Illinois Skyline', from: 'Kansas City', to: 'Chicago',
    rounds: [3, 4], terrain: ['city', 'flat'],
    field: { retire: 0.05, die: 0.006 },
  },
  {
    id: 6, name: 'Michigan Lakeline', from: 'Chicago', to: 'Mackinaw City',
    rounds: [3, 4], terrain: ['lake', 'ice', 'rough', 'cold'],
    field: { retire: 0.05, die: 0.009 },
    flavor: ['The ice on the Straits groans under the field.'],
  },
  {
    id: 7, name: 'Philadelphia Triangle', from: 'Mackinaw City', to: 'Philadelphia',
    rounds: [3, 4], terrain: ['forest'],
    field: { retire: 0.05, die: 0.007 },
  },
  {
    id: 8, name: 'Both Sides Now', from: 'Philadelphia', to: 'Union Beach',
    rounds: [3, 4], terrain: ['coast'],
    field: { retire: 0.05, die: 0.007 },
  },
  {
    id: 9, name: 'Manhattan Rhapsody', from: 'Union Beach', to: 'Trinity Church',
    rounds: [3, 4], terrain: ['city'],
    field: { retire: 0.055, die: 0.006 },
    flavor: ['New York is in sight.'],
  },
];
