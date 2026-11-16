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
import { SUB_EVENTS, RIVAL, PALM, ARROW, ROKAKAKA, ATTACKED, STRIKE, FIGHT_WIN, FIGHT_DEFEND, HORSE_TWO, ALLY_INVITE, TRADE,
  FOUND_PART, STEAL_PART, AMBUSH, FUNNY_VALENTINE, VALENTINE_OFFER, ERRAND, ERRAND_TARGET } from '../../data/sub-events.js';
import { EFFECTS } from './effects.js';
import { render } from './text.js';
import { Rng } from './rng.js';
import { readyPlayers } from './state.js';
import { namedRacers, addWorthiness, killRacer, retireRacer } from './racers.js';
import { castNpc, keepNpc } from './field.js';
import { normalizeEvent, whenFits, roleFits, castRoles, deathWeight, displayRoles } from './events.js';
import { awakenStand, removeStand } from './stands.js';
import { rollPalm, palmExit, palmLost, logPalm, addHint } from './palm.js';
import { addItem, itemsOf, removeItem, canUse } from './items.js';
import { getPlan, planOf, plansFor } from './plans.js';
import STAGES from '../../data/stages.js';
import { resolveFight, npcWin, npcDefend, LINES as FIGHT_LINES } from './fights.js';
import { hasHorse, townStage, shopOffers, buyHorse, aiBuys } from './horses.js';
import { allyOf, formAlliance, canonAccepts, log as logAlly } from './alliances.js';
import { pendingFor, tradePromptText, tradeLeans, resolveTrade } from './trades.js';
import { looseParts, pickFinder, markFinding, resolveFind, resolveOtherFind, carried, takePart, holdHidden } from './corpse.js';
import { ambushChance, pickAgent, resolveAmbush, otherAmbushes, canFaceValentine, resolveValentine, log as logAgents } from './agents.js';
import { isJoiner, dueOffers, joinValentine, refuseValentine, deliver, log as logValentine } from './valentine.js';
import { PART_HINTS } from '../../data/corpse.js';
import { blessed } from './dead.js';

export const SUBS = [...SUB_EVENTS, PALM, ATTACKED, STRIKE].map((s) => ({ ...normalizeEvent({ ...s, when: s.when ?? {}, effects: {} }), options: s.options, secret: !!s.secret, special: s.special, fightKind: s.fightKind, leanTag: s.leanTag, targetText: s.targetText }));
const PALM_SUB = SUBS.find((s) => s.id === PALM.id);

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
    ?? state.agents?.find((a) => a.id === id)
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

const display = displayRoles;

function currentStage(state) {
  return STAGES[state.race.stageIdx];
}

function roundType(state) {
  return state.race.plan[state.race.stageIdx].types[state.race.roundIdx];
}

/** Store an AI answer, or leave it for the player. */
function autoAnswerIfAi(rng, state, prompt, options, personality) {
  prompt.leans = Object.fromEntries(options.map((o) => [o.id, o.lean ?? {}])); // engine-only
  const p = readyPlayers(state).find((x) => x.id === prompt.playerId);
  if (!p?.isAI) return;
  answerLikeAi(rng, prompt, personality);
}

/** Answer a prompt the way an AI racer with this personality would. */
export function answerLikeAi(rng, prompt, personality, by = 'ai') {
  const options = prompt.options.map((o) => ({ ...o, lean: prompt.leans?.[o.id] ?? {} }));
  const o = aiOption(rng, options, personality);
  prompt.answer = { optionId: o.id, by };
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
    const options = plans.filter((pl) => (!pl.needsTarget || targets.length) && !(pl.id === 'ally' && allyOf(state, p)));
    const prompt = {
      id: `plan-${stage.id}-${p.id}`,
      playerId: p.id,
      kind: 'plan',
      secret: false,
      title: `Stage ${stage.id} plan`,
      text: `${stage.name}: ${stage.from} → ${stage.to}. How will you ride it?`,
      options: options.map((pl) => ({
        id: pl.id, label: pl.label, needsTarget: !!pl.needsTarget,
        hint: pl.id === 'palm' && p.stand ? 'You have a Stand, but the Palm may still hold a corpse part.' : `${pl.upside}. ${pl.downside}.`,
      })),
      targets: targets.map(({ id, name, tier, points }) => ({ id, name, tier, points })),
      star: starOption(options, p.personality).id,
      answer: null,
    };
    // The horse trader (town stages): on foot, or able to trade up.
    if (townStage(stage)) {
      const offers = shopOffers(p);
      if (offers.length) {
        prompt.shop = offers;
        prompt.buy = p.isAI ? aiBuys(p, rng) : null;
      }
    }
    autoAnswerIfAi(rng, state, prompt, options.map((pl) => ({ ...pl })), p.personality);
    prompts.push(prompt);
  }
  aiUseItems(state, rng);
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
    p.palmQuest = optionId === 'palm' ? { done: false } : null;
    if (optionId === 'rival' && targetId) p.rival = { targetId, done: false };
    if (optionId === 'ally' && targetId) askToAlly(state, rng, choice.stageId, p, targetId);
    if (prompt.buy) buyHorse(state, rng, p, prompt.buy);
  }
  rollHunts(state, rng, choice.stageId);
  // Canon racers on foot buy a horse in town if they can.
  if (townStage(STAGES.find((x) => x.id === choice.stageId))) {
    for (const c of state.canon ?? []) {
      if (c.status === 'racing' && c.onFoot) { const q = shopOffers(c)[0]?.quality; if (q) buyHorse(state, rng, c, q); }
    }
  }
  // Everyone else (canon, retired PCs) rides with no plan this stage.
  for (const r of namedRacers(state)) if (!choice.prompts.some((x) => x.playerId === r.id)) { r.plan = null; r.rival = null; r.palmQuest = null; }
  state.race.plansFor = choice.stageId;
}

/**
 * Ally up: a canon racer answers by character fit, a named NPC by chance,
 * and a PC in their next sub-event window (an "ally-invite" prompt).
 */
function askToAlly(state, rng, stageId, asker, targetId) {
  const target = findAnyRacer(state, targetId);
  const ctx = { state, rng, stage: STAGES.find((x) => x.id === stageId), roundLabel: 'start' };
  const L = ALLY_INVITE.lines;
  const note = (tpl, roles) => (state.race.pendingNotes ??= []).push(noteLine(tpl, roles));
  if (!target || target.status !== 'racing' || target.ally || asker.ally) {
    if (target) note(L.busy, { a: target, b: asker });
    logAlly(state, { event: 'refused', why: 'busy', stage: stageId });
    return;
  }
  if (target.tier === 'pc') {
    (state.race.allyInvites ??= []).push({ from: asker.id, to: target.id, stage: stageId });
    return;
  }
  const yes = target.tier === 'canon' ? canonAccepts(state, rng, target, asker) : rng.chance(RULES.alliances.npcAccept);
  if (yes) { formAlliance(ctx, asker, target, target.tier); note(L.formed, { a: target, b: asker }); }
  else { note(L.refused, { a: target, b: asker }); logAlly(state, { event: 'refused', why: target.tier, stage: stageId }); }
}

/** The phone picks a horse at the trader (or null to cancel), during the Stage Plan window. */
export function chooseHorse(state, playerId, quality) {
  const choice = state.race?.choice;
  if (!choice || choice.closed || choice.kind !== 'plan') return { ok: false, error: 'The trader is only open while you plan a stage in town.' };
  const prompt = choice.prompts.find((x) => x.playerId === playerId);
  if (!prompt?.shop) return { ok: false, error: 'no trader here' };
  if (quality != null && !prompt.shop.some((o) => o.quality === quality)) return { ok: false, error: 'no such horse' };
  prompt.buy = quality ?? null;
  return { ok: true };
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
  notes.push(...(race.pendingNotes ?? []));
  race.pendingNotes = [];

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
    prompts.push(rivalPrompt(rng, state, key, 'rival-hunter', hunter, render(RIVAL.hunterText, display(roles)), winOptions(target, [], RIVAL.hunter), roles));
    if (target.tier === 'pc') {
      prompts.push(rivalPrompt(rng, state, key, 'rival-target', target, render(RIVAL.targetText, display(roles)), RIVAL.target, roles));
    }
  }

  // 1b. Milestone 5: a second lost horse, invitations to ride together, trade offers.
  for (const p of racingPcs(state).filter((x) => x.secondHorseDecision && !busy.has(x.id))) {
    busy.add(p.id);
    prompts.push(specialPrompt(rng, state, HORSE_TWO, p, roundNo, { a: p.id }, HORSE_TWO.text));
  }
  for (const inv of (race.allyInvites ?? []).filter((x) => !x.placed)) {
    const to = findAnyRacer(state, inv.to);
    const from = findAnyRacer(state, inv.from);
    if (!to || !from || to.status !== 'racing' || from.status !== 'racing') { inv.placed = roundNo; continue; }
    if (busy.has(to.id) || busy.has(from.id)) continue; // next window
    inv.placed = roundNo;
    busy.add(to.id).add(from.id);
    prompts.push(specialPrompt(rng, state, ALLY_INVITE, to, roundNo, { a: to.id, b: from.id }, render(ALLY_INVITE.text, display({ a: to, b: from }))));
  }
  for (const p of racingPcs(state).filter((x) => !busy.has(x.id))) {
    const t = pendingFor(state, p.id)[0];
    if (!t) continue;
    t.status = 'asked';
    busy.add(p.id);
    const prompt = specialPrompt(rng, state, TRADE, p, roundNo, { a: p.id }, tradePromptText(state, t), tradeLeans(state, t));
    prompt.tradeId = t.id;
    prompts.push(prompt);
  }

  // 2. Seek the Devil's Palm: the Edge of the Palm comes once that stage.
  for (const p of rng.shuffle(racingPcs(state).filter((x) => x.palmQuest && !x.palmQuest.done))) {
    const fire = roundsLeft <= 1 || rng.chance(1 / roundsLeft);
    if (!fire) continue;
    p.palmQuest.done = true;
    if (busy.has(p.id)) { notes.push(noteLine(PALM.lines.missed, { a: p })); continue; }
    busy.add(p.id);
    prompts.push(Object.assign(subPromptFor(ctx, PALM_SUB, p, roundNo, { a: p }), { planned: true }));
  }

  // 3. Stand Arrows and Rokakaka, on their seeded rounds (secret prompts).
  for (const due of (race.arrowsDue ?? []).filter((x) => !x.placed && x.round <= roundNo)) {
    const pick = rng.weighted(racingPcs(state).filter((x) => !busy.has(x.id)), (x) => (x.isAI ? 1 : RULES.arrows.humanWeight));
    if (!pick) continue; // try again next round
    due.placed = roundNo;
    busy.add(pick.id);
    (race.arrowFinds ??= []).push({ stage: stage.id, human: !pick.isAI });
    prompts.push(itemPrompt(rng, state, ARROW, pick, roundNo));
  }
  const humansAlive = readyPlayers(state).some((x) => !x.isAI && x.status !== 'dead');
  for (const due of (race.rokakakaDue ?? []).filter((x) => !x.placed && !x.dropped && x.round <= roundNo)) {
    // Only human PCs ever find one; none drop once no human is alive, or after the last stage.
    if (!humansAlive || stage.id > RULES.rokakaka.stages[1]) {
      due.dropped = true;
      (race.rokakakaLog ??= []).push({ event: 'dropped', stage: stage.id, guaranteed: due.guaranteed, humansAlive, humansRacing: racingPcs(state).filter((x) => !x.isAI).length });
      continue;
    }
    const humans = racingPcs(state).filter((x) => !x.isAI && !busy.has(x.id));
    const pick = rng.pick(humans);
    if (!pick) continue; // try again next round
    due.placed = roundNo;
    busy.add(pick.id);
    prompts.push(itemPrompt(rng, state, ROKAKAKA, pick, roundNo));
  }
  aiUseItems(state, rng);

  // 3b. Milestone 5b: corpse parts, agents, Valentine.
  corpsePrompts(state, rng, stage, roundNo, roundsLeft, type, busy, prompts);

  // 4. Random sub events by the host's frequency setting; at least one PC per round.
  const eligible = racingPcs(state).filter((p) => !busy.has(p.id));
  // Prompts above count toward the round's target, except the ones a player's
  // own Stage Plan guarantees (a rival showdown, a hunt's find, the Palm quest):
  // those shouldn't crowd everyone else out of the random ones.
  // They count half, so the round's length stays about where it was.
  const planned = (x) => x.rivalKey || x.planned;
  const showdowns = new Set(prompts.filter((x) => !planned(x)).map((x) => x.id)).size
    + 0.5 * new Set(prompts.filter(planned).map((x) => x.rivalKey ?? x.id)).size;
  const expected = Math.max(0, (RULES.choices.subEventsPerRound[state.settings.subEventFreq ?? 'normal'] ?? 2.5) - showdowns);
  // Fairness: someone who has had more prompts than the average living PC
  // (rival showdowns, finds, ambushes...) gets fewer random ones, and the reverse.
  const fair = fairness(state);
  const chosen = eligible.filter((p) =>
    rng.chance(Math.min(RULES.choices.maxChancePerPc, (expected / Math.max(1, eligible.length)) * (planOf(p)?.subEventMult ?? 1) * fair(p))));
  const anyPcPrompt = () => chosen.length || prompts.some((x) => readyPlayers(state).some((p) => p.id === x.playerId));
  if (!anyPcPrompt() && eligible.length) {
    // Prefer a connected human who didn't just have one.
    const pick = rng.weighted(eligible, (p) =>
      (p.isAI ? 1 : p.connected ? 4 : 0.5) * (p.lastSubRound === roundNo - 1 ? RULES.choices.recentPenalty : 1) * fair(p));
    if (pick) chosen.push(pick);
  }
  for (const p of chosen) {
    if (busy.has(p.id)) continue; // cast into someone else's fight this round
    const got = subPrompt(ctx, p, roundNo, busy);
    if (!got) continue;
    p.lastSubRound = roundNo;
    prompts.push(...[].concat(got));
  }

  // Count prompts per PC for fairness (Valentine-only prompts don't count).
  for (const p of racingPcs(state)) p.fairRounds = (p.fairRounds ?? 0) + 1;
  for (const pr of prompts) {
    if ([VALENTINE_OFFER.id, ERRAND.id].includes(pr.special)) continue;
    const p = readyPlayers(state).find((x) => x.id === pr.playerId);
    if (p) p.fairPrompts = (p.fairPrompts ?? 0) + 1;
  }
  race.choice = { kind: 'sub', stageId: stage.id, roundNo, closed: false, prompts, notes, finds: race.pendingFinds ?? [], errands: race.autoErrands ?? [] };
  race.pendingFinds = [];
  race.autoErrands = [];
  state.rngState = rng.getState();
  return race.choice;
}

/**
 * Milestone 5b prompts for this window (all but the ambush and Funny
 * Valentine are SECRET): corpse finds, agent ambushes, a chance to steal a
 * part, Valentine's offer, errands (pick a target; the masked ambush comes
 * next round), and Funny Valentine in Stages 8–9.
 */
function corpsePrompts(state, rng, stage, roundNo, roundsLeft, type, busy, prompts) {
  const race = state.race;
  const free = () => racingPcs(state).filter((x) => !busy.has(x.id));
  race.pendingFinds = [];
  race.autoErrands = [];

  // Hunters who made their roll this stage claim a part first: this stage's
  // part (even before it would surface), or any loose one.
  const loose = looseParts(state, roundNo);
  const thisPart = state.corpse?.parts.find((x) => x.stage === stage.id);
  const hunts = (race.hunts ?? []).filter((h) => h.stage === stage.id && !h.done);
  for (const h of rng.shuffle(hunts)) {
    const who = findAnyRacer(state, h.id);
    if (!who || who.status !== 'racing') { h.done = true; continue; }
    if (h.round > roundNo || busy.has(who.id)) continue;
    const part = thisPart && (thisPart.status === 'loose' || (thisPart.status === 'waiting' && !thisPart.inPalm)) ? thisPart
      : looseParts(state, roundNo).find((x) => x.status === 'loose');
    if (!part) continue; // maybe a part comes loose later this stage
    h.done = true;
    busy.add(who.id);
    markFinding(part, who.id);
    const prompt = specialPrompt(rng, state, FOUND_PART, who, roundNo, { a: who.id }, FOUND_PART.text.replace('{part}', part.name), null, rivalTargets(state, who));
    prompt.partId = part.id;
    prompt.planned = true;
    prompts.push(prompt);
  }
  const reserved = hunts.some((h) => !h.done) && thisPart; // hunters still to claim it

  // Finds: each loose part may be found this round.
  for (const part of loose.filter((x) => x.status === 'loose' && x !== reserved)) {
    const who = pickFinder(state, rng);
    if (!who) continue;
    if (who === 'npc' || who.tier !== 'pc' || who.status !== 'racing') {
      markFinding(part, who === 'npc' ? 'npc' : who.id);
      race.pendingFinds.push({ partId: part.id, finder: who === 'npc' ? 'npc' : who.id });
      continue;
    }
    if (busy.has(who.id)) continue; // still loose: maybe next round
    busy.add(who.id);
    markFinding(part, who.id);
    const prompt = specialPrompt(rng, state, FOUND_PART, who, roundNo, { a: who.id }, FOUND_PART.text.replace('{part}', part.name), null, rivalTargets(state, who));
    prompt.partId = part.id;
    prompts.push(prompt);
  }

  // Errands decided last round strike now (the target defends if they're a PC).
  for (const e of (race.errands ?? []).filter((x) => !x.done && x.due <= roundNo)) {
    const x = findAnyRacer(state, e.from);
    const y = findAnyRacer(state, e.to);
    if (!x || !y || x.status !== 'racing' || y.status !== 'racing' || x.id === y.id) { e.done = true; continue; }
    if (busy.has(x.id) || busy.has(y.id)) {
      if (roundNo - e.due >= 1) { e.done = true; logValentine({ state, stage }, { event: 'errand-missed' }); }
      continue;
    }
    busy.add(x.id).add(y.id);
    if (y.tier === 'pc') {
      const tp = specialPrompt(rng, state, ERRAND_TARGET, y, roundNo, { a: y.id, b: x.id }, render(ERRAND_TARGET.text, display({ a: y })));
      tp.errandId = e.id;
      prompts.push(tp);
    } else {
      race.autoErrands.push(e.id);
    }
  }

  // Agent ambushes (never a protected joiner). Fairness applies here too.
  const fairAmbush = fairness(state);
  for (const p of free()) {
    if (!rng.chance(ambushChance(state, p) * Math.min(1, fairAmbush(p)))) continue;
    const agent = pickAgent(rng, state);
    if (!agent) break;
    busy.add(p.id);
    const options = AMBUSH.options.map((o) => ({ ...o }));
    prompts.push(specialPrompt(rng, state, { ...AMBUSH, options }, p, roundNo, { a: p.id, b: agent.id }, render(AMBUSH.text, display({ a: p, b: agent }))));
  }

  // A chance to steal a part from a sleeping holder (Night rounds).
  if (type === 'night' && rng.chance(RULES.corpse.steal.chance)) {
    const thief = rng.pick(free());
    const f = state.field;
    const holders = [...namedRacers(state), ...f.kept].filter((r) => r.status !== 'dead' && thief && r.id !== thief.id && carried(state, r).length && r.name);
    const mark = rng.pick(holders);
    if (thief && mark) {
      busy.add(thief.id);
      prompts.push(specialPrompt(rng, state, STEAL_PART, thief, roundNo, { a: thief.id, b: mark.id }, render(STEAL_PART.text, display({ a: thief, b: mark }))));
    }
  }

  // The Valentine offer (Stages 4–6).
  for (const p of dueOffers(state, rng, roundNo, stage.id, free())) {
    busy.add(p.id);
    prompts.push(specialPrompt(rng, state, VALENTINE_OFFER, p, roundNo, { a: p.id }, VALENTINE_OFFER.text));
    logValentine({ state, stage }, { event: 'offered', id: p.id, personality: p.personality, worthiness: p.worthiness });
  }

  // Errands: once a stage after joining; the ambush itself is next round.
  for (const p of free().filter((x) => isJoiner(x) && x.valentine.errandStage !== stage.id && roundsLeft > 1)) {
    if (!(roundsLeft <= 2 || rng.chance(1 / (roundsLeft - 1)))) continue;
    p.valentine.errandStage = stage.id;
    const targets = rivalTargets(state, p);
    if (!targets.length) continue;
    busy.add(p.id);
    prompts.push(specialPrompt(rng, state, ERRAND, p, roundNo, { a: p.id }, ERRAND.text, null, targets));
  }

  // Funny Valentine (Stages 8–9): Rare+ Stand users with Worthiness 60+, never joiners, once.
  for (const p of free().filter((x) => canFaceValentine(x, stage.id))) {
    if (!rng.chance(RULES.funnyValentine.chance)) continue;
    p.facedValentine = true;
    busy.add(p.id);
    prompts.push(specialPrompt(rng, state, FUNNY_VALENTINE, p, roundNo, { a: p.id }, FUNNY_VALENTINE.text));
  }
}

/** "If you win" options: no "take their horse" if they have none. */
function winOptions(target, extra = [], list = FIGHT_WIN) {
  return [...extra, ...list.filter((o) => !o.needsHorse || hasHorse(target))];
}

/** A prompt with fixed options (horse-two, ally-invite, trade). */
function specialPrompt(rng, state, def, pc, roundNo, roles, text, leans = null, targets = null) {
  const options = def.options.map((o) => ({ ...o, lean: leans?.[o.id] ?? o.lean }));
  const prompt = {
    id: `${def.id}-${roundNo}-${pc.id}`,
    playerId: pc.id,
    kind: 'sub',
    secret: !!def.secret,
    title: def.title,
    text,
    options: options.map(({ id, label, hint, needsTarget }) => ({ id, label, hint, ...(needsTarget ? { needsTarget: true } : {}) })),
    star: starOption(options, pc.personality).id,
    answer: null,
    special: def.id,
    roles,
  };
  if (targets) prompt.targets = targets;
  // A target-picking option with nobody to pick can't be chosen.
  if (!targets?.length) prompt.options = prompt.options.filter((o) => !o.needsTarget);
  if (!prompt.options.some((o) => o.id === prompt.star)) prompt.star = prompt.options[0].id;
  autoAnswerIfAi(rng, state, prompt, options.filter((o) => prompt.options.some((x) => x.id === o.id)), pc.personality);
  return prompt;
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

/** A prompt for a specific sub event (cast already decided). */
function subPromptFor(ctx, s, pc, roundNo, roles) {
  const holder = s.special === 'palm' && pc.stand;
  const prompt = {
    id: `sub-${roundNo}-${pc.id}`,
    playerId: pc.id,
    kind: 'sub',
    secret: s.secret,
    title: s.title,
    text: holder ? PALM.textHasStand : render(s.text, display(roles)),
    options: s.options.map(({ id, label, hint }) => ({ id, label, hint })),
    star: starOption(s.options, pc.personality).id,
    answer: null,
    subId: s.id,
    roles: Object.fromEntries(Object.entries(roles).map(([k, w]) => [k, w.id])),
  };
  autoAnswerIfAi(ctx.rng, ctx.state, prompt, s.options, pc.personality);
  return prompt;
}

/** Found a Stand Arrow / a Rokakaka: secret prompts; options depend on having a Stand. */
function itemPrompt(rng, state, def, pc, roundNo) {
  const options = def.options.filter((o) => !(o.noStandOnly && pc.stand) && !(o.standOnly && !pc.stand));
  const text = def.special === 'arrow' ? (pc.stand ? def.textHasStand : def.text) : (pc.stand ? def.text : def.textNoStand);
  const prompt = {
    id: `${def.special}-${roundNo}-${pc.id}`,
    playerId: pc.id,
    kind: 'sub',
    secret: true,
    title: def.title,
    text,
    options: options.map(({ id, label, hint }) => ({ id, label, hint })),
    star: starOption(options, pc.personality).id,
    answer: null,
    special: def.special,
    roles: { a: pc.id },
  };
  autoAnswerIfAi(rng, state, prompt, options, pc.personality);
  return prompt;
}

/** AI racers holding an Arrow (and no Stand) sometimes use it in a window. */
function aiUseItems(state, rng) {
  for (const it of state.items ?? []) {
    const owner = readyPlayers(state).find((x) => x.id === it.owner);
    // AI joiners hand parts to the President now and then.
    if (owner?.isAI && it.kind === 'part' && it.merged && isJoiner(owner) && owner.status === 'racing' && !it.pendingDeliver && rng.chance(RULES.valentine.aiDeliver)) {
      it.pendingDeliver = true; it.pendingUse = false; continue;
    }
    if (!owner?.isAI || it.pendingUse || !canUse(it, owner)) continue;
    if (rng.chance(it.kind === 'part' ? 0.1 : RULES.arrows.aiUseChance)) it.pendingUse = true;
  }
}

/**
 * A phone uses a kept item during an open choice window (untrusted input).
 * It resolves with this round. Sending it again cancels.
 */
export function useItem(state, playerId, itemId, action = null) {
  const choice = state.race?.choice;
  if (!choice || choice.closed) return { ok: false, error: 'Items can be used while a decision is open.' };
  const item = (state.items ?? []).find((i) => i.id === itemId && i.owner === playerId);
  const owner = readyPlayers(state).find((x) => x.id === playerId);
  if (!item) return { ok: false, error: 'no such item' };
  if (action === 'deliver') {
    // A joiner hands a corpse part to the President (secret). Again to cancel.
    if (item.kind !== 'part' || !item.merged || !isJoiner(owner) || owner.status !== 'racing') return { ok: false, error: "You can't do that." };
    item.pendingDeliver = !item.pendingDeliver;
    if (item.pendingDeliver) item.pendingUse = false;
    return { ok: true, pending: item.pendingDeliver };
  }
  if (!item.pendingUse && !canUse(item, owner)) return { ok: false, error: 'You can\'t use that right now.' };
  item.pendingUse = !item.pendingUse;
  if (item.pendingUse) item.pendingDeliver = false;
  return { ok: true, pending: item.pendingUse };
}

function subPrompt(ctx, pc, roundNo, busy) {
  const { rng } = ctx;
  for (const id of busy) ctx.assigned.add(id);
  let candidates = SUBS.filter((s) => whenFits(s, ctx) && roleFits(ctx, s, s.focusKey, pc));
  for (let tries = 0; tries < 8 && candidates.length; tries++) {
    const s = rng.weighted(candidates, (x) => x.weight * (x.leanTag ? RULES.personalityLean[pc.personality]?.[x.leanTag] ?? 1 : 1));
    const roles = castRoles(ctx, s, pc);
    if (!roles) { candidates = candidates.filter((c) => c !== s); continue; }
    for (const who of Object.values(roles)) {
      if (who.tier === 'npc') keepNpc(ctx.state, who);
      else busy.add(who.id);
    }
    const options = s.fightKind === 'strike' ? winOptions(roles.b, s.options.filter((o) => o.id === 'leave')) : s.options;
    const prompt = {
      id: `sub-${roundNo}-${pc.id}`,
      playerId: pc.id,
      kind: 'sub',
      secret: s.secret,
      title: s.title,
      text: render(s.text, display(roles)),
      options: options.map(({ id, label, hint }) => ({ id, label, hint })),
      star: starOption(options, pc.personality).id,
      answer: null,
      subId: s.id,
      roles: Object.fromEntries(Object.entries(roles).map(([k, w]) => [k, w.id])),
    };
    autoAnswerIfAi(rng, ctx.state, prompt, options, pc.personality);
    // PC vs PC: the target answers at the same time.
    if (s.fightKind === 'strike' && roles.b.tier === 'pc') {
      prompt.pairKey = prompt.id;
      const def = { id: `${s.id}-target`, title: 'Someone is coming for you', options: FIGHT_DEFEND };
      const tp = specialPrompt(rng, ctx.state, def, roles.b, roundNo, prompt.roles, render(s.targetText, display(roles)));
      tp.special = null;
      tp.pairKey = prompt.id;
      tp.kind = 'fight-target';
      return [prompt, tp];
    }
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
  const lines = [...choice.notes, ...resolveItems(ctx)];
  // Racers in any prompt this round (an ally can't ride in from their own decision).
  ctx.inPrompts = new Set(choice.prompts.flatMap((x) => [x.playerId, ...Object.values(x.roles ?? {})]));
  const done = new Set();
  for (const prompt of ctx.rng.shuffle([...choice.prompts])) {
    if (prompt.rivalKey) {
      if (done.has(prompt.rivalKey)) continue;
      done.add(prompt.rivalKey);
      const pair = choice.prompts.filter((x) => x.rivalKey === prompt.rivalKey);
      const line = resolveRival(ctx, pair);
      if (line) lines.push(line);
    } else if (prompt.pairKey) {
      if (done.has(prompt.pairKey)) continue;
      done.add(prompt.pairKey);
      const pair = choice.prompts.filter((x) => x.pairKey === prompt.pairKey);
      const line = resolveSub(ctx, pair.find((x) => x.kind === 'sub'), pair.find((x) => x.kind === 'fight-target'));
      if (line) lines.push(line);
    } else {
      const line = resolveSub(ctx, prompt);
      if (line) lines.push(line);
    }
  }
  // Milestone 5b: finds by canon racers and the field, errands against racers
  // nobody controls, and agents ambushing canon and named NPCs.
  for (const f of choice.finds ?? []) {
    const part = ctx.state.corpse?.parts.find((x) => x.id === f.partId);
    if (!part || part.status !== 'finding') continue;
    const who = f.finder === 'npc' ? 'npc' : findAnyRacer(ctx.state, f.finder);
    if (who && who !== 'npc' && who.tier === 'pc') {
      // A retired PC: no prompt; they keep it.
      resolveFind(ctx, part.id, who, 'keep');
      addHint(who, PART_HINTS.found.replace('{part}', part.name), ctx);
    } else resolveOtherFind(ctx, part, who ?? 'npc');
  }
  for (const id of choice.errands ?? []) {
    const line = resolveErrand(ctx, id, null);
    if (line) lines.push(line);
  }
  lines.push(...otherAmbushes(ctx));
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
  for (const who of Object.values(roles)) if (who.stand && text.includes(who.stand.name)) who.stand.revealed = true;
  for (const who of Object.values(roles)) {
    if (who.tier === 'npc') keepNpc(ctx.state, who);
    else if (who.tier !== 'agent') { ctx.assigned.add(who.id); ids.push(who.id); }
  }
  ctx.eventCounts[eventId] = (ctx.eventCounts[eventId] ?? 0) + 1;
  return {
    eventId, text, ids, choice: true,
    names: Object.values(roles).filter((w) => w.tier === 'pc' || w.tier === 'canon').map((w) => ({ name: w.name, tier: w.tier })),
    minor: false, death, tags, side: false,
  };
}

function resolveSub(ctx, prompt, targetPrompt = null) {
  if (prompt.special === HORSE_TWO.id) return resolveHorseTwo(ctx, prompt);
  if (prompt.special === ALLY_INVITE.id) return resolveAllyInvite(ctx, prompt);
  if (prompt.special === TRADE.id) {
    const t = (ctx.state.trades ?? []).find((x) => x.id === prompt.tradeId);
    if (t) resolveTrade(ctx, t, prompt.answer.optionId === 'accept');
    return null; // secret
  }
  if (prompt.special === FOUND_PART.id) {
    const a = findAnyRacer(ctx.state, prompt.roles.a);
    resolveFind(ctx, prompt.partId, a, prompt.answer.optionId, prompt.answer.targetId);
    return null; // secret
  }
  if (prompt.special === STEAL_PART.id) return resolveSteal(ctx, prompt);
  if (prompt.special === AMBUSH.id) return resolveAgentAmbush(ctx, prompt);
  if (prompt.special === FUNNY_VALENTINE.id) return resolveFunnyValentine(ctx, prompt);
  if (prompt.special === VALENTINE_OFFER.id) {
    const a = findAnyRacer(ctx.state, prompt.roles.a);
    if (a && a.status === 'racing') (prompt.answer.optionId === 'join' ? joinValentine : refuseValentine)(ctx, a);
    return null; // secret
  }
  if (prompt.special === ERRAND.id) {
    const a = findAnyRacer(ctx.state, prompt.roles.a);
    if (a && a.status === 'racing' && prompt.answer.optionId === 'ride' && prompt.answer.targetId) {
      const race = ctx.state.race;
      race.errands ??= [];
      race.errands.push({ id: `e${race.errands.length + 1}`, from: a.id, to: prompt.answer.targetId, stage: ctx.stage.id, due: race.roundNo + 1, done: false });
      addHint(a, 'You take the dark hat. You ride next round.', ctx);
      logValentine(ctx, { event: 'errand-picked' });
    }
    return null; // secret
  }
  if (prompt.special === ERRAND_TARGET.id) return resolveErrand(ctx, prompt.errandId, prompt.answer.optionId);
  if (prompt.special) return resolveItemFind(ctx, prompt);
  const sub = SUBS.find((s) => s.id === prompt.subId);
  if (sub?.special === 'palm') return resolvePalm(ctx, prompt);
  if (sub?.special === 'fight') return resolveFightSub(ctx, sub, prompt, targetPrompt);
  const roles = sub && rolesFor(ctx, prompt);
  if (!roles || roles.a.status !== 'racing') return null;
  const option = sub.options.find((o) => o.id === prompt.answer.optionId) ?? sub.options[0];
  const outcomes = option.outcomes.filter((o) => outcomeFits(ctx, o, roles));
  const outcome = ctx.rng.weighted(outcomes, (o) => outcomeWeight(o, roles));
  if (!outcome) return null;
  const text = render(outcome.text, display(roles));
  applyEffects(ctx, outcome.effects, roles);
  if (option.tags?.includes('help')) roles.a.helps = (roles.a.helps ?? 0) + 1;
  if (option.tags?.includes('help')) addWorthiness(roles.a, option.tags.includes('save') ? RULES.worthiness.save : RULES.worthiness.help, ctx);
  if (option.tags?.includes('cold')) addWorthiness(roles.a, RULES.worthiness.ridePast, ctx);
  const death = Object.values(outcome.effects).some((e) => e.dies);
  const line = lineFor(ctx, `${sub.id}:${option.id}`, text, roles, { death, tags: option.tags ?? [] });
  // Quiet results ("waits out the storm") go to the Meanwhile card, but only
  // for AI racers and timed-out players: a person's own choice always lands
  // in the Main Story, so they see it on stream.
  if (outcome.minor && !death && prompt.answer.by !== 'player') Object.assign(line, { minor: true, side: true });
  return line;
}

/** Hunt a rival showdown: a real fight, started by the hunter (a) against the target (b). */
function resolveRival(ctx, pair) {
  const hp = pair.find((x) => x.kind === 'rival-hunter');
  const roles = rolesFor(ctx, hp);
  if (!roles || roles.a.status !== 'racing') return null;
  const { a, b } = roles;
  if (b.status !== 'racing') return lineFor(ctx, 'rival-gone', render(RIVAL.lines.gone, display({ a })), { a });
  const tp = pair.find((x) => x.kind === 'rival-target');
  const defend = tp ? tp.answer.optionId : b.tier === 'pc' ? starOption(FIGHT_DEFEND, b.personality).id : npcDefend(ctx.rng, b);
  const f = resolveFight(ctx, { kind: 'rival', attacker: a, defender: b, win: hp.answer.optionId, defend, cause: 'killed by a rival' });
  return lineFor(ctx, 'rival-showdown', f.text, f.roles, { death: f.death, tags: ['fight'] });
}

/** Attacked on the trail (the PC defends) / A chance to strike (the PC may attack). */
function resolveFightSub(ctx, sub, prompt, targetPrompt) {
  const roles = rolesFor(ctx, prompt);
  if (!roles || roles.a.status !== 'racing') return null;
  const { a, b } = roles;
  if (sub.fightKind === 'attacked') {
    const f = resolveFight(ctx, { kind: 'attacked', attacker: b, defender: a, win: npcWin(ctx.rng, b, a), defend: prompt.answer.optionId, cause: 'killed on the trail' });
    return lineFor(ctx, sub.id, f.text, f.roles, { death: f.death, tags: ['fight'] });
  }
  // A chance to strike.
  if (prompt.answer.optionId === 'leave' || b.status !== 'racing') {
    const line = lineFor(ctx, `${sub.id}:leave`, render(FIGHT_LINES.leave, display({ x: a, y: b })), { a });
    if (prompt.answer.by !== 'player' && !targetPrompt) Object.assign(line, { minor: true, side: true });
    return line;
  }
  const defend = targetPrompt ? targetPrompt.answer.optionId : b.tier === 'pc' ? starOption(FIGHT_DEFEND, b.personality).id : npcDefend(ctx.rng, b);
  const f = resolveFight(ctx, { kind: 'strike', attacker: a, defender: b, win: prompt.answer.optionId, defend, cause: 'killed on the trail' });
  return lineFor(ctx, sub.id, f.text, f.roles, { death: f.death, tags: ['fight'] });
}

function resolveHorseTwo(ctx, prompt) {
  const a = findAnyRacer(ctx.state, prompt.roles.a);
  if (!a) return null;
  a.secondHorseDecision = false;
  if (a.status !== 'racing') return null;
  const retire = prompt.answer.optionId === 'retire';
  if (retire) retireRacer(ctx, a);
  return lineFor(ctx, `horse-two:${prompt.answer.optionId}`, render(HORSE_TWO.lines[retire ? 'retire' : 'foot'], display({ a })), { a });
}

function resolveAllyInvite(ctx, prompt) {
  const a = findAnyRacer(ctx.state, prompt.roles.a);
  const b = findAnyRacer(ctx.state, prompt.roles.b);
  if (!a || !b || a.status !== 'racing' || b.status !== 'racing') return null;
  const L = ALLY_INVITE.lines;
  if (a.ally || b.ally) return lineFor(ctx, 'ally:busy', render(L.busy, display({ a, b })), { a, b });
  if (prompt.answer.optionId === 'accept') {
    formAlliance(ctx, a, b, 'pc');
    return lineFor(ctx, 'ally:formed', render(L.formed, display({ a, b })), { a, b });
  }
  logAlly(ctx.state, { event: 'refused', why: 'pc', stage: ctx.stage.id });
  return lineFor(ctx, 'ally:refused', render(L.refused, display({ a, b })), { a, b });
}

// ------------------------------------------------------------ milestone 4: Palm, Arrows, Rokakaka, items

function quiet(line, prompt) {
  // Quiet results go to the Meanwhile card for AI racers and timed-out players.
  if (prompt.answer.by !== 'player') Object.assign(line, { minor: true, side: true });
  return line;
}

/** The Edge of the Devil's Palm: go in or turn back. Worthiness decides. */
function resolvePalm(ctx, prompt) {
  const a = findAnyRacer(ctx.state, prompt.roles.a);
  if (!a || a.status !== 'racing') return null;
  const d = display({ a });
  if (prompt.answer.optionId !== 'in') return quiet(lineFor(ctx, 'sub-palm:back', render(PALM.lines.back, d), { a }), prompt);
  let outcome = rollPalm(ctx.rng, a.worthiness);
  if (outcome === 'stand' && a.stand) outcome = 'nothing'; // one Stand per racer
  if (outcome === 'dies' && blessed(ctx, a)) outcome = 'lost'; // the dead's Blessing
  if (outcome === 'dies') {
    logPalm(ctx, a, 'dies');
    killRacer(ctx, a, "swallowed by the Devil's Palm", null);
    return lineFor(ctx, 'sub-palm:dies', render(PALM.lines.dies, d), { a }, { death: true });
  }
  if (outcome === 'lost') {
    const r = palmLost(ctx, a);
    return lineFor(ctx, `sub-palm:${r}`, render(r === 'retired' ? PALM.lines.retired : PALM.lines.lost, d), { a });
  }
  palmExit(ctx, a, outcome);
  // Same line whether they awakened a Stand or got nothing.
  return lineFor(ctx, 'sub-palm:out', render(PALM.lines.out, d), { a });
}

/** Survive the piercing by Worthiness band (rules.arrows.survive), then a Stand from the Arrow odds. */
function pierce(ctx, a) {
  if (a.stand) {
    // Only possible if two piercings land in one round (a kept Arrow and a
    // found one): the Stand came from the first, and this Arrow is kept, not lost.
    addItem(ctx.state, 'arrow', a, { stage: ctx.stage.id, round: ctx.roundLabel });
    addHint(a, "The second Arrow won't take: you already have a Stand. You keep it.", ctx);
    log(ctx, 'arrowLog', { outcome: 'already' });
    return null;
  }
  const w = a.worthiness ?? 50;
  const p = RULES.arrows.survive.find((b) => w >= b.min)?.p ?? 50;
  if (!ctx.rng.chance(p / 100) && !blessed(ctx, a)) {
    log(ctx, 'arrowLog', { outcome: 'died', worthiness: w });
    killRacer(ctx, a, ARROW.deathCause, null);
    return lineFor(ctx, 'arrow:died', render(ARROW.deathLine, display({ a })), { a }, { death: true });
  }
  const st = awakenStand(ctx, a, 'arrow');
  log(ctx, 'arrowLog', { outcome: 'stand', tier: st?.tier, worthiness: w });
  addHint(a, 'The Arrow burns, then cools. You are not alone anymore.', ctx);
  return null; // secret: nothing on stream
}

function eat(ctx, a) {
  const before = a.stand?.tier ?? null;
  const st = removeStand(ctx.state, a);
  log(ctx, 'rokakakaLog', { event: 'eaten', tierBefore: before, racerId: a.id, logIndex: ctx.state.stands.log.length });
  if (st) addHint(a, `You eat the Rokakaka. Equivalent exchange: ${st.name} leaves you, and takes something of you with it.`, ctx);
}

function log(ctx, key, entry) {
  (ctx.state.race[key] ??= []).push({ stage: ctx.stage.id, ...entry });
}

/** Found a Stand Arrow / Rokakaka: pierce or eat now, keep it, or leave it. Secret. */
function resolveItemFind(ctx, prompt) {
  const a = findAnyRacer(ctx.state, prompt.roles.a);
  if (!a || a.status !== 'racing') {
    // The finder fell before the find resolved: a Rokakaka turns up again next round.
    if (prompt.special === 'rokakaka') {
      const due = (ctx.state.race.rokakakaDue ?? []).find((d) => d.placed === ctx.state.race.roundNo);
      if (due) { due.placed = null; due.round = ctx.state.race.roundNo + 1; }
    }
    return null;
  }
  const choice = prompt.answer.optionId;
  const found = { stage: ctx.stage.id, round: ctx.roundLabel };
  if (prompt.special === 'arrow') {
    log(ctx, 'arrowLog', { event: 'found', choice });
    if (choice === 'pierce') return pierce(ctx, a);
    if (choice === 'keep') { addItem(ctx.state, 'arrow', a, found); addHint(a, 'You wrap the Arrow in cloth and hide it in your saddlebag.', ctx); }
    else addHint(a, 'You leave the Arrow where it lies.', ctx);
    return null;
  }
  log(ctx, 'rokakakaLog', { event: 'found', choice, human: !a.isAI, racerId: a.id });
  if (choice === 'eat' && a.stand) eat(ctx, a);
  else if (choice === 'keep') { addItem(ctx.state, 'rokakaka', a, found); addHint(a, 'You pocket the Rokakaka. It smells faintly of iron.', ctx); }
  else addHint(a, 'You leave the strange fruit on its branch.', ctx);
  return null;
}

/** Kept items used during this round's windows resolve first. */
function resolveItems(ctx) {
  const lines = [];
  for (const it of [...(ctx.state.items ?? [])].filter((i) => i.pendingDeliver)) {
    it.pendingDeliver = false;
    const a = findAnyRacer(ctx.state, it.owner);
    if (a && a.status === 'racing') deliver(ctx, a, it);
  }
  for (const it of [...(ctx.state.items ?? [])].filter((i) => i.pendingUse)) {
    const a = findAnyRacer(ctx.state, it.owner);
    it.pendingUse = false;
    if (!a || !canUse(it, a)) continue;
    if (it.kind === 'part') { holdHidden(ctx, it); continue; } // a hidden part, held after all: it merges this round
    removeItem(ctx.state, it.id);
    if (it.kind === 'arrow') {
      log(ctx, 'arrowLog', { event: 'used' });
      const line = pierce(ctx, a);
      if (line) lines.push(line);
    } else if (it.kind === 'rokakaka') {
      eat(ctx, a);
    }
  }
  return lines;
}

// ------------------------------------------------------------ milestone 5b: corpse parts, agents, Valentine

/** A sleeping holder: take it (−8; they might wake) or leave it. Secret. */
function resolveSteal(ctx, prompt) {
  const a = findAnyRacer(ctx.state, prompt.roles.a);
  const b = findAnyRacer(ctx.state, prompt.roles.b);
  if (!a || !b || a.status !== 'racing' || b.status === 'dead') return null;
  const items = carried(ctx.state, b);
  if (prompt.answer.optionId !== 'take' || !items.length) return null;
  const it = ctx.rng.pick(items);
  const name = it.label;
  if (ctx.rng.chance(RULES.corpse.steal.success)) {
    takePart(ctx, it, a, 'stolen', b, { quiet: true });
    addWorthiness(a, RULES.worthiness.stealPart, ctx);
    addHint(a, PART_HINTS.stoleIt.replace('{part}', name), ctx);
    addHint(b, PART_HINTS.stolen.replace('{part}', name), ctx);
  } else {
    addHint(a, PART_HINTS.stealMiss.replace('{b}', b.name), ctx);
    addHint(b, PART_HINTS.stealFail, ctx);
  }
  return null; // secret
}

/** Ambushed by agents: fight, flee, or let them search you. */
function resolveAgentAmbush(ctx, prompt) {
  const roles = rolesFor(ctx, prompt);
  if (!roles || roles.a.status !== 'racing') return null;
  const f = resolveAmbush(ctx, roles.b, roles.a, prompt.answer.optionId);
  return lineFor(ctx, AMBUSH.id, f.text, f.roles, { death: f.death, tags: ['fight'] });
}

/** Face Funny Valentine, or take the long way round. */
function resolveFunnyValentine(ctx, prompt) {
  const a = findAnyRacer(ctx.state, prompt.roles.a);
  if (!a || a.status !== 'racing') return null;
  if (prompt.answer.optionId !== 'face') {
    a.pace -= 1;
    logAgents(ctx, { event: 'valentine', outcome: 'avoided', tier: a.stand?.tier });
    return quiet(lineFor(ctx, 'funny-valentine:avoid', render(FUNNY_VALENTINE.lines.avoid, display({ a })), { a }), prompt);
  }
  const f = resolveValentine(ctx, a);
  return lineFor(ctx, 'funny-valentine:face', f.text, { a }, { death: f.death, tags: ['fight'] });
}

/**
 * A Valentine errand: the joiner ambushes their target masked, with agent
 * backup. A part goes to the President; otherwise they take the horse.
 * `defend`: the target's answer (null: they decide by tier).
 */
function resolveErrand(ctx, errandId, defend) {
  const e = (ctx.state.race.errands ?? []).find((x) => x.id === errandId);
  if (!e || e.done) return null;
  e.done = true;
  const x = findAnyRacer(ctx.state, e.from);
  const y = findAnyRacer(ctx.state, e.to);
  if (!x || !y || x.status !== 'racing' || y.status !== 'racing') return null;
  ctx.assigned.add(x.id);
  const d = defend ?? (y.tier === 'pc' ? starOption(AMBUSH.options, y.personality).id : npcDefend(ctx.rng, y));
  const f = resolveFight(ctx, {
    kind: 'errand', attacker: x, defender: y, win: 'part', defend: d, bonusA: RULES.valentine.errandBonus,
    masked: true, partTo: 'president', fallback: 'horse', cause: 'killed on the trail',
  });
  logValentine(ctx, { event: 'errand', outcome: f.outcome, targetTier: y.tier });
  const hints = {
    part: "You hand the President's man what you took. He nods.",
    horse: 'Nothing to take for the President, so you take the horse.',
    searched: 'They carried nothing the President wants.',
    escape: 'They got away.',
    'both-hurt': 'You both ride off hurt. Nobody saw your face.',
    'reversal-spare': 'They drove you off. Nobody saw your face.',
  };
  if (hints[f.outcome]) addHint(x, hints[f.outcome], ctx);
  // The stream never learns who wore the hat, unless they died in it.
  const shown = f.outcome === 'reversal-kill' ? f.roles : Object.fromEntries(Object.entries(f.roles).filter(([, w]) => w !== x));
  const line = lineFor(ctx, 'valentine-errand', f.text, shown, { death: f.death, tags: ['fight'] });
  return line;
}

/**
 * "Hunt a corpse part": at the start of each stage every hunter rolls
 * rules.corpse.hunt (base, a little Worthiness, plus pity for each earlier
 * hunting stage that found nothing). A hunter who makes it claims a part on
 * a random round of the stage (state.race.hunts). Pity resets after a find.
 */
export function rollHunts(state, rng, stageId) {
  const H = RULES.corpse.hunt;
  const race = state.race;
  const stage = STAGES.find((x) => x.id === stageId);
  const types = race.plan[stageId - 1].types;
  const first = race.plan.slice(0, stageId - 1).reduce((n, s) => n + s.types.length, 0) + 1;
  const rounds = types.map((t, i) => ({ t, round: first + i })).filter((x) => x.t !== 'finish').map((x) => x.round);
  for (const p of racingPcs(state)) {
    // Close out the last stage this PC hunted.
    if (p.huntStage && p.huntStage < stageId && !p.huntClosed) {
      p.huntClosed = true;
      const found = (state.corpse?.log ?? []).some((e) => e.to === p.id && ['found', 'palm'].includes(e.event) && e.stage === p.huntStage);
      p.huntPity = found ? 0 : (p.huntPity ?? 0) + 1;
    }
    if (p.plan !== 'corpse' || !stage) continue;
    p.huntStage = stageId;
    p.huntClosed = false;
    const chance = H.base + ((p.worthiness ?? 50) - 50) * H.perWorthiness + (p.huntPity ?? 0) * H.pity;
    if (rng.chance(Math.min(0.95, chance))) (race.hunts ??= []).push({ id: p.id, stage: stageId, round: rng.pick(rounds), done: false });
  }
}

/**
 * Sub event fairness between living PCs: a multiplier on the chance of a
 * random sub event, from how many prompts this PC has had per round so far
 * against the average (rules.choices.fairness). Smoothed, and clamped.
 */
function fairness(state) {
  const F = RULES.choices.fairness;
  const pcs = racingPcs(state);
  const rate = (p) => ((p.fairPrompts ?? 0) + F.prior * F.priorRate) / ((p.fairRounds ?? 0) + F.prior);
  const mean = pcs.reduce((t, p) => t + rate(p), 0) / (pcs.length || 1);
  return (p) => Math.max(F.min, Math.min(F.max, (mean / rate(p)) ** F.power));
}
