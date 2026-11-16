# SBR Race Simulator

A Jackbox-style party game based on JoJo Part 7: Steel Ball Run. The host streams
a browser tab, and 12–24 players join on their phones with a room code.
**[DESIGN.md](DESIGN.md) is the source of truth** for game rules.

Fully static: plain HTML/CSS/JS ES modules, no build step, no backend.
Phones talk to the host browser over WebRTC (PeerJS, pinned in `js/config.js`).

## Run it locally

Use the included no-cache server, so the browser always loads your latest edits:

```bash
python tools/serve.py
```

It serves on port 8000 and all network interfaces. Any static server works,
but plain `python -m http.server` lets the browser cache old JS modules, and
you'll get confusing errors after edits.

**After pushing to GitHub Pages**, wait about 10 minutes before running a game.
Pages caches files for 10 minutes, and a phone that mixes old and new files can break.

- **Host:** open <http://localhost:8000/host.html> on the computer you stream from.
  Add `?debug=1` for the debug bar (fill the lobby with bots, see the seed).
- **Phones in other tabs:** <http://localhost:8000/phone.html?room=CODE&slot=2>.
  Tabs in one browser share storage, so give each tab its own `slot`
  (any short word or number), or they'll all be the same player.
- **Your real phone, on the same Wi-Fi:** find your PC's address with `ipconfig`
  (the IPv4 address, e.g. `192.168.1.23`) and open `http://192.168.1.23:8000/phone.html`.
  If it can't load, allow Python through Windows Firewall for private networks.

Notes for LAN testing:
- The Screen Wake Lock API needs HTTPS, so on `http://192.168.x.x` the phone uses
  the fallback and may show the "turn up Auto-Lock" tip. On GitHub Pages it uses the real API.
- The room-code handshake goes through PeerJS's free public signaling server,
  so the host and phones need internet access even on the same Wi-Fi.

Run the engine tests with `npm test` (Node 20+).

## Lobby features

- **AI racers:** "Fill with AI racers" fills empty slots up to the minimum, or
  up to the "Fill to" number. They are ordinary PCs that the game controls, with
  random names, pronouns and personalities, and they choose by personality.
  They're tagged AI on the host and the phones. Remove one with its ×, or use
  "Remove all AI". If the room is full, a real player joining takes the newest
  AI racer's place.
- **Minimum riders:** a host setting in the lobby (default 12). Start stays
  disabled until it's met.
- **Closing a room** ("Close room") tells every phone it closed. Phones forget
  that room and go back to code entry.
- **Phone reconnects:** a reload or app switch rejoins automatically, and so does
  a host reload of the same room. While a phone can't reach its room it shows a
  "Leave and join a different room" button. After 2 minutes of failing it goes
  back to code entry with a "Try again" button. A `?room=CODE` link always beats
  a saved session for another room.

## Before a real group game

Add TURN credentials (Metered or Cloudflare) in the marked **TURN SLOT** in
[js/config.js](js/config.js). Without them, players on school Wi-Fi or some
mobile carriers may not be able to connect.

## Layout

```
index.html, host.html, phone.html
css/                 base.css (shared theme), host.css, phone.css
js/config.js         ICE/TURN servers, PeerJS version, limits
js/net/              protocol.js (message types), host-net.js, phone-net.js, peer-loader.js
js/engine/           pure game logic, no DOM (Node can import it)
  rng.js             seeded RNG: all game randomness goes through it
  text.js            event template tokens + pronouns (see header comment)
  state.js           game state + publicView / privateView / hostScreenView
  roster.js          AI racer characters
  race.js            the round loop: startRace, runRound, syncShown
  events.js          picking, casting and resolving events (+ content linter)
  effects.js         what events can do (dies, retires, pace, horse...); add handlers here
  racers.js          PCs and canon racers share one racer shape
  field.js           the NPC field, pack leaders, named NPCs, field reports
  placement.js       Finish Line scores, points, standings
  choices.js         Stage Plans, sub events, Hunt a rival, Palm/Arrow/Rokakaka prompts, items in use
  stands.js          Stand odds, the pool, giving/removing Stands, canon locks
  palm.js            the Devil's Palm outcomes, private hints
  items.js           the item inventory (owner field)
  fights.js          every fight: score, both sides' choices, outcomes, kill tags (M5)
  horses.js          horse quality, losing/taking/buying horses, the trader (M5)
  alliances.js       one ally at a time, canon fit, ride double, breaking up (M5)
  trades.js          secret trade offers, answered in the next window (M5)
  corpse.js          the Saint's Corpse: parts, finds, merging, rejection, the President (M5b)
  agents.js          Valentine's agents' ambushes and Funny Valentine (M5b)
  valentine.js       the secret Valentine offer, its rewards and errands (M5b)
  dead.js            dead players' vote: Hazard, Ambush, Blessing (M6a)
  final-stage.js     the boss, Love Train, Bring them down, Funny Valentine's last stand (M6b)
  endings.js         the main ending and epilogues (M6b)
  secrets.js         the secrets reveal and each player's story (M6c)
  game-log.js        the full game log (exported after the game)
  cheats.js          the secret cheat menu (testing; PIN hash only)
  secret-endings.js  D4C, The Saint Walks Again, the Requiem Arrow (M6d; see DESIGN.md)
  finale-sections.js extra finale cards (Stands awakened)
  plans.js           Stage Plan lookups
  reveal.js          round result -> host cards + text-based timing (shared with the sim)
  finale.js          podium, awards, memorial, and the registry for later finale sections
js/host/             host-main.js, lobby.js, race-host.js (reveal, Back, skipping), race-view.js, backdrop.js, persist.js, debug.js
js/phone/            phone-main.js, secrets.js (Worthiness bar, Stand, Items, hints), trade.js (horse trader, trade offers), character-form.js, image.js, wake-lock.js, feed.js
js/ui/dom.js         small DOM helpers
data/                game content, separate from the engine
  rules.js           every tunable number (points, placement, death odds, choices, pacing...)
  plans.js           Stage Plans
  sub-events.js      sub events, Hunt a rival, the Palm, Arrows, Rokakaka
  stands.js          the Stand pool, banned list, canon Stands
  stages.js          the 9 stages: rounds, terrain, NPC attrition
  canon-racers.js    the 15 canon racers (each a host toggle)
  corpse.js          corpse part names, Valentine's agents, announcement lines (M5b)
  epilogues.js       epilogue cards after the podium, canon champions (M6b)
  events/            event templates; see data/events/README.md
  horse-names.js, npc-names.js, ai-names.js, personalities.js, pronouns.js
sim/simulate.js      headless balance simulator
tests/               node --test
```

## The race

- Each stage alternates Day and Night rounds, and the last round is the Finish Line.
  Every alive PC gets one main event per round. Canon racers get one in about
  40% of rounds and retired racers in about 25%; both always appear when another
  event casts them.
- Placements at each Finish Line rank named racers plus 6 "pack leader" NPCs.
  A pack leader gets a name when it places top 10.
- Riders have a named horse. If it dies, they continue on foot (−40). Runners never
  have a horse: rough terrain helps them, open flats hurt them.

### What the host shows each round
1. **Main Story**: every event with a PC, canon racer or breakout NPC who's still racing.
2. **Side Stories**: retired racers and NPC-only lines, then "Meanwhile on the
   trail..." (up to 4 short lines; the rest go to phones only) with the NPC field
   report. They're **skipped automatically by default** (they still reach the
   phones). Turn the "Skip side stories" setting off for long game nights, or
   use the **Skip side stories** button when it's off.
3. **The Fallen** (after Night rounds and Finish Lines), then **stage results**
   and **standings**. These always show.

### Choices (milestone 3)
- **Stage Plans** open on phones when a stage's results card appears (Stage 1:
  right after Start). Players choose while the results and standings are up;
  "Start Stage N" waits only for any time left.
- **Sub events** open before each round: the host shows "Sub event! X has a
  decision to make…" with a ✓ per answer and a countdown, while phones show
  the choice with "★ In character" on the personality's pick.
- A window closes when its timer runs out, when every connected player has
  answered, or on **End now**. Unanswered players get their ★ option.
  **Pause timer** freezes the countdown on every phone.
- Settings: **Sub events** (Low / Normal / High) and **Timer** (15–60 s), in the
  lobby and on the race controls.
- **Export choice times** (debug bar with `?debug=1`, and at the end of every
  game) downloads a JSON log of every window. Replay it in the sim:
  `node sim/simulate.js --choice-times sbr-choice-times-ABCD.json`.
- Content: `data/plans.js` (Stage Plans) and `data/sub-events.js` (sub events,
  Hunt a rival). Engine: `js/engine/choices.js`.

### Stands (milestone 4)
- Each phone shows its owner's **Worthiness** bar (no number), **Stand** (name,
  tier, what it does), **Items** (kept Stand Arrows and Rokakaka, usable while
  any decision is open) and private hints ("Only you know"). None of it
  reaches the host or another phone.
- The Devil's Palm (Stages 2–3), Stand Arrows (secret) and Rokakaka (secret,
  human PCs only) are sub events. Content: `data/stands.js` (the pool, banned
  list, canon Stands), `data/events/stands.js`, `data/events/palm.js`,
  `data/sub-events.js`. Numbers: `rules.js` (`worthiness`, `standOdds`,
  `standTier`, `palm`, `arrows`, `rokakaka`).
- The finale adds a **Stands awakened** card after the awards.

### Fights, horses, alliances, trading (milestone 5a)
- One fight system (`js/engine/fights.js`) for Hunt a rival, "Attacked on the
  trail", "A chance to strike" and PC vs PC: both sides commit first ("If you
  win: kill / let them go / take their horse"; fight back to kill / fight back
  and let them go / flee). Numbers: `rules.js` → `fights`, `standTier`.
- Horses have a quality (Nag / Sound / Fine / Thoroughbred). In Stages 5, 6, 8
  and 9 the Stage Plan card has a **Horse trader**. Numbers: `rules.js` → `horses`.
- **Ally up** (Stage Plan) and alliance sub events; `rules.js` → `alliances`.
- **Trading:** "Offer" buttons on Items and the horse row send a secret offer;
  the receiver answers in their next decision.

**Host controls:** ◂ Back (view-only: steps through earlier cards and earlier
rounds, changes nothing), Pause/Auto, Next, Back to live, Skip side stories.
While a choice window is open, the same slots hold Pause timer and End now.
Rooms start paused (click Next); turn on Auto to advance by itself. Each
control has a fixed slot, so buttons never move when one appears.
**Speed** (Slow / Normal / Fast) scales how long each card stays up, based on
how many words are on it (`rules.js` → `timing`). **Effects** toggles the
stage-themed backgrounds (one canvas, off under reduced motion; night rounds
use a darker palette).

Phones get each line in the mini feed as it's revealed, including skipped side
stories, and their own status after the round.

### The finale
After the last Finish Line: 3rd place, 2nd place, a dramatic pause, the
winner, then awards (Most Kills, Most Merciful, Best Runner, Biggest Comeback),
the racers who reached New York, a memorial for the Fallen, and the final
standings.

Later milestones add sections, such as the **secrets reveal** (Valentine,
Worthiness, corpse parts). Use `registerFinaleSection()` in
`js/engine/finale.js` and a renderer in `FINALE_RENDERERS` in
`js/host/race-view.js`. Sections with `order` ≥ 100 come after the memorial,
as the last big moment.

## Balance sim

```bash
node sim/simulate.js --games 500                 # 18 PCs by default
node sim/simulate.js --games 500 --runners 0.3   # 30% Runners
node sim/simulate.js --seed demo --verbose       # read one full game
node sim/simulate.js --plans random              # Stage Plan balance (also: star, push, pace, rival, laylow)
node sim/simulate.js --freq low --humans 12      # sub event frequency; how many PCs are people (only people find Rokakaka)
node sim/simulate.js --choice-times log.json     # use real answer times exported from a game
```

The sim prints deaths and retirements per stage by tier, who reaches New York,
winners by tier, Riders vs Runners, kills, game length (reveal time plus
choice windows, counting only Stage Plan time beyond the results cards),
results per Stage Plan and per personality, and event usage. It ends with sanity checks. Tune the
numbers in `data/rules.js`, `data/stages.js` and the event weights.
`sim/sample-game.txt` is one full game.

### Privacy rule

The host browser holds all state. The network and UI code only send or render
the output of `publicView`, `privateView(state, playerId)` or `hostScreenView`
in `js/engine/state.js`. Secrets (Worthiness, corpse parts, unrevealed Stands,
Valentine allegiance) must only ever appear in `privateView`. Worthiness is
tracked from milestone 3 and is in no view at all yet. The host's choice
waiting screen renders only `choiceWaitingView` (who is deciding, never what
they picked, never secret prompts).

### Message protocol

Connections use PeerJS `binary` serialization, which chunks big messages. Don't
switch to `json`: PeerJS caps JSON messages at about 16 KB, and a profile picture
is bigger than that.

Every message is `{ t: type, ...payload }`; all the types are listed in
[js/net/protocol.js](js/net/protocol.js). A phone sends `hello { v, token? }` first. A known
token reattaches the same character (reloads, app switches, even after the lobby
locks). The phone stores the token in localStorage per room code. The host saves
the whole game in localStorage too, so reloading the host tab offers
"Resume room" and reclaims the same code.

### Event templates

```
"{racer} spots {other} by the trail. {racer.They} {racer:is/are} out of water."
```

`{role}` is a name, `{role.they|them|their|theirs|themself}` is a pronoun
(capitalize it to capitalize the word), and `{role:singular/plural}` is verb
agreement (`{role:s}` and `{role:es}` are shorthands). See `js/engine/text.js`.

## Cheat PIN (testing)

Run `node tools/set-cheat-pin.js` and type a PIN (4–12 digits) twice. Only its hash is written to `js/config.js`; commit and push that file.
