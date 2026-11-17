// The Saint's Corpse (milestone 5b, DESIGN.md → Corpse parts). Pure engine code.
//
// Nine parts, one per stage. A part is either waiting to surface, loose on the
// trail (someone may find it each round), held by a racer, or the President's.
// Holding is SECRET, like a Stand: a held part is an item in state.items
// (kind 'part'), so it shows only in its holder's privateView, and every
// stream line about it is vague.
//
// state.corpse = {
//   parts: [{ id, name, stage, inPalm, surfaceRound, status, by? }],
//     status: 'waiting' | 'loose' | 'finding' (a find is being decided) | 'held' | 'president'
//   log:   [{ stage, round, part, event, to?, toTier?, from?, ... }]   // every change, for the sim and the M6 reveal
//   announce: [text]   // anonymous host lines for this round ("Someone has been deemed worthy of the Saint.")
// }
// item = { id, kind: 'part', owner, partId, label, hidden, merged, found }
//   hidden: carried wrapped (no Stand, no rejection; agents notice it less)
//   merged: it has accepted its holder
//
// Every part that comes to a racer merges with them (rolled once per part:
// rules.corpse.rejection by Worthiness band), except one they chose to hide;
// a hidden part can be held later from the phone (Items → Hold it). Merges
// resolve at the end of the round (state.race.mergeQueue).

import RULES from '../../data/rules.js';
import { PARTS, PART_LINES, PART_HINTS } from '../../data/corpse.js';
import { addHint, addWorthiness, killRacer, findRacerAnywhere, namedRacers, DEATH_HOOKS } from './racers.js';
import { castNpc, keepNpc, npcDies } from './field.js';
import { awakenStand } from './stands.js';
import { render } from './text.js';
import { displayRoles } from './events.js';
import { deathProof } from './dead.js';

const C = () => RULES.corpse;

/** Seed the parts at Start. `slots(lo, hi)` lists { round, stage, roundIdx } for those stages. */
export function initCorpse(state, rng, plan) {
  let n = 0;
  const parts = [];
  for (const s of plan) {
    const first = n + 1;
    n += s.types.length;
    const nonFinish = s.types.map((t, i) => ({ t, round: first + i })).filter((x) => x.t !== 'finish').map((x) => x.round);
    const inPalm = C().palmStages.includes(s.id) && rng.chance(C().palmChance);
    parts.push({
      id: `part-${s.id}`, name: PARTS[s.id - 1] ?? `part ${s.id}`, stage: s.id, inPalm,
      // A Palm part waits for whoever walks out; if nobody has by the last Day/Night round, it surfaces then.
      surfaceRound: inPalm ? nonFinish.at(-1) : rng.pick(nonFinish),
      status: 'waiting',
    });
  }
  state.corpse = { parts, log: [], announce: [] };
}

const partById = (state, id) => state.corpse?.parts.find((p) => p.id === id);
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => {
  const v = vars[k.toLowerCase()] ?? '';
  return k[0] === k[0].toUpperCase() ? v.charAt(0).toUpperCase() + v.slice(1) : v;
});
const hint = (who, key, vars, ctx) => addHint(who, fill(PART_HINTS[key], vars), ctx);

function log(ctx, part, event, extra = {}) {
  ctx.state.corpse.log.push({ stage: ctx.stage?.id ?? 0, round: ctx.roundLabel ?? '', part: part.id, name: part.name, event, ...extra });
}

/** Parts this racer carries (held or hidden). */
export function carried(state, r) {
  if (!r?.id) return [];
  return (state.items ?? []).filter((i) => i.kind === 'part' && i.owner === r.id);
}

export const holdsPart = (state, r) => carried(state, r).length > 0;

/** How many parts the President holds. */
export function presidentParts(state) {
  return (state.corpse?.parts ?? []).filter((p) => p.status === 'president').length;
}

// ------------------------------------------------------------ moving parts

/** A part comes to a racer (or 'president'). New item or an existing one moving. */
function giveTo(ctx, part, to, how, { item = null, hidden = false, from = null } = {}) {
  if (to === 'president' || to?.tier === 'agent') {
    if (item) ctx.state.items = ctx.state.items.filter((i) => i.id !== item.id);
    part.status = 'president';
    log(ctx, part, 'president', { how, from: from?.id ?? null, fromTier: from?.tier ?? null });
    return null;
  }
  if (!item) {
    ctx.state.itemSeq = (ctx.state.itemSeq ?? 0) + 1;
    item = { id: `i${ctx.state.itemSeq}`, kind: 'part', partId: part.id, label: part.name };
    (ctx.state.items ??= []).push(item);
  }
  Object.assign(item, { owner: to.id, hidden, merged: false, pendingUse: false, found: { stage: ctx.stage?.id ?? 0, round: ctx.roundLabel ?? '' } });
  part.status = 'held';
  if (to.tier === 'npc') keepNpc(ctx.state, to);
  log(ctx, part, how, { to: to.id, toTier: to.tier, from: from?.id ?? null, fromTier: from?.tier ?? null, hidden });
  if (!hidden) queueMerge(ctx, item);
  return item;
}

/** An existing part item changes hands (fights, steals, gifts, trades). */
export function takePart(ctx, item, to, how, from = null, { quiet = false } = {}) {
  const part = partById(ctx.state, item.partId);
  if (!part) return null;
  const loser = from ?? findRacerAnywhere(ctx.state, item.owner);
  if (loser && !quiet) hint(loser, 'taken', { part: part.name }, ctx);
  const got = giveTo(ctx, part, to, how, { item, from: loser });
  if (got && to.tier === 'pc') hint(to, 'receivedQuiet', { part: part.name }, ctx);
  return got;
}

/** Cheat menu (testing): every part goes to this racer, merged at once. */
export function cheatGiveAllParts(ctx, who) {
  for (const part of ctx.state.corpse?.parts ?? []) {
    const item = (ctx.state.items ?? []).find((i) => i.kind === 'part' && i.partId === part.id);
    if (item?.owner === who.id) continue;
    const got = giveTo(ctx, part, who, 'cheat', { item: item ?? null });
    if (got) got.merged = true;
  }
  ctx.state.race.mergeQueue = (ctx.state.race.mergeQueue ?? []).filter((q) => !(ctx.state.items ?? []).some((i) => i.id === q.id && i.owner === who.id));
}

/** Cheat menu: every part this racer carries comes loose. */
export function cheatDropAllParts(ctx, who) {
  for (const it of carried(ctx.state, who)) makeLoose(ctx, it, 'cheat');
}

/** A part comes loose from its holder (the finale's Bring-down). */
export function dropPart(ctx, item, how) {
  makeLoose(ctx, item, how);
}

/** A part goes back onto the trail (a holder died alone, or it rejected them). */
function makeLoose(ctx, item, how) {
  const part = partById(ctx.state, item.partId);
  ctx.state.items = ctx.state.items.filter((i) => i.id !== item.id);
  if (!part) return;
  part.status = 'loose';
  log(ctx, part, 'loose', { how, from: item.owner });
}

// Milestone 7a: kept Stand Arrows and Rokakaka don't vanish with the dead.
// A PC killer takes them (a Rokakaka only if the killer is a human PC);
// otherwise they drop, and turn up again in a later find (a Rokakaka still
// only for a human PC). state.race.itemLog records it for the reveal and the game log.
DEATH_HOOKS.push((ctx, who, killer) => {
  const race = ctx.state.race;
  if (!race) return;
  for (const it of (ctx.state.items ?? []).filter((i) => i.owner === who.id && ['arrow', 'rokakaka'].includes(i.kind))) {
    const human = killer?.tier === 'pc' && !killer.isAI;
    const takes = killer && killer.status !== 'dead' && killer.tier === 'pc' && !killer.otherWorld && (it.kind === 'arrow' || human);
    const entry = { stage: ctx.stage?.id ?? 0, round: ctx.roundLabel ?? '', kind: it.kind, from: who.id };
    if (takes) {
      it.owner = killer.id; it.pendingUse = false;
      race.itemLog = [...(race.itemLog ?? []), { ...entry, event: 'taken', to: killer.id }];
      addHint(killer, `You find ${it.kind === 'arrow' ? 'a Stand Arrow' : 'a Rokakaka fruit'} on ${who.name}.`, ctx);
      continue;
    }
    ctx.state.items = ctx.state.items.filter((i) => i.id !== it.id);
    const later = (race.roundNo ?? 0) + (ctx.rng ? ctx.rng.int(2, 5) : 3);
    if (it.kind === 'arrow') (race.arrowsDue ??= []).push({ round: later, fromDeath: true });
    else (race.rokakakaDue ??= []).push({ round: later, guaranteed: false, fromDeath: true });
    race.itemLog = [...(race.itemLog ?? []), { ...entry, event: 'dropped' }];
  }
});

// A holder died: their killer takes what they carried (agents take it to the
// President); a death with no killer drops it back onto the trail.
DEATH_HOOKS.push((ctx, who, killer) => {
  if (!ctx.state.corpse) return;
  for (const it of carried(ctx.state, who)) {
    if (killer && killer.status !== 'dead' && killer.id !== who.id) giveTo(ctx, partById(ctx.state, it.partId), killer.tier === 'agent' || killer.immortal ? 'president' : killer, 'from-body', { item: it, from: who });
    else makeLoose(ctx, it, 'dropped');
  }
});

// ------------------------------------------------------------ finding

/** Parts due to surface this round become loose. Returns the loose parts to roll a find for. */
export function looseParts(state, roundNo) {
  if (!state.corpse) return [];
  for (const p of state.corpse.parts) if (p.status === 'waiting' && p.surfaceRound <= roundNo) p.status = 'loose';
  return state.corpse.parts.filter((p) => p.status === 'loose');
}

/** Weight for finding a part (the corpse chooses the worthy). */
export function findWeight(r) {
  const F = C().find;
  let w = F.base + (r.worthiness ?? 50) * F.perWorthiness;
  if (r.plan === 'corpse') w *= F.huntMult;
  if (r.status === 'retired') w *= F.retired;
  if (r.tier === 'canon') w *= F.canon * (F.canonSeekers[r.canonId] ?? 1);
  return w;
}

/**
 * Who finds a loose part this round: a PC (a secret prompt), a canon racer,
 * or the NPC field ('npc'). Returns null when nobody does this round.
 */
export function pickFinder(state, rng) {
  if (!rng.chance(C().findChance)) return null;
  const racers = namedRacers(state).filter((r) => r.status !== 'dead');
  const pool = [...racers.map((r) => ({ r, w: findWeight(r) })), { r: 'npc', w: C().find.npcField }];
  return rng.weighted(pool, (x) => x.w)?.r ?? null;
}

/** A PC's find prompt is waiting on them. */
export function markFinding(part, finderId) {
  part.status = 'finding';
  part.finder = finderId;
}

/** Resolve a PC's "You found a corpse part" answer: keep, hide, or give it to someone. */
export function resolveFind(ctx, partId, finder, optionId, targetId) {
  const part = partById(ctx.state, partId);
  if (!part || part.status !== 'finding') return;
  if (!finder || finder.status === 'dead') { part.status = 'loose'; return; }
  if (optionId === 'give') {
    const to = targetId && findRacerAnywhere(ctx.state, targetId);
    if (to && to.status !== 'dead' && to.id !== finder.id) {
      giveTo(ctx, part, to, 'given', { from: finder });
      addWorthiness(finder, RULES.worthiness.givePart, ctx);
      finder.helps = (finder.helps ?? 0) + 1;
      hint(finder, 'given', { part: part.name, to: to.name }, ctx);
      if (to.tier === 'pc') hint(to, 'received', { part: part.name, from: finder.name }, ctx);
      return;
    }
    optionId = 'keep'; // they rode off before you could: you keep it
  }
  const hidden = optionId === 'hide';
  giveTo(ctx, part, finder, 'found', { hidden });
  hint(finder, hidden ? 'hidden' : 'kept', { part: part.name }, ctx);
}

/** A canon racer or the NPC field finds a part (no prompt). */
export function resolveOtherFind(ctx, part, finder) {
  if (finder === 'npc') {
    const npc = castNpc(ctx);
    if (!npc) { part.status = 'loose'; return; }
    ctx.usedNpcs.add(npc.id);
    // An NPC with a corpse part is someone worth following.
    const f = ctx.state.field;
    if (!npc.breakout && (f.breakouts ?? 0) < RULES.palm.breakoutCap) { npc.breakout = true; f.breakouts = (f.breakouts ?? 0) + 1; }
    giveTo(ctx, part, npc, 'found');
    return;
  }
  if (finder.status === 'dead') { part.status = 'loose'; return; }
  giveTo(ctx, part, finder, 'found');
}

/** The Devil's Palm: whoever walks out alive in a Palm stage may come out holding that stage's part. */
export function palmPart(ctx, who) {
  const part = ctx.state.corpse?.parts.find((p) => p.stage === ctx.stage?.id && p.inPalm && p.status === 'waiting');
  if (!part) return null;
  giveTo(ctx, part, who, 'palm');
  hint(who, 'palm', { part: part.name }, ctx);
  return part;
}

/** A joiner delivers a part to the President (valentine.js decides the reward). */
export function deliverPart(ctx, item, from) {
  const part = partById(ctx.state, item.partId);
  if (part) giveTo(ctx, part, 'president', 'delivered', { item, from });
}

/** Give a part away from the phone (through a trade offer): +15 instead of help. */
export function partGiftWorthiness(ctx, giver) {
  addWorthiness(giver, RULES.worthiness.givePart, ctx);
}

/** A hidden part is held after all (Items → Hold it): it merges this round. */
export function holdHidden(ctx, item) {
  item.hidden = false;
  queueMerge(ctx, item);
}

/**
 * A part settles into its holder at the end of the NEXT round, so a
 * rejection never lands right after the line where it changed hands.
 */
function queueMerge(ctx, item) {
  (ctx.state.race.mergeQueue ??= []).push({ id: item.id, due: (ctx.state.race.roundNo ?? 0) + 1 });
}

// ------------------------------------------------------------ merging

export function rejectionChance(worthiness = 50) {
  return (C().rejection.find((b) => worthiness >= b.min) ?? C().rejection.at(-1)).p / 100;
}

function mortalNow(ctx, who) {
  if (deathProof(ctx, who)) return false;
  return !(who.tier === 'canon' && RULES.canonImmuneStages.includes(ctx.stage?.id));
}

/**
 * End of the round: every part that came to someone and isn't hidden merges,
 * or rejects them (two thirds die, the rest lose it). Returns stream lines.
 */
export function processMerges(ctx, { all = false } = {}) {
  const lines = [];
  const now = ctx.state.race.roundNo;
  const queue = (ctx.state.race.mergeQueue ?? []).filter((q) => all || q.due <= now);
  ctx.state.race.mergeQueue = (ctx.state.race.mergeQueue ?? []).filter((q) => !queue.includes(q));
  for (const { id } of queue) {
    const item = (ctx.state.items ?? []).find((i) => i.id === id);
    if (!item || item.hidden || item.merged) continue;
    const who = findRacerAnywhere(ctx.state, item.owner);
    const part = partById(ctx.state, item.partId);
    if (!who || !part || who.status === 'dead') continue;
    const w = who.worthiness ?? 50;
    const band = C().rejection.find((b) => w >= b.min)?.min ?? 0;
    if (ctx.rng.chance(rejectionChance(w))) {
      if (ctx.rng.chance(C().rejectionDeath) && mortalNow(ctx, who)) {
        const L = ctx.rng.pick(PART_LINES.rejected);
        log(ctx, part, 'rejected-death', { to: who.id, toTier: who.tier, worthiness: w, band });
        const text = render(L.text, displayRoles({ a: who }));
        if (who.tier === 'npc') npcDies(ctx, who, null);
        else killRacer(ctx, who, L.cause, null);
        if (who.death) who.death.secretCause = 'rejected by a corpse part'; // M6 secrets reveal
        lines.push({
          eventId: 'corpse-rejected', text, ids: who.tier === 'npc' ? [] : [who.id],
          names: who.tier === 'npc' ? [] : [{ name: who.name, tier: who.tier }],
          minor: false, death: true, tags: [], side: who.tier === 'npc' && !who.breakout, after: true,
        });
        continue;
      }
      log(ctx, part, 'rejected-lost', { to: who.id, toTier: who.tier, worthiness: w, band });
      hint(who, 'lost', { part: part.name }, ctx);
      makeLoose(ctx, item, 'rejected');
      continue;
    }
    item.merged = true;
    log(ctx, part, 'merged', { to: who.id, toTier: who.tier, worthiness: w, band });
    if (who.valentine?.joined) addHint(who, 'The President wants what you carry. His agents will hunt you until you deliver it.', ctx);
    if (who.tier === 'pc') {
      hint(who, 'merged', { part: part.name }, ctx);
      ctx.state.corpse.announce.push(PART_LINES.worthy);
    }
    // A Standless holder may awaken a Stand (corpse odds). Canon racers keep their own story.
    if (!who.stand && who.tier !== 'canon') {
      const st = awakenStand(ctx, who, 'corpse');
      if (st && who.tier === 'pc') addHint(who, PART_HINTS.stand, ctx);
    }
  }
  return lines;
}

/** The Finish Line: anything still loose (or never found) is recovered for the President. */
export function corpseFinishLine(ctx) {
  const seekers = (ctx.state.canon ?? []).filter((c) => ['johnny', 'gyro'].includes(c.canonId) && c.status === 'racing');
  for (const p of ctx.state.corpse?.parts ?? []) {
    if (p.status === 'loose' || (p.status === 'waiting' && p.stage <= ctx.stage.id)) {
      // Johnny and Gyro collect the Corpse too (milestone 6b): they get a share of what's left.
      if (seekers.length && ctx.rng.chance(RULES.finale.canonShare)) { giveTo(ctx, p, ctx.rng.pick(seekers), 'canon-share'); continue; }
      // A dead President recovers nothing: it stays where it fell.
      if (ctx.state.race.fv?.dead) continue;
      p.status = 'president';
      log(ctx, p, 'president', { how: 'unclaimed' });
    }
  }
}

/** Anonymous host lines queued this round (merges; joining Valentine), as Main Story lines. */
export function announcements(state) {
  // Once per round each, however many merged or joined (milestone 7a).
  const out = [...new Set(state.corpse?.announce ?? [])].map((text) => ({
    eventId: 'announce', text, ids: [], names: [], minor: false, death: false, tags: ['announce'], side: false, announce: true,
  }));
  if (state.corpse) state.corpse.announce = [];
  return out;
}

/**
 * Who holds what, for the sim and the M6 Final Stage / secrets reveal.
 * holders: [{ id, name, tier, parts: [name] }], president: n.
 */
export function corpseSummary(state) {
  const by = new Map();
  for (const it of (state.items ?? []).filter((i) => i.kind === 'part')) {
    const r = findRacerAnywhere(state, it.owner);
    if (!r) continue;
    const row = by.get(r.id) ?? { id: r.id, name: r.name, tier: r.tier, status: r.status, parts: [] };
    row.parts.push(it.label);
    by.set(r.id, row);
  }
  return { holders: [...by.values()].sort((a, b) => b.parts.length - a.parts.length), president: presidentParts(state) };
}

