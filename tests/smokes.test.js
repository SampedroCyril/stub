import { test } from "node:test";
import assert from "node:assert/strict";
import { editSmokes } from "../src/lib/smokes.js";
import { compute } from "../src/lib/compute.js";

const iso = (d, h = 12) => new Date(2026, 10, d, h).toISOString();
const base = () => ({ state: { v: 4, quitAt: iso(1, 8), startAt: iso(1, 8), best: 9 }, days: {} });
const now = new Date(2026, 10, 11, 20);

test("cigarette oubliée : ajoutée à son heure, la série et le record se recalculent", () => {
  const r = editSmokes(base(), { add: { t: iso(6, 22), tr: "alcool" } }, now);
  assert.equal(r.state.quitAt, iso(6, 22));
  const S = compute(r.state, r.days, now);
  assert.equal(S.streak, 4);
  assert.equal(r.state.best, 5); // 1 → 6 nov. 22h : 5 jours, et plus le 9 gonflé
  assert.equal(S.smokes[0].tr, "alcool");
});

test("une cigarette oubliée plus ancienne que la dernière ne change pas la date de dernière cigarette", () => {
  const a = editSmokes(base(), { add: { t: iso(8, 9) } }, now);
  const b = editSmokes(a, { add: { t: iso(4, 9) } }, now);
  assert.equal(b.state.quitAt, iso(8, 9));
  assert.equal(compute(b.state, b.days, now).smokes.length, 2);
});

test("retirer la dernière cigarette : on revient à la précédente, ou à la date d'avant", () => {
  const a = editSmokes(base(), { add: { t: iso(4, 9) } }, now);
  const b = editSmokes(a, { add: { t: iso(8, 9) } }, now);
  const last = compute(b.state, b.days, now).smokes.at(-1);
  const c = editSmokes(b, { remove: last }, now);
  assert.equal(c.state.quitAt, iso(4, 9));
  const first = compute(c.state, c.days, now).smokes[0];
  const d = editSmokes(c, { remove: first }, now);
  assert.equal(d.state.quitAt, iso(1, 8));
  assert.deepEqual(d.days, {});
});

test("modifier l'heure d'une cigarette, jamais dans le futur", () => {
  const a = editSmokes(base(), { add: { t: iso(8, 9) } }, now);
  const ev = compute(a.state, a.days, now).smokes[0];
  const b = editSmokes(a, { remove: ev, add: { t: iso(9, 23), tr: ev.tr } }, now);
  assert.equal(b.state.quitAt, iso(9, 23));
  assert.equal(compute(b.state, b.days, now).smokes.length, 1);
  const c = editSmokes(base(), { add: { t: iso(30, 9) } }, now);
  assert.equal(c.state.quitAt, now.toISOString());
});
