# CLAUDE.md

Durable notes for any Claude session working on this repo. For where things
stand right now, read **HANDOFF.md** first. For the game's rules, **DESIGN.md
is the source of truth** (its decision log at the bottom records every rule
change and why, numbered; it's at 134).

## What this is

A Jackbox-style party game based on JoJo Part 7: Steel Ball Run. The host
streams a browser tab (`host.html`); 12–24 players join on their phones
(`phone.html`) with a room code. Fully static: plain HTML/CSS/JS ES modules, no
build step, no dependencies, no backend. Hosted on GitHub Pages:
https://kruelniru.github.io/sbr-race/ (repo `kruelniru/sbr-race`, branch `main`,
public). The host's browser runs the whole engine; phones talk to it over
WebRTC via PeerJS (pinned in `js/config.js`).

## Layout

- `data/` all content and numbers, apart from the engine
  - `rules.js` every tunable number (Worthiness, fights, agents, Requiem, Acts, lineCap, president...)
  - `events/*.js` event templates (`index.js` collects them; `alts.js` alternative texts by event id; `president.js` Funny Valentine's scheduled scenes; `requiems.js` Requiem signature events; `m7d.js` the M7d batch)
  - `sub-events.js` choice prompts (sub events, fights, Valentine offer/pitches, President talks, Requiem Arrow)
  - `stands.js` Stand pool, canon Stands, Acts (`EVOLVED`), `REQUIEMS` (one per Stand), `BANNED`
  - `canon-racers.js`, `stages.js`, `personalities.js`, `epilogues.js`, `corpse.js`, names
- `js/engine/` pure engine (no DOM). `state.js` (state + `publicView` / `privateView` / `hostScreenView`), `race.js` (runRound, syncShown, alerts), `choices.js` (choice windows and all prompt resolution), `events.js` (event selection, lint, line cap), `fights.js`, `stands.js` (Acts), `secret-endings.js` (D4C, Saint, Requiem Arrow), `valentine.js`, `agents.js`, `corpse.js`, `endings.js`, `finale.js`, `secrets.js` (secrets reveal + phone story), `game-log.js`, `cheats.js`, `notify.js` (addHint/addAlert, no deps)
- `js/host/` host screen (`race-view.js` renders cards; `race-host.js` timers/flow), `js/phone/` phone UI, `js/net/` PeerJS, `js/ui/` shared DOM helpers + cheat UI
- `sim/simulate.js` headless balance sim; `sim/repeats.js` line-repeat report
- `tests/*.test.js` node:test suites (one per milestone plus core)
- `tools/serve.py` no-cache dev server; `tools/set-cheat-pin.js` sets the cheat PIN hash

## Commands

```bash
npm test                                   # all tests (Node 20+); must stay green
python tools/serve.py                      # http://localhost:8000/host.html (add ?debug=1), phone.html?room=CODE&slot=2
node sim/simulate.js --games 1500 --humans 5 --runners 0.15   # tuning
node sim/simulate.js --games 4500 ...                         # final numbers
node sim/simulate.js --set a.b=v,c.d=w                        # override rules.js values for a run
node sim/simulate.js --requiem-stage 5                        # force a Requiem at Stage 5 (tuning)
node sim/repeats.js --games 300 --humans 5                    # repeated lines per game
```

Render checks: build HTML from the real view functions with a tiny fake DOM in
Node, then screenshot with headless Edge
(`"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --screenshot=... --window-size=360,2000 file:///...`).
Phone width 360px, host 1280px. `renderCard` in race-view.js is exported for this.

## How the user wants work done

- **Milestone process, every time:** engine → short check-in with sim tables → UI → render tests → DESIGN.md (+ numbered decision log entries) → commit and push → test steps for the live site. **Then stop and wait for the user's go-ahead** before the next milestone.
- Sims: 1,500 games while tuning, 4,500 for reported numbers. Report targets next to results.
- **Report and propose, don't change** on: Requiem odds/power, Runner balance, anything the user flagged as "propose". The user decides.
- Don't pull game-length levers (real games take ~24 min at the 30s timer; that's fine).
- Read a full sample game yourself for text bugs when content changes.
- The user tests on the live site and replies with approvals plus precise change lists; follow them literally.
- Write plain, clear wording in-game. Characters in character, but in our own words (never copy manga lines). Don't recreate copyrighted text.

## Hard rules and gotchas

- **Secrets:** Worthiness, corpse parts, Valentine status, votes, items and Stands' sources appear only in `privateView`, never on the host or other phones. The Requiem recipe and the President's secrets are never hinted in-game; they're documented only in DESIGN.md → Secret endings.
- **Cheat PIN:** never put the PIN in the repo. Only its SHA-256 hash (`CHEAT_PIN_HASH` in `js/config.js`), set via `node tools/set-cheat-pin.js`. Tests use their own test-only hash. Don't ask the user for the PIN.
- The Metered TURN credentials in `js/config.js` are there at the user's request (public is OK).
- **Runners** (no horse) must never get horse words about themselves (saddle, stirrup, spurs, gallop, `{a.horse}`) in any event or alternative text unless the role has `hasHorse: true`. A test checks every template and alternative.
- **Plain events never blame a racer** for a choice they didn't make ("gambles", "decides", "misreads"); choice wording belongs in sub-event outcomes. A lint test checks.
- Every event that hurts another racer is tagged `sabotage` or `no-fault` (or `help`); every kill has exactly one of `kill-defense` / `kill-started` / `kill-cruel`. `lintEvents()` enforces it.
- Theft from a human PC always comes with a choice: plain theft events use `notHuman` on the victim role.
- Template grammar: after a name, verbs are singular; after a pronoun use `{a:s}`, `{a:es}`, `{a:is/are}`. `{a.they}/{a.them}/{a.their}/{a.themself}`, capitalized `{a.They}`.
- A named racer appears in at most one event per round (test invariant); lines added after the fact use `after: true`.
- **Line cap:** each event text is used at most `rules.lineCap` (3) times a game; add alternatives in `data/events/alts.js`.
- **Import cycles:** don't import `racers.js` from `stands.js`; use `notify.js`. Entering the module graph via `events.js` or `race.js` first fails (pre-existing); tests and the host enter via `state.js`.
- Host tests must call `rh.stop()` in `finally`, or timers make `npm test` hang.
- Many tests run whole seeded games; engine changes shift the random sequence and can break seed-dependent assertions. Fix the test to be robust (pick a case that fits, or force rules), not by special-casing the engine.
- Shell tips: Bash heredocs mangle backslashes and some quotes; write Python edit scripts to a scratch file with the Write tool and run them. A `cat > file` with no heredoc hangs.
- After pushing, GitHub Pages caches files ~10 minutes; wait before testing a game.
