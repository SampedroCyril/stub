import { test } from "node:test";
import assert from "node:assert/strict";
import { compute, recapDue } from "../src/lib/compute.js";
import { normalizeData, parseImport, exportJson, mergeDays } from "../src/lib/storage.js";
import { xpOf } from "../src/data/exercises.js";
import { levelOf } from "../src/data/rules.js";
import { amount } from "../src/lib/circuit.js";

const iso = (...a) => new Date(...a).toISOString();
const base = (quitAt) => normalizeData({ state: { v: 4, quitAt, startAt: quitAt }, days: {} });

test("niveaux : seuils K × (L-1) × L", () => {
  assert.deepEqual(levelOf(0, 75), { L: 1, cur: 0, need: 150 });
  assert.equal(levelOf(149, 75).L, 1);
  assert.equal(levelOf(150, 75).L, 2);
  assert.equal(levelOf(450, 75).L, 3);
});

test("XP sport : reps × difficulté, secondes × difficulté ÷ 3, × 2 par côté", () => {
  assert.equal(xpOf("squats", 20), 20);
  assert.equal(xpOf("pompes", 12), 24);
  assert.equal(xpOf("jacks", 30), 10);
  assert.equal(xpOf("fentes", 10), 40);
  assert.equal(xpOf("gainage_lateral", 25), 33);
});

test("quantités : +10 % par niveau sport, ±12 % par retour", () => {
  assert.equal(amount("squats", 1, 0), 20);
  assert.equal(amount("squats", 3, 0), 24);
  assert.equal(amount("squats", 1, -1), 18);
  assert.equal(amount("gainage", 1, 0), 40);
});

test("XP sevrage : jours + envies selon la méthode", () => {
  const now = new Date(2026, 10, 4, 14, 0);
  const { state, days } = base(iso(2026, 10, 2, 0, 0));
  days["2026-11-04"] = [
    { k: "craving", t: iso(2026, 10, 4, 1, 0), m: "hold" },
    { k: "craving", t: iso(2026, 10, 4, 2, 0), m: "breath" },
    { k: "craving", t: iso(2026, 10, 4, 3, 0), m: "sport" },
    { k: "circuit", t: iso(2026, 10, 4, 3, 5), f: 0, items: [{ e: "squats", n: 20 }, { e: "jacks", n: 30 }] },
  ];
  const S = compute(state, days, now);
  assert.equal(S.streak, 2);
  assert.equal(S.quitXp, 2 * 100 + 15 + 20 + 25);
  assert.equal(S.sportXp, 30);
  assert.equal(S.res, 3);
});

test("rechute : le sevrage repart de zéro, le sport reste", () => {
  const now = new Date(2026, 10, 6, 12, 0);
  const { days } = base(iso(2026, 10, 2));
  days["2026-11-03"] = [
    { k: "craving", t: iso(2026, 10, 3, 10), m: "sport" },
    { k: "circuit", t: iso(2026, 10, 3, 10, 5), f: 0, items: [{ e: "pompes", n: 12 }] },
  ];
  days["2026-11-05"] = [{ k: "smoked", t: iso(2026, 10, 5, 22) }];
  const state = { ...base(iso(2026, 10, 2)).state, quitAt: iso(2026, 10, 5, 22), best: 3 };
  const S = compute(state, days, now);
  assert.equal(S.res, 0);
  assert.equal(S.quitXp, 0);
  assert.equal(S.sportXp, 24);
  assert.equal(S.best, 3);
});

test("récap : pas en semaine, oui dimanche 18h, rattrapé le lundi seulement si la page servait déjà", () => {
  const { state, days } = base(iso(2026, 9, 30));
  days["2026-11-04"] = [{ k: "craving", t: iso(2026, 10, 4, 1, 30), m: "hold" }];
  const at = (d) => recapDue(compute(state, days, d), state, d, 18);
  assert.equal(at(new Date(2026, 10, 4, 14, 12)), null);
  assert.equal(at(new Date(2026, 10, 8, 17, 59)), null);
  assert.ok(at(new Date(2026, 10, 8, 18, 5)));
  assert.ok(at(new Date(2026, 10, 9, 9, 0)));
});

test("import : accepte l'export de la version Claude et l'ancien format", () => {
  const legacy = JSON.stringify({ app: "anti-clope", version: 4, state: { quit: "2026-11-02", v: 2, adj: 1 }, days: { "2026-11-04": [{ t: iso(2026, 10, 4, 1), c: 1, f: 0 }] } });
  const d = parseImport(legacy);
  assert.equal(d.state.v, 4);
  assert.equal(d.days["2026-11-04"].length, 2);
  assert.equal(d.days["2026-11-04"][1].items[0].e, "pompes");
  assert.throws(() => parseImport("pas du json"), /JSON/);
  assert.throws(() => parseImport("{}"), /days/);
  const round = parseImport(exportJson(d));
  assert.deepEqual(round.days, d.days);
});

test("fusion d'historiques sans doublons", () => {
  const e = { k: "craving", t: iso(2026, 10, 4, 1), m: "hold" };
  const f = { k: "craving", t: iso(2026, 10, 4, 2), m: "sport" };
  const m = mergeDays({ "2026-11-04": [e] }, { "2026-11-04": [e, f] });
  assert.equal(m["2026-11-04"].length, 2);
});
