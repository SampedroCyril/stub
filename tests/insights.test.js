import { test } from "node:test";
import assert from "node:assert/strict";
import { cravingStats, smokeStats, triggerCounts, timeProfile, dowMon } from "../src/lib/insights.js";

const at = (d, h) => new Date(2026, 10, d, h).toISOString();

test("déclencheurs : par déclencheur, par catégorie, et ceux sans déclencheur", () => {
  const r = triggerCounts([{ t: at(2, 9), tr: "cafe" }, { t: at(2, 10), tr: "cafe" }, { t: at(2, 11), tr: "stress" }, { t: at(2, 12) }]);
  assert.deepEqual(r.top, [["cafe", 2], ["stress", 1]]);
  assert.deepEqual(r.cats, [["situation", 2], ["emotion", 1]]);
  assert.equal(r.tagged, 3);
  assert.equal(r.untagged, 1);
});

test("profil horaire : heure et jour de pointe (lundi d'abord)", () => {
  const p = timeProfile([{ t: at(2, 9) }, { t: at(2, 9) }, { t: at(4, 18) }]); // 2 nov. 2026 = lundi
  assert.equal(p.peakH, 9);
  assert.equal(p.peakD, 0);
  assert.equal(p.dow[2], 1);
  assert.equal(dowMon(new Date(2026, 10, 8)), 6); // dimanche
});

test("envies : semaine en cours face à la précédente, intensité, façons de tenir", () => {
  const now = new Date(2026, 10, 14, 20);
  const crav = [
    { k: "craving", t: at(3, 9), m: "breath", iv: 8 },
    { k: "craving", t: at(4, 9), m: "hold", iv: 6 },
    { k: "craving", t: at(12, 9), m: "sport", iv: 4 },
  ];
  const s = cravingStats(crav, now);
  assert.equal(s.total, 3);
  assert.equal(s.week, 1);
  assert.equal(s.prev, 2);
  assert.equal(s.iv, 4);
  assert.equal(s.ivPrev, 7);
  assert.deepEqual(Object.fromEntries(s.methods), { sport: 1, breath: 1, game: 0, hold: 1 });
});

test("cigarettes : 30 jours, part des envies tenues, semaines glissantes", () => {
  const now = new Date(2026, 10, 30, 20);
  const smokes = [{ k: "smoked", t: at(28, 8), tr: "cafe" }, { k: "smoked", t: at(29, 22), tr: "alcool" }];
  const crav = [1, 2, 3, 4, 5, 6].map((h) => ({ k: "craving", t: at(29, h) }));
  const s = smokeStats(smokes, crav, now);
  assert.equal(s.total, 2);
  assert.equal(s.n30, 2);
  assert.equal(s.held30, 6);
  assert.equal(s.heldPct, 0.75);
  assert.equal(s.d30.at(-2).n, 1);
  assert.equal(s.weeks.at(-1).smoked, 2);
  assert.equal(s.weeks.at(-1).held, 6);
  assert.equal(s.last.getHours(), 22);
  assert.equal(smokeStats([], [], now).heldPct, null);
});
