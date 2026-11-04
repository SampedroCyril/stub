/**
 * Mini-API de dessin sur une grille de lettres, puis rendu pixel art :
 * ombrage automatique (lumière en haut à gauche), contour sombre, silhouette blanche pour les flashs.
 */
export const OUTLINE = "#140c1c";

export function grid(w, h) {
  const d = Array.from({ length: h }, () => Array(w).fill("."));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) d[y][x] = c; };
  const g = {
    w, h, d, set,
    at: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? "." : d[y][x]),
    px(x, y, c) { set(x, y, c); return g; },
    rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c); return g; },
    ellipse(cx, cy, rx, ry, c) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, c);
      }
      return g;
    },
    line(x0, y0, x1, y1, c, t = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
        for (let a = 0; a < t; a++) set(x, y + a, c);
      }
      return g;
    },
    /** Tampon à la main : espace = on garde, "." = on efface. */
    stamp(x, y, rows) { rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== " ") set(x + i, y + j, c); })); return g; },
  };
  return g;
}

export function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  return c;
}

/**
 * pal[lettre] = "#couleur" (aplat) ou { r: [sombre, base, clair], cyl: true }.
 * cyl : ombrage cylindrique par rangée (bord gauche clair, droite sombre).
 */
export function compile(g, pal, { outline = OUTLINE } = {}) {
  const W = g.w + 2, H = g.h + 2, at = g.at;
  const cv = makeCanvas(W, H), ctx = cv.getContext("2d");
  const pixels = [];
  const put = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); pixels.push({ x, y, c }); };
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const L = at(x, y);
    if (L === ".") continue;
    const p = pal[L];
    if (p == null) continue;
    let col;
    if (typeof p === "string") col = p;
    else {
      const [dk, base, lt] = p.r;
      col = base;
      if (p.cyl) {
        // étendue de la lettre sur toute la rangée : les détails (yeux, bouche) ne cassent pas le cylindre
        let a = x, b = x;
        for (let i = 0; i < g.w; i++) if (at(i, y) === L) { a = Math.min(a, i); b = Math.max(b, i); }
        const len = b - a + 1, t = (x - a) / Math.max(1, len - 1);
        if (len >= 5 && t < 0.16) col = lt;
        else if (len >= 5 && t > 0.74) col = dk;
      }
      const edge = p.edge ?? ".";
      const out = (c) => c === "." || (edge !== "." && c !== L);
      if (out(at(x, y + 1)) || out(at(x + 1, y))) col = dk;
      else if (out(at(x, y - 1)) || out(at(x - 1, y))) col = lt;
    }
    put(x + 1, y + 1, col);
  }
  for (let y = -1; y <= g.h; y++) for (let x = -1; x <= g.w; x++) {
    if (at(x, y) !== ".") continue;
    if (at(x + 1, y) !== "." || at(x - 1, y) !== "." || at(x, y + 1) !== "." || at(x, y - 1) !== ".") put(x + 1, y + 1, outline);
  }
  const wh = makeCanvas(W, H), wc = wh.getContext("2d");
  wc.drawImage(cv, 0, 0);
  wc.globalCompositeOperation = "source-in";
  wc.fillStyle = "#fff";
  wc.fillRect(0, 0, W, H);
  return { img: cv, white: wh, pixels, w: W, h: H };
}
