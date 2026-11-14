// Named racers: PCs (human or AI) and canon racers share one shape so the
// engine treats them the same. PCs keep their race fields on the player
// object; canon racers live in state.canon.
import RULES from '../../data/rules.js';
import CANON from '../../data/canon-racers.js';
import { readyPlayers } from './state.js';

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
  };
}

export function initPcRacer(player, horse, worthiness) {
  Object.assign(player, raceFields({
    tier: 'pc', skill: RULES.placement.pcSkill, mount: player.mount ?? 'horse', horse, worthiness,
  }));
}

/** Starting Worthiness for a tier (rules.worthiness.start). */
export function startWorthiness(rng, tier) {
  const [lo, hi] = RULES.worthiness.start[tier];
  return rng.int(lo, hi);
}

/** Change hidden Worthiness, clamped to 0–100. */
export function addWorthiness(who, n) {
  if (who?.worthiness == null) return;
  who.worthiness = Math.max(0, Math.min(100, who.worthiness + n));
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
    ...raceFields({ tier: 'canon', skill: def.skill, mount: def.mount, horse: def.horse ?? horse, worthiness: def.worthiness ?? worthiness }),
  };
}

export function canonDefs(state) {
  return CANON.filter((c) => state.settings.canon?.[c.id] !== false);
}

/** Every named racer: PCs then canon. */
export function namedRacers(state) {
  return [...readyPlayers(state), ...(state.canon ?? [])];
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
}

export function retireRacer(ctx, who) {
  who.status = 'retired';
  who.retiredAt = { stage: ctx.stage.id, round: ctx.roundLabel };
}
