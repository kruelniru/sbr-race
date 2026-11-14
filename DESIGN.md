# SBR Race Simulator — Design Doc

## Overview

A Jackbox-style party game based on JoJo Part 7: Steel Ball Run. Players race their own characters across 9 stages from San Diego to New York, making choices on their phones while the host streams the results.

- **Players:** 12–18 player characters (PCs), up to 24, each controlled by its owner.
- **Length:** about 30–40 minutes a game.
- **Feel:** random like a Hunger Games simulator, with choices sprinkled in. Every round resolves at once and is revealed as one combined announcement.
- **Three ways to stand out:** win the race on points, survive to New York, or end up holding the Saint's Corpse.

## Setup and joining

The host runs the game in a browser and streams it; everyone else joins on their phone with a room code.

**Host screen** (streamed in Discord): room code, lobby, every event, field reports, stage results, and dramatic pauses ("Sub event! Kruel has a decision to make…").

**Phone** (controller + private status): choices, plus your own horse, Stand, corpse parts, points and Worthiness bar. Nobody else sees these.

**Character creation, on the phone:**

- Name
- Gender
- Pronouns
- Personality (Honorable, Ruthless, Cautious, Glory-Seeker, Opportunist)
- Picture from the camera roll (optional)

**Connection safety net (all three):**

- **Auto-reconnect:** leaving the page or switching apps drops nothing for good; coming back rejoins automatically. While a player is gone, their character plays on personality.
- **Keep-awake:** the page asks the phone not to dim while the game is open.
- **Mini feed:** the phone shows the latest events, so a phone-only player can follow without the stream.

## The racers

Three tiers share the race, and only PCs are controlled by people.

| Tier | Count | Starting Worthiness | Death odds | Behavior |
| --- | --- | --- | --- | --- |
| Player characters | 12–18 (max 24) | High, ~60–75 | Normal | Owner chooses; personality fills in |
| Canon racers | ~10–12 | ~50–80 | Low; can't die in Stage 1 | Rarely start kills, often help |
| NPC field | ~500 | Low, ~5–30 | High | Background; retire and die often |

**Canon racers:** Johnny, Gyro, Diego, Sandman, Hot Pants, Mountain Tim, Pocoloco, Wekapipo, Norisuke IV, and a few more. They choose by canon personality: Gyro spares, Diego does whatever helps Diego. Some start with Stands (Hot Pants, Mountain Tim, Pocoloco, Sandman); Johnny and Diego awaken theirs during the race. They help others by sharing food, giving a horse or a corpse part, warning of ambushes, or teaching Spin (Gyro and Wekapipo).

**NPC field:** never one line each. They show up two ways:

- As the other person in a named character's event ("spares a racer named Silas Crane").
- As one field report per round: "41 racers retired and 7 died. 388 remain."

**Breakout NPCs:** an NPC who awakens a Stand, gets 3+ kills, or steals a corpse part is promoted to a named character with their own events. Cap of about 5 per game; they get a Breakout Racers section in the results.

## Race structure

The race runs 9 stages of 3–4 rounds each, about 30 rounds total. Each stage's last round is the Finish Line, where placements and points are handed out.

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

1. Every alive PC and canon racer gets one main event.
2. Some PCs also get a sub event (a choice), all answered at the same time.
3. Dead players vote.
4. Everything resolves together and is revealed as one combined announcement, plus a field report for the NPCs.
5. After the last round of each night, a Fallen screen shows who died.

## Choices

Players make one Stage Plan per stage, plus sub events when something happens to them. Every choice has a 30-second timer; if it runs out, the character's personality picks.

**Personality hint:** on every choice, the option your personality would pick is marked "★ In character." Personality also nudges which random events you get (Honorable gets more helping events, Ruthless more ambush chances).

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

Worthiness is a hidden 0–100 stat. Each player sees only their own, as an RDR2-style bar with no number; nobody else ever sees it.

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

**Reveal rule:** a Stand stays hidden until its user first uses it in a fight. Its source is never shown, so a Legendary Stand doesn't prove someone holds a corpse part.

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

**Horses:** every racer gets a named horse. Some deadly events kill the horse instead of the rider, leaving them on foot with much worse placements. Ways to get a new horse:

- Buy one in a town (costs points).
- Be given one by another racer.
- Take the horse of a racer who died.

Losing a second horse means retiring or continuing on foot.

**Fights:** the winner chooses to kill or spare (canon racers usually spare, NPCs often kill). Other outcomes: the loser escapes, the fight reverses and the attacker dies, or both are injured and place worse.

**Valentine's agents** (Ringo Roadagain, Blackmore, Magent Magent and others) attack as events, not as racers. They mainly target corpse holders. **Funny Valentine** appears in Stages 8–9; a strong, worthy Stand user can beat him for a large bonus.

**Joining Valentine** (Stages 4–6 only) is a secret:

- The host screen announces only "Someone has fallen to the dark side."
- The agent's attacks show as an unnamed attacker ("A rider in a dark hat ambushes Johnny").
- Agents don't attack them, but their Worthiness drops hard.
- The host's browser holds every secret, so a host who also plays shouldn't go digging.

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

**Points per stage:** 1st 100, 2nd 90, 3rd 80, and so on down to 10 for 10th. 11th–20th get 5 each, to keep it fair.

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

**Results screen:**

- Race Winner (most points, reached New York)
- Survivors (everyone who reached New York)
- Corpse Holder (most parts), plus the President's count
- Most kills and most spares
- Every Stand awakened
- Breakout Racers

## Settings, tech and later ideas

**Host settings:**

- Sub event frequency: Low, Normal (about 2–3 per round), High
- NPC field size (default ~500)
- Which canon racers are in the race
- Choice timer (default 30 seconds)

**Tech plan:**

- A static site on GitHub Pages (kruelniru), free, with no accounts needed to play.
- The host's browser runs the whole game; phones connect to it directly with the room code through PeerJS.
- A free relay (TURN) server as a fallback for school Wi-Fi and carriers that block direct connections.
- Works in Safari on iPhone and Chrome on Android, with nothing to install.

**Ideas for later:**

- **Spin:** Gyro or Wekapipo teaches it, giving better fight odds.
- **Stand Acts:** Stands level up after big moments, like Tusk Act 1 to Act 4.
- **D4C:** in the Final Stage, one dead character returns as their other-world self.
