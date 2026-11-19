// Repeat report (milestone 7d): how often the same event line comes back in one game.
//   node sim/repeats.js --games 300 --humans 5 [--top 25]
// A "line" is an event template (eventId plus its variant); names don't matter.
import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]]] : a), []));
const GAMES = Number(args.games ?? 300);
const HUMANS = Number(args.humans ?? 5);
const PLAYERS = Number(args.players ?? 18);
const TOP = Number(args.top ?? 20);

const perGame = {}; // key -> [count per game]
let over3 = 0, maxSeen = 0, lines = 0;
for (let g = 0; g < GAMES; g++) {
  const seed = 'rep-' + g;
  const state = createGameState(seed);
  const rng = new Rng(seed + ':roster');
  const taken = new Set();
  for (let i = 0; i < PLAYERS; i++) {
    const p = addPlayer(state, { isAI: i >= HUMANS });
    p.connected = true;
    const c = makeAiCharacter(rng, taken);
    taken.add(c.name.toLowerCase());
    applyCharacter(p, c);
  }
  startRace(state);
  const counts = {};
  while (!state.race.over) {
    const res = runRound(state);
    for (const e of res.events) {
      if (!e.eventId || e.note) continue;
      const key = e.eventId + (e.variant != null ? `#${e.variant}` : '');
      counts[key] = (counts[key] ?? 0) + 1;
      lines++;
    }
  }
  for (const [k, n] of Object.entries(counts)) {
    (perGame[k] ??= []).push(n);
    if (n > 3) over3++;
    maxSeen = Math.max(maxSeen, n);
  }
}
const rows = Object.entries(perGame).map(([k, a]) => [k, a.reduce((x, y) => x + y, 0) / GAMES, Math.max(...a), a.filter((n) => n > 3).length]);
rows.sort((a, b) => b[1] - a[1]);
console.log(`${GAMES} games · ${HUMANS} people of ${PLAYERS} · ${(lines / GAMES).toFixed(0)} lines a game`);
console.log(`a line used 4+ times in one game: ${over3} times (${(over3 / GAMES).toFixed(2)} a game) · the most any line was used in one game: ${maxSeen}`);
console.log('most repeated lines (uses per game, most in one game, games with 4+):');
for (const [k, avg, max, g4] of rows.slice(0, TOP)) console.log(`  ${k.padEnd(34)} ${avg.toFixed(2).padStart(5)}  max ${String(max).padStart(2)}  4+ in ${g4}`);
