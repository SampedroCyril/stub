import { OUTLINE } from "./sprite.js";

/** Teintes [clair, moyen, sombre] des parties d'une cigarette. */
export const C = {
  paper: ["#ffffff", "#e4e6ee", "#a8adbd"],
  filter: ["#f6a96e", "#e07a3e", "#a85428"],
  filterDot: ["#e8925a", "#c4662e", "#8e4420"],
  gold: ["#fff0b0", "#ffcd75", "#c9963a"],
  ash: ["#c4bfcc", "#8b8794", "#5d5866"],
  burnt: ["#4a4250", "#2b2530", "#1a1520"],
  ember: [["#fff6c8", "#ffcd75", "#ef7d57"], ["#ffcd75", "#ef7d57", "#b13e53"], ["#ef7d57", "#b13e53", "#5d275d"], ["#b13e53", "#5d275d", "#2b2530"]],
};
const dim = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = (r + g + b) / 3;
  const f = (v) => Math.round((v * (1 - k) + m * k) * (1 - k * 0.35));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
export const old = (spec) => spec.map((t) => t.map((c) => dim(c, 0.55)));

/** Couleurs le long d'une cigarette, du bout incandescent (index 0) au filtre. */
export function cigSpec({ ember = 0, ash = 2, paper = 11, filter = 6, burnt = 0 }) {
  const s = [];
  for (let i = 0; i < burnt; i++) s.push(C.burnt);
  if (ember >= 0 && ember < 4) { s.push(C.ember[ember]); if (ember < 2) s.push(C.ember[ember + 1]); }
  for (let i = 0; i < ash; i++) s.push(C.ash);
  for (let i = 0; i < paper; i++) s.push(C.paper);
  s.push(C.gold);
  for (let i = 0; i < filter; i++) s.push(i % 2 === 1 && i < filter - 1 ? C.filterDot : C.filter);
  return s;
}

/** Points d'une ligne droite, un par pixel de longueur (angle positif = vers le haut). */
export function linePts(x, y, ang, n) {
  const p = [];
  for (let i = 0; i < n; i++) p.push([x + Math.cos(ang) * i, y - Math.sin(ang) * i, ang]);
  return p;
}

/** Trace un bâton de 3 pixels d'épaisseur le long d'une polyligne, avec contour, quel que soit l'angle. */
export function drawStick(c, pts, spec, { outline = OUTLINE } = {}) {
  const across = (x, y, a, k) => [Math.round(x - Math.sin(a) * k), Math.round(y - Math.cos(a) * k)];
  c.fillStyle = outline;
  const ends = pts.length ? [[...pts[0]], [...pts[pts.length - 1]]] : [];
  if (pts.length > 1) {
    const [x0, y0, a0] = pts[0], [x1, y1, a1] = pts[pts.length - 1];
    ends[0] = [x0 - Math.cos(a0), y0 + Math.sin(a0), a0];
    ends[1] = [x1 + Math.cos(a1), y1 - Math.sin(a1), a1];
  }
  for (const [x, y, a] of [...pts, ...ends]) for (let k = -2; k <= 2; k++) { const [px, py] = across(x, y, a, k); c.fillRect(px, py, 1, 1); }
  // sous-échantillonnage pour ne pas laisser de trous dans les diagonales
  for (let i = 0; i < pts.length; i++) {
    const col = spec[Math.min(i, spec.length - 1)];
    const [x, y, a] = pts[i];
    const nx = i + 1 < pts.length ? pts[i + 1] : null;
    for (const t of nx ? [0, 0.5] : [0]) {
      const sx = nx ? x + (nx[0] - x) * t : x, sy = nx ? y + (nx[1] - y) * t : y;
      for (let k = -1; k <= 1; k++) { const [px, py] = across(sx, sy, a, k); c.fillStyle = col[k + 1]; c.fillRect(px, py, 1, 1); }
    }
  }
}
