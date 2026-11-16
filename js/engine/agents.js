// Valentine's agents and the President himself (milestone 5b, DESIGN.md →
// Valentine). Agents attack as events, not racers: they mainly hunt corpse
// holders, but sometimes anyone, so an ambush on stream proves nothing.
// Joiners are never ambushed.
//
// state.agents: [{ id, name, pronouns, skill, tier: 'agent', status, kills }]
// state.race.agentLog: [{ event: 'ambush' | 'died' | ..., ... }] for the sim.

import RULES from '../../data/rules.js';
import { AGENTS, VALENTINE } from '../../data/corpse.js';
import { carried } from './corpse.js';
import { resolveFight, npcDefend } from './fights.js';
import { keepNpc } from './field.js';
import { isJoiner, valentineProtected } from './valentine.js';
import { valentineBeaten } from './final-stage.js';

const A = () => RULES.agents;

export function initAgents(state) {
  state.agents = AGENTS.map((a) => ({ ...a, id: `agent-${a.id}`, tier: 'agent', status: 'racing', kills: 0 }));
}

export const livingAgents = (state) => (state.agents ?? []).filter((a) => a.status !== 'dead');

/** Chance this racer is ambushed this round (see rules.agents). */
export function ambushChance(state, r) {
  if (r.status !== 'racing' || !livingAgents(state).length) return 0;
  if (isJoiner(r) && valentineProtected(state, r)) return 0;
  const parts = carried(state, r);
  let p;
  if (!parts.length) p = r.tier === 'canon' ? A().canonNonHolder : r.tier === 'pc' ? A().nonHolder : 0;
  else p = A().perHolder + parts.reduce((t, it) => t + (it.hidden ? A().perHidden : A().perPart), 0);
  if (r.plan === 'corpse') p *= A().huntMult;
  if (r.tier !== 'pc') p *= A().othersMult;
  return p;
}

export function pickAgent(rng, state) {
  return rng.pick(livingAgents(state));
}

/** What an agent does if they win: search for a part, or kill. */
export function agentWin(rng, state, target) {
  const w = carried(state, target).length ? A().wins.holder : A().wins.none;
  return rng.weighted(Object.entries(w), ([, x]) => x)[0];
}

/** An ambush fight: the agent attacks, the racer defends (`defend`). */
export function resolveAmbush(ctx, agent, target, defend) {
  log(ctx, { event: 'ambush', tier: target.tier, holder: carried(ctx.state, target).length, plan: target.plan ?? null });
  return resolveFight(ctx, {
    kind: 'agents', attacker: agent, defender: target, win: agentWin(ctx.rng, ctx.state, target), defend,
    bonusA: A().bonus, cause: "killed by Valentine's agents",
  });
}

/**
 * Canon racers and named NPCs nobody controls: agents ambush them too
 * (resolved in the round, no prompt). Returns stream lines.
 */
export function otherAmbushes(ctx) {
  const lines = [];
  const f = ctx.state.field;
  const others = [...(ctx.state.canon ?? []), ...new Set([...f.packLeaders, ...f.kept])];
  for (const r of others) {
    if (r.status !== 'racing' || ctx.assigned.has(r.id)) continue;
    if (!ctx.rng.chance(ambushChance(ctx.state, r))) continue;
    const agent = pickAgent(ctx.rng, ctx.state);
    if (!agent) break;
    const f2 = resolveAmbush(ctx, agent, r, npcDefend(ctx.rng, r));
    const named = Object.values(f2.roles).filter((w) => w.tier === 'pc' || w.tier === 'canon');
    for (const w of Object.values(f2.roles)) if (w.tier === 'npc') keepNpc(ctx.state, w); else if (w.tier !== 'agent') ctx.assigned.add(w.id);
    lines.push({
      eventId: 'agent-ambush-auto', text: f2.text, ids: named.map((w) => w.id),
      names: named.map((w) => ({ name: w.name, tier: w.tier })),
      minor: false, death: f2.death, tags: ['fight'], side: !named.length && !(r.breakout),
    });
  }
  return lines;
}

/** Funny Valentine, for a fight. He can't be killed. */
export function valentineFighter() {
  return { ...VALENTINE, tier: 'agent', immortal: true, skill: RULES.funnyValentine.score, status: 'racing', kills: 0 };
}

/** Who may be offered "Face Funny Valentine": Rare+ Stand, Worthiness 60+, never a joiner, once. */
export function canFaceValentine(r, stageId) {
  const V = RULES.funnyValentine;
  return r.status === 'racing' && V.stages.includes(stageId) && !isJoiner(r) && !r.facedValentine
    && r.stand && V.tiers.includes(r.stand.tier) && (r.worthiness ?? 0) >= V.minWorthiness;
}

/** Face him: he attacks; driving him off is the win (+50 points, pace). */
export function resolveValentine(ctx, pc) {
  const V = RULES.funnyValentine;
  const fv = valentineFighter();
  const w = carried(ctx.state, pc).length ? V.wins.holder : V.wins.none;
  const choice = ctx.rng.weighted(Object.entries(w), ([, x]) => x)[0];
  const holder = carried(ctx.state, pc).length;
  const f = resolveFight(ctx, {
    kind: 'valentine', attacker: fv, defender: pc, win: choice, defend: 'fight-spare',
    open: '{y} stands {y.their} ground against Funny Valentine.', takeAll: true, noSpareCredit: true,
    reversalLine: ' {y} drives the President off!', cause: 'killed by Funny Valentine',
  });
  if (f.outcome === 'reversal-spare') {
    pc.points += V.winPoints; pc.pace += V.winPace;
    f.text += valentineBeaten(ctx, pc); // the Final Stage: D4C swaps in another Valentine
  }
  log(ctx, { event: 'valentine', outcome: f.outcome, tier: pc.stand?.tier, holder });
  return f;
}

export function log(ctx, entry) {
  (ctx.state.race.agentLog ??= []).push({ stage: ctx.stage?.id, ...entry });
}

