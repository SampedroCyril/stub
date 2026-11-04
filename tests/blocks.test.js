import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, move, rotate, tick, hardDrop, fits, cellsOf, SHAPES, TYPES, W, H } from "../src/game/blocks.js";

test("chaque pièce a 4 cases dans chaque orientation", () => {
  TYPES.forEach((t) => SHAPES[t].forEach((r) => assert.equal(r.length, 4)));
});

test("tirage par sac : les 7 pièces sortent avant toute répétition", () => {
  const g = createGame(42);
  const seen = [g.piece.t];
  for (let i = 0; i < 6; i++) { hardDrop(g); seen.push(g.piece.t); }
  assert.equal(new Set(seen).size, 7);
});

test("déplacements bloqués par les murs", () => {
  const g = createGame(1);
  for (let i = 0; i < 20; i++) move(g, -1);
  assert.ok(cellsOf(g.piece).some(([x]) => x === 0));
  assert.equal(move(g, -1), false);
});

test("la rotation reste dans la grille, même collée au mur", () => {
  const g = createGame(3);
  for (let i = 0; i < 20; i++) move(g, 1);
  for (let i = 0; i < 4; i++) { rotate(g); assert.ok(fits(g, g.piece)); }
});

test("une ligne pleine est effacée et rapporte des points", () => {
  const g = createGame(7);
  for (let x = 0; x < W - 1; x++) g.grid[H - 1][x] = "J";
  g.piece = { t: "I", r: 1, x: W - 3, y: 0 }; // I vertical dans la dernière colonne
  const r = hardDrop(g);
  assert.equal(r.cleared, 1);
  assert.equal(g.lines, 1);
  assert.ok(g.score >= 100);
  assert.ok(g.grid[H - 1].filter(Boolean).length < W);
});

test("4 lignes d'un coup", () => {
  const g = createGame(9);
  for (let y = H - 4; y < H; y++) for (let x = 0; x < W - 1; x++) g.grid[y][x] = "L";
  g.piece = { t: "I", r: 1, x: W - 3, y: 0 };
  assert.equal(hardDrop(g).cleared, 4);
  assert.equal(g.score, 800 + 2 * (H - 4));
});

test("la gravité finit par poser la pièce", () => {
  const g = createGame(5);
  let locked = false;
  for (let i = 0; i < 30 && !locked; i++) locked = tick(g).locked;
  assert.ok(locked);
});

test("fin de partie quand la pile atteint le haut", () => {
  const g = createGame(11);
  for (let i = 0; i < 200 && !g.over; i++) hardDrop(g);
  assert.ok(g.over);
});
