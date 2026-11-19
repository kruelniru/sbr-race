// The secrets reveal (milestone 6c, DESIGN.md → The ending sequence, step 6).
// The last and biggest moment: after the memorial, card by card on the host.
// Every section here is a finale section (finale.js registerFinaleSection),
// rendered by js/host/race-view.js FINALE_RENDERERS under the same id.
//
//   secrets-title       "The secrets of the Steel Ball Run"
//   secrets-valentine   who joined Valentine (and which side they ended on), the riders in dark hats unmasked
//   secrets-worthiness  every PC's Worthiness bar and word (no numbers)
//   secrets-corpse-1/2  each corpse part's journey
//   secrets-stands      where each Stand came from
//   secrets-deaths      the real cause of every vague death
//   secrets-requiem     milestone 7c: who held a Requiem, which Stand, when (a card of its own)
//   secrets-finale      the main ending, the Corpse Holder's story, D4C and Valentine's death
//
// It also builds each player's own story for their phone (`storyFor`).

import { registerFinaleSection } from './finale.js';
import { namedRacers, findRacerAnywhere } from './racers.js';
import { corpseSummary } from './corpse.js';
import { worthinessLevel } from './race.js';
import { ENDINGS } from './endings.js';
import { standings } from './placement.js';
import { STAND_BY_ID } from '../../data/stands.js';

const STAND_FLAVOR = (name) => Object.values(STAND_BY_ID).find((s) => s.name === name)?.flavor ?? '';

export function worthWord(level) {
  if (level >= 16) return 'The Saint is watching';
  if (level >= 12) return 'Worthy';
  if (level >= 8) return 'Unproven';
  if (level >= 4) return 'Doubtful';
  return 'Unworthy';
}

const nameOf = (state, id) => findRacerAnywhere(state, id)?.name ?? 'a rider from the pack';
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const STAND_SOURCES = {
  palm: "the Devil's Palm", arrow: 'a Stand Arrow', corpse: 'a corpse part', valentine: "Valentine's gift", awaken: 'awakened on the trail',
  d4c: 'another world (D4C)', requiem: 'the Requiem Arrow', cheat: 'the cheat menu',
};

export const VALENTINE_OUTCOMES = {
  won: 'rode on the winning side', lost: 'rode for the losing side', dead: 'rode for a dead man',
  betrayed: 'was betrayed by another rider', traitor: 'betrayed the President and kept the Corpse',
};

const YOUR_OUTCOMES = {
  won: 'rode on the winning side', lost: 'rode for the losing side', dead: 'rode for a dead man',
  betrayed: 'another rider betrayed the President', traitor: 'betrayed him, and kept the Corpse',
};

/** One part's journey, as a short line: "found by Kruel → stolen by Gus Shaw → the President". */
export function partStory(state, partId) {
  const steps = [];
  for (const e of state.corpse?.log ?? []) {
    if (e.part !== partId) continue;
    const to = e.to ? nameOf(state, e.to) : null;
    const from = e.from ? nameOf(state, e.from) : null;
    switch (e.event) {
      case 'found': steps.push(`found by ${to} (Stage ${e.stage})`); break;
      case 'palm': steps.push(`carried out of the Devil's Palm by ${to}`); break;
      case 'given': steps.push(`given to ${to}${from ? ` by ${from}` : ''}`); break;
      case 'traded': steps.push(`traded to ${to}`); break;
      case 'stolen': steps.push(`stolen by ${to} in the night`); break;
      case 'fight': steps.push(`taken by ${to} in a fight`); break;
      case 'from-body': steps.push(`taken from ${from}'s body by ${to}`); break;
      case 'bring-down': steps.push(`torn from ${from} by ${to}`); break;
      case 'canon-share': steps.push(`picked up by ${to}`); break;
      case 'rejected-death': steps.push(`rejected ${to}, who died`); break;
      case 'loose':
        if (e.how === 'rejected') steps.push(`rejected ${from}`);
        else if (e.how === 'dropped') steps.push(`dropped when ${from} died`);
        else if (e.how === 'president-died') steps.push('fell when the President died');
        else steps.push('came loose');
        break;
      case 'president':
        steps.push({
          unclaimed: "recovered by the President's agents", fight: from ? `taken from ${from} by agents` : 'taken by agents',
          delivered: `delivered to the President by ${from}`, valentine: from ? `taken from ${from} by Funny Valentine` : 'taken by Funny Valentine',
          'from-body': `taken by agents from ${from}'s body`,
        }[e.how] ?? 'taken by the President');
        break;
      default: break; // merged, rejected-lost (covered by 'loose')
    }
  }
  return steps;
}

function partsSection(state, from, to) {
  const parts = (state.corpse?.parts ?? []).slice(from, to);
  if (!parts.length) return null;
  const held = new Map((state.items ?? []).filter((i) => i.kind === 'part').map((i) => [i.partId, i.owner]));
  return {
    parts: parts.map((p) => {
      const owner = held.get(p.id);
      const end = owner ? `held by ${nameOf(state, owner)}` : p.status === 'president' ? 'the President' : 'lost on the trail';
      const steps = partStory(state, p.id);
      return { name: cap(p.name), story: steps.length ? `${steps.join(' → ')} → ${end}` : end, holder: owner ?? null };
    }),
  };
}

registerFinaleSection({ id: 'secrets-title', order: 100, build: () => ({}) });

registerFinaleSection({
  id: 'secrets-valentine', order: 101,
  build: (state) => {
    const joiners = namedRacers(state).filter((r) => r.valentine?.joined);
    if (!joiners.length) return null;
    const errands = (state.race.valentineLog ?? []).filter((e) => e.event === 'errand' && e.from);
    const riders = state.race.fv?.riders ?? [];
    return {
      joiners: joiners.map((r) => ({
        id: r.id, name: r.name, stage: r.valentine.stage, outcome: VALENTINE_OUTCOMES[r.valentine.outcome] ?? '',
        delivered: r.valentine.delivered ?? 0, dead: r.status === 'dead',
      })),
      unmasked: [
        ...errands.map((e) => `The rider in the dark hat who ambushed ${nameOf(state, e.to)} in Stage ${e.stage} was ${nameOf(state, e.from)}.`),
        ...(riders.length ? [`Riding at Funny Valentine's side in the Final Stage: ${riders.map((id) => nameOf(state, id)).join(' and ')}.`] : []),
      ],
    };
  },
});

registerFinaleSection({
  id: 'secrets-worthiness', order: 102,
  build: (state) => ({
    racers: state.players.filter((p) => p.hasCharacter).map((p) => {
      const level = worthinessLevel(p.worthiness);
      return { id: p.id, name: p.name, level, word: worthWord(level), dead: p.status === 'dead' };
    }).sort((a, b) => b.level - a.level),
  }),
});

registerFinaleSection({ id: 'secrets-corpse-1', order: 103, build: (state) => partsSection(state, 0, 5) });
registerFinaleSection({ id: 'secrets-corpse-2', order: 104, build: (state) => partsSection(state, 5, 9) });

registerFinaleSection({
  id: 'secrets-stands', order: 105,
  build: (state) => {
    const log = (state.stands?.log ?? []).filter((e) => e.source !== 'canon');
    if (!log.length) return null;
    // Milestone 7c: Acts it grew into after (Echoes Act 1 → Echoes Act 2 …).
    const acts = state.stands.acts ?? [];
    return { users: log.map((e, i) => {
      const next = log.slice(i + 1).find((x) => x.racerId === e.racerId);
      const evolved = acts.filter((a) => a.racerId === e.racerId && a.stage >= e.stage && (!next || a.stage <= next.stage)).map((a) => `${a.to} (Stage ${a.stage})`);
      return { id: e.racerId, name: findRacerAnywhere(state, e.racerId)?.name ?? e.name, stand: e.stand, tier: e.tier, source: STAND_SOURCES[e.source] ?? e.source, evolved };
    }) };
  },
});

registerFinaleSection({
  id: 'secrets-deaths', order: 106,
  build: (state) => {
    const rows = [];
    for (const r of [...namedRacers(state), ...state.field.kept]) {
      const d = r.death;
      if (!d) continue;
      if (d.secretCause) rows.push({ id: r.id, name: r.name, shown: d.cause, real: d.secretCause });
      if (d.secretBy) rows.push({ id: r.id, name: r.name, shown: `${d.cause}, by a rider in a dark hat`, real: `killed by ${d.secretBy}, riding for Valentine` });
    }
    return rows.length ? { rows } : null;
  },
});

// Milestone 7c: the Requiem gets a card of its own, the biggest secret of the night.
registerFinaleSection({
  id: 'secrets-requiem', order: 106.5,
  build: (state) => {
    const qs = state.race.requiems ?? [];
    const refused = state.race.requiemRefused ?? [];
    if (!qs.length && !refused.length) return null;
    return {
      holders: qs.map((q) => {
        const r = findRacerAnywhere(state, q.id);
        return { id: q.id, name: q.name, stand: q.stand, from: q.from, stage: q.stage, cheat: q.source === 'cheat', dead: r?.status === 'dead', flavor: STAND_FLAVOR(q.stand) };
      }),
      refused: refused.map((x) => `In Stage ${x.stage}, ${nameOf(state, x.id)} drove a Requiem Arrow at ${x.stand}. The Arrow refused.`),
      crafted: (state.race.requiemArrows ?? []).map((x) => `In Stage ${x.stage}, ${nameOf(state, x.id)} combined a Stand Arrow and two Rokakaka into a Requiem Arrow.`),
    };
  },
});

registerFinaleSection({
  id: 'secrets-finale', order: 107,
  build: (state) => {
    const lines = [];
    const e = state.race.ending;
    const fv = state.race.fv;
    const boss = state.race.boss;
    if (boss) lines.push(`Going into the Final Stage, the Saint's Corpse chose ${boss.name}${boss.loveTrain ? ', with Love Train' : ''}${boss.joiner ? ', who secretly rode for Valentine' : ''}.`);
    const d4c = state.race.d4c;
    if (d4c) lines.push(`Dirty Deeds Done Dirt Cheap: going into the Final Stage, Funny Valentine brought ${d4c.name} back from another world to ride for him. ${d4c.stayed ? 'The President won, so they stayed in this world.' : 'When it was over, they faded back into death.'}`);
    if (e?.id === 'saint') lines.push(`${e.winnerName} held all nine parts of the Saint's Corpse at Trinity Church.`);
    if (fv?.beatenBy) lines.push(`${nameOf(state, fv.beatenBy)} beat Funny Valentine in the Final Stage. Dirty Deeds Done Dirt Cheap: the Valentine who came back was from another world.`);
    if (fv?.dead) lines.push(`The other Valentine was killed by ${fv.killers.map((id) => nameOf(state, id)).join(' and ')}. No world was left for him to run to.`);
    // The Corpse Holder's story: how the top holder came by each part.
    const sum = corpseSummary(state);
    const top = sum.holders[0];
    if (top) {
      const items = (state.items ?? []).filter((i) => i.kind === 'part' && i.owner === top.id);
      const how = items.map((i) => {
        const GOT = ['found', 'palm', 'given', 'traded', 'stolen', 'fight', 'from-body', 'bring-down', 'canon-share'];
        const last = [...(state.corpse.log ?? [])].reverse().find((x) => x.part === i.partId && x.to === top.id && GOT.includes(x.event));
        const how = { found: 'found {p}', palm: 'carried {p} out of the Palm', given: 'was given {p}', traded: 'traded for {p}', stolen: 'stole {p}', fight: 'took {p} in a fight', 'from-body': 'took {p} from a body', 'bring-down': 'tore {p} from the boss', 'canon-share': 'picked up {p}' }[last?.event] ?? 'came by {p}';
        return how.replace('{p}', i.label);
      });
      lines.push(`The Corpse Holder, ${top.name}, ${how.length > 1 ? `${how.slice(0, -1).join(', ')} and ${how.at(-1)}` : how[0]}.`);
    }
    lines.push(`The President ended with ${sum.president} ${sum.president === 1 ? 'part' : 'parts'}.`);
    // What the dead left behind (milestone 7a).
    for (const it of state.race.itemLog ?? []) {
      const what = it.kind === 'arrow' ? 'Stand Arrow' : 'Rokakaka';
      lines.push(it.event === 'taken'
        ? `${nameOf(state, it.to)} took ${nameOf(state, it.from)}'s ${what}.`
        : `${nameOf(state, it.from)}'s ${what} was lost on the trail in Stage ${it.stage}, for someone else to find.`);
    }
    const def = e && ENDINGS[e.id];
    return { ending: def ? def.title : 'The race ended like any other', lines };
  },
});

/**
 * One player's own story, for their phone at the very end (only after the
 * last reveal). Their own secrets only.
 */
export function storyFor(state, p) {
  if (!state.race?.over) return null;
  const lines = [];
  const finalRank = standings(state).findIndex((r) => r.id === p.id) + 1;
  if (p.status === 'racing') lines.push(`You reached New York with ${p.points} points: ${ordinalOf(finalRank)} overall.`);
  else if (p.status === 'retired') lines.push(`You retired in Stage ${p.retiredAt?.stage}, with ${p.points} points.`);
  else lines.push(`You fell in Stage ${p.death?.stage}: ${p.death?.secretCause ?? p.death?.cause}${p.death?.secretBy ? `, by ${p.death.secretBy}` : p.death?.by ? `, by ${p.death.by}` : ''}.`);
  const best = [...(p.placements ?? [])].sort((a, b) => a.rank - b.rank)[0];
  if (best) lines.push(`Your best stage: ${ordinalOf(best.rank)} in Stage ${best.stage}.`);
  lines.push(`Kills: ${p.kills ?? 0} · Spared: ${p.spares ?? 0} · Helped: ${p.helps ?? 0}`);
  const st = (state.stands?.log ?? []).filter((e) => e.racerId === p.id);
  if (st.length) for (const e of st) lines.push(`Your Stand: ${e.stand} (${e.tier}), from ${STAND_SOURCES[e.source] ?? e.source}${p.stand?.id === e.standId ? '' : ' (you gave it up)'}.`);
  else lines.push('You never awakened a Stand.');
  const touched = new Set((state.corpse?.log ?? []).filter((e) => e.to === p.id).map((e) => e.part));
  const holding = (state.items ?? []).filter((i) => i.kind === 'part' && i.owner === p.id).map((i) => i.label);
  if (touched.size) lines.push(`You held ${touched.size} corpse ${touched.size === 1 ? 'part' : 'parts'} during the race${holding.length ? `, and ended with ${holding.join(', ')}` : ', and ended with none'}.`);
  if (p.otherWorld) lines.push(`Funny Valentine brought you back from another world for the Final Stage. ${p.otherWorld.stayed ? 'He won, and you stayed in this world.' : 'When it ended, you faded back into death.'}`);
  else if (p.valentine?.joined) lines.push(`You joined Valentine in Stage ${p.valentine.stage}, and ${YOUR_OUTCOMES[p.valentine.outcome] ?? 'rode for him'}.`);
  const TALK = { corpse: 'asked about the Corpse, and he told you where to look', more: 'asked for more, and he paid, and trusted you less', 'question-plans': 'questioned him, and he told you what he wanted', 'question-d4c': 'questioned him, and he hinted he could be in more than one place', 'question-displeased': 'questioned him, and he did not like it', swear: 'swore your loyalty' };
  for (const t of (state.race.valentineTalks ?? []).filter((x) => x.id === p.id)) lines.push(`In Stage ${t.stage}, you had a word with the President: you ${TALK[t.outcome] ?? t.topic}.`);
  for (const a of (state.stands.acts ?? []).filter((x) => x.racerId === p.id)) lines.push(`In Stage ${a.stage}, ${a.from} evolved into ${a.to}.`);
  for (const x of (state.race.requiemArrows ?? []).filter((q) => q.id === p.id)) lines.push(`In Stage ${x.stage}, you combined a Stand Arrow and two Rokakaka into a Requiem Arrow.`);
  for (const x of (state.race.requiemRefused ?? []).filter((q) => q.id === p.id)) lines.push(`In Stage ${x.stage}, the Requiem Arrow refused you.`);
  for (const q of (state.race.requiems ?? []).filter((x) => x.id === p.id)) lines.push(`In Stage ${q.stage}, ${q.source === 'cheat' ? 'the cheat menu gave you' : `you pierced ${q.from} and it became`} ${q.stand}. This was Requiem.`);
  lines.push(`Your Worthiness at the end: ${worthWord(worthinessLevel(p.worthiness))}.`);
  const e = state.race.ending;
  if (e && ENDINGS[e.id]) lines.push(`The race ended: ${ENDINGS[e.id].title}.`);
  return { name: p.name, lines };
}

function ordinalOf(n) {
  const teens = n % 100 >= 11 && n % 100 <= 13;
  return n + (teens ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
}
