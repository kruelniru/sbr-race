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
  reveal.js          round result -> host cards with timings (shared with the sim)
js/host/             host-main.js, lobby.js, race-host.js (reveal controller), race-view.js, persist.js, debug.js
js/phone/            phone-main.js, character-form.js, image.js, wake-lock.js, feed.js
js/ui/dom.js         small DOM helpers
data/                game content, separate from the engine
  rules.js           every tunable number (points, placement, death odds, pacing...)
  stages.js          the 9 stages: rounds, terrain, NPC attrition
  canon-racers.js    the 15 canon racers (each a host toggle)
  events/            event templates; see data/events/README.md
  horse-names.js, npc-names.js, ai-names.js, personalities.js, pronouns.js
sim/simulate.js      headless balance simulator
tests/               node --test
```

## The race (milestone 2)

- Each stage alternates Day and Night rounds, and the last round is the Finish Line.
  Every alive PC gets one main event per round. Canon racers get one in about
  50% of rounds and retired racers in about 25%; both always appear when another
  event casts them.
- Small `minor` events go on one "Meanwhile on the trail..." card, along with the
  NPC field report. The Fallen show after Night rounds and Finish Lines.
- Placements at each Finish Line rank named racers plus 6 "pack leader" NPCs.
  A pack leader gets a name when it places top 10.
- Riders have a named horse. If it dies, they continue on foot (−40). Runners never
  have a horse: rough terrain helps them, open flats hurt them.
- The host auto-advances cards and stops at stage results. Phones get each line
  in the mini feed as it's revealed, and their own status after the round.

## Balance sim

```bash
node sim/simulate.js --games 500                 # 18 PCs by default
node sim/simulate.js --games 500 --runners 0.3   # 30% Runners
node sim/simulate.js --seed demo --verbose       # read one full game
```

The sim prints deaths and retirements per stage by tier, who reaches New York,
winners by tier, Riders vs Runners, kills, game length (reveal time plus
projected choice time) and event usage. It ends with sanity checks. Tune the
numbers in `data/rules.js`, `data/stages.js` and the event weights.
`sim/sample-game.txt` is one full game.

### Privacy rule

The host browser holds all state. The network and UI code only send or render
the output of `publicView`, `privateView(state, playerId)` or `hostScreenView`
in `js/engine/state.js`. Secrets (Worthiness, corpse parts, unrevealed Stands,
Valentine allegiance) must only ever appear in `privateView`.

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
