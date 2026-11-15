// Events for racers who have retired from the points race but are still in the story.
export default [
  { id: 'retired-porch', text: '{a}, out of the race, watches the leaders pass from a saloon porch.',
    cast: { a: 'focus' }, tags: ['minor'], retiredOnly: true, weight: 5 },
  { id: 'retired-guide', text: '{a} may be out of the race, but {a.they} still point{a:s} a lost {b} back to the trail.',
    cast: { a: 'focus', b: 'npc' }, tags: ['help'], retiredOnly: true, weight: 3 },
  { id: 'retired-scout', text: '{a} rides ahead as a scout, warning anyone who will listen about the trail ahead.',
    cast: { a: 'focus' }, tags: ['minor', 'help'], retiredOnly: true, weight: 3 },
  { id: 'retired-mistaken', text: '{b} mistakes {a} for a contender and shoots {a.them} dead.',
    cast: { a: 'focus', b: 'npc' }, effects: { a: { dies: 'shot by mistake', by: 'b' } }, tags: ['hazard', 'kill-defense'], retiredOnly: true, weight: 0.5 },
  { id: 'retired-follows', text: "{a} trails the race, following the field's dust toward New York.",
    cast: { a: 'focus' }, tags: ['minor'], retiredOnly: true, weight: 4 },
];
