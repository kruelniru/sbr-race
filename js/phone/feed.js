// The phone's mini feed: latest public events, newest on top, so a phone-only
// player can follow the race without the stream.
import { FEED_KEEP } from '../config.js';
import { h, mount } from '../ui/dom.js';

export class MiniFeed {
  constructor(el) {
    this.el = el;
    this.items = [];
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
        ? this.items.slice().reverse().map((i) => h('div', { class: `feed-item feed-${i.kind}` }, i.text))
        : h('div', { class: 'feed-item feed-empty' }, 'Nothing yet.'),
    );
  }
}
