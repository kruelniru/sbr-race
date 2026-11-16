// Dead players (milestone 6a, DESIGN.md → Dead players). Pure engine code.
//
// Dead human players vote each round: Hazard, Ambush or Blessing (and, with
// Blessing, which living PC gets it), all on one card. The vote opens when a
// round's reveal starts (the end of runRound) and closes when the next round
// starts; it applies to that round. No votes: nothing happens. AI racers who
// die don't vote. Nobody ever sees who voted what.
//
// state.race.deadVote = { forRound, votes: { playerId: { category, targetId? } } } | null
// state.race.deadLog: [{ round, stage, category, voters, target?, ... }] for the sim.
//
//   Hazard:   a stage hazard hits 3 random racing named racers (−1 pace each,
//             one injured) and kills a few riders from the field. No named racer dies.
//   Ambush:   one rider "with the dead's fury" (+6) attacks a random PC or named
//             NPC in a normal fight; a PC defends by their ★ choice.
//   Blessing: the chosen PC is healed, +2 pace, and protected this round
//             (nothing can kill them: see `blessed`).

import RULES from '../../data/rules.js';
import { FIGHT_DEFEND } from '../../data/sub-events.js';
import { readyPlayers } from './state.js';
import { namedRacers } from './racers.js';
import { castNpc, keepNpc } from './field.js';
import { resolveFight, npcWin, npcDefend } from './fights.js';
import { render } from './text.js';
import { displayRoles } from './events.js';
import { isLoveTrain } from './final-stage.js';

export const DEAD_CATEGORIES = ['hazard', 'ambush', 'blessing'];
const D = () => RULES.dead;

// Stage hazards (DESIGN.md's list), by stage.
const HAZARDS = {
  1: ['a stampede', 'a flash flood'],
  2: ['a sandstorm', 'a wildfire'],
  3: ['a blizzard', 'a tornado'],
  4: ['a stampede', 'a tornado'],
  5: ['acid rain', 'a wildfire'],
  6: ['a blizzard', 'a flash flood'],
  7: ['acid rain', 'a tornado'],
  8: ['a flash flood', 'acid rain'],
  9: ['acid rain', 'a wildfire'],
};

/** Dead human players (the voters). */
export const deadVoters = (state) => readyPlayers(state).filter((p) => p.status === 'dead' && !p.isAI);

/** Living PCs a Blessing can go to. */
export const blessTargets = (state) => readyPlayers(state).filter((p) => p.status === 'racing').map((p) => ({ id: p.id, name: p.name }));

/**
 * Can't die right now, except from a risk they chose (the Palm, an Arrow):
 * a PC in the safe stages (rules.pcSafeStages), a Blessing, or Love Train.
 */
export function deathProof(ctx, who) {
  if (who?.tier === 'pc' && RULES.pcSafeStages.includes(ctx?.stage?.id)) return true;
  return blessed(ctx, who);
}

/** Is this racer protected by a Blessing right now? */
export function blessed(ctx, who) {
  if (ctx?.state && isLoveTrain(ctx.state, who)) return true; // Love Train (milestone 6b): misfortune slides off
  return who?.blessedRound != null && who.blessedRound === ctx?.state?.race?.roundNo;
}

/** End of runRound: open the vote for the next round (if anyone is dead and the race goes on). */
export function openDeadVote(state) {
  const race = state.race;
  race.deadVote = !race.over && deadVoters(state).length ? { forRound: race.roundNo + 1, votes: {} } : null;
}

/** A dead player's phone votes (untrusted input). Voting again replaces the vote. */
export function castDeadVote(state, playerId, { category, targetId = null } = {}) {
  const v = state.race?.deadVote;
  const p = deadVoters(state).find((x) => x.id === playerId);
  if (!v || !p) return { ok: false, error: 'There is no vote right now.' };
  if (!DEAD_CATEGORIES.includes(category)) return { ok: false, error: 'no such choice' };
  if (category === 'blessing' && !blessTargets(state).some((t) => t.id === targetId)) return { ok: false, error: 'Pick who gets the blessing.' };
  v.votes[playerId] = { category, targetId: category === 'blessing' ? targetId : null };
  return { ok: true };
}

/** What a dead player's phone may see: the open vote and their own pick. */
export function deadVoteView(state, playerId) {
  const v = state.race?.deadVote;
  if (!v || !deadVoters(state).some((x) => x.id === playerId)) return null;
  const mine = v.votes[playerId] ?? null;
  return { forRound: v.forRound, mine, targets: blessTargets(state) };
}

/** Majority, ties broken by the game. */
function tally(rng, keys) {
  const n = {};
  for (const k of keys) n[k] = (n[k] ?? 0) + 1;
  const max = Math.max(0, ...Object.values(n));
  const top = Object.keys(n).filter((k) => n[k] === max);
  return top.length ? rng.pick(top) : null;
}

/**
 * Start of runRound: apply the vote meant for this round (if any). Returns
 * Main Story lines (anonymous: "The dead stir…").
 */
export function resolveDeadVote(ctx) {
  const race = ctx.state.race;
  const v = race.deadVote;
  race.deadVote = null;
  if (!v || v.forRound !== race.roundNo) return [];
  const votes = Object.values(v.votes);
  if (!votes.length) return [];
  const category = tally(ctx.rng, votes.map((x) => x.category));
  const log = { round: race.roundNo, stage: ctx.stage.id, category, voters: votes.length, votes: Object.entries(v.votes).map(([voter, x]) => ({ voter, category: x.category, target: x.targetId })) };
  let lines = [];
  if (category === 'blessing') {
    const living = new Set(blessTargets(ctx.state).map((t) => t.id));
    const picks = votes.filter((x) => x.category === 'blessing' && living.has(x.targetId)).map((x) => x.targetId);
    const id = tally(ctx.rng, picks) ?? ctx.rng.pick([...living]);
    const p = readyPlayers(ctx.state).find((x) => x.id === id);
    if (p) { lines = bless(ctx, p); log.target = p.id; }
  } else if (category === 'hazard') {
    lines = hazard(ctx, log);
  } else {
    lines = ambush(ctx, log);
  }
  (race.deadLog ??= []).push(log);
  return lines.map((l) => ({ ...l, dead: true }));
}

function line(ctx, eventId, text, roles, extra = {}) {
  const named = Object.values(roles).filter((w) => w.tier === 'pc' || w.tier === 'canon');
  for (const w of Object.values(roles)) if (w.tier === 'npc') keepNpc(ctx.state, w); else if (w.tier !== 'agent') ctx.assigned.add(w.id);
  ctx.eventCounts[eventId] = (ctx.eventCounts[eventId] ?? 0) + 1;
  return { eventId, text, ids: named.map((w) => w.id), names: named.map((w) => ({ name: w.name, tier: w.tier })), minor: false, death: false, tags: ['dead'], side: false, ...extra };
}

function bless(ctx, p) {
  p.injured = false;
  p.pace += D().blessing.pace;
  p.blessedRound = ctx.state.race.roundNo;
  (p.hints ??= []).push({ text: 'The dead have chosen you. For a while, nothing can touch you.', stage: ctx.stage.id, round: ctx.roundLabel });
  return [line(ctx, 'dead-blessing', render('The dead have chosen a blessing for {a}.', displayRoles({ a: p })), { a: p })];
}

function hazard(ctx, log) {
  const H = D().hazard;
  const what = ctx.rng.pick(HAZARDS[ctx.stage.id] ?? HAZARDS[1]);
  const pool = ctx.rng.shuffle(namedRacers(ctx.state).filter((r) => r.status === 'racing'));
  const hit = pool.slice(0, H.victims);
  for (const r of hit) r.pace += H.pace;
  const hurt = hit[0];
  if (hurt) hurt.injured = true;
  // A few riders from the field don't make it.
  const f = ctx.state.field;
  const tracked = f.packLeaders.filter((x) => x.status === 'racing').length + f.kept.filter((x) => x.status === 'racing' && !x.packLeader).length;
  const n = Math.min(Math.max(0, f.racing - tracked), ctx.rng.int(H.npcDeaths[0], H.npcDeaths[1]));
  f.racing -= n; f.dead += n; ctx.tally.died += n;
  log.hazard = what; log.hit = hit.length;
  const roles = Object.fromEntries(hit.map((r, i) => [`r${i}`, r]));
  const names = hit.map((r) => r.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? 'the riders';
  const text = `The dead stir. ${what.charAt(0).toUpperCase() + what.slice(1)} sweeps the trail. ${list} lose time${hurt ? `, and ${hurt.name} is hurt` : ''}.`;
  return [line(ctx, 'dead-hazard', text, roles)];
}

function ambush(ctx, log) {
  const f = ctx.state.field;
  const npcs = [...new Set([...f.packLeaders, ...f.kept])].filter((n) => n.name && n.status === 'racing' && (n.packLeader || n.breakout));
  const pool = [...readyPlayers(ctx.state).filter((p) => p.status === 'racing'), ...npcs];
  const y = ctx.rng.pick(pool);
  const x = castNpc(ctx);
  if (!y || !x) return [];
  ctx.usedNpcs.add(x.id);
  const defend = y.tier === 'pc' ? starOption(FIGHT_DEFEND, y.personality) : npcDefend(ctx.rng, y);
  const res = resolveFight(ctx, {
    kind: 'dead', attacker: x, defender: y, win: npcWin(ctx.rng, x, y), defend, bonusA: D().ambush.bonus,
    open: 'The dead stir. {x} rides out of the dust at {y}, eyes empty.', cause: 'sent by the dead',
  });
  log.target = y.id; log.targetTier = y.tier; log.outcome = res.outcome; log.death = res.death;
  return [line(ctx, 'dead-ambush', res.text, res.roles, { death: res.death })];
}

/** The ★ pick for a personality (same as choices.js, kept local to avoid a cycle). */
function starOption(options, personality) {
  let best = options[0];
  for (const o of options) if ((o.lean?.[personality] ?? 1) > (best.lean?.[personality] ?? 1)) best = o;
  return best.id;
}

