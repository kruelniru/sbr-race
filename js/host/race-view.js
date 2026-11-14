// Renders the race on the host (streamed) screen. Everything shown comes from
// reveal cards, which are built from public round results; never render
// racers' private fields here.

import STAGES from '../../data/stages.js';
import { h, avatar } from '../ui/dom.js';
import { findRacer } from '../engine/racers.js';

/**
 * @param {object} state
 * @param {import('./race-host.js').RaceHost} rh
 */
export function raceView(state, rh) {
  const card = rh.card;
  const header = state.race.shownHeader;
  return [
    raceHeader(state, header),
    h('section', { class: 'race-stage' }, card ? renderCard(state, card) : h('p', { class: 'hint' }, 'Getting ready…')),
    raceControls(state, rh),
  ];
}

function raceHeader(state, header) {
  const currentId = header?.stageId ?? (state.race.over ? 10 : 1);
  return h('div', { class: 'race-header' },
    h('div', { class: 'race-where' },
      header?.stageName
        ? [h('span', { class: 'race-stage-name' }, `Stage ${header.stageId} · ${header.stageName}`), h('span', { class: 'race-round' }, header.label)]
        : h('span', { class: 'race-stage-name' }, state.race.over ? 'New York' : 'The Steel Ball Run'),
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
  const atEnd = rh.waiting;
  const nextLabel = rh.nextLabel();
  return h('footer', { class: 'race-controls' },
    h('button', { class: 'btn btn-small', onclick: () => rh.setAuto(!rh.auto) }, rh.auto ? '❚❚ Pause' : '▶ Auto'),
    !atEnd && h('button', { class: 'btn btn-small', onclick: () => rh.advance() }, 'Next ▸'),
    atEnd && nextLabel && h('button', { class: 'btn btn-primary', onclick: () => rh.nextRound() }, nextLabel),
    r && h('span', { class: 'hint' }, `Round ${r.roundNo} · card ${r.index + 1}/${r.cards.length}`),
  );
}

// ---------------------------------------------------------------- cards

function renderCard(state, card) {
  switch (card.kind) {
    case 'title':
      return h('div', { class: 'card card-title' },
        h('div', { class: 'label' }, `Stage ${card.stage.id} of ${STAGES.length}`),
        h('h2', { class: 'card-big' }, card.stage.name),
        h('div', { class: 'hint' }, `${card.stage.from} → ${card.stage.to}`),
        h('div', { class: `round-type round-${card.type}` }, card.label),
      );

    case 'events':
      return h('div', { class: 'card card-events' },
        h('ul', { class: 'event-list' }, card.lines.map((e, i) =>
          h('li', { class: 'event-line' + (e.death ? ' death' : ''), style: `animation-delay:${i * 0.35}s` },
            h('div', { class: 'event-faces' }, e.ids.map((id) => face(state, id))),
            h('p', {}, highlightNames(e.text, e.names)),
          ))),
      );

    case 'minor':
      return h('div', { class: 'card card-minor' },
        h('h3', {}, 'Meanwhile on the trail…'),
        h('ul', { class: 'minor-list' }, card.lines.map((e) => h('li', {}, highlightNames(e.text, e.names)))),
        fieldReport(card.report),
      );

    case 'field':
      return h('div', { class: 'card card-field' }, fieldReport(card.report));

    case 'fallen':
      return h('div', { class: 'card card-fallen' },
        h('h2', { class: 'card-big' }, 'The Fallen'),
        card.named.length
          ? h('ul', { class: 'fallen-list' }, card.named.map((f) =>
            h('li', {},
              avatar(f.name, f.picture, 'lg'),
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
        h('ol', { class: 'placements' }, card.rows.map((row, i) =>
          h('li', { class: `tier-${row.tier}` + (row.status !== 'racing' ? ' out' : '') },
            h('span', { class: 'rank' }, i + 1),
            h('span', { class: 'pname' }, row.name, row.status === 'dead' ? ' ✝' : row.status === 'retired' ? ' (retired)' : ''),
            h('span', { class: 'pts' }, row.points),
          ))),
      );

    case 'final': {
      const f = card.final;
      return h('div', { class: 'card card-final' },
        h('div', { class: 'label' }, 'Trinity Church, New York'),
        h('h2', { class: 'card-big' }, f.winner ? `${f.winner.name} wins!` : 'No one reached New York'),
        f.winner && h('p', {}, `${f.winner.points} points`),
        h('p', { class: 'hint' }, `Reached New York: ${f.survivors.map((s) => s.name).join(', ') || 'nobody'}, plus ${f.fieldFinished} from the field.`),
        h('p', { class: 'hint' }, 'The full results screen arrives in milestone 6.'),
      );
    }
    default:
      return null;
  }
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

function face(state, id) {
  const r = findRacer(state, id);
  return r ? avatar(r.name, r.picture, 'md') : null;
}
