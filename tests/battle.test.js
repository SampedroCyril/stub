import { test } from "node:test";
import assert from "node:assert/strict";
import { createBattle, hpAt, hit, DMG, methodOfBattle, victoryEvent, bossLevel, bestiary, BATTLE_MS } from "../src/game/battle.js";
import { bossFor } from "../src/game/bosses.js";

const at = new Date(2026, 10, 4, 14, 0);
const later = (ms) => new Date(+at + ms);

test("boss selon le déclencheur, Spectre la nuit, Clopinette sinon", () => {
  assert.equal(bossFor("cafe", at), "cafe");
  assert.equal(bossFor("alcool", at), "alcool");
  assert.equal(bossFor(null, new Date(2026, 10, 4, 2, 30)), "spectre");
  assert.equal(bossFor(null, at), "clope");
  assert.equal(bossFor("autre", at), "clope");
});

test("PV selon l'intensité et le niveau du boss", () => {
  assert.equal(createBattle({ at, intensity: 3, trigger: "cafe" }).maxHp, 300);
  assert.equal(createBattle({ at }).maxHp, 200);
  assert.equal(bossLevel(12), 3);
  assert.equal(createBattle({ at, intensity: 5, trigger: "cafe", victories: { cafe: 12 } }).maxHp, 600);
});

test("le boss s'épuise seul et meurt en 5 minutes", () => {
  const b = createBattle({ at, intensity: 4 });
  assert.equal(hpAt(b, at), 400);
  assert.equal(hpAt(b, later(BATTLE_MS / 2)), 200);
  assert.equal(hpAt(b, later(BATTLE_MS)), 0);
});

test("attaques : circuit + respiration le tuent avant l'épuisement", () => {
  let b = createBattle({ at, intensity: 5, trigger: "stress" });
  b = hit(b, "circuit", DMG.circuit, later(60e3)).battle;
  for (let i = 0; i < 3; i++) b = hit(b, "breath", DMG.breathCycle, later(70e3 + i * 1e4)).battle;
  assert.equal(hpAt(b, later(100e3)), 0);
  assert.equal(methodOfBattle(b), "sport");
});

test("victoire : événement avec boss, niveau, temps et méthode", () => {
  let b = createBattle({ at, intensity: 3, trigger: "repas" });
  b = hit(b, "game", DMG.quad, later(30e3)).battle;
  b = hit(b, "game", DMG.quad, later(50e3)).battle;
  const ev = victoryEvent(b, later(52e3));
  assert.deepEqual(ev, { k: "craving", t: at.toISOString(), m: "game", i: 3, tr: "repas", b: "repas", bl: 1, kt: 52 });
});

test("mode crise : PV +20 % et méthode « crisis »", () => {
  const b = createBattle({ at, intensity: 5, crisis: true });
  assert.equal(b.maxHp, 600);
  assert.equal(methodOfBattle(b), "crisis");
});

test("bestiaire : victoires et meilleur temps", () => {
  const ev = [
    { k: "craving", t: "a", b: "cafe", kt: 120 },
    { k: "craving", t: "b", b: "cafe", kt: 45 },
    { k: "craving", t: "c", m: "hold" },
  ];
  assert.deepEqual(bestiary(ev), { cafe: { wins: 2, best: 45, last: "b" } });
});
