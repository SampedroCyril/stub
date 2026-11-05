/**
 * Deuxième fournée d'effets à débloquer : auras d'Éveil, compteurs de combo, cendriers de victoire.
 * Auras et compteurs se greffent sur BossStage (moreMethods) ; les cendriers sont lus par AshtrayScene (TRAYS).
 */
import { SPARK, rnd } from "./particles.js";
import { AIR, pline, bolts, hash } from "./pix.js";

const FLOOR = 56;

// ======================= AURAS D'ÉVEIL =======================
/**
 * Une aura habille le boss pendant l'Éveil (palier 9).
 * col : contour du boss · back(b, t) derrière lui · front(b, t) devant · tick(t) fait naître des particules.
 */
export const AURAS = {
  rage: { n: "Rage", d: "Le classique : carrés rouges qui pulsent, contour sang.", col: "#ff1f3d" },
  blaze: {
    n: "Brasier", d: "Le boss brûle : une flamme l'entoure et les braises montent.", col: "#ef7d57",
    back(b, t) {
      const p = this.pos;
      [[0, "#b13e53", 0], [1, "#ef7d57", 4], [2, "#ffcd75", 8]].forEach(([inset, c, drop]) => {
        b.fillStyle = c;
        for (let x = p.x - 4 + inset; x < p.x + p.w + 4 - inset; x++) {
          const h = 8 + 5 * Math.sin(t * 0.35 + x * 0.9) + 3 * hash(x * 7 + ((t >> 2) % 9)) - drop;
          const top = Math.round(p.y - h);
          b.fillRect(x, top, 1, p.y + p.h - top - 2);
        }
      });
    },
    tick(t) { if (t % 2 === 0) { const p = this.pos; this.front.add({ x: p.x + rnd(-2, p.w + 2), y: p.y + rnd(0, p.h * 0.6), vx: rnd(-0.2, 0.2), vy: rnd(-1, -0.5), wob: 0.3, life: rnd(20, 36) | 0, c: SPARK, blink: true }); } },
  },
  storm: {
    n: "Orage", d: "Des arcs électriques crépitent tout autour.", col: AIR,
    back(b, t) { if ((t >> 1) % 3 === 0) { const p = this.pos; b.globalAlpha = 0.25; b.fillStyle = AIR; b.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 4); b.globalAlpha = 1; } },
    front(b, t) {
      if (t % 3 === 0 || !this._arcs) {
        const p = this.pos;
        this._arcs = [];
        for (let i = 0; i < 3; i++) {
          const side = Math.random() < 0.5, x = side ? (Math.random() < 0.5 ? p.x - 1 : p.x + p.w) : p.x + rnd(0, p.w), y = side ? p.y + rnd(2, p.h - 4) : p.y - 1;
          this._arcs.push(...bolts(x, y, 1, rnd(7, 13)));
        }
      }
      for (const bl of this._arcs) { b.fillStyle = (t >> 1) % 2 ? "#ffffff" : AIR; for (let i = 1; i < bl.pts.length; i++) pline(b, bl.pts[i - 1][0], bl.pts[i - 1][1], bl.pts[i][0], bl.pts[i][1], 1); }
    },
    tick(t) { if (t % 6 === 0) { const p = this.pos; this.front.burst(2, () => ({ x: p.x + rnd(0, p.w), y: p.y + rnd(0, p.h), vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 0.5), drag: 0.85, life: 10, c: "#ffffff" })); } },
  },
  gold: {
    n: "Aura d'or", d: "Une aura dorée en pointes, et des traits qui filent vers le haut.", col: "#ffcd75",
    back(b, t) {
      const p = this.pos;
      b.globalAlpha = 0.45; b.fillStyle = "#ffcd75";
      for (let x = p.x - 5; x < p.x + p.w + 5; x++) {
        const k = (x - p.x + 5) % 6, h = 6 + (k < 3 ? k * 3 : (6 - k) * 3) + 2 * Math.sin(t * 0.4 + x);
        const top = Math.round(p.y - h);
        b.fillRect(x, top, 1, p.y + p.h - top - 2);
      }
      b.globalAlpha = 1;
      b.fillStyle = "#fff6c8";
      for (let i = 0; i < 7; i++) { const x = p.x - 6 + ((i * 13 + 5) % (p.w + 12)), y = FLOOR - ((t * 2.2 + i * 17) % 60); pline(b, x, y, x, y + 7, 1); }
    },
    tick(t) { if (t % 5 === 0) { const p = this.pos; this.front.add({ x: p.x + rnd(-3, p.w + 3), y: p.y + rnd(0, p.h), vy: -0.8, life: 18, c: "#fff6c8", blink: true }); } },
  },
  phantom: {
    n: "Spectre", d: "Des doubles violets et cyan le suivent en décalé.", col: "#b55dff",
    back(b, t) {
      const sp = this.sprite(), p = this.pos;
      [[-1, "#b55dff", 0], [1, "#5ff3ff", 2], [-1, "#ff5fd2", 4]].forEach(([dir, c, ph], i) => {
        const off = Math.round(dir * (3 + 3 * Math.sin(t * 0.09 + ph))), dy = Math.round(Math.sin(t * 0.12 + i) * 1.5);
        b.globalAlpha = 0.4; b.drawImage(sp.tinted(c), p.x + this.kb + off, p.y + dy);
      });
      b.globalAlpha = 1;
    },
  },
  vortex: {
    n: "Vortex", d: "Un anneau de runes tourne autour de lui.", col: "#38b7a0",
    _ring(b, t, front) {
      const p = this.pos, cx = p.x + p.w / 2, cy = p.y + p.h * 0.62, rx = p.w * 0.75 + 4, ry = 5;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + t * 0.06, s = Math.sin(a);
        if (front !== s > 0) continue;
        b.fillStyle = i % 2 ? "#38b7a0" : "#b55dff";
        const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + s * ry);
        b.fillRect(x, y, 2, 2); if (i % 3 === 0) b.fillRect(x + (i % 2 ? -1 : 2), y - 1, 1, 1);
      }
    },
    back(b, t) { AURAS.vortex._ring.call(this, b, t, false); },
    front(b, t) { AURAS.vortex._ring.call(this, b, t, true); },
    tick(t) { if (t % 4 === 0) { const p = this.pos, a = rnd(0, Math.PI * 2), r = rnd(18, 26), cx = p.x + p.w / 2, cy = p.y + p.h / 2; this.fx.add({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * 0.6 - Math.sin(a) * 0.5, vy: -Math.sin(a) * 0.6 + Math.cos(a) * 0.5, life: 30, c: Math.random() < 0.5 ? "#38b7a0" : "#b55dff" }); } },
  },
  shadow: {
    n: "Ombre", d: "Une fumée noire monte du sol et l'enveloppe.", col: "#5d275d",
    tick(t) {
      const p = this.pos;
      if (t % 2 === 0) this.fx.add({ x: p.x + rnd(-4, p.w + 4), y: FLOOR - 1, vx: rnd(-0.15, 0.15), vy: rnd(-0.7, -0.35), wob: 0.2, life: rnd(40, 70) | 0, c: Math.random() < 0.5 ? "#1a0d24" : "#2e1840", fade: true, size: 3, grow: 0.05, alpha: 0.9 });
      if (t % 9 === 0) this.fx.add({ x: p.x + rnd(0, p.w), y: p.y + rnd(0, p.h * 0.5), vy: -0.3, life: 20, c: "#ff1f3d", blink: true });
    },
  },
};

// ======================= COMPTEURS DE COMBO =======================
export const COUNTERS = {
  classic: { n: "Discret", d: "Le petit compteur pixel, dans le coin." },
  arcade: { n: "Borne d'arcade", d: "Gros chiffres pixel qui rebondissent, façon salle de jeux." },
  neon: { n: "Néon", d: "Un chiffre qui brille, cyan puis rose quand ça monte." },
  manga: { n: "Manga", d: "Énorme, en biais, cerné de noir, avec « HITS ! »." },
  lcd: { n: "LCD", d: "Un écran à sept segments, comme une vieille calculatrice." },
  flames: { n: "En feu", d: "Le chiffre prend feu, et les flammes grandissent avec le combo." },
};
const SEG = ["1111110", "0110000", "1101101", "1111001", "0110011", "1011011", "1011111", "1110000", "1111111", "1111011"];
const tierCol = (n, trance) => (trance ? "#ff1f3d" : n >= 30 ? "#ff6b3d" : n >= 20 ? "#ef7d57" : n >= 10 ? "#ffcd75" : "#ffffff");

// ======================= CENDRIERS =======================
/**
 * Cendriers de la victoire. pal : couleurs du cendrier (a : bord, b : pied, i : intérieur, h : fond).
 * ash : couleurs des cendres au fond · back/front(b, t, s) : décor avant et après la clope (s = scène).
 */
export const TRAYS = {
  classic: { n: "Bleu", d: "Le cendrier de toujours.", pal: { a: { r: ["#1f3b7a", "#3b5dc9", "#73a6f6"], cyl: true }, b: { r: ["#151d3b", "#29366f", "#3b5dc9"] }, i: "#1b2550", h: "#25336a" } },
  glass: {
    n: "Verre", d: "Transparent, avec des reflets qui glissent.", alpha: 0.62,
    count(s) { s.front.burst(14, () => ({ x: 24 + rnd(-16, 16), y: 22 + rnd(-4, 4), vy: rnd(-0.4, -0.1), life: rnd(16, 30) | 0, c: "#ffffff", blink: true })); },
    pal: { a: { r: ["#4f8fa8", "#9fd6e8", "#e8fbff"], cyl: true }, b: { r: ["#2f5f78", "#5f8fa8", "#9fd6e8"] }, i: "#3f7088", h: "#5a8fa6" },
    front(b, t) {
      b.fillStyle = "#ffffff"; const x = 4 + ((t * 0.5) % 60);
      if (x < 44) { b.globalAlpha = 0.85; pline(b, x, 23, x + 4, 19, 1); pline(b, x + 3, 24, x + 6, 21, 1); b.globalAlpha = 1; }
      b.fillRect(9, 20, 4, 1); b.fillRect(36, 28, 3, 1); b.globalAlpha = 0.5; b.fillRect(10, 27, 6, 1); b.globalAlpha = 1;
    },
  },
  obsidian: {
    n: "Obsidienne", d: "Pierre noire, fissures de lave qui respirent.",
    pal: { a: { r: ["#120e18", "#2a2236", "#4a3e58"], cyl: true }, b: { r: ["#0a080e", "#1a1520", "#2a2236"] }, i: "#0e0a14", h: "#1a1422" },
    ash: ["#3a2a2a", "#5a3a2a"],
    count(s) { s.front.burst(18, () => ({ x: 24 + rnd(-14, 14), y: 24 + rnd(-3, 3), vx: rnd(-0.4, 0.4), vy: rnd(-1.4, -0.5), g: 0.03, life: rnd(26, 46) | 0, c: SPARK, blink: true })); },
    front(b, t) {
      const k = 0.5 + 0.5 * Math.sin(t * 0.08);
      b.fillStyle = k > 0.6 ? "#ffcd75" : "#ef7d57";
      for (const [x0, y0, x1, y1] of [[6, 22, 9, 25], [9, 25, 12, 26], [36, 21, 39, 24], [39, 24, 41, 24], [20, 29, 23, 28], [28, 28, 31, 29]]) pline(b, x0, y0, x1, y1, 1);
    },
  },
  trophy: {
    n: "Trophée", d: "En or massif. Des éclats brillent sur le bord.",
    count(s) { s.front.burst(30, (i) => { const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1), v = rnd(0.8, 2); return { x: 24, y: 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.06, drag: 0.97, life: rnd(40, 70) | 0, c: ["#ffcd75", "#fff6c8", "#d8a31a", "#ffffff"][i % 4], blink: true }; }); },
    pal: { a: { r: ["#8a5a10", "#d8a31a", "#ffe08a"], cyl: true }, b: { r: ["#5a3a08", "#8a5a10", "#d8a31a"] }, i: "#6a4410", h: "#7a5214" },
    front(b, t) {
      for (const [x, y, ph] of [[8, 21, 0], [37, 20, 40], [24, 18, 80]]) {
        const k = (t + ph) % 120; if (k > 14) continue;
        const L = [1, 2, 3, 3, 2, 1][k >> 1] ?? 1;
        b.fillStyle = "#fff6c8"; pline(b, x - L, y, x + L, y, 1); pline(b, x, y - L, x, y + L, 1);
      }
    },
  },
  pot: {
    n: "Pot de fleur", d: "La clope finit en terreau… et une pousse sort de terre.",
    pal: { a: { r: ["#8a3a1f", "#c2602f", "#e8955a"], cyl: true }, b: { r: ["#5a2414", "#8a3a1f", "#c2602f"] }, i: "#3a2418", h: "#4a2e1e" },
    ash: ["#5a3a24", "#3a2418"],
    count(s) { s.front.burst(10, (i) => ({ x: 30 + rnd(-2, 2), y: 18, vx: rnd(-0.8, 0.8), vy: rnd(-0.9, -0.3), g: 0.02, wob: 0.3, life: rnd(40, 60) | 0, c: i % 2 ? "#a7f070" : "#38b764", fade: true })); },
    // la pousse : tige, deux feuilles, puis la fleur, après l'extinction
    front(b, t, s) {
      const g = t - s.T_END - 30; if (g < 0) return;
      const x = s.CONTACT.x + 6, y0 = s.FLOOR - 1, h = Math.min(13, g * 0.2), sway = Math.round(Math.sin(t * 0.05));
      b.fillStyle = "#38b764"; pline(b, x, y0, x + sway, y0 - h, 1); pline(b, x + 1, y0, x + 1 + sway, y0 - h + 2, 1);
      if (h > 5) { b.fillStyle = "#a7f070"; b.fillRect(x - 3, y0 - 5, 3, 2); b.fillRect(x - 4, y0 - 6, 2, 1); b.fillRect(x + 2, y0 - 8, 3, 2); b.fillRect(x + 4, y0 - 9, 2, 1); }
      if (h >= 13) {
        const o = Math.min(3, (g - 65) / 12), fx = x + sway, fy = y0 - 15;
        if (o > 0) { b.fillStyle = "#ff6fb5"; b.fillRect(fx - 1, fy - 1, 3, 3); }
        if (o >= 2) { b.fillStyle = "#ff9ecf"; b.fillRect(fx - 3, fy, 2, 2); b.fillRect(fx + 2, fy, 2, 2); b.fillRect(fx, fy - 3, 2, 2); b.fillRect(fx - 1, fy + 2, 2, 2); }
        if (o >= 3) { b.fillStyle = "#ffcd75"; b.fillRect(fx, fy, 1, 1); }
      }
    },
  },
  neon: {
    n: "Néon", d: "Juste un contour qui pulse, rose et cyan.", alpha: 0,
    count(s) { s.front.burst(24, (i) => { const a = (i / 24) * Math.PI * 2; return { x: 24 + Math.cos(a) * 19, y: 24 + Math.sin(a) * 6, vx: Math.cos(a) * 0.8, vy: Math.sin(a) * 0.5 - 0.3, drag: 0.94, life: 26, c: i % 2 ? "#ff5fd2" : "#5ff3ff" }; }); },
    pal: { a: { r: ["#1a1c2c", "#1a1c2c", "#1a1c2c"] }, b: { r: ["#1a1c2c", "#1a1c2c", "#1a1c2c"] }, i: "#100f1c", h: "#141325" },
    back(b) { b.fillStyle = "#100f1c"; for (let y = -6; y <= 6; y++) { const dx = Math.sqrt(Math.max(0, 1 - (y / 6.4) ** 2)) * 19.6; b.fillRect(Math.round(24 - dx), 24 + y, Math.round(dx * 2), 1); } },
    front(b, t) {
      const on = (t >> 3) % 7 !== 0;
      const ring = (rx, ry, cy, col) => { b.fillStyle = col; const n = 90; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; b.fillRect(Math.round(24 + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1); } };
      ring(19.6, 6.4, 24, on ? "#ff5fd2" : "#7a2a66");
      ring(15.6, 3.7, 23, on ? "#5ff3ff" : "#2a6a77");
    },
  },
};

export const moreMethods = {
  /** Compteur de combo net, dessiné en pleine résolution dans le coin haut droit de la scène. */
  drawCounter(c) {
    const st = this.counter;
    if (!st || st === "classic") return;
    const n = this.combo;
    if (n !== this._cc) { if (n > this._cc) this._pop = 8; else if ((this._cc || 0) >= 2) this._brk = { n: this._cc, age: 0 }; this._cc = n; }
    const brk = this._brk && this._brk.age < 18 ? this._brk : null;
    if (brk) brk.age++;
    if (n < 2 && !brk) return;
    const r = this.cv.getBoundingClientRect(), dpr = this.ov.width / (parseFloat(this.ov.style.width) || this.ov.width);
    const X = (r.right - r.width * 0.03) * dpr, Y = (r.top + r.height * 0.36) * dpr, base = Math.max(24, r.width * 0.15) * dpr;
    const pop = this._pop > 0 ? 1 + this._pop * 0.045 : 1;
    if (this._pop > 0) this._pop--;
    const val = brk ? brk.n : n, col = brk ? "#566c86" : tierCol(n, this.trance), txt = String(val);
    c.save();
    if (brk) { c.globalAlpha = Math.max(0, 1 - brk.age / 18); c.translate(rnd(-3, 3) * dpr, brk.age * 1.5 * dpr); }
    c.translate(X, Y); c.scale(pop, pop);
    c.textAlign = "right"; c.textBaseline = "alphabetic";
    const label = (s, size, color, y, font = "Chakra Petch") => { c.font = `700 ${size}px "${font}", system-ui, sans-serif`; c.fillStyle = color; c.fillText(s, 0, y); };
    if (st === "arcade") {
      c.font = `${base * 0.8}px "Press Start 2P", monospace`;
      c.fillStyle = "#0a0814"; c.fillText(txt, 3 * dpr, 3 * dpr);
      c.fillStyle = col; c.fillText(txt, 0, 0);
      c.font = `${base * 0.28}px "Press Start 2P", monospace`; c.fillStyle = "#94b0c2"; c.fillText("COMBO", 0, -base * 0.95);
    } else if (st === "neon") {
      const nc = n >= 20 || this.trance ? "#ff5fd2" : "#5ff3ff";
      c.shadowColor = brk ? "transparent" : nc; c.shadowBlur = 18 * dpr;
      c.font = `700 ${base * 1.1}px "Chakra Petch", system-ui, sans-serif`;
      c.lineWidth = 2 * dpr; c.strokeStyle = brk ? "#566c86" : nc; c.strokeText(txt, 0, 0);
      c.fillStyle = brk ? "#566c86" : "#ffffff"; c.fillText(txt, 0, 0);
      c.shadowBlur = 8 * dpr; label("HITS", base * 0.3, brk ? "#566c86" : nc, base * 0.4);
    } else if (st === "manga") {
      c.transform(1, 0, -0.25, 1, 0, 0);
      if (!brk) { c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.5 * dpr; for (let i = 0; i < 6; i++) { const y = -base * (0.15 + i * 0.16); c.beginPath(); c.moveTo(-base * (2.4 + (i % 3) * 0.5), y); c.lineTo(-base * (1.2 + txt.length * 0.4), y); c.stroke(); } }
      c.font = `700 ${base * 1.5}px "Chakra Petch", system-ui, sans-serif`;
      c.lineJoin = "round"; c.lineWidth = base * 0.22; c.strokeStyle = "#0a0006"; c.strokeText(txt, 0, 0);
      c.fillStyle = brk ? "#94b0c2" : n >= 10 ? "#ffffff" : "#ffffff"; c.fillText(txt, 0, 0);
      c.font = `700 ${base * 0.34}px "Chakra Petch", system-ui, sans-serif`;
      const w = c.measureText("HITS !").width + base * 0.3;
      c.fillStyle = "#0a0006"; c.fillRect(-w, base * 0.12, w, base * 0.46);
      c.fillStyle = brk ? "#566c86" : "#ff1f3d"; c.fillText("HITS !", -base * 0.15, base * 0.48);
    } else if (st === "lcd") {
      const dw = base * 0.5, dh = base * 0.9, th = Math.max(2, base * 0.11), gap = base * 0.16, W = txt.length * (dw + gap) + gap * 1.5;
      c.fillStyle = "#0b1a0e"; c.strokeStyle = "#2a4a2e"; c.lineWidth = 2 * dpr;
      c.fillRect(-W, -dh - gap, W, dh + gap * 2); c.strokeRect(-W, -dh - gap, W, dh + gap * 2);
      [...txt].forEach((ch, i) => {
        const x0 = -W + gap * 1.2 + i * (dw + gap), y0 = -dh, on = SEG[+ch];
        const segs = [[x0 + th, y0, dw - 2 * th, th], [x0 + dw - th, y0 + th, th, dh / 2 - th * 1.5], [x0 + dw - th, y0 + dh / 2 + th / 2, th, dh / 2 - th * 1.5], [x0 + th, y0 + dh - th, dw - 2 * th, th], [x0, y0 + dh / 2 + th / 2, th, dh / 2 - th * 1.5], [x0, y0 + th, th, dh / 2 - th * 1.5], [x0 + th, y0 + dh / 2 - th / 2, dw - 2 * th, th]];
        segs.forEach((sg, k) => { c.fillStyle = on[k] === "1" ? (brk ? "#3a6a40" : "#7dff8a") : "#16301a"; c.fillRect(...sg); });
      });
      label("COMBO", base * 0.26, brk ? "#3a6a40" : "#7dff8a", -dh - gap * 1.6);
    } else if (st === "flames") {
      const k = Math.min(1, n / 40), t = this.t;
      c.font = `700 ${base * 1.2}px "Chakra Petch", system-ui, sans-serif`;
      const w = c.measureText(txt).width;
      if (!brk) for (let i = 0; i < 5; i++) {
        const fx = -w + (w * (i + 0.5)) / 5, fh = base * (0.35 + 0.9 * k) * (0.7 + 0.3 * Math.sin(t * 0.3 + i * 1.7)), fy = -base * 0.85;
        const g = c.createLinearGradient(0, fy, 0, fy - fh); g.addColorStop(0, "#ef7d57"); g.addColorStop(0.6, "#ffcd75"); g.addColorStop(1, "rgba(255,246,200,0)");
        c.fillStyle = g; c.beginPath(); c.moveTo(fx - base * 0.16, fy); c.quadraticCurveTo(fx - base * 0.18, fy - fh * 0.5, fx + Math.sin(t * 0.2 + i) * base * 0.08, fy - fh); c.quadraticCurveTo(fx + base * 0.18, fy - fh * 0.5, fx + base * 0.16, fy); c.fill();
      }
      const g = c.createLinearGradient(0, -base, 0, 0); g.addColorStop(0, brk ? "#566c86" : "#fff6c8"); g.addColorStop(1, brk ? "#3a4256" : "#ef7d57");
      c.lineJoin = "round"; c.lineWidth = base * 0.14; c.strokeStyle = "#2a0a0a"; c.strokeText(txt, 0, 0);
      c.fillStyle = g; c.fillText(txt, 0, 0);
    }
    c.restore();
  },
  hudOn() { return this.counter && this.counter !== "classic" && (this.combo >= 2 || (this._brk && this._brk.age < 18)); },
};
