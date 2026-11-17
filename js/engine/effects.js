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
import { killRacer, retireRacer, addWorthiness } from './racers.js';
import { npcDies, npcRetires } from './field.js';
import { palmBand, palmExit, palmLost, logPalm } from './palm.js';
import { loseHorse, giveHorse, canHaveHorse, hasHorse, takeHorse, newHorseName, log as logHorse } from './horses.js';
import { formAlliance, breakAlliance, allyOf } from './alliances.js';
import { deathProof } from './dead.js';

export const EFFECTS = {
  // dies: '<cause shown on the Fallen screen>'. Pair with by: '<role>' for kill credit.
  dies: {
    fits: (ctx, who) =>
      who.status !== 'dead' && !(who.tier === 'canon' && RULES.canonImmuneStages.includes(ctx.stage.id)) && !deathProof(ctx, who),
    apply: (ctx, who, cause, roles, effects) => {
      const killer = effects.by ? roles[effects.by] : null;
      if (killer) killer.kills = (killer.kills ?? 0) + 1;
      if (who.tier === 'npc') npcDies(ctx, who, killer);
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
      if (spareer) {
        spareer.spares = (spareer.spares ?? 0) + 1;
        addWorthiness(spareer, RULES.worthiness.spare, ctx);
      }
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

  // worthiness: +n / -n. Hidden stat (see rules.worthiness). Events tagged
  // 'help' / 'save' and kill-* tags already change it, so don't add it twice.
  worthiness: {
    fits: () => true,
    apply: (ctx, who, n) => addWorthiness(who, n, ctx),
  },

  // palm: 'out' | 'lost' | 'dies'. Devil's Palm lines in main events (canon
  // racers with palm: true, and NPCs). 'out' rolls Stand-or-nothing from the
  // Worthiness band; 'dies' only logs (pair it with dies).
  palm: {
    fits: (ctx, who) => who.status === 'racing',
    apply: (ctx, who, kind) => {
      if (kind === 'dies') return logPalm(ctx, who, 'dies');
      if (kind === 'lost') return palmLost(ctx, who);
      const b = palmBand(who.worthiness);
      palmExit(ctx, who, ctx.rng.chance(b.stand / (b.stand + b.nothing)) ? 'stand' : 'nothing');
    },
  },

  // horse: 'dies'. The horse is lost; the Rider continues on foot.
  // Runners and riders already on foot can't be cast into these.
  horse: {
    fits: (ctx, who) => who.tier === 'npc' || (who.mount === 'horse' && !who.onFoot),
    apply: (ctx, who) => {
      if (who.tier === 'npc') return;
      loseHorse(ctx, who);
    },
  },

  // horseGiven: true. The Rider gives their horse away (a hard choice, milestone 7b): on foot, no loss counted.
  horseGiven: {
    fits: (ctx, who) => who.tier !== 'npc' && hasHorse(who),
    apply: (ctx, who) => { loseHorse(ctx, who, { counts: false, how: 'given' }); },
  },

  // getHorse: 'riderless'. An on-foot Rider catches a horse (a dead racer's).
  getHorse: {
    fits: (ctx, who) => who.tier !== 'npc' && canHaveHorse(who) && who.onFoot,
    apply: (ctx, who) => {
      const q = ctx.rng.weighted(Object.entries(RULES.horses.riderless), ([, w]) => w)[0];
      giveHorse(who, newHorseName(ctx.state, ctx.rng), q);
      logHorse(ctx.state, { event: 'riderless', id: who.id, tier: who.tier });
    },
  },

  // breakAlly: 'abandoned' | 'betrayed'. This racer ends their alliance (−12 Worthiness).
  breakAlly: {
    fits: (ctx, who) => !!who.ally,
    apply: (ctx, who, kind) => breakAlliance(ctx, who, kind),
  },

  // stolenBy: '<role>'. That racer takes this racer's horse.
  stolenBy: {
    fits: (ctx, who) => who.tier !== 'npc' && hasHorse(who),
    apply: (ctx, who, role, roles) => takeHorse(ctx, roles[role], who),
  },

  // ally: '<role>'. This racer and that one now ride together (alliances.js).
  ally: {
    fits: (ctx, who, role) => !who.ally,
    apply: (ctx, who, role, roles) => formAlliance(ctx, who, roles[role], 'event'),
  },
};

export const EFFECT_KEYS = Object.keys(EFFECTS);
