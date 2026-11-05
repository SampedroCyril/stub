import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionOn, visibleSections, cravingHome, sectionOf } from "../src/data/sections.js";
import { migrateState } from "../src/lib/storage.js";
import { baseGoal, defaultReduce } from "../src/lib/smoking.js";

const ids = (st) => visibleSections(st).map((s) => s.id);

test("Sevrage actif et Réduction masquée par défaut", () => {
  const st = { sections: {} };
  assert.equal(sectionOn(st, "sevrage"), true);
  assert.equal(sectionOn(st, "reduction"), false);
  assert.ok(ids(st).includes("sevrage") && !ids(st).includes("reduction"));
});

test("Réduction seule : le Sevrage disparaît, les envies vont à la Réduction", () => {
  const st = { sections: { sevrage: false, reduction: true } };
  assert.equal(sectionOn(st, "sevrage"), false);
  assert.deepEqual(ids(st).slice(0, 2), ["accueil", "reduction"]);
  assert.equal(cravingHome(st), "reduction");
  assert.equal(sectionOf("respirer", st).id, "reduction");
});

test("Les deux à la fois", () => {
  const st = { sections: { reduction: true } };
  assert.ok(ids(st).includes("sevrage") && ids(st).includes("reduction"));
  assert.equal(cravingHome(st), "sevrage");
  assert.equal(sectionOf("respirer", st).id, "sevrage");
});

test("Jamais les deux coupés : le Sevrage revient", () => {
  const st = { sections: { sevrage: false, reduction: false } };
  assert.equal(sectionOn(st, "sevrage"), true);
  assert.equal(cravingHome(st), "sevrage");
});

test("Migration : l'ancien choix Réduire active la catégorie Réduction", () => {
  const o = migrateState({ v: 4, quitAt: "2026-11-02T00:00:00.000Z", goal: "reduce", reduce: { mode: "fixed", fixed: 5 }, sections: { sport: true } });
  assert.equal(o.goal, undefined);
  assert.equal(o.sections.reduction, true);
  assert.equal(sectionOn(o, "sevrage"), true);
  const q = migrateState({ v: 4, quitAt: "2026-11-02T00:00:00.000Z", goal: "quit" });
  assert.equal(sectionOn(q, "reduction"), false);
});

test("Objectif de départ de la Réduction", () => {
  const now = new Date(2026, 10, 10, 20);
  const ev = [];
  for (let d = 3; d <= 9; d++) for (let i = 0; i < 6; i++) ev.push({ k: "smoked", t: new Date(2026, 10, d, 8 + i).toISOString() });
  assert.equal(baseGoal(ev, { now, startAt: new Date(2026, 10, 1).toISOString() }), 6);
  assert.equal(baseGoal([], { now, cpd: 12 }), 12);
  assert.equal(baseGoal([], { now }), 10);
  const r = defaultReduce(6, now);
  assert.equal(r.mode, "auto");
  assert.equal(r.start, 6);
});
