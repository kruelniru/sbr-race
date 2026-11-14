// Renders the race on the host (streamed) screen. Everything shown comes from
// reveal cards, which are built from public round results; never render
// racers' private fields here (until the finale's secrets reveal, which is
// built for exactly that moment).

import STAGES from '../../data/stages.js';
import { h, avatar } from '../ui/dom.js';
import { findRacer } from '../engine/racers.js';
import { ordinal } from '../engine/finale.js';

/**
 * Renderers for extra finale sections registered in js/engine/finale.js
 * (e.g. the secrets reveal). Later milestones add: FINALE_RENDERERS.secrets = (state, data) => element
 */
export const FINALE_RENDERERS = {};

/**
 * @param {object} state
 * @param {import('./race-host.js').RaceHost} rh
 */
let lastCard = null;

export function raceView(state, rh) {
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
  const r = rh.reveal;
  const s = state.settings;
  const nextLabel = rh.nextLabel();
  const atLiveEnd = !rh.viewing && rh.waiting;
  return h('footer', { class: 'race-controls' },
    h('div', { class: 'control-group' },
      h('button', { class: 'btn btn-small', onclick: () => rh.back(), title: 'Step back (view only)' }, '◂ Back'),
      h('button', { class: 'btn btn-small', onclick: () => rh.setAuto(!rh.auto) }, rh.auto ? '❚❚ Pause' : '▶ Auto'),
      !atLiveEnd && h('button', { class: 'btn btn-small', onclick: () => rh.next() }, 'Next ▸'),
      rh.viewing && h('button', { class: 'btn btn-small', onclick: () => rh.backToLive() }, 'Back to live ⏭'),
      rh.onSideStory && h('button', { class: 'btn btn-small', onclick: () => rh.skipSide() }, 'Skip side stories ⏭'),
      atLiveEnd && nextLabel && h('button', { class: 'btn btn-primary', onclick: () => rh.nextRound() }, nextLabel),
    ),
    h('div', { class: 'control-group' },
      h('label', { class: 'mini-setting' }, 'Speed',
        h('select', { onchange: (e) => rh.lobby.setHostSetting('revealSpeed', e.target.value) },
          ['slow', 'normal', 'fast'].map((v) => h('option', { value: v, selected: s.revealSpeed === v }, v[0].toUpperCase() + v.slice(1))))),
      h('label', { class: 'mini-setting' },
        h('input', { type: 'checkbox', checked: s.autoSkipSide, onchange: (e) => rh.lobby.setHostSetting('autoSkipSide', e.target.checked) }),
        'Skip side stories'),
      h('label', { class: 'mini-setting' },
        h('input', { type: 'checkbox', checked: s.effects, onchange: (e) => rh.lobby.setHostSetting('effects', e.target.checked) }),
        'Effects'),
      r && h('span', { class: 'hint' }, `Round ${r.meta?.roundNo ?? ''} · card ${r.index + 1}/${r.cards.length}`),
    ),
  );
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
          h('li', { class: 'event-line' + (e.death ? ' death' : ''), style: `animation-delay:${i * 0.35}s` },
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
        h('div', { class: 'label' }, 'Trinity Church, New York'),
        h('h2', { class: 'card-big' }, 'The race is over'),
        h('p', { class: 'hint' }, 'Who stands on the podium?'),
      );

    case 'podium': {
      const p = card.place;
      return h('div', { class: `card card-finale card-podium podium-${p.rank}` + (card.winner ? ' winner' : '') },
        h('div', { class: 'podium-place' }, card.winner ? 'Winner of the Steel Ball Run' : `${ordinal(p.rank)} place`),
        face(state, p.id, 'xl'),
        h('h2', { class: 'card-big' }, p.name),
        h('div', { class: 'podium-points' }, `${p.points} points`),
        h('div', { class: 'hint' }, [p.tier === 'canon' ? 'Canon racer' : p.tier === 'npc' ? 'From the pack' : null, p.mount === 'runner' ? 'Runner' : null].filter(Boolean).join(' · ')),
      );
    }

    case 'drumroll':
      return h('div', { class: 'card card-finale card-drumroll' },
        h('h2', { class: 'card-big' }, 'And the winner of the Steel Ball Run is…'),
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
