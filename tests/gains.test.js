import { test } from "node:test";
import assert from "node:assert/strict";
import { gains, timeText, eur } from "../src/lib/gains.js";

const D = 864e5;
const start = new Date(2026, 10, 1, 8).toISOString();

test("sans conso indiquée : rien à afficher", () => {
  assert.equal(gains([], { startAt: start, cpd: 0 }), null);
});

test("argent, temps, paquets, cigarettes évitées", () => {
  const now = new Date(+new Date(start) + 10 * D);
  const ev = [{ k: "smoked", t: new Date(+new Date(start) + 2 * D).toISOString() }];
  const g = gains(ev, { now, startAt: start, cpd: 10, price: 13.5 });
  assert.equal(g.expected, 100);
  assert.equal(g.smoked, 1);
  assert.equal(g.avoided, 99);
  assert.equal(g.saved, 99 * 13.5 / 20);
  assert.equal(g.minutes, 99 * 5);
  assert.equal(g.packs, 4);
  assert.equal(g.early, false);
  assert.equal(g.perDay, 10); // aucune cigarette ces 7 derniers jours
  assert.equal(Math.round(g.perMonth), 203);
});

test("les premiers jours, on met en avant le rythme, et une cigarette récente le fait baisser", () => {
  const now = new Date(+new Date(start) + 2 * D);
  const g = gains([{ k: "smoked", t: new Date(+new Date(start) + D).toISOString() }], { now, startAt: start, cpd: 10, price: 13.5 });
  assert.equal(g.early, true);
  assert.equal(g.perDay, 9.5);
});

test("récompense : remplie avec l'argent économisé, moins ce qui a déjà été dépensé", () => {
  const now = new Date(+new Date(start) + 30 * D);
  const base = { now, startAt: start, cpd: 10, price: 10 }; // 300 cigarettes, 150 €
  assert.deepEqual(
    (({ have, pct, done }) => ({ have, pct, done }))(gains([], { ...base, reward: { n: "Ciné", price: 100 } }).reward),
    { have: 100, pct: 1, done: true },
  );
  const r = gains([], { ...base, reward: { n: "Vélo", price: 400 }, spent: 100 }).reward;
  assert.equal(r.have, 50);
  assert.equal(r.done, false);
});

test("formats", () => {
  assert.equal(timeText(40), "40 min");
  assert.equal(timeText(200), "3 h 20");
  assert.equal(timeText(180), "3 h");
  assert.equal(timeText(3000), "2 j 2 h");
  assert.equal(eur(1.35).replace(/\s/g, " "), "1,35 €");
  assert.equal(eur(203.4).replace(/\s/g, " "), "203 €");
});
