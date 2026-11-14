// Choices: Stage Plans and sub events (DESIGN.md → Choices). Pure engine
// code: no DOM, no network, no clocks. The host owns the timer; the sim
// answers instantly.
//
// A choice window lives in state.race.choice while it's open:
//
//   { kind: 'plan' | 'sub', stageId, roundNo, closed, notes: [line],
//     prompts: [prompt] }
//
//   prompt = {
//     id, playerId, kind: 'plan' | 'sub' | 'rival-hunter' | 'rival-target',
//     secret,                 // true: never named on the host waiting screen
//     title, text,            // already rendered
//     options: [{ id, label, hint, needsTarget? }],
//     targets?: [{ id, name, tier }],  // Hunt a rival picks one of these
//     star,                   // the "★ In character" option id
//     answer: null | { optionId, targetId?, by: 'player' | 'ai' | 'auto', ms? },
//     // engine-only (never sent to phones):
//     subId?, roles?: { a: id, b: id }, rivalKey?
//   }
//
// Flow for one round (the host and the sim both do this):
//   needsStagePlans(state) ? openStagePlans → (answers) → closeChoices
//   openSubEvents → (answers) → closeChoices
//   runRound(state)          // resolves the closed sub-event window first
//
// AI racers answer the moment a window opens, by personality. Anyone still
// unanswered at close (timer ran out, disconnected) gets the ★ option.

import RULES from '../../data/rules.js';
import { SUB_EVENTS, RIVAL } from '../../data/sub-events.js';
import { EFFECTS } from './effects.js';
import { render } from './text.js';
import { Rng } from './rng.js';
import { readyPlayers } from './state.js';
import { namedRacers, addWorthiness } from './racers.js';
import { castNpc, keepNpc } from './field.js';
import { normalizeEvent, whenFits, roleFits, castRoles, deathWeight } from './events.js';
import { getPlan, planOf, plansFor } from './plans.js';
import STAGES from '../../data/stages.js';

export const SUBS = SUB_EVENTS.map((s) => ({ ...normalizeEvent({ ...s, when: s.when ?? {}, effects: {} }), options: s.options, secret: !!s.secret }));

// ------------------------------------------------------------ personality picks

/** The option this personality would pick ("★ In character"). */
export function starOption(options, personality) {
  let best = options[0];
  for (const o of options) if ((o.lean?.[personality] ?? 1) > (best.lean?.[personality] ?? 1)) best = o;
  return best;
}

/** AI racers: usually the ★ option, sometimes another by personality weight. */
function aiOption(rng, options, personality) {
  const star = starOption(options, personality);
  if (options.length < 2 || rng.chance(RULES.choices.aiInCharacter)) return star;
  return rng.weighted(options.filter((o) => o !== star), (o) => o.lean?.[personality] ?? 1) ?? star;
}

// ------------------------------------------------------------ helpers

const racingPcs = (state) => readyPlayers(state).filter((p) => p.status === 'racing');

/** Any racer by id: PCs, canon, and tracked NPCs. */
export function findAnyRacer(state, id) {
  return namedRacers(state).find((r) => r.id === id)
    ?? state.field?.packLeaders.find((n) => n.id === id)
    ?? state.field?.kept.find((n) => n.id === id)
    ?? null;
}

/** Hunt a rival targets: racing named racers (PCs, canon, named NPCs), never yourself. */
export function rivalTargets(state, self) {
  const f = state.field;
  const npcs = [...f.packLeaders, ...f.kept].filter((n) => n.name && n.status === 'racing' && (n.packLeader || n.breakout));
  return [...namedRacers(state), ...new Set(npcs)]
    .filter((r) => r.status === 'racing' && r.id !== self.id)
    .map((r) => ({ id: r.id, name: r.name, tier: r.tier }));
}

function display(roles) {
  const d = {};
  for (const [k, who] of Object.entries(roles)) {
    d[k] = { name: who.name ?? 'a rider from the pack', pronouns: who.pronouns, horse: who.horse ?? who.lostHorse };
  }
  return d;
}

function currentStage(state) {
  return STAGES[state.race.stageIdx];
}

function roundType(state) {
  return state.race.plan[state.race.stageIdx].types[state.race.roundIdx];
}

/** Store an AI answer, or leave it for the player. */
function autoAnswerIfAi(rng, state, prompt, options, personality) {
  const p = readyPlayers(state).find((x) => x.id === prompt.playerId);
  if (!p?.isAI) return;
  const o = aiOption(rng, options, personality);
  prompt.answer = { optionId: o.id, by: 'ai' };
  if (o.needsTarget) prompt.answer.targetId = pickTarget(rng, prompt.targets);
}

/** AI / timed-out target pick for Hunt a rival: leaders are likelier. */
function pickTarget(rng, targets, state) {
  return rng.weighted(targets, (t) => 50 + (t.points ?? 0))?.id ?? null;
}

// ------------------------------------------------------------ Stage Plans

export function needsStagePlans(state) {
  const race = state.race;
  return !!race && !race.over && race.roundIdx === 0 && race.plansFor !== currentStage(state).id && !race.choice;
}

export function openStagePlans(state) {
  const rng = Rng.fromState(state.rngState);
  const stage = currentStage(state);
  const plans = plansFor(stage);
  const prompts = [];
  for (const p of racingPcs(state)) {
    const targets = rivalTargets(state, p).map((t) => ({ ...t, points: findAnyRacer(state, t.id)?.points ?? 0 }));
    const options = plans.filter((pl) => !pl.needsTarget || targets.length);
    const prompt = {
      id: `plan-${stage.id}-${p.id}`,
      playerId: p.id,
      kind: 'plan',
      secret: false,
      title: `Stage ${stage.id} plan`,
      text: `${stage.name}: ${stage.from} → ${stage.to}. How will you ride it?`,
      options: options.map((pl) => ({ id: pl.id, label: pl.label, hint: `${pl.upside}. ${pl.downside}.`, needsTarget: !!pl.needsTarget })),
      targets: targets.map(({ id, name, tier, points }) => ({ id, name, tier, points })),
      star: starOption(options, p.personality).id,
      answer: null,
    };
    autoAnswerIfAi(rng, state, prompt, options.map((pl) => ({ ...pl })), p.personality);
    prompts.push(prompt);
  }
  state.race.choice = { kind: 'plan', stageId: stage.id, roundNo: state.race.roundNo + 1, closed: false, prompts, notes: [] };
  state.rngState = rng.getState();
  return state.race.choice;
}

function applyStagePlans(state, choice, rng) {
  for (const prompt of choice.prompts) {
    const p = readyPlayers(state).find((x) => x.id === prompt.playerId);
    if (!p || p.status !== 'racing') continue;
    const { optionId, targetId } = prompt.answer;
    p.plan = optionId;
    p.rival = null;
    if (getPlan(optionId)?.needsTarget && targetId) p.rival = { targetId, done: false };
  }
  // Everyone else (canon, retired PCs) rides with no plan this stage.
  for (const r of namedRacers(state)) if (!choice.prompts.some((x) => x.playerId === r.id)) { r.plan = null; r.rival = null; }
  state.race.plansFor = choice.stageId;
}

// ------------------------------------------------------------ sub events

/** Open this round's sub-event window: rival showdowns, then random sub events. */
export function openSubEvents(state) {
  const rng = Rng.fromState(state.rngState);
  const race = state.race;
  const stage = currentStage(state);
  const type = roundType(state);
  const types = race.plan[race.stageIdx].types;
  const roundsLeft = types.length - race.roundIdx;
  const roundNo = race.roundNo + 1;
  const ctx = { state, rng, stage, type, assigned: new Set(), usedNpcs: new Set() };
  const prompts = [];
  const notes = [];
  const busy = new Set(); // racers already in a prompt this round

  // 1. Hunt a rival: the showdown fires once per stage, at most one per target per round.
  for (const hunter of rng.shuffle(racingPcs(state).filter((p) => p.rival && !p.rival.done))) {
    const target = findAnyRacer(state, hunter.rival.targetId);
    if (!target || target.status !== 'racing') {
      hunter.rival.done = true;
      notes.push(noteLine(RIVAL.lines.gone, { a: hunter }));
      continue;
    }
    if (busy.has(hunter.id)) continue;
    const fire = roundsLeft <= 1 || rng.chance(1 / roundsLeft);
    if (!fire) continue;
    if (busy.has(target.id)) {
      if (roundsLeft <= 1) {
        hunter.rival.done = true;
        notes.push(noteLine(RIVAL.lines.missed, { a: hunter, b: target }));
      }
      continue;
    }
    hunter.rival.done = true;
    busy.add(hunter.id).add(target.id);
    const key = `rival-${roundNo}-${hunter.id}`;
    const roles = { a: hunter, b: target };
    prompts.push(rivalPrompt(rng, state, key, 'rival-hunter', hunter, render(RIVAL.hunterText, display(roles)), RIVAL.hunter, roles));
    if (target.tier === 'pc') {
      prompts.push(rivalPrompt(rng, state, key, 'rival-target', target, render(RIVAL.targetText, display(roles)), RIVAL.target, roles));
    }
  }

  // 2. Random sub events by the host's frequency setting; at least one PC per round.
  const eligible = racingPcs(state).filter((p) => !busy.has(p.id));
  // Rival showdowns count toward the round's target.
  const showdowns = new Set(prompts.map((x) => x.rivalKey)).size;
  const expected = Math.max(0, (RULES.choices.subEventsPerRound[state.settings.subEventFreq ?? 'normal'] ?? 2.5) - showdowns);
  const chosen = eligible.filter((p) =>
    rng.chance(Math.min(RULES.choices.maxChancePerPc, (expected / Math.max(1, eligible.length)) * (planOf(p)?.subEventMult ?? 1))));
  const anyPcPrompt = () => chosen.length || prompts.some((x) => readyPlayers(state).some((p) => p.id === x.playerId));
  if (!anyPcPrompt() && eligible.length) {
    // Prefer a connected human who didn't just have one.
    const pick = rng.weighted(eligible, (p) =>
      (p.isAI ? 1 : p.connected ? 4 : 0.5) * (p.lastSubRound === roundNo - 1 ? RULES.choices.recentPenalty : 1));
    if (pick) chosen.push(pick);
  }
  for (const p of chosen) {
    const prompt = subPrompt(ctx, p, roundNo, busy);
    if (!prompt) continue;
    p.lastSubRound = roundNo;
    prompts.push(prompt);
  }

  race.choice = { kind: 'sub', stageId: stage.id, roundNo, closed: false, prompts, notes };
  state.rngState = rng.getState();
  return race.choice;
}

function rivalPrompt(rng, state, key, kind, who, text, options, roles) {
  const prompt = {
    id: `${key}-${kind === 'rival-hunter' ? 'h' : 't'}`,
    playerId: who.id,
    kind,
    secret: false,
    title: RIVAL.title,
    text,
    options: options.map(({ id, label, hint }) => ({ id, label, hint })),
    star: starOption(options, who.personality).id,
    answer: null,
    rivalKey: key,
    roles: { a: roles.a.id, b: roles.b.id },
  };
  autoAnswerIfAi(rng, state, prompt, options, who.personality);
  return prompt;
}

function subPrompt(ctx, pc, roundNo, busy) {
  const { rng } = ctx;
  for (const id of busy) ctx.assigned.add(id);
  let candidates = SUBS.filter((s) => whenFits(s, ctx) && roleFits(ctx, s, s.focusKey, pc));
  for (let tries = 0; tries < 8 && candidates.length; tries++) {
    const s = rng.weighted(candidates, (x) => x.weight);
    const roles = castRoles(ctx, s, pc);
    if (!roles) { candidates = candidates.filter((c) => c !== s); continue; }
    for (const who of Object.values(roles)) {
      if (who.tier === 'npc') keepNpc(ctx.state, who);
      else busy.add(who.id);
    }
    const prompt = {
      id: `sub-${roundNo}-${pc.id}`,
      playerId: pc.id,
      kind: 'sub',
      secret: s.secret,
      title: s.title,
      text: render(s.text, display(roles)),
      options: s.options.map(({ id, label, hint }) => ({ id, label, hint })),
      star: starOption(s.options, pc.personality).id,
      answer: null,
      subId: s.id,
      roles: Object.fromEntries(Object.entries(roles).map(([k, w]) => [k, w.id])),
    };
    autoAnswerIfAi(rng, ctx.state, prompt, s.options, pc.personality);
    return prompt;
  }
  return null;
}

function noteLine(template, roles) {
  const ids = Object.values(roles).filter((w) => w.tier !== 'npc').map((w) => w.id);
  return {
    eventId: 'rival-note', text: render(template, display(roles)), ids, note: true,
    names: Object.values(roles).filter((w) => w.tier !== 'npc').map((w) => ({ name: w.name, tier: w.tier })),
    minor: false, death: false, tags: [], side: false,
  };
}

// ------------------------------------------------------------ answering + closing

/**
 * A phone's answer (untrusted input). Answers can change until the window closes.
 * Returns { ok } or { ok: false, error }.
 */
export function answerPrompt(state, playerId, { promptId, optionId, targetId } = {}, ms = null) {
  const choice = state.race?.choice;
  if (!choice || choice.closed) return { ok: false, error: 'closed' };
  const prompt = choice.prompts.find((x) => x.id === promptId && x.playerId === playerId);
  if (!prompt) return { ok: false, error: 'no such prompt' };
  const option = prompt.options.find((o) => o.id === optionId);
  if (!option) return { ok: false, error: 'no such option' };
  const answer = { optionId, by: 'player', ms };
  if (option.needsTarget) {
    if (!prompt.targets.some((t) => t.id === targetId)) return { ok: false, error: 'pick a rival' };
    answer.targetId = targetId;
  }
  prompt.answer = answer;
  return { ok: true };
}

/** Prompts still waiting on a person (not AI, not answered). */
export function unanswered(choice) {
  return choice ? choice.prompts.filter((x) => !x.answer) : [];
}

/** Close the window: anyone unanswered gets their ★ option. */
export function closeChoices(state) {
  const choice = state.race.choice;
  if (!choice || choice.closed) return choice;
  const rng = Rng.fromState(state.rngState);
  for (const prompt of choice.prompts) {
    if (prompt.answer) continue;
    const option = prompt.options.find((o) => o.id === prompt.star) ?? prompt.options[0];
    prompt.answer = { optionId: option.id, by: 'auto' };
    if (option.needsTarget) prompt.answer.targetId = pickTarget(rng, prompt.targets);
  }
  choice.closed = true;
  if (choice.kind === 'plan') {
    applyStagePlans(state, choice, rng);
    state.race.choice = null;
  }
  state.rngState = rng.getState();
  return choice;
}

/** Sim/tests: run the whole choice flow for the next round with instant answers. */
export function prepareRound(state) {
  if (needsStagePlans(state)) { openStagePlans(state); closeChoices(state); }
  if (!state.race.choice) openSubEvents(state);
  closeChoices(state);
  return state.race.choice;
}

// ------------------------------------------------------------ resolving (inside runRound)

/** Resolve the closed sub-event window. Returns lines for the Main Story. */
export function resolveSubEvents(ctx, choice) {
  const lines = [...choice.notes];
  const done = new Set();
  for (const prompt of ctx.rng.shuffle([...choice.prompts])) {
    if (prompt.rivalKey) {
      if (done.has(prompt.rivalKey)) continue;
      done.add(prompt.rivalKey);
      const pair = choice.prompts.filter((x) => x.rivalKey === prompt.rivalKey);
      const line = resolveRival(ctx, pair);
      if (line) lines.push(line);
    } else {
      const line = resolveSub(ctx, prompt);
      if (line) lines.push(line);
    }
  }
  return lines;
}

function rolesFor(ctx, prompt) {
  const roles = {};
  for (const [k, id] of Object.entries(prompt.roles)) {
    const who = findAnyRacer(ctx.state, id);
    if (!who || who.status === 'dead') return null;
    roles[k] = who;
  }
  return roles;
}

function outcomeFits(ctx, outcome, roles) {
  for (const [k, effs] of Object.entries(outcome.effects)) {
    for (const [key, value] of Object.entries(effs)) {
      if (!EFFECTS[key].fits(ctx, roles[k], value)) return false;
    }
  }
  return true;
}

function outcomeWeight(outcome, roles) {
  let w = outcome.weight;
  for (const [k, effs] of Object.entries(outcome.effects)) {
    if (effs.dies) w *= deathWeight(roles[k]);
    if (effs.horse) w *= planOf(roles[k])?.horseMult ?? 1;
  }
  return w;
}

function applyEffects(ctx, effects, roles) {
  for (const [k, effs] of Object.entries(effects)) {
    for (const [key, value] of Object.entries(effs)) EFFECTS[key].apply(ctx, roles[k], value, roles, effs);
  }
}

function lineFor(ctx, eventId, text, roles, { death = false, tags = [] } = {}) {
  const ids = [];
  for (const who of Object.values(roles)) {
    if (who.tier === 'npc') keepNpc(ctx.state, who);
    else { ctx.assigned.add(who.id); ids.push(who.id); }
  }
  ctx.eventCounts[eventId] = (ctx.eventCounts[eventId] ?? 0) + 1;
  return {
    eventId, text, ids, choice: true,
    names: Object.values(roles).filter((w) => w.tier !== 'npc').map((w) => ({ name: w.name, tier: w.tier })),
    minor: false, death, tags, side: false,
  };
}

function resolveSub(ctx, prompt) {
  const sub = SUBS.find((s) => s.id === prompt.subId);
  const roles = sub && rolesFor(ctx, prompt);
  if (!roles || roles.a.status !== 'racing') return null;
  const option = sub.options.find((o) => o.id === prompt.answer.optionId) ?? sub.options[0];
  const outcomes = option.outcomes.filter((o) => outcomeFits(ctx, o, roles));
  const outcome = ctx.rng.weighted(outcomes, (o) => outcomeWeight(o, roles));
  if (!outcome) return null;
  const text = render(outcome.text, display(roles));
  applyEffects(ctx, outcome.effects, roles);
  if (option.tags?.includes('help')) addWorthiness(roles.a, RULES.worthiness.help);
  const death = Object.values(outcome.effects).some((e) => e.dies);
  const line = lineFor(ctx, `${sub.id}:${option.id}`, text, roles, { death, tags: option.tags ?? [] });
  // Quiet results ("waits out the storm") go to the Meanwhile card, but only
  // for AI racers and timed-out players: a person's own choice always lands
  // in the Main Story, so they see it on stream.
  if (outcome.minor && !death && prompt.answer.by !== 'player') Object.assign(line, { minor: true, side: true });
  return line;
}

/** Hunt a rival showdown: a contest between hunter (a) and target (b). */
function resolveRival(ctx, pair) {
  const hp = pair.find((x) => x.kind === 'rival-hunter');
  const roles = rolesFor(ctx, hp);
  if (!roles || roles.a.status !== 'racing') return null;
  const { a, b } = roles;
  if (b.status !== 'racing') return lineFor(ctx, 'rival-gone', render(RIVAL.lines.gone, display({ a })), { a });
  const tp = pair.find((x) => x.kind === 'rival-target');
  const hOpt = RIVAL.hunter.find((o) => o.id === hp.answer.optionId) ?? RIVAL.hunter[0];
  // Canon and NPC targets choose by personality (NPCs always race).
  const tOpt = tp
    ? RIVAL.target.find((o) => o.id === tp.answer.optionId) ?? RIVAL.target[0]
    : b.tier === 'npc' ? RIVAL.target[0] : starOption(RIVAL.target, b.personality);
  const d = display(roles);
  let text;
  if (tOpt.id === 'refuse') {
    text = render(RIVAL.lines.refused, d);
    a.pace += 1;
  } else {
    const score = (r, o) => (r.tier === 'npc' ? RULES.packLeaderSkill : r.skill) + r.pace * 3 + o.bonus + ctx.rng.normal(0, RIVAL.contestSd);
    const hunterWins = score(a, hOpt) >= score(b, tOpt);
    const [winner, loser] = hunterWins ? [a, b] : [b, a];
    text = render(hunterWins ? RIVAL.lines.win : RIVAL.lines.lose, d);
    applyEffects(ctx, { w: { points: RIVAL.win.points, pace: RIVAL.win.pace }, l: { pace: RIVAL.lose.pace } }, { w: winner, l: loser });
  }
  for (const [who, o] of [[a, hOpt], [b, tOpt]]) {
    if (o.risk && ctx.rng.chance(o.risk)) {
      who.injured = true;
      text += render(RIVAL.lines.hurt, { x: d[who === a ? 'a' : 'b'] });
    }
  }
  return lineFor(ctx, 'rival-showdown', text, roles, { tags: ['sprint'] });
}
