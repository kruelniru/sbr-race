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
| Player characters | 12–18 (max 24) | By personality: Honorable 60, Cautious 55, Opportunist 50, Glory-Seeker 50, Ruthless 40 (AI PCs too) | Normal | Owner chooses; personality fills in |
| Canon racers | 15 (each a host toggle) | Their own (see below) | Low; can't die in Stage 1 | Rarely start kills, often help |
| NPC field | ~500 | Low, ~5–30 | High | Background; retire and die often |

**Canon racers:** Johnny Joestar, Gyro Zeppeli, Diego Brando, Sandman, Hot Pants, Mountain Tim, Pocoloco, Wekapipo, Norisuke Higashikata IV, Mrs. Robinson, Oyecomova, Urmd Avdul, and the Boom Boom family: Benjamin, Andre and L.A.

**Valentine's side:** Oyecomova is Valentine's agent and secretly posted the bounty on Gyro; the Boom Booms came for that bounty. All four are on Valentine's side, so Hot Pants' ruthlessness toward the President's people applies to them.

- Wekapipo races from Stage 1. That's a liberty, not canon timing.
- They choose by canon personality: Gyro spares, and Diego does whatever helps Diego.
- **Stands (verified):** Hot Pants: Cream Starter. Mountain Tim: Oh! Lonesome Me. Pocoloco: Hey Ya!. Sandman: In a Silent Way. Oyecomova: Boku no Rhythm wo Kiitekure ("Listen to My Rhythm", turns anything into a bomb; from a Devil's Palm). Benjamin, Andre and L.A. Boom Boom: Tomb of the Boom 1, 2 and 3 (magnetism; from a Devil's Palm). Johnny awakens Tusk Act 1 during Stage 2 or 3, and Diego awakens Scary Monsters in Stage 3.
- **No Stand:** Gyro and Wekapipo (Spin users), Norisuke IV, Mrs. Robinson (insects in his body set off cholla cactus needles; his horse is El Condor Pasa) and Urmd Avdul (an Egyptian nomad who rides an unnamed camel, so his text says camel, and horse-only events skip him). Only Norisuke, Mrs. Robinson and Avdul may walk into a Devil's Palm.
- **Starting Worthiness:** Gyro 80, Hot Pants 75, Mountain Tim 70, Pocoloco 65, Johnny 60, Sandman 60, Wekapipo 60, Norisuke 55, Avdul 50, Diego 25, Mrs. Robinson 20, Oyecomova 15, Benjamin 15, Andre 12, L.A. 12.
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
- Balanced with the sim so Runners and Riders score about the same on average across a whole game (Riders' points include what they spend on horses; the flat modifier is −7 since milestone 5).

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

**Pacing:** new rooms start **paused**: the host clicks Next through each card. **Auto** is a toggle; with it on, each card stays up for a time based on how many words are on it, with a host **speed** setting: Slow, Normal or Fast. Auto-advance pauses at stage results; the host starts the next stage. Every host control has a fixed slot, so buttons never shift when "Back to live" or "Skip side stories" appears.

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

**Phones during the race:** each line arrives in the race feed as it's revealed on stream (never earlier), so a phone never spoils the stream. The feed is built to scan on a narrow phone:

- **Grouped by round**, each under a small header ("Stage 2 · Night 1", "Stage 2 · Finish Line"). The newest round is on top and open; older rounds collapse to their header (with a line count and a "You" badge if you're in them) and open with a tap. Phones keep about the last 150 lines.
- Each line is its own row with a divider, at 16px with a line height of about 1.45 and comfortable side padding.
- **Lines that involve you** get a gold accent bar and a tinted background. **Deaths** get a red bar, a soft red tint and a ✝.
- **Meanwhile / side story lines** sit in their own muted block under a "Meanwhile on the trail…" label, after the Main Story lines.

Your private status card (racing / retired / fallen, horse or Runner, points, last placement, Stage Plan) only updates once the round's reveal has finished. A choice card appears at the top of the screen when you have a decision to make.

## Choices

Players make one Stage Plan per stage, plus sub events when something happens to them. Every choice has a 30-second timer (a host setting, 15–60 seconds); if it runs out, the character's personality picks.

**How a choice window runs:**

- **Stage Plans** open on phones the moment the previous stage's results card appears, so players choose while the host shows results and standings. When the host clicks "Start Stage N", the window closes if its time is up; otherwise the host shows "Choose your Stage Plan" for only the time that's left. Stage 1's plan opens right after Start.
- **Sub events** open before each round's reveal. The host shows "Sub event! Kruel has a decision to make…" with faces and a ✓ as each person answers (never what they picked), plus a countdown.
- A window closes when the timer runs out, when every connected player has answered, or when the host clicks **End now**. Anyone unanswered (timed out or disconnected) gets their ★ option. AI racers answer instantly by personality.
- **Pause timer** freezes the countdown on the host and every phone ("Paused by the host") so the host can talk; **Resume** restarts it.
- Answers can be changed until the window closes. Everything resolves together; sub event results lead the round's Main Story.
- **Secret prompts:** a sub event can be marked secret. Secret prompts are never named or counted on the host screen; if every pending prompt is secret, the host just says "Decisions are being made…". Valentine's offer (milestone 5) uses this.

**Personality hint:** on every choice, the option your personality would pick is marked "★ In character." Personality also nudges which random events you get (Honorable gets more helping and sparing events, Ruthless more kills and sabotage). Canon racers add their own leanings on top: they rarely start kills and often help.

**Stage Plan** (start of each stage, everyone at once):

| Plan | Upside | Downside | Arrives |
| --- | --- | --- | --- |
| Push hard | Better placement | More hazard and horse risk | M3 |
| Pace yourself | Safe | Average placement | M3 |
| Hunt a rival | A guaranteed fight with your pick | You might lose it, or worse; −5 placement | M3 (a real fight from M5) |
| Lay low | Very safe | Bad placement | M3 |
| Seek the Devil's Palm (Stages 2–3) | A guaranteed Edge of the Devil's Palm that stage | Low Worthiness can kill you; −5 placement | M4 |
| Hunt a corpse part | Better odds of finding one | Valentine's agents notice you | M5 |
| Ally up (only while you ride alone) | Ride with someone (they accept or refuse) | They might betray you | M5 |

Plans whose systems don't exist yet are hidden, not greyed out. The numbers live in `data/plans.js`; the sim checks that no plan dominates (`--plans random`, `--plans <id>`, `--plans star`).

**Hunt a rival:** pick any racing named racer (a PC, canon racer or named NPC), never yourself. Sometime in the stage you catch up and it comes to a **fight** (see Fights), started by you: you choose what happens if you win, and a PC target chooses how to meet you at the same time. The winner gets +5 points and pace. If the target dies or retires first, you get a normal event and the line "X's rival is gone." Several racers can hunt one target, but a target has at most one showdown per round; a hunter who can't get one by the end of the stage "never catches up".

**Ally up (milestone 5):** pick a racing named racer who rides alone. A PC answers in their next sub-event window ("Ride together?"); a canon racer answers by character fit (Gyro takes in the worthy, Diego rarely unless you're in the top five); a named NPC agrees 60% of the time. The stream announces the answer.

**Sub events:** every round, each PC has a chance of one, and at least one PC always gets one (Low about 1 a round, Normal 2–3, High 4–5, a host setting; rival showdowns count toward it). Everyone affected answers at the same time, and the host screen announces it while the main flow waits. A sub event counts as that racer's event for the round. Some sub events chain (win a fight, then choose kill or spare).

In milestone 3 (`data/sub-events.js`):

- **Injured racer on the trail:** stop to help (lose time, +5 points, Worthiness +10 for saving a life) or ride past.
- **Risky shortcut** (canyon gap, goat path, thin ice, back alleys, dry riverbed): take it or stay on the road.
- **Hazard** (sandstorm, blizzard, stampede, fog, fire, flash flood): push through or take shelter.
- **Spent horse / sore legs** (Runners): rest or push on.
- **Sprint challenge:** race a canon racer or NPC for +10, or let them go.
- **Bad injury:** keep riding, stop and heal, or retire.

In milestone 4:

- **Edge of the Devil's Palm** (Stages 2–3): go in or turn back. It comes up at random for racers without a Stand, and once that stage for anyone on "Seek the Devil's Palm" (a Stand holder can pick that plan; the card warns "You already have a Stand; the Palm has nothing more to give you" until corpse parts arrive in M5).
- **Found a Stand Arrow** (secret): pierce yourself now, keep it, or leave it. A Stand holder only sees keep it / leave it.
- **Found a Rokakaka** (secret, human PCs only): eat it now (only if you have a Stand), keep it, or leave it.

A person's choice result always shows in the Main Story, even a quiet one ("Kruel waits out the storm"). Quiet results for AI racers and timed-out players go to the Meanwhile card.

In milestone 5a:

- **Attacked on the trail:** an NPC attacks you. Fight back to kill, fight back and let them go, or flee.
- **A chance to strike:** a named racer is alone and hasn't seen you. "If you win: kill them / let them go / take their horse", or leave them be. Ruthless racers get this one more often. If the target is a PC, they get "Someone is coming for you" at the same time.
- **Your ally is in trouble:** stop and help (counts as help), or ride on (abandoning: the alliance ends, −12).
- **A chance to betray:** your ally is asleep beside their horse. Take it and go (−12, the alliance ends), or stay loyal. ★ only for Ruthless and Opportunist personalities, but anyone can pick it.
- **Your second horse is gone:** go on, on foot, or retire.
- **Ride together?** (an Ally up invitation from another player) and **A trade offer** (secret).

There is no separate "Won a fight" window: fights ask "If you win:" in the same prompt (decision 57), so a fight never needs a second round of choices.

In milestone 5b:

- **Found a part:** keep it, hide it, or give it to someone.
- **Ambushed by agents:** fight, flee, or hand over a part to live.
- **Valentine's offer (Stages 4–6 only):** join him or refuse.

**PC vs PC fights:** both players choose at once. The attacker chooses what happens if they win (kill, let them go, take their horse; a corpse part in M5b); the defender chooses fight back to kill, fight back and let them go, or flee (hand over a part in M5b). Both choices combine into the result. The sim checks it's a real gamble: an attacker with equal skill wins about half the decided PC vs PC fights.

**Spares:** sparing someone you beat is tracked for every racer and feeds the **Most Merciful** award. A few "lets them go" events record spares, and fights use the same counter.

## Alliances

Alliances are in from the start. How one forms depends on who's asking:

| Alliance | How it forms |
| --- | --- |
| PC + PC | Both players agree on their phones (through Ally up or a sub event) |
| PC + canon racer | The character agrees if it fits them: Gyro takes in the worthy, Diego rarely allies unless it helps Diego |
| PC + NPC | Random events |

**One ally at a time.** **What allies do:** an ally who isn't busy that round rides in to help in half your fights (+5); allies get shared-food, watch and drafting events; and a Rider on foot rides double with an ally who still has a horse (half the on-foot penalty). Points stay individual. Alliances are public (the stream announces them); your phone shows who you ride with. A death ends an alliance with no blame.

**Breaking up:** betraying or abandoning an ally is a sub event choice and costs Worthiness (−12). A secret Valentine agent can sit inside an alliance without anyone knowing.

## Worthiness

Worthiness is a hidden 0–100 stat. PCs start by personality (Honorable 60, Cautious 55, Opportunist 50, Glory-Seeker 50, Ruthless 40; AI PCs use the same values); canon racers have their own values; NPCs start at 5–30. Each player sees only their own, on their phone, as an RDR2-style segmented bar with a word ("Unworthy" … "The Saint is watching") and no number; the phone is only ever sent a coarse level. Nobody else sees it, on the host or any other phone, until the finale's secrets reveal (milestone 6).

**Character creation** shows each personality's trade-off in one short line under its description, in words, never numbers (for example Ruthless: "Starts less worthy, but gets more chances to kill and sabotage.").

| Action | Change | Active |
| --- | --- | --- |
| Give away a corpse part | +15 | M5 |
| Spare someone you beat | +12 | M4 |
| Save a life (help tagged `save`) | +10 (instead of +8) | M4 |
| Help someone | +8 | M4 |
| Survive the Devil's Palm | +5 | M4 |
| Kill in self-defense (or by accident) | 0 | M4 |
| Ride past someone who needs help | −3 | M4 |
| Sabotage or cheat (cut a cinch, crowd into the rail, steal water) | −8 | M4 |
| Any kill you started: you attacked, hunted or ambushed | −8 | M4 |
| Kill someone helpless, fleeing or asleep | −12 (instead of −8) | M4 |
| Steal a corpse part | −8 | M5 |
| Abandon an ally | −12 | M5 |
| Join Valentine | −30 | M5 |

**Diminishing gains:** above 80, every gain is halved (rounded down), so a spare is +6 and the Palm +2; losses always count in full. Everything clamps to 0–100. A kill changes the Worthiness of the racer with the kill credit. Every kill event carries exactly one tag, `kill-defense`, `kill-started` or `kill-cruel`, and the content linter fails if one is missing. A Hunt a rival showdown that ends in a kill counts as started; showdowns can't kill yet, so this applies once milestone 5 fights can.

Every event that hurts another racer without killing them (pace loss, injury, a forced retirement, a lost horse) is tagged either `sabotage` (−8 for the focus racer) or `no-fault` (a fair race, an accident, a rescue); the linter fails if neither is there. Riding past is tagged `cold` (−3, no hint). Ruthless racers get the most events where they start a kill or sabotage, Opportunists the next most (`rules.personalityLean`).

**You notice it:** any change of 8 or more adds a private hint line: "You feel lighter in the saddle." when it goes up, "Something in you hardens." when it goes down. Changes of 3–7 get a softer line: "You feel steady." or "Something nags at you." (so a halved +4 help above 80 still registers). Changes under 3 are silent.

**Worthiness barely matters at the Devil's Palm, and that's intended:** the Palm only runs in Stages 2–3, when most PCs are still near where they started (45–59, or 60+ for Honorable players). It matters more for Stand Arrows later in the race and for corpse parts in milestone 5, by which point players have moved apart. In the sim (4,500 games), end-of-race averages are Honorable 82, Cautious 74, Glory-Seeker 63, Opportunist 59 and Ruthless 35; 12% of Honorable and 3% of Cautious players end at 100, and 20% of Ruthless players end below 25.

**What it decides:**

- The Devil's Palm outcome.
- Whether a corpse part accepts or rejects you.
- Whether you survive a Stand Arrow.
- How likely you are to awaken a Stand, and how strong it is.

**Hints on your phone:** key moments add a private line under "Only you know", such as "A strange calm settles over you as you leave the Palm." They arrive with the round's private update, after the stream has shown the round.

**Anonymous announcements on the host screen:** "Someone has been deemed worthy of the Saint" when a PC merges with a corpse part, and "Someone has fallen to the dark side" when a PC joins Valentine. Neither names the player.

## Stands

Stands come from every part of JoJo, each with a tier. The pool lives in `data/stands.js` so more can be added.

**Design rule:** every Stand can be beaten. Stands are used in race events now and fights in milestone 5. A tier shifts the odds; no Stand ever wins a fight or a race outright, and no Stand event time-stops, erases, or instantly kills anyone.

**The pool:**

- **Legendary:** Star Platinum (no time stop), Killer Queen (no Bites the Dust), Gold Experience (not Requiem), Crazy Diamond, Stone Free, Weather Report (no Heavy Weather), Cream (heavy damage but never an instant kill: its user is blind inside the void, so it can miss, overshoot or hurt the user).
- **Rare:** Magician's Red, Hierophant Green, Silver Chariot, Anubis, Hermit Purple, Sticky Fingers, Purple Haze, Spice Girl, Sex Pistols, Echoes Act 3, Aerosmith, Kraft Work, Soft & Wet, The Hand (only erases space to pull things closer, never a person).
- **Common:** Echoes Act 1, Harvest, Pearl Jam, Highway Star, Moody Blues, Beach Boy, Little Feet, Tower of Gray, Ebony Devil, Surface, Planet Waves, Paisley Park.
- **Banned, never obtainable:** The World, Star Platinum: The World, King Crimson, Made in Heaven, Gold Experience Requiem, Silver Chariot Requiem, Tusk Acts 2–4, Wonder of U, C-Moon, Bites the Dust, Green Day, Metallica, Whitesnake, D4C, and every Stand of Valentine's non-racer agents (Mandom, Catch the Rainbow, 20th Century Boy, Tubular Bells, Civil War, Tatoo You!, Wired…).

**Canon Stands** stay locked while their owner lives and join the pool when they die (Johnny's Tusk enters only as Act 1, even if he dies before awakening it). Tiers once unlocked: Cream Starter, In a Silent Way, Boku no Rhythm wo Kiitekure, Tusk Act 1 and Scary Monsters are Rare; Oh! Lonesome Me, Hey Ya! and Tomb of the Boom 1–3 are Common. Valentine-side racers' Stands (Oyecomova, the Boom Booms) do enter the pool. A PC's or NPC's Stand dies with them.

**One Stand per racer, always.** An Arrow, the Devil's Palm or a corpse part does nothing for someone who already has one (the text says so). The only way to swap is Rokakaka.

**Sources** (tier odds at Worthiness 50, in `rules.js`):

| Source | Legendary | Rare | Common | Risk |
| --- | --- | --- | --- | --- |
| Corpse part (M5) | 40% | 60% | 0% | Rejection if unworthy |
| Stand Arrow (our addition) | 20% | 40% | 40% | Must survive the piercing |
| Devil's Palm | 10% | 30% | 60% | Can kill or lose you |

**Worthiness shift:** every 10 points above 50 adds 2 points to Legendary, taken from the lowest tier (Common; Rare for corpse parts); every 10 below 50 does the reverse. It uses the exact value (Worthiness 65 = +3) and reaches ±10 at Worthiness 0 or 100. Corpse parts never give Common. Stand Arrows don't exist in SBR canon; they're a liberty, since the pool spans every part.

**What a Stand does** (`rules.standTier`): a placement bonus (Common +1, Rare +1, Legendary +1.5; canon racers' own Stands get none, since their skill already includes them), better odds of surviving hazards (×0.92 / ×0.85 / ×0.88 death odds), Stand events, and a fight bonus (+2.5 / +5 / +7.5). Fights are where Stands matter most: against an equal racer without one, a Stand user wins about 58% / 64% / 70% of decided fights (the sim prints this table). No one ever wins a fight automatically. The race-win check allows Common and Rare up to 2× their share of PCs and Legendary up to 2.5×, because survivorship alone puts every tier near 1.7×.

**Stand events:** generic lines with a `{a.stand}` token, plus signature lines for every canon Stand and a handful of famous pool Stands. Generic lines for racers nobody controls (AI racers, canon racers, NPCs) go to the Meanwhile card; signature canon lines and every human PC's Stand lines stay in the Main Story.

**Reveal rule:** your own phone shows your Stand (name, tier and what it does) from the round you get it. On stream a Stand stays hidden until the first time a revealed line names it. Its source (Palm, Arrow, corpse part) is never shown anywhere, so a Legendary Stand doesn't prove someone holds a corpse part.

### The Devil's Palm (Stages 2–3)

A racer who goes in gets one outcome from their Worthiness band (tuned with the sim). A racer who already has a Stand can still go in, but a Stand roll gives them nothing (one Stand per racer); the sim's Standless entrants match this table within about two points.

| Worthiness | Awaken a Stand | Nothing | Lost (−2 pace, or retire 1 in 4) | Dies |
| --- | --- | --- | --- | --- |
| 75–100 | 65% | 27% | 6% | 2% |
| 60–74 | 55% | 30% | 10% | 5% |
| 45–59 | 45% | 30% | 15% | 10% |
| 25–44 | 30% | 30% | 20% | 20% |
| 0–24 | 15% | 25% | 25% | 35% |

Awakening a Stand and coming out with nothing read the same on stream ("walks back out at dusk, silent"). Canon racers with `palm` (Norisuke, Mrs. Robinson, Avdul) and NPCs walk in too; an NPC who awakens a Stand becomes a breakout NPC (cap 5 a game).

### Stand Arrows (our addition)

About 6–8 surface per game, seeded across Stages 2–8, each going to a PC (human or AI) as a secret "Found a Stand Arrow" prompt. Surviving the piercing depends on Worthiness: 95% at 75+, 88% at 60–74, 78% at 45–59, 65% at 25–44, 50% below. A survivor gets a Stand from the Arrow odds; a death is a normal named death on stream ("pierced by a strange arrow"). A kept Arrow can be used later from the phone.

### Rokakaka (our addition)

Eating it removes your Stand completely, as equivalent exchange. You're Standless until an Arrow, the Palm or a corpse part gives you a fresh roll (normal odds, normal risks); the removed Stand goes back into the pool (canon Stands follow their lock rule). Only human-controlled PCs ever find one: at least 2 per game, given to random racing human PCs by the end of Stage 6, plus a third by chance (cap 3). If the finder falls before the find resolves, it turns up again the next round; if no human PC is left, none drop. The stream shows nothing until a resulting Stand is revealed by the usual rule, or the player dies.

### Items

Kept Arrows and Rokakaka sit in an **Items** section on their owner's phone (a general inventory with an owner field). A player can use an item while any choice window is open (a sub event or the Stage Plan); it resolves with that round. A kept Arrow is disabled while you have a Stand, and a Rokakaka while you don't. Nobody else knows what you hold.

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

**Horses:** every Rider gets a named horse (canon horses where known: Slow Dancer, Valkyrie, Silver Bullet; Avdul rides his camel). Some deadly events kill the horse instead of the rider, leaving them on foot with much worse placements (−40).

| Quality | Placement | Who gets it |
| --- | --- | --- |
| Nag | −4 | 20% of PCs' first horses; riderless horses |
| Sound | 0 | 60% of PCs' first horses; the trader (40 points) |
| Fine | +3 | 20% of PCs' first horses; the trader (70 points); other canon horses |
| Thoroughbred | +6 | Slow Dancer, Valkyrie, Silver Bullet; never for sale |

Canon racers' horses are already part of their skill, so their modifier counts from their first horse. The phone shows your horse's name and quality.

**Getting a new horse (milestone 5):**

- **The horse trader:** in the Stage Plan window of stages that start in a town (leaving Kansas City, Chicago, Philadelphia and Union Beach: Stages 5, 6, 8 and 9), a Rider on foot, or one who could trade up, sees a "Horse trader" section inside the Stage Plan card. The horse is paid for and yours when the plan locks in. Canon racers on foot buy one too. In the sim a Sound horse is worth about 24 points a stage over riding on foot, so it pays for itself in every town except the last; Fine pays off only from the early towns.
- **A riderless horse:** an on-foot Rider can catch one (main event).
- **Taking one:** win a fight with "take their horse if you win", or betray an ally.
- **Being given one:** through a trade.

Runners never have, buy, catch or receive a horse.

**Losing a second horse:** the next window asks "Go on, on foot" or "Retire".

**Trading (milestone 5):** a player offers an item (Stand Arrow, Rokakaka) or their horse to another racing PC from the phone ("Offer" buttons on Items and the horse row), as a gift or for one thing back (an Arrow, a Rokakaka, or their horse if you're on foot). The receiver gets a **secret** "A trade offer" prompt in their next sub-event window and accepts or refuses; the swap resolves with that round, or quietly falls through if either side no longer has the thing. One open offer at a time; it can be cancelled until they're deciding. No real-time haggling. A gift with nothing back counts as help (+8 Worthiness); a trade counts as nothing. The stream never hears about it.

**Fights (milestone 5)** use one system for every fight (`js/engine/fights.js`):

- **Score:** riding skill (NPCs 50) + Stand fight bonus + Spin (+6 for Gyro and Wekapipo) + an ally riding in (+5, half the time) + a random roll (sd 12) for each side.
- **Both sides commit first.** The attacker: "If you win: kill them / let them go / take their horse". The defender: fight back to kill / fight back and let them go / flee. Racers nobody controls decide by tier: canon racers usually spare, NPCs often kill.
- **Outcomes:** a defender who flees gets away 55% of the time (caught, they fight at −6). A margin under 4: both hurt. Otherwise the winner's choice happens, but **a kill needs a clear win (margin 14)**: closer, the loser gets away hurt, or the attacker is driven off. A reversal (the defender wins) kills the attacker only on a clear win too.
- **A Stand is revealed on stream** the first time its user fights with it ("Kruel fights with Killer Queen").
- **Worthiness:** a kill you started −8 (hunting a rival counts); killing a loser who fled −12 (cruel); a defender's kill 0 (self-defense); letting go someone you beat +12, but only +4 if you started the fight (attacking and sparing isn't mercy); a failed kill attempt costs nothing.
- Canon racers can't die in Stage 1 fights.

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
3. **Awards:** Most Kills, Most Merciful (spares), Best Runner, Biggest Comeback (most places climbed from a racer's worst standing to the final one), then **Stands awakened**: every racer who gained a Stand during the race, with the Stand and its tier (✝ if they fell, "gave it up" after a Rokakaka), never its source. Later: Corpse Holder (most parts, plus the President's count), Breakout Racers, and others.
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
- Sub event frequency: Low, Normal (about 2–3 per round), High (also on the race controls)
- NPC field size (default ~500)
- Choice timer (default 30 seconds; 15–60, also on the race controls)

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
20. New rooms start paused (host clicks Next); Auto is a toggle. Host controls sit in fixed slots so nothing shifts.
21. PCs buffed slightly after the first live test: PC skill 60 → 63, PC death odds 0.6 → 0.45. About 51% of PCs reach New York (was ~45%). Final retune after milestone 6.
22. Milestone 3 choice flow: a sub event window opens before each round's reveal; the host shows who is deciding with ✓ marks and a countdown. A window closes on the timer, on **End now**, or when every connected player has answered; unanswered players get ★. **Pause timer / Resume** freeze the countdown everywhere.
23. Stage Plans overlap the stage results: they open on the results card, and "Start Stage N" only waits for any time left. Stage 1's plan opens right after Start.
24. Sub event prompts have a `secret` flag: never named or counted on the host; all-secret windows just say "Decisions are being made…". Built now for Valentine's offer (M5).
25. Hunt a rival in M3 is a sprint showdown (+5 to the winner; plain sprint challenges keep +10). Targets are racing named racers, never yourself; a gone target gives "X's rival is gone" and a normal event; at most one showdown per target per round. It becomes a real fight in M5.
26. M3 sub events: injured racer, risky shortcut, hazard, spent horse / sore legs, sprint challenge, bad injury. Kill or spare, corpse parts, agents, the Devil's Palm and Valentine's offer wait for M4–5.
27. A sub event replaces that racer's main event for the round (keeps the reveal short).
28. A person's choice result always stays in the Main Story; only AI racers' and timed-out players' quiet results go to the Meanwhile card.
29. Hunt a corpse part is hidden until M5 (with corpse parts); Seek the Devil's Palm arrives in M4; Ally up in M5.
30. Worthiness is tracked silently from M3 (help/save +5, spare +8), shown nowhere until M4.
31. Retune for Stage Plans: PC skill 65, PC death odds 0.65 (about 51% of PCs reach New York, top 10 in about 38% of stages). The 77% PC win rate waits for the M6 retune.
32. The host logs every choice window (open time, time beyond the results, each answer time). "Export choice times" downloads it; `node sim/simulate.js --choice-times file.json` replays it to settle game length.
33. The phone feed is grouped by round (newest on top, older rounds collapsed to a tappable header), with one line per row at 16px, a gold bar and tint on your own lines, a red style for deaths, and Meanwhile lines in their own muted block. The status card, choice card and lobby got the same looser spacing. Checked at 360px wide.
34. Worthiness (values superseded by 47–48): every PC starts at exactly 50; canon racers have individual values (Gyro 80 … L.A. 12); NPCs 5–30. Active: help/save +5, spare +8, survive the Palm +5, cruel kills −5. The owner's phone shows a segmented bar with no number (only a coarse level is sent); nobody else sees it until M6. Private hint lines at key moments.
35. Worthiness matters little at the Palm (everyone is near 50 in Stages 2–3) and more for Arrows later and corpse parts in M5. Intended.
36. Stand tier odds by source (corpse 40/60/0, Arrow 20/40/40, Palm 10/30/60) with a ±2-per-10-Worthiness shift into Legendary from the lowest tier; in `rules.js`.
37. The Stand pool, banned list and canon Stands live in `data/stands.js`. The ban covers Valentine's non-racer agents only; Oyecomova's and the Boom Booms' Stands enter the pool when their owners die. Gyro has no Stand (Ball Breaker removed); Avdul rides an unnamed camel.
38. One Stand per racer; only Rokakaka removes one. Every Stand can be beaten: no Stand event kills, time-stops or erases.
39. A Stand is revealed on stream the first time a revealed line names it; the owner's phone shows it from the round they get it; the source is never shown. Secret prompts (Arrow, Rokakaka) never replace the racer's main event, so a missing line can't give them away.
40. The Devil's Palm: Seek plan unhidden for Stages 2–3; random Edge of the Palm for Standless PCs; outcome table by Worthiness band; "Stand" and "nothing" read the same on stream; canon (Norisuke, Mrs. Robinson, Avdul) and NPCs can enter; NPC breakouts capped at 5. Glory-Seeker's ★ plan in Stages 2–3 is Seek the Devil's Palm.
41. Stand Arrows: 6–8 per game across Stages 2–8 (raised from 2–4 so about a third of PCs end with a Stand), secret prompt, survival by Worthiness band. A Stand holder gets only keep / leave, and a kept Arrow's Use is disabled while holding a Stand.
42. Rokakaka: human PCs only, at least 2 per game by the end of Stage 6 (re-queued if the finder falls first), a third by chance; secret; "eat it now" only with a Stand.
43. Items are a general inventory with an owner; use during any choice window, resolving with that round. Trading (items and horses) is planned for M5.
44. Stand placement bonus Common +1 / Rare +1 / Legendary +2 (lowered to keep every tier under 2× its share of PC wins); canon racers' own Stands get none. Hazard survival ×0.92 / ×0.85 / ×0.80. Fight bonus hook +4 / +8 / +12 for M5.
45. Generic Stand lines for racers nobody controls go to the Meanwhile card; signature canon lines and human PCs' Stand lines stay in the Main Story.
46. The finale gets a "Stands awakened" card after the awards (user, Stand, tier; never the source).
47. Starting Worthiness by personality instead of 50 for everyone: Honorable 60, Cautious 55, Opportunist 50, Glory-Seeker 50, Ruthless 40, for people and AI PCs alike. Character creation shows each trade-off as one line of words, never numbers.
48. Bigger Worthiness changes so players notice: help +8, save a life +10 (instead of help), spare +12, survive the Palm +5, self-defense 0, a kill you started −8, a helpless/fleeing/asleep kill −12 (instead of −8). Recorded for M5: give a part +15, steal a part −8, abandon an ally −12, join Valentine −30. Before this, kills that weren't tagged cruel cost nothing.
49. Every kill event is tagged `kill-defense`, `kill-started` or `kill-cruel` (linted), and the change goes to the racer with the kill credit. Audit calls: the water-hole duel is self-defense (the other rider challenged), "killed for supplies" moved from cruel to started (the victim was alone but not helpless), "shot by mistake" counts as an accident (0), and Hot Pants striking a Valentine man first counts as started. Rival showdowns that kill count as started (from M5).
50. A Worthiness change of 8 or more gives a private hint line: "You feel lighter in the saddle." / "Something in you hardens."
51. Diminishing Worthiness gains above 80: gains halved (rounded down), losses full. Honorable and Cautious were ending at 92 and 87 with many at 100.
52. More ways to lose Worthiness: riding past someone who needs help −3 (`cold`), sabotage and cheating −8 (`sabotage`). Every event that hurts another racer without killing is tagged `sabotage` or `no-fault` (linted). No-fault calls: Diego's slipstream (fair riding, was tagged sabotage), neck-and-neck races, the avalanche, the final-mile collapse, and the Stage 9 brawl.
53. Personality leans retuned to target end-of-race Worthiness of about Honorable 80, Cautious 75, Glory-Seeker 60, Opportunist 60, Ruthless 35: Ruthless kill 3 / sabotage 2.6, Opportunist kill 1.6 / sabotage 2, Honorable help 1.05 / spare 1.1 / cold 0.7, Cautious help and spare 0.9, Glory-Seeker cold 1.8 / help 0.7.
54. Balance after 51–53: PC death odds 0.65 → 0.56 (more started kills among PCs had pushed New York survival down to 46%), Legendary placement +2 → +1.5 and hazard survival ×0.80 → ×0.88 (Legendary was at about 2.05× on some seeds). Single 1,500-game runs swing about ±0.2× on the 2× check, so it's judged on 4,500 games.
55. Soft Worthiness hints for changes of 3–7 ("You feel steady." / "Something nags at you."), using the change actually applied, so halved gains above 80 aren't silent. 8+ keeps the stronger lines.
56. Honorable must get the most help/spare events of any personality (Cautious had overtaken it, mostly by surviving longer). Leans: Honorable help 1.2 / spare 1.15 / cold 1.3, Cautious help and spare 0.8. Per PC per game: Honorable 3.3, Cautious 3.0, Opportunist 1.9, Glory-Seeker 1.4, Ruthless 0.7; Honorable still averages about 82.
57. Fights ask "If you win:" in the same prompt as the attack, instead of a separate "Won a fight" window, so fights never add a round of choices.
58. One fight resolver for everything (rival showdowns, Attacked on the trail, A chance to strike, PC vs PC; agents and Valentine in M5b): skill + Stand + Spin + ally + noise (sd 12 per side). A kill needs a margin of 14; fleeing escapes 55%; margin under 4 hurts both.
59. Stand fight bonus +2.5 / +5 / +7.5, targeting a 58% / 64% / 70% win rate against an equal racer without a Stand (the core of fighting with Stands). The race-win check allows Common and Rare 2× and Legendary 2.5×; Legendary placement stays +1.5.
60. Sparing in a fight you started gives +4, not +12; a defender who drives off an attacker gets +12; a failed kill attempt costs nothing. Killing a caught fleer is cruel (−12).
61. Hunt a rival is a real fight started by the hunter; its plan death multiplier went from 1.45 to 1 and Opportunists no longer have it as their ★ (Ruthless still do). PC death odds from events 0.65 → 0.46 and "shot from ambush" weight 0.9 → 0.6 to keep about 45% of PCs reaching New York with fights in the game.
62. Horse quality tiers (Nag −4, Sound 0, Fine +3, Thoroughbred +6); canon horses count from their first horse. Trader in Stages 5, 6, 8, 9 inside the Stage Plan card: Sound 40, Fine 70 (checked against the on-foot penalty in the sim). Riderless horses as main events. A second lost horse asks retire or go on.
63. Alliances: one ally at a time; Ally up hidden while allied; PC invites answered in the next window; canon by character fit (rules.alliances.canon); NPCs 60% and by a rare "falls in with" event. Allies: +5 in half your fights, ride double on foot, shared-food help events. Abandon / betray −12.
64. Trading: secret offer from the phone, answered in the receiver's next window, resolved with that round; one open offer at a time; a gift counts as help, a trade as nothing.
65. Runner flat modifier −6 → −7, since Riders now spend points on horses. Personality leans retuned again for fights (Glory-Seeker ends near 65, accepted).
66. The sim's old "reversals" figure counted every fight, including NPC ambushes that PCs usually win; PC vs PC fights are about even (attackers win about half the decided ones).
