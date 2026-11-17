// Renders the race on the host (streamed) screen. Everything shown comes from
// reveal cards, which are built from public round results; never render
// racers' private fields here (until the finale's secrets reveal, which is
// built for exactly that moment).

import STAGES from '../../data/stages.js';
import { h, avatar } from '../ui/dom.js';
import { findRacer } from '../engine/racers.js';
import { ordinal } from '../engine/finale.js';
import { choiceWaitingView } from '../engine/state.js';
import { nextRoundHeader } from '../engine/race.js';

/**
 * Renderers for extra finale sections registered in js/engine/finale.js
 * (e.g. the secrets reveal). Later milestones add: FINALE_RENDERERS.secrets = (state, data) => element
 */
const BAR = (level) => h('div', { class: 'worth-bar' }, Array.from({ length: 10 }, (_, i) => {
  const fill = Math.max(0, Math.min(1, (level - i * 2) / 2));
  return h('span', { class: 'worth-seg', style: `--fill:${fill}` });
}));
const secretsCard = (title, ...body) => h('div', { class: 'card card-finale card-secrets' }, h('div', { class: 'label' }, 'The secrets of the Steel Ball Run'), h('h2', {}, title), ...body);

export const FINALE_RENDERERS = {
  // ---- milestone 6c: the secrets reveal
  'secrets-title': () => h('div', { class: 'card card-finale card-title card-secrets' },
    h('div', { class: 'label' }, 'One last thing'),
    h('h2', { class: 'card-big' }, 'The secrets of the Steel Ball Run'),
    h('p', { class: 'hint' }, 'Everything the stream never saw.')),
  'secrets-valentine': (state, d) => secretsCard("Valentine's riders",
    h('ul', { class: 'secret-list' }, d.joiners.map((j) => h('li', {}, face(state, j.id),
      h('div', {}, h('strong', {}, j.name, j.dead ? ' ✝' : ''), h('div', { class: 'hint' }, `Joined in Stage ${j.stage}, and ${j.outcome}${j.delivered ? ` · delivered ${j.delivered} ${j.delivered === 1 ? 'part' : 'parts'}` : ''}.`))))),
    d.unmasked.length ? h('ul', { class: 'unmasked' }, d.unmasked.map((t) => h('li', {}, t))) : null),
  'secrets-worthiness': (state, d) => secretsCard('Worthiness',
    h('ul', { class: 'secret-list worth-list' }, d.racers.map((r) => h('li', {}, face(state, r.id),
      h('div', { class: 'worth-who' }, h('strong', {}, r.name, r.dead ? ' ✝' : ''), h('div', { class: 'worth' }, BAR(r.level), h('span', { class: 'worth-word' }, r.word))))))),
  'secrets-corpse-1': (state, d) => secretsCard("The Saint's Corpse", partList(d)),
  'secrets-corpse-2': (state, d) => secretsCard("The Saint's Corpse (continued)", partList(d)),
  'secrets-stands': (state, d) => secretsCard('Where the Stands came from',
    h('ul', { class: 'secret-list' }, d.users.map((u) => h('li', { class: `tier-${u.tier}` }, face(state, u.id),
      h('div', {}, h('strong', {}, u.name), h('div', { class: 'hint' }, `${u.stand}, from ${u.source}`)),
      h('span', { class: `tier-badge tier-${u.tier}` }, u.tier))))),
  'secrets-deaths': (state, d) => secretsCard('How they really died',
    h('ul', { class: 'secret-list' }, d.rows.map((r) => h('li', {}, face(state, r.id),
      h('div', {}, h('strong', {}, r.name), h('div', { class: 'hint' }, `"${r.shown}"`), h('div', {}, r.real)))))),
  'secrets-finale': (state, d) => secretsCard(d.ending,
    h('ul', { class: 'unmasked' }, d.lines.map((t) => h('li', {}, t)))),

  // Milestone 4: every Stand awakened during the race, with its tier. Never its source.
  stands: (state, data) => h('div', { class: 'card card-finale card-stands' },
    h('h2', {}, 'Stands awakened'),
    h('ul', { class: 'stand-list' }, data.users.map((u) =>
      h('li', { class: `tier-${u.standTier}` + (u.dead ? ' fallen' : '') },
        face(state, u.id),
        h('div', { class: 'stand-who' },
          h('strong', {}, u.name, u.dead ? ' ✝' : ''),
          h('div', { class: 'stand-what' }, u.stand, u.gaveUp ? h('span', { class: 'hint' }, ' (gave it up)') : null)),
        h('span', { class: `tier-badge tier-${u.standTier}` }, u.standTier)))),
  ),
};

function partList(d) {
  return h('ul', { class: 'part-list' }, d.parts.map((p) => h('li', {}, h('strong', {}, p.name), h('span', {}, p.story))));
}

/**
 * @param {object} state
 * @param {import('./race-host.js').RaceHost} rh
 */
let lastCard = null;

export function raceView(state, rh) {
  if (rh.choosing && !rh.viewing) {
    lastCard = null;
    return [raceHeader(state, rh), h('section', { class: 'race-stage' }, waitingCard(state, rh)), raceControls(state, rh)];
  }
  const card = rh.card;
  // The whole screen re-renders on any change (a phone reconnecting, a
  // setting...). Only animate a card the first time it appears, so it
  // doesn't flash on stream.
  const fresh = card !== lastCard;
  lastCard = card;
  const el = card ? renderCard(state, card) : h('p', { class: 'hint' }, 'Getting ready…');
  if (!fresh && el) el.classList.add('no-anim');
  return [
    raceHeader(state, rh),
    h('section', { class: 'race-stage' }, el),
    raceControls(state, rh),
  ];
}

/** Which stage palette the backdrop should use for the card on screen. */
export function sceneFor(state, rh) {
  const card = rh.card;
  if (card && isFinale(card)) return { stage: 'finale', night: false };
  const meta = rh.cardRound;
  if (!meta) return { stage: 0, night: false };
  return { stage: meta.stage.id, night: meta.type === 'night' };
}

const FINALE_KINDS = ['finale-title', 'podium', 'drumroll', 'no-winner', 'awards', 'survivors', 'memorial', 'extra', 'the-end'];
const isFinale = (card) => FINALE_KINDS.includes(card.kind);

function raceHeader(state, rh) {
  const meta = rh.cardRound;
  const finale = rh.card && isFinale(rh.card);
  const currentId = finale ? 10 : meta?.stage.id ?? 1;
  return h('div', { class: 'race-header' },
    h('div', { class: 'race-where' },
      finale
        ? h('span', { class: 'race-stage-name' }, 'New York · Trinity Church')
        : meta
          ? [h('span', { class: 'race-stage-name' }, `Stage ${meta.stage.id} · ${meta.stage.name}`), h('span', { class: 'race-round' }, meta.label)]
          : h('span', { class: 'race-stage-name' }, 'The Steel Ball Run'),
      rh.viewing && h('span', { class: 'viewing-tag' }, `Looking back · round ${meta?.roundNo}`),
    ),
    h('ol', { class: 'route' },
      STAGES.map((s) => h('li', {
        class: s.id < currentId ? 'done' : s.id === currentId ? 'now' : '',
        title: `${s.id}. ${s.name}`,
      }, String(s.id))),
    ),
  );
}

function raceControls(state, rh) {
  const nextLabel = rh.nextLabel();
  const atLiveEnd = !rh.viewing && rh.waiting;
  // Every control has a fixed slot, so nothing moves when a button appears or
  // disappears (a hidden button keeps its space and can't be clicked).
  const slot = (show, attrs, label) => h('button', {
    ...attrs,
    class: `${attrs.class ?? 'btn btn-small'}${show ? '' : ' slot-hidden'}`,
    disabled: !show || !!attrs.disabled,
    'aria-hidden': show ? null : 'true',
    tabindex: show ? null : '-1',
  }, label);
  const showNextRound = atLiveEnd && !!nextLabel;
  const timer = rh.timerView();
  // Waiting on a choice window: the same slots, holding the timer controls.
  if (rh.choosing && !rh.viewing) {
    return h('footer', { class: 'race-controls' },
      h('div', { class: 'control-slots' },
        slot(false, {}, '◂ Back'),
        slot(true, { onclick: () => rh.togglePause() }, timer?.paused ? '▶ Resume timer' : '❚❚ Pause timer'),
        h('div', { class: 'slot-main' }, slot(true, {
          class: 'btn btn-primary', disabled: !rh.endNowReady,
          onclick: () => { if (rh.endWindow().needsConfirm) { rh.confirmingEnd = true; rh.onChange(); } },
        }, 'End now ⏭')),
        slot(false, {}, 'Back to live ⏭'),
        slot(false, {}, 'Skip side stories ⏭'),
      ),
      settingsRow(state, rh),
      // Some humans are still deciding: never say who, or how many (secret prompts stay hidden).
      rh.confirmingEnd ? h('div', { class: 'confirm-overlay', role: 'dialog' }, h('div', { class: 'confirm-card' },
        h('p', {}, "Some players are still deciding. End now? Anyone who hasn't answered gets their ★ In character pick."),
        h('div', { class: 'confirm-actions' },
          h('button', { class: 'btn btn-primary', onclick: () => { rh.confirmingEnd = false; rh.endWindow({ confirmed: true }); rh.onChange(); } }, 'End now'),
          h('button', { class: 'btn', onclick: () => { rh.confirmingEnd = false; rh.onChange(); } }, 'Keep waiting')))) : null,
    );
  }
  return h('footer', { class: 'race-controls' },
    h('div', { class: 'control-slots' },
      slot(true, { onclick: () => rh.back(), title: 'Step back (view only)' }, '◂ Back'),
      slot(true, { onclick: () => rh.setAuto(!rh.auto) }, rh.auto ? '❚❚ Pause' : '▶ Auto'),
      h('div', { class: 'slot-main' },
        showNextRound
          ? slot(true, { class: 'btn btn-primary', onclick: () => rh.nextRound() }, nextLabel)
          : slot(!atLiveEnd, { onclick: () => rh.next() }, 'Next ▸'),
      ),
      slot(rh.viewing, { onclick: () => rh.backToLive() }, 'Back to live ⏭'),
      slot(rh.onSideStory, { onclick: () => rh.skipSide() }, 'Skip side stories ⏭'),
    ),
    settingsRow(state, rh),
    // After the game ends (never during it): the full game log, HTML + JSON.
    state.race?.over ? h('div', { class: 'export-row' },
      h('button', { class: 'btn btn-small', onclick: () => rh.exportLog() }, 'Export game log'),
      state.cheatsUsed ? h('span', { class: 'cheats-used' }, 'Cheats used') : null) : null,
  );
}

function settingsRow(state, rh) {
  const r = rh.reveal;
  const s = state.settings;
  return h('div', { class: 'control-group' },
      overlapHint(state, rh),
      h('label', { class: 'mini-setting' }, 'Speed',
        h('select', { onchange: (e) => rh.lobby.setHostSetting('revealSpeed', e.target.value) },
          ['slow', 'normal', 'fast'].map((v) => h('option', { value: v, selected: s.revealSpeed === v }, v[0].toUpperCase() + v.slice(1))))),
      h('label', { class: 'mini-setting' },
        h('input', { type: 'checkbox', checked: s.autoSkipSide, onchange: (e) => rh.lobby.setHostSetting('autoSkipSide', e.target.checked) }),
        'Skip side stories'),
      h('label', { class: 'mini-setting' },
        h('input', { type: 'checkbox', checked: s.effects, onchange: (e) => rh.lobby.setHostSetting('effects', e.target.checked) }),
        'Effects'),
      h('label', { class: 'mini-setting' }, 'Sub events',
        h('select', { onchange: (e) => rh.lobby.setHostSetting('subEventFreq', e.target.value) },
          ['low', 'normal', 'high'].map((v) => h('option', { value: v, selected: (s.subEventFreq ?? 'normal') === v }, v[0].toUpperCase() + v.slice(1))))),
      h('label', { class: 'mini-setting' }, 'Timer',
        h('select', { onchange: (e) => rh.lobby.setHostSetting('choiceTimer', e.target.value) },
          [15, 20, 30, 45, 60].map((v) => h('option', { value: v, selected: Number(s.choiceTimer ?? 30) === v }, `${v}s`)))),
      r && !rh.choosing && h('span', { class: 'hint' }, `Round ${r.meta?.roundNo ?? ''} · card ${r.index + 1}/${r.cards.length}`),
  );
}

// ---------------------------------------------------------------- choices

/** "0:23", or "Paused" */
export function countdownText(timer) {
  if (!timer) return '';
  if (timer.paused) return 'Paused';
  const s = Math.ceil(timer.remainingMs / 1000);
  return `0:${String(s).padStart(2, '0')}`;
}

/** While Stage Plans are open during the results: a small progress line. */
function overlapHint(state, rh) {
  if (rh.choosing || rh.windowKind !== 'plan') return null;
  const v = choiceWaitingView(state);
  return h('span', { class: 'overlap-hint' },
    `Stage Plans on phones: ${v.answered} of ${v.total} decided · `,
    h('span', { 'data-countdown': '' }, countdownText(rh.timerView())));
}

function decisionLine(deciders) {
  const names = deciders.map((d) => d.name);
  if (names.length === 1) return `${names[0]} has a decision to make…`;
  if (names.length <= 4) return `${names.slice(0, -1).join(', ')} and ${names.at(-1)} have decisions to make…`;
  return `${names.length} racers have decisions to make…`;
}

/** The host's waiting screen. Built only from choiceWaitingView (no secrets, no answers). */
function waitingCard(state, rh) {
  const v = choiceWaitingView(state);
  const timer = rh.timerView();
  const head = nextRoundHeader(state);
  const plan = v.kind === 'plan';
  const where = head ? `Stage ${head.stageId} · ${head.stageName}${plan ? '' : ` · ${head.label}`}` : '';
  const countdown = h('div', { class: 'countdown' + (timer?.paused ? ' paused' : '') },
    h('div', { class: 'countdown-num', 'data-countdown': '' }, countdownText(timer)),
    h('div', { class: 'countdown-bar' }, h('div', { class: 'countdown-fill', 'data-countdown-bar': '', style: `width:${barPct(timer)}%` })));
  if (v.allSecret) {
    return h('div', { class: 'card card-choice' },
      h('div', { class: 'label' }, where),
      h('h2', { class: 'card-big' }, 'Decisions are being made…'),
      countdown);
  }
  return h('div', { class: 'card card-choice' },
    h('div', { class: 'label' }, where),
    h('h2', { class: 'card-big' }, plan ? 'Choose your Stage Plan' : 'Sub event!'),
    !plan && h('p', { class: 'choice-who' }, decisionLine(v.deciders)),
    h('ul', { class: 'deciders' }, v.deciders.map((d) =>
      h('li', { class: (d.answered ? 'done' : '') + (d.connected ? '' : ' offline') },
        face(state, d.id, 'lg'),
        h('span', { class: 'decider-name' }, d.name),
        h('span', { class: 'decider-mark' }, d.answered ? '✓' : d.connected ? '…' : 'away')))),
    h('p', { class: 'hint' }, plan
      ? `${v.answered} of ${v.total} decided. Check your phone!`
      : 'Check your phone! Everyone else: hold on…'),
    countdown);
}

export function barPct(timer) {
  if (!timer || !timer.durationMs) return 0;
  return Math.max(0, Math.min(100, (100 * timer.remainingMs) / timer.durationMs));
}

// ---------------------------------------------------------------- cards

function renderCard(state, card) {
  const sideLabel = card.side ? h('div', { class: 'side-label' }, 'Side stories') : null;
  switch (card.kind) {
    case 'title':
      return h('div', { class: 'card card-title' },
        h('div', { class: 'label' }, `Stage ${card.stage.id} of ${STAGES.length}`),
        h('h2', { class: 'card-big' }, card.stage.name),
        h('div', { class: 'hint' }, `${card.stage.from} → ${card.stage.to}`),
        h('div', { class: `round-type round-${card.type}` }, card.label),
      );

    case 'events':
      return h('div', { class: 'card card-events' + (card.side ? ' card-side' : '') },
        sideLabel,
        h('ul', { class: 'event-list' }, card.lines.map((e, i) =>
          h('li', { class: 'event-line' + (e.death ? ' death' : '') + (e.announce ? ' announce' : ''), style: `animation-delay:${i * 0.35}s` },
            h('div', { class: 'event-faces' }, e.ids.map((id) => face(state, id))),
            h('p', {}, highlightNames(e.text, e.names)),
          ))),
      );

    case 'minor':
      return h('div', { class: 'card card-minor card-side' },
        sideLabel,
        h('h3', {}, 'Meanwhile on the trail…'),
        h('ul', { class: 'minor-list' }, card.lines.map((e) => h('li', {}, highlightNames(e.text, e.names)))),
        card.feedOnly?.length ? h('p', { class: 'hint' }, `…and ${card.feedOnly.length} more on your phones.`) : null,
        fieldReport(card.report),
      );

    case 'field':
      return h('div', { class: 'card card-field card-side' }, sideLabel, fieldReport(card.report));

    case 'fallen':
      return h('div', { class: 'card card-fallen' },
        h('h2', { class: 'card-big' }, 'The Fallen'),
        card.named.length
          ? h('ul', { class: 'fallen-list' }, card.named.map((f) =>
            h('li', {},
              face(state, f.id, 'lg'),
              h('div', {}, h('strong', {}, f.name), h('div', { class: 'hint' }, f.cause + (f.by ? ` (${f.by})` : ''))),
            )))
          : h('p', { class: 'hint' }, 'No named racers fell.'),
        card.npcs ? h('p', { class: 'fallen-npcs' }, `…and ${card.npcs} from the field.`) : null,
      );

    case 'stage':
      return h('div', { class: 'card card-results' },
        h('h2', {}, `Stage ${card.stage.id} results`),
        h('ol', { class: 'placements' }, card.placements.map((p) =>
          h('li', { class: `tier-${p.tier}` + (p.rank <= 3 ? ' podium' : '') },
            h('span', { class: 'rank' }, p.rank),
            h('span', { class: 'pname' }, p.unnamed ? 'A rider from the pack' : p.name),
            h('span', { class: 'pts' }, `+${p.points}`),
          ))),
      );

    case 'standings':
      return h('div', { class: 'card card-results' },
        h('h2', {}, 'Overall standings'),
        standingsList(card.rows),
      );

    // ------------------------------------------------------------ finale
    case 'finale-title':
      return h('div', { class: 'card card-finale card-title' },
        state.cheatsUsed ? h('div', { class: 'cheats-used' }, 'Cheats used') : null,
        h('div', { class: 'label' }, 'Trinity Church, New York'),
        h('h2', { class: 'card-big' }, 'The race is over'),
        h('p', { class: 'hint' }, 'Who stands on the podium?'),
      );

    case 'podium': {
      const p = card.place;
      return h('div', { class: `card card-finale card-podium podium-${p.rank}` + (card.winner ? ' winner' : '') },
        h('div', { class: 'podium-place' }, card.president
          ? (card.winner ? 'First across the line' : `${ordinal(p.rank)} across the line`)
          : card.winner ? 'Winner of the Steel Ball Run' : `${ordinal(p.rank)} place`),
        face(state, p.id, 'xl'),
        h('h2', { class: 'card-big' }, p.name),
        h('div', { class: 'podium-points' }, `${p.points} points`, p.tieBroken ? h('span', { class: 'tie-note' }, ` (tie broken by ${p.tieBroken})`) : null),
        h('div', { class: 'hint' }, [p.tier === 'canon' ? 'Canon racer' : p.tier === 'npc' ? 'From the pack' : null, p.mount === 'runner' ? 'Runner' : null].filter(Boolean).join(' · ')),
      );
    }

    case 'drumroll':
      return h('div', { class: 'card card-finale card-drumroll' },
        h('h2', { class: 'card-big' }, card.president ? 'And first across the line…' : 'And the winner of the Steel Ball Run is…'),
      );

    // Milestone 6b: the main ending, and epilogues after the podium.
    case 'ending':
      return h('div', { class: `card card-finale card-ending ending-${card.ending.id}` },
        h('div', { class: 'label' }, 'The Saint\'s Corpse'),
        card.ending.bossId ? face(state, card.ending.bossId, 'xl') : null,
        h('h2', { class: 'card-big' }, card.ending.title),
        h('p', { class: 'ending-text' }, card.ending.text),
      );

    case 'epilogue':
      return h('div', { class: 'card card-finale card-epilogue' },
        h('div', { class: 'label' }, 'Epilogue'),
        card.epilogue.who ? face(state, card.epilogue.who, 'lg') : null,
        h('h2', {}, card.epilogue.title),
        h('p', { class: 'ending-text' }, card.epilogue.text),
      );

    case 'no-winner':
      return h('div', { class: 'card card-finale card-title' },
        h('h2', { class: 'card-big' }, 'No one reached New York'),
        h('p', { class: 'hint' }, 'The trail took them all.'),
      );

    case 'awards':
      return h('div', { class: 'card card-finale' },
        h('h2', {}, 'Awards'),
        h('ul', { class: 'awards' }, card.awards.map((a) =>
          h('li', {},
            h('div', { class: 'award-title' }, a.title),
            h('div', { class: 'award-who' }, a.winners.map((w) => face(state, w.id)), a.winners.map((w) => w.name).join(' & ')),
            h('div', { class: 'hint' }, a.detail),
          ))),
      );

    case 'survivors':
      return h('div', { class: 'card card-finale' },
        h('h2', {}, `Reached New York (${card.survivors.length})`),
        h('ul', { class: 'survivor-list' }, card.survivors.map((s) =>
          h('li', {}, face(state, s.id), h('span', {}, s.name), h('span', { class: 'pts' }, s.points)))),
        h('p', { class: 'hint' }, `…plus ${card.fieldFinished} riders from the field.`),
      );

    case 'memorial':
      return h('div', { class: 'card card-finale card-memorial' },
        h('h2', {}, 'In memory of the Fallen'),
        card.fallen.length
          ? h('ul', { class: 'memorial-list' }, card.fallen.map((f) =>
            h('li', {},
              face(state, f.id),
              h('div', {}, h('strong', {}, f.name), h('div', { class: 'hint' }, `${f.cause}${f.by ? `, by ${f.by}` : ''} · Stage ${f.stage}, ${f.round}`)),
            )))
          : h('p', { class: 'hint' }, 'Every named racer survived. A miracle.'),
      );

    case 'extra': {
      const render = FINALE_RENDERERS[card.id];
      return render ? render(state, card.data) : h('div', { class: 'card' }, `(${card.id})`);
    }

    case 'the-end':
      return h('div', { class: 'card card-finale' },
        state.cheatsUsed ? h('div', { class: 'cheats-used' }, 'Cheats used') : null,
        h('h2', {}, 'Final standings'),
        standingsList(card.standings),
        h('p', { class: 'hint end-note' }, 'Thanks for riding.'),
      );

    default:
      return null;
  }
}

function standingsList(rows) {
  return h('ol', { class: 'placements' }, rows.map((row, i) =>
    h('li', { class: `tier-${row.tier}` + (row.status !== 'racing' ? ' out' : '') },
      h('span', { class: 'rank' }, i + 1),
      h('span', { class: 'pname' }, row.name, row.status === 'dead' ? ' ✝' : row.status === 'retired' ? ' (retired)' : ''),
      h('span', { class: 'pts' }, row.points),
    )));
}

/** Wrap named racers' names in <strong> so they stand out from NPCs. */
function highlightNames(text, names = []) {
  if (!names.length) return text;
  const escaped = names.map((n) => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const tierOf = new Map(names.map((n) => [n.name, n.tier]));
  return text.split(new RegExp(`(${escaped.join('|')})`)).map((part) =>
    tierOf.has(part) ? h('strong', { class: `name-${tierOf.get(part)}` }, part) : part);
}

function fieldReport(report) {
  return h('p', { class: 'field-report' }, h('span', { class: 'label' }, 'The field '), report.text);
}

function face(state, id, size = 'md') {
  const r = findRacer(state, id) ?? [...(state.field?.packLeaders ?? []), ...(state.field?.kept ?? [])].find((n) => n.id === id);
  return r ? avatar(r.name ?? '?', r.picture, size) : null;
}
