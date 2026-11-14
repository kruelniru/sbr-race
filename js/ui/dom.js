// Tiny DOM helpers shared by the host and phone screens.
// Always set user-provided text with textContent (h() does), never innerHTML.

/**
 * h('div', { class: 'card', onclick: fn }, 'text', childEl, [moreChildren])
 * Attributes starting with "on" become event listeners. `false`/`null`
 * children and attributes are skipped.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

/** Replace an element's children. */
export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

/** Avatar: the player's picture, or their initials on a colored disc. */
export function avatar(name, picture, size = 'md') {
  if (picture) return h('img', { class: `avatar avatar-${size}`, src: picture, alt: '' });
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  let hash = 0;
  for (const ch of name || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return h('div', { class: `avatar avatar-${size} avatar-initials`, style: `--hue:${hash % 360}` }, initials);
}

/** Random secret string (works on plain-http LAN pages, unlike randomUUID). */
export function randomToken(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** localStorage that never throws (private mode, blocked storage, full quota). */
export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[store] could not save', key, err);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  },
};
