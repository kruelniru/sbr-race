// The phone's race feed, so a phone-only player can follow the race without
// the stream. Lines arrive only as they're revealed on stream (the host sends
// each card's lines when it goes live), so this never spoils anything.
//
// Layout:
//   - grouped by round: each 'round' line the host sends starts a group
//     ("Stage 2 · Night 1"); lines before the race go under "Before the race"
//   - newest round on top and open; older rounds collapse to their header
//     and open with a tap (the player's own open/close choices are kept)
//   - inside a round, lines read top to bottom in the order they were shown,
//     with Meanwhile / side story lines in their own muted block
//   - lines that involve you get an accent bar and tint; deaths their own style
import { FEED_KEEP } from '../config.js';
import { h, mount } from '../ui/dom.js';

const MEANWHILE = new Set(['minor', 'report']);
const MAIN_STORY = new Set(['event', 'death']);

export class MiniFeed {
  constructor(el) {
    this.el = el;
    this.items = [];
    this.mine = null;
    this.toggled = new Map(); // group key -> open (only where the player overrode the default)
  }

  /** The player's own racer id, for highlighting. */
  setMine(id) {
    if (id === this.mine) return;
    this.mine = id;
    this.render();
  }

  add(items, reset = false) {
    if (reset) this.items = [];
    const seen = new Set(this.items.map((i) => i.id));
    for (const it of items) if (!seen.has(it.id)) this.items.push(it);
    this.items.sort((a, b) => a.id - b.id);
    if (this.items.length > FEED_KEEP) this.items = this.items.slice(-FEED_KEEP);
    this.render();
  }

  /** [{ key, title, items }] oldest first. */
  groups() {
    const groups = [];
    let cur = null;
    for (const it of this.items) {
      if (it.kind === 'round') {
        cur = { key: `r${it.id}`, title: roundTitle(it.text), items: [] };
        groups.push(cur);
        continue;
      }
      if (!cur) {
        cur = { key: 'pre', title: 'Before the race', items: [] };
        groups.push(cur);
      }
      cur.items.push(it);
    }
    return groups;
  }

  render() {
    const groups = this.groups();
    const newest = groups.at(-1)?.key;
    mount(this.el,
      h('div', { class: 'feed-title' }, 'Race feed'),
      groups.length
        ? groups.slice().reverse().map((g) => this.#group(g, g.key === newest))
        : h('p', { class: 'feed-empty' }, 'Nothing yet. Lines show up here as they appear on stream.'),
    );
  }

  #group(g, isNewest) {
    const open = this.toggled.has(g.key) ? this.toggled.get(g.key) : isNewest;
    const mineCount = g.items.filter((i) => this.#isMine(i)).length;
    const details = h('details', {
      class: 'feed-group' + (isNewest ? ' newest' : ''),
      open,
      ontoggle: () => {
        // Only remember choices that differ from the default (newest open).
        if (details.open === isNewest) this.toggled.delete(g.key);
        else this.toggled.set(g.key, details.open);
      },
    },
    h('summary', { class: 'feed-group-head' },
      h('span', { class: 'feed-group-title' }, g.title),
      h('span', { class: 'feed-group-meta' },
        mineCount ? h('span', { class: 'feed-you-dot', title: 'You are in this round' }, 'You') : null,
        `${g.items.length} line${g.items.length === 1 ? '' : 's'}`)),
    this.#body(g.items));
    return details;
  }

  /** Lines in reveal order, with the Meanwhile lines pulled into one muted block after the Main Story. */
  #body(items) {
    const meanwhile = items.filter((i) => MEANWHILE.has(i.kind));
    const rest = items.filter((i) => !MEANWHILE.has(i.kind));
    const lastMain = rest.reduce((at, i, n) => (MAIN_STORY.has(i.kind) ? n : at), -1);
    const block = meanwhile.length
      ? h('li', { class: 'feed-meanwhile' },
        h('div', { class: 'feed-meanwhile-label' }, 'Meanwhile on the trail…'),
        h('ul', { class: 'feed-lines' }, meanwhile.map((i) => this.#line(i))))
      : null;
    const lines = rest.map((i) => this.#line(i));
    lines.splice(lastMain + 1, 0, block);
    if (!items.length) lines.push(h('li', { class: 'feed-item feed-empty' }, 'Nothing yet.'));
    return h('ul', { class: 'feed-lines' }, lines);
  }

  #isMine(i) {
    return !!this.mine && !!i.ids?.includes(this.mine);
  }

  #line(i) {
    const mine = this.#isMine(i);
    return h('li', { class: `feed-item feed-${i.kind}` + (mine ? ' mine' : '') },
      mine && h('span', { class: 'visually-hidden' }, 'You: '),
      i.text);
  }
}

/** "Stage 2 · Across the Arizona Desert · Night 1" -> "Stage 2 · Night 1" */
function roundTitle(text) {
  const parts = text.split(' · ');
  return parts.length >= 3 ? `${parts[0]} · ${parts.at(-1)}` : text;
}
