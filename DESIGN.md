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
- A window closes when the timer runs out, when every connected player has answered, or when the host clicks **End now** (disabled for the first 3 seconds of the waiting screen; while any player is still deciding, it asks first without saying who). Anyone unanswered (timed out or disconnected) gets their ★ option. AI racers answer instantly by personality.
- **Pause timer** freezes the countdown on the host and every phone ("Paused by the host") so the host can talk; **Resume** restarts it.
- Answers can be changed until the window closes. Everything resolves together; sub event results lead the round's Main Story.
- **Secret prompts:** a sub event can be marked secret. Secret prompts are never named or counted on the host screen; if every pending prompt is secret, the host just says "Decisions are being made…". The phone marks them "Only you see this." Secret in milestone 5: Stand Arrows, Rokakaka, trade offers, corpse finds, a chance to steal, Valentine's offer and errands.

**Personality hint:** on every choice, the option your personality would pick is marked "★ In character." Personality also nudges which random events you get (Honorable gets more helping and sparing events, Ruthless more kills and sabotage). Canon racers add their own leanings on top: they rarely start kills and often help.

**Stage Plan** (start of each stage, everyone at once):

| Plan | Upside | Downside | Arrives |
| --- | --- | --- | --- |
| Push hard | Better placement | More hazard and horse risk | M3 |
| Pace yourself | Safe | Average placement | M3 |
| Hunt a rival | A guaranteed fight with your pick | You might lose it, or worse; −5 placement | M3 (a real fight from M5) |
| Lay low | Very safe | Bad placement | M3 |
| Seek the Devil's Palm (Stages 2–3) | A guaranteed Edge of the Devil's Palm that stage | Low Worthiness can kill you; −5 placement | M4 |
| Hunt a corpse part | Better odds of finding one (×3) | Valentine's agents notice you (×2); −5 placement | M5b |
| Ally up (only while you ride alone) | Ride with someone (they accept or refuse) | They might betray you | M5 |

Plans whose systems don't exist yet are hidden, not greyed out. The numbers live in `data/plans.js`; the sim checks that no plan dominates (`--plans random`, `--plans <id>`, `--plans star`).

**Hunt a rival:** pick any racing named racer (a PC, canon racer or named NPC), never yourself. Sometime in the stage you catch up and it comes to a **fight** (see Fights), started by you: you choose what happens if you win, and a PC target chooses how to meet you at the same time. The winner gets +5 points and pace. If the target dies or retires first, you get a normal event and the line "X's rival is gone." Several racers can hunt one target, but a target has at most one showdown per round; a hunter who can't get one by the end of the stage "never catches up".

**Ally up (milestone 5):** pick a racing named racer who rides alone. A PC answers in their next sub-event window ("Ride together?"); a canon racer answers by character fit (Gyro takes in the worthy, Diego rarely unless you're in the top five); a named NPC agrees 60% of the time. The stream announces the answer.

**Sub events:** every round, each PC has a chance of one, and at least one PC always gets one (Low about 1 a round, Normal 2–3, High 4–5, a host setting). Prompts a player's own Stage Plan guarantees (a rival showdown, a hunt's find, the Palm quest) count only half toward that number, so they don't crowd everyone else out. **Fairness:** random sub events and agent ambushes lean toward living PCs who have had fewer prompts per round so far, and away from those who've had more (`rules.choices.fairness`). Valentine's offer and errands don't count. Everyone affected answers at the same time, and the host screen announces it while the main flow waits. A sub event counts as that racer's event for the round. Some sub events chain (win a fight, then choose kill or spare).

In milestone 3 (`data/sub-events.js`):

- **Injured racer on the trail:** stop to help (lose time, +5 points, Worthiness +10 for saving a life) or ride past.
- **Risky shortcut** (canyon gap, goat path, thin ice, back alleys, dry riverbed): take it or stay on the road.
- **Hazard** (sandstorm, blizzard, stampede, fog, fire, flash flood): push through or take shelter.
- **Spent horse / sore legs** (Runners): rest or push on.
- **Sprint challenge:** race a canon racer or NPC for +10, or let them go.
- **Bad injury:** keep riding, stop and heal, or retire.

In milestone 4:

- **Edge of the Devil's Palm** (Stages 2–3): go in or turn back. It comes up at random for racers without a Stand, and once that stage for anyone on "Seek the Devil's Palm". A Stand holder can pick that plan; since M5b the card says "You have a Stand, but the Palm may still hold a corpse part."
- **Found a Stand Arrow** (secret): pierce yourself now, keep it, or leave it. A Stand holder only sees keep it / leave it.
- **Found a Rokakaka** (secret, human PCs only): eat it now (only if you have a Stand), keep it, or leave it.

A person's choice result always shows in the Main Story, even a quiet one ("Kruel waits out the storm"). Quiet results for AI racers and timed-out players go to the Meanwhile card.

In milestone 5a:

- **Attacked on the trail:** an NPC attacks you. Fight back to kill, fight back and let them go, or flee.
- **A chance to strike:** a named racer is alone and hasn't seen you. "Don't attack: leave them be" comes first; the rest read "Attack: if you win, kill them / let them go / take their horse / search them", so nobody mistakes "let them go" for skipping the fight. A rival showdown's options read "Fight: if you win, …" and a defender's "Fight back: if you win, …". Ruthless racers get this one more often. If the target is a PC, they get "Someone is coming for you" at the same time.
- **Your ally is in trouble:** stop and help (counts as help), or ride on (abandoning: the alliance ends, −12).
- **A chance to betray:** your ally is asleep beside their horse. Take it and go (−12, the alliance ends), or stay loyal. ★ only for Ruthless and Opportunist personalities, but anyone can pick it.
- **Your second horse is gone:** go on, on foot, or retire.
- **Ride together?** (an Ally up invitation from another player) and **A trade offer** (secret).

There is no separate "Won a fight" window: fights ask "If you win:" in the same prompt (decision 57), so a fight never needs a second round of choices.

In milestone 5b (`data/sub-events.js`, resolved in `js/engine/corpse.js`, `agents.js`, `valentine.js`):

- **You found a corpse part** (secret): keep it (it merges with you), hide it on you, or give it to someone (pick who; +15).
- **A chance to steal** (secret, Night rounds): a holder is asleep and something in their pack glows. Take it (−8; 75% it works, otherwise they wake and you back off) or leave it. Only the thief learns who holds a part.
- **Ambushed by agents:** fight back to kill, fight back and let them go, flee, or **let them search you** (they take a part if you carry one and ride off; you're roughed up if you don't). Not secret: agents also ambush racers holding nothing, so the stream learns nothing.
- **Funny Valentine** (Stages 8–9): face him or avoid him (lose time).
- **A man in a dark hat** (Valentine's offer, secret, Stages 4–6): join Valentine or refuse.
- **Valentine's errand** (secret, joiners only): pick a racer; next round you ambush them masked. Their prompt is **Someone is coming for you** (a rider in a dark hat): the agent-ambush options.

In milestone 7b, good-aligned drama on stream (`GOOD_SUBS` in `data/sub-events.js`, resolved in `js/engine/choices.js`; leanTag `heroic`, weighted ×7 Honorable, ×5.5 Cautious, ×3 Glory-Seeker, ×1 Opportunist, ×0.25 Ruthless):

- **A rescue:** an NPC (or a canon racer) has someone at gunpoint. Ride in, and if you win kill them or let them go, or ride on (−3). A real fight: killing the attacker counts as defense (0), sparing them is mercy (+8). Saving them is a great deed (+7) and +12 points; lose the fight and they're left to the attacker.
- **Stand guard** (Night rounds; your hurt ally, or a feverish stranger): keep watch (lose time, +5) or sleep (−3). Half the time riders come and you fight to drive them off (a great deed, +8 points if you do).
- **A hard choice:** help at a real cost: give a stranger your horse (you go on foot; a great deed, +10 points), wade into a river for a stuck family (lose a lot of time, sometimes hurt), or pay a doctor for a dying stranger (−15 points).
- **Someone's in your camp** (Night rounds): chase them (if you catch them, let them go or kill them; they may fight) or let them go (they take food and water, and you lose time). **A theft never reaches a human without a choice:** the plain theft events (robbed in the night, horse thieves, a water thief, a pickpocket) only hit AI racers and NPCs.
- **Ride after them:** the round after agents take a corpse part from you, you can ride after them (a fight in which they're at −2 more; win and it's yours again) or let it go. It never says which part.

**Repeats:** one player never gets the same sub event title twice in a row, or more than twice a game, unless nothing else fits (the Devil's Palm keeps its own schedule).

**PC vs PC fights:** both players choose at once. The attacker chooses what happens if they win (kill, let them go, take their horse, or **search them**: take a corpse part if they carry one; the stream line is the same either way, "goes through their things"). The defender chooses fight back to kill, fight back and let them go, flee, or **give up without a fight** (the attacker gets their choice; a kill on someone who gave up counts as cruel, −12). Both choices combine into the result. The sim checks it's a real gamble: an attacker with equal skill wins about half the decided PC vs PC fights.

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

Worthiness is a hidden 0–100 stat. PCs start by personality (Honorable 54, Cautious 58, Opportunist 55, Glory-Seeker 49, Ruthless 47; AI PCs use the same values; retuned in milestone 7b); canon racers have their own values; NPCs start at 5–30. Each player sees only their own, on their phone, as an RDR2-style segmented bar with a word ("Unworthy" … "The Saint is watching") and no number; the phone is only ever sent a coarse level. Nobody else sees it, on the host or any other phone, until the finale's secrets reveal (milestone 6).

**Character creation** shows each personality's trade-off in one short line under its description, in words, never numbers (for example Ruthless: "Starts less worthy, but gets more chances to kill and sabotage.").

| Action | Change | Active |
| --- | --- | --- |
| Give away a corpse part for nothing (found, or offered from the phone) | +15 (instead of +5); a great deed | M5b |
| Spare someone you beat | +8 (+2 in a fight you started); sparing a PC who attacked you is a great deed | M4, M7b |
| Save a life (help tagged `save`, a rescue, driving off riders while standing guard) | +7 (instead of +5); a great deed | M4, M7b |
| Help someone | +5 | M4 |
| Survive the Devil's Palm | +3 | M4 |
| Kill in self-defense (or by accident) | 0 | M4 |
| Ride past someone who needs help | −3 | M4 |
| Sabotage or cheat (cut a cinch, crowd into the rail, steal water) | −8 | M4 |
| Any kill you started: you attacked, hunted or ambushed | −6 | M4 |
| Kill someone helpless, fleeing or asleep | −10 (instead of −6) | M4 |
| Kill the attacker in a rescue | 0 (defense) | M7b |
| Steal a corpse part (asleep, or by searching someone you beat) | −8 | M5b |
| Take a part from the body of someone you killed | 0 | M5b |
| Abandon an ally | −12 | M5 |
| Join Valentine | −30 | M5b |

**Diminishing gains** (milestone 7b): above 70 every gain is halved, above 85 quartered (rounded down, at least +1), and above 95 only **great deeds** raise it (giving away a corpse part, saving a life, sparing a PC who attacked you). Losses always count in full. Everything clamps to 0–100. A kill changes the Worthiness of the racer with the kill credit. Every kill event carries exactly one tag, `kill-defense`, `kill-started` or `kill-cruel`, and the content linter fails if one is missing. A Hunt a rival showdown that ends in a kill counts as started; showdowns can't kill yet, so this applies once milestone 5 fights can.

Every event that hurts another racer without killing them (pace loss, injury, a forced retirement, a lost horse) is tagged either `sabotage` (−8 for the focus racer) or `no-fault` (a fair race, an accident, a rescue); the linter fails if neither is there. Riding past is tagged `cold` (−3, no hint). Ruthless racers get the most events where they start a kill or sabotage, Opportunists the next most (`rules.personalityLean`).

**You notice it:** any change of 6 or more adds a private hint line: "You feel lighter in the saddle." when it goes up, "Something in you hardens." when it goes down. Changes of 2–5 get a softer line: "You feel steady." or "Something nags at you.". Changes under 2 are silent.

**Worthiness barely matters at the Devil's Palm, and that's intended:** the Palm only runs in Stages 2–3, when most PCs are still near where they started (45–59, or 60+ for Honorable players). It matters more for Stand Arrows later in the race and for corpse parts in milestone 5, by which point players have moved apart. In the sim (4,500 games, milestone 7b), end-of-race averages are Honorable 77, Cautious 71, Glory-Seeker 61, Opportunist 57 and Ruthless 34; 2% of Honorable players and nobody else end at 95+, and 29% of Ruthless players end below 25 (most of them joined Valentine). Honorable players help and spare the most (5.5 a game, Cautious 4.1, Ruthless 1.3).

**What it decides:**

- The Devil's Palm outcome.
- Whether a corpse part accepts or rejects you.
- Whether you survive a Stand Arrow.
- How likely you are to awaken a Stand, and how strong it is.

**Hints on your phone:** key moments add a private line under "Only you know", such as "A strange calm settles over you as you leave the Palm." They arrive with the round's private update, after the stream has shown the round.

**Alerts on your phone** (since the first live tests): big private changes get a card at the top of the phone, shown when the round's private update arrives (the end of the reveal, so nothing spoils the stream) and kept until you tap "Got it".

- **Your horse is dead / was taken** (Riders): a large flashing red alert ("YOUR HORSE IS DEAD. You're on foot and far slower. Buy one at the next town, or take a riderless horse.") naming the next horse trader, plus a red **ON FOOT** banner on the status card until you ride again.
- Calmer alerts: a Stand gained or lost, a corpse part gained or lost, a bad injury, your ally dead or gone, and a horse again.
- **After every fight or theft** (milestone 7b), each PC in it is told exactly what happened: "Ringo Roadagain beat you and took the Spine.", "You drove them off and kept everything.", "A rider in a dark hat beat you and took Shiloh." (a masked rider stays masked), "They got away. They took food and water."
- **You ate the Rokakaka.** "[Stand] is gone. The Devil's Palm, an Arrow or a corpse part can give you a new one." Until one does, the Stand card says "Your Stand is gone (you ate a Rokakaka)." 
- While a part is merging (until the end of the next round), a Standless player's Stand card says "The part is settling into you…" instead of "No Stand yet".

**Anonymous announcements on the host screen:** "Someone has been deemed worthy of the Saint." when a PC merges with a corpse part, and "Someone has fallen to the dark side." when a PC joins Valentine. Neither names the player; they come at the end of that round's Main Story, in gold italics, with no faces.

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

Eating it removes your Stand completely, as equivalent exchange. You're Standless until an Arrow, the Palm or a corpse part gives you a fresh roll (normal odds, normal risks); the removed Stand goes back into the pool (canon Stands follow their lock rule). Only human-controlled PCs ever find one: 4 per game, plus a fifth half the time (milestone 7b), given to racing human PCs by the end of Stage 6. Someone who hasn't found one yet is 3× likelier to get the next, and someone with a Stand 1.5× likelier. If the finder falls before the find resolves, it turns up again the next round; if no human PC is left, none drop. The stream shows nothing until a resulting Stand is revealed by the usual rule, or the player dies.

### Items

Kept Arrows and Rokakaka sit in an **Items** section on their owner's phone (a general inventory with an owner field). A player can use an item while any choice window is open (a sub event or the Stage Plan); it resolves with that round. A kept Arrow is disabled while you have a Stand, and a Rokakaka while you don't. Nobody else knows what you hold. **Using one asks first** (milestone 7b): "Eat the Rokakaka? [Stand] will leave you for good. Eat it / Cancel" (or "Pierce yourself with the Arrow?"). While it waits for the round, the item says "You'll eat this when the round is revealed." and its button cancels.

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

**How it works (milestone 5b, `js/engine/corpse.js`, numbers in `rules.corpse`):**

- **One part a stage**, in order: the Left Arm, the Heart, the Eyes, the Spine, the Ears, the Right Arm, the Legs, the Torso, the Head. Each surfaces on a seeded Day or Night round of its stage and lies **loose** on the trail.
- **Hunting:** at the start of each stage, every PC on "Hunt a corpse part" rolls their own chance: 90% at Worthiness 50, ±0.2% per point (so Worthiness matters only a little; it mostly decides rejection), +15% for each earlier hunting stage that found nothing (the pity rule; it resets after a find). A hunter who makes it claims that stage's part on a random round, even before it would surface, or any loose part; if several hunters make it in one stage, they share what's there. In the sim a hunter finds a part in about 37% of stages; the limit is supply when many hunt at once.
- **Finding:** otherwise, each round a loose part is found 95% of the time. Who finds it is weighted a little by Worthiness (1 + Worthiness ÷ 100): ×3 on "Hunt a corpse part", ×0.5 for retired racers, canon ×0.6 (Johnny and Gyro ×2 on top), and the whole NPC field counts as one weight of 4. A PC gets the secret "You found a corpse part" prompt; canon racers and NPCs keep theirs (an NPC finder becomes a named breakout, within the cap).
- **The Devil's Palm** (Stages 2–3): 25% of the time that stage's part waits in the Palm, and the first racer to walk out alive comes out holding it. If nobody has by the stage's last Day or Night round, it surfaces normally.
- **Merging:** every part that comes to a racer merges with them, whether found and kept, given, traded, stolen, searched for, or taken from a body. The only exception is a part they chose to **hide on them**: wrapped, it can't touch them (no Stand, no rejection) and agents notice it half as much. A hidden part can be held later from the phone (Corpse parts → **Hold it**). A merge resolves at the end of the **next** round, so a rejection never lands right after the line where the part changed hands.
- **Rejection,** rolled once per merge by Worthiness: 75+ 0%, 60–74 3%, 45–59 8%, 25–44 18%, below 25 35%. Two thirds of rejections kill (the stream says "there's only sand", "vanishes from the trail" or "drops dead in the middle of the trail"; the Fallen cause is just as vague, and the real cause is kept for the M6 reveal). The rest just lose the part, which goes back onto the trail.
- **A merge that holds:** a Standless PC or NPC awakens a Stand on the corpse odds (40/60/0, never Common); canon racers keep their own story. A PC's merge shows "Someone has been deemed worthy of the Saint." on the host.
- **Death:** a holder's killer takes what they carried (0 Worthiness; agents take it to the President). A holder who dies any other way drops it back onto the trail.
- **The President:** anything still loose at a Finish Line is recovered by his agents, and so is every part handed or taken by agents, Valentine or an errand. His count is kept for M6 (`corpseSummary`).
- **Secret, like Stands:** a part is an item that only its holder's phone sees, in a **The Saint's Corpse** card with Offer (trade it, or give it: +15) and Hold it. No stream line ever names a part or a holder. `state.corpse.log` records every change of hands for the M6 Final Stage and secrets reveal.

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

**Valentine's agents** (Ringo Roadagain, Blackmore, Magent Magent, Mike O., Dr. Ferdinand, Axl RO, the Pork Pie Hat Kid, the Tattoo You men, the Eleven Men) attack as events, not racers (`js/engine/agents.js`, `rules.agents`). Their Stands stay banned and are never named.

- **Ambush chance per racer per round:** 8% + 12% per part carried (3% for a hidden one) for holders (4% + 6% before milestone 7b's "Ride after them"); 1.5% for PCs holding nothing, so an ambush proves nothing. ×2 on "Hunt a corpse part". Canon and NPC holders at half the rate (nobody controls them, and they can't hide a part or plan). Sub event fairness can lower a PC's chance. **Joiners are never ambushed, unless they carry a part that has merged with them** (below).
- **The fight:** an agent fights at their own skill (57–66) minus 2 (tuned with deliveries and ambush rates to keep the President's bad ending near 15%). If they win they search you (a part if you carry one) or try to kill. Let them search you and they never kill. A PC can kill an agent; dead agents stay dead.
- A PC's ambush is a sub event prompt; canon and NPC holders are ambushed inside the round.
- **Cooldown** (milestone 7b): once agents beat or rob a PC, they leave that PC alone for the rest of the stage and the next 2.
- **Ride after them** (milestone 7b): if they took a part, the next round offers the chase (see Choices). In the sim about 70% of chases win it back.

**Funny Valentine** (Stages 8–9): "Face him / Avoid him", offered once to a PC with a Rare or Legendary Stand and Worthiness 60+, never to a joiner (20% a round while eligible). He fights at 77 before the roll, so a Legendary user wins about 30%. Driving him off: +50 points and pace. Losing: he takes every part you carry, or kills you on a clear win. He can never be killed. Avoiding him costs time.

**Joining Valentine** (Stages 4–6 only) is a secret (`js/engine/valentine.js`, `rules.valentine`):

- **Who's offered:** 1–2 PCs a stage on a seeded round, a secret "A man in a dark hat" prompt. Worthiness under 40 doubles your chance, Ruthless or Opportunist ×1.5; once per PC.
- **The cost:** Worthiness −30, and the host screen announces only "Someone has fallen to the dark side."
- **The rewards:**
  1. Agents never ambush you.
  2. Relay horses: +1 placement every remaining stage.
  3. If you're Standless, a free Stand on the Arrow odds with no risk.
  4. Once a stage, a secret **Valentine's errand**: pick a racer, and next round you ambush them as "a rider in a dark hat" with agent backup (+8). Win and a part they carry goes to the President; with nothing to find, you take their horse. No name, no Stand, no ally on stream, unless they kill you, which unmasks you ("It was Kruel."). It can target your own ally.
  5. If the President ends with more parts than every racer combined, every joiner gets +30 points (before the podium).
- **Joiners and parts:** when a part merges with a joiner, the protection ends ("The President wants what you carry."), and agents hunt them like any holder. In any choice window, the joiner's Corpse card offers **Deliver it to the President** (secret): the part goes to the President's count, they get +10 points a part, and the protection comes back once they carry no merged part. Only a merged part can be delivered.
- **The losing side:** at the end of the race, if the President didn't win on parts, every joiner's phone says "The President's plan failed. You rode for the losing side." (dead joiners see it on their final screen); if he did, "As promised: +30 points." Kept as `valentine.outcome` for the M6 secrets reveal.
- **Your phone** shows a "You ride for Valentine" card with your status (Protected, or HUNTED while you carry a merged part); nobody else knows. A joiner can stay in an alliance and their ally sees nothing.
- **The balance check** (sim, 4,500 games): offers only reach PCs still racing in Stages 4–6, so joiners are judged against PCs racing at the start of Stage 4. Their share of those PCs' race wins must stay under 1.3× their share of those PCs. Against all PCs, even the PCs who refused score about 1.6×, so that test only measured survival.
- The host's browser holds every secret, so a host who also plays shouldn't go digging.
- It's revealed in the finale's secrets reveal (M6).

## Dead players

Dead players keep playing: each round they vote on what happens to the living. The majority picks one category; a tie is settled by the game.

| Category | What the dead choose | What the game chooses |
| --- | --- | --- |
| Hazard | That a hazard happens | Which one (tornado, acid rain, sandstorm, wildfire, stampede, flash flood, blizzard, by stage) |
| Ambush | That an ambush happens | A random target among PCs and named NPCs, so it can hit a former ally |
| Blessing | Who gets blessed, by an individual vote | Breaks a tie on the target |

**How it works (milestone 6a, `js/engine/dead.js`, numbers in `rules.dead`):**

- **Who votes:** dead human players. AI racers who die don't.
- **When:** the vote opens on dead players' phones when a round's reveal starts and closes when the host starts the next round; it applies to that round. Nobody waits for it. If no one votes, nothing happens. The dead act at most once a round.
- **One card:** Hazard / Ambush / Blessing, and choosing Blessing also picks which living PC gets it (no second vote). Most votes wins, the game breaks ties; the Blessing goes to the PC most Blessing voters picked (ties broken by the game).
- **Hazard:** a hazard from the stage's list sweeps the trail. Three random racing named racers lose 1 pace and one of them is hurt; a few riders from the field die. No named racer dies.
- **Ambush:** a rider "with the dead's fury" (NPC skill +6) attacks a random PC or named NPC, so it can hit a former ally. A normal fight; a PC defends by their ★ choice (there's no window left to ask). It can kill, but a PC usually wins.
- **Blessing:** the chosen PC is healed, gets +2 pace, and is protected that round: no deadly event, fight, Palm, Arrow or corpse rejection can kill them.
- **On stream:** one anonymous line in that round's story ("The dead stir. A sandstorm sweeps the trail…", "The dead stir. A rider rides out of the dust at Kruel…", "The dead have chosen a blessing for Kruel."). Never who voted what.
- **The phone:** a "You're dead, but you're not done" card with the vote, then the final status, and their own Stand, parts and hints (still only their own).

## Points, winning and endings

The race winner is whoever has the most points among racers who reach New York. Dying knocks you out; retiring takes you out of the points race, but you stay in the story and can still hunt corpse parts.

**Survival** (after the first live tests): players shouldn't die often. About 48% of PCs reach New York. **Stages 1–2 are safe for PCs:** nothing kills a PC there except a risk they chose (going into the Devil's Palm, piercing themselves with a Stand Arrow), at the usual rates; every fight, event, hazard, ambush or rejection leaves them hurt, slowed or robbed instead, and the line says so. From Stage 3 on, PC deaths lean late (`rules.pcDeathByStage`: ×0.2 in Stage 3 up to ×1.9 in Stage 9, for deadly events and for being killed in a fight). Canon racers keep their own rule (safe in Stage 1); NPCs are unaffected.

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

**How it works (milestone 6b, `js/engine/final-stage.js`, `js/engine/endings.js`, numbers in `rules.finale`):**

- **The boss:** when the Final Stage's Stage Plans close, the racing racer (PC, canon or NPC) holding the most parts, at least 3, becomes the boss. Ties go to higher Worthiness, then points. The stream announces only that ("The Saint's Corpse has chosen Kruel."), plus "Love Train" at 5+ parts; nothing else about who holds parts. The boss gets +6 placement in the Final Stage, a Love Train holder +30.
- **Holding the Corpse pays:** "Hunt a corpse part" costs no placement once you carry 3+ parts.
- **Love Train is a real shot at winning:** Love Train holders go into the Final Stage around 8th place, 200+ points behind; with the +30 placement and the +225 bonus, a Love Train holder wins the race about 39% of the time (a boss of any size about 18%).
- **Love Train (5+ parts):** nothing can kill the holder (no deadly event picks them; the Palm, an Arrow and rejection can't kill them). A fight that would kill them kills a random nearby racer instead ("misfortune slides off Kruel and onto…").
- **Bring them down:** in every Day and Night round of the Final Stage, up to 4 random living PCs (never Valentine joiners) get "Bring them down": ride with the others, or stay out. Everyone who says yes fights the boss in one combined fight: the team fights at its average fight skill + 6.5 per rider, the boss at their own fight score + 19.5 with Love Train (+4.5 without). Equal riders: a Love Train holder loses to 2 / 3 / 4 riders about 35 / 51 / 65% of the time; a 3–4-part boss about 70 / 81 / 90%. Win: each rider takes one part, the rest come loose, the boss is hurt. Lose: one rider is hurt, or killed on a clear loss. It works the same against a canon or NPC boss.
- **The boss dies or retires in the Final Stage:** no Corpse ending; their parts come loose (or go to their killer) as usual.
- **Funny Valentine in the Final Stage:** he can't be killed before it. With a Love Train holder, he comes for them once (early in the stage); joiners get a secret "Ride with him" prompt (+5 each). He wins: every part the holder carries is his. Beating him in the Final Stage, there or in "Face him", makes **D4C** swap in another-world Valentine ("Dirty Deeds Done Dirt Cheap…"), and a fresh group fight comes next round: the one who beat him plus up to 3 other living PCs who join (the same combined fight, against 77). A second win kills him for good: every part he held comes loose (and stays loose), each racer in that fight gets +80, joiners lose their rewards. In the sim he dies in about 8% of games.
- **Johnny and Gyro** collect too: a part still loose at a Finish Line goes to one of them (if racing) 40% of the time, instead of the President.

**The main ending** (exactly one per game, the first that applies), shown as its own card before the podium:

1. **The President is dead:** he was killed in the Final Stage. Joiners: "The President is dead. You rode for a dead man." No joiner bonus.
2. **The President takes the Corpse:** he holds more parts than every racer combined. The podium becomes "First across the line"; joiners get their bonus.
3. **The Double-Cross:** the boss is a Valentine joiner who reaches New York still holding the Corpse. "The President's own rider has betrayed him." The traitor gets the Corpse ending's bonus; other joiners get nothing.
4. **Holder of the Saint's Corpse:** the boss reaches New York holding 3+ parts: +50 points, or +225 for a boss chosen with Love Train who still holds 3+ (a fight may have taken a part or two).
5. **The Bloodbath:** fewer than 22% of the PCs who started reach New York (canon racers don't count; with 18 PCs that's 3 or fewer). "The Steel Ball Run ends in silence."
6. Otherwise, a normal ending (no card).

The race winner is still whoever has the most points (except that in the President's ending the podium is only "first across the line").

**Epilogues** (`data/epilogues.js`, any number per game, one short card each, after the winner): The Saint Smiles (the winner never killed and has Worthiness 75+), The Devil's Champion (the winner has the most kills), On Foot to Glory (a Runner wins), Ride Together (allies finish 1st and 2nd), and a canon champion card in character when a canon racer wins (Hot Pants gets the longest). Adding one is one entry in that file.

**The ending sequence** (after the last Finish Line), revealed card by card:

1. "The race is over."
2. **Podium:** 3rd place, then 2nd, then a dramatic pause ("And the winner of the Steel Ball Run is…"), then the winner. Auto-advance stops on the winner.
3. **Awards:** Most Kills, Most Merciful (spares), Best Runner, Biggest Comeback (most places climbed from a racer's worst standing to the final one), then **Stands awakened**: every racer who gained a Stand during the race, with the Stand and its tier (✝ if they fell, "gave it up" after a Rokakaka), never its source. **Corpse Holder** (most parts at the end, plus the President's count; milestone 6b). Later: Breakout Racers, and others.
4. **Reached New York:** every survivor with their points, plus how many from the field finished.
5. **In memory of the Fallen:** everyone who died, how, by whom, and when.
6. **The secrets reveal** (milestone 6c, `js/engine/secrets.js`), the last and biggest moment, card by card after the memorial:
   - "The secrets of the Steel Ball Run."
   - **Valentine's riders:** who joined, in which stage, how it ended for them (the winning side, the losing side, a dead man, betrayed, or the traitor), parts delivered; every rider in the dark hat unmasked ("The rider in the dark hat who ambushed Johnny Joestar in Stage 6 was Kruel."), and who rode at Valentine's side in the Final Stage.
   - **Worthiness:** every PC's bar and word, highest first, no numbers.
   - **The Saint's Corpse** (two cards): each part's journey ("found by Kruel (Stage 2) → stolen by Gus Shaw in the night → taken by agents → the President").
   - **Where the Stands came from:** the Devil's Palm, a Stand Arrow, a corpse part, Valentine's gift, or awakened on the trail.
   - **How they really died:** every vague death's real cause ("dropped dead on the trail" → rejected by a corpse part; Love Train's redirected misfortune; a dark-hat killing and who did it).
   - **The finale's secrets:** the main ending, who the Corpse chose (and whether they secretly rode for Valentine), D4C and Valentine's death if they happened, the Corpse Holder's story (how they came by each part), and the President's count.
   - Then the final standings.

   **On each phone,** after the last reveal: "Your Steel Ball Run", the player's own story (how they finished, best stage, kills, spares and helps, their Stand and its source, the parts they held, Valentine, their final Worthiness word, the ending).

   The Fallen screen never names a masked killer ("by a rider in a dark hat"); the reveal does.
7. Final standings.

## Secret endings

Milestone 6d (`js/engine/secret-endings.js`). **None of this is ever hinted at in the game**; this section is the only place the rules are written down. They outrank every other ending.

**D4C (Dirty Deeds Done Dirt Cheap).** When the Final Stage's plans close, if Funny Valentine is alive and holds 3+ corpse parts, he brings one fallen racer back from another world to ride for him: a dead human PC if there is one, then a dead AI PC, then a dead canon racer.
- The stream: "Dirty Deeds Done Dirt Cheap. Kruel rides again… from another world."
- That player controls their other-world self for the Final Stage: same personality, a Legendary Stand from the pool, and a Valentine rider (agents ride past them, errands, the secret "Ride with him"). They're never asked to bring down the boss.
- They can't win the race: they don't place at the Finish Line and never stand on the podium.
- **If the President wins** (his ending), they stay in this world: they count as reaching New York and get the joiners' bonus. Otherwise they fade back into death when the race ends.
- The secrets reveal and their phone story say what happened.

**The Saint Walks Again.** One racer still racing holds all 9 parts at the final Finish Line. They win outright, whatever the points, with their own ending card. Not canon: our secret ending. Nearly impossible.

**The Requiem Arrow** (the rarest):
- **The recipe:** a Stand Arrow and 2 Rokakaka in Items at the same time, a Legendary Stand, and Worthiness 80+. Trading counts, so players can trade for the pieces.
- When all of it is true, a secret prompt appears in their next window: "Pierce your Stand". It consumes the Arrow and both Rokakaka. **The Arrow chooses** (milestone 7b): half the time it refuses. Everything is still used up, the phone says "The Arrow turns in your hand and will not pierce. It has judged you.", and nothing reaches the stream (the secrets reveal lists it). Otherwise it evolves their Stand into a Requiem: Gold Experience → Gold Experience Requiem, Silver Chariot → Silver Chariot Requiem, anything else → "[Stand] Requiem". This is the only place a banned Requiem Stand can appear (the cheat menu aside).
- A Requiem's user can't be killed ("whatever is done to you never arrives"). The host gets one anonymous line: "Somewhere on the trail, a Stand has become something else."
- **The Requiem ending:** reaching New York with it wins outright, with its own ending card. Breaking "no automatic wins" is intentional, because it should almost never happen.

**Priority:** Requiem > The Saint Walks Again > the President is dead > the President takes the Corpse > the Double-Cross > Holder of the Saint's Corpse > the Bloodbath > normal.

**Testing:** the cheat menu has "Set up Requiem" (an Arrow, 2 Rokakaka, a Legendary Stand and Worthiness 80) and "Trigger D4C" (pick a dead player; they return when Stage 9's plans close, or at once if those have closed).

## Settings, tech and later ideas

**Host settings:**

- Minimum riders (default 12)
- Fill with AI racers (up to the minimum or a chosen number)
- Which canon racers are in the race (a toggle each)
- Reveal speed: Slow, Normal, Fast
- Skip side stories automatically (default **on**)
- Background effects (default on)
- Sub event frequency: Low, Normal (about 2–3 per round), High (also on the race controls)
- NPC field size: 200, 350, 500 (default) or 750, set in the lobby (milestone 6a)
- Choice timer (default 30 seconds; 15–60, also on the race controls)

**Tech plan:**

- A static site on GitHub Pages (kruelniru), free, with no accounts needed to play.
- The host's browser runs the whole game; phones connect to it directly with the room code through PeerJS (version pinned).
- A free relay (TURN) server as a fallback for school Wi-Fi and carriers that block direct connections. The TURN slot is in `js/config.js`.
- Works in Safari on iPhone and Chrome on Android, with nothing to install.
- Game content (events, stages, canon racers, names, rules) lives in `data/`, apart from the engine. Events are templates with role and pronoun tokens.
- A seeded random generator, so games can be replayed, and a headless sim (`sim/simulate.js`) for balance.

**Open questions for milestone 6:**

- **Love Train** (settled in milestone 6b): the boss needs 3+ parts and Love Train 5+; in the sim there's a boss in about half of all games and Love Train in about one in twelve.

**The full game log** (after the game ends, never during it): the host gets **Export game log**, which downloads two files. (a) A readable, self-contained HTML page to share: every round in order with every line, the decisions everyone made (and whether they timed out), the Fallen and the Finish Lines; then, per stage, everything the stream didn't see, marked SECRET: Worthiness changes with numbers, Stands and their sources, corpse part movements, Valentine offers, joins, errands and deliveries, trades, the dead's votes, and every fight with its scores; then the ending. (b) The same as raw JSON (`js/engine/game-log.js` buildGameLog), with the seed and settings. Both carry the seed, the settings, the dates and whether cheats were used.

**The secret cheat menu** (testing): tap the connection status in the top right (host or phone) 7 times within 3 seconds; a digits-only PIN pad appears. The right PIN opens the menu; a wrong one closes the pad without a word. Nothing else hints at it. Only a SHA-256 hash of the PIN is stored (`CHEAT_PIN_HASH` in `js/config.js`), set by `node tools/set-cheat-pin.js`; an empty hash means it never opens. A phone's PIN is checked by the host, and its cheats apply to that player only; the host's menu picks any player. Cheats: Worthiness ±10 or set; join or leave Valentine; gain all 9 parts or lose them; give any Stand (Requiem included) or remove it; a Stand Arrow or a Rokakaka; lose your horse or get a Thoroughbred; skip to the start of Stage 9 (skipped rounds run instantly, unrevealed); kill or revive; force the next sub event (the Palm, Valentine's offer, Funny Valentine, a fight). Every use is recorded; a game with any cheat says **Cheats used** on the finale's first and last cards and in both export files.

**Debugging:** with `?debug=1`, the host prints every fight to the browser console with a `[fight]` prefix: both sides' base scores, rolls, the margin, both choices and the outcome.

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
67. Corpse parts (M5b) are items only their holder sees; every stream line about them is vague ("goes through their things"). One a stage; found 90% of rounds while loose, weighted by Worthiness; unclaimed at a Finish Line, they go to the President.
68. Every part that comes to a racer merges, except one they hide on them (no Stand, no rejection, agents notice it half as much; it can be held later). Rejection by Worthiness band (0 / 3 / 8 / 18 / 35%), two thirds of rejections deadly, rolled at the end of the next round so it never follows the line where the part changed hands. Vague Fallen causes; the real cause is kept for M6.
69. Fights gain "search them" (take a part if they carry one, −8) and "give up without a fight" (the attacker gets their choice; a kill counts as cruel). Giving up to agents never gets you killed. A killer takes the parts from the body (0).
70. A secret "A chance to steal" prompt (Night rounds): only the thief learns who holds a part.
71. Agents: 4% + 6% per part (3% hidden) per round for holders, 1.5% for PCs holding nothing, ×2 on Hunt a corpse part, half for canon and NPC holders, no fight bonus; never joiners. Tuned so the President ends with the most parts in about two thirds of games and more than every racer combined in about one in six (the first build gave him the bad ending in half of all games).
72. Funny Valentine: 77 before the roll (a Legendary user wins about 30%), +50 and pace for driving him off, takes every part on a win, can't die; never offered to joiners.
73. Valentine errands take two rounds (pick a target secretly, strike next round), so a PC target gets their own "Someone is coming for you" prompt. Masked on stream unless the joiner dies in it.
74. Joiner balance is judged against PCs still racing at the start of Stage 4 (limit 1.3×), because offers only reach them; against all PCs even the refusers score about 1.6×. Rewards restored in order to just under the limit: relay horses +1, ending bonus +50 (1.24×). Original rewards (+3, +100) were too strong on the same test. After the live tests, deliveries (decision 77) pushed joiners over, so the ending bonus went back to +30.
75. Love Train (5+ parts) never happens in the sim; an open question for M6.
76. Fight options say they're fights: "Attack: if you win, …" (A chance to strike, with "Don't attack: leave them be" first), "Fight: if you win, …" (rival showdowns), "Fight back: if you win, …" (defenders). `?debug=1` logs every fight's scores and rolls to the console.
77. A joiner who carries a merged part loses the agents' protection until they deliver it ("Deliver it to the President", secret, any window, merged parts only): +10 points a part. Each delivery moves a part from the racers to the President, so to keep his bad ending near 15–20%: loose parts are found 95% of rounds (was 80%) and agents fight at −8. AI joiners deliver 15% of windows. Joiners learn at the end whether they rode for the losing side (kept for M6).
78. Phone alerts for big private changes, shown with the round's private update and kept until dismissed: losing your horse (big, flashing, with the next town and a persistent ON FOOT banner), Stands, corpse parts, bad injuries, allies. A merging part shows "settling" on the Stand card.
79. Stand Arrow report: in the sim every piercing without a Stand gives a Stand or kills (457 from found Arrows, 477 kept ones). The one gap: two piercings in a round (a kept Arrow and a found one) wasted the second Arrow; it's now kept. The likely cause of "it gave nothing" was that the result reached the phone only as a quiet hint at the end of the reveal; the new Stand alert fixes that.
80. Hunting corpse parts: each hunter rolls 90% a stage (±0.2% per Worthiness point, +15% pity per dry hunting stage) for first claim on that stage's part; normal finds 80% a round, weighted 1 + Worthiness ÷ 100. Hunters find a part in about 37% of stages; when many hunt at once, supply is the limit (one part a stage). More parts in circulation is the next lever if that should be higher.
81. Stand Arrows 8–10 a game (was 6–8), and a human-controlled PC is twice as likely as an AI racer to find one.
82. Sub event fairness between living PCs: random sub events and agent ambushes lean toward whoever has had fewer prompts per round; prompts a player's own plan guarantees count half toward the round's number. Valentine-only prompts are excluded.
83. Dead players (M6a): one vote card a round (Hazard / Ambush / Blessing, the Blessing's target on the same card), open from a round's reveal until the next round starts, applied to that round; no votes, nothing happens; the game breaks ties. Only dead humans vote.
84. The dead's strengths: Hazard = 3 named racers −1 pace, one hurt, a few field riders die, no named deaths; Ambush = an NPC at +6 against a random PC or named NPC (a PC defends by ★); Blessing = heal, +2 pace, can't die that round. One anonymous line on stream.
85. NPC field size is a lobby setting (200 / 350 / 500 / 750), fixed once the race starts.
86. The boss (M6b): most parts going into the Final Stage, at least 3; ties by Worthiness, then points; +6 Final Stage placement. Only the boss is announced.
87. Love Train: no deadly event, Palm, Arrow or rejection can kill the holder; a killing blow in a fight lands on a random nearby racer.
88. "Bring them down": a combined fight, team = average fight skill + 6.5 per rider, against the boss + 19.5 (Love Train) or + 4.5. Equal riders: a Love Train holder loses to 2 / 3 / 4 about 35 / 51 / 65%; a 3–4-part boss 70 / 81 / 90%. Up to 4 living PCs asked a round, never joiners.
89. Funny Valentine can only die in the Final Stage: a first win there brings D4C's other Valentine and a group fight next round; a second win kills him (+80 each to that group, his parts stay loose). With Love Train he comes for the holder once; joiners may secretly ride with him (+5 each). Dies in about 8% of games.
90. One main ending per game, in priority: the President is dead > the President takes the Corpse > the Double-Cross > Holder of the Saint's Corpse (+50, +100 with Love Train) > the Bloodbath (3 or fewer named racers reach New York) > normal. A dead or retired boss gets no Corpse ending.
91. Johnny and Gyro get 40% of parts still loose at a Finish Line (if racing), so they hold some again without costing PC hunters.
92. Epilogue cards after the podium from `data/epilogues.js` (Saint Smiles, Devil's Champion, On Foot to Glory, Ride Together, canon champions in character).
93. The Bloodbath counts PCs only: fewer than 22% of the PCs who started reach New York (3 or fewer of 18).
94. Love Train as a real shot at winning: no "Hunt a corpse part" penalty once you carry 3+ parts, +30 Final Stage placement with Love Train, and +200 for a boss chosen with Love Train who reaches New York still holding 3+. A Love Train holder wins about 40% (+350 with +40 gave 54%).
95. Sim joiners keep parts more often when Ruthless or Opportunist (they deliver 5% of windows instead of 15%), so the Double-Cross happens.
96. The secrets reveal (M6c): Valentine's riders and the dark hats unmasked, Worthiness, each part's journey, Stand sources, the real causes of vague deaths, the finale's secrets; then final standings. Each phone gets its own story after the last reveal.
97. The Fallen screen shows "by a rider in a dark hat" for a masked errand kill (it used to name the joiner); the reveal unmasks it.
98. Survival retune: PC death odds 0.46 → 0.95 brings PCs reaching New York to about 38%; agents −8 → −2 keeps the President's ending near 15–20% (joiners keeping parts had lowered it).
99. Survival after the first live tests: about 48% of PCs reach New York (PC death odds 0.95 → 0.75). Stages 1–2 are safe for PCs except the Palm and the Arrow; later PC deaths lean toward Stages 6–9 (×0.2 in Stage 3 … ×1.9 in Stage 9), for events and fights alike.
100. The full game log: exported by the host only after the game ends, as a readable HTML page (secrets marked) and raw JSON, both with the seed, settings, dates and the cheat flag.
101. The secret cheat menu for testing: 7 quick taps on the connection status, then a PIN checked against a stored SHA-256 hash (set with tools/set-cheat-pin.js; the PIN is never in the repo). Every cheat is recorded and the game is marked "Cheats used" on the finale and in the exports.
102. Fight lines and every rendered name: punctuation inside a name ("Mike O.", "Hey Ya!") never starts a new sentence; fight notes render once.
103. Two living racers never share a Stand in normal play (a held Stand is out of the pool; checked every round in tests). The cheat takes a Stand from whoever holds it (NPCs included) and says so.
104. Secret endings (M6d): D4C, The Saint Walks Again, the Requiem Arrow (Worthiness 80+). Rules only in DESIGN.md → Secret endings; outrank every other ending.
105. A D4C rider can't win or place; if the President wins they stay in this world (joiners' bonus), otherwise they fade back into death.
106. Love Train bonus +200 → +250: with a D4C rider able to ride beside Valentine, Love Train holders fell to 31%; now about 37%.
107. D4C only when Valentine holds 3+ corpse parts as Stage 9's plans close (about 38% of games; the cheat can still force it). Love Train bonus +250 → +225 (with D4C rarer, holders won 42%; now about 39%).
108. Game night checks: a name ending in "." no longer gets a second period ("kills Mike O."). Text scans of 40 full games (8 people + 10 AI) found no doubled words, broken tokens, pronoun or capitalization errors, and no racer named in the story after they died. Host tests drive whole games with only AI, everyone dead, nobody answering, a phone dropping mid-window, and a host reload mid-round: none gets stuck.
109. Runners never get horse words about themselves (milestone 7a): Runner versions of "Your ally is in trouble" and Valentine's offer, the errand note goes "into your pack", "A chance to betray" and shared-pace lines need horses, saddlebags became packs. Tests: games full of Runners check every prompt, and every event a Runner can be the focus of is checked for the focus's own horse words.
110. Trades only offer what's possible: no horse to or from a Runner (or anyone without one), never the same thing back. A trade that falls through gives both players an alert, never the reason.
111. "Deemed worthy" and "fallen to the dark side" show at most once per round each.
112. Ranking ties (podium and standings): points, then more stage wins, then a better place in the Final Stage, then a PC over a canon racer or NPC. The podium card says "(tie broken by …)". Before this, ties kept list order by accident.
113. Plain events never blame a racer for a choice they didn't make ("The ice gives way under Kruel"); a content test checks every event that hurts its focus for "gambles", "decides", "too far" and the like. Choice wording stays in sub event outcomes, which follow a choice.
114. Kept Arrows and Rokakaka no longer vanish with the dead: a PC killer takes them (a Rokakaka only a human one); otherwise they drop and turn up in a later find (a Rokakaka still only for a human PC, in any stage). The secrets reveal and the game log say where they went.
115. End now is disabled for the first 3 seconds of a waiting screen, and asks "Some players are still deciding. End now? …" while any human prompt (secret ones included) is unanswered, never saying who or how many. No confirmation when every human has answered or only AI racers are left. Start Stage N never ends an open Stage Plan window early (it switches to the waiting screen), and the host has no keyboard shortcuts. The default choice timer is 30 seconds.
116. Worthiness retune (milestone 7b): starts Honorable 54, Cautious 58, Opportunist 55, Glory 49, Ruthless 47; help +5, save +7, spare +8 (+2 if you started it), Palm +3, kills −6 / −10; gains halved above 70, quartered above 85, and only great deeds count above 95 (giving away a part, saving a life, sparing a PC who attacked you). Hints at 6+ (soft 2–5). End averages: Honorable 77, Cautious 71, Glory 61, Opportunist 57, Ruthless 34; 0% of PCs end at 95+ (2% of Honorable).
117. Rokakaka: 4 per game, a fifth half the time, human PCs only; someone who hasn't found one is 3× likelier, a Stand holder 1.5×. The Arrow chooses: "Pierce your Stand" refuses half the time and still uses everything up. The Requiem is pierced in about 1 game in 205 (15% Runners) to 1 in 250 (60% Runners) with 5 people, 1 in 4,500 with 18.
118. Good-aligned drama on stream: a rescue (a real fight; a kill is defense, saving them is a great deed and +12), standing guard (night; riders come half the time), hard choices (your horse, half a day, or 15 points), all leaning ×7 Honorable / ×5.5 Cautious / ×3 Glory / ×1 Opportunist / ×0.25 Ruthless. With the Devil's Palm counted as drama, on-stream dramatic prompts are 68–80% of a non-Ruthless player's on-stream prompts and 91% of a Ruthless player's (who hunts rivals by choice).
119. No theft from a human without a choice: "Someone's in your camp" (chase them or let them go) for people; plain theft events only for AI racers and NPCs (role filter `notHuman`).
120. Repeat limits: the same sub event title at most twice per player per game and never twice in a row, unless nothing else fits; the Devil's Palm keeps its own schedule.
121. Agents: after beating or robbing a PC they leave them alone for the next 2 stages; a part they took can be chased the next round ("Ride after them", agents at −2 more; about 70% of chases win). Chases won about half a part a game back from the President, so ambush rates for holders went 4% + 6%/part → 8% + 12%/part: the President's ending stays at 14–15%, about 0.6 ambushes per human per game (Opportunists, who hunt parts, 1.6), 0.22 parts lost to agents per human holder.
122. After every fight or theft, each PC's phone says exactly what happened (who, and what they took or didn't), keeping a masked rider masked; a part loss explained there isn't repeated as "You lost a corpse part".
123. Arrows and Rokakaka ask before they're used ("Eat the Rokakaka? [Stand] will leave you for good."), say "You'll eat this when the round is revealed." while pending, alert "You ate the Rokakaka…" after the reveal, and the Stand card says "Your Stand is gone (you ate a Rokakaka)." until a new one arrives.
124. Runners vs Riders with 5 people and AI fill (4,500 games): at 15% Runners 159.4 vs 159.3 points, at 60% Runners 165.1 vs 164.1; Runners are not ahead.
