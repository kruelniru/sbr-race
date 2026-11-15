// Character creation form: name, gender, pronouns, personality, optional picture.
import PERSONALITIES from '../../data/personalities.js';
import PRONOUNS from '../../data/pronouns.js';
import { NAME_MAX, GENDER_MAX } from '../config.js';
import { h, avatar } from '../ui/dom.js';
import { compressPicture } from './image.js';

const MOUNTS = [
  { id: 'horse', label: 'Rider', blurb: 'You get a horse. If it dies, you continue on foot, far slower.' },
  { id: 'runner', label: 'Runner', blurb: "No horse, ever. Better in desert, mountains and on ice; worse on open flats. You can't get a horse later." },
];

/**
 * @param {object} opts
 * @param {object} opts.initial   { name, gender, pronouns, personality, picture }
 * @param {string} opts.submitLabel
 * @param {(character:object) => void} opts.onSubmit
 * @param {() => void} [opts.onCancel]
 * @returns {{ el: HTMLElement, showError(msg:string): void, setBusy(b:boolean): void }}
 */
export function characterForm({ initial = {}, submitLabel, onSubmit, onCancel }) {
  const data = {
    name: initial.name ?? '',
    gender: initial.gender ?? '',
    pronouns: initial.pronouns ?? '',
    personality: initial.personality ?? '',
    mount: initial.mount ?? 'horse',
    picture: initial.picture ?? null,
  };

  const error = h('p', { class: 'form-error', role: 'alert' });
  const preview = h('div', { class: 'pic-preview' });
  const removePic = h('button', { type: 'button', class: 'btn btn-small btn-quiet', onclick: () => setPicture(null) }, 'Remove');
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, submitLabel);

  const nameInput = h('input', {
    type: 'text', maxlength: NAME_MAX, value: data.name, autocomplete: 'off', autocapitalize: 'words',
    enterkeyhint: 'next', placeholder: 'e.g. Kruel Niru', required: true,
    oninput: (e) => { data.name = e.target.value; },
  });
  const genderInput = h('input', {
    type: 'text', maxlength: GENDER_MAX, value: data.gender, autocomplete: 'off', placeholder: 'Optional, shown on the host screen',
    oninput: (e) => { data.gender = e.target.value; },
  });
  const fileInput = h('input', {
    type: 'file', accept: 'image/*', class: 'visually-hidden', id: 'pic-file',
    onchange: async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      showError('');
      preview.classList.add('loading');
      try {
        setPicture(await compressPicture(file));
      } catch (err) {
        showError(err.message);
      } finally {
        preview.classList.remove('loading');
      }
    },
  });

  function setPicture(pic) {
    data.picture = pic;
    preview.replaceChildren(avatar(data.name || '?', pic, 'xl'));
    removePic.hidden = !pic;
  }
  setPicture(data.picture);

  const pronounChoices = h('div', { class: 'segmented', role: 'radiogroup' },
    Object.values(PRONOUNS).map((p) => radio('pronouns', p.id, p.label, data.pronouns === p.id, () => { data.pronouns = p.id; })),
  );

  const mountChoices = h('div', { class: 'choice-list', role: 'radiogroup' },
    MOUNTS.map((m) =>
      radio('mount', m.id, [h('strong', {}, m.label), h('span', { class: 'choice-blurb' }, m.blurb)],
        data.mount === m.id, () => { data.mount = m.id; }, 'choice-card'),
    ),
  );

  const personalityChoices = h('div', { class: 'choice-list', role: 'radiogroup' },
    PERSONALITIES.map((p) =>
      radio('personality', p.id, [h('strong', {}, p.label), h('span', { class: 'choice-blurb' }, p.blurb), p.tradeoff ? h('span', { class: 'choice-tradeoff' }, p.tradeoff) : null],
        data.personality === p.id, () => { data.personality = p.id; }, 'choice-card'),
    ),
  );

  function showError(m) {
    error.textContent = m;
    if (m) error.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function setBusy(b) {
    submit.disabled = b;
    submit.textContent = b ? 'Saddling up…' : submitLabel;
  }

  const el = h('form', {
    class: 'char-form',
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      if (!data.name.trim()) return showError('Your racer needs a name.');
      if (!data.pronouns) return showError('Pick your pronouns.');
      if (!data.personality) return showError('Pick a personality.');
      showError('');
      onSubmit({ ...data, name: data.name.trim(), gender: data.gender.trim() });
    },
  },
    h('div', { class: 'pic-row' },
      preview,
      h('div', { class: 'pic-actions' },
        h('label', { class: 'btn btn-small', for: 'pic-file' }, 'Choose picture'),
        removePic,
        h('span', { class: 'hint' }, 'Optional'),
      ),
      fileInput,
    ),
    field('Name', nameInput),
    field('Gender', genderInput),
    h('fieldset', {}, h('legend', {}, 'Pronouns'), pronounChoices),
    h('fieldset', {}, h('legend', {}, 'Ride or run?'), mountChoices),
    h('fieldset', {}, h('legend', {}, 'Personality'),
      h('p', { class: 'hint' }, 'Plays for you when time runs out or you lose connection.'),
      personalityChoices),
    error,
    submit,
    onCancel && h('button', { type: 'button', class: 'btn btn-quiet', onclick: onCancel }, 'Cancel'),
  );

  return { el, showError, setBusy };
}

function field(label, input) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input);
}

function radio(name, value, content, checked, onPick, cls = 'seg') {
  return h('label', { class: cls },
    h('input', { type: 'radio', name, value, checked, onchange: onPick }),
    h('span', { class: `${cls}-body` }, content),
  );
}
