// Named racers: PCs (human or AI) and canon racers share one shape so the
// engine treats them the same. PCs keep their race fields on the player
// object; canon racers live in state.canon.
import RULES from '../../data/rules.js';
import CANON from '../../data/canon-racers.js';
import { readyPlayers } from './state.js';
import { STAND_BY_ID } from '../../data/stands.js';
import { standOwnerDied } from './stands.js';

/**
 * Called on every death (named racers and NPCs): (ctx, who, killer | null).
 * Milestone 5b: a holder's corpse parts go to their killer or back onto the trail.
 */
export const DEATH_HOOKS = [];

/** Fields every named racer has during a race. */
function raceFields({ tier, skill, mount, horse, worthiness }) {
  return {
    tier,
    status: 'racing', // 'racing' | 'retired' | 'dead'
    skill,
    mount, // 'horse' | 'runner'
    horse: mount === 'horse' ? horse : null,
    onFoot: false,
    pace: 0, // this stage
    injured: false, // this stage
    points: 0,
    kills: 0,
    spares: 0,
    placements: [], // [{ stage, rank }]
    rankHistory: [], // overall standings rank after each stage (comeback award)
    death: null, // { cause, stage, round, by }
    retiredAt: null,
    worthiness, // hidden 0–100 (milestone 4 shows it); never in a public view
    plan: null, // this stage's Stage Plan id (PCs)
    rival: null, // Hunt a rival: { targetId, done }
    palmQuest: null, // Seek the Devil's Palm: { done }
    stand: null, // see stands.js; never in a public view until revealed
    // milestone 5
    horseQuality: null, // 'nag' | 'sound' | 'fine' | 'thoroughbred' (horses.js)
    horseBase: null,    // canon: their first horse's quality (already in their skill)
    horsesLost: 0,
    secondHorseDecision: false, // lost a second horse: retire or go on? (next window)
    ally: null,         // id of the one racer they ride with (alliances)
    fights: 0,
    helps: 0,
  };
}

export function initPcRacer(player, horse, worthiness) {
  Object.assign(player, raceFields({
    tier: 'pc', skill: RULES.placement.pcSkill, mount: player.mount ?? 'horse', horse, worthiness,
  }));
}

/** Starting Worthiness: PCs by personality (rules.worthiness.byPersonality), others by tier range. */
export function startWorthiness(rng, tier, personality) {
  const W = RULES.worthiness;
  if (tier === 'pc' && W.byPersonality[personality] != null) return W.byPersonality[personality];
  const [lo, hi] = W.start[tier];
  return rng.int(lo, hi);
}

/**
 * Change hidden Worthiness, clamped to 0–100. With `ctx`, a change of
 * rules.worthiness.hintAt or more (softHintAt for a softer line) gives a PC a private phone hint, so people
 * notice without seeing a number.
 */
export function addWorthiness(who, n, ctx) {
  if (who?.worthiness == null || !n) return;
  const before = who.worthiness;
  // Diminishing gains near the top: the saints don't get there for free.
  if (n > 0 && who.worthiness > RULES.worthiness.halfAbove) n = Math.floor(n / 2);
  if (!n) return;
  who.worthiness = Math.max(0, Math.min(100, who.worthiness + n));
  if (!ctx || who.worthiness === before) return;
  // n is the applied change (after halving above 80), so halved gains still get a line.
  const W = RULES.worthiness;
  if (Math.abs(n) >= W.hintAt) addHint(who, n > 0 ? 'You feel lighter in the saddle.' : 'Something in you hardens.', ctx);
  else if (Math.abs(n) >= W.softHintAt) addHint(who, n > 0 ? 'You feel steady.' : 'Something nags at you.', ctx);
}

/** A private line on this PC's phone (shown after the round's reveal). */
export function addHint(racer, text, ctx) {
  if (racer?.tier !== 'pc') return;
  (racer.hints ??= []).push({ text, stage: ctx?.stage?.id ?? 0, round: ctx?.roundLabel ?? '' });
  if (racer.hints.length > 12) racer.hints.splice(0, racer.hints.length - 12);
}

export function makeCanonRacer(def, horse, worthiness) {
  return {
    id: 'c-' + def.id,
    canonId: def.id,
    name: def.name,
    pronouns: def.pronouns,
    personality: def.personality,
    lean: def.lean ?? {},
    rivals: def.rivals ?? null,
    side: def.side ?? null,
    luck: def.luck ?? 0,
    picture: null,
    animal: def.animal ?? null, // 'camel' (Avdul); text says camel, not horse
    palm: !!def.palm,           // may walk into a Devil's Palm
    canonStand: def.stand ?? null,
    ...raceFields({
      tier: 'canon', skill: def.skill, mount: def.mount,
      horse: def.animal ? null : def.horse ?? horse, worthiness: def.worthiness ?? worthiness,
    }),
  };
}

/** Canon racers who start with their Stand get it now (Johnny and Diego awaken theirs mid-race). */
export function canonStartingStand(racer) {
  const def = STAND_BY_ID[racer.canonStand];
  if (!def || def.awakens) return null;
  return def;
}

export function canonDefs(state) {
  return CANON.filter((c) => state.settings.canon?.[c.id] !== false);
}

/** Every named racer: PCs then canon. */
export function namedRacers(state) {
  return [...readyPlayers(state), ...(state.canon ?? [])];
}

/** Any racer by id, including tracked NPCs (breakouts, pack leaders). */
export function findRacerAnywhere(state, id) {
  return findRacer(state, id)
    ?? state.field?.packLeaders.find((n) => n.id === id)
    ?? state.field?.kept.find((n) => n.id === id)
    ?? null;
}

export function findRacer(state, id) {
  return namedRacers(state).find((r) => r.id === id);
}

export function killRacer(ctx, who, cause, killer) {
  who.status = 'dead';
  who.death = {
    cause,
    stage: ctx.stage.id,
    round: ctx.roundLabel,
    by: killer ? killer.name : null,
  };
  ctx.result.deaths.push(who.id);
  const fallen = { id: who.id, name: who.name, tier: who.tier, cause, by: killer?.name ?? null, stage: ctx.stage.id, round: ctx.roundLabel };
  ctx.state.race.fallenSince.push(fallen);
  ctx.state.race.memorial.push(fallen);
  standOwnerDied(ctx.state, who);
  for (const hook of DEATH_HOOKS) hook(ctx, who, killer);
  // An alliance ends quietly with a death.
  if (who.ally) {
    const other = findRacerAnywhere(ctx.state, who.ally);
    if (other?.ally === who.id) other.ally = null;
    who.ally = null;
    (ctx.state.race.allyLog ??= []).push({ event: 'ended', tier: who.tier, stage: ctx.stage?.id });
  }
}

export function retireRacer(ctx, who) {
  who.status = 'retired';
  who.retiredAt = { stage: ctx.stage.id, round: ctx.roundLabel };
}
