import { createGameState, addPlayer, applyCharacter } from '../js/engine/state.js';
import { Rng } from '../js/engine/rng.js';
import { makeAiCharacter } from '../js/engine/roster.js';
import { startRace, runRound } from '../js/engine/race.js';
const c = {}; const G = 200;
for (let g = 0; g < G; g++) {
  const seed = 'p-' + g; const state = createGameState(seed); const rng = new Rng(seed + ':r'); const taken = new Set();
  for (let i = 0; i < 18; i++) { const p = addPlayer(state, { isAI: true }); const ch = makeAiCharacter(rng, taken); taken.add(ch.name.toLowerCase()); applyCharacter(p, ch); }
  startRace(state); while (!state.race.over) runRound(state);
  for (const e of state.corpse.log) if (e.event === 'president') { const k = e.how + ':' + e.fromTier; c[k] = (c[k] ?? 0) + 1; }
  for (const f of state.race.fightLog) if (f.kind === 'agents') { const k = 'amb:' + f.d.tier + ':' + (f.defend) + ':' + f.outcome; if (f.outcome==='part') c[k] = (c[k] ?? 0) + 1; }
}
console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,n])=>k+' '+(n/G).toFixed(2)).join('\n'));
