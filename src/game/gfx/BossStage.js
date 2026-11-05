import { compile, OUTLINE } from "./sprite.js";
import { Particles, SPARK, rnd } from "./particles.js";
import { drawText, drawBig, bigWidth } from "./font.js";
import { BOSS_ART } from "./bossArt.js";
import { play } from "./sfx.js";
import { C, cigSpec, linePts, drawStick } from "./stick.js";
import { grid } from "./sprite.js";
import { SPRITES } from "../sprites.js";
import { INK, BLOOD, PAPER, AIR, pline, bolts } from "./pix.js";
import { fxMethods, ULT, KO, HIT_SKINS, DARK, CRIT_PAL, TITLES } from "./fxPack.js";
import { AURAS, moreMethods } from "./fxMore.js";

export const STAGE_W = 64, STAGE_H = 60;
const FLOOR = 56;
const GAUGE_Y = 68;
const JCOL = { perfect: "#ffcd75", good: "#ffffff", miss: "#e43b44", took: "#e43b44", refused: "#3ae0ff" };
const STEP = 1000 / 60;

/** Couronne des boss de niveau 3 et plus. */
let crownCache = null;
function crownSprite() {
  if (crownCache) return crownCache;
  const sp = SPRITES.crown, g = grid(sp.px[0].length, sp.px.length);
  sp.px.forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") g.d[y][x] = c; }));
  return (crownCache = compile(g, sp.pal));
}

/** Son de chaque petit palier (les gros paliers ont le leur). */
const TIER_SFX = { 1: "hit", 2: "hit2", 3: "hit3", 4: "crit4", 5: "crit5" };

/** Effet tiré au hasard dans une réserve (Arsenal), ou l'effet par défaut. */
const pickFrom = (pool, def) => (pool?.length ? pool[(Math.random() * pool.length) | 0] : def);


/**
 * Scène de combat en canvas : le boss respire, cligne, encaisse, explose en pixels.
 * Un second canvas plein écran porte les effets qui débordent : éclairs, flashs, lignes de vitesse, textes géants.
 */
export class BossStage {
  constructor(canvas, { boss = "cafe", maxHp = 100, hp = maxHp, onTap, onWeakExpire, shakeEl = null, fxRoot = null, intense, ultStyle = "random", koStyle = "random", training = false, lvl = 1 } = {}) {
    this.cv = canvas;
    this.art = BOSS_ART[boss];
    this.maxHp = maxHp; this.hp = hp; this.ghost = hp; this.ghostDelay = 0; this.healGlow = 0;
    this.onTap = onTap; this.onWeakExpire = onWeakExpire; this.shakeEl = shakeEl; this.fxRoot = fxRoot;
    this.ultStyle = ultStyle; this.koStyle = koStyle; this._filt = "";
    this.training = training; this.score = 0;
    this.crown = lvl >= 3 ? crownSprite() : null;
    this.intense = intense ?? !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.combo = 0; this.comboPop = 0; this.frenzy = null;
    this.buf = document.createElement("canvas");
    this.buf.width = STAGE_W; this.buf.height = STAGE_H;
    this.b = this.buf.getContext("2d");
    this.fx = new Particles(); this.front = new Particles(); this.floats = []; this.rings = []; this.stamps = [];
    this.cache = new Map();
    this.t = 0; this.shake = 0; this.stop = 0; this.flash = 0; this.slow = 0; this.chroma = 0;
    this.kb = 0; this.kbv = 0; this.sq = 0; this.sqv = 0;
    this.nextBlink = 80; this.blinkT = 0; this.hurtT = 0; this.talkT = 0;
    this.weak = null; this.dead = false; this.koT = -1; this.pending = null;
    // calque plein écran
    this.ov = document.createElement("canvas");
    this.ov.setAttribute("aria-hidden", "true");
    Object.assign(this.ov.style, { position: "fixed", left: "0", top: "0", pointerEvents: "none", zIndex: "9999", imageRendering: "pixelated", display: "none" });
    document.body.appendChild(this.ov);
    this.ovBuf = document.createElement("canvas"); this.ob = this.ovBuf.getContext("2d");
    this.ovFx = []; this.ovParts = new Particles();
    document.fonts?.load?.('700 30px "Chakra Petch"').catch(() => {}); // police des titres, chargée d'avance
    window.__boss = this; // poignée de débogage (tests de bout en bout)
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement || canvas);
    this.onWin = () => this.resize();
    window.addEventListener("resize", this.onWin);
    this.down = (e) => this.tap(e);
    canvas.addEventListener("pointerdown", this.down);
    this.last = performance.now(); this.acc = 0;
    const loop = (now) => { this.frame(now); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf); this.ro.disconnect();
    window.removeEventListener("resize", this.onWin);
    this.cv.removeEventListener("pointerdown", this.down);
    this.ov.remove();
    if (this.shakeEl) { this.shakeEl.style.transform = ""; this.shakeEl.classList.remove("trance"); }
    if (this.fxRoot) this.fxRoot.style.filter = "";
  }

  resize() {
    const par = this.cv.parentElement, box = par?.clientWidth || 320;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    // en plein écran, la scène prend toute la place que lui laissent le titre et la jauge
    const full = !!this.cv.closest(".fight");
    const hBox = full ? (Math.max(120, par.clientHeight) * STAGE_W) / STAGE_H : Infinity;
    this.scale = Math.max(2, Math.floor(Math.min(box, full ? 640 : 400, hBox) / STAGE_W));
    this.cv.style.width = `${STAGE_W * this.scale}px`;
    this.cv.style.height = `${STAGE_H * this.scale}px`;
    this.cv.width = STAGE_W * this.scale * dpr;
    this.cv.height = STAGE_H * this.scale * dpr;
    this.ctx = this.cv.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.OW = Math.ceil(window.innerWidth / this.scale); this.OH = Math.ceil(window.innerHeight / this.scale);
    this.ovBuf.width = this.OW; this.ovBuf.height = this.OH;
    this.ov.width = this.OW * this.scale * dpr; this.ov.height = this.OH * this.scale * dpr;
    this.ov.style.width = `${this.OW * this.scale}px`; this.ov.style.height = `${this.OH * this.scale}px`;
  }

  /** Ultime à jouer : tiré dans la réserve de l'Arsenal (un seul effet si un ultime est équipé). */
  pickUlt() { return pickFrom(this.ultPool, "fracture"); }

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
  /** Position du boss dans la grille du calque plein écran. */
  ovPos() {
    const r = this.cv.getBoundingClientRect(), p = this.pos;
    return { x: Math.round(r.left / this.scale + p.x + this.kb), y: Math.round(r.top / this.scale + p.y), ox: r.left / this.scale, oy: r.top / this.scale };
  }

  // ---------- entrées ----------
  toStage(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * STAGE_W, y: ((e.clientY - r.top) / r.height) * STAGE_H };
  }
  tap(e) {
    if (this.dead || this.pending) return;
    const p = this.toStage(e);
    const w = this.weak;
    const onWeak = w && Math.hypot(p.x - w.x, p.y - w.y) <= (this.hitR || 8);
    this.onTap?.({ ...p, weak: onWeak ? { age: performance.now() - w.born } : null });
  }

  showWeak(ms = 1200, fastMs = 500) {
    if (this.dead || this.pending) return;
    const z = this.art.weakZone, p = this.pos;
    this.weak = { x: p.x + 1 + rnd(z.x0, z.x1), y: p.y + 1 + rnd(z.y0, z.y1), born: performance.now(), ms, fastMs };
    play("weak");
  }
  hideWeak() { this.weak = null; }

  // ---------- réactions ----------
  /** Coup porté. crit = éclair noir plein écran ; big = attaque ultime avec charge. */
  hit(dmg, opts = {}) {
    if (this.dead) return;
    if (opts.big && !opts.now) {
      const ch = opts.charge ?? 34;
      this.pending = { dmg, opts: { ...opts, now: true }, t: ch };
      this.weak = null;
      this.ovFx.push({ k: "letterbox", age: 0, life: 116 + ch }, { k: "spot", age: 0, life: ch + 6 }, { k: "focus", age: 0, life: ch });
      this.chargeFx();
      play("charge");
      return;
    }
    const { crit = false, big = false, label, title, kind } = opts;
    const refuse = kind === "refuse";
    const p = this.pos;
    const x = opts.x ?? p.x + p.w / 2 + rnd(-6, 6), y = opts.y ?? p.y + p.h / 2 + rnd(-4, 4);
    if (!this.training) this.hp = Math.max(0, this.hp - dmg);
    this.ghostDelay = big ? 40 : crit ? 30 : 22;
    this.stop = big ? 12 : crit ? 9 : 3;
    this.flash = big ? 6 : crit ? 5 : 3;
    this.shake = big ? 7 : crit ? 5 : 1.8;
    const dir = x < p.x + p.w / 2 ? 1 : -1;
    this.kbv += dir * (big ? 4.5 : crit ? 3.4 : 1.5);
    this.sq = big ? 0.36 : crit ? 0.3 : 0.14; this.sqv = 0;
    this.hurtT = big ? 50 : crit ? 36 : 24; this.talkT = 0;
    this.chroma = big ? 26 : crit ? 18 : 0;
    if (refuse) { this.stop = 6; this.flash = 4; this.shake = 3.5; this.chroma = 0; }
    const cols = this.art.palList ||= Object.values(this.art.pal).map((v) => (typeof v === "string" ? v : v.r[1]));
    const n = big ? 60 : crit ? 30 : 9;
    this.fx.burst(n, () => {
      const a = rnd(-Math.PI, 0), v = rnd(0.8, big ? 4.6 : crit ? 3.4 : 2.4);
      return { x, y, vx: Math.cos(a) * v - dir * 0.4, vy: Math.sin(a) * v - 0.6, g: 0.14, life: rnd(35, 80) | 0, c: cols[(Math.random() * cols.length) | 0], size: Math.random() < 0.35 ? 2 : 1, floor: FLOOR, bounce: 0.45, blink: true };
    });
    const SK = !refuse && this.hitSkin && HIT_SKINS[this.hitSkin]?.p ? HIT_SKINS[this.hitSkin] : null;
    const bigStyle = big ? opts.style ?? this.pickUlt() : null, P = big ? ULT[bigStyle]?.pal || DARK : DARK;
    if (SK) {
      this.front.burst(big ? 30 : crit ? 22 : SK.cnt, (i) => SK.p(x, y, big ? 1.4 : crit ? 1.2 : 1, i));
      if (!big) this.stamps.push({ k: this.hitSkin, x, y, age: 0, life: SK.life, r: Math.random() * 100 });
    } else this.front.burst(big ? 24 : crit ? 16 : 5, () => {
      const a = rnd(0, Math.PI * 2), v = rnd(1.2, big ? 4.2 : 3.2);
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.86, life: rnd(10, 20) | 0, c: refuse ? (Math.random() < 0.5 ? AIR : "#ffffff") : crit || big ? (Math.random() < 0.5 ? BLOOD : INK) : SPARK, size: crit || big || refuse ? 2 : 1 };
    });
    this.rings.push({ x, y, r: 2, max: big ? 22 : crit ? 15 : refuse ? 14 : 7, c: refuse ? AIR : big ? P.ring : crit ? BLOOD : SK?.ring || "#ffffff" });
    const fl = SK && !big && !crit ? { color: SK.col, out: SK.out, alt: SK.alt, cycle: SK.cycle } : {};
    this.float(label ?? `-${dmg}`, x, y - 4, { color: fl.color ?? opts.color ?? "#ffffff", sc: opts.sc ?? (big ? 3 : crit || refuse ? 2 : 1), alt: refuse ? AIR : big ? P.acc : crit ? BLOOD : fl.alt ?? null, out: fl.out, cycle: fl.cycle });
    if (SK && !big) play(SK.sfx);
    const o = this.ovPos(), ix = o.ox + x, iy = o.oy + y;
    if (refuse) {
      this.ovFx.push({ k: "flash", age: 0, life: 16, delay: 0, col: AIR, a: 0.3 });
      this.ovFx.push({ k: "lines", age: 0, life: 22, x: ix, y: iy, delay: 0, col: AIR });
      for (let i = 0; i < 2; i++) this.ovFx.push({ k: "ring", age: 0, life: 34, delay: i * 5, x: ix, y: iy, col: AIR });
    } else if (crit || big) {
      const style = bigStyle ?? "fracture";
      const U = ULT[style] || ULT.fracture, pal = big ? P : DARK;
      const D = big ? U.D : 9;
      if (big) {
        if (style === "nova") this.ovFx.push({ k: "nova", age: 0, life: 52, x: ix, y: iy });
        else if (ULT[style] && style !== "fracture") this.ovFx.push({ k: `u_${style}`, age: 0, life: U.life, x: ix, y: iy, ...this[`mk_u_${style}`]?.(ix, iy) });
        else this.ovFx.push({ k: "fracture", age: 0, life: 75, x: ix, y: iy, net: this.crackNet(ix, iy) });
        this.slow = 70;
      } else if (this.intense) this.ovFx.push({ k: "strobe", age: 0, life: 9, x: ix, y: iy, reach: 100, n: 8 });
      else this.ovFx.push({ k: "flash", age: 0, life: 12, delay: 0, col: BLOOD, a: 0.35 });
      this.ovFx.push({ k: "lines", age: 0, life: big ? 34 : 24, x: ix, y: iy, delay: D, col: pal.lines });
      this.ovFx.push({ k: "vignette", age: 0, life: big ? 50 : 34, delay: D, col: pal.vig });
      this.ovFx.push({ k: "text", age: 0, life: big ? 70 : 52, delay: D, text: title ?? (big ? U.n : TITLES[6]), fx: big ? [2, 3] : [1, 2], y: Math.max(14, iy - 50), pal });
      if (big) for (let i = 0; i < 3; i++) this.ovFx.push({ k: "ring", age: 0, life: 40, delay: D + i * 5, x: ix, y: iy, col: pal.ring, col2: pal.fg === INK ? INK : PAPER });
      play(opts.sfx ?? (big ? `ult_${ULT[style] ? style : "fracture"}` : "crit_h"));
    } else {
      this.ovFx.push({ k: "lines", age: 0, life: 8, x: ix, y: iy, delay: 0, col: "#ffffff", few: true });
      play(opts.sfx ?? "hit", opts.sfxArg);
    }
    if (navigator.vibrate) navigator.vibrate(big ? [30, 30, 80] : crit ? [20, 20, 50] : 10);
  }

  /**
   * Les 9 paliers d'impact, du petit choc à la transe :
   * 1 coup · 2 coup sûr · 3 coup net · 4 critique · 5 critique noir · 6 impact noir · 7 fracture · 8 supernova · 9 transe
   */
  tier(t, dmg, o = {}) {
    if (this.dead) return;
    const p = this.pos;
    const x = o.x ?? p.x + p.w / 2 + rnd(-6, 6), y = o.y ?? p.y + p.h / 2 + rnd(-4, 4);
    const base = { x, y, label: o.label };
    if (t >= 9) this.enterTrance();
    if (t >= 7) {
      const style = this.pickUlt();
      this.hit(dmg, { ...base, big: true, style, charge: 16, title: t >= 9 ? TITLES[9] : undefined });
      return;
    }
    if (t === 6) { this.hit(dmg, { ...base, crit: true, title: TITLES[6] }); return; }
    this.hit(dmg, { ...base, sfx: TIER_SFX[t], sfxArg: o.combo, sc: t >= 4 ? 2 : 1, color: t >= 2 ? "#ffcd75" : undefined });
    const ov = this.ovPos(), ix = ov.ox + x, iy = ov.oy + y;
    if (t >= 2) {
      this.shake = Math.max(this.shake, 2.2); this.sq = 0.2; this.chroma = Math.max(this.chroma, 4);
      this.front.burst(8, () => { const a = rnd(0, Math.PI * 2), v = rnd(1.2, 2.8); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.86, life: rnd(10, 18) | 0, c: SPARK }; });
    }
    if (t >= 3) {
      this.stop = Math.max(this.stop, 4);
      this.rings.push({ x, y, r: 2, max: 13, c: "#ffffff" });
      this.ovFx.push({ k: "lines", age: 0, life: 14, x: ix, y: iy, delay: 0, col: "#ffffff", n: 16 });
    }
    if (t >= 4) {
      this.shake = Math.max(this.shake, 3.2); this.chroma = Math.max(this.chroma, 8); this.kbv += x < p.x + p.w / 2 ? 1.2 : -1.2;
      const cp = CRIT_PAL[t >= 5 ? 5 : 4];
      this.ovFx.push({ k: "vignette", age: 0, life: 22, delay: 0, col: cp.vig });
      this.ovFx.push({ k: "text", age: 0, life: t >= 5 ? 40 : 32, delay: 0, text: TITLES[t >= 5 ? 5 : 4], fx: t >= 5 ? [1, 2] : [1, 1], y: Math.max(12, iy - 42), pal: cp });
    }
    if (t >= 5) {
      this.stop = Math.max(this.stop, 6);
      if (this.intense) this.ovFx.push({ k: "strobe", age: 0, life: 2, x: ix, y: iy, reach: 55, n: 4 });
      this.rings.push({ x, y, r: 2, max: 16, c: BLOOD });
    }
  }

  /** Transe : l'arène pulse, le boss brûle d'une aura rouge. Un raté la fait retomber. */
  enterTrance() {
    if (this.trance) return;
    this.trance = { t0: this.t, n: 0 };
    this.shakeEl?.classList.add("trance");
  }
  exitTrance() {
    if (!this.trance) return;
    this.trance = null;
    this.shakeEl?.classList.remove("trance");
  }
  drawTrance(b) {
    const t = this.t - this.trance.t0, cx = STAGE_W / 2, cy = FLOOR - 16, A = AURAS[this.aura];
    if (A && A !== AURAS.rage) { A.back?.call(this, b, t); return; }
    for (let i = 0; i < 6; i++) {
      const r = (t * 0.7 + i * 12) % 72, a = Math.round((1 - r / 72) * 0.5 * 4) / 4;
      if (a <= 0) continue;
      b.globalAlpha = a; b.fillStyle = i % 2 ? "#5d275d" : "#b13e53";
      const R = Math.round(r);
      b.fillRect(cx - R, cy - R, R * 2, 1); b.fillRect(cx - R, cy + R, R * 2, 1); b.fillRect(cx - R, cy - R, 1, R * 2); b.fillRect(cx + R, cy - R, 1, R * 2);
    }
    b.globalAlpha = 0.25; b.fillStyle = BLOOD;
    for (let i = 0; i < 8; i++) { const a = t * 0.03 + (i * Math.PI) / 4; pline(b, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, 1); }
    b.globalAlpha = 1;
  }

  chargeFx() {
    const p = this.pos, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    this.front.burst(26, () => {
      const a = rnd(0, Math.PI * 2), r = rnd(26, 40);
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r / 30, vy: -Math.sin(a) * r / 30, life: 30, c: Math.random() < 0.5 ? "#ffffff" : "#ffcd75", blink: true };
    });
  }

  miss(x, y) {
    if (this.dead) return;
    this.fx.burst(4, () => ({ x: x + rnd(-1, 1), y: y + rnd(-1, 1), vx: rnd(-0.5, 0.5), vy: rnd(-0.6, -0.1), drag: 0.9, life: 22, c: "#94b0c2", fade: true, size: 2, grow: 0.05 }));
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
    this.ovFx.push({ k: "flash", age: 0, life: 14, delay: 0, col: "#38b764", a: 0.35 });
    play("heal");
  }

  /** Refus de la cigarette tendue : elle apparaît, tremble, se casse en deux et le tabac vole. */
  refused(dmg) {
    if (this.dead) return;
    const p = this.pos, o = this.ovPos();
    const cx = o.ox + p.x + p.w / 2, cy = Math.max(26, o.oy + p.y - 4);
    this.ovFx.push({ k: "snap", age: 0, life: 14, x: cx, y: cy });
    this.ovFx.push({ k: "text", age: 0, life: 56, delay: 9, text: "refusé!", fx: [1, 2], y: Math.max(8, cy - 34), cyan: true });
    this.refuseAt = { dmg, t: 9 };
    play("refuse");
  }
  /** Coup du mode Frénésie : léger, la note monte avec le combo. */
  frenzyHit(dmg, { fast = false, x, y, label } = {}) {
    this.combo++; this.comboPop = 6;
    this.hit(dmg, { x, y, label: label ?? (fast ? `-${dmg}!` : `-${dmg}`), sfx: "weakhit", sfxArg: this.combo });
    if (fast) { this.front.burst(6, () => { const a = rnd(0, Math.PI * 2), v = rnd(1, 2.4); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.85, life: 12, c: "#ffcd75" }; }); }
  }
  breakCombo() { this.combo = 0; this.comboBreak = 12; }
  /** Résultat d'une note de la jauge : parfait, bon, raté, cigarette prise ou refusée. */
  judged(kind) { this.judgeFx = { kind, age: 0 }; }
  forgiven(left, text) { this.judgeFx = { kind: "refused", age: 0 }; this.float(text || (left ? `${left} joker` : "dernier joker"), STAGE_W / 2, GAUGE_Y - 8, { color: "#73eff7", sc: 1 }); }

  /** K.O. : éclair noir, gel, puis le boss éclate au ralenti en pixels qui rebondissent. */
  ko(style) {
    if (this.dead) return Promise.resolve();
    this.dead = true; this.weak = null;
    this.hp = 0; this.hurtT = 999; this.flash = 16; this.shake = 3; this.koT = 0; this.chroma = 30;
    const p = this.pos, o = this.ovPos(), ix = o.ox + p.x + p.w / 2, iy = o.oy + p.y + p.h / 2;
    const st = style ?? pickFrom(this.koPool, "cut"), K = KO[st];
    this.koPal = K?.pal || DARK;
    if (st === "manga") { this.stop = 46; this.ovFx.push({ k: "manga", age: 0, life: 52, x: ix, y: iy }); play("ko_manga"); }
    else if (K?.stop) {
      // K.O. du pack d'effets : l'effet dessine lui-même le boss, la scène le cache et ne le fait pas exploser
      this.stop = K.stop; this.koHide = true; this.koFinish = () => {}; this.flash = 0; this.chroma = 0;
      this.ovFx.push({ k: `k_${st}`, age: 0, life: K.life, x: ix, y: iy, ...this[`mk_k_${st}`]?.(ix, iy) });
      play(`ko_${st}`);
    } else { this.stop = 42; this.ovFx.push({ k: "cut", age: 0, life: 47, x: ix, y: iy }); play("ko_cut"); }
    return new Promise((res) => { this.koDone = res; });
  }
  explode() {
    const sp = this.sprite(), p = this.pos, cx = p.x + sp.w / 2, cy = p.y + sp.h / 2;
    for (const px of sp.pixels) {
      const dx = px.x + p.x - cx, dy = px.y + p.y - cy;
      this.fx.add({ x: p.x + px.x, y: p.y + px.y, vx: dx * 0.09 + rnd(-0.6, 0.6), vy: dy * 0.06 - rnd(1.4, 3.8), g: 0.13, life: rnd(90, 150) | 0, c: px.c, floor: FLOOR - rnd(0, 2), bounce: 0.38, blink: true });
    }
    this.front.burst(40, () => { const a = rnd(0, Math.PI * 2), v = rnd(1.5, 4.5); return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.88, life: rnd(14, 28) | 0, c: Math.random() < 0.5 ? BLOOD : SPARK, size: 2 }; });
    this.rings.push({ x: cx, y: cy, r: 3, max: 40, c: "#ffffff" });
    const o = this.ovPos(), ix = o.ox + cx, iy = o.oy + cy;
    for (let i = 0; i < 3; i++) this.ovFx.push({ k: "ring", age: 0, life: 50, delay: i * 6, x: ix, y: iy });
    this.ovFx.push({ k: "flash", age: 0, life: 26, delay: 0, col: "#ffffff" });
    this.ovFx.push({ k: "lines", age: 0, life: 40, x: ix, y: iy, delay: 0, col: "#ffffff" });
    this.ovFx.push({ k: "vignette", age: 0, life: 90, delay: 0 });
    this.shake = 8; this.slow = 70;
  }

  float(text, x, y, { color = "#fff", sc = 1, alt = null, out, cycle } = {}) {
    this.floats.push({ text: String(text), x, y, vy: -1.3, age: 0, life: 50, color, sc, alt, out, cycle });
  }
  setHp(hp) { this.hp = hp; if (this.ghost < hp) this.ghost = hp; }

  // ---------- boucle ----------
  frame(now) {
    this.acc += Math.min(50, now - this.last); this.last = now;
    while (this.acc >= STEP) { this.update(); this.acc -= STEP; }
    this.draw();
  }

  update() {
    this.updateOverlay();
    if (this.refuseAt && --this.refuseAt.t <= 0) { const d = this.refuseAt.dmg; this.refuseAt = null; this.hit(d, { kind: "refuse", label: `-${d}` }); }
    if (this.comboPop > 0) this.comboPop--;
    if (this.pending && --this.pending.t <= 0) { const { dmg, opts } = this.pending; this.pending = null; this.hit(dmg, opts); }
    if (this.stop > 0) { this.stop--; if (this.stop === 0 && this.koT === 0) { this.koT = 1; (this.koFinish || this.explode).call(this); } return; }
    if (this.slow > 0) { this.slow--; if (this.slow % 3) { this.tickFloats(); return; } }
    this.t++;
    if (this.koT > 0) {
      this.koT++;
      if (this.koT === 20) { this.ovFx.push({ k: "text", age: 0, life: 120, delay: 0, text: "k.o.", fx: [3, 4], y: Math.max(12, this.ovPos().y - 14), red: true, pal: this.koPal }); this.shake = 5; play("slam"); }
      if (this.koT === 110) this.koDone?.();
    }
    if (--this.nextBlink <= 0) { this.blinkT = 7; this.nextBlink = rnd(90, 220) | 0; }
    if (this.blinkT > 0) this.blinkT--;
    if (this.hurtT > 0 && this.hurtT < 900) this.hurtT--;
    if (this.talkT > 0) this.talkT--;
    if (this.flash > 0) this.flash--;
    if (this.healGlow > 0) this.healGlow--;
    if (this.judgeFx) this.judgeFx.age++;
    if (this.comboBreak > 0) this.comboBreak--;
    if (this.chroma > 0) this.chroma--;
    this.shake = this.shake > 0.3 ? this.shake * 0.87 : 0;
    this.kbv += -this.kb * 0.22; this.kbv *= 0.72; this.kb += this.kbv;
    this.sqv += -this.sq * 0.3; this.sqv *= 0.68; this.sq += this.sqv;
    if (this.ghostDelay > 0) this.ghostDelay--;
    else if (this.ghost > this.hp) this.ghost = Math.max(this.hp, this.ghost - Math.max(0.4, (this.ghost - this.hp) * 0.07));
    if (this.weak && performance.now() - this.weak.born > this.weak.ms) { this.weak = null; this.onWeakExpire?.(); }
    if (!this.dead && this.art.steam && this.t % 7 === 0) {
      const p = this.pos, st = this.art.steam, angry = this.hp / this.maxHp < 0.45;
      this.fx.add({ x: p.x + st.x + rnd(-3, 3), y: p.y + st.y, vy: rnd(-0.32, -0.18), life: rnd(50, 80) | 0, c: angry ? st.angry : st.c, fade: true, fadeIn: true, alpha: 0.75, wob: 0.12, size: 1, grow: 0.025 });
    }
    if (this.trance && !this.dead) AURAS[this.aura]?.tick?.call(this, this.t - this.trance.t0);
    this.fx.update(); this.front.update();
    for (const st of this.stamps) st.age++;
    this.stamps = this.stamps.filter((st) => st.age < st.life);
    for (const r of this.rings) r.r += 1.6;
    this.rings = this.rings.filter((r) => r.r < r.max);
    this.tickFloats();
  }
  tickFloats() {
    for (const f of this.floats) { f.age++; f.y += f.vy; f.vy *= 0.88; }
    this.floats = this.floats.filter((f) => f.age < f.life);
  }

  updateOverlay() {
    for (const e of this.ovFx) {
      if (e.delay > 0) { e.delay--; continue; }
      e.age++;
      if (e.k === "strobe" && e.age % 2 === 1) e.b = bolts(e.x, e.y, e.n, e.reach);
      if (e.k === "snap" && e.age === 8) this.snapBurst(e);
      if (e.k === "fracture" && e.age === 30) for (const sh of e.net.shards) { const dx = sh.cx - e.x, dy = sh.cy - e.y, n = Math.hypot(dx, dy) || 1, v = rnd(1.5, 4); Object.assign(sh, { vx: (dx / n) * v, vy: (dy / n) * v - rnd(0, 1.5), va: rnd(-0.15, 0.15), ang: 0, ox: 0, oy: 0 }); }
      this[`up_${e.k}`]?.(e);
      if (e.k === "fracture" && e.age > 30) for (const sh of e.net.shards) { sh.ox += sh.vx; sh.oy += sh.vy; sh.vy += 0.28; sh.ang += sh.va; }
    }
    // images d'impact sur la vraie page : inversion, noir et blanc contrasté
    let filt = "";
    if (this.intense && this.fxRoot) for (const e of this.ovFx) {
      if (e.delay > 0) continue;
      if (e.k === "fracture") { if (e.age < 4) filt = "brightness(1.8) saturate(.3) hue-rotate(170deg)"; else if (e.age >= 30 && e.age < 34) filt = "brightness(2) contrast(1.4)"; else if (e.age < 30) filt = "saturate(.5) hue-rotate(170deg) brightness(.9)"; }
      const f = this[`flt_${e.k}`]?.(e);
      if (f) filt = f;
      if (e.k === "nova") filt = e.age < 3 ? "brightness(2.2)" : e.age < 30 ? "sepia(1) saturate(2.6) brightness(.85) contrast(1.3)" : filt;
    }
    if (this.fxRoot && filt !== this._filt) { this.fxRoot.style.filter = filt; this._filt = filt; }
    this.ovParts.update();
    this.tickHalves();
    this.ovFx = this.ovFx.filter((e) => e.age < e.life);
  }

  // ---------- rendu ----------
  draw() {
    const b = this.b;
    b.clearRect(0, 0, STAGE_W, STAGE_H);
    const sx = this.shake ? Math.round(rnd(-1, 1) * this.shake) : 0, sy = this.shake ? Math.round(rnd(-1, 1) * this.shake) : 0;
    if (this.shakeEl) this.shakeEl.style.transform = this.shake > 1 ? `translate(${sx * 2}px, ${sy * 2}px)` : "";
    b.save();
    b.translate(sx, sy);
    const p = this.pos;
    if (this.koT <= 0 && !this.koHide) {
      const bob = (this.t >> 4) % 2;
      const sw = Math.round(p.w * (0.8 - bob * 0.04 - this.sq * 0.3));
      b.fillStyle = "rgba(0,0,0,.28)";
      b.fillRect(Math.round(STAGE_W / 2 - sw / 2), p.y + p.h - 2, sw, 2);
      b.fillRect(Math.round(STAGE_W / 2 - sw / 2) + 3, p.y + p.h, sw - 6, 1);
    }
    if (this.trance) this.drawTrance(b);
    this.fx.draw(b);
    if (this.koT <= 0 && !this.koHide) this.drawBoss(b, p);
    if (this.trance && this.koT <= 0) AURAS[this.aura]?.front?.call(this, b, this.t - this.trance.t0);
    this.drawWeak(b);
    for (const r of this.rings) this.ring(b, r);
    for (const st of this.stamps) HIT_SKINS[st.k]?.stamp?.(b, st);
    this.front.draw(b);
    for (const f of this.floats) this.drawFloat(b, f);
    b.restore();
    this.drawHp(b);
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.drawImage(this.buf, 0, 0, this.cv.width, this.cv.height);
    this.drawOverlay();
  }

  drawBoss(b, p) {
    const sp = this.sprite();
    const bob = this.dead ? 0 : [0, 0, -1, -1][(this.t >> 4) % 4];
    const sy = 1 - this.sq, sxs = 1 + this.sq * 0.7;
    const w = Math.round(sp.w * sxs), h = Math.round(sp.h * sy);
    const x = Math.round(p.x + this.kb + (sp.w - w) / 2), y = Math.round(p.y + bob + (sp.h - h));
    if (this.chroma > 0) {
      const d = this.chroma > 10 ? 3 : this.chroma > 4 ? 2 : 1;
      b.globalAlpha = 0.75;
      b.drawImage(sp.red, x - d, y, w, h);
      b.drawImage(sp.cyan, x + d, y, w, h);
      b.globalAlpha = 1;
    }
    if (this.trance) {
      const d = 1 + ((this.t >> 3) % 2), rim = sp.tinted ? sp.tinted(AURAS[this.aura]?.col || BLOOD) : sp.red;
      b.globalAlpha = 0.7;
      for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]]) b.drawImage(rim, x + dx, y + dy, w, h);
      b.globalAlpha = 1;
    }
    b.drawImage(sp.img, x, y, w, h);
    if (this.crown) b.drawImage(this.crown.img, Math.round(x + w / 2 - this.crown.w / 2), y - this.crown.h + 5);
    if ((this.flash > 0 && this.flash % 2 === 1) || (this.dead && this.koT === 0)) b.drawImage(this.dead ? sp.black : sp.white, x, y, w, h);
    if (this.healGlow > 0 && (this.healGlow >> 2) % 2) { b.globalAlpha = 0.5; b.drawImage(sp.white, x, y, w, h); b.globalAlpha = 1; }
  }

  /** Jauge de rythme : rail, centre « || », fenêtres, deux cercles (ou deux cigarettes) qui convergent. */
  drawGauge(b) {
    const y = GAUGE_Y, L = 5, R = STAGE_W - 6, C = STAGE_W / 2, g = this.gauge, jf = this.judgeFx;
    b.fillStyle = OUTLINE; b.fillRect(L - 2, y - 2, R - L + 5, 5);
    b.fillStyle = this.comboBreak > 0 && (this.comboBreak >> 1) % 2 ? "#5d275d" : "#262b44"; b.fillRect(L - 1, y - 1, R - L + 3, 3);
    if (g) {
      const half = Math.round((g.good / g.dur) * (C - L)), hp = Math.max(1, Math.round((g.perfect / g.dur) * (C - L)));
      b.fillStyle = g.kind === "cig" ? "#3d1726" : "#3a4466"; b.fillRect(C - half, y - 1, half * 2 + 1, 3);
      if (g.kind !== "cig") { b.fillStyle = "#8a6a2a"; b.fillRect(C - hp, y - 1, hp * 2 + 1, 3); }
    }
    // centre ||
    const flash = jf && jf.age < 10;
    const cc = flash ? JCOL[jf.kind] : g && g.kind === "cig" ? "#e43b44" : "#f4f4f4";
    b.fillStyle = OUTLINE; b.fillRect(C - 3, y - 6, 7, 13);
    b.fillStyle = cc; b.fillRect(C - 2, y - 5, 1, 11); b.fillRect(C + 2, y - 5, 1, 11);
    if (g) {
      const k = (performance.now() - g.t0) / g.dur, near = Math.abs(performance.now() - g.t0 - g.dur) <= g.perfect;
      const off = Math.round((C - L) * Math.min(k, 1.15));
      for (const [x, dir] of [[L + off, 1], [R - off, -1]]) {
        if (g.kind === "cig") {
          // une cigarette qui glisse, braise devant
          b.fillStyle = OUTLINE; b.fillRect(x - 4 * dir - (dir < 0 ? 0 : 0) - 1, y - 2, 10, 4);
          for (let i = 0; i < 7; i++) { const px = x - i * dir; b.fillStyle = i === 0 ? ((this.t >> 2) % 2 ? "#ffcd75" : "#ef7d57") : i < 5 ? "#f4f4f4" : "#ef7d57"; b.fillRect(px, y - 1, 1, 2); }
        } else {
          b.fillStyle = OUTLINE; b.fillRect(x - 3, y - 2, 7, 5); b.fillRect(x - 2, y - 3, 5, 7);
          b.fillStyle = near ? "#ffcd75" : "#ffffff"; b.fillRect(x - 2, y - 1, 5, 3); b.fillRect(x - 1, y - 2, 3, 5);
        }
      }
    }
    if (jf && jf.age < 16) {
      const r = 3 + jf.age * 1.2, n = 16;
      b.fillStyle = JCOL[jf.kind];
      b.globalAlpha = jf.age < 8 ? 1 : 0.5;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; b.fillRect(Math.round(C + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), 1, 1); }
      b.globalAlpha = 1;
      if (jf.kind === "miss" || jf.kind === "took") { b.fillStyle = "#e43b44"; for (let i = -2; i <= 2; i++) { b.fillRect(C + i, y - 9 + i, 1, 1); b.fillRect(C + i, y - 9 - i, 1, 1); } }
    }
  }

  drawWeak(b) {
    const w = this.weak;
    if (!w) return;
    const age = performance.now() - w.born;
    const k = Math.max(0, 1 - age / w.fastMs);
    const gap = Math.round(2 + k * 5), x = Math.round(w.x), y = Math.round(w.y);
    const col = age < w.fastMs ? ((age / 90) | 0) % 2 ? "#ffcd75" : "#ffffff" : "#e43b44";
    b.fillStyle = OUTLINE; b.fillRect(x - 2, y - 2, 5, 5);
    b.fillStyle = col; b.fillRect(x - 1, y - 1, 3, 3);
    b.fillStyle = "#e43b44"; b.fillRect(x, y, 1, 1);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + dx * gap, cy = y + dy * gap;
      b.fillStyle = OUTLINE; b.fillRect(cx - 1, cy - 1, 3, 3);
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
    const color = f.cycle ? f.cycle[(f.age >> 1) % f.cycle.length] : f.alt && (f.age >> 2) % 2 ? f.alt : f.color;
    drawText(b, f.text, f.x, f.y - (sc * 5) / 2, f.out ? { color, sc, outline: f.out } : { color, sc });
  }

  drawHp(b) {
    const x = 4, y = 2, w = STAGE_W - 8, h = 7;
    if (this.training) {
      drawText(b, `score ${this.score}`, STAGE_W / 2, y + 1, { color: "#ffcd75", sc: 1 });
      this.drawFrenzyHud(b, x, y, w, h);
      return;
    }
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
    this.drawFrenzyHud(b, x, y, w, h);
  }
  drawFrenzyHud(b, x, y, w, h) {
    if (this.frenzy) {
      const k = Math.max(0, 1 - ((this.frozenAt || performance.now()) - this.frenzy.start) / this.frenzy.dur); // figé en pause
      b.fillStyle = OUTLINE; b.fillRect(x - 1, y + h + 1, w + 2, 4);
      b.fillStyle = k < 0.25 && (this.t >> 2) % 2 ? "#ffffff" : "#ffcd75"; b.fillRect(x, y + h + 2, Math.round(w * k), 2);
    }
    if (this.combo >= 2 && !this.counter) drawText(b, `x${this.combo}`, STAGE_W - 4, y + h + 3, { color: this.trance ? "#ff6b70" : this.combo >= 10 ? "#ffcd75" : "#c2c3c7", sc: 1, align: "right" });
  }

  // ---------- calque plein écran ----------
  drawOverlay() {
    const live = this.ovFx.filter((e) => !(e.delay > 0));
    if (!live.length && !this.ovParts.list.length && !this.halves && !this.hudOn()) { if (this.ov.style.display !== "none") this.ov.style.display = "none"; return; }
    this.ov.style.display = "block";
    const o = this.ob, W = this.OW, H = this.OH;
    o.clearRect(0, 0, W, H);
    const order = ["spot", "letterbox", "focus", "ring", "lines", "vignette", "flash", "strobe", "fracture", "nova", "cut", "manga", "snap", "text"];
    live.sort((a, c) => order.indexOf(a.k) - order.indexOf(c.k));
    const top = live.filter((e) => e.k === "text"), rest = live.filter((e) => e.k !== "text");
    for (const e of rest) this[`ov_${e.k}`](o, e, W, H);
    this.ovParts.draw(o);
    for (const h of this.halves || []) drawStick(o, linePts(h.x, h.y, h.a, h.spec.length), h.spec);
    const c = this.ov.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this.ov.width, this.ov.height);
    c.drawImage(this.ovBuf, 0, 0, this.ov.width, this.ov.height);
    this.drawCounter(c);
    for (const e of top) this.title(c, e);
  }

  /**
   * Titre d'un gros coup ou du K.O. : police nette (Chakra Petch) dessinée en pleine résolution par-dessus les pixels,
   * en biais sur une bande fine aux couleurs de l'effet. Taille selon e.fx : petit (critiques), moyen (ultimes), grand (K.O.).
   */
  title(c, e) {
    const a = e.age, S = this.ov.width / this.OW, dpr = this.ov.width / (parseFloat(this.ov.style.width) || this.ov.width);
    const Wd = this.ov.width, P = e.pal || (e.cyan ? { band: "#000", acc: AIR, fg: PAPER } : DARK), fg = P.fg || PAPER, acc = P.acc;
    const text = e.text.toUpperCase();
    let fs = (e.fx[0] >= 3 ? 58 : e.fx[0] >= 2 ? 34 : 24) * dpr;
    const font = () => { c.font = `700 ${fs}px "Chakra Petch", "IBM Plex Sans", system-ui, sans-serif`; };
    font();
    while (c.measureText(text).width > Wd * 0.84 && fs > 12 * dpr) { fs -= 2 * dpr; font(); }
    const tw = c.measureText(text).width, bh = fs * 1.35, cy = (e.y + 3.5 * e.fx[1]) * S;
    const fade = a > e.life - 10 ? Math.max(0, (e.life - a) / 10) : 1, slide = Math.min(1, a / 4), slam = a < 5 ? 1 + (5 - a) * 0.11 : 1;
    const jx = a < 10 ? rnd(-1.5, 1.5) * dpr : 0;
    c.save();
    c.globalAlpha = fade;
    // bande en biais, juste assez large pour le titre
    const bw = (tw + fs * 2.2) * slide;
    c.translate(Wd / 2, cy); c.transform(1, 0, -0.22, 1, 0, 0);
    c.globalAlpha = fade * 0.9; c.fillStyle = P.band || "#000"; c.fillRect(-bw / 2, -bh / 2, bw, bh);
    c.globalAlpha = fade; c.fillStyle = acc;
    c.fillRect(-bw / 2, -bh / 2 - 3 * dpr, bw, 2 * dpr); c.fillRect(-bw / 2 + fs * 0.6, bh / 2 + dpr, bw, 2 * dpr);
    c.fillRect(-bw / 2 - 6 * dpr, -bh / 2, 3 * dpr, bh);
    // titre : ombre décalée de la couleur d'accent, contour, remplissage qui clignote au début
    c.translate(jx, fs * 0.04); c.scale(slam, slam); c.transform(1, 0, 0.1, 1, 0, 0);
    c.textAlign = "center"; c.textBaseline = "middle";
    try { c.letterSpacing = `${Math.round(fs * 0.04)}px`; } catch { /* navigateur sans letterSpacing */ }
    c.fillStyle = acc; c.fillText(text, 3 * dpr, 3 * dpr);
    if (P.out !== null) { c.lineJoin = "round"; c.lineWidth = Math.max(3, fs * 0.14); c.strokeStyle = P.out || INK; c.strokeText(text, 0, 0); }
    c.fillStyle = e.red ? ((a >> 2) % 2 ? fg : acc) : a < 14 && (a >> 1) % 2 ? acc : fg;
    c.fillText(text, 0, 0);
    c.restore();
  }

  /** Images d'impact : le monde s'inverse, éclairs noirs cerclés de rouge, boss en silhouette. */
  ov_strobe(o, e, W, H) {
    const light = [1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0][e.age % 16];
    o.fillStyle = light ? PAPER : INK; o.fillRect(0, 0, W, H);
    // lignes de vitesse
    o.fillStyle = light ? "#c9c2cf" : "#3a0010";
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + (e.age % 2) * 0.05, r0 = 14 + (i % 3) * 5;
      pline(o, e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0, e.x + Math.cos(a) * 400, e.y + Math.sin(a) * 400, 1);
    }
    for (const bl of e.b || []) {
      o.fillStyle = BLOOD;
      for (let i = 1; i < bl.pts.length; i++) pline(o, bl.pts[i - 1][0], bl.pts[i - 1][1], bl.pts[i][0], bl.pts[i][1], bl.thin ? 2 : 3);
      o.fillStyle = INK;
      for (let i = 1; i < bl.pts.length; i++) pline(o, bl.pts[i - 1][0], bl.pts[i - 1][1], bl.pts[i][0], bl.pts[i][1], 1);
    }
    if (this.koT <= 0) {
      const sp = this.sprite(), q = this.ovPos();
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) o.drawImage(sp.red, q.x + dx, q.y + dy);
      o.drawImage(sp.black, q.x, q.y);
    }
    // cœur de l'impact
    o.fillStyle = light ? INK : PAPER;
    o.fillRect(Math.round(e.x) - 2, Math.round(e.y) - 2, 5, 5);
    o.fillStyle = BLOOD; o.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 3, 3);
  }

  ov_lines(o, e, W, H) {
    const k = 1 - e.age / e.life;
    o.globalAlpha = Math.round(k * 4) / 4 * (e.few ? 0.6 : 0.8);
    o.fillStyle = e.col;
    const n = e.n ?? (e.few ? 10 : 30);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), r0 = e.few ? rnd(10, 16) : rnd(20, 40) + e.age * 2;
      const len = e.few ? rnd(6, 14) : rnd(30, 120);
      pline(o, e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0, e.x + Math.cos(a) * (r0 + len), e.y + Math.sin(a) * (r0 + len), 1);
    }
    o.globalAlpha = 1;
  }

  ov_vignette(o, e, W, H) {
    const k = 1 - e.age / e.life;
    [0.55, 0.35, 0.2, 0.1].forEach((a, i) => {
      o.globalAlpha = Math.round(a * k * 8) / 8;
      o.fillStyle = e.col || BLOOD;
      const d = i * 3;
      o.fillRect(d, d, W - 2 * d, 3); o.fillRect(d, H - d - 3, W - 2 * d, 3);
      o.fillRect(d, d, 3, H - 2 * d); o.fillRect(W - d - 3, d, 3, H - 2 * d);
    });
    o.globalAlpha = 1;
  }

  ov_flash(o, e, W, H) {
    const k = 1 - e.age / e.life;
    o.globalAlpha = Math.round(k * (e.a ?? 0.9) * 6) / 6;
    o.fillStyle = e.col; o.fillRect(0, 0, W, H);
    o.globalAlpha = 1;
  }

  ov_ring(o, e, W, H) {
    const r = e.age * 5, k = 1 - e.age / e.life;
    const n = Math.max(16, Math.round(r * 3));
    o.globalAlpha = k > 0.5 ? 1 : 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
      o.fillStyle = e.col2 || PAPER; o.fillRect(Math.round(x), Math.round(y), 2, 2);
      o.fillStyle = e.col || BLOOD; o.fillRect(Math.round(e.x + Math.cos(a) * (r - 2)), Math.round(e.y + Math.sin(a) * (r - 2)), 1, 1);
    }
    o.globalAlpha = 1;
  }

  ov_letterbox(o, e, W, H) {
    const inn = Math.min(1, e.age / 8), out = Math.min(1, (e.life - e.age) / 10);
    const h = Math.round(H * 0.13 * Math.min(inn, out));
    if (h <= 0) return;
    o.fillStyle = "#000"; o.fillRect(0, 0, W, h); o.fillRect(0, H - h, W, h);
    o.fillStyle = BLOOD; o.fillRect(0, h, W, 1); o.fillRect(0, H - h - 1, W, 1);
  }

  ov_spot(o, e, W, H) {
    const q = this.ovPos(), sp = this.sprite(), cx = q.x + sp.w / 2, cy = q.y + sp.h / 2;
    const k = Math.min(1, e.age / 6) * Math.min(1, (e.life - e.age) / 4);
    o.globalAlpha = Math.round(0.7 * k * 6) / 6;
    o.fillStyle = "#000";
    const R = 30 - e.age * 0.3;
    for (let y = 0; y < H; y++) {
      const dy = y - cy;
      if (Math.abs(dy) >= R) { o.fillRect(0, y, W, 1); continue; }
      const dx = Math.sqrt(R * R - dy * dy);
      o.fillRect(0, y, Math.max(0, Math.round(cx - dx)), 1);
      o.fillRect(Math.round(cx + dx), y, W, 1);
    }
    o.globalAlpha = 1;
  }

  /** Charge de l'ultime : lignes qui convergent vers le boss. */
  ov_focus(o, e, W, H) {
    const q = this.ovPos(), sp = this.sprite(), cx = q.x + sp.w / 2, cy = q.y + sp.h / 2;
    const k = e.age / e.life;
    o.fillStyle = (e.age >> 1) % 2 ? "#ffffff" : "#ffcd75";
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + i * 0.37;
      const r1 = 140 - k * 100 + (i % 4) * 8, r0 = r1 - rnd(10, 30);
      pline(o, cx + Math.cos(a) * Math.max(18, r0), cy + Math.sin(a) * Math.max(18, r0), cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 1);
    }
    if (e.age > e.life - 6) drawText(o, "!", cx, q.y - 12, { color: BLOOD, sc: 3 });
  }

  // ---------- ultime : FRACTURE (l'écran se fissure puis vole en éclats) ----------
  crackNet(x, y) {
    const n = 13, rings = [12, 30, 56, 92], far = 420, rad = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.18, 0.18), pts = [[x, y, 0]];
      let d = 0;
      while (d < far) { d += rnd(5, 9); const j = rnd(-2.5, 2.5); pts.push([x + Math.cos(a) * d - Math.sin(a) * j, y + Math.sin(a) * d + Math.cos(a) * j, d]); }
      rad.push(pts);
    }
    const at = (r, dist) => r.find((p) => p[2] >= dist) || r[r.length - 1];
    const ringSegs = rings.map((R) => rad.map((r, i) => [at(r, R * rnd(0.85, 1.15)), at(rad[(i + 1) % n], R * rnd(0.85, 1.15))]));
    const bounds = [0, ...rings, far], shards = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < bounds.length - 1; k++) {
      const r1 = rad[i], r2 = rad[(i + 1) % n];
      const poly = [at(r1, bounds[k]), at(r1, bounds[k + 1]), at(r2, bounds[k + 1]), at(r2, bounds[k])].map((p) => [p[0], p[1]]);
      shards.push({ poly, cx: poly.reduce((s, p) => s + p[0], 0) / 4, cy: poly.reduce((s, p) => s + p[1], 0) / 4 });
    }
    return { rad, ringSegs, shards, rings };
  }
  ov_fracture(o, e, W, H) {
    const a = e.age, net = e.net;
    const crackLine = (p, q) => { o.fillStyle = "#16365a"; pline(o, p[0] + 1, p[1] + 1, q[0] + 1, q[1] + 1, 1); o.fillStyle = "#dff6ff"; pline(o, p[0], p[1], q[0], q[1], 1); };
    if (a < 3) { o.fillStyle = a % 2 ? PAPER : "#7fd8f0"; o.fillRect(0, 0, W, H); }
    if (a < 30) {
      const L = Math.min(420, (a - 1) * 16);
      o.globalAlpha = 0.2; o.fillStyle = "#7fd8f0"; o.fillRect(0, 0, W, H); o.globalAlpha = 1;
      for (const r of net.rad) for (let i = 1; i < r.length && r[i][2] <= L; i++) crackLine(r[i - 1], r[i]);
      net.ringSegs.forEach((segs, k) => { if (L >= net.rings[k] * 1.3) for (const [p, q] of segs) crackLine(p, q); });
      o.fillStyle = "#3b5dc9"; o.fillRect(Math.round(e.x) - 2, Math.round(e.y) - 2, 5, 5);
      o.fillStyle = PAPER; o.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 3, 3);
      return;
    }
    const k = a - 30;
    o.globalAlpha = Math.max(0, Math.round((1 - k / 14) * 6) / 6); o.fillStyle = "#dff6ff"; o.fillRect(0, 0, W, H); o.globalAlpha = 1;
    for (const sh of net.shards) {
      const c = Math.cos(sh.ang), s = Math.sin(sh.ang);
      o.beginPath();
      sh.poly.forEach(([px, py], i) => { const dx = px - sh.cx, dy = py - sh.cy, X = sh.cx + sh.ox + dx * c - dy * s, Y = sh.cy + sh.oy + dx * s + dy * c; if (i) o.lineTo(X, Y); else o.moveTo(X, Y); });
      o.closePath();
      o.fillStyle = "rgba(60,140,200,.45)"; o.fill();
      o.strokeStyle = "#dff6ff"; o.lineWidth = 1; o.stroke();
    }
  }

  // ---------- ultime : SUPERNOVA (une lumière avale l'écran, le boss en ombre chinoise) ----------
  ov_nova(o, e, W, H) {
    const a = e.age;
    if (a < 3) { o.fillStyle = a === 1 ? "#ffcd75" : PAPER; o.fillRect(0, 0, W, H); return; }
    if (a < 28) {
      const k = (a - 3) / 25, R = k ** 1.7 * Math.hypot(W, H);
      o.fillStyle = "#fff6c8";
      for (let y = Math.max(0, Math.floor(e.y - R)); y < Math.min(H, e.y + R); y++) { const dx = Math.sqrt(Math.max(0, R * R - (y - e.y) ** 2)); o.fillRect(Math.round(e.x - dx), y, Math.round(dx * 2), 1); }
      const n = Math.max(24, Math.round(R * 4));
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        o.fillStyle = "#ef7d57"; o.fillRect(Math.round(e.x + Math.cos(t) * R), Math.round(e.y + Math.sin(t) * R), 2, 2);
        o.fillStyle = "#ffcd75"; o.fillRect(Math.round(e.x + Math.cos(t) * (R + 2)), Math.round(e.y + Math.sin(t) * (R + 2)), 1, 1);
      }
      o.fillStyle = "#ef7d57";
      for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2 + a * 0.02; pline(o, e.x + Math.cos(t) * 10, e.y + Math.sin(t) * 10, e.x + Math.cos(t) * Math.min(R, 200), e.y + Math.sin(t) * Math.min(R, 200), 1); }
      const sp = this.sprite(), q = this.ovPos();
      o.drawImage(sp.black, q.x, q.y);
      return;
    }
    const k = (a - 28) / (e.life - 28);
    o.globalAlpha = Math.round((1 - k) * 6) / 6; o.fillStyle = "#fff6c8"; o.fillRect(0, 0, W, H); o.globalAlpha = 1;
  }

  // ---------- K.O. : TRANCHE (écran noir, un trait, le boss coupé en deux) ----------
  ov_cut(o, e, W, H) {
    const a = e.age, x = e.x, y = e.y, d = { x: Math.cos(0.65), y: Math.sin(0.65) }, n = { x: -d.y, y: d.x };
    o.globalAlpha = a > e.life - 6 ? (e.life - a) / 6 : 1;
    o.fillStyle = INK; o.fillRect(0, 0, W, H);
    const sp = this.sprite(), q = this.ovPos();
    if (a < 15) o.drawImage(sp.white, q.x, q.y);
    else {
      const gap = Math.min(8, (a - 15) * 0.35);
      for (const side of [-1, 1]) {
        o.save(); o.beginPath();
        const L = 700;
        o.moveTo(x - d.x * L, y - d.y * L); o.lineTo(x + d.x * L, y + d.y * L);
        o.lineTo(x + d.x * L + n.x * side * L, y + d.y * L + n.y * side * L); o.lineTo(x - d.x * L + n.x * side * L, y - d.y * L + n.y * side * L);
        o.closePath(); o.clip();
        o.drawImage(sp.white, Math.round(q.x + n.x * side * gap + d.x * side * gap * 0.7), Math.round(q.y + n.y * side * gap + d.y * side * gap * 0.7));
        o.restore();
      }
      o.fillStyle = BLOOD; pline(o, x - d.x * 26, y - d.y * 26, x + d.x * 26, y + d.y * 26, 1);
      o.fillStyle = "#3a0010";
      for (let i = 0; i < 14; i++) { const off = rnd(-60, 60), len = rnd(20, 80), sx = x + n.x * off + d.x * rnd(-120, 120), sy = y + n.y * off + d.y * rnd(-120, 120); pline(o, sx, sy, sx + d.x * len, sy + d.y * len, 1); }
    }
    if (a >= 12 && a < 24) {
      const k = Math.min(1, (a - 12) / 3), S = { x: x - d.x * 320, y: y - d.y * 320 }, E = { x: S.x + d.x * 640 * k, y: S.y + d.y * 640 * k };
      const w = a < 16 ? 5 : a < 20 ? 3 : 1;
      o.fillStyle = BLOOD; pline(o, S.x, S.y, E.x, E.y, w + 2);
      o.fillStyle = PAPER; pline(o, S.x, S.y, E.x, E.y, w);
    }
    if (a === 15 || a === 16) { o.globalAlpha = 0.7; o.fillStyle = PAPER; o.fillRect(0, 0, W, H); }
    o.globalAlpha = 1;
  }

  // ---------- K.O. : MANGA (trois cases d'impact qui claquent l'une après l'autre) ----------
  ov_manga(o, e, W, H) {
    const a = e.age, sp = this.sprite();
    o.globalAlpha = a > e.life - 7 ? (e.life - a) / 7 : 1;
    o.fillStyle = INK; o.fillRect(0, 0, W, H);
    const out = a > 38 ? a - 38 : 0;
    const panels = [{ y0: 0.07, y1: 0.35, at: 0, dir: -1 }, { y0: 0.37, y1: 0.63, at: 8, dir: 1 }, { y0: 0.65, y1: 0.93, at: 16, dir: -1 }];
    panels.forEach((p, i) => {
      if (a < p.at) return;
      const j = a - p.at < 4 ? Math.round(rnd(-2, 2)) : 0, dx = out * 10 * p.dir + j;
      const y0 = Math.round(H * p.y0), y1 = Math.round(H * p.y1), sk = 6, cx = W / 2 + dx, cy = (y0 + y1) / 2;
      const poly = [[3 + dx, y0 + sk], [W - 3 + dx, y0], [W - 3 + dx, y1 - sk], [3 + dx, y1]];
      o.save(); o.beginPath(); poly.forEach(([px, py], k) => (k ? o.lineTo(px, py) : o.moveTo(px, py))); o.closePath();
      o.fillStyle = a - p.at < 2 ? INK : PAPER; o.fill(); o.clip();
      o.fillStyle = INK;
      for (let k = 0; k < 28; k++) { const t = (k / 28) * Math.PI * 2 + i; pline(o, cx + Math.cos(t) * (i === 1 ? 7 : 22), cy + Math.sin(t) * (i === 1 ? 7 : 22), cx + Math.cos(t) * 90, cy + Math.sin(t) * 90, 1); }
      if (i === 0) {
        const s = Math.max(2, Math.min(Math.floor((W - 10) / 20), Math.floor((y1 - y0) / 15)));
        o.drawImage(sp.img, 7, 10, 20, 14, Math.round(cx - 10 * s), Math.round(cy - 7 * s), 20 * s, 14 * s);
        o.globalAlpha = 0.25; o.fillStyle = BLOOD; o.fillRect(0, y0, W, y1 - y0); o.globalAlpha = 1;
      } else if (i === 1) {
        o.fillStyle = INK;
        o.beginPath();
        for (let k = 0; k < 20; k++) { const t = (k / 20) * Math.PI * 2, r = k % 2 ? 6 : 16 + rnd(0, 6); const X = cx + Math.cos(t) * r * 1.4, Y = cy + Math.sin(t) * r * 0.8; if (k) o.lineTo(X, Y); else o.moveTo(X, Y); }
        o.closePath(); o.fill();
        o.fillStyle = BLOOD; o.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
      } else {
        o.drawImage(sp.black, Math.round(cx - sp.w), Math.round(cy - sp.h), sp.w * 2, sp.h * 2);
        o.fillStyle = BLOOD;
        for (const bl of bolts(cx, cy, 5, 30)) for (let k = 1; k < bl.pts.length; k++) pline(o, bl.pts[k - 1][0], bl.pts[k - 1][1], bl.pts[k][0], bl.pts[k][1], 1);
      }
      // trame de points façon manga
      o.fillStyle = INK; o.globalAlpha = 0.3;
      for (let yy = y0; yy < y1; yy += 3) for (let xx = W * 0.62 + ((yy / 3) % 2) * 1.5; xx < W; xx += 3) o.fillRect(Math.round(xx + dx), yy, 1, 1);
      o.globalAlpha = 1;
      o.restore();
      o.fillStyle = PAPER;
      for (let k = 0; k < 4; k++) { const [x1, y1b] = poly[k], [x2, y2] = poly[(k + 1) % 4]; pline(o, x1, y1b, x2, y2, 1); }
    });
    o.globalAlpha = 1;
  }

  /** La cigarette tendue : elle tremble au-dessus du boss avant de casser. */
  ov_snap(o, e) {
    if (e.age >= 8) {
      if (e.age < 12) {
        o.fillStyle = "#ffffff";
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; pline(o, e.x + Math.cos(a) * 3, e.y + Math.sin(a) * 3, e.x + Math.cos(a) * (7 + e.age), e.y + Math.sin(a) * (7 + e.age), 1); }
      }
      return;
    }
    const j = e.age > 3 ? Math.round(rnd(-1, 1)) : 0;
    const spec = cigSpec({ ember: (e.age >> 1) % 2, paper: 12 });
    drawStick(o, linePts(e.x - 11 + j, e.y + j, 0, spec.length), spec);
  }
  snapBurst(e) {
    const spec = cigSpec({ ember: 1, paper: 12 }), mid = 9;
    this.halves = [
      { x: e.x - 11, y: e.y, a: 0, va: -0.22, vx: -1.5, vy: -2.2, spec: spec.slice(0, mid) },
      { x: e.x - 11 + mid, y: e.y, a: 0, va: 0.3, vx: 1.7, vy: -2.6, spec: spec.slice(mid) },
    ];
    this.halfT = 50;
    this.ovParts.burst(22, (i) => { const a = rnd(0, Math.PI * 2), v = rnd(0.6, 2.4); return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.12, life: rnd(30, 55) | 0, c: i % 5 ? ["#8a5a2b", "#6b3a1f", "#a8743a"][i % 3] : "#ffffff", blink: true }; });
    this.ovParts.burst(8, () => { const a = rnd(0, Math.PI * 2), v = rnd(1.5, 3); return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.85, life: 12, c: AIR, size: 2 }; });
  }
  tickHalves() {
    if (!this.halves) return;
    for (const h of this.halves) { h.x += h.vx; h.y += h.vy; h.vy += 0.16; h.a += h.va; }
    if (--this.halfT <= 0) this.halves = null;
  }

  /** Texte géant qui s'écrase à l'écran sur une bande noire. */
  ov_text(o, e, W, H) {
    const a = e.age, [sx0, sy] = e.fx, k = a < 4 ? 4 - a : 0;
    // le titre ne déborde jamais de l'écran, même pendant l'écrasement
    const fits = (x) => bigWidth(e.text, x) + 7 * (sy + k) * 0.25 <= W - 4;
    let sx = sx0;
    while (sx > 1 && !fits(sx)) sx--;
    const kx = fits(sx + (k >> 1)) ? k >> 1 : 0;
    const th = (sy + k) * 7, y = Math.round(e.y - k * 3);
    const slide = Math.min(1, a / 4), fade = e.life - a < 10;
    if (fade && (a >> 1) % 2) return;
    const bw = Math.round(W * slide), P = e.pal || (e.cyan ? { band: "#000", acc: AIR, fg: PAPER } : DARK);
    const acc = P.acc, fg = P.fg || PAPER;
    o.fillStyle = P.band || "#000"; o.fillRect(0, y - 4, bw, th + 8);
    o.fillStyle = acc; o.fillRect(0, y - 5, bw, 1); o.fillRect(0, y + th + 4, bw, 1);
    const jx = a < 12 ? Math.round(rnd(-1, 1)) : 0, jy = a < 12 ? Math.round(rnd(-1, 1)) : 0;
    const col = e.red ? ((a >> 2) % 2 ? fg : acc) : (a >> 2) % 2 && a < 24 ? acc : fg;
    drawBig(o, e.text, W / 2 + 2 + jx, y + 2 + jy, { color: acc, sx: sx + kx, sy: sy + k, outline: null });
    drawBig(o, e.text, W / 2 + jx, y + jy, { color: col, sx: sx + kx, sy: sy + k, outline: P.out === undefined ? INK : P.out });
  }
}

Object.assign(BossStage.prototype, fxMethods, moreMethods);
