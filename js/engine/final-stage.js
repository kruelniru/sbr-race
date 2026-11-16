// The Final Stage (milestone 6b, DESIGN.md → Finale). Pure engine code.
//
// The boss: going into the Final Stage, the racing racer (PC, canon or NPC)
// holding the most corpse parts, at least rules.finale.bossMin, becomes the
// boss; ties go to higher Worthiness, then points. The stream learns who
// (that's the point), and nothing else about who holds parts.
//   - A boss gets +6 placement in the Final Stage.
//   - Love Train (5+ parts): nothing can kill them; a fight that would kill
//     them kills someone nearby instead ("misfortune slides off…").
//   - "Bring down": every Day/Night round of the Final Stage a few living PCs
//     (never Valentine joiners) may join one combined fight against the boss.
//     Team = average fight skill + perJoiner × joiners; the boss gets a bonus
//     (bigger with Love Train). Win: each joiner takes a part, the rest come loose.
//
// Funny Valentine in the Final Stage:
//   - With a Love Train holder, he comes for them once (joiners may secretly
//     ride with him, +5 each). He wins: every part they carry is his.
//   - Beating him in the Final Stage (here, or "Face him") makes D4C swap in
//     another-world Valentine, with a fresh group fight later that stage. A
//     second win kills him for good: his parts come loose, joiners lose their
//     rewards, and everyone who fought him gets rules.finale.valentine.killBonus.
//
// state.race.boss = { id, name, tier, loveTrain, parts, joiner } | null
// state.race.fv   = { beaten, dead, killers: [id], rematch: { due, beaterId } | null, hunt: { due } | null }
// state.race.finaleLog: [...] for the sim.

import RULES from '../../data/rules.js';
import STAGES from '../../data/stages.js';
import { namedRacers, findRacerAnywhere, addHint, killRacer } from './racers.js';
import { carried, takePart, dropPart } from './corpse.js';
import { fightScore, mortal } from './fights.js';
import { valentineFighter } from './agents.js';
import { isJoiner } from './valentine.js';
import { render } from './text.js';
import { displayRoles } from './events.js';
import { npcDies } from './field.js';

const F = () => RULES.finale;
export const FINAL_STAGE = () => STAGES.length;
const log = (state, e) => (state.race.finaleLog ??= []).push(e);

// ------------------------------------------------------------ the boss

/** Everyone who could be boss: racing PCs, canon racers and tracked NPCs. */
function contenders(state) {
  const f = state.field;
  return [...namedRacers(state), ...new Set([...f.packLeaders, ...f.kept])].filter((r) => r.status === 'racing');
}

/** At the Final Stage's Stage Plans: pick the boss and queue the announcement. */
export function chooseBoss(state) {
  const race = state.race;
  if (race.boss !== undefined) return race.boss;
  const rows = contenders(state).map((r) => ({ r, n: carried(state, r).length })).filter((x) => x.n >= F().bossMin);
  rows.sort((a, b) => b.n - a.n || (b.r.worthiness ?? 0) - (a.r.worthiness ?? 0) || (b.r.points ?? 0) - (a.r.points ?? 0));
  const top = rows[0];
  race.boss = top ? { id: top.r.id, name: top.r.name ?? 'a rider from the pack', tier: top.r.tier, loveTrain: top.n >= F().loveTrain, parts: top.n, joiner: isJoiner(top.r) } : null;
  race.fv ??= { beaten: 0, dead: false, killers: [], rematch: null, hunt: null };
  if (race.boss) {
    const b = race.boss;
    const who = top.r;
    if (who.tier === 'npc' && !who.name) who.name = b.name;
    (race.pendingNotes ??= []).push({
      eventId: 'boss', note: true, minor: false, death: false, tags: ['boss'], side: false, boss: true,
      text: b.loveTrain
        ? `The Saint's Corpse has chosen ${b.name}. Love Train: misfortune can't touch ${b.name}.`
        : `The Saint's Corpse has chosen ${b.name}. Everyone else is coming for it.`,
      ids: who.tier === 'npc' ? [] : [who.id], names: who.tier === 'npc' ? [] : [{ name: who.name, tier: who.tier }],
    });
    addHint(who, b.loveTrain ? 'Love Train. Misfortune slides off you now.' : 'The Corpse has chosen you. Hold on to it until New York.', { stage: { id: FINAL_STAGE() }, roundLabel: 'start' });
    // Funny Valentine comes for a Love Train holder once this stage.
    if (b.loveTrain) {
      const first = race.plan.slice(0, FINAL_STAGE() - 1).reduce((n, s) => n + s.types.length, 0) + 1;
      const types = race.plan[FINAL_STAGE() - 1].types;
      const rounds = types.map((t, i) => ({ t, r: first + i })).filter((x) => x.t !== 'finish').map((x) => x.r);
      race.fv.hunt = { due: rounds[0] + (rounds.length > 1 ? 1 : 0) };
    }
  }
  log(state, { event: 'boss', boss: race.boss ? { ...race.boss } : null });
  return race.boss;
}

export function bossRacer(state) {
  const b = state.race?.boss;
  return b ? findRacerAnywhere(state, b.id) : null;
}

/** Is this racer the boss, still holding enough to count? */
export function isBoss(state, r) {
  const b = state.race?.boss;
  return !!b && r?.id === b.id && carried(state, r).length >= F().bossMin;
}

/** Love Train right now: the boss in the Final Stage with 5+ parts. */
export function isLoveTrain(state, r) {
  return !!state.race?.boss?.loveTrain && r?.id === state.race.boss.id && r.status === 'racing'
    && carried(state, r).length >= F().loveTrain && state.race.stageIdx === FINAL_STAGE() - 1;
}

/** Placement bonus for the boss in the Final Stage. */
export function bossPlacement(state, r) {
  if (state.race?.stageIdx !== FINAL_STAGE() - 1 || !isBoss(state, r)) return 0;
  return isLoveTrain(state, r) ? F().loveTrainPlacement : F().bossPlacement;
}

/**
 * Love Train: a killing blow meant for the holder lands on someone nearby.
 * Returns the line fragment, or null if there was nobody to take it.
 */
export function redirectMisfortune(ctx, holder, killer) {
  const pool = namedRacers(ctx.state).filter((r) => r.status === 'racing' && r.id !== holder.id && r.id !== killer?.id && mortal(ctx, r) && !ctx.assigned?.has(r.id));
  const z = ctx.rng.pick(pool);
  if (!z) return null;
  killRacer(ctx, z, 'struck down by misfortune', null);
  if (z.death) z.death.secretCause = `Love Train: misfortune meant for ${holder.name}`;
  ctx.assigned?.add(z.id);
  log(ctx.state, { event: 'redirect', to: z.tier });
  return render(' But misfortune slides off {a} and onto {b}, who falls instead.', displayRoles({ a: holder, b: z }));
}

// ------------------------------------------------------------ group fights (Bring down; the other Valentine)

/**
 * One combined fight: a team against a single opponent.
 * team score = mean(skill + Stand + Spin) + perJoiner × team size + roll;
 * opponent = their own fight score + `bonus`. Returns { margin, team, opp }.
 */
export function teamFight(ctx, team, opponent, bonus) {
  const base = team.reduce((t, r) => t + fightScore(ctx, r).base, 0) / team.length;
  const teamScore = base + F().bring.perJoiner * team.length + ctx.rng.normal(0, RULES.fights.sd);
  const opp = fightScore(ctx, opponent, bonus).score;
  return { margin: teamScore - opp, team: teamScore, opp };
}

const names = (list) => (list.length > 1 ? `${list.slice(0, -1).map((r) => r.name).join(', ')} and ${list.at(-1).name}` : list[0]?.name ?? '');

/** Resolve a Bring-down window: the PCs who said Join fight the boss together. */
export function resolveBringDown(ctx, joinerIds) {
  const boss = bossRacer(ctx.state);
  const team = joinerIds.map((id) => findRacerAnywhere(ctx.state, id)).filter((r) => r && r.status === 'racing');
  if (!boss || boss.status !== 'racing' || !isBoss(ctx.state, boss) || !team.length) return null;
  const lt = isLoveTrain(ctx.state, boss);
  const B = F().bring;
  const f = teamFight(ctx, team, boss, lt ? B.loveTrainBonus : B.bossBonus);
  const roles = { b: boss };
  team.forEach((r, i) => { roles[`t${i}`] = r; });
  let text = `${names(team)} ${team.length > 1 ? 'ride down' : 'rides down'} ${boss.name ?? 'the holder'} to take the Saint's Corpse.`;
  let death = false;
  const entry = { event: 'bring', joiners: team.length, loveTrain: lt, bossTier: boss.tier };
  if (f.margin > 0) {
    entry.won = true;
    const items = ctx.rng.shuffle(carried(ctx.state, boss));
    for (const r of ctx.rng.shuffle([...team])) { const it = items.shift(); if (it) takePart(ctx, it, r, 'bring-down', boss); }
    for (const it of items) dropPart(ctx, it, 'bring-down');
    boss.injured = true;
    text += ` They tear it away${lt ? ', and the Love Train stops' : ''}.`;
  } else {
    entry.won = false;
    const victim = ctx.rng.pick(team);
    if (-f.margin >= RULES.fights.killMargin && mortal(ctx, victim)) {
      boss.kills = (boss.kills ?? 0) + 1;
      if (victim.tier === 'npc') npcDies(ctx, victim, boss); else killRacer(ctx, victim, 'killed going after the Corpse', boss);
      death = true;
      text += ` ${boss.name ?? 'The holder'} holds on, and ${victim.name} dies trying.`;
    } else {
      victim.injured = true;
      text += ` ${boss.name ?? 'The holder'} holds on. ${victim.name} rides away hurt.`;
    }
  }
  log(ctx.state, entry);
  return { text, roles, death };
}

// ------------------------------------------------------------ Funny Valentine

/** Has the President been killed (only possible in the Final Stage)? */
export const valentineDead = (state) => !!state.race?.fv?.dead;

/**
 * He was beaten in the Final Stage: the first time, D4C swaps in another
 * Valentine and a fresh fight comes later this stage. Returns a line fragment.
 */
export function valentineBeaten(ctx, beater) {
  const fv = (ctx.state.race.fv ??= { beaten: 0, dead: false, killers: [], rematch: null, hunt: null });
  if (ctx.stage?.id !== FINAL_STAGE() || fv.dead) return '';
  fv.beaten++;
  if (fv.beaten === 1) {
    fv.rematch = { due: ctx.state.race.roundNo + 1, beaterId: beater.id };
    fv.beatenBy = beater.id;
    log(ctx.state, { event: 'fv-beaten' });
    return ' Dirty Deeds Done Dirt Cheap: another Valentine steps out from between two flags. This isn\'t over.';
  }
  return '';
}

/** The other Valentine: the beater and anyone who joins fight him together. Win: he dies. */
export function resolveValentineRematch(ctx, teamIds) {
  const fv = ctx.state.race.fv;
  if (!fv?.rematch || fv.dead) return null;
  fv.rematch = null;
  const team = teamIds.map((id) => findRacerAnywhere(ctx.state, id)).filter((r) => r && r.status === 'racing');
  if (!team.length) { log(ctx.state, { event: 'fv-rematch', fought: false }); return null; }
  const V = F().valentine;
  const opp = valentineFighter();
  const f = teamFight(ctx, team, opp, V.rematchBonus);
  const roles = Object.fromEntries(team.map((r, i) => [`t${i}`, r]));
  let text = `${names(team)} ${team.length > 1 ? 'face' : 'faces'} the other Valentine.`;
  let death = false;
  if (f.margin > 0) {
    fv.dead = true;
    fv.killers = team.map((r) => r.id);
    for (const r of team) { r.points += V.killBonus; r.kills = (r.kills ?? 0) + 1; addHint(r, `You killed the President. +${V.killBonus} points.`, ctx); }
    // His parts come loose.
    for (const p of ctx.state.corpse?.parts ?? []) if (p.status === 'president') { p.status = 'loose'; ctx.state.corpse.log.push({ stage: ctx.stage.id, round: ctx.roundLabel, part: p.id, name: p.name, event: 'loose', how: 'president-died' }); }
    text += ' This time there is no other world to run to. Funny Valentine is dead.';
    log(ctx.state, { event: 'fv-rematch', fought: true, won: true, team: team.length });
  } else {
    const victim = ctx.rng.pick(team);
    if (-f.margin >= RULES.fights.killMargin && mortal(ctx, victim)) {
      killRacer(ctx, victim, 'killed by Funny Valentine', opp);
      death = true;
      text += ` The President wins, and ${victim.name} doesn't get up.`;
    } else {
      victim.injured = true;
      text += ` The President wins, and ${victim.name} barely gets away.`;
    }
    log(ctx.state, { event: 'fv-rematch', fought: true, won: false, team: team.length });
  }
  return { text, roles, death };
}

/** Valentine comes for the Love Train holder; joiners who said yes ride with him (+5 each). */
export function resolveValentineHunt(ctx, riderIds) {
  const fv = ctx.state.race.fv;
  fv.hunt = null;
  const holder = bossRacer(ctx.state);
  if (!holder || !isLoveTrain(ctx.state, holder) || fv.dead) return null;
  const V = F().valentine;
  const opp = valentineFighter();
  const riders = riderIds.map((id) => findRacerAnywhere(ctx.state, id)).filter((r) => r && r.status === 'racing');
  fv.riders = riders.map((r) => r.id); // secret: the M6 reveal names them
  const a = fightScore(ctx, opp, V.huntBonus + V.riderBonus * riders.length).score;
  const d = fightScore(ctx, holder, F().bring.loveTrainBonus).score;
  let text = render('Funny Valentine comes for {a} and the Corpse.', displayRoles({ a: holder }));
  if (riders.length) text += ' Riders in dark hats ride at his side.';
  const entry = { event: 'fv-hunt', riders: riders.length };
  if (a > d) {
    for (const it of carried(ctx.state, holder)) takePart(ctx, it, 'president', 'valentine', holder);
    holder.injured = true;
    text += ' He takes every part.';
    entry.won = true;
  } else {
    text += render(' {a} drives him off!', displayRoles({ a: holder }));
    text += valentineBeaten(ctx, holder);
    entry.won = false;
  }
  log(ctx.state, entry);
  return { text, roles: { a: holder }, death: false };
}

