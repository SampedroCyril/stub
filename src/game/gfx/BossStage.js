import { compile, OUTLINE } from "./sprite.js";
import { Particles, SPARK, rnd } from "./particles.js";
import { drawText } from "./font.js";
import { BOSS_ART } from "./bossArt.js";
import { play } from "./sfx.js";

export const STAGE_W = 64, STAGE_H = 60;
const FLOOR = STAGE_H - 4;
const STEP = 1000 / 60;

/**
 * Scène de combat en canvas : le boss respire, cligne, encaisse, explose en pixels.
 * Le canvas interne fait 80 × 78 pixels, agrandi d'un facteur entier.
 */
export class BossStage {
  constructor(canvas, { boss = "cafe", maxHp = 100, hp = maxHp, onTap } = {}) {
    this.cv = canvas;
    this.art = BOSS_ART[boss];
    this.maxHp = maxHp; this.hp = hp; this.ghost = hp; this.ghostDelay = 0; this.healGlow = 0;
    this.onTap = onTap;
    this.buf = document.createElement("canvas");
    this.buf.width = STAGE_W; this.buf.height = STAGE_H;
    this.b = this.buf.getContext("2d");
    this.fx = new Particles(); this.front = new Particles(); this.floats = []; this.rings = [];
    this.cache = new Map();
    this.t = 0; this.shake = 0; this.stop = 0; this.flash = 0;
    this.kb = 0; this.kbv = 0; this.sq = 0; this.sqv = 0;
    this.nextBlink = 80; this.blinkT = 0; this.hurtT = 0; this.talkT = 0;
    this.weak = null; this.dead = false; this.koT = -1;
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement || canvas);
    this.down = (e) => this.tap(e);
    canvas.addEventListener("pointerdown", this.down);
    this.last = performance.now(); this.acc = 0;
    const loop = (now) => { this.frame(now); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.cv.removeEventListener("pointerdown", this.down); }

  resize() {
    const box = this.cv.parentElement?.clientWidth || 320;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    this.scale = Math.max(2, Math.floor(Math.min(box, 400) / STAGE_W));
    this.cv.style.width = `${STAGE_W * this.scale}px`;
    this.cv.style.height = `${STAGE_H * this.scale}px`;
    this.cv.width = STAGE_W * this.scale * dpr;
    this.cv.height = STAGE_H * this.scale * dpr;
    this.ctx = this.cv.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---------- état du boss ----------
  get crack() { const f = this.hp / this.maxHp; return f > 0.7 ? 0 : f > 0.45 ? 1 : f > 0.2 ? 2 : 3; }
  state() {
    return {
      blink: this.blinkT > 0, hurt: this.hurtT > 0, talk: this.talkT > 0 && (this.t >> 3) % 2 === 0,
      crack: this.crack, anger: this.hurtT > 0 || this.hp / this.maxHp < 0.45, f: (this.t / 6) | 0,
    };
  }
  sprite() {
    const s = this.state();
    const key = `${+s.blink}${+s.hurt}${+s.talk}${s.crack}${+s.anger}${s.f % 10}`;
    let sp = this.cache.get(key);
    if (!sp) { sp = compile(this.art.draw(s), this.art.pal); this.cache.set(key, sp); if (this.cache.size > 200) this.cache.clear(); }
    return sp;
  }
  get pos() { const sp = this.sprite(); return { x: Math.round((STAGE_W - sp.w) / 2), y: FLOOR - sp.h + 2, w: sp.w, h: sp.h }; }

  // ---------- entrées ----------
  toStage(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * STAGE_W, y: ((e.clientY - r.top) / r.height) * STAGE_H };
  }
  tap(e) {
    if (this.dead) return;
    const p = this.toStage(e);
    const w = this.weak;
    const onWeak = w && Math.hypot(p.x - w.x, p.y - w.y) <= 8;
    this.onTap?.({ ...p, weak: onWeak ? { age: (performance.now() - w.born) } : null });
  }

  /** Fait apparaître le point faible (coordonnées scène) ; null = position au hasard dans la zone du boss. */
  showWeak(ms = 1200, fastMs = 500) {
    const z = this.art.weakZone, p = this.pos;
    this.weak = { x: p.x + 1 + rnd(z.x0, z.x1), y: p.y + 1 + rnd(z.y0, z.y1), born: performance.now(), ms, fastMs };
    play("weak");
  }
  hideWeak() { this.weak = null; }

  // ---------- réactions ----------
  hit(dmg, { crit = false, big = false, x, y, label } = {}) {
    if (this.dead) return;
    const p = this.pos;
    x ??= p.x + p.w / 2 + rnd(-6, 6); y ??= p.y + p.h / 2 + rnd(-4, 4);
    this.hp = Math.max(0, this.hp - dmg);
    this.ghostDelay = big ? 30 : 22;
    this.stop = big ? 9 : crit ? 6 : 3;
    this.flash = big ? 6 : crit ? 5 : 3;
    this.shake = big ? 5 : crit ? 3 : 1.5;
    const dir = x < p.x + p.w / 2 ? 1 : -1;
    this.kbv += dir * (big ? 3.2 : crit ? 2.4 : 1.5);
    this.sq = big ? 0.32 : crit ? 0.24 : 0.14; this.sqv = 0;
    this.hurtT = big ? 40 : 24; this.talkT = 0;
    const cols = this.art.palList ||= Object.values(this.art.pal).map((v) => (typeof v === "string" ? v : v.r[1]));
    const n = big ? 40 : crit ? 18 : 9;
    this.fx.burst(n, () => {
      const a = rnd(-Math.PI, 0), v = rnd(0.8, big ? 3.6 : 2.4);
      return { x, y, vx: Math.cos(a) * v - dir * 0.4, vy: Math.sin(a) * v - 0.6, g: 0.14, life: rnd(35, 70) | 0, c: cols[(Math.random() * cols.length) | 0], size: Math.random() < 0.3 ? 2 : 1, floor: FLOOR, bounce: 0.45, blink: true };
    });
    this.front.burst(big ? 16 : crit ? 10 : 5, () => {
      const a = rnd(0, Math.PI * 2), v = rnd(1.2, big ? 3.4 : 2.6);
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.86, life: rnd(10, 18) | 0, c: SPARK };
    });
    this.rings.push({ x, y, r: 2, max: big ? 16 : crit ? 11 : 7, c: crit || big ? "#ffcd75" : "#ffffff" });
    this.float(label ?? `-${dmg}`, x, y - 4, { color: crit || big ? "#ffcd75" : "#ffffff", sc: big ? 3 : crit ? 2 : 1, alt: crit || big ? "#ef7d57" : null });
    play(big ? "big" : crit ? "crit" : "hit");
    if (navigator.vibrate) navigator.vibrate(big ? 40 : crit ? 25 : 10);
  }

  miss(x, y) {
    if (this.dead) return;
    this.fx.burst(4, () => ({ x: x + rnd(-1, 1), y: y + rnd(-1, 1), vx: rnd(-0.5, 0.5), vy: rnd(-0.6, -0.1), drag: 0.9, life: 22, c: "#94b0c2", fade: true, size: 2, grow: 0.05 }));
    this.float("raté", x, y - 3, { color: "#94b0c2", sc: 1 });
    this.talkT = 40;
    this.kbv += x < STAGE_W / 2 ? -0.6 : 0.6;
    play("miss");
  }

  heal(n) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + n);
    this.ghost = this.hp; this.healGlow = 30;
    this.sq = -0.18; this.sqv = 0; this.talkT = 50;
    const p = this.pos;
    this.front.burst(14, (i) => ({ x: p.x + rnd(4, p.w - 4), y: p.y + rnd(8, p.h - 4), vy: rnd(-0.9, -0.4), life: rnd(30, 50) | 0, c: i % 3 ? "#a7f070" : "#ffffff", blink: true, wob: 0.3 }));
    this.float(`+${n}`, p.x + p.w / 2, p.y + 4, { color: "#a7f070", sc: 2 });
    play("heal");
  }

  refused(dmg) { this.hit(dmg, { crit: true, label: `non! -${dmg}` }); play("refuse"); }

  /** K.O. : flash, gel, puis le boss éclate en pixels qui rebondissent. */
  ko() {
    if (this.dead) return Promise.resolve();
    this.dead = true; this.weak = null;
    this.hp = 0; this.hurtT = 999; this.flash = 14; this.stop = 14; this.shake = 2; this.koT = 0;
    play("tap");
    return new Promise((res) => { this.koDone = res; });
  }
  explode() {
    const sp = this.sprite(), p = this.pos, cx = p.x + sp.w / 2, cy = p.y + sp.h / 2;
    for (const px of sp.pixels) {
      const dx = px.x + p.x - cx, dy = px.y + p.y - cy;
      this.fx.add({ x: p.x + px.x, y: p.y + px.y, vx: dx * 0.07 + rnd(-0.5, 0.5), vy: dy * 0.05 - rnd(1.2, 3.4), g: 0.13, life: rnd(80, 140) | 0, c: px.c, floor: FLOOR - rnd(0, 2), bounce: 0.38, blink: true });
    }
    this.front.burst(30, () => { const a = rnd(0, Math.PI * 2), v = rnd(1.5, 4); return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.88, life: rnd(14, 26) | 0, c: SPARK, size: 2 }; });
    this.rings.push({ x: cx, y: cy, r: 3, max: 34, c: "#ffffff" });
    this.shake = 6;
    play("ko");
  }

  float(text, x, y, { color = "#fff", sc = 1, alt = null } = {}) {
    this.floats.push({ text: String(text), x, y, vy: -1.3, age: 0, life: 46, color, sc, alt });
  }
  setHp(hp) { this.hp = hp; if (this.ghost < hp) this.ghost = hp; }

  // ---------- boucle ----------
  frame(now) {
    this.acc += Math.min(100, now - this.last); this.last = now;
    while (this.acc >= STEP) { this.update(); this.acc -= STEP; }
    this.draw();
  }

  update() {
    // les textes et la fumée continuent pendant le gel, pas le reste
    if (this.stop > 0) { this.stop--; if (this.stop === 0 && this.koT === 0) { this.koT = 1; this.explode(); } return; }
    this.t++;
    if (this.koT > 0) {
      this.koT++;
      if (this.koT === 34) { this.koText = { age: 0 }; this.shake = 4; play("slam"); }
      if (this.koT === 120) this.koDone?.();
    }
    if (this.koText) this.koText.age++;
    if (--this.nextBlink <= 0) { this.blinkT = 7; this.nextBlink = rnd(90, 220) | 0; }
    if (this.blinkT > 0) this.blinkT--;
    if (this.hurtT > 0 && this.hurtT < 900) this.hurtT--;
    if (this.talkT > 0) this.talkT--;
    if (this.flash > 0) this.flash--;
    if (this.healGlow > 0) this.healGlow--;
    this.shake = this.shake > 0.3 ? this.shake * 0.86 : 0;
    this.kbv += -this.kb * 0.22; this.kbv *= 0.72; this.kb += this.kbv;
    this.sqv += -this.sq * 0.3; this.sqv *= 0.68; this.sq += this.sqv;
    if (this.ghostDelay > 0) this.ghostDelay--;
    else if (this.ghost > this.hp) this.ghost = Math.max(this.hp, this.ghost - Math.max(0.4, (this.ghost - this.hp) * 0.07));
    if (this.weak && performance.now() - this.weak.born > this.weak.ms) this.weak = null;
    // vapeur
    if (!this.dead && this.t % 7 === 0) {
      const p = this.pos, st = this.art.steam, angry = this.hp / this.maxHp < 0.45;
      this.fx.add({ x: p.x + st.x + rnd(-4, 4), y: p.y + st.y, vy: rnd(-0.32, -0.18), life: rnd(50, 80) | 0, c: angry ? st.angry : "#dfe4ee", fade: true, fadeIn: true, alpha: 0.75, wob: 0.12, size: 1, grow: 0.025 });
    }
    this.fx.update(); this.front.update();
    for (const r of this.rings) r.r += 1.6;
    this.rings = this.rings.filter((r) => r.r < r.max);
    for (const f of this.floats) { f.age++; f.y += f.vy; f.vy *= 0.88; }
    this.floats = this.floats.filter((f) => f.age < f.life);
  }

  draw() {
    const b = this.b;
    b.clearRect(0, 0, STAGE_W, STAGE_H);
    const sx = this.shake ? Math.round(rnd(-1, 1) * this.shake) : 0, sy = this.shake ? Math.round(rnd(-1, 1) * this.shake) : 0;
    b.save();
    b.translate(sx, sy);
    const p = this.pos;
    // ombre au sol
    if (!this.dead || this.koT <= 0) {
      const bob = (this.t >> 4) % 2;
      const sw = Math.round(p.w * (0.8 - bob * 0.04 - this.sq * 0.3));
      b.fillStyle = "rgba(0,0,0,.28)";
      b.fillRect(Math.round(STAGE_W / 2 - sw / 2), p.y + p.h - 2, sw, 2);
      b.fillRect(Math.round(STAGE_W / 2 - sw / 2) + 3, p.y + p.h, sw - 6, 1);
    }
    this.fx.draw(b);
    if (this.koT <= 0) this.drawBoss(b, p);
    this.drawWeak(b);
    for (const r of this.rings) this.ring(b, r);
    this.front.draw(b);
    for (const f of this.floats) this.drawFloat(b, f);
    if (this.koText) {
      const a = this.koText.age, sc = a < 3 ? 6 - a : 3;
      drawText(b, "K.O.", STAGE_W / 2, STAGE_H / 2 - 12 - (sc * 5) / 2 + 7, { color: (a >> 2) % 2 && a < 30 ? "#ffffff" : "#e43b44", sc });
    }
    b.restore();
    this.drawHp(b);
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.drawImage(this.buf, 0, 0, this.cv.width, this.cv.height);
  }

  drawBoss(b, p) {
    const sp = this.sprite();
    const bob = this.dead ? 0 : [0, 0, -1, -1][(this.t >> 4) % 4];
    const sy = 1 - this.sq, sxs = 1 + this.sq * 0.7;
    const w = Math.round(sp.w * sxs), h = Math.round(sp.h * sy);
    const x = Math.round(p.x + this.kb + (sp.w - w) / 2), y = Math.round(p.y + bob + (sp.h - h));
    b.drawImage(sp.img, x, y, w, h);
    if ((this.flash > 0 && this.flash % 2 === 1) || (this.dead && this.koT === 0)) b.drawImage(sp.white, x, y, w, h);
    if (this.healGlow > 0 && (this.healGlow >> 2) % 2) { b.globalAlpha = 0.5; b.drawImage(sp.white, x, y, w, h); b.globalAlpha = 1; }
  }

  drawWeak(b) {
    const w = this.weak;
    if (!w) return;
    const age = performance.now() - w.born;
    const k = Math.max(0, 1 - age / w.fastMs); // les crochets se referment pendant la fenêtre « critique »
    const gap = Math.round(2 + k * 5), x = Math.round(w.x), y = Math.round(w.y);
    const col = age < w.fastMs ? ((age / 90) | 0) % 2 ? "#ffcd75" : "#ffffff" : "#e43b44";
    b.fillStyle = OUTLINE;
    b.fillRect(x - 2, y - 2, 5, 5);
    b.fillStyle = col;
    b.fillRect(x - 1, y - 1, 3, 3);
    b.fillStyle = "#e43b44";
    b.fillRect(x, y, 1, 1);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + dx * gap, cy = y + dy * gap;
      b.fillStyle = OUTLINE;
      b.fillRect(cx - 1, cy - 1, 3, 3);
      b.fillStyle = col;
      b.fillRect(cx, cy, 1, 1); b.fillRect(cx - dx, cy, 1, 1); b.fillRect(cx, cy - dy, 1, 1);
    }
  }

  ring(b, r) {
    b.fillStyle = r.c;
    b.globalAlpha = r.r / r.max > 0.6 ? 0.5 : 1;
    const n = Math.max(8, Math.round(r.r * 5));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      b.fillRect(Math.round(r.x + Math.cos(a) * r.r), Math.round(r.y + Math.sin(a) * r.r * 0.8), 1, 1);
    }
    b.globalAlpha = 1;
  }

  drawFloat(b, f) {
    const t = f.age / f.life;
    if (t > 0.75 && (f.age >> 1) % 2) return;
    const sc = f.age < 4 ? f.sc + 1 : f.sc;
    const color = f.alt && (f.age >> 2) % 2 ? f.alt : f.color;
    drawText(b, f.text, f.x, f.y - (sc * 5) / 2, { color, sc });
  }

  drawHp(b) {
    const x = 4, y = 2, w = STAGE_W - 8, h = 7;
    b.fillStyle = OUTLINE; b.fillRect(x - 1, y - 1, w + 2, h + 2);
    b.fillStyle = "#29213a"; b.fillRect(x, y, w, h);
    const f = this.hp / this.maxHp, g = this.ghost / this.maxHp;
    const gw = Math.round(w * g), fw = Math.round(w * f);
    b.fillStyle = this.ghostDelay > 14 ? "#ffffff" : "#b13e53"; b.fillRect(x, y, gw, h);
    const low = f < 0.25;
    const col = this.healGlow > 0 && (this.healGlow >> 2) % 2 ? "#a7f070" : f > 0.55 ? "#38b764" : f > 0.25 ? "#ffcd75" : low && (this.t >> 3) % 2 ? "#ff6b70" : "#e43b44";
    b.fillStyle = col; b.fillRect(x, y, fw, h);
    b.fillStyle = "rgba(255,255,255,.35)"; b.fillRect(x, y, fw, 1);
    b.fillStyle = "rgba(0,0,0,.25)"; b.fillRect(x, y + h - 2, fw, 2);
    drawText(b, `${Math.ceil(this.hp)} PV`, STAGE_W / 2, y + 1, { color: "#ffffff", sc: 1 });
  }
}
