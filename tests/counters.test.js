/**
 * Tests du coach caméra sur des trajectoires synthétiques :
 * on réutilise les poses des illustrations (repère 160 × 120) comme squelettes MediaPipe,
 * on interpole entre position haute et basse, et on vérifie le nombre de reps comptées.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCounter, angle } from "../src/pose/counters.js";
import { POSE, stand } from "../src/art/poses.js";

const W = 160, H = 120, ASPECT = W / H;

/** Pose dessinée → 33 landmarks normalisés. Côté proche = gauche (11, 13…), éloigné = droite. */
function toLandmarks(p, { farVis = 1 } = {}) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const set = (i, q, v = 1) => (lm[i] = { x: q[0] / W, y: q[1] / H, visibility: v });
  set(0, p.h);
  set(11, p.n); set(13, p.a[0]); set(15, p.a[1]); set(23, p.p); set(25, p.l[0]); set(27, p.l[1]);
  set(12, p.n, farVis); set(14, p.A[0], farVis); set(16, p.A[1], farVis); set(24, p.p, farVis); set(26, p.L[0], farVis); set(28, p.L[1], farVis);
  return lm;
}

const lerpPose = (a, b, k) => {
  const L = (x, y) => [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k];
  return { h: L(a.h, b.h), n: L(a.n, b.n), p: L(a.p, b.p), a: a.a.map((q, i) => L(q, b.a[i])), A: a.A.map((q, i) => L(q, b.A[i])), l: a.l.slice(0, 2).map((q, i) => L(q, b.l[i])), L: a.L.slice(0, 2).map((q, i) => L(q, b.L[i])) };
};

/** Joue `reps` allers-retours rest → active → rest, `frames` images par trajet à 30 i/s. */
function play(exId, rest, active, { reps = 5, frames = 20, hold = 6, depth = 1, farVis = 1, msPerFrame = 33 } = {}) {
  const c = createCounter(exId);
  let t = 0, snap;
  const feed = (p) => { snap = c.update(toLandmarks(p, { farVis }), t, ASPECT); t += msPerFrame; };
  for (let i = 0; i < 10; i++) feed(rest);
  for (let r = 0; r < reps; r++) {
    for (let f = 1; f <= frames; f++) feed(lerpPose(rest, active, (f / frames) * depth));
    for (let f = 0; f < hold; f++) feed(lerpPose(rest, active, depth));
    for (let f = frames - 1; f >= 0; f--) feed(lerpPose(rest, active, (f / frames) * depth));
    for (let f = 0; f < hold; f++) feed(rest);
  }
  return snap;
}

test("angle() : angle droit et angle plat", () => {
  assert.equal(Math.round(angle([0, 1], [0, 0], [1, 0])), 90);
  assert.equal(Math.round(angle([-1, 0], [0, 0], [1, 0])), 180);
});

test("squats : 8 reps complètes → 8", () => {
  assert.equal(play("squats", stand(80), POSE.squat, { reps: 8 }).count, 8);
});

test("squats : demi-squats → 0 rep et un conseil de profondeur", () => {
  const c = createCounter("squats");
  let t = 0, last, sawTip = false;
  const feed = (p) => { last = c.update(toLandmarks(p), t, ASPECT); t += 33; if (last.feedback && /plus bas/.test(last.feedback)) sawTip = true; };
  for (let i = 0; i < 10; i++) feed(stand(80));
  for (let r = 0; r < 4; r++) {
    for (let f = 1; f <= 20; f++) feed(lerpPose(stand(80), POSE.squat, (f / 20) * 0.6));
    for (let f = 19; f >= 0; f--) feed(lerpPose(stand(80), POSE.squat, (f / 20) * 0.6));
  }
  assert.equal(last.count, 0);
  assert.ok(sawTip, "un conseil « descends plus bas » doit apparaître");
});

test("squats lents : descente rapide refusée, descente de 3 s comptée", () => {
  assert.equal(play("squats_lents", stand(80), POSE.squat, { reps: 4, frames: 12 }).count, 0);
  assert.equal(play("squats_lents", stand(80), POSE.squat, { reps: 4, frames: 90 }).count, 4);
});

test("fentes : 6 reps → 6", () => {
  assert.equal(play("fentes", stand(80), POSE.lunge, { reps: 6 }).count, 6);
});

test("pompes : 10 reps → 10", () => {
  assert.equal(play("pompes", POSE.pushTop, POSE.pushLow, { reps: 10 }).count, 10);
});

test("pompes debout (bras qui plient sans être en planche) → 0", () => {
  const armsBent = { ...stand(80), a: [[90, 38], [84, 26]], A: [[70, 38], [76, 26]] };
  assert.equal(play("pompes", stand(80), armsBent, { reps: 5 }).count, 0);
});

test("dips : 7 reps → 7", () => {
  assert.equal(play("dips", POSE.dipTop, POSE.dipLow, { reps: 7 }).count, 7);
});

test("pont fessier : 9 reps → 9", () => {
  assert.equal(play("pont", POSE.bridge0, POSE.bridge, { reps: 9 }).count, 9);
});

test("relevés de jambes : 5 reps → 5", () => {
  assert.equal(play("releves", POSE.legsDn, POSE.legsUp, { reps: 5 }).count, 5);
});

test("jumping jacks : 12 sauts → 12, avec du temps actif", () => {
  const s = play("jacks", POSE.jackIn, POSE.jackOut, { reps: 12, frames: 8, hold: 2 });
  assert.equal(s.count, 12);
  assert.ok(s.holdMs > 6000, `temps actif ${s.holdMs} ms`);
});

test("gainage : position tenue → le chrono avance", () => {
  const c = createCounter("gainage");
  let s;
  for (let i = 0; i < 90; i++) s = c.update(toLandmarks(POSE.plank), i * 33, ASPECT);
  assert.ok(s.holdMs > 2500, `tenu ${s.holdMs} ms`);
});

test("gainage : bassin trop haut → chrono à l'arrêt et conseil", () => {
  const c = createCounter("gainage");
  const bad = { ...POSE.plank, p: [74, 70] };
  let s;
  for (let i = 0; i < 90; i++) s = c.update(toLandmarks(bad), i * 33, ASPECT);
  assert.equal(s.holdMs, 0);
  assert.match(s.feedback, /trop haut/);
});

test("chaise : genoux à 90° → le chrono avance", () => {
  const c = createCounter("chaise");
  let s;
  for (let i = 0; i < 60; i++) s = c.update(toLandmarks(POSE.wall), i * 33, ASPECT);
  assert.ok(s.holdMs > 1500);
});

test("montées de genoux : alterne les deux jambes", () => {
  const right = { ...POSE.knees, l: POSE.knees.L, L: POSE.knees.l };
  const c = createCounter("genoux");
  let t = 0, s;
  const feed = (p) => { s = c.update(toLandmarks(p), t, ASPECT); t += 33; };
  for (let i = 0; i < 8; i++) feed(stand(80));
  for (let r = 0; r < 6; r++) {
    for (let f = 1; f <= 6; f++) feed(lerpPose(stand(80), r % 2 ? right : POSE.knees, f / 6));
    for (let f = 5; f >= 0; f--) feed(lerpPose(stand(80), r % 2 ? right : POSE.knees, f / 6));
  }
  assert.equal(s.count, 6);
});

test("burpees : planche puis saut bras en l'air → 1 rep chacun", () => {
  const c = createCounter("burpees");
  let t = 0, s;
  const feed = (p, n) => { for (let i = 0; i < n; i++) { s = c.update(toLandmarks(p), t, ASPECT); t += 33; } };
  for (let r = 0; r < 4; r++) { feed(stand(118), 10); feed(POSE.pushTop, 15); feed(stand(118), 10); feed(POSE.burpJump, 8); }
  assert.equal(s.count, 4);
});

test("corps hors champ → pas prêt, rien compté", () => {
  const c = createCounter("squats");
  const lm = toLandmarks(stand(80));
  [25, 26, 27, 28].forEach((i) => (lm[i].visibility = 0.1));
  const s = c.update(lm, 0, ASPECT);
  assert.equal(s.ready, false);
  assert.equal(s.count, 0);
});
