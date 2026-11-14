// Stage-themed background for the host screen: a gradient palette per stage
// (darker for Night rounds) plus light particle effects on one canvas.
//
// - Text never sits on the particles directly: cards are solid panels.
// - Respects prefers-reduced-motion (palette only, no animation).
// - The host's "Effects" toggle turns particles off.
// - Pauses when the tab is hidden.

const SCENES = {
  // stage: { top, bottom, accent, particle }
  0: { top: '#3a2619', bottom: '#1c1410', accent: '#e3a83b', particle: 'dust' }, // lobby
  1: { top: '#2f4a55', bottom: '#3b2a1f', accent: '#f2b880', particle: 'spray' }, // beach
  2: { top: '#5a3418', bottom: '#2a170b', accent: '#f0a04b', particle: 'sand' }, // desert
  3: { top: '#2a3a4f', bottom: '#11171f', accent: '#cfe0f5', particle: 'snow' }, // Rockies
  4: { top: '#4a4a1c', bottom: '#1d2210', accent: '#e8d36a', particle: 'grass' }, // prairie
  5: { top: '#3d2a16', bottom: '#140e08', accent: '#ffb347', particle: 'smoke' }, // Illinois
  6: { top: '#41566a', bottom: '#18222c', accent: '#eaf4ff', particle: 'ice' }, // Michigan
  7: { top: '#1d2326', bottom: '#08090a', accent: '#9fb0b5', particle: 'fog' }, // Philadelphia
  8: { top: '#3a2350', bottom: '#0f0a1a', accent: '#c7a4ff', particle: 'eerie' }, // Both Sides Now
  9: { top: '#101a33', bottom: '#04060d', accent: '#f2c66d', particle: 'city' }, // Manhattan
  finale: { top: '#1a1630', bottom: '#05040a', accent: '#f2c66d', particle: 'gold' },
};

export class Backdrop {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.key = null;
    this.particles = [];
    this.effects = true;
    this.running = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.#updateLoop());
    this.reduced.addEventListener?.('change', () => this.#updateLoop());
  }

  /** @param {{stage: number|'finale', night: boolean}} scene  @param {boolean} effects */
  setScene(scene, effects) {
    const key = `${scene.stage}:${scene.night}`;
    this.effects = effects;
    if (key !== this.key) {
      this.key = key;
      this.scene = SCENES[scene.stage] ?? SCENES[0];
      this.night = scene.night;
      const top = this.night ? darken(this.scene.top, 0.5) : this.scene.top;
      const bottom = this.night ? darken(this.scene.bottom, 0.55) : this.scene.bottom;
      this.root.style.setProperty('--bd-top', top);
      this.root.style.setProperty('--bd-bottom', bottom);
      this.root.style.setProperty('--bd-accent', this.scene.accent);
      this.root.dataset.stage = String(scene.stage);
      this.root.classList.toggle('night', !!scene.night);
      this.#spawn();
    }
    this.#updateLoop();
  }

  resize() {
    this.w = this.canvas.width = innerWidth;
    this.h = this.canvas.height = innerHeight;
    if (this.scene) this.#spawn();
  }

  #updateLoop() {
    const want = this.effects && !this.reduced.matches && document.visibilityState === 'visible';
    if (want && !this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.#frame(t));
    } else if (!want) {
      this.running = false;
      this.ctx.clearRect(0, 0, this.w, this.h);
    }
  }

  #spawn() {
    const type = this.scene.particle;
    const area = (this.w * this.h) / 16000;
    const counts = { dust: 0.35, spray: 0.6, sand: 1, snow: 0.9, grass: 0.7, smoke: 0.12, ice: 0.7, fog: 0.08, eerie: 0.45, city: 0.3, gold: 0.5 };
    const n = Math.min(140, Math.round(area * (counts[type] ?? 0.4)));
    this.particles = Array.from({ length: n }, () => this.#make(type, true));
    this.windows = type === 'city' || type === 'gold' ? this.#makeWindows() : null;
  }

  #make(type, anywhere) {
    const { w, h } = this;
    const r = Math.random;
    const p = { x: r() * w, y: anywhere ? r() * h : 0, life: r(), seed: r() * 1000 };
    switch (type) {
      case 'spray': return { ...p, y: anywhere ? r() * h : h + 10, vx: 15 + r() * 25, vy: -(20 + r() * 40), size: 1 + r() * 2.5, alpha: 0.25 + r() * 0.35 };
      case 'sand': return { ...p, x: anywhere ? r() * w : -10, vx: 120 + r() * 160, vy: (r() - 0.5) * 20, size: 0.8 + r() * 1.6, alpha: 0.25 + r() * 0.35 };
      case 'snow': case 'ice': return { ...p, y: anywhere ? r() * h : -10, vx: (r() - 0.5) * 20, vy: 25 + r() * 45, size: 1 + r() * 2.8, alpha: 0.35 + r() * 0.45 };
      case 'grass': return { ...p, x: anywhere ? r() * w : -20, vx: 80 + r() * 90, vy: (r() - 0.5) * 15, size: 4 + r() * 8, alpha: 0.18 + r() * 0.25, hue: r() < 0.5 ? 'gold' : 'green' };
      case 'smoke': return { ...p, y: anywhere ? r() * h : h + 80, vx: 6 + r() * 10, vy: -(8 + r() * 12), size: 60 + r() * 120, alpha: 0.03 + r() * 0.04 };
      case 'fog': return { ...p, x: anywhere ? r() * w : -300, vx: 8 + r() * 14, vy: 0, size: 180 + r() * 260, alpha: 0.03 + r() * 0.04 };
      case 'eerie': return { ...p, vx: (r() - 0.5) * 10, vy: (r() < 0.5 ? -1 : 1) * (6 + r() * 12), size: 1.5 + r() * 2.5, alpha: 0.4 };
      case 'city': case 'gold': return { ...p, y: anywhere ? r() * h : h + 10, vx: (r() - 0.5) * 8, vy: -(10 + r() * 20), size: 1 + r() * 2, alpha: 0.3 + r() * 0.5 };
      default: return { ...p, vx: (r() - 0.5) * 8, vy: -(3 + r() * 6), size: 1 + r() * 1.5, alpha: 0.15 + r() * 0.2 };
    }
  }

  #makeWindows() {
    const out = [];
    const base = this.h * 0.86;
    for (let x = 0; x < this.w; x += 14) {
      const height = 40 + Math.random() * 140;
      for (let y = base; y > base - height; y -= 12) {
        if (Math.random() < 0.18) out.push({ x: x + Math.random() * 6, y, on: Math.random(), seed: Math.random() * 100 });
      }
    }
    return out;
  }

  #frame(t) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const { ctx, w, h, scene } = this;
    const type = scene.particle;
    ctx.clearRect(0, 0, w, h);
    const dim = this.night ? 0.7 : 1;

    // Static-ish layers first.
    if (type === 'sand') this.#heatShimmer(t);
    if (this.windows) {
      for (const win of this.windows) {
        const flicker = Math.sin(t / 900 + win.seed) > 0.85 ? 0.15 : 0.45;
        ctx.fillStyle = `rgba(255, 210, 120, ${(win.on > 0.5 ? flicker : 0.08) * dim})`;
        ctx.fillRect(win.x, win.y, 4, 6);
      }
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      if (type === 'snow' || type === 'ice') p.x += Math.sin(p.life * 1.5 + p.seed) * 0.4;
      if (type === 'sand') p.y += Math.sin(p.life * 3 + p.seed) * 0.3;
      if (type === 'eerie') p.x += Math.sin(p.life * 0.8 + p.seed) * 0.5;
      if (p.x > w + 320 || p.x < -320 || p.y > h + 140 || p.y < -140) Object.assign(p, this.#make(type, false));
      this.#draw(type, p, dim, t);
    }
    requestAnimationFrame((tt) => this.#frame(tt));
  }

  #draw(type, p, dim, t) {
    const ctx = this.ctx;
    switch (type) {
      case 'grass': {
        ctx.strokeStyle = p.hue === 'gold' ? `rgba(232, 211, 106, ${p.alpha * dim})` : `rgba(140, 170, 80, ${p.alpha * dim})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.size, p.y - p.size * 0.35);
        ctx.stroke();
        return;
      }
      case 'smoke': case 'fog': {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        const c = type === 'smoke' ? '200, 150, 90' : '180, 190, 195';
        g.addColorStop(0, `rgba(${c}, ${p.alpha * dim})`);
        g.addColorStop(1, `rgba(${c}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        return;
      }
      case 'eerie': {
        const pulse = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t / 700 + p.seed));
        ctx.fillStyle = p.vy < 0 ? `rgba(199, 164, 255, ${pulse * dim})` : `rgba(120, 230, 210, ${pulse * dim})`;
        dot(ctx, p.x, p.y, p.size);
        return;
      }
      case 'ice': {
        ctx.fillStyle = `rgba(240, 248, 255, ${p.alpha * dim})`;
        dot(ctx, p.x, p.y, p.size);
        if (Math.sin(t / 300 + p.seed) > 0.97) { // occasional glint
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * dim})`;
          ctx.beginPath();
          ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y);
          ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x, p.y + 5);
          ctx.stroke();
        }
        return;
      }
      default: {
        const colors = {
          spray: '230, 245, 250', sand: '235, 190, 130', snow: '240, 245, 255',
          city: '255, 205, 110', gold: '242, 198, 109', dust: '230, 190, 130',
        };
        ctx.fillStyle = `rgba(${colors[type] ?? '255,255,255'}, ${p.alpha * dim})`;
        dot(ctx, p.x, p.y, p.size);
      }
    }
  }

  #heatShimmer(t) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 200, 140, 0.05)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = this.h * (0.7 + i * 0.05);
      ctx.beginPath();
      for (let x = 0; x <= this.w; x += 24) {
        const yy = y + Math.sin(x / 60 + t / 500 + i) * 3;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Mix a hex color toward near-black by `amount` (0..1). */
function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c * (1 - amount) + 4 * amount);
  const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}
