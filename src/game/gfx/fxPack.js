/**
 * Effets à débloquer : ultimes (gros paliers), K.O. et signatures de coups.
 * Les méthodes sont greffées sur BossStage (Object.assign du prototype) et dessinent dans le calque plein écran,
 * en gros pixels comme le reste. Pour un effet « u_x » (ultime) ou « k_x » (K.O.) :
 *   mk_<k>(x, y)  prépare l'état de l'effet · up_<k>(e)  le fait vivre (60 images/s)
 *   ov_<k>(o, e, W, H)  le dessine · flt_<k>(e)  filtre CSS posé sur la vraie page (images d'impact).
 */
import { SPARK, rnd } from "./particles.js";
import { INK, BLOOD, PAPER, AIR, pline, bolts, rgb, hash, disc, circle } from "./pix.js";
import { drawText } from "./font.js";

const FLOOR = 56; // sol de la scène (BossStage)
const q4 = (a) => Math.max(0, Math.min(1, Math.round(a * 6) / 6));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k) => 1 - (1 - k) * (1 - k);
const FIRE = ["#b13e53", "#ef7d57", "#ffcd75", "#fff6c8"];

/**
 * Palette des calques communs d'un effet : titre (band, acc, fg, out), vignette, anneaux et lignes de vitesse.
 * Le rouge et noir (DARK) est réservé à l'impact noir et à ce qui s'en réclame.
 */
export const DARK = { band: "#000", acc: BLOOD, fg: PAPER, vig: BLOOD, ring: BLOOD, lines: PAPER };
export const CRIT_PAL = { 4: { band: "#1a1205", acc: "#ffcd75", fg: PAPER, vig: "#ef7d57", ring: "#ffcd75", lines: "#fff6c8" }, 5: { band: "#0d0618", acc: "#b55dff", fg: PAPER, vig: "#5d275d", ring: "#b55dff", lines: PAPER } };

/** Ultimes : nom, ligne de description, D = image où tombent titre et lignes de vitesse, life = durée (images). */
export const ULT = {
  fracture: { n: "Fracture", d: "L'écran se fend comme du verre, puis vole en éclats.", D: 31, life: 75, pal: { band: "#0b1f33", acc: "#7fd8f0", fg: PAPER, vig: "#3b5dc9", ring: "#bfefff", lines: "#dff6ff" } },
  nova: { n: "Supernova", d: "Un soleil avale l'écran, le boss en ombre chinoise.", D: 28, life: 52, pal: { band: "#2a1400", acc: "#ffcd75", fg: "#fff6c8", vig: "#ef7d57", ring: "#ffcd75", lines: "#fff6c8" } },
  thunder: { n: "Foudre", d: "L'orage gronde, puis l'éclair tombe pile sur le boss.", D: 18, life: 66, pal: { band: "#05081a", acc: AIR, fg: PAPER, vig: "#3b5dc9", ring: AIR, lines: "#cfe9ff" } },
  void: { n: "Trou noir", d: "Tout est aspiré dans un point… qui explose.", D: 42, life: 74, pal: { band: "#1a0a2e", acc: "#ff5fd2", fg: PAPER, vig: "#5d275d", ring: "#b55dff", lines: "#ffd1e8" } },
  ink: { n: "Encre", d: "Un coup de pinceau géant, et le sceau rouge.", D: 16, life: 68, pal: { band: "#efe6d0", acc: BLOOD, fg: INK, out: null, vig: "#3a2a1a", ring: INK, lines: INK } },
  glitch: { n: "Glitch", d: "L'image bugue, se déchire, et redémarre.", D: 34, life: 60, pal: { band: "#0b0b14", acc: "#00ffd5", fg: "#ff2bd6", vig: "#ff2bd6", ring: "#00ffd5", lines: "#00ffd5" } },
  meteor: { n: "Météore", d: "Une boule de feu, un seul impact.", D: 30, life: 72, pal: { band: "#1a0505", acc: "#ef7d57", fg: "#ffcd75", vig: "#ef7d57", ring: "#ffcd75", lines: "#fff6c8" } },
  blades: { n: "Mille lames", d: "Dix coupes en une seconde, puis la croix. Rouge et noir.", D: 34, life: 62, pal: DARK },
};
/** K.O. : stop = images de gel de la scène avant la fin, life = durée de l'effet, pal = couleurs du « K.O. ». */
export const KO = {
  cut: { n: "Tranche", d: "Écran noir, un trait, le boss coupé en deux.", pal: DARK },
  manga: { n: "Manga", d: "Trois cases qui claquent.", pal: { band: PAPER, acc: INK, fg: INK, out: null } },
  ash: { n: "Cendres", d: "Le boss s'éteint et part en cendres avec le vent.", stop: 72, life: 156, pal: { band: INK, acc: "#ef7d57", fg: "#c2c3c7" } },
  stomp: { n: "Écrasé", d: "Une botte géante. Écrasé comme un mégot.", stop: 60, life: 132, pal: { band: "#2a1d1d", acc: "#ffcd75", fg: PAPER } },
  fireworks: { n: "Feu d'artifice", d: "Envoyé en l'air, il explose en bouquet final.", stop: 40, life: 168, pal: { band: "#0b0d24", acc: "#ff5fd2", fg: "#ffcd75" } },
  crt: { n: "Extinction", d: "Comme une vieille télé qu'on éteint.", stop: 56, life: 106, pal: { band: "#000", acc: AIR, fg: PAPER } },
  freeze: { n: "Gel", d: "Pris dans la glace, puis brisé en mille éclats.", stop: 74, life: 134, pal: { band: "#0b1f33", acc: "#7fd8f0", fg: "#dff6ff" } },
  sky: { n: "Envolé", d: "Expédié dans le ciel. Ting !", stop: 30, life: 132, pal: { band: "#3b5dc9", acc: "#ffcd75", fg: PAPER } },
};

// ---------- signatures ----------
const RAINBOW = ["#ff1f3d", "#ef7d57", "#ffcd75", "#a7f070", "#3ae0ff", "#3b5dc9", "#b55dff"];
const WORDS = ["pow", "bam", "paf", "krak", "boum", "vlan", "pif", "tchak"];
/** Étoile pixel (contour irrégulier) : remplie et cernée, sans flou. */
function star(b, x, y, R, r, n, seed, fill, line) {
  const lim = (dx, dy) => {
    const t = ((Math.atan2(dy, dx) / (Math.PI * 2)) * n * 2 + n * 2) % (n * 2), i = Math.floor(t), f = t - i;
    const rad = (k) => (k % 2 ? r : R * (0.8 + 0.4 * hash(seed + (k % (n * 2)))));
    return rad(i) + (rad(i + 1) - rad(i)) * f;
  };
  const M = Math.ceil(R * 1.3) + 1;
  for (let dy = -M; dy <= M; dy++) for (let dx = -M; dx <= M; dx++) {
    const d = Math.hypot(dx, dy), L = lim(dx, dy);
    if (d <= L) { b.fillStyle = fill; b.fillRect(Math.round(x) + dx, Math.round(y) + dy, 1, 1); }
    else if (d <= L + 1.2) { b.fillStyle = line; b.fillRect(Math.round(x) + dx, Math.round(y) + dy, 1, 1); }
  }
}
/**
 * Signatures de coups : à chaque coup ordinaire, un tampon sur le boss (stamp, life images), une gerbe de particules (p, n),
 * la couleur des dégâts (col, out, cycle) et un petit son par-dessus l'impact (sfx).
 */
export const HIT_SKINS = {
  classic: { n: "Étincelles", d: "Le classique." },
  embers: {
    n: "Braises", d: "Une flamme jaillit à chaque coup, les braises montent.", col: "#ffcd75", out: "#5a0a18", ring: "#ef7d57", sfx: "sig_embers", life: 18, cnt: 14,
    p: (x, y, v) => ({ x: x + rnd(-3, 3), y, vx: rnd(-1, 1) * v, vy: rnd(-2.4, -0.8) * v, g: -0.03, drag: 0.94, wob: 0.3, life: rnd(30, 55) | 0, c: SPARK, blink: true, size: Math.random() < 0.35 ? 2 : 1 }),
    stamp(b, s) {
      const k = s.age / s.life, h = Math.round(19 - k * 7), y0 = s.y + 5 - s.age * 0.7;
      [[1, "#b13e53"], [0.72, "#ef7d57"], [0.46, "#ffcd75"], [0.22, "#fff6c8"]].forEach(([m, c]) => {
        b.fillStyle = c;
        for (let i = 0; i < h * m + 1; i++) {
          const t = i / h, w = Math.round((Math.sin(Math.PI * Math.min(1, (1 - t) * 1.1)) * 7.5 * (1 - k * 0.4) + (hash(s.r + i + s.age * 3) - 0.5) * 2) * m);
          if (w > 0) b.fillRect(Math.round(s.x - w + (t > 0.5 ? Math.round(Math.sin(s.age * 0.9 + i) * 1.2) : 0)), Math.round(y0 - i), w * 2, 1);
        }
      });
    },
  },
  ink: {
    n: "Encre", d: "Une tache d'encre éclate et reste un moment sur le boss.", col: INK, out: PAPER, ring: INK, sfx: "sig_ink", life: 46, cnt: 14,
    p: (x, y, v) => ({ x, y, vx: rnd(-2.8, 2.8) * v, vy: rnd(-2.6, -0.3) * v, g: 0.22, drag: 0.97, floor: FLOOR, bounce: 0, life: rnd(50, 80) | 0, c: Math.random() < 0.12 ? BLOOD : INK, size: Math.random() < 0.5 ? 2 : 1 }),
    stamp(b, s) {
      if (s.age > s.life - 12 && (s.age >> 1) % 2) return;
      const pop = s.age < 3 ? 1.5 - s.age * 0.17 : 1;
      b.fillStyle = INK; disc(b, s.x, s.y, 3.6 * pop);
      for (let i = 0; i < 8; i++) { const a = hash(s.r + i) * Math.PI * 2, L = (3 + hash(s.r + i + 9) * 5) * pop; pline(b, s.x, s.y, s.x + Math.cos(a) * L, s.y + Math.sin(a) * L, 2); b.fillRect(Math.round(s.x + Math.cos(a) * (L + 2)), Math.round(s.y + Math.sin(a) * (L + 2)), 1, 1); }
      if (s.age > 4) { const L = Math.min(7, (s.age - 4) * 0.35); pline(b, s.x - 2, s.y + 3, s.x - 2, s.y + 3 + L, 1); pline(b, s.x + 2, s.y + 2, s.x + 2, s.y + 2 + L * 0.6, 1); }
      b.fillStyle = BLOOD; b.fillRect(Math.round(s.x) + 1, Math.round(s.y) - 1, 1, 1);
    },
  },
  neon: {
    n: "Néon", d: "Une croix de lumière et un anneau rose et cyan.", col: AIR, out: "#2a0a3a", alt: "#ff5fd2", ring: "#ff5fd2", sfx: "sig_neon", life: 13, cnt: 16,
    p: (x, y, v, i) => { const a = rnd(0, Math.PI * 2), sp = rnd(1.6, 4) * v; return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 0.86, life: rnd(14, 26) | 0, c: i % 2 ? "#ff5fd2" : AIR, size: i % 4 ? 1 : 2 }; },
    stamp(b, s) {
      const k = s.age / s.life, L = Math.round(16 * (1 - k) + 3), M = Math.round(L * 0.6);
      b.fillStyle = AIR; b.fillRect(Math.round(s.x - L), Math.round(s.y), L * 2 + 1, 1);
      b.fillStyle = "#ff5fd2"; b.fillRect(Math.round(s.x), Math.round(s.y - M), 1, M * 2 + 1);
      b.fillStyle = (s.age >> 1) % 2 ? "#ff5fd2" : AIR; circle(b, s.x, s.y, 2 + s.age * 1.3);
      b.fillStyle = PAPER; b.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3);
    },
  },
  petals: {
    n: "Pétales", d: "Une fleur éclot sur le coup, ses pétales s'envolent.", col: "#ff9ecf", out: "#5d275d", ring: "#ffd1e8", sfx: "sig_petals", life: 22, cnt: 14,
    p: (x, y, v, i) => ({ x, y, vx: rnd(-1.8, 1.8) * v, vy: rnd(-2.2, -0.6) * v, g: 0.03, drag: 0.96, wob: 0.35, life: rnd(60, 95) | 0, c: ["#ff9ecf", "#ffd1e8", "#ffffff", "#ff6fb5"][i % 4], size: 2, fade: true }),
    stamp(b, s) {
      const open = s.age < 10 ? 2 + s.age * 0.25 : 4.5 + (s.age - 10) * 1.1, rot = s.r + s.age * 0.08;
      if (s.age > 16 && s.age % 2) return;
      for (let i = 0; i < 5; i++) { const a = rot + (i * Math.PI * 2) / 5; b.fillStyle = i % 2 ? "#ff9ecf" : "#ffd1e8"; disc(b, s.x + Math.cos(a) * open, s.y + Math.sin(a) * open, 2); }
      if (s.age < 12) { b.fillStyle = "#ffcd75"; b.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2); }
    },
  },
  gold: {
    n: "Pièces d'or", d: "Un éclat doré et une pluie de pièces qui rebondissent.", col: "#ffcd75", out: "#5a3a10", ring: "#ffcd75", sfx: "sig_gold", life: 14, cnt: 14,
    p: (x, y, v) => ({ x, y, vx: rnd(-2.2, 2.2) * v, vy: rnd(-3.4, -1.6) * v, g: 0.2, floor: FLOOR, bounce: 0.55, life: rnd(55, 75) | 0, c: (t) => (((t * 40) | 0) % 3 ? "#ffcd75" : "#fff6c8"), size: Math.random() < 0.5 ? 3 : 2, blink: true }),
    stamp(b, s) {
      const L = [4, 9, 13, 12, 11, 10, 9, 8, 6, 5, 4, 3, 2, 1][s.age] ?? 1, D = Math.round(L * 0.5);
      b.fillStyle = "#ffcd75"; pline(b, s.x - L, s.y, s.x + L, s.y, 2); pline(b, s.x, s.y - L, s.x, s.y + L, 2);
      b.fillStyle = "#fff6c8"; pline(b, s.x - D, s.y - D, s.x + D, s.y + D, 1); pline(b, s.x - D, s.y + D, s.x + D, s.y - D, 1);
      b.fillStyle = PAPER; b.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3);
    },
  },
  rainbow: {
    n: "Arc-en-ciel", d: "Un arc-en-ciel jaillit, les dégâts changent de couleur.", cycle: RAINBOW, out: "#140c1c", ring: "#b55dff", sfx: "sig_rainbow", life: 15, cnt: 16,
    p: (x, y, v, i) => { const a = rnd(0, Math.PI * 2), sp = rnd(1.4, 3.4) * v; return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, g: 0.06, drag: 0.9, life: rnd(20, 36) | 0, c: RAINBOW[i % 7], size: Math.random() < 0.4 ? 2 : 1 }; },
    stamp(b, s) {
      const r0 = 2 + s.age * 0.7;
      for (let i = 0; i < 7; i++) {
        b.fillStyle = RAINBOW[i]; const r = r0 + (6 - i);
        for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.6 / r) b.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + 2 + Math.sin(a) * r), 1, 1);
      }
    },
  },
  bd: {
    n: "Onomatopées", d: "POW ! BAM ! KRAK ! Chaque coup, sa bulle de BD.", col: PAPER, out: INK, ring: "#ffcd75", sfx: "sig_bd", life: 20, cnt: 8,
    p: (x, y, v, i) => { const a = rnd(0, Math.PI * 2), sp = rnd(1.4, 3) * v; return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 0.86, life: rnd(12, 20) | 0, c: i % 2 ? "#ffcd75" : PAPER, size: 2 }; },
    stamp(b, s) {
      if (s.age > s.life - 6 && s.age % 2) return;
      const pop = s.age < 3 ? 1.35 - s.age * 0.12 : 1, j = s.age < 4 ? Math.round(rnd(-1, 1)) : 0, w = WORDS[Math.floor(s.r * 7) % WORDS.length];
      const R = Math.max(9, w.length * 2 + 6) * pop;
      star(b, s.x + j, s.y - 4 + j, R, R * 0.66, 9, s.r, "#ffcd75", INK);
      star(b, s.x + j, s.y - 4 + j, R * 0.62, R * 0.45, 9, s.r + 3, "#e43b44", "#e43b44");
      drawText(b, w, s.x + j, s.y - 6 + j, { color: PAPER, outline: INK, sc: 1 });
    },
  },
};

/** Ligne brisée d'un point à un autre (éclair, fissure). */
function zig(x0, y0, x1, y1, jit) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, pts = [[x0, y0]];
  for (let d = rnd(3, 6); d < L - 3; d += rnd(3, 7)) { const j = rnd(-jit, jit); pts.push([x0 + ux * d - uy * j, y0 + uy * d + ux * j]); }
  pts.push([x1, y1]);
  return pts;
}
const poly = (o, pts, s) => { for (let i = 1; i < pts.length; i++) pline(o, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], s); };
const grayOf = (c) => { const [r, g, b] = rgb(c), l = Math.round(0.3 * r + 0.55 * g + 0.15 * b); const v = Math.round(40 + l * 0.55); return `rgb(${v},${v - 2},${v - 6})`; };

/** Botte de l'Écrasé, dessinée une fois. */
let bootCache = null;
function boot() {
  if (bootCache) return bootCache;
  const W = 40, H = 64, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d"), R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const shape = (col, d) => {
    R(col, 6 - d, 0, 18 + 2 * d, 44); // tige
    for (let y = 36; y < 54; y++) { const toe = y < 42 ? 26 + (y - 36) * 1.6 : 36; R(col, 5 - d, y - d, toe - 5 + 2 * d + 1, 1); } // pied
    R(col, 3 - d, 53 - d, 35 + 2 * d, 6 + 2 * d); // semelle
  };
  shape(INK, 1);
  shape("#4a3030", 0);
  R("#6b4646", 8, 0, 2, 40); R("#6b4646", 26, 42, 8, 1); R("#2e1d1d", 20, 0, 3, 40); // reflets et ombre
  for (let i = 0; i < 4; i++) R("#c2c3c7", 21, 34 + i * 3, 5, 1); // lacets
  R("#16121c", 3, 53, 35, 5); R("#2a2030", 3, 53, 35, 1);
  for (let x = 4; x < 38; x += 4) R(INK, x, 58, 2, 1); // crampons
  R("#16121c", 3, 49, 12, 4); // talon
  return (bootCache = c);
}

export const fxMethods = {
  /** Silhouette (img, white, black, red, cyan) du boss mise à l'échelle autour de son centre. */
  _boss(o, kind, cx, cy, sx = 1, sy = sx) {
    const sp = this.sprite(), w = Math.max(1, Math.round(sp.w * sx)), h = Math.max(1, Math.round(sp.h * sy));
    o.drawImage(sp[kind], Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  },
  _center() { const q = this.ovPos(), sp = this.sprite(); return { q, sp, cx: q.x + sp.w / 2, cy: q.y + sp.h / 2 }; },
  _flash(o, W, H, col = PAPER, a = 1) { if (!this.intense) a *= 0.35; o.globalAlpha = q4(a); o.fillStyle = col; o.fillRect(0, 0, W, H); o.globalAlpha = 1; },
  _back(o, e, W, H, col, max = 1, inn = 4, out = 16) {
    o.globalAlpha = q4(Math.min(1, e.age / inn) * Math.min(1, (e.life - e.age) / out) * max);
    o.fillStyle = col; o.fillRect(0, 0, W, H); o.globalAlpha = 1;
  },

  // ================= ULTIME : FOUDRE =================
  _bolt(x, y) {
    const main = zig(x + rnd(-16, 16), -6, x, y, 4), br = [];
    for (let i = 2; i < main.length - 1; i++) if (Math.random() < 0.4) { const [bx, by] = main[i], a = Math.PI / 2 + rnd(-1.2, 1.2); br.push(zig(bx, by, bx + Math.cos(a) * rnd(8, 22), by + Math.sin(a) * rnd(6, 16), 2)); }
    return { main, br };
  },
  mk_u_thunder(x, y) { return { bolt: this._bolt(x, y), drops: Array.from({ length: 50 }, (_, i) => [hash(i), hash(i + 99)]) }; },
  up_u_thunder(e) {
    if (e.age === 16 || e.age === 22 || e.age === 27) e.bolt = this._bolt(e.x, e.y);
    if (e.age === 16) {
      this.ovParts.burst(30, (i) => { const a = rnd(Math.PI, Math.PI * 2), v = rnd(1, 3.4); return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.14, drag: 0.95, life: rnd(20, 40) | 0, c: i % 3 ? AIR : PAPER, blink: true }; });
    }
  },
  flt_u_thunder(e) { const k = e.age - 16; return k >= 0 && k < 2 ? "invert(1) contrast(1.6)" : k >= 6 && k < 7 ? "brightness(1.8)" : e.age < 16 ? "saturate(.4) brightness(.75)" : ""; },
  ov_u_thunder(o, e, W, H) {
    const a = e.age, { q, sp } = this._center();
    this._back(o, e, W, H, "#05081a", 0.92, 6);
    if (a < e.life - 16) {
      o.fillStyle = "#2a3d6b";
      for (const [hx, hy] of e.drops) { const x = ((hx * (W + 30) - a * 2.2) % (W + 30) + W + 30) % (W + 30) - 10, y = (hy * H + a * 7) % H; pline(o, x, y, x - 2, y + 5, 1); }
    }
    if (a < 16) {
      if (a === 6 || a === 7 || a === 12) this._flash(o, W, H, "#cfe9ff", 0.3);
      o.globalAlpha = 0.6; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) o.drawImage(sp.cyan, q.x + dx, q.y + dy); o.globalAlpha = 1;
      o.drawImage(sp.black, q.x, q.y);
      return;
    }
    const k = a - 16;
    if (k < 2) this._flash(o, W, H, PAPER, 1);
    const on = k < 15 && !(k >= 5 && k < 7) && k !== 10;
    if (on) {
      const w = k < 3 ? 4 : k < 8 ? 3 : 2;
      o.fillStyle = AIR; poly(o, e.bolt.main, w + 2); for (const b of e.bolt.br) poly(o, b, 2);
      o.fillStyle = PAPER; poly(o, e.bolt.main, w); for (const b of e.bolt.br) poly(o, b, 1);
    }
    const lit = k < 14 && k % 5 < 3;
    o.globalAlpha = 0.8; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) o.drawImage(sp.cyan, q.x + dx, q.y + dy); o.globalAlpha = 1;
    o.drawImage(lit ? sp.white : sp.black, q.x, q.y);
    if (k < 18) { o.globalAlpha = q4(1 - k / 18); o.fillStyle = AIR; disc(o, e.x, e.y, 7 - k * 0.3); o.fillStyle = PAPER; disc(o, e.x, e.y, 3); o.globalAlpha = 1; }
    if (k >= 14 && a < e.life - 12 && a % 5 < 2) { o.fillStyle = AIR; for (const bl of bolts(q.x + sp.w / 2, q.y + sp.h / 2, 3, 16)) poly(o, bl.pts, 1); }
  },

  // ================= ULTIME : TROU NOIR =================
  mk_u_void() { return { st: Array.from({ length: 54 }, (_, i) => ({ a: rnd(0, Math.PI * 2), r0: rnd(45, 120), sp: rnd(0.7, 1.3), ph: rnd(0, 1), c: ["#b13e53", "#ef7d57", "#b55dff", "#ffcd75", "#ffffff", "#5d275d"][i % 6] })) }; },
  up_u_void(e) {
    if (e.age === 40) this.ovParts.burst(46, (i) => { const a = rnd(0, Math.PI * 2), v = rnd(1.5, 4.5); return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.92, life: rnd(24, 44) | 0, c: ["#b55dff", "#ff5fd2", PAPER, "#ffcd75"][i % 4], size: i % 4 ? 1 : 2, blink: true }; });
  },
  flt_u_void(e) { return e.age >= 38 && e.age < 41 ? "invert(1) contrast(2)" : e.age < 38 ? "saturate(1.8) hue-rotate(-25deg) brightness(.65)" : ""; },
  ov_u_void(o, e, W, H) {
    const a = e.age, { q, sp, cx: bx, cy: by } = this._center(), cx = e.x, cy = e.y;
    if (a < 38) {
      this._back(o, e, W, H, "#0d0618", 1, 6);
      const k = a / 38;
      for (const s of e.st) {
        const f = (a * 0.03 * s.sp + s.ph) % 1, r = s.r0 * (1 - f) + 6, t = s.a + f * 3;
        o.globalAlpha = q4(0.3 + f); o.fillStyle = s.c;
        pline(o, cx + Math.cos(t) * r, cy + Math.sin(t) * r, cx + Math.cos(t - 0.18) * (r + 5 + 10 * f), cy + Math.sin(t - 0.18) * (r + 5 + 10 * f), 1);
      }
      o.globalAlpha = 1;
      // le boss est aspiré : il rétrécit et s'étire vers le point
      const s = Math.max(0.12, 1 - k ** 1.6 * 0.95), tx = bx + (cx - bx) * k ** 2, ty = by + (cy - by) * k ** 2;
      this._boss(o, k < 0.45 ? "img" : (a >> 1) % 2 ? "red" : "black", tx, ty, s * (1 - k * 0.3), s * (1 + k * 0.5));
      const R = (2 + Math.min(1, a / 18) * 9) * (a > 30 ? Math.max(0.1, 1 - (a - 30) / 8) : 1);
      const ring = (front) => {
        for (let i = 0; i < 44; i++) {
          const t = (i / 44) * Math.PI * 2 + a * 0.16, sy = Math.sin(t);
          if (front !== sy > 0) continue;
          o.fillStyle = ["#ffcd75", "#ef7d57", "#ff5fd2", PAPER][i % 4];
          o.fillRect(Math.round(cx + Math.cos(t) * R * 2.3), Math.round(cy + sy * R * 0.6), 2, 1);
        }
      };
      ring(false);
      o.fillStyle = "#ff5fd2"; disc(o, cx, cy, R + 1); o.fillStyle = "#000"; disc(o, cx, cy, R);
      ring(true);
      return;
    }
    const k = a - 38;
    if (k < 2) { this._flash(o, W, H, PAPER, 1); return; }
    this._back(o, e, W, H, "#0d0618", 0.85 * Math.max(0, 1 - k / 30), 1, 1);
    o.fillStyle = PAPER; circle(o, cx, cy, k * 6, 2);
    o.fillStyle = "#ff5fd2"; circle(o, cx, cy, k * 6 - 3, 1);
    o.fillStyle = "#b55dff"; circle(o, cx, cy, k * 3.5, 1);
    if (k < 14) {
      o.fillStyle = PAPER;
      for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; pline(o, cx + Math.cos(t) * (k * 3), cy + Math.sin(t) * (k * 3), cx + Math.cos(t) * (k * 9 + 10), cy + Math.sin(t) * (k * 9 + 10), 1); }
      o.drawImage(k % 4 < 2 ? sp.white : sp.img, q.x, q.y);
    }
  },

  // ================= ULTIME : ENCRE =================
  mk_u_ink(x, y) { const ang = rnd(0.42, 0.62) * (Math.random() < 0.5 ? 1 : -1); return { ang, len: 190 }; },
  _stroke(e, t) { const d = { x: Math.cos(e.ang), y: Math.sin(e.ang) }; return { x: e.x - d.x * e.len * (0.5 - t), y: e.y - d.y * e.len * (0.5 - t), d }; },
  up_u_ink(e) {
    if (e.age === 13) this.ovParts.burst(36, (i) => { const p = this._stroke(e, rnd(0.25, 0.75)), s = i % 2 ? 1 : -1, v = rnd(0.8, 3); return { x: p.x, y: p.y, vx: -p.d.y * s * v + rnd(-0.5, 0.5), vy: p.d.x * s * v - 0.6, g: 0.15, drag: 0.95, life: rnd(30, 60) | 0, c: i % 9 ? INK : BLOOD, size: i % 3 ? 1 : 2 }; });
  },
  flt_u_ink(e) { return e.age < 2 ? "invert(1)" : e.age < 40 ? "sepia(.5) contrast(1.2)" : ""; },
  ov_u_ink(o, e, W, H) {
    const a = e.age, { q, sp } = this._center();
    if (a < 2) { this._flash(o, W, H, INK, 1); return; }
    this._back(o, e, W, H, "#efe6d0", 1, 2, 14);
    const fade = q4(Math.min(1, (e.life - a) / 14));
    o.globalAlpha = fade;
    o.fillStyle = "#d9cdb1";
    for (let i = 0; i < 70; i++) o.fillRect(Math.round(hash(i) * W), Math.round(hash(i + 7) * H), 1 + (i % 3 === 0), 1);
    // le boss à l'encre, coupé net une fois le trait passé
    const d = { x: Math.cos(e.ang), y: Math.sin(e.ang) }, n = { x: -d.y, y: d.x };
    if (a < 14) o.drawImage(sp.black, q.x, q.y);
    else {
      const gap = Math.min(2, (a - 14) * 0.25);
      for (const side of [-1, 1]) {
        o.save(); o.beginPath();
        o.moveTo(e.x - d.x * 300, e.y - d.y * 300); o.lineTo(e.x + d.x * 300, e.y + d.y * 300);
        o.lineTo(e.x + d.x * 300 + n.x * side * 300, e.y + d.y * 300 + n.y * side * 300); o.lineTo(e.x - d.x * 300 + n.x * side * 300, e.y - d.y * 300 + n.y * side * 300);
        o.closePath(); o.clip();
        o.drawImage(sp.black, Math.round(q.x + n.x * side * gap), Math.round(q.y + n.y * side * gap));
        o.restore();
      }
    }
    // le coup de pinceau : épais, effilé, sec sur la fin
    const k = clamp((a - 3) / 9, 0, 1), steps = Math.round(e.len * k);
    o.fillStyle = INK;
    for (let s = 0; s < steps; s++) {
      const t = s / e.len, p = this._stroke(e, t), w = 2 + 10 * Math.sin(Math.PI * Math.min(1, t * 1.12)) ** 0.55 + (hash(s) - 0.5) * 2;
      const dry = t > 0.68 ? (t - 0.68) * 2.6 : 0.04;
      for (let j = -w / 2; j <= w / 2; j += 1) if (hash(s * 13.7 + Math.round(j) * 7.1 + 3) > dry) o.fillRect(Math.round(p.x + n.x * j), Math.round(p.y + n.y * j), 2, 2);
    }
    if (a >= 13) for (let i = 0; i < 6; i++) { const p = this._stroke(e, 0.15 + i * 0.12), L = Math.min(4 + hash(i) * 14, (a - 13) * 0.7); pline(o, p.x + n.x * 3, p.y + 4, p.x + n.x * 3, p.y + 4 + L, 1); }
    // sceau rouge
    if (a >= 18) {
      const s = Math.round(13 * (a < 22 ? 1.7 - (a - 18) * 0.175 : 1)), x = Math.round(clamp(e.x + 16, 4, W - s - 4)), y = Math.round(clamp(e.y + 18, 4, H - s - 4));
      o.fillStyle = BLOOD; o.fillRect(x, y, s, s);
      if (s === 13) {
        o.fillStyle = "#efe6d0";
        o.fillRect(x + 2, y + 2, 9, 1); o.fillRect(x + 2, y + 10, 9, 1); o.fillRect(x + 2, y + 2, 1, 9); o.fillRect(x + 10, y + 2, 1, 9);
        o.fillRect(x + 6, y + 4, 1, 5); o.fillRect(x + 4, y + 6, 5, 1); o.fillRect(x + 4, y + 4, 1, 1); o.fillRect(x + 8, y + 8, 1, 1);
        o.fillStyle = BLOOD; o.fillRect(x + 3, y + 10, 2, 1); o.fillRect(x + 10, y + 5, 1, 2); // encre manquante
      }
    }
    o.globalAlpha = 1;
  },

  // ================= ULTIME : GLITCH =================
  up_u_glitch(e) {
    if (e.age % 2 === 0) {
      e.bands = []; for (let y = 0; y < 400;) { const h = 1 + ((Math.random() * 8) | 0); e.bands.push([y, h, Math.random() < 0.45 ? Math.round(rnd(-9, 9)) : 0]); y += h; }
      e.blocks = Array.from({ length: 4 + ((Math.random() * 8) | 0) }, () => [rnd(0, 1), rnd(0, 1), 2 + rnd(0, 14), 1 + rnd(0, 4), ["#ff2bd6", "#00ffd5", PAPER, "#3b1fff", "#000"][(Math.random() * 5) | 0]]);
    }
  },
  flt_u_glitch(e) { const a = e.age; return a < 30 ? (a % 6 < 2 ? "hue-rotate(160deg) saturate(3)" : a % 6 === 3 ? "invert(1)" : "contrast(1.4) saturate(1.6)") : a < 32 ? "brightness(2.2)" : ""; },
  ov_u_glitch(o, e, W, H) {
    const a = e.age, { q, sp } = this._center();
    if (a < 30) {
      this._back(o, e, W, H, "#0b0b14", 0.94, 2);
      for (const [y, h, off] of e.bands || []) {
        if (y >= q.y + sp.h) break;
        const y0 = Math.max(y, q.y), y1 = Math.min(y + h, q.y + sp.h);
        if (y1 <= y0) continue;
        const sy = y0 - q.y, hh = y1 - y0;
        o.globalAlpha = 0.8;
        o.drawImage(sp.red, 0, sy, sp.w, hh, q.x + off - 2, y0, sp.w, hh);
        o.drawImage(sp.cyan, 0, sy, sp.w, hh, q.x + off + 2, y0, sp.w, hh);
        o.globalAlpha = 1;
        o.drawImage(a % 7 === 0 ? sp.white : sp.img, 0, sy, sp.w, hh, q.x + off, y0, sp.w, hh);
      }
      for (const [bx, by, bw, bh, c] of e.blocks || []) { o.fillStyle = c; o.fillRect(Math.round(bx * W), Math.round(by * H), Math.round(bw), Math.round(bh)); }
      o.globalAlpha = 0.35; o.fillStyle = "#000"; for (let y = a % 2; y < H; y += 2) o.fillRect(0, y, W, 1); o.globalAlpha = 1;
      if (a % 8 < 4) drawText(o, a % 16 < 8 ? "err" : "0x00", Math.round(hash(a) * (W - 20)) + 10, Math.round(hash(a + 3) * (H - 10)), { color: "#00ffd5", sc: 1 });
      return;
    }
    if (a < 32) { this._flash(o, W, H, PAPER, 1); return; }
    const k = a - 32;
    this._back(o, e, W, H, "#000", Math.max(0, 1 - k / 22), 1, 1);
    if (k < 6) o.drawImage(sp.white, q.x, q.y);
    o.fillStyle = AIR; o.fillRect(0, Math.round(k * 9) % H, W, 1);
    o.globalAlpha = 0.5; o.fillRect(0, (Math.round(k * 9) + 2) % H, W, 1); o.globalAlpha = 1;
  },

  // ================= ULTIME : MÉTÉORE =================
  mk_u_meteor(x, y) { return { sx: x + 46, sy: -14 }; },
  _met(e, a) { const k = clamp(a / 28, 0, 1) ** 1.35; return { x: e.sx + (e.x - e.sx) * k, y: e.sy + (e.y - e.sy) * k }; },
  up_u_meteor(e) {
    if (e.age < 28) { const p = this._met(e, e.age); this.ovParts.burst(3, () => ({ x: p.x + rnd(-1.5, 1.5), y: p.y + rnd(-1.5, 1.5), vx: rnd(0.2, 0.9), vy: rnd(-0.8, -0.2), drag: 0.96, life: rnd(18, 34) | 0, c: SPARK, fade: true, size: rnd(1, 3), grow: 0.04 })); }
    if (e.age === 28) {
      this.ovParts.burst(26, () => { const a = rnd(Math.PI, Math.PI * 2), v = rnd(1.5, 4); return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.18, life: rnd(40, 70) | 0, c: ["#5a3a22", "#8a5a2b", "#3a2a1a"][(Math.random() * 3) | 0], size: Math.random() < 0.4 ? 2 : 1 }; });
      this.ovParts.burst(30, () => { const a = rnd(0, Math.PI * 2), v = rnd(1, 3); return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: -0.02, drag: 0.94, life: rnd(26, 50) | 0, c: SPARK, blink: true }; });
      this.ovParts.burst(16, () => ({ x: e.x + rnd(-8, 8), y: e.y + rnd(-4, 4), vx: rnd(-0.3, 0.3), vy: rnd(-0.6, -0.2), life: rnd(50, 80) | 0, c: "#3e3e4c", fade: true, size: 3, grow: 0.08 }));
    }
  },
  flt_u_meteor(e) { const a = e.age; return a >= 28 && a < 30 ? "invert(1)" : a >= 30 && a < 46 ? "sepia(1) saturate(3) hue-rotate(-25deg) contrast(1.2)" : a < 28 ? "sepia(.5) saturate(1.6) brightness(.85)" : ""; },
  ov_u_meteor(o, e, W, H) {
    const a = e.age, { q, sp } = this._center();
    this._back(o, e, W, H, "#1a0505", a < 28 ? 0.7 : 0.75, 6);
    if (a < 28) {
      const k = clamp(a / 28, 0, 1), fy = q.y + sp.h;
      o.globalAlpha = 0.5; o.fillStyle = INK; o.fillRect(Math.round(e.x - 3 - k * 12), fy - 1, Math.round(6 + k * 24), 2); o.globalAlpha = 1;
      o.drawImage(sp.img, q.x, q.y);
      const p = this._met(e, a), t = this._met(e, Math.max(0, a - 7));
      [[7, FIRE[0]], [5, FIRE[1]], [3, FIRE[2]], [1, FIRE[3]]].forEach(([w, c]) => { o.fillStyle = c; pline(o, t.x, t.y, p.x, p.y, w); });
      o.fillStyle = FIRE[1]; disc(o, p.x, p.y, 4.5); o.fillStyle = FIRE[2]; disc(o, p.x, p.y, 3.2); o.fillStyle = FIRE[3]; disc(o, p.x, p.y, 1.8);
      return;
    }
    const k = a - 28;
    if (k < 2) { this._flash(o, W, H, PAPER, 1); return; }
    if (k < 24) {
      const R = Math.min(34, 6 + k * 4), f = k < 10 ? 1 : 1 - (k - 10) / 14;
      o.globalAlpha = q4(f);
      [[1, FIRE[0]], [0.78, FIRE[1]], [0.55, FIRE[2]], [0.3, FIRE[3]]].forEach(([r, c]) => { o.fillStyle = c; disc(o, e.x, e.y, R * r * (1 + 0.05 * Math.sin(k + r * 9))); });
      o.globalAlpha = 1;
      o.fillStyle = PAPER; const gy = q.y + sp.h; o.fillRect(Math.round(e.x - k * 7), gy, Math.round(k * 14), 1);
    }
    o.drawImage(k < 8 && k % 2 ? sp.white : sp.black, q.x, q.y);
  },

  // ================= ULTIME : MILLE LAMES =================
  mk_u_blades() { return { sl: Array.from({ length: 11 }, (_, i) => ({ at: 2 + i * 2.6, a: rnd(0, Math.PI), off: rnd(-7, 7), len: rnd(60, 100) })) }; },
  up_u_blades(e) {
    for (const s of e.sl) if (Math.floor(s.at) === e.age) this.ovParts.burst(6, () => { const a = rnd(0, Math.PI * 2), v = rnd(1, 2.6); return { x: e.x + rnd(-6, 6), y: e.y + rnd(-6, 6), vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.86, life: 14, c: Math.random() < 0.5 ? BLOOD : PAPER }; });
    if (e.age === 31) this.ovParts.burst(30, () => { const a = rnd(0, Math.PI * 2), v = rnd(1.5, 4); return { x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, life: rnd(16, 30) | 0, c: Math.random() < 0.5 ? BLOOD : PAPER, size: 2 }; });
  },
  flt_u_blades(e) { return e.age >= 31 && e.age < 33 ? "invert(1) contrast(1.6)" : e.age < 31 ? "grayscale(1) contrast(1.6)" : ""; },
  ov_u_blades(o, e, W, H) {
    const a = e.age, { q, sp, cx, cy } = this._center();
    if (a < 2) { this._flash(o, W, H, PAPER, 1); return; }
    this._back(o, e, W, H, INK, 1, 1, 12);
    const fade = q4(Math.min(1, (e.life - a) / 12));
    o.globalAlpha = fade;
    const recent = e.sl.some((s) => a - s.at >= 0 && a - s.at < 2);
    const j = recent ? Math.round(rnd(-1, 1)) : 0;
    o.drawImage(a >= 31 && a < 40 && a % 2 ? sp.red : sp.white, q.x + j, q.y + j);
    for (const s of e.sl) {
      const dt = a - s.at;
      if (dt < 0) continue;
      const d = { x: Math.cos(s.a), y: Math.sin(s.a) }, n = { x: -d.y, y: d.x }, mx = cx + n.x * s.off, my = cy + n.y * s.off;
      const x0 = mx - d.x * s.len / 2, y0 = my - d.y * s.len / 2, x1 = mx + d.x * s.len / 2, y1 = my + d.y * s.len / 2;
      if (dt < 2) { o.fillStyle = BLOOD; pline(o, x0, y0, x1, y1, 3); o.fillStyle = PAPER; pline(o, x0, y0, x1, y1, 1); }
      else { o.fillStyle = a >= 31 && a < 38 ? ((a >> 1) % 2 ? PAPER : BLOOD) : "#5a0a18"; pline(o, x0, y0, x1, y1, a >= 31 && a < 38 ? 2 : 1); }
    }
    if (a >= 31) {
      const w = a < 34 ? 4 : a < 38 ? 2 : 1;
      for (const s of [-1, 1]) { const ex = Math.cos(0.8) * 140, ey = Math.sin(0.8) * 140 * s; o.fillStyle = BLOOD; pline(o, cx - ex, cy - ey, cx + ex, cy + ey, w + 2); o.fillStyle = PAPER; pline(o, cx - ex, cy - ey, cx + ex, cy + ey, w); }
    }
    o.globalAlpha = 1;
  },

  // ================= K.O. : CENDRES =================
  mk_k_ash() {
    const { q, sp } = this._center();
    return { px: sp.pixels.map((p, i) => ({ x: q.x + p.x, y: q.y + p.y, c: p.c, g: grayOf(p.c), t: 22 + (p.y / sp.h) * 48 + hash(i) * 14 + (p.x / sp.w) * 4, gone: false })) };
  },
  up_k_ash(e) {
    for (const p of e.px) if (!p.gone && e.age >= p.t) {
      p.gone = true;
      const g = p.g;
      this.ovParts.add({ x: p.x, y: p.y, vx: rnd(0.25, 1.1), vy: rnd(-0.7, -0.1), g: -0.006, drag: 0.985, wob: 0.18, life: rnd(45, 85) | 0, c: (t) => (t < 0.1 ? "#ffcd75" : t < 0.22 ? "#ef7d57" : g), fade: true });
    }
    if (e.age % 3 === 0 && e.age < 100) this.ovParts.add({ x: rnd(0, 20), y: rnd(0, 200), vx: rnd(0.6, 1.4), vy: rnd(-0.2, 0.1), life: 90, c: "#2a2a34", fade: true });
  },
  flt_k_ash(e) { return e.age < 3 ? "invert(1)" : e.age < 120 ? "grayscale(.85) brightness(.8)" : ""; },
  ov_k_ash(o, e, W, H) {
    const a = e.age;
    this._back(o, e, W, H, INK, 1, 4, 18);
    if (a < 4) { this._boss(o, "white", this._center().cx, this._center().cy); return; }
    for (const p of e.px) {
      if (p.gone) continue;
      const left = p.t - a;
      o.fillStyle = a < 10 ? p.c : left < 5 ? ((a + p.x) % 3 ? "#ef7d57" : "#ffcd75") : left < 9 && hash(p.x * 3 + p.y) < 0.3 ? "#b13e53" : p.g;
      o.fillRect(p.x, p.y, 1, 1);
    }
  },

  // ================= K.O. : ÉCRASÉ =================
  up_k_stomp(e) {
    if (e.age === 14) {
      const { q, sp } = this._center(), fy = q.y + sp.h, cols = this.art.palList || ["#ffffff"];
      this.ovParts.burst(26, (i) => { const s = i % 2 ? 1 : -1; return { x: e.x + s * rnd(8, 18), y: fy - 1, vx: s * rnd(0.8, 3), vy: rnd(-1.2, -0.2), drag: 0.92, life: rnd(30, 55) | 0, c: i % 3 ? "#9a9aa8" : "#c2c3c7", fade: true, size: 2, grow: 0.06 }; });
      this.ovParts.burst(16, (i) => { const s = i % 2 ? 1 : -1; return { x: e.x + s * 14, y: fy - 2, vx: s * rnd(1.5, 4), vy: rnd(-3, -1), g: 0.2, floor: fy, bounce: 0.3, life: rnd(40, 70) | 0, c: cols[i % cols.length], blink: true }; });
    }
    if (e.age > 60 && e.age < 110 && e.age % 6 === 0) { const { q, sp } = this._center(); this.ovParts.add({ x: e.x + rnd(-10, 10), y: q.y + sp.h - 2, vx: rnd(-0.1, 0.1), vy: -0.3, wob: 0.2, life: 50, c: "#94b0c2", fade: true, size: 2, grow: 0.04 }); }
  },
  flt_k_stomp(e) { return e.age >= 14 && e.age < 16 ? "brightness(1.9) contrast(1.3)" : ""; },
  ov_k_stomp(o, e, W, H) {
    const a = e.age, { q, sp, cx } = this._center(), fy = q.y + sp.h, B = boot();
    this._back(o, e, W, H, INK, 0.55, 4, 14);
    const fade = q4(Math.min(1, (e.life - a) / 14));
    o.save();
    if (a >= 14 && a < 26) o.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
    o.globalAlpha = fade;
    if (a < 14) {
      const k = clamp(a / 14, 0, 1);
      o.globalAlpha = 0.6 * fade; o.fillStyle = INK; o.fillRect(Math.round(cx - 6 - k * 14), fy - 1, Math.round(12 + k * 28), 2); o.globalAlpha = fade;
      o.drawImage(sp.img, q.x + (a % 4 < 2 ? 1 : 0), q.y);
    } else if (a >= 40) {
      const w = Math.round(sp.w * 1.7);
      o.drawImage(sp.img, Math.round(cx - w / 2), fy - 3, w, 3);
      if (a < 110) { o.fillStyle = "#ffcd75"; for (let i = 0; i < 3; i++) { const t = a * 0.15 + (i * Math.PI * 2) / 3; o.fillRect(Math.round(cx + Math.cos(t) * 9), Math.round(fy - 8 + Math.sin(t) * 2), 1, 1); } }
    }
    // la botte : suspendue, puis elle tombe, écrase en tournant, et repart
    let by = null;
    if (a < 10) by = fy - 80 + Math.sin(a * 0.6) * 2;
    else if (a < 14) by = fy - 80 + 77 * ((a - 10) / 4) ** 2;
    else if (a < 40) by = fy - 3;
    else if (a < 56) by = fy - 3 - 120 * ((a - 40) / 16) ** 2;
    if (by != null) {
      const grind = a >= 16 && a < 40 ? [0, 2, 0, -2][(a >> 2) % 4] : 0;
      o.drawImage(B, Math.round(cx - 18 + grind), Math.round(by - B.height + 2));
    }
    o.restore();
  },

  // ================= K.O. : FEU D'ARTIFICE =================
  mk_k_fireworks(x, y) {
    const W = this.OW, H = this.OH;
    return { shells: [
      { at: 30, x: clamp(x, 14, W - 14), y: H * 0.2, c: ["#ff5fd2", "#ffd1e8"] },
      { at: 48, x: W * 0.26, y: H * 0.3, c: [AIR, PAPER] },
      { at: 62, x: W * 0.74, y: H * 0.25, c: ["#ffcd75", "#ef7d57"] },
      { at: 80, x: W * 0.5, y: H * 0.17, c: [PAPER, "#ffcd75", "#ff5fd2", AIR], big: true },
    ] };
  },
  _rocket(e, a) { const { cx, cy } = this._center(), s = e.shells[0], k = clamp((a - 6) / 24, 0, 1) ** 1.6; return { x: cx + (s.x - cx) * k, y: cy + (s.y - cy) * k, k }; },
  up_k_fireworks(e) {
    if (e.age >= 6 && e.age < 30) { const p = this._rocket(e, e.age); this.ovParts.burst(2, () => ({ x: p.x + rnd(-1, 1), y: p.y + 3, vx: rnd(-0.3, 0.3), vy: rnd(0.2, 0.8), g: 0.03, life: rnd(14, 26) | 0, c: SPARK, blink: true })); }
    for (const s of e.shells) {
      if (e.age === s.at) {
        const N = s.big ? 80 : 50;
        this.ovParts.burst(N, (i) => { const a = (i / N) * Math.PI * 2 + rnd(-0.05, 0.05), v = (i % 3 ? rnd(1.6, 2.2) : rnd(0.8, 1.2)) * (s.big ? 1.3 : 1); return { x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.03, drag: 0.955, life: rnd(55, 85) | 0, c: s.c[i % s.c.length], blink: true }; });
        e.flash = 4;
      }
      if (e.age === s.at + 22) this.ovParts.burst(s.big ? 40 : 18, () => ({ x: s.x + rnd(-24, 24), y: s.y + rnd(-18, 26), vy: 0.25, life: rnd(10, 24) | 0, c: PAPER, blink: true }));
    }
    if (e.flash) e.flash--;
  },
  ov_k_fireworks(o, e, W, H) {
    const a = e.age;
    this._back(o, e, W, H, "#0b0d24", 1, 3, 18);
    const fade = q4(Math.min(1, (e.life - a) / 18));
    o.globalAlpha = fade;
    for (let i = 0; i < 34; i++) { if ((a + i * 7) % 40 < 3) continue; o.fillStyle = i % 5 ? "#5a6988" : PAPER; o.fillRect(Math.round(hash(i) * W), Math.round(hash(i + 40) * H * 0.7), 1, 1); }
    o.fillStyle = "#05060f";
    for (let x = 0; x < W; x++) { const h = 6 + Math.round(4 * Math.sin(x * 0.11) + 3 * Math.sin(x * 0.27 + 1)); o.fillRect(x, H - h, 1, h); }
    if (e.flash) { o.globalAlpha = 0.18 * fade; o.fillStyle = PAPER; o.fillRect(0, 0, W, H); o.globalAlpha = fade; }
    const { cx, cy } = this._center();
    if (a < 6) this._boss(o, "white", cx, cy);
    else if (a < 30) { const p = this._rocket(e, a); this._boss(o, "img", p.x, p.y, 1 - p.k * 0.75); }
    o.globalAlpha = 1;
  },

  // ================= K.O. : EXTINCTION =================
  flt_k_crt(e) { return e.age < 12 ? "contrast(1.3) saturate(1.5)" : ""; },
  ov_k_crt(o, e, W, H) {
    const a = e.age, { q, sp, cx, cy } = this._center();
    this._back(o, e, W, H, "#000", 1, 1, 14);
    const fade = q4(Math.min(1, (e.life - a) / 14));
    o.globalAlpha = fade;
    if (a < 12) {
      o.globalAlpha = 0.6; o.drawImage(sp.red, q.x - 1, q.y); o.drawImage(sp.cyan, q.x + 1, q.y); o.globalAlpha = 1;
      o.drawImage(sp.img, q.x, q.y);
      o.globalAlpha = 0.5; o.fillStyle = "#000"; for (let y = 0; y < H; y += 2) o.fillRect(0, y, W, 1);
      o.globalAlpha = 0.15; o.fillStyle = PAPER; o.fillRect(0, (a * 9) % H, W, 6); o.globalAlpha = 1;
      for (let i = 0; i < 80; i++) { o.fillStyle = i % 2 ? PAPER : "#5a6988"; o.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 1, 1); }
    } else if (a < 24) {
      const k = ((a - 12) / 12) ** 2, h = Math.max(2, Math.round(H * (1 - k)));
      o.fillStyle = "#16202c"; o.fillRect(0, Math.round(cy - h / 2), W, h);
      o.drawImage(sp.img, q.x, Math.round(cy - (sp.h * (1 - k)) / 2), sp.w, Math.max(1, Math.round(sp.h * (1 - k))));
      o.globalAlpha = 0.4; o.fillStyle = "#000"; for (let y = Math.round(cy - h / 2); y < cy + h / 2; y += 2) o.fillRect(0, y, W, 1);
      o.globalAlpha = q4(k); o.fillStyle = "#e8fbff"; o.fillRect(0, Math.round(cy - h / 2), W, h); o.globalAlpha = 1;
    } else if (a < 34) {
      const w = Math.max(2, Math.round(W * (1 - (a - 24) / 10)));
      o.fillStyle = AIR; o.globalAlpha = 0.5; o.fillRect(Math.round(cx - w / 2), Math.round(cy) - 1, w, 3); o.globalAlpha = 1;
      o.fillStyle = PAPER; o.fillRect(Math.round(cx - w / 2), Math.round(cy), w, 1);
    } else {
      const k = (a - 34) / 50, r = Math.max(0, 2.5 * (1 - k));
      if (k < 1 && !(k > 0.7 && a % 4 < 2)) { o.fillStyle = AIR; o.globalAlpha = q4(0.5 * (1 - k)); disc(o, cx, cy, r + 2); o.globalAlpha = 1; o.fillStyle = PAPER; disc(o, cx, cy, Math.max(0.5, r)); }
    }
    o.globalAlpha = 1;
  },

  // ================= K.O. : GEL =================
  mk_k_freeze() {
    const W = this.OW, H = this.OH, fr = [];
    const grow = (x, y, a, len, d0, depth) => {
      let px = x, py = y, d = d0;
      for (let l = 0; l < len; l += 3) { const nx = px + Math.cos(a) * 3, ny = py + Math.sin(a) * 3; fr.push([px, py, nx, ny, d, depth]); px = nx; py = ny; d += 3; a += rnd(-0.25, 0.25); if (depth < 1 && Math.random() < 0.3) grow(px, py, a + rnd(0.7, 1.1) * (Math.random() < 0.5 ? 1 : -1), len * 0.4, d, depth + 1); }
    };
    for (let i = 0; i < 5; i++) { grow(((i + hash(i)) / 5) * W, 0, Math.PI / 2 + rnd(-0.4, 0.4), rnd(8, 18), 0, 0); grow(((i + hash(i + 9)) / 5) * W, H, -Math.PI / 2 + rnd(-0.4, 0.4), rnd(8, 18), 0, 0); }
    for (let i = 0; i < 7; i++) { grow(0, ((i + hash(i + 20)) / 7) * H, rnd(-0.4, 0.4), rnd(8, 16), 0, 0); grow(W, ((i + hash(i + 40)) / 7) * H, Math.PI + rnd(-0.4, 0.4), rnd(8, 16), 0, 0); }
    const { q, sp } = this._center(), cells = [];
    for (let y = -3; y < sp.h + 3; y += 3) for (let x = -3; x < sp.w + 3; x += 3) { const p = sp.pixels.find((v) => v.x >= x && v.x < x + 3 && v.y >= y && v.y < y + 3); cells.push({ x: q.x + x + 1, y: q.y + y + 1, c: p ? p.c : Math.random() < 0.5 ? "#bfefff" : "#7fd8f0" }); }
    return { fr, cells, cracks: [] };
  },
  up_k_freeze(e) {
    if (e.age >= 46 && e.age < 56 && e.age % 2 === 0) { const { q, sp } = this._center(); e.cracks.push(zig(q.x - 3 + rnd(0, sp.w + 6), q.y - 3, q.x - 3 + rnd(0, sp.w + 6), q.y + sp.h + 3, 3)); }
    if (e.age === 56) {
      const { cx, cy } = this._center();
      for (const c of e.cells) this.ovParts.add({ x: c.x, y: c.y, vx: (c.x - cx) * 0.09 + rnd(-0.6, 0.6), vy: (c.y - cy) * 0.05 - rnd(1, 2.8), g: 0.16, life: rnd(50, 90) | 0, c: Math.random() < 0.35 ? "#dff6ff" : c.c, size: Math.random() < 0.5 ? 2 : 3, blink: true });
      this.ovParts.burst(30, () => ({ x: cx + rnd(-14, 14), y: cy + rnd(-14, 14), vx: rnd(-1, 1), vy: rnd(-1.5, 0.3), g: 0.05, life: rnd(20, 40) | 0, c: PAPER, blink: true }));
    }
    if (e.age % 4 === 0 && e.age < e.life - 20) this.ovParts.add({ x: rnd(0, this.OW), y: -2, vx: rnd(-0.2, 0.2), vy: rnd(0.3, 0.7), wob: 0.15, life: 200, c: "#dff6ff", alpha: 0.75 });
  },
  flt_k_freeze(e) { return e.age >= 56 && e.age < 58 ? "brightness(2)" : e.age < 120 ? "saturate(.45) hue-rotate(170deg) brightness(.9)" : ""; },
  ov_k_freeze(o, e, W, H) {
    const a = e.age, { q, sp } = this._center();
    this._back(o, e, W, H, "#0b1f33", 0.94, 14, 16);
    const fade = q4(Math.min(1, (e.life - a) / 16));
    o.globalAlpha = fade;
    const reach = Math.min(24, a * 1.4);
    o.globalAlpha = 0.7 * fade;
    for (const [x0, y0, x1, y1, d, dep] of e.fr) if (d <= reach) { o.fillStyle = dep ? "#7fc4e0" : "#dff6ff"; pline(o, x0, y0, x1, y1, 1); }
    o.globalAlpha = fade;
    if (a < 56) {
      o.drawImage(sp.img, q.x, q.y);
      const k = clamp((a - 8) / 10, 0, 1);
      o.globalAlpha = q4(k * 0.7) * fade; o.drawImage(sp.cyan, q.x, q.y); o.globalAlpha = fade;
      if (a >= 18) {
        const x = q.x - 3, y = q.y - 3, w = sp.w + 6, h = sp.h + 6;
        o.globalAlpha = 0.35 * fade; o.fillStyle = "#bfefff"; o.fillRect(x, y, w, h); o.globalAlpha = fade;
        o.fillStyle = PAPER; o.fillRect(x, y, w, 1); o.fillRect(x, y + h - 1, w, 1); o.fillRect(x, y, 1, h); o.fillRect(x + w - 1, y, 1, h);
        o.globalAlpha = 0.6 * fade; pline(o, x + 3, y + 8, x + 8, y + 3, 1); pline(o, x + 3, y + 14, x + 14, y + 3, 1); o.globalAlpha = fade;
        o.fillRect(x + ((a * 2) % w), y, 2, 1);
        o.fillStyle = "#dff6ff"; for (const c of e.cracks) poly(o, c, 1);
      }
    }
    o.globalAlpha = 1;
  },

  // ================= K.O. : ENVOLÉ =================
  mk_k_sky() { return { tx: this.OW - 9, ty: 9, clouds: Array.from({ length: 6 }, (_, i) => [hash(i), 0.2 + hash(i + 5) * 0.7, 3 + hash(i + 9) * 4]) }; },
  up_k_sky(e) { if (e.age === 2) this.ovFx.push({ k: "lines", age: 0, life: 18, x: e.x, y: e.y, delay: 0, col: "#ffffff" }); },
  ov_k_sky(o, e, W, H) {
    const a = e.age, { cx, cy } = this._center();
    if (a < 4) { this._flash(o, W, H, PAPER, 1); this._boss(o, "black", cx, cy); return; }
    const top = ["#3b5dc9", "#41a6f6", "#73eff7"];
    o.globalAlpha = q4(Math.min(1, (e.life - a) / 16));
    for (let i = 0; i < 3; i++) { o.fillStyle = top[i]; o.fillRect(0, Math.round((H * i) / 3), W, Math.ceil(H / 3) + 1); }
    for (let i = 1; i < 3; i++) { const y = Math.round((H * i) / 3); o.fillStyle = top[i - 1]; for (let x = 0; x < W; x += 2) { o.fillRect(x, y, 1, 1); o.fillRect(x + 1, y + 2, 1, 1); } o.fillStyle = top[i]; for (let x = 0; x < W; x += 2) o.fillRect(x + 1, y - 2, 1, 1); }
    o.fillStyle = PAPER;
    for (const [hx, hy, r] of e.clouds) { const x = ((hx * (W + 40) - a * (a < 44 ? 2.5 : 0.3)) % (W + 40) + W + 40) % (W + 40) - 20, y = hy * H; disc(o, x, y, r); disc(o, x + r, y + 1, r * 0.8); disc(o, x - r, y + 1, r * 0.7); }
    if (a < 44) {
      const k = ease((a - 4) / 40), x = cx + (e.tx - cx) * k, y = cy + (e.ty - cy) * k, s = Math.max(0.06, 1 - 0.95 * k);
      o.fillStyle = PAPER;
      for (let i = -1; i <= 1; i++) pline(o, x + i * 3 * s, y + 3, x + (cx - e.tx) * 0.25 * (1 - k) + i * 3, y + (cy - e.ty) * 0.25 * (1 - k) + 3, 1);
      const sp = this.sprite(), w = Math.max(1, sp.w * s), h = Math.max(1, sp.h * s);
      o.save(); o.translate(Math.round(x), Math.round(y)); o.rotate(a * 0.45); o.drawImage(sp.img, -w / 2, -h / 2, w, h); o.restore();
    } else if (a < 76) {
      const L = [0, 3, 6, 4, 7, 5, 3, 6, 2, 4, 1, 3, 0][Math.min(12, (a - 44) >> 1)] ?? 0;
      o.fillStyle = PAPER;
      pline(o, e.tx - L, e.ty, e.tx + L, e.ty, 1); pline(o, e.tx, e.ty - L, e.tx, e.ty + L, 1);
      if (L > 3) { pline(o, e.tx - L / 2, e.ty - L / 2, e.tx + L / 2, e.ty + L / 2, 1); pline(o, e.tx - L / 2, e.ty + L / 2, e.tx + L / 2, e.ty - L / 2, 1); }
      o.fillStyle = "#ffcd75"; o.fillRect(e.tx - 1, e.ty - 1, 3, 3);
    }
    o.globalAlpha = 1;
  },
};
