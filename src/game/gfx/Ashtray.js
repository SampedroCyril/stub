import { grid, compile, OUTLINE } from "./sprite.js";
import { Particles, SPARK, rnd } from "./particles.js";
import { drawText } from "./font.js";
import { play } from "./sfx.js";

export const ASH_W = 56, ASH_H = 38;
const STEP = 1000 / 60;
const CX = 28;
const CONTACT = { x: 17, y: 27 };
const FLOORY = 29;

const EMBER = ["#fff6c8", "#ffcd75", "#ef7d57", "#b13e53", "#5d275d", "#3a3340"];

function ashtraySprite() {
  const g = grid(46, 17);
  g.ellipse(23, 13.5, 17, 3, "b");
  g.ellipse(23, 8, 22.5, 7.6, "a");
  g.ellipse(23, 6.6, 18, 4.4, "i");
  g.ellipse(23, 7.6, 16, 3.2, "h");
  g.rect(21, 0, 4, 1, ".").rect(22, 1, 2, 1, "i");
  g.rect(0, 7, 2, 2, ".").rect(44, 7, 2, 2, ".");
  return compile(g, {
    a: { r: ["#1f3b7a", "#3b5dc9", "#73a6f6"], cyl: true },
    b: { r: ["#151d3b", "#29366f", "#3b5dc9"] },
    i: "#1b2550",
    h: "#25336a",
  });
}

const BUTT = [
  [" kk      ", "kapkkkkk ", "kPpPfffffk", " kkkFFFFFk", "    kkkkk "],
  ["      kk ", " kkkkkpak", "kfffffPpPk", "kFFFFFkkk ", " kkkkk    "],
  ["  kkkk   ", " kffffk  ", "kfFFFFPpk ", " kkkkkPak ", "      kk  "],
];
const BCOL = { k: OUTLINE, f: "#ef7d57", F: "#b8601f", p: "#f4f4f4", P: "#a8adbd", a: "#5b5766" };
const OLD = { k: OUTLINE, f: "#a8603f", F: "#6e3d22", p: "#a9adbb", P: "#6d7183", a: "#4a4655" };

/** Scène de victoire : la clope s'écrase et s'éteint dans le cendrier. */
export class AshtrayScene {
  constructor(canvas, { count = 0, onCount, onDone } = {}) {
    this.cv = canvas; this.count = count; this.onCount = onCount; this.onDone = onDone;
    this.buf = document.createElement("canvas"); this.buf.width = ASH_W; this.buf.height = ASH_H;
    this.b = this.buf.getContext("2d");
    this.tray = ashtraySprite();
    this.fx = new Particles(); this.front = new Particles(); this.floats = [];
    this.pile = [];
    let seed = 7;
    const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < Math.min(count, 4); i++) this.pile.push({ x: [33, 36, 31, 37][i], y: [26, 23, 24, 26][i] - (i === 3 ? 1 : 0), v: [0, 2, 1, 0][i] });
    this.ash = Array.from({ length: Math.min(18, 4 + count) }, () => ({ x: 12 + r() * 32 | 0, y: 24 + r() * 5 | 0, c: r() < 0.5 ? "#6d6875" : "#8b8794" }));
    this.t = 0; this.stop = 0; this.shake = 0;
    this.resize();
    this.last = performance.now(); this.acc = 0;
    const loop = (now) => { this.frame(now); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() { cancelAnimationFrame(this.raf); }

  resize() {
    const box = this.cv.parentElement?.clientWidth || 300;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    this.scale = Math.max(2, Math.floor(Math.min(box, 360) / ASH_W));
    this.cv.style.width = `${ASH_W * this.scale}px`; this.cv.style.height = `${ASH_H * this.scale}px`;
    this.cv.width = ASH_W * this.scale * dpr; this.cv.height = ASH_H * this.scale * dpr;
    this.ctx = this.cv.getContext("2d");
  }

  frame(now) {
    this.acc += Math.min(100, now - this.last); this.last = now;
    while (this.acc >= STEP) { this.update(); this.acc -= STEP; }
    this.draw();
  }

  /** Géométrie de la clope à l'instant t : point de braise, angles, longueurs, couleur de braise. */
  cig() {
    const t = this.t;
    const ease = (k) => 1 - (1 - k) ** 3;
    if (t < 40) {
      const k = ease(t / 40);
      return { x: 62 + (28 - 62) * k, y: -14 + (14 - -14) * k, a1: 0.75, a2: 0.75, l1: 10, l2: 10, ember: (t >> 2) % 2 ? 0 : 1 };
    }
    if (t < 55) {
      const k = ((t - 40) / 15) ** 2;
      return { x: 28 + (CONTACT.x - 28) * k, y: 14 + (CONTACT.y - 14) * k, a1: 0.75, a2: 0.75, l1: 10, l2: 10, ember: 0 };
    }
    if (t < 95) {
      const step = Math.min(3, ((t - 55) / 10) | 0);
      return { x: CONTACT.x, y: CONTACT.y, a1: [1.05, 1.15, 1.0, 0.75][step], a2: [0.35, -0.1, -0.45, -0.7][step], l1: [7, 6, 5, 4][step], l2: [12, 11, 9, 7][step], ember: 1 + step + (step > 1 ? 1 : 0) };
    }
    return null;
  }

  update() {
    if (this.stop > 0) { this.stop--; return; }
    const t = ++this.t;
    this.shake = this.shake > 0.3 ? this.shake * 0.82 : 0;
    const c = this.cig();
    if (c && t < 55 && t % 3 === 0) this.fx.add({ x: c.x, y: c.y - 1, vy: rnd(-0.5, -0.3), vx: rnd(-0.1, 0.15), life: 50, c: "#dfe4ee", fade: true, alpha: 0.7, wob: 0.15, grow: 0.02 });
    if (t === 55) {
      this.stop = 5; this.shake = 2.5;
      this.front.burst(22, () => { const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(0.8, 2.6); return { x: CONTACT.x, y: CONTACT.y - 1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.12, drag: 0.95, life: rnd(16, 32) | 0, c: SPARK, floor: FLOORY, bounce: 0.3 }; });
      this.ashPuff(8);
      play("crush");
    }
    if (t > 55 && t < 95 && (t - 55) % 10 === 0) {
      this.shake = 1.4;
      this.front.burst(6, () => { const a = rnd(-Math.PI, 0), v = rnd(0.5, 1.6); return { x: CONTACT.x, y: CONTACT.y - 1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.1, life: rnd(10, 20) | 0, c: SPARK }; });
      this.ashPuff(3);
      play("crush");
    }
    if (t === 95) {
      play("psch");
      this.fx.burst(26, () => ({ x: CONTACT.x + rnd(-2, 4), y: CONTACT.y - 2, vx: rnd(-0.6, 0.6), vy: rnd(-0.9, -0.2), drag: 0.95, life: rnd(40, 70) | 0, c: Math.random() < 0.5 ? "#c2c3c7" : "#94b0c2", fade: true, alpha: 0.85, size: 2, grow: 0.06, wob: 0.1 }));
    }
    if (t > 95 && t < 175 && t % 5 === 0) {
      const k = 1 - (t - 95) / 80;
      this.fx.add({ x: CONTACT.x + 1, y: CONTACT.y - 3, vy: -0.35, life: 60, c: "#dfe4ee", fade: true, alpha: 0.6 * k, wob: 0.2, seed: t * 0.3 });
    }
    if (t === 118) {
      this.count++;
      this.floats.push({ text: "+1", x: CONTACT.x + 18, y: CONTACT.y - 12, age: 0 });
      play("coin");
      this.onCount?.(this.count);
    }
    if (t === 210) this.onDone?.();
    this.fx.update(); this.front.update();
    for (const f of this.floats) f.age++;
    this.floats = this.floats.filter((f) => f.age < 60);
  }

  ashPuff(n) {
    this.fx.burst(n, () => ({ x: CONTACT.x + rnd(-2, 2), y: CONTACT.y, vx: rnd(-0.8, 0.8), vy: rnd(-1, -0.2), g: 0.06, life: rnd(20, 40) | 0, c: Math.random() < 0.5 ? "#6d6875" : "#b3b9d1", floor: FLOORY, bounce: 0.2 }));
  }

  drawCig(b, c) {
    const pts = [];
    const seg = (x, y, a, l, from) => { for (let i = 0; i < l; i++) pts.push({ x: x + Math.cos(a) * i, y: y - Math.sin(a) * i, i: from + i }); return { x: x + Math.cos(a) * l, y: y - Math.sin(a) * l }; };
    const mid = seg(c.x, c.y, c.a1, c.l1, 0);
    seg(mid.x, mid.y, c.a2, c.l2, c.l1);
    const L = c.l1 + c.l2;
    const colOf = (i, low) => {
      if (i === 0) return EMBER[c.ember];
      if (i === 1 && c.ember < 3) return low ? "#5b5766" : "#8b8794";
      if (i >= L - 5) return i === L - 5 ? "#ffcd75" : low ? "#b8601f" : "#ef7d57";
      return low ? "#a8adbd" : "#f4f4f4";
    };
    b.fillStyle = OUTLINE;
    for (const p of pts) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 2]]) b.fillRect(Math.round(p.x) + dx, Math.round(p.y) + dy, 1, 1);
    for (const p of pts) {
      b.fillStyle = colOf(p.i, false); b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      b.fillStyle = colOf(p.i, true); b.fillRect(Math.round(p.x), Math.round(p.y) + 1, 1, 1);
    }
    if (c.ember <= 1 || this.t === 55) { b.globalAlpha = this.t >= 55 ? 0.6 : 0.35; b.fillStyle = "#ffcd75"; b.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, 3, 3); b.globalAlpha = 1; }
  }

  stampButt(b, x, y, v, glow = false, old = false) {
    const pal = old ? OLD : BCOL;
    BUTT[v].forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== " ") { b.fillStyle = glow && ch === "a" ? "#b13e53" : pal[ch]; b.fillRect(x + i, y + j, 1, 1); } }));
  }

  draw() {
    const b = this.b;
    b.clearRect(0, 0, ASH_W, ASH_H);
    b.save();
    if (this.shake) b.translate(Math.round(rnd(-1, 1) * this.shake), Math.round(rnd(-1, 1) * this.shake));
    b.fillStyle = "rgba(0,0,0,.3)";
    b.fillRect(CX - 19, 35, 38, 2);
    b.drawImage(this.tray.img, CX - 24, 19);
    for (const a of this.ash) { b.fillStyle = a.c; b.fillRect(a.x, a.y, 1, 1); }
    for (const p of this.pile) this.stampButt(b, p.x, p.y, p.v, false, true);
    this.fx.draw(b);
    const c = this.cig();
    if (c) this.drawCig(b, c);
    else if (this.t >= 95) this.stampButt(b, CONTACT.x - 1, CONTACT.y - 3, 0, this.t < 140 && (this.t >> 3) % 2);
    this.front.draw(b);
    for (const f of this.floats) { if (f.age > 45 && (f.age >> 1) % 2) continue; drawText(b, f.text, f.x, f.y - f.age * 0.3, { color: "#ffcd75", sc: f.age < 4 ? 3 : 2 }); }
    b.restore();
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.drawImage(this.buf, 0, 0, this.cv.width, this.cv.height);
  }
}
