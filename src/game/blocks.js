/**
 * Jeu de blocs (module pur, testé dans tests/blocks.test.js).
 * Grille 10 × 20, 7 pièces, tirage par sac de 7, rotations avec petits décalages contre les murs.
 * L'état est muté en place par les actions (une partie = un objet), ce qui reste simple et rapide.
 */

export const W = 10, H = 20;
export const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
export const COLORS = { I: "#73eff7", O: "#ffcd75", T: "#a76bd1", S: "#a7f070", Z: "#e43b44", J: "#3b5dc9", L: "#ef7d57" };

const BASE = {
  I: { n: 4, c: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 2, c: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { n: 3, c: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, c: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, c: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { n: 3, c: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, c: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

/** Les 4 orientations de chaque pièce (rotation horaire dans sa boîte n × n). */
export const SHAPES = Object.fromEntries(
  TYPES.map((t) => {
    const { n, c } = BASE[t];
    const rots = [c];
    for (let r = 1; r < 4; r++) rots.push(rots[r - 1].map(([x, y]) => [n - 1 - y, x]));
    return [t, rots];
  }),
);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextType(g) {
  if (!g.bag.length) {
    g.bag = [...TYPES];
    for (let i = g.bag.length - 1; i > 0; i--) {
      const j = Math.floor(g.rand() * (i + 1));
      [g.bag[i], g.bag[j]] = [g.bag[j], g.bag[i]];
    }
  }
  return g.bag.pop();
}

export const cellsOf = (p) => SHAPES[p.t][p.r].map(([x, y]) => [p.x + x, p.y + y]);

export function fits(g, p) {
  return cellsOf(p).every(([x, y]) => x >= 0 && x < W && y < H && (y < 0 || !g.grid[y][x]));
}

function spawn(g) {
  const t = g.next;
  g.next = nextType(g);
  g.piece = { t, r: 0, x: t === "O" ? 4 : 3, y: t === "I" ? -1 : 0 };
  if (!fits(g, g.piece)) g.over = true;
}

export function createGame(seed = Date.now()) {
  const g = { grid: Array.from({ length: H }, () => Array(W).fill(null)), bag: [], rand: rng(seed), score: 0, lines: 0, level: 1, over: false, piece: null, next: null };
  g.next = nextType(g);
  spawn(g);
  return g;
}

export const gravityMs = (level) => Math.max(90, 800 - (level - 1) * 70);
const LINE_SCORE = [0, 100, 300, 500, 800];

/** Pose la pièce, efface les lignes pleines. Renvoie le nombre de lignes effacées. */
function lock(g) {
  cellsOf(g.piece).forEach(([x, y]) => { if (y >= 0) g.grid[y][x] = g.piece.t; });
  if (cellsOf(g.piece).some(([, y]) => y < 0)) { g.over = true; return 0; }
  const keep = g.grid.filter((row) => row.some((c) => !c));
  const n = H - keep.length;
  while (keep.length < H) keep.unshift(Array(W).fill(null));
  g.grid = keep;
  if (n) {
    g.lines += n;
    g.score += LINE_SCORE[n] * g.level;
    g.level = 1 + Math.floor(g.lines / 10);
  }
  spawn(g);
  return n;
}

export function move(g, dx) {
  if (g.over) return false;
  const p = { ...g.piece, x: g.piece.x + dx };
  if (!fits(g, p)) return false;
  g.piece = p;
  return true;
}

export function rotate(g, dir = 1) {
  if (g.over || g.piece.t === "O") return false;
  const r = (g.piece.r + dir + 4) % 4;
  for (const dx of [0, -1, 1, -2, 2]) {
    for (const dy of [0, -1]) {
      const p = { ...g.piece, r, x: g.piece.x + dx, y: g.piece.y + dy };
      if (fits(g, p)) { g.piece = p; return true; }
    }
  }
  return false;
}

/** Descend d'une case ; si impossible, pose la pièce. Renvoie {locked, cleared}. */
export function tick(g, soft = false) {
  if (g.over) return { locked: false, cleared: 0 };
  const p = { ...g.piece, y: g.piece.y + 1 };
  if (fits(g, p)) {
    g.piece = p;
    if (soft) g.score += 1;
    return { locked: false, cleared: 0 };
  }
  return { locked: true, cleared: lock(g) };
}

export function hardDrop(g) {
  if (g.over) return { locked: false, cleared: 0 };
  let n = 0;
  while (fits(g, { ...g.piece, y: g.piece.y + 1 })) { g.piece = { ...g.piece, y: g.piece.y + 1 }; n++; }
  g.score += 2 * n;
  return { locked: true, cleared: lock(g) };
}

export function ghostOf(g) {
  let p = g.piece;
  while (fits(g, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
  return p;
}
