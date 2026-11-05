import { grid } from "./sprite.js";

/**
 * Bosses dessinés par code (≈ 32 × 32), avec leurs variantes d'état :
 * s = { blink, hurt, talk, crack (0-3), anger, f (frame d'animation) }
 * L'ombrage et le contour sont ajoutés automatiquement par compile().
 */

const BASE = { e: "#ffffff", k: "#140c1c", w: "#f4f4f4", t: "#b13e53", R: "#e43b44" };

/** Yeux : normaux (pupille + reflet), mi-clos, creux, ou « glitch ». bg = lettre du corps pour arrondir les coins. */
function eyes(g, s, { lx, rx, y, w = 4, h = 4, bg, kind = "normal", look = 1 }) {
  if (s.hurt) {
    g.line(lx, y, lx + w - 1, y + 1, "k").line(lx + w - 1, y + 1, lx, y + 3, "k");
    g.line(rx + w - 1, y, rx, y + 1, "k").line(rx, y + 1, rx + w - 1, y + 3, "k");
    return;
  }
  if (s.blink) { g.rect(lx, y + 2, w, 1, "k").rect(rx, y + 2, w, 1, "k"); return; }
  for (const x of [lx, rx]) {
    if (kind === "hollow") {
      g.rect(x, y, w, h, "k").px(x, y, bg).px(x + w - 1, y, bg);
      g.px(x + (x === lx ? w - 2 : 1), y + 2, "R");
      continue;
    }
    if (kind === "glitch") {
      g.rect(x, y, w, h, "G").rect(x + 1, y + 1, w - 2, h - 2, "k");
      if ((s.f >> 1) % 3 === 0) g.rect(x - 1, y + 1, w + 2, 1, "G");
      continue;
    }
    g.rect(x, y, w, h, "e").px(x, y, bg).px(x + w - 1, y, bg).px(x, y + h - 1, bg).px(x + w - 1, y + h - 1, bg);
    const px = x === lx ? x + w - 1 - look : x + look - 1;
    g.rect(px, y + h - 3, 2, 2, "k").px(px, y + h - 3, "w");
    if (kind === "sleepy") g.rect(x, y, w, Math.ceil(h / 2), bg).rect(x, y + Math.ceil(h / 2) - 1, w, 1, "k");
  }
}
/** Sourcils : en colère (vers le centre) ou tristes (vers l'extérieur). */
function brows(g, { lx, rx, y, w = 4, kind = "angry" }) {
  if (kind === "angry") { g.line(lx - 1, y, lx + w, y + 2, "k").line(lx, y, lx + w, y + 1, "k"); g.line(rx + w, y, rx - 1, y + 2, "k").line(rx + w - 1, y, rx - 1, y + 1, "k"); }
  if (kind === "sad") { g.line(lx - 1, y + 2, lx + w, y, "k"); g.line(rx + w, y + 2, rx - 1, y, "k"); }
}
/** Bouche : dents, sourire carnassier, trait, ou zigzag ; s'ouvre quand il parle, se tord quand il prend un coup. */
function mouth(g, s, { x, y, w = 10, kind = "teeth" }) {
  const cx = x + w / 2;
  if (s.hurt) { g.ellipse(cx, y + 2, Math.max(2.6, w / 3), 2.6, "k").rect(Math.round(cx) - 2, y + 2, 4, 1, "t"); return; }
  if (s.talk) {
    g.rect(x, y, w, 5, "k").rect(x + 2, y + 3, w - 4, 2, "t");
    for (let i = x + 1; i < x + w - 1; i += 2) g.px(i, y, "w");
    return;
  }
  if (kind === "teeth") { g.rect(x, y + 1, w, 3, "k"); for (let i = x + 1; i < x + w - 1; i += 2) g.px(i, y + 1, "w"); g.px(x + 2, y + 3, "w").px(x + w - 3, y + 3, "w"); }
  if (kind === "grin") { g.line(x, y, x + 2, y + 2, "k").rect(x + 2, y + 2, w - 4, 2, "k").line(x + w - 3, y + 2, x + w - 1, y, "k"); for (let i = x + 3; i < x + w - 3; i += 2) g.px(i, y + 2, "w"); }
  if (kind === "flat") g.rect(x + 1, y + 2, w - 2, 1, "k");
  if (kind === "zigzag") for (let i = 0; i < w; i++) g.px(x + i, y + 1 + (i % 2), "k");
}
/** Fissures progressives (listes de segments par niveau). */
function cracks(g, s, levels) {
  levels.forEach((segs, i) => { if (s.crack > i) segs.forEach(([a, b, c, d]) => g.line(a, b, c, d, "k")); });
}
/** Veine de colère façon manga. */
const vein = (g, s, x, y) => { if (s.anger) g.stamp(x, y, [" R R", "RR RR", "", "RR RR", " R R"]); };

export const BOSS_ART = {
  // ---------- Le Café Maudit ----------
  cafe: {
    pal: {
      ...BASE,
      m: { r: ["#9aa3bf", "#e9edf6", "#ffffff"], cyl: true },
      h: { r: ["#9aa3bf", "#e9edf6", "#ffffff"] },
      c: { r: ["#3b1f12", "#6b3a1f", "#9a5a32"] },
      v: "#c98c5a",
      s: { r: ["#333c57", "#566c86", "#94b0c2"] },
    },
    steam: { x: 16, y: 7, c: "#dfe4ee", angry: "#e8a0a0" },
    weakZone: { x0: 8, x1: 24, y0: 12, y1: 24 },
    draw(s) {
      const g = grid(32, 31);
      g.ellipse(15.5, 27.6, 14, 2.6, "s");
      g.ellipse(26, 17, 4.6, 5.6, "h").ellipse(26, 17, 2.1, 3.1, ".");
      g.rect(6, 9, 19, 17, "m").px(6, 25, ".").px(24, 25, ".");
      g.ellipse(15.5, 9.5, 9.6, 2.6, "m");
      g.ellipse(15.5, 9.4, 7.8, 1.6, "c");
      g.px(9 + ((s.f >> 1) % 5) * 2, 9, "v").px(10 + ((s.f >> 1) % 5) * 2, 9, "v");
      eyes(g, s, { lx: 9, rx: 19, y: 13, bg: "m" });
      brows(g, { lx: 9, rx: 19, y: 11 });
      mouth(g, s, { x: 11, y: 19 });
      cracks(g, s, [[[21, 18, 23, 21], [23, 21, 22, 24]], [[8, 18, 10, 21], [10, 21, 9, 23]], [[14, 24, 16, 22], [16, 22, 17, 25]]]);
      if (s.crack >= 3) g.px(19, 7, ".").px(20, 7, ".").px(20, 8, ".");
      vein(g, s, 24, 2);
      return g;
    },
  },

  // ---------- Le Spectre de 2h du mat' ----------
  spectre: {
    pal: { ...BASE, g: { r: ["#8b8fc9", "#d8d4ff", "#ffffff"], cyl: true }, y: "#ffcd75", o: "#ef7d57", p: "#f4f4f4" },
    steam: { x: 29, y: 9, c: "#c9c2e8", angry: "#e8a0c0" },
    weakZone: { x0: 7, x1: 22, y0: 8, y1: 22 },
    draw(s) {
      const g = grid(32, 31);
      const wave = (s.f >> 1) % 2;
      g.ellipse(15, 11, 10.5, 10, "g");
      g.rect(5, 11, 21, 14, "g");
      for (let i = 0; i < 5; i++) { const x = 5 + i * 4 + wave; g.rect(x, 25, 3, 2 + ((i + wave) % 2) * 2, "g"); }
      g.rect(25, 13, 2, 3, "g").rect(26, 11, 2, 3, "g");
      // cigarette tenue au bout du bras
      g.rect(27, 10, 1, 3, "o").rect(27, 7, 1, 3, "p").px(27, 6, s.f % 2 ? "y" : "o");
      eyes(g, s, { lx: 9, rx: 17, y: 9, w: 4, h: 5, bg: "g", kind: "hollow" });
      mouth(g, s, { x: 10, y: 17, w: 8, kind: s.anger ? "teeth" : "zigzag" });
      cracks(g, s, [[[20, 15, 22, 19]], [[7, 13, 9, 17], [9, 17, 8, 20]], [[13, 21, 15, 24]]]);
      vein(g, s, 1, 1);
      return g;
    },
  },

  // ---------- L'Ennui Éternel ----------
  ennui: {
    pal: { ...BASE, n: { r: ["#566c86", "#94b0c2", "#c2d3df"] }, d: "#566c86" },
    steam: { x: 24, y: 5, c: "#94b0c2", angry: "#c88aa0" },
    weakZone: { x0: 6, x1: 25, y0: 10, y1: 24 },
    draw(s) {
      const g = grid(32, 31);
      g.ellipse(16, 19, 14, 11, "n");
      g.ellipse(10, 11, 6, 5, "n").ellipse(21, 10, 7, 6, "n");
      g.rect(3, 26, 26, 3, "n");
      eyes(g, s, { lx: 9, rx: 19, y: 14, w: 4, h: 4, bg: "n", kind: "sleepy" });
      brows(g, { lx: 9, rx: 19, y: 12, kind: s.anger ? "angry" : "sad" });
      if (!s.hurt && !s.talk && (s.f >> 3) % 3 === 0) g.ellipse(16, 22.5, 3, 2.5, "k").rect(15, 23, 2, 1, "t");
      else mouth(g, s, { x: 11, y: 20, w: 10, kind: "flat" });
      cracks(g, s, [[[24, 16, 26, 20]], [[5, 17, 7, 21], [7, 21, 6, 24]], [[14, 25, 16, 28]]]);
      vein(g, s, 26, 3);
      return g;
    },
  },

  // ---------- Le Repas Traître (burger) ----------
  repas: {
    pal: {
      ...BASE,
      b: { r: ["#a85a2a", "#e0913f", "#f6c27a"] },
      l: { r: ["#257146", "#38b764", "#a7f070"] },
      c: "#ffcd75",
      p: { r: ["#3b1f12", "#73472b", "#9a5a32"] },
      z: "#f4f4f4",
    },
    steam: { x: 16, y: 4, c: "#dfe4ee", angry: "#e8a0a0" },
    weakZone: { x0: 7, x1: 25, y0: 7, y1: 22 },
    draw(s) {
      const g = grid(32, 31);
      g.ellipse(16, 11, 13, 8, "b").rect(3, 11, 26, 5, "b");
      [[9, 6], [14, 5], [20, 6], [12, 8], [18, 8], [23, 9]].forEach(([x, y]) => g.px(x, y, "z"));
      g.rect(2, 16, 28, 2, "l");
      for (let i = 0; i < 7; i++) g.px(3 + i * 4, 18, "l").px(4 + i * 4, 18, "l");
      g.rect(4, 18, 24, 1, "c").px(8, 19, "c").px(9, 20, "c").px(20, 19, "c").px(21, 20, "c");
      g.rect(3, 19, 26, 4, "p");
      g.ellipse(16, 25, 13, 3.4, "b").rect(4, 23, 24, 2, "b");
      eyes(g, s, { lx: 9, rx: 19, y: 9, w: 4, h: 4, bg: "b" });
      brows(g, { lx: 9, rx: 19, y: 7 });
      mouth(g, s, { x: 10, y: 19, w: 12, kind: "grin" });
      cracks(g, s, [[[25, 10, 27, 14]], [[5, 10, 7, 13]], [[13, 24, 15, 27], [18, 24, 19, 27]]]);
      vein(g, s, 26, 1);
      return g;
    },
  },

  // ---------- Le Démon du Stress ----------
  stress: {
    pal: { ...BASE, r: { r: ["#7a1d34", "#c42d43", "#ff6b70"] }, h: { r: ["#8a8a96", "#e8e8ee", "#ffffff"] }, y: "#ffcd75", s: "#73eff7" },
    steam: { x: 16, y: 3, c: "#ff9a8a", angry: "#ff5050" },
    weakZone: { x0: 7, x1: 24, y0: 10, y1: 24 },
    draw(s) {
      const g = grid(32, 31);
      g.ellipse(16, 18, 12, 12, "r");
      for (let i = 0; i < 6; i++) g.px(5 + i * 4, 28 + (i % 2), "r").px(6 + i * 4, 28, "r");
      g.line(6, 9, 3, 2, "h").line(7, 9, 4, 3, "h").line(26, 9, 29, 2, "h").line(25, 9, 28, 3, "h");
      eyes(g, s, { lx: 9, rx: 19, y: 13, w: 4, h: 4, bg: "r", look: 2 });
      g.rect(10, 14, 2, 2, s.hurt || s.blink ? "k" : "y");
      brows(g, { lx: 9, rx: 19, y: 11 });
      mouth(g, s, { x: 10, y: 20, w: 12, kind: "teeth" });
      if ((s.f >> 2) % 2) g.px(26, 12, "s").px(26, 13, "s").px(27, 14, "s");
      cracks(g, s, [[[22, 20, 24, 24]], [[7, 16, 9, 20]], [[14, 25, 17, 28]]]);
      vein(g, s, 25, 4);
      return g;
    },
  },

  // ---------- La Pinte Perfide ----------
  alcool: {
    pal: { ...BASE, a: { r: ["#c48a1f", "#f2b33d", "#ffe07a"], cyl: true }, f: { r: ["#c2c3c7", "#ffffff", "#ffffff"] }, h: { r: ["#94b0c2", "#c2d3df", "#ffffff"] }, u: "#fff3c4" },
    steam: { x: 15, y: 9, c: "#fff3c4", angry: "#ffd0a0" },
    weakZone: { x0: 7, x1: 22, y0: 12, y1: 26 },
    draw(s) {
      const g = grid(32, 31);
      g.ellipse(25, 18, 4.6, 6.6, "h").ellipse(25, 18, 2.2, 4, ".");
      g.rect(5, 9, 18, 20, "a").px(5, 28, ".").px(22, 28, ".");
      g.ellipse(13.5, 8, 10, 3.6, "f").ellipse(8, 6.5, 3.2, 2.6, "f").ellipse(15, 5.5, 4, 2.8, "f").ellipse(20, 6.8, 3, 2.4, "f");
      g.rect(6, 10, 1, 17, "h");
      [[9, 24], [17, 22], [12, 26], [19, 15]].forEach(([x, y], i) => g.px(x, y - ((s.f + i * 3) % 8), "u"));
      eyes(g, s, { lx: 8, rx: 16, y: 13, w: 4, h: 4, bg: "a" });
      brows(g, { lx: 8, rx: 16, y: 11 });
      mouth(g, s, { x: 9, y: 19, w: 10, kind: "grin" });
      cracks(g, s, [[[19, 16, 21, 20]], [[7, 19, 9, 23]], [[12, 24, 14, 28]]]);
      vein(g, s, 25, 1);
      return g;
    },
  },

  // ---------- Le Glitch (téléphone) ----------
  ecran: {
    pal: { ...BASE, c: { r: ["#1a1c2c", "#333c57", "#566c86"] }, x: "#29366f", G: "#73eff7", n: "#e43b44" },
    steam: null,
    weakZone: { x0: 9, x1: 22, y0: 7, y1: 24 },
    draw(s) {
      const g = grid(32, 31);
      g.rect(7, 2, 18, 28, "c").px(7, 2, ".").px(24, 2, ".").px(7, 29, ".").px(24, 29, ".");
      g.rect(9, 5, 14, 21, "x");
      g.rect(13, 3, 6, 1, "k").rect(14, 27, 4, 1, "k");
      g.ellipse(24, 4, 2.6, 2.6, "n");
      const gl = (s.f >> 1) % 4 === 0 || s.hurt;
      if (gl) g.rect(9, 9 + (s.f % 6), 14, 1, "G").rect(9, 18 - (s.f % 4), 14, 1, "G");
      eyes(g, s, { lx: 11, rx: 18, y: 9, w: 3, h: 4, bg: "x", kind: "glitch" });
      if (s.hurt) g.rect(12, 18, 8, 2, "G");
      else if (s.talk) g.rect(12, 17, 8, 4, "G").rect(13, 18, 6, 2, "k");
      else for (let i = 0; i < 8; i++) g.px(12 + i, 18 + (i % 2), "G");
      cracks(g, s, [[[20, 7, 22, 11], [22, 11, 21, 13]], [[10, 14, 13, 16], [13, 16, 12, 19]], [[15, 21, 18, 24], [18, 24, 21, 22]]]);
      vein(g, s, 26, 8);
      return g;
    },
  },

  // ---------- Le Réveil Grognon ----------
  reveil: {
    pal: { ...BASE, r: { r: ["#7a1d34", "#e43b44", "#ff8a8a"] }, b: { r: ["#c48a1f", "#ffcd75", "#fff3c4"] }, f: { r: ["#c2c3c7", "#f4f4f4", "#ffffff"] } },
    steam: null,
    weakZone: { x0: 8, x1: 24, y0: 10, y1: 24 },
    draw(s) {
      const g = grid(32, 31);
      const ring = s.anger && s.f % 2 ? 1 : 0;
      g.ellipse(7 - ring, 5, 4.4, 3.6, "b").ellipse(25 + ring, 5, 4.4, 3.6, "b");
      g.rect(15, 2, 2, 3, "k");
      g.ellipse(16, 16, 12.5, 12, "r");
      g.ellipse(16, 16, 9.5, 9, "f");
      g.line(8, 26, 6, 30, "r").line(24, 26, 26, 30, "r").rect(4, 29, 4, 1, "r").rect(25, 29, 4, 1, "r");
      g.px(16, 8, "k").px(16, 24, "k").px(8, 16, "k").px(24, 16, "k");
      eyes(g, s, { lx: 10, rx: 18, y: 12, w: 4, h: 4, bg: "f" });
      // aiguilles en guise de sourcils
      g.line(9, 10, 14, 12, "k").line(23, 10, 18, 12, "k");
      mouth(g, s, { x: 11, y: 18, w: 10, kind: "teeth" });
      cracks(g, s, [[[21, 9, 23, 13]], [[8, 19, 11, 21]], [[14, 24, 17, 27]]]);
      vein(g, s, 26, 9);
      return g;
    },
  },

  // ---------- Le Paquet Copain ----------
  potes: {
    pal: { ...BASE, p: { r: ["#7a1d34", "#c42d43", "#ff6b70"], cyl: true }, l: { r: ["#c2c3c7", "#f4f4f4", "#ffffff"] }, o: "#ef7d57", y: "#ffcd75" },
    steam: { x: 13, y: 2, c: "#dfe4ee", angry: "#e8a0a0" },
    weakZone: { x0: 7, x1: 24, y0: 12, y1: 26 },
    draw(s) {
      const g = grid(32, 31);
      g.rect(9, 3, 3, 7, "l").rect(9, 2, 3, 2, "o");
      g.rect(14, 1, 3, 9, "l").rect(14, 0, 3, 2, "o");
      g.rect(19, 4, 3, 6, "l").rect(19, 3, 3, 2, "o");
      g.rect(5, 8, 22, 22, "p").px(5, 29, ".").px(26, 29, ".");
      g.rect(5, 8, 22, 3, "l");
      g.rect(8, 23, 16, 4, "l").rect(9, 24, 14, 2, "k");
      eyes(g, s, { lx: 9, rx: 18, y: 13, w: 4, h: 4, bg: "p" });
      if (!s.hurt && !s.blink && (s.f >> 3) % 3 === 1) g.rect(18, 13, 4, 4, "p").rect(18, 15, 4, 1, "k");
      mouth(g, s, { x: 10, y: 18, w: 12, kind: "grin" });
      cracks(g, s, [[[22, 12, 24, 16]], [[7, 16, 9, 20]], [[14, 27, 16, 29]]]);
      vein(g, s, 26, 2);
      return g;
    },
  },

  // ---------- Le Zombie Pâteux ----------
  fatigue: {
    pal: { ...BASE, z: { r: ["#3f6f3a", "#7fa05a", "#b4d084"] }, d: "#4f6b3a", u: "#5d275d", b: "#94b0c2", h: "#3b1f12" },
    steam: null,
    weakZone: { x0: 7, x1: 24, y0: 10, y1: 24 },
    draw(s) {
      const g = grid(32, 31);
      g.ellipse(16, 15, 12, 12.5, "z");
      g.rect(8, 24, 16, 6, "z");
      g.rect(6, 4, 20, 3, "h").px(8, 7, "h").px(13, 7, "h").px(20, 7, "h").px(24, 7, "h");
      g.line(19, 5, 22, 9, "k").px(20, 6, "w").px(21, 8, "w");
      eyes(g, s, { lx: 9, rx: 18, y: 12, w: 4, h: 4, bg: "z", kind: "sleepy" });
      if (!s.blink && !s.hurt) g.rect(9, 16, 4, 1, "u").rect(18, 16, 4, 1, "u");
      mouth(g, s, { x: 11, y: 19, w: 10, kind: "zigzag" });
      if (!s.hurt && !s.talk) g.px(19, 21, "b").px(19, 22 + ((s.f >> 1) % 3), "b");
      cracks(g, s, [[[22, 12, 24, 16]], [[7, 18, 9, 22]], [[14, 24, 16, 28]]]);
      vein(g, s, 25, 1);
      return g;
    },
  },

  // ---------- Clopinette ----------
  clope: {
    pal: { ...BASE, p: { r: ["#a8adbd", "#f4f4f4", "#ffffff"], cyl: true }, f: { r: ["#a85428", "#e07a3e", "#f6a96e"], cyl: true }, g: "#ffcd75", a: "#8b8794", y: "#ffcd75", o: "#ef7d57" },
    steam: { x: 16, y: 1, c: "#dfe4ee", angry: "#e8a0a0" },
    weakZone: { x0: 11, x1: 21, y0: 7, y1: 20 },
    draw(s) {
      const g = grid(32, 31);
      g.rect(10, 3, 12, 18, "p");
      g.rect(10, 20, 12, 1, "g");
      g.rect(10, 21, 12, 9, "f");
      [[12, 23], [16, 25], [19, 22], [13, 27], [18, 28]].forEach(([x, y]) => g.px(x, y, "o"));
      g.rect(10, 2, 12, 2, "a");
      g.rect(11, 1, 10, 1, s.f % 2 ? "y" : "o").px(13, 0, "y").px(18, 0, s.f % 3 ? "o" : "y");
      // petits bras
      g.line(9, 12, 6, 15, "p").line(22, 12, 25, 9 + (s.talk ? 0 : 2), "p");
      eyes(g, s, { lx: 11, rx: 17, y: 7, w: 4, h: 4, bg: "p" });
      brows(g, { lx: 11, rx: 17, y: 5 });
      mouth(g, s, { x: 12, y: 13, w: 8, kind: "grin" });
      cracks(g, s, [[[19, 9, 21, 13]], [[11, 14, 13, 18]], [[14, 22, 16, 26]]]);
      vein(g, s, 23, 2);
      return g;
    },
  },
};
