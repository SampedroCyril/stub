import { grid, compile } from "./sprite.js";
import { Particles, rnd } from "./particles.js";
import { drawText } from "./font.js";
import { play } from "./sfx.js";
import { C, cigSpec, linePts, drawStick, old } from "./stick.js";
import { TRAYS } from "./fxMore.js";

export const ASH_W = 48, ASH_H = 34;
const STEP = 1000 / 60;
const CX = 24;
const CONTACT = { x: 18, y: 24 };
const FLOOR = 25;
const T_IN = 36, T_TOUCH = 50, T_STEP = 11, STEPS = 6, T_END = T_TOUCH + T_STEP * STEPS;
/** Repères de la scène, pour le décor des cendriers (fxMore.js). */
const SCENE = { CONTACT, FLOOR, T_END };

function ashtraySprite(pal = TRAYS.classic.pal) {
  const g = grid(40, 14);
  g.ellipse(20, 11.4, 14, 2.4, "b");
  g.ellipse(20, 7, 19.6, 6.4, "a");
  g.ellipse(20, 5.8, 15.6, 3.7, "i");
  g.ellipse(20, 6.7, 13.6, 2.7, "h");
  g.rect(18, 0, 4, 1, ".").rect(19, 1, 2, 1, "i");
  g.rect(0, 6, 1, 2, ".").rect(39, 6, 1, 2, ".");
  return compile(g, pal);
}
const EMBER_FADE = (t) => (t < 0.25 ? "#ffcd75" : t < 0.5 ? "#ef7d57" : t < 0.75 ? "#b13e53" : "#3a3340");
const TOBACCO = ["#8a5a2b", "#6b3a1f", "#a8743a"];

/** Scène de victoire : la clope s'écrase, se tord, crache sa braise et s'éteint dans le cendrier. */
export class AshtrayScene {
  constructor(canvas, { count = 0, onCount, onDone, style = "classic" } = {}) {
    this.cv = canvas; this.count = count; this.onCount = onCount; this.onDone = onDone;
    this.style = TRAYS[style] || TRAYS.classic;
    this.buf = document.createElement("canvas"); this.buf.width = ASH_W; this.buf.height = ASH_H;
    this.b = this.buf.getContext("2d");
    this.tray = ashtraySprite(this.style.pal);
    this.fx = new Particles(); this.ground = new Particles(); this.front = new Particles(); this.floats = [];
    let seed = 11;
    const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    this.pile = [];
    for (let i = 0; i < Math.min(count, 4); i++) this.pile.push({ x: [27, 30, 26, 31][i], y: [23, 21, 21, 24][i], a: [0.15, -0.25, 0.4, 0.05][i], spec: old(cigSpec({ ember: -1, ash: 0, burnt: 1, paper: 2 + (i % 2), filter: 5 })) });
    this.ash = Array.from({ length: Math.min(16, 4 + count) }, () => ({ x: 9 + r() * 30 | 0, y: 20 + r() * 6 | 0, c: (this.style.ash || ["#4a4655", "#6d6875"])[r() < 0.5 ? 0 : 1] }));
    this.smear = [];
    this.t = 0; this.stop = 0; this.shake = 0;
    this.resize();
    this.last = performance.now(); this.acc = 0;
    // la boucle s'arrête d'elle-même une fois la scène finie (dernière fumée dissipée) : plus rien ne bouge
    const loop = (now) => { this.frame(now); if (this.t < T_END + 240) this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() { cancelAnimationFrame(this.raf); }

  resize() {
    const box = this.cv.parentElement?.clientWidth || 300;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    this.scale = Math.max(2, Math.floor(Math.min(box, 380) / ASH_W));
    this.cv.style.width = `${ASH_W * this.scale}px`; this.cv.style.height = `${ASH_H * this.scale}px`;
    this.cv.width = ASH_W * this.scale * dpr; this.cv.height = ASH_H * this.scale * dpr;
    this.ctx = this.cv.getContext("2d");
  }

  frame(now) {
    this.acc += Math.min(50, now - this.last); this.last = now;
    while (this.acc >= STEP) { this.update(); this.acc -= STEP; }
    this.draw();
  }

  /** Forme de la clope à l'instant t : points et couleurs. */
  shape() {
    const t = this.t;
    const ease = (k) => 1 - (1 - k) ** 3;
    if (t < T_IN) {
      const k = ease(t / T_IN), a = 0.95 - 0.35 * k;
      const x = 52 + (CONTACT.x + 3 - 52) * k, y = -16 + (CONTACT.y - 9 + 16) * k;
      return { tip: [x, y], pts: linePts(x, y, a, 22), spec: cigSpec({ ember: (t >> 2) % 2 }) };
    }
    if (t < T_TOUCH) {
      const k = ((t - T_IN) / (T_TOUCH - T_IN)) ** 2, a = 0.6 - 0.1 * k;
      const x = CONTACT.x + 3 - 3 * k, y = CONTACT.y - 9 + 9 * k;
      return { tip: [x, y], pts: linePts(x, y, a, 22), spec: cigSpec({ ember: 0 }) };
    }
    // écrasement : le papier se plisse en accordéon, le filtre tourne d'un côté puis de l'autre
    const s = Math.min(STEPS - 1, ((t - T_TOUCH) / T_STEP) | 0), into = (t - T_TOUCH) % T_STEP;
    const press = t < T_END && into < 3 ? 1 : 0;
    const paper = Math.round(11 - s * 1.5), amp = 0.3 + s * 0.28;
    const a = 0.48 - s * 0.06 - press * 0.06;
    const twist = s % 2 ? 0.14 : -0.1;
    const pts = [];
    let x = CONTACT.x, y = CONTACT.y;
    const head = 2 + (s < 2 ? 2 : 0) + Math.min(1, s);
    for (let i = 0; i < head + paper; i++) {
      const z = i >= head ? ((i - head) % 3 === 1 ? amp : (i - head) % 3 === 2 ? -amp : 0) : 0;
      pts.push([x - Math.sin(a) * z, y - Math.cos(a) * z, a]);
      x += Math.cos(a) * (i >= head ? 0.8 : 1); y -= Math.sin(a) * (i >= head ? 0.8 : 1);
    }
    const fa = a + twist;
    for (let i = 0; i < 7; i++) { pts.push([x, y, fa]); x += Math.cos(fa); y -= Math.sin(fa); }
    const ember = s < 1 ? 1 : s < 2 ? 2 : s < 3 ? 3 : -1;
    const spec = cigSpec({ ember, ash: s < 2 ? 2 : 0, burnt: s >= 2 ? 2 : s >= 1 ? 1 : 0, paper: paper + 1, filter: 6 });
    return { tip: [CONTACT.x, CONTACT.y], pts, spec, s };
  }

  update() {
    if (this.stop > 0) { this.stop--; return; }
    const t = ++this.t;
    this.shake = this.shake > 0.3 ? this.shake * 0.8 : 0;
    const sh = this.shape();
    // fumée qui ondule depuis la braise
    if (t < T_TOUCH && t % 3 === 0) this.smoke(sh.tip[0], sh.tip[1] - 1, 0.7, 60);
    if (t === T_TOUCH) {
      this.stop = 4; this.shake = 1.6;
      play("touch");
      this.front.burst(16, () => { const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(0.5, 1.8); return { x: CONTACT.x, y: CONTACT.y - 1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.1, drag: 0.94, life: rnd(12, 26) | 0, c: (k) => (k < 0.3 ? "#fff6c8" : k < 0.6 ? "#ffcd75" : "#ef7d57"), floor: FLOOR, bounce: 0.25 }; });
      this.ground.burst(3, () => ({ x: CONTACT.x + rnd(-1, 2), y: CONTACT.y - 1, vx: rnd(-0.5, 0.5), vy: rnd(-0.8, -0.3), g: 0.12, life: 999, c: C.ash[(Math.random() * 3) | 0], floor: FLOOR - rnd(0, 2), bounce: 0.1 }));
      this.smear.push([CONTACT.x, CONTACT.y + 1], [CONTACT.x + 1, CONTACT.y + 1]);
    }
    if (t > T_TOUCH && t < T_END && (t - T_TOUCH) % T_STEP === 0) {
      const s = (t - T_TOUCH) / T_STEP;
      this.shake = 0.9;
      play("crush");
      // braises éjectées qui restent rouges au fond, puis s'éteignent
      if (s < 4) this.ground.burst(2, () => ({ x: CONTACT.x, y: CONTACT.y - 1, vx: rnd(-1.1, 0.6), vy: rnd(-1.2, -0.4), g: 0.12, life: rnd(80, 170) | 0, c: EMBER_FADE, floor: FLOOR - rnd(0, 3), bounce: 0.2 }));
      // tabac qui s'échappe du papier déchiré
      this.ground.burst(4, () => ({ x: CONTACT.x + rnd(1, 4), y: CONTACT.y - 2, vx: rnd(-0.6, 0.9), vy: rnd(-0.9, -0.2), g: 0.12, life: 999, c: TOBACCO[(Math.random() * 3) | 0], floor: FLOOR - rnd(0, 3), bounce: 0.1 }));
      for (let i = 0; i < 2; i++) this.smoke(CONTACT.x + rnd(-1, 2), CONTACT.y - 2, 0.8, 40, 2);
      this.smear.push([CONTACT.x - 1 - (s >> 1), CONTACT.y + 1], [CONTACT.x + 2 + (s >> 1), CONTACT.y], [CONTACT.x + (s % 3), CONTACT.y + 2]);
    }
    if (t === T_END) {
      play("psch");
      for (let i = 0; i < 16; i++) this.smoke(CONTACT.x + rnd(-2, 3), CONTACT.y - 2, 0.85, rnd(40, 70) | 0, 2, rnd(-0.6, 0.6));
    }
    // dernier filet qui se tortille et s'amincit
    if (t > T_END && t < T_END + 120 && t % 4 === 0) this.smoke(CONTACT.x, CONTACT.y - 2, 0.6 * (1 - (t - T_END) / 120), 80);
    if (t === T_END + 40) {
      this.count++;
      this.floats.push({ text: "+1", x: CONTACT.x + 16, y: CONTACT.y - 12, age: 0 });
      play("coin");
      this.style.count?.(this);
      this.onCount?.(this.count);
    }
    if (t === T_END + 140) this.onDone?.();
    this.fx.update(); this.ground.update(); this.front.update();
    for (const f of this.floats) f.age++;
    this.floats = this.floats.filter((f) => f.age < 70);
  }

  smoke(x, y, alpha, life, size = 1, vx = 0) {
    const seed = Math.random() * 10;
    this.fx.add({ x, y, vx, vy: rnd(-0.38, -0.25), drag: 0.99, life, c: "#dfe4ee", fade: true, fadeIn: true, alpha, size, grow: 0.02, seed, wob: 0.14 });
  }

  draw() {
    const b = this.b;
    b.clearRect(0, 0, ASH_W, ASH_H);
    b.save();
    if (this.shake) b.translate(Math.round(rnd(-1, 1) * this.shake), Math.round(rnd(-1, 1) * this.shake));
    b.fillStyle = "rgba(0,0,0,.3)";
    b.fillRect(CX - 15, 30, 30, 2);
    this.style.back?.(b, this.t, SCENE);
    if (this.style.alpha !== 0) { b.globalAlpha = this.style.alpha ?? 1; b.drawImage(this.tray.img, CX - 21, 16); b.globalAlpha = 1; }
    for (const a of this.ash) { b.fillStyle = a.c; b.fillRect(a.x, a.y, 1, 1); }
    b.fillStyle = "#2b2530";
    for (const [x, y] of this.smear) b.fillRect(x, y, 1, 1);
    for (const p of this.pile) drawStick(b, linePts(p.x, p.y, p.a, p.spec.length), p.spec);
    this.ground.draw(b);
    const sh = this.shape();
    drawStick(b, sh.pts, sh.spec);
    // halo de la braise tant qu'elle brûle
    if (this.t < T_TOUCH + T_STEP * 2 && (this.t >> 2) % 3) {
      b.globalAlpha = this.t < T_TOUCH ? 0.3 : 0.5;
      b.fillStyle = "#ffcd75";
      b.fillRect(Math.round(sh.tip[0]) - 1, Math.round(sh.tip[1]) - 1, 3, 3);
      b.globalAlpha = 1;
    }
    this.style.front?.(b, this.t, SCENE);
    this.fx.draw(b);
    this.front.draw(b);
    for (const f of this.floats) { if (f.age > 55 && (f.age >> 1) % 2) continue; drawText(b, f.text, f.x, f.y - f.age * 0.25, { color: "#ffcd75", sc: f.age < 4 ? 3 : 2 }); }
    b.restore();
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.drawImage(this.buf, 0, 0, this.cv.width, this.cv.height);
  }
}
