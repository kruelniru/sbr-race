# Writing events

Every file in this folder exports an array of events, and `index.js` collects
them. You can add events without touching engine code. After editing, run
`npm test`, which lints every event, and `node sim/simulate.js` to see how
often each event fires.

```js
{
  id: 'desert-share-water',          // unique
  text: '{a} shares {a.their} last canteen with {b}.',
  cast: { a: 'focus', b: 'named' },  // the roles (see below)
  effects: { a: { points: 5 } },     // what happens to each role
  when: { stages: [2], rounds: ['day'] },
  tags: ['help'],
  weight: 4,
}
```

## Roles (`cast`)
- `'focus'`: the racer this event is for. Every event has exactly one.
- `'named'`: another named racer (a PC or a canon racer) who hasn't had an
  event yet this round.
- `'npc'`: someone from the NPC field. They get a name, and sometimes it's
  an NPC we've already met.

A role can be an object with filters:

| filter | example | meaning |
| --- | --- | --- |
| `tier` | `'canon'`, `['pc','canon']` | which kind of racer |
| `canon` | `'hotpants'` | a specific canon racer |
| `mount` | `'runner'` / `'horse'` | Runners vs Riders |
| `hasHorse` | `true` | a Rider who still has a horse |
| `injured` | `true` | currently injured this stage |
| `side` / `notSide` | `'valentine'` | the President's people |
| `status` | `'retired'` | default `'racing'` |

Example: `b: { is: 'named', side: 'valentine' }`.

## Effects
| effect | value | notes |
| --- | --- | --- |
| `dies` | `'cause of death'` | shown on the Fallen screen; add `by: 'a'` for kill credit |
| `retires` | `true` | out of the points race, still in the story |
| `injured` | `true` | placement penalty for the rest of the stage |
| `heal` | `true` | clears an injury |
| `pace` | `+1` / `-2` | placement boost or drag this stage |
| `points` | `+10` / `-10` | bonus points (sprint +10, save +10, help +5, shortcut +5, sabotage −10) |
| `horse` | `'dies'` | the horse is lost and the Rider continues on foot. Runners can't get these. |

Canon racers can't die in Stage 1, so the engine never casts them into a
death there.

## When
- `stages: [2, 3]`, or `terrain: ['desert']` (see `data/stages.js`)
- `rounds: ['day', 'night', 'finish']`

Leave a field out to allow everything.

## Tags and weight
`weight` is the base chance relative to other events. Tags adjust it by the
focus racer's personality (`rules.js` → `personalityLean`). Canon racers add
`canonLean` on top.

- `minor`: a short pace or flavor line, collected on the "Meanwhile on the
  trail..." card. Keep these to one short sentence, and never put a death in one.
- `kill` (starting a killing), `defend` (killing in self-defense), `help`,
  `hazard`, `risky`, `pace`, `sprint`, `sabotage`, `cold` (ignoring someone in need)

## Retired racers
Retired racers only get events marked `allowRetired: true` (racing or retired)
or `retiredOnly: true`.

## Text tokens
`{a}` is a name. `{a.they}`, `{a.them}`, `{a.their}`, `{a.theirs}` and `{a.themself}`
are pronouns; capitalize them as `{a.They}`. `{a.horse}` is the horse's name.
Verb agreement after a pronoun: `{a.they} {a:is/are}`, `ride{a:s}`, `push{a:es}`.
After a name, verbs are always singular: "{a} rides".
