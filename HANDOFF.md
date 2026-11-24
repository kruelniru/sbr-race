# HANDOFF

Where the project stands as of the end of the previous Claude session
(November 2026). Read CLAUDE.md for how to work here and DESIGN.md for the rules.

## Status

- `main` is clean and pushed. Last feature commit: **5f1e20d, Milestone 7d**. All **125 tests pass** (`npm test`), also from a fresh clone.
- Milestones done and pushed: M5b, M6a–d (dead players, finale, secrets reveal, secret endings), survival/game log/cheat menu, M7a (game-night fixes), **M7b**, **M7c**, **M7d**.
- **We are waiting on the user's go-ahead after M7d.** They have the M7d test steps (below). Don't start new work until they reply; when they do, follow their change list literally.

## What M7b–M7d added (most recent work)

- **M7b:** Worthiness retune and diminishing gains; "the Arrow chooses"; Rokakaka 4–5 a game; good-aligned on-stream drama (rescue, stand guard, hard choices); "Someone's in your camp" theft prompt (no theft from a human without a choice); repeat limits for sub events; agents' 2-stage cooldown and "Ride after them"; fight/theft phone alerts; item confirmations.
- **M7c:** starting Worthiness back in personality-card order (Honorable 60 … Ruthless 42; ends tuned with gain sizes); Stand Acts (Echoes 1→2→3, Tusk via Johnny's schedule or after his death; triggers fight 18%, near-death 20%, Worthiness gain 8+ 10%, Finish Line 8%); a Requiem form + signature event for all 42 obtainable Stands; the **Requiem Arrow** (combine an Arrow + 2 Rokakaka; only human PCs pierce; success by Worthiness 15%→70%); a Requiem is the strongest power but **no longer an ending** (epilogue card + its own secrets-reveal card).
- **M7d (latest):** 3–4 new events per stage, 2 new canon moments per canon racer (4 for Hot Pants), events for every Stand that had none; 4–5 alternatives for the 20 most repeated lines and a **cap of 3 uses per line per game**; **Funny Valentine on stream** (2–3 scheduled scenes per stage band: patron → something's off → villain, early vs late look and badge); 4 rotating Valentine pitches + the President in person in Stage 6; joiners' secret **"A word with the President"** talks (2–3, with small effects).

## Decisions the user made recently (don't revisit)

- No points bonus for a Requiem: a late Requiem winning ~38% and an early one up to ~75% is the intended curve.
- Leave the President's ending at 13–14%.
- Requiem odds: report, don't change (the sim overstates crafting because sim players know the recipe).

## M7d test steps the user has (for reference)

1. Through Stage 3: the President appears 2–3 times as a cheerful patron with the round badge.
2. Stages 4–6: odd scenes (dark hats, a vanishing, two cities at once); from Stage 7: lean and cold, hexagon badge.
3. A second Valentine offer in one game uses a different pitch.
4. Cheat menu "Force next sub event: Valentine offer" in Stage 6: "The President" offers in person.
5. Join him: about 2 rounds later, "A word with the President" (three choices); his reply arrives as a phone alert after the reveal; nothing on stream.
6. No event sentence more than three times in one game.
7. After the race, the phone story and exported game log list the talks.

## Open items and ideas (not started)

- **Proposed, not built:** "A chance to betray" can still take a sleeping human ally's horse without the victim choosing. Proposal: give the victim a "Your ally is slipping away with your horse: stop them / let them go" prompt like the camp thief.
- **Idea for later (in DESIGN.md "Ideas for later"):** a super-rare ending for a Requiem holder who also holds 5–6 corpse parts (Love Train + Requiem merging, the Corpse choosing a protector, or Requiem vs D4C). To be designed with the user.
- Known minor: the plain event `s2-water-thief` can make a human PC the thief without a choice (the victim is always AI/NPC). Pre-existing; not flagged by the user.
- Known pre-existing: importing `js/engine/events.js` or `race.js` as the first module throws a DEATH_HOOKS init error (import cycle); everything enters via `state.js`, so it never shows. Fix only if it bites.
- Things that still repeat 4+ times a game are fight lines (text varies by fight) and the anonymous "deemed worthy" announcements; the user hasn't asked to change them.

## Next steps

1. Wait for the user's reply to M7d. If they approve and name a next milestone, plan it with them first (they like a short plan, then the usual process).
2. Whatever comes next: engine → sim check-in → UI → render checks → DESIGN.md + decisions 135+ → push → test steps → wait.
