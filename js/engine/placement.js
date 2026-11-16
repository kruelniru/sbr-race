// Finish Line: rank everyone still racing and hand out points.
//
//   score = skill + pace * paceWeight
//           - injuredPenalty (if injured this stage)
//           - onFootPenalty  (Rider whose horse died)
//           + runner terrain modifiers (Runners only)
//           + luck (canon trait)
//           + Stage Plan placement modifier (data/plans.js)
//           + Stand tier modifier (rules.standTier)
//           + noise (normal, sd = noiseSd)
// Contenders: named racers still racing + the field's pack leaders.

import RULES from '../../data/rules.js';
import { namedRacers } from './racers.js';
import { npcName, keepNpc } from './field.js';
import { planOf } from './plans.js';
import { standMods } from './stands.js';
import { horseMod } from './horses.js';
import { ridesDouble } from './alliances.js';
import { bossPlacement } from './final-stage.js';
import { carried } from './corpse.js';

export function runnerTerrainBonus(stage) {
  let bonus = RULES.runner.base ?? 0;
  for (const tag of stage.terrain) bonus += RULES.runner.terrain[tag] ?? 0;
  return bonus;
}

export function placementScore(racer, stage, rng, state = null) {
  const P = RULES.placement;
  let score = racer.tier === 'npc' ? RULES.packLeaderSkill : racer.skill;
  score += racer.pace * P.paceWeight;
  if (racer.injured) score -= P.injuredPenalty;
  if (racer.mount === 'horse' && racer.onFoot) score -= P.onFootPenalty;
  if (racer.mount === 'runner') score += runnerTerrainBonus(stage);
  score += racer.luck ?? 0;
  // Stage Plan. Optionally, hunting costs nothing once you carry 3+ parts (rules.finale.holderNoHuntPenalty).
  const plan = planOf(racer);
  if (!(plan?.id === 'corpse' && RULES.finale.holderNoHuntPenalty && state && carried(state, racer).length >= RULES.finale.bossMin)) score += plan?.placement ?? 0;
  // Stand tier (rules.standTier). Canon racers' own Stands are already in their skill.
  if (racer.stand && !['canon', 'awaken'].includes(racer.stand.source)) score += standMods(racer).placement;
  // Horse quality (milestone 5); on foot with an ally on a horse, you ride double.
  score += horseMod(racer);
  if (racer.mount === 'horse' && racer.onFoot && state && ridesDouble(state, racer)) score += P.onFootPenalty * (1 - RULES.horses.doubleRide);
  // Valentine's relay horses (milestone 5b; a joiner's reward, secret).
  if (racer.valentine?.joined) score += RULES.valentine.relay;
  // The boss in the Final Stage (milestone 6b).
  if (state) score += bossPlacement(state, racer);
  return score + rng.normal(0, P.noiseSd);
}

/** Returns placements [{ rank, id, name, tier, points, unnamed }] and updates racers. */
export function placeStage(state, rng, stage) {
  const named = namedRacers(state).filter((r) => r.status === 'racing');
  const pack = state.field.packLeaders.filter((n) => n.status === 'racing');
  const scored = [...named, ...pack]
    .map((r) => ({ r, score: placementScore(r, stage, rng, state) }))
    .sort((a, b) => b.score - a.score);

  const placements = scored.map(({ r }, i) => {
    const rank = i + 1;
    const pts = RULES.points[i] ?? 0;
    r.points += pts;
    if (r.tier !== 'npc') r.placements.push({ stage: stage.id, rank });
    // A pack leader who places top 10 earns a name and joins the kept NPCs.
    if (r.tier === 'npc' && !r.name && rank <= 10) {
      r.name = npcName(state, rng, r.pronouns);
      keepNpc(state, r);
    }
    return { rank, id: r.id, name: r.name, tier: r.tier, points: pts, unnamed: !r.name };
  });

  // Reset per-stage modifiers.
  for (const r of [...namedRacers(state), ...state.field.packLeaders, ...state.field.kept]) {
    if (r.injured && r.tier === 'pc') r.hurtThisStage = true; // the phone alert still sees it
    r.pace = 0;
    r.injured = false;
  }
  return placements;
}

/** Overall standings by points (named racers and named NPCs who scored). */
export function standings(state) {
  const npcs = [...state.field.packLeaders, ...state.field.kept].filter((n) => n.name && n.points > 0);
  const unique = [...new Map([...namedRacers(state), ...npcs].map((r) => [r.id, r])).values()];
  return unique
    .sort((a, b) => b.points - a.points)
    .map((r) => ({ id: r.id, name: r.name, tier: r.tier, points: r.points, status: r.status }));
}
