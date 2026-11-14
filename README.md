# SBR Race Simulator

A Jackbox-style party game based on JoJo Part 7: Steel Ball Run. The host streams
a browser tab, and 12–24 players join on their phones with a room code.
**[DESIGN.md](DESIGN.md) is the source of truth** for game rules.

Fully static: plain HTML/CSS/JS ES modules, no build step, no backend.
Phones talk to the host browser over WebRTC (PeerJS, pinned in `js/config.js`).

## Run it locally

Any static server works. Python is the simplest:

```bash
python -m http.server 8000 --bind 0.0.0.0
```

(Or `npm run serve`, which uses `npx http-server`.)

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
js/host/             host-main.js (screen), lobby.js (sessions, joins), persist.js, debug.js
js/phone/            phone-main.js, character-form.js, image.js, wake-lock.js, feed.js
js/ui/dom.js         small DOM helpers
data/                game content (personalities, pronouns, AI racer names; events, Stands, racers later)
tests/               node --test
```

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
