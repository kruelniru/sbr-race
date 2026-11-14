// The phone's mini feed: latest public events, newest on top, so a phone-only
// player can follow the race without the stream. Lines that involve you are
// highlighted.
import { FEED_KEEP } from '../config.js';
import { h, mount } from '../ui/dom.js';

export class MiniFeed {
  constructor(el) {
    this.el = el;
    this.items = [];
    this.mine = null;
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

  render() {
    mount(this.el,
      h('div', { class: 'feed-title' }, 'Race feed'),
      this.items.length
        ? this.items.slice().reverse().map((i) => h('div', {
          class: `feed-item feed-${i.kind}` + (this.mine && i.ids?.includes(this.mine) ? ' mine' : ''),
        }, i.text))
        : h('div', { class: 'feed-item feed-empty' }, 'Nothing yet.'),
    );
  }
}
