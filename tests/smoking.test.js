import { test } from "node:test";
import assert from "node:assert/strict";
import { goalAt, nextDrop, smokeStats, savings } from "../src/lib/smoking.js";
import { bossFor } from "../src/game/bosses.js";
import { TRIG_CATS, TRIG_NAME } from "../src/data/triggers.js";

const d = (day, h = 12) => new Date(2026, 10, day, h);

test("objectif automatique : une clope de moins tous les n jours, jamais sous 0", () => {
  const r = { mode: "auto", start: 10, from: d(1).toISOString(), every: 7 };
  assert.equal(goalAt(r, d(1)), 10);
  assert.equal(goalAt(r, d(7)), 10);
  assert.equal(goalAt(r, d(8)), 9);
  assert.equal(goalAt({ ...r, every: 3 }, d(30)), 1);
  assert.equal(goalAt({ ...r, start: 2, every: 3 }, d(30)), 0);
  assert.deepEqual(nextDrop(r, d(3)), { in: 5, to: 9 });
  assert.equal(goalAt({ mode: "fixed", fixed: 6 }, d(20)), 6);
  assert.equal(goalAt(null, d(1)), null);
  assert.equal(goalAt(r, d(0)), null); // avant le passage en réduction
});

test("stats : clopes du jour, moyenne, jours sous l'objectif, écarts, heures, déclencheurs", () => {
  const ev = [
    { k: "smoked", t: d(10, 8).toISOString(), tr: "cafe" },
    { k: "smoked", t: d(10, 13).toISOString(), tr: "stress" },
    { k: "smoked", t: d(11, 9).toISOString(), tr: "cafe" },
    { k: "smoked", t: d(12, 9).toISOString() },
    { k: "smoked", t: d(12, 10).toISOString() },
    { k: "smoked", t: d(12, 11).toISOString() },
  ];
  const reduce = { mode: "fixed", fixed: 2, from: d(9, 0).toISOString() };
  const s = smokeStats(ev, { now: d(12, 18), startAt: d(9, 0), cpd: 10, price: 12, reduce });
  assert.equal(s.today, 3);
  assert.equal(s.goalToday, 2);
  assert.equal(s.avg7, 1); // 9 : 0, 10 : 2, 11 : 1
  assert.equal(s.vsBase, -0.9);
  assert.equal(s.under, 3);
  assert.equal(s.streak, 3);
  assert.equal(s.longest, d(12, 9) - d(11, 9)); // 24 h entre le 11 et le 12
  assert.equal(s.current, d(12, 18) - d(12, 11));
  assert.equal(s.hours[4], 3); // 8 h à 10 h
  assert.deepEqual(s.trig[0], ["cafe", 2]);
  assert.equal(s.cats.situation, 2);
  assert.equal(s.spent30, 6 * 0.6);
});

test("économies : conso de départ moins ce qui a été fumé depuis le début du suivi", () => {
  const ev = [{ k: "smoked", t: d(3).toISOString() }, { k: "smoked", t: d(3, 14).toISOString() }];
  const s = savings(ev, { now: d(5, 0), startAt: d(1, 0), cpd: 10, price: 10 });
  assert.equal(s.avoided, 38);
  assert.equal(s.saved, 19);
});

test("déclencheurs par catégories, et chacun amène un boss", () => {
  assert.ok(TRIG_CATS.length >= 4);
  assert.equal(TRIG_NAME.cafe, "Café");
  assert.equal(bossFor("anxiete", d(5, 15)), "stress");
  assert.equal(bossFor("soiree", d(5, 22)), "potes");
  assert.equal(bossFor("coucher", d(5, 2)), "spectre");
  assert.equal(bossFor("coucher", d(5, 23)), "clope");
  assert.equal(bossFor("autre", d(5, 3)), "spectre");
});
