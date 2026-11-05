import { rnd } from "./particles.js";

/** Couleurs des images d'impact : encre, sang, papier, air (le refus). */
export const INK = "#0a0006", BLOOD = "#ff1f3d", PAPER = "#f4f4f4", AIR = "#3ae0ff";

/** Trace une ligne de gros pixels (taille s) dans un buffer. */
export function pline(c, x0, y0, x1, y1, s = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1;
  const o = (s / 2) | 0;
  for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, s, s);
}
/** Éclairs zigzag partant d'un point, avec quelques branches. */
export function bolts(x, y, n, reach) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(-0.3, 0.3);
    const len = rnd(reach * 0.5, reach);
    const pts = [[x, y]];
    let d = 0;
    while (d < len) {
      d += rnd(3, 7);
      const j = rnd(-3.5, 3.5);
      pts.push([x + Math.cos(a) * d - Math.sin(a) * j, y + Math.sin(a) * d + Math.cos(a) * j]);
      if (Math.random() < 0.12 && d > 8) {
        const b = a + rnd(-0.9, 0.9), [bx, by] = pts[pts.length - 1], br = [[bx, by]];
        for (let e = 0; e < rnd(8, 22); e += rnd(3, 6)) br.push([bx + Math.cos(b) * e + rnd(-2, 2), by + Math.sin(b) * e + rnd(-2, 2)]);
        out.push({ pts: br, thin: true });
      }
    }
    out.push({ pts });
  }
  return out;
}

/** Couleur hexadécimale → [r, g, b]. */
export const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Hasard reproductible (bruit de pinceau, motifs fixes d'une image à l'autre). */
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Disque plein en lignes de pixels. */
export function disc(c, x, y, r) {
  for (let dy = -Math.floor(r); dy <= r; dy++) { const dx = Math.sqrt(Math.max(0, r * r - dy * dy)); c.fillRect(Math.round(x - dx), Math.round(y + dy), Math.max(1, Math.round(dx * 2)), 1); }
}
/** Cercle en pixels (contour). */
export function circle(c, x, y, r, s = 1) {
  const n = Math.max(12, Math.round(r * 6.3));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; c.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), s, s); }
}
