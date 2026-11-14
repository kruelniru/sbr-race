// Named racers: PCs (human or AI) and canon racers share one shape so the
// engine treats them the same. PCs keep their race fields on the player
// object; canon racers live in state.canon.
import RULES from '../../data/rules.js';
import CANON from '../../data/canon-racers.js';
import { readyPlayers } from './state.js';

/** Fields every named racer has during a race. */
function raceFields({ tier, skill, mount, horse }) {
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
    placements: [], // [{ stage, rank }]
    death: null, // { cause, stage, round, by }
    retiredAt: null,
  };
}

export function initPcRacer(player, horse) {
  Object.assign(player, raceFields({
    tier: 'pc', skill: RULES.placement.pcSkill, mount: player.mount ?? 'horse', horse,
  }));
}

export function makeCanonRacer(def, horse) {
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
    ...raceFields({ tier: 'canon', skill: def.skill, mount: def.mount, horse: def.horse ?? horse }),
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
  ctx.state.race.fallenSince.push({
    id: who.id, name: who.name, tier: who.tier, picture: who.picture ?? null, cause,
    by: killer?.name ?? null,
  });
}

export function retireRacer(ctx, who) {
  who.status = 'retired';
  who.retiredAt = { stage: ctx.stage.id, round: ctx.roundLabel };
}
