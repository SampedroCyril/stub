import { test } from "node:test";
import assert from "node:assert/strict";
import { compute, recapDue } from "../src/lib/compute.js";
import { normalizeData, parseImport, exportJson, mergeDays } from "../src/lib/storage.js";
import { xpOf } from "../src/data/exercises.js";
import { levelOf, quitLevelOf, quitNeed, stageMult, segMult, afterSmoke, titleOf, Q_TITLES } from "../src/data/rules.js";
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

test("niveaux sevrage : 999 niveaux, de plus en plus chers", () => {
  assert.deepEqual(quitLevelOf(0), { L: 1, cur: 0, need: 100 });
  assert.equal(quitLevelOf(99).L, 1);
  assert.equal(quitLevelOf(100).L, 2);
  assert.ok(quitNeed(100) > quitNeed(10) && quitNeed(500) > quitNeed(100));
  assert.equal(quitLevelOf(1e12).L, 999);
  assert.ok(quitLevelOf(1e12).max);
  const H = 36e5, D = 24 * H;
  assert.equal(stageMult(0), 1);
  assert.equal(stageMult(20 * 6e4), 1.05);
  assert.equal(stageMult(8 * H), 1.1);
  assert.equal(stageMult(30 * D), 1.5);
  assert.equal(stageMult(365 * D), 2.5);
  assert.equal(afterSmoke(1.5), 1.25);
  assert.equal(segMult(2 * H, 0.25), 1.25); // le bonus gardé sert de plancher
  assert.equal(segMult(84 * D, 0.25), 1.75); // puis les caps reprennent la main
  assert.equal(titleOf(Q_TITLES, 1), "Premier pas");
  assert.equal(titleOf(Q_TITLES, 14), "Bien parti");
  assert.equal(titleOf(Q_TITLES, 145), "Ex-fumeur");
  assert.equal(titleOf(Q_TITLES, 999), "Légende");
});

test("XP : jours + envies selon la méthode, multipliées par les caps santé atteints", () => {
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
  // jour 1 (cap 8 h, × 1,1), jour 2 (cap 2 jours, × 1,2) ; envies du 3e jour × 1,2
  assert.equal(S.quitXp, 110 + 120 + 18 + 24 + 30);
  assert.equal(S.mult, 1.2);
  assert.equal(S.multKept, false);
  assert.equal(S.sportXp, 36); // le multiplicateur vaut aussi pour le sport
  assert.equal(S.res, 3);
});

test("rechute : l'XP et le niveau restent, la série repart de zéro et le bonus est coupé de moitié", () => {
  const now = new Date(2026, 10, 6, 12, 0);
  const { days } = base(iso(2026, 10, 2));
  days["2026-11-03"] = [
    { k: "craving", t: iso(2026, 10, 3, 10), m: "sport" },
    { k: "circuit", t: iso(2026, 10, 3, 10, 5), f: 0, items: [{ e: "pompes", n: 12 }] },
  ];
  days["2026-11-05"] = [{ k: "smoked", t: iso(2026, 10, 5, 22) }];
  const state = { ...base(iso(2026, 10, 2)).state, quitAt: iso(2026, 10, 5, 22), best: 3 };
  const S = compute(state, days, now);
  assert.equal(S.streak, 0);
  assert.equal(S.mult, 1.15); // × 1,3 au moment de la cigarette (cap 3 jours), la moitié du bonus reste
  assert.equal(S.multKept, true);
  assert.equal(S.res, 1);
  assert.equal(S.quitXp, 110 + 120 + 130 + 28); // 3 jours avant la cigarette + l'envie du 3 (× 1,1)
  assert.equal(S.sportXp, 26);
  assert.equal(S.best, 3);
  assert.deepEqual(S.ser.streak.map((p) => p.v), [1, 2, 3]); // le badge « Sans fumer » garde son record
});

test("après une cigarette, le multiplicateur garde la moitié de son bonus, et le rebond rapporte", () => {
  const { days } = base(iso(2026, 10, 1));
  days["2026-11-11"] = [{ k: "smoked", t: iso(2026, 10, 11, 0) }];
  const state = { ...base(iso(2026, 10, 1)).state, quitAt: iso(2026, 10, 11, 0) };
  const S = compute(state, days, new Date(2026, 10, 13, 12));
  // 10 jours (110, 120, puis 8 × 130), × 1,3 coupé en × 1,15, puis 2 jours (115, puis 120 au cap 2 jours)
  assert.equal(S.xpDays, 1270 + 235);
  assert.equal(S.xpReb, 115); // première journée complète après la cigarette : 100 × 1,15
  assert.equal(S.rebonds, 1);
  assert.equal(S.streak, 2);
  assert.equal(S.mult, 1.2);
  assert.equal(S.multKept, false);
  assert.equal(S.best, 10);
});

test("fumer régulièrement ramène vite le multiplicateur vers × 1", () => {
  const { days } = base(iso(2026, 9, 1));
  days["2026-12-01"] = [{ k: "smoked", t: iso(2026, 11, 1, 9) }, { k: "smoked", t: iso(2026, 11, 1, 13) }, { k: "smoked", t: iso(2026, 11, 1, 18) }];
  const state = { ...base(iso(2026, 9, 1)).state, quitAt: iso(2026, 11, 1, 18) };
  const S = compute(state, days, new Date(2026, 11, 1, 20));
  // 61 jours : × 1,5 (cap 3 semaines), puis 3 cigarettes le même jour : 1,25, 1,125, 1,0625
  assert.equal(S.mult, 1.0625);
  assert.equal(S.rebonds, 0);
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
