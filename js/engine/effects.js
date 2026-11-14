// What an event can DO to the racers in it. Each key in an event's
// `effects` maps to a handler here. Later milestones add handlers
// (worthiness, gainPart, stand, ally, ...) without changing the event format.
// The content linter rejects keys that aren't registered, so typos fail fast.
//
// Each handler:
//   fits(ctx, who, value)        -> may this effect happen to `who`? (used
//                                   while picking events and casting roles)
//   apply(ctx, who, value, roles) -> make it happen
//
// `who` is a named racer (tier 'pc' | 'canon') or an NPC (tier 'npc').

import RULES from '../../data/rules.js';
import { killRacer, retireRacer } from './racers.js';
import { npcDies, npcRetires } from './field.js';

export const EFFECTS = {
  // dies: '<cause shown on the Fallen screen>'. Pair with by: '<role>' for kill credit.
  dies: {
    fits: (ctx, who) =>
      who.status !== 'dead' && !(who.tier === 'canon' && RULES.canonImmuneStages.includes(ctx.stage.id)),
    apply: (ctx, who, cause, roles, effects) => {
      const killer = effects.by ? roles[effects.by] : null;
      if (killer) killer.kills = (killer.kills ?? 0) + 1;
      if (who.tier === 'npc') npcDies(ctx, who);
      else killRacer(ctx, who, cause, killer);
    },
  },

  // by: '<role>'  kill credit for `dies` (handled there).
  by: { fits: () => true, apply: () => {} },

  // sparedBy: '<role>'. This racer was beaten and let go; credits the spare
  // (Most Merciful award; fights in milestone 5 use this too).
  sparedBy: {
    fits: () => true,
    apply: (ctx, who, role, roles) => {
      const spareer = roles[role];
      if (spareer) spareer.spares = (spareer.spares ?? 0) + 1;
    },
  },

  // retires: true. Out of the points race, still in the story.
  retires: {
    fits: (ctx, who) => who.status === 'racing',
    apply: (ctx, who) => (who.tier === 'npc' ? npcRetires(ctx, who) : retireRacer(ctx, who)),
  },

  // injured: true. Placement penalty for the rest of this stage.
  injured: {
    fits: (ctx, who) => who.status !== 'dead',
    apply: (ctx, who) => { who.injured = true; },
  },

  // heal: true. Clears an injury.
  heal: {
    fits: () => true,
    apply: (ctx, who) => { who.injured = false; },
  },

  // pace: +n / -n. Adds to this stage's placement score.
  pace: {
    fits: () => true,
    apply: (ctx, who, n) => { if (who.tier !== 'npc') who.pace += n; },
  },

  // points: +n / -n. Bonuses and penalties (sprints, saves, sabotage...).
  points: {
    fits: () => true,
    apply: (ctx, who, n) => { if (who.tier !== 'npc') who.points += n; },
  },

  // horse: 'dies'. The horse is lost; the Rider continues on foot.
  // Runners and riders already on foot can't be cast into these.
  horse: {
    fits: (ctx, who) => who.tier === 'npc' || (who.mount === 'horse' && !who.onFoot),
    apply: (ctx, who) => {
      if (who.tier === 'npc') return;
      who.onFoot = true;
      who.lostHorse = who.horse;
    },
  },
};

export const EFFECT_KEYS = Object.keys(EFFECTS);
