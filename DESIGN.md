# SBR Race Simulator — Design Doc

## Overview

A Jackbox-style party game based on JoJo Part 7: Steel Ball Run. Players race their own characters across 9 stages from San Diego to New York, making choices on their phones while the host streams the results.

- **Players:** 12–18 player characters (PCs), up to 24, each controlled by its owner. Empty slots can be filled with AI racers.
- **Length:** about 30–40 minutes a game, with side stories skipped (the default). Long game nights can turn side stories on.
- **Feel:** random like a Hunger Games simulator, with choices sprinkled in. Every round resolves at once and is revealed as one combined announcement.
- **Three ways to stand out:** win the race on points, survive to New York, or end up holding the Saint's Corpse.

## Setup and joining

The host runs the game in a browser and streams it; everyone else joins on their phone with a room code. The host can also play from their own phone like everyone else.

**Host screen** (streamed in Discord): room code, lobby, every event, field reports, stage results, and dramatic pauses ("Sub event! Kruel has a decision to make…").

**Phone** (controller + private status): choices, plus your own horse, Stand, corpse parts, points and Worthiness bar. Nobody else sees these.

**Character creation, on the phone:**

- Name (unique; can't be a canon racer's name)
- Gender: short free text, shown only on the host screen
- Pronouns: a picklist of he/him, she/her and they/them, so event text reads correctly
- Rider (default) or Runner (see Runners)
- Personality (Honorable, Ruthless, Cautious, Glory-Seeker, Opportunist)
- Picture from the camera roll (optional, shrunk to about 256px on the phone)

Players can edit their character while the lobby is open.

**Lobby:**

- **Minimum riders** is a host setting (default 12). Start stays disabled until it's met.
- **AI racers:** "Fill with AI racers" fills empty slots up to the minimum, or up to a number the host picks. They are ordinary PCs the game controls: random name, pronouns, personality and mount, always choosing by personality, and tagged AI in the lobby. The host can remove any of them. If the room is full, a real player who joins takes the newest AI racer's place.
- **Canon racers:** each is a toggle in the host settings.
- **The lobby locks when the host presses Start.** After that, only reconnects get in.
- **Closing a room** tells every phone, and phones go back to code entry.

**Connection safety net (all three):**

- **Auto-reconnect:** leaving the page or switching apps drops nothing for good; coming back rejoins automatically. While a player is gone, their character plays on personality. A host reload of the same room also reconnects everyone. A phone that can't reach its room shows "Leave and join a different room", and after 2 minutes of trying it goes back to code entry with a "Try again" option.
- **Keep-awake:** the page asks the phone not to dim while the game is open.
- **Mini feed:** the phone shows the latest events, so a phone-only player can follow without the stream.

## The racers

Three tiers share the race, and only PCs are controlled by people.

| Tier | Count | Starting Worthiness | Death odds | Behavior |
| --- | --- | --- | --- | --- |
| Player characters | 12–18 (max 24) | High, ~60–75 | Normal | Owner chooses; personality fills in |
| Canon racers | 15 (each a host toggle) | ~50–80 | Low; can't die in Stage 1 | Rarely start kills, often help |
| NPC field | ~500 | Low, ~5–30 | High | Background; retire and die often |

**Canon racers:** Johnny Joestar, Gyro Zeppeli, Diego Brando, Sandman, Hot Pants, Mountain Tim, Pocoloco, Wekapipo, Norisuke Higashikata IV, Mrs. Robinson, Oyecomova, Urmd Avdul, and the Boom Boom family: Benjamin, Andre and L.A. The Boom Booms are on Valentine's side.

- Wekapipo races from Stage 1. That's a liberty, not canon timing.
- They choose by canon personality: Gyro spares, and Diego does whatever helps Diego.
- Some start with Stands (Hot Pants, Mountain Tim, Pocoloco, Sandman); Johnny and Diego awaken theirs during the race.
- They help others by sharing food, giving a horse or a corpse part, warning of ambushes, or teaching Spin (Gyro and Wekapipo).
- Sandman is a canon Runner.

**Hot Pants** gets special care:

- she/her pronouns and a high riding skill.
- Her Stand is **Cream Starter**, a spray of living flesh that heals and seals wounds, fills an enemy's throat, or remakes a face as a disguise.
- Personality: helps the wounded without hesitation, but is merciless toward enemies, and above all toward Valentine's side. Kill events aimed at the President's people are much likelier for her.
- She has her own events: healing an injured racer with Cream Starter, sealing a stranger's wound, a disguise to slip past rivals, sealing her own wound and then choking her ambusher, killing one of the President's men, and praying for her brother at night.

**NPC field:** never one line each. They show up two ways:

- As the other person in a named character's event ("spares a racer named Silas Crane"). An NPC who survives an event is kept and can show up again later.
- As one field report per round: "41 racers retired and 7 died. 388 remain."

**Pack leaders:** about 6 unnamed NPCs (a setting in `rules.js`) compete in the stage placements alongside the named racers. A pack leader stays unnamed until they place in the top 10; then they get a name and join the kept NPCs, which makes them a possible future breakout.

**Breakout NPCs:** an NPC who awakens a Stand, gets 3+ kills, or steals a corpse part is promoted to a named character with their own events. Cap of about 5 per game; they get a Breakout Racers section in the results.

**Names match pronouns:** AI racer and NPC first names come from he, she or they lists, so text like "Josiah… kills her" doesn't happen.

## Runners

At character creation a PC picks **Rider** (default) or **Runner**. Picking Runner is a commitment.

- Runners have no horse, ever. Horse-death events skip them, and the on-foot penalty never applies. A Runner can't buy or be given a horse later.
- **Terrain:** Runners get a placement bonus in rough terrain (desert, mountains, the ice at Mackinac) and a small penalty on open flats (the prairie, Illinois). There is also a flat calibration modifier. All of these are in `rules.js`.
- **Runner-only events:** exhaustion, leg injuries (work like injured), raw feet, and shortcuts horses can't take (canyon gaps, goat paths, thin ice). Each comes with its own risks.
- Balanced with the sim so Runners and Riders score about the same on average across a whole game.

## Race structure

The race runs 9 stages. Stage 1 has 2 rounds, Stages 2–4 have 4, and the rest have 3–4 (picked per game by the seed), about 31 rounds total. Within a stage, rounds alternate **Day / Night / Day…**, and the last round is always the **Finish Line**, where placements and points are handed out.

| Stage | Name | Route | Rounds | Stage flavor |
| --- | --- | --- | --- | --- |
| 1st | 15,000 Meters | San Diego West Coast Beach to Santa Maria Novella Church | 2 | Short sprint, the bloodbath; canon racers can't die |
| 2nd | Across the Arizona Desert | Santa Maria Novella Church to Monument Valley | 4 | Dehydration, sandstorms, the Devil's Palm |
| 3rd | Rocky Mountain Breakdown | Monument Valley to Cañon City | 4 | Falls, cold, avalanches, the Devil's Palm |
| 4th | Little Tomb on the Wide, Wide Prairie | Cañon City to Kansas City | 4 | Stampedes, open-field ambushes; Valentine's offer opens |
| 5th | Illinois Skyline | Kansas City to Chicago | 3–4 | City streets, Valentine's offer |
| 6th | Michigan Lakeline | Chicago to Mackinaw City | 3–4 | Thin ice on the Straits of Mackinac; Valentine's offer closes |
| 7th | Philadelphia Triangle | Mackinaw City to Philadelphia | 3–4 | Agents ramp up; Valentine's home ground |
| 8th | Both Sides Now | Philadelphia to Union Beach | 3–4 | Funny Valentine appears |
| Final | Manhattan Rhapsody | Union Beach to Trinity Church | 3–4 | The finale and Corpse showdown |

**Each round:**

1. Every alive PC gets one main event. Canon racers get their own event in about **40%** of rounds, and retired racers in about **25%**. Both always appear when another racer's event casts them. Being cast into someone else's event counts as your event for the round, so nobody appears twice.
2. Some PCs also get a sub event (a choice), all answered at the same time.
3. Dead players vote.
4. Everything resolves together and is revealed as one combined announcement, plus a field report for the NPCs.
5. **The Fallen** screen shows who died after every Night round and at the end of every stage.

**Variety:** an event can appear at most once per round (minor events at most twice), so lines don't repeat.

**NPC attrition:** spread out over the whole race. About 350+ of 500 are still racing after Stage 3, and about 100 reach New York. Stages 2–3 have the highest **death** rates (desert and mountains); later stages lose more NPCs to **retirement** (falling behind, giving up) than to death. Night rounds are deadlier. Rates are per stage in `data/stages.js`, tuned with the sim.

## Presentation on the host

**Order of a round's reveal:**

1. **Title:** stage, route, and Day / Night / Finish Line.
2. **Main Story:** every event involving a PC, a canon racer or a named breakout NPC who's still racing. Up to 5 lines per page, with faces, and PC and canon names highlighted so they stand out from NPCs. A named racer's death is always Main Story.
3. **Side Stories:** retired racers' events, NPC-only events, then the **"Meanwhile on the trail..."** card (small pace and flavor lines tagged `minor`, up to 4 shown on stream with the rest going to phones only) with the NPC field report.
4. **The Fallen** (after Night rounds and Finish Lines), then **stage results** and **overall standings**. These always show.

**Side stories are skipped automatically by default** to keep games at 30–40 minutes. They still reach the phones' feeds. The host can turn the setting off for long game nights, and when it's off a **Skip side stories** button skips them round by round.

**Pacing:** auto-advance by default. Each card stays up for a time based on how many words are on it, with a host **speed** setting: Slow, Normal or Fast. Auto-advance pauses at stage results; the host starts the next stage.

**Back button:** steps back through earlier cards in the current round and earlier rounds. It's view-only: it changes nothing in the game and re-sends nothing to phones. "Back to live" returns.

**Stage-themed backgrounds:** each stage has its own color palette and light particle effects. Night rounds use a darker version of the stage palette.

| Stage | Look |
| --- | --- |
| 1 Beach | Sea spray, warm coast colors |
| 2 Desert | Drifting sand, heat shimmer, orange and tan |
| 3 Rockies | Falling snow, cold blues and greys |
| 4 Prairie | Blowing grass and dust, gold and green |
| 5 Illinois | City smoke, gaslight amber |
| 6 Michigan | Ice glints and snow, pale blue-white |
| 7 Philadelphia | Fog, dark and tense |
| 8 Both Sides Now | Twilight, eerie motes drifting both ways |
| Final Manhattan | Night city lights, gold accents |

Text sits on solid card panels so it stays easy to read on stream. The effects use one lightweight canvas, respect reduced motion, pause when the tab is hidden, and have a host **Effects** toggle.

**Phones during the race:** each line arrives in the mini feed as it's revealed on stream, with lines that involve you highlighted. Your private status card (racing / retired / fallen, horse or Runner, points, last placement) only updates once the round's reveal has finished, so a phone never spoils the stream.

## Choices

Players make one Stage Plan per stage, plus sub events when something happens to them. Every choice has a 30-second timer; if it runs out, the character's personality picks.

**Personality hint:** on every choice, the option your personality would pick is marked "★ In character." Personality also nudges which random events you get (Honorable gets more helping and sparing events, Ruthless more kills and sabotage). Canon racers add their own leanings on top: they rarely start kills and often help.

**Stage Plan** (start of each stage, everyone at once):

| Plan | Upside | Downside |
| --- | --- | --- |
| Push hard | Better placement | More hazard and horse risk |
| Pace yourself | Safe | Average placement |
| Hunt a corpse part | Better odds of finding one | Valentine's agents notice you |
| Hunt a rival | Guaranteed encounter with your pick | You might lose |
| Ally up | Ride with someone (they accept or refuse) | They might betray you |
| Lay low | Very safe | Bad placement |
| Seek the Devil's Palm (Stages 2–3) | Stand gamble | Low Worthiness can kill you |

**Sub events:** every round, each PC has a chance of one, and at least one PC always gets one. Everyone affected answers at the same time, and the host screen announces it while the main flow waits. Some sub events chain (win a fight, then choose kill or spare).

- **Won a fight:** kill, spare, take their horse, or take their corpse part.
- **Found a part:** keep it, hide it, or give it to someone.
- **Ambushed by agents:** fight, flee, or hand over a part to live.
- **Injured racer on the trail:** stop to help (lose time, gain Worthiness) or ride past.
- **Edge of the Devil's Palm:** go in or turn back.
- **Valentine's offer (Stages 4–6 only):** join him or refuse.

**PC vs PC fights:** both players choose at once. The attacker chooses kill, spare, or take a horse or part; the defender chooses fight back, flee, or surrender a part. Both choices combine into the result.

**Spares:** sparing someone you beat is tracked for every racer and feeds the **Most Merciful** award. Until fights arrive (milestone 5), a few "lets them go" events record spares; fights then use the same counter.

## Alliances

Alliances are in from the start. How one forms depends on who's asking:

| Alliance | How it forms |
| --- | --- |
| PC + PC | Both players agree on their phones (through Ally up or a sub event) |
| PC + canon racer | The character agrees if it fits them: Gyro takes in the worthy, Diego rarely allies unless it helps Diego |
| PC + NPC | Random events |

**What allies do:** help each other in events, share food and horses, and fight together. Points stay individual.

**Breaking up:** betraying or abandoning an ally is a sub event choice and costs Worthiness (−8). A secret Valentine agent can sit inside an alliance without anyone knowing.

## Worthiness

Worthiness is a hidden 0–100 stat. Each player sees only their own, as an RDR2-style bar with no number; nobody else sees it until the finale's secrets reveal.

| Action | Change |
| --- | --- |
| Give away a corpse part | +10 |
| Spare someone you beat | +8 |
| Help or save a racer | +5 |
| Survive the Devil's Palm | +5 |
| Kill in self-defense | 0 |
| Kill someone helpless or fleeing | −5 |
| Steal a corpse part | −5 |
| Abandon an ally | −8 |
| Join Valentine | Large drop |

**What it decides:**

- The Devil's Palm outcome.
- Whether a corpse part accepts or rejects you.
- Whether you survive a Stand Arrow.
- How likely you are to awaken a Stand, and how strong it is.

**Hints on your phone:** key moments add a line of text, such as "The corpse part feels warm in your hands."

**Anonymous announcements on the host screen:** "Someone has been deemed worthy of the Saint" when a PC merges with a corpse part, and "Someone has fallen to the dark side" when a PC joins Valentine. Neither names the player.

## Stands

Stands come from every part of JoJo, each with a power tier. A canon character's Stand stays locked until that character dies; if Johnny dies, Tusk enters the pool.

**Tiers:**

- **Common:** weaker or utility, such as Hey Ya!, Oh! Lonesome Me, Echoes Act 1.
- **Rare:** solid fighters, such as Magician's Red, Sticky Fingers, Hierophant Green, Anubis.
- **Legendary:** Star Platinum, The World, Gold Experience Requiem–level, D4C, Tusk Act 4.

**Sources:**

| Source | Odds | Risk |
| --- | --- | --- |
| Devil's Palm | Mostly Common, some Rare, rare Legendary | Low Worthiness can kill or lose you |
| Stand Arrow (rare item, our addition) | Mostly Rare, some Legendary | Must survive the piercing; low Worthiness can kill you |
| Corpse part | Leans Rare to Legendary | Rejection if unworthy |

Higher Worthiness shifts the odds up a tier from any source. Stand Arrows don't exist in SBR canon; they're a liberty, since the Stand pool already spans every part.

**Reveal rule:** a Stand stays hidden until its user first uses it in a fight. Its source is never shown, so a Legendary Stand doesn't prove someone holds a corpse part. (Canon Stand details for Oyecomova, the Boom Booms and Mrs. Robinson are still to be verified when Stands are built.)

## Corpse parts

Nine parts of the Saint's Corpse surface over the race, one per stage. Holding one can awaken a Stand, but it makes Valentine's agents hunt you harder.

**How a part changes hands:**

| Event | What happens |
| --- | --- |
| Finds | Stumbles on it; likelier with higher Worthiness, since the corpse "chooses" |
| Survives and gets | Walks out of the Devil's Palm holding it |
| Is given | Another racer hands it over (often a canon or dying racer) |
| Obtains | Takes it from the body of someone killed or who died nearby |
| Steals | Takes it from a sleeping or distracted holder (Worthiness cost) |
| Dies to | An unworthy holder is rejected: turned to sand, absorbed, or drops dead |
| Loses | Drops it in a river or a fight; it goes back into play |
| Taken by the President | Unclaimed at the Finish Line, Valentine's agents recover it |

**Effects of holding:**

- May awaken a Stand if you're worthy enough (announced anonymously).
- More parts, more agent ambushes.
- The parts count toward the Corpse ending (see Points, winning and endings).

## Horses, fights and Valentine

**Horses:** every Rider gets a named horse (canon horses where known: Slow Dancer, Valkyrie, Silver Bullet). Some deadly events kill the horse instead of the rider, leaving them on foot with much worse placements (−40). Ways to get a new horse (milestone 5; until then on foot is permanent):

- Buy one in a town (costs points).
- Be given one by another racer.
- Take the horse of a racer who died.

Losing a second horse means retiring or continuing on foot. Runners never have horses (see Runners).

**Fights:** the winner chooses to kill or spare (canon racers usually spare, NPCs often kill). Other outcomes: the loser escapes, the fight reverses and the attacker dies, or both are injured and place worse.

**Valentine's agents** (Ringo Roadagain, Blackmore, Magent Magent and others) attack as events, not as racers. They mainly target corpse holders. **Funny Valentine** appears in Stages 8–9; a strong, worthy Stand user can beat him for a large bonus.

**Joining Valentine** (Stages 4–6 only) is a secret:

- The host screen announces only "Someone has fallen to the dark side."
- The agent's attacks show as an unnamed attacker ("A rider in a dark hat ambushes Johnny").
- Agents don't attack them, but their Worthiness drops hard.
- The host's browser holds every secret, so a host who also plays shouldn't go digging.
- It's revealed in the finale's secrets reveal.

## Dead players

Dead players keep playing: each round they vote on what happens to the living. The majority picks one category; a tie is settled by the game.

| Category | What the dead choose | What the game chooses |
| --- | --- | --- |
| Hazard | That a hazard happens | Which one (tornado, acid rain, sandstorm, wildfire, stampede, flash flood, blizzard, by stage) |
| Ambush | That an ambush happens | A random target among PCs and named NPCs, so it can hit a former ally |
| Blessing | Who gets blessed, by an individual vote | Breaks a tie on the target |

Example: 5 players are dead and 4 vote Blessing, so Blessing wins. All 5 then vote on who gets it; if that vote ties, the game picks.

## Points, winning and endings

The race winner is whoever has the most points among racers who reach New York. Dying knocks you out; retiring takes you out of the points race, but you stay in the story and can still hunt corpse parts.

**Points per stage:** 1st 100, 2nd 90, 3rd 80, and so on down to 10 for 10th. 11th–20th get 5 each, to keep it fair. Placements rank the named racers still racing plus the pack leaders.

**Placement score** at each Finish Line: riding skill + pace earned from this stage's events − injury penalty − on-foot penalty (Riders who lost their horse) + Runner terrain modifiers + luck (Pocoloco) + randomness. Stage Plans (milestone 3) and horse quality (milestone 5) plug in here. All the numbers are in `data/rules.js`.

**Bonuses and penalties:**

- Winning a mid-stage sprint: +10
- Saving a racer from death: +10
- Stopping to help an injured racer (Steel's sportsmanship bonus): +5
- Finding a shortcut: +5
- Returning a lost horse to its rider: +5
- Sabotage, endangering a racer, or cheating: −10 up to disqualification

In the manga, points come only from stage placements, plus a time bonus for finishing a stage first. Points for good deeds are our addition, so being a good person pays in points and Worthiness.

**Finale (Love Train + President's ending):** whoever holds the most corpse parts going into the Final Stage becomes the boss.

- **A racer holds the most:** with 5+ parts they get Love Train and are nearly untouchable, because misfortune is redirected onto others. Everyone else has to work together to take the parts.
- **Valentine holds more than all racers combined:** the bad ending, where he wins whoever crosses the line.

**The ending sequence** (after the last Finish Line), revealed card by card:

1. "The race is over."
2. **Podium:** 3rd place, then 2nd, then a dramatic pause ("And the winner of the Steel Ball Run is…"), then the winner. Auto-advance stops on the winner.
3. **Awards:** Most Kills, Most Merciful (spares), Best Runner, Biggest Comeback (most places climbed from a racer's worst standing to the final one). Later: Corpse Holder (most parts, plus the President's count), every Stand awakened, Breakout Racers, and others.
4. **Reached New York:** every survivor with their points, plus how many from the field finished.
5. **In memory of the Fallen:** everyone who died, how, by whom, and when.
6. **The secrets reveal** (later milestones), the last and biggest moment: who joined Valentine, everyone's Worthiness bar, and who held which corpse parts.
7. Final standings.

## Settings, tech and later ideas

**Host settings:**

- Minimum riders (default 12)
- Fill with AI racers (up to the minimum or a chosen number)
- Which canon racers are in the race (a toggle each)
- Reveal speed: Slow, Normal, Fast
- Skip side stories automatically (default **on**)
- Background effects (default on)
- Sub event frequency: Low, Normal (about 2–3 per round), High
- NPC field size (default ~500)
- Choice timer (default 30 seconds)

**Tech plan:**

- A static site on GitHub Pages (kruelniru), free, with no accounts needed to play.
- The host's browser runs the whole game; phones connect to it directly with the room code through PeerJS (version pinned).
- A free relay (TURN) server as a fallback for school Wi-Fi and carriers that block direct connections. The TURN slot is in `js/config.js`.
- Works in Safari on iPhone and Chrome on Android, with nothing to install.
- Game content (events, stages, canon racers, names, rules) lives in `data/`, apart from the engine. Events are templates with role and pronoun tokens.
- A seeded random generator, so games can be replayed, and a headless sim (`sim/simulate.js`) for balance.

**Ideas for later:**

- **Spin:** Gyro or Wekapipo teaches it, giving better fight odds.
- **Stand Acts:** Stands level up after big moments, like Tusk Act 1 to Act 4.
- **D4C:** in the Final Stage, one dead character returns as their other-world self.

## Decision log

Decisions made after the original design, in the order they came up:

1. Pronouns are a picklist (he/she/they); gender is short free text shown only on the host.
2. The lobby locks when the host presses Start; only reconnects get in after that.
3. The host can also play from their own phone.
4. Rounds alternate Day / Night, and the last round of a stage is the Finish Line. The Fallen show after every Night round and at the end of each stage.
5. AI racers fill empty slots; minimum riders is a host setting (default 12); a real player joining a full room bumps the newest AI racer.
6. Closing a room sends phones back to code entry. Phones stuck reconnecting can leave, and they give up after 2 minutes.
7. Placements include about 6 pack leader NPCs, who get a name when they place top 10.
8. Every Rider gets a named horse from the start; buying, giving and taking horses come in milestone 5.
9. Canon racers get their own event in about 40% of rounds, retired racers in about 25%. Minor events are collected on one "Meanwhile on the trail..." card.
10. 15 canon racers (the original list plus Mrs. Robinson, Oyecomova, Urmd Avdul and the three Boom Booms), each a host toggle. Wekapipo races from Stage 1.
11. Hot Pants: she/her, high skill, Cream Starter, kind to the wounded and ruthless to Valentine's side, with her own events.
12. Runners: chosen at character creation, never have a horse, terrain bonuses and penalties, their own events, balanced to score like Riders.
13. Card timing is based on how much text is on each card, with a Slow / Normal / Fast setting.
14. The host gets a view-only Back button through earlier cards and rounds.
15. NPC attrition: 350+ after Stage 3 and about 100 at New York. Stages 2–3 are the deadliest; later losses are mostly retirements.
16. Main Story / Side Stories split, with side stories **skipped automatically by default**. Length isn't tuned further until milestone 3 gives real timing.
17. Stage-themed backgrounds with light particle effects, darker at night, with an Effects toggle.
18. The ending is a sequence: podium (3rd → 2nd → pause → winner), awards, survivors, a memorial, and later the secrets reveal as the final moment.
19. Spares are tracked from milestone 2 onward and feed the Most Merciful award.
