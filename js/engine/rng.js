// Seeded random number generator. All game randomness must go through an Rng
// so a game can be replayed from its seed (and bugs reproduced).
// Never use Math.random() in engine code.
//
// Algorithm: sfc32, seeded by hashing a string with cyrb128. Fast, good
// quality, and its whole state is four 32-bit numbers, easy to save.

export class Rng {
  /** @param {string|number} seed */
  constructor(seed) {
    this.seed = String(seed);
    this.s = cyrb128(this.seed);
  }

  /** Float in [0, 1). */
  next() {
    let [a, b, c, d] = this.s;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.s = [a, b, c, d];
    return (t >>> 0) / 4294967296;
  }

  /** Integer in [min, max], inclusive. */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  /** One random element, or undefined for an empty array. */
  pick(arr) {
    return arr.length ? arr[Math.floor(this.next() * arr.length)] : undefined;
  }

  /**
   * Pick using weights. `weight` maps an item to a number >= 0.
   * Returns undefined if every weight is 0.
   */
  weighted(arr, weight) {
    let total = 0;
    const ws = arr.map((x) => {
      const w = Math.max(0, weight(x));
      total += w;
      return w;
    });
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= ws[i];
      if (r < 0) return arr[i];
    }
    return arr[arr.length - 1];
  }

  /** Shuffled copy (Fisher–Yates). */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Save/restore so the host can resume mid-game with the same sequence. */
  getState() {
    return { seed: this.seed, s: this.s.slice() };
  }

  static fromState(state) {
    const r = new Rng(state.seed);
    r.s = state.s.slice();
    return r;
  }
}

/** A readable random seed for new games (uses Math.random: only for seeding). */
export function newSeed() {
  const words = ['spin', 'saint', 'tusk', 'gyro', 'steel', 'prairie', 'canyon', 'desert', 'horse', 'corpse', 'train', 'love'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}-${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
}

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
