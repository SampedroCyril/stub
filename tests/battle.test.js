import { test } from "node:test";
import assert from "node:assert/strict";
import { createBattle, hpAt, hit, victoryEvent, bossLevel, bestiary, rankOf, BATTLE_MS } from "../src/game/battle.js";
import { bossFor, traitsOf, traitList } from "../src/game/bosses.js";
import { HP_BASE } from "../src/game/combo.js";

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
  // envie notée sur 10 : 1 → échelle de jeu 1, 10 → 5, entre les deux on interpole
  assert.equal(createBattle({ at, iv: 1, trigger: "cafe" }).maxHp, HP_BASE[1]);
  assert.equal(createBattle({ at }).maxHp, HP_BASE[2]);
  assert.equal(bossLevel(12), 3);
  assert.equal(createBattle({ at, iv: 10, trigger: "cafe", victories: { cafe: 12 } }).maxHp, Math.round(HP_BASE[5] * 1.2 / 50) * 50);
  const mid = createBattle({ at, iv: 6 }).maxHp;
  assert.ok(mid > HP_BASE[3] && mid < HP_BASE[4]);
});

test("pas d'épuisement : le boss ne perd des PV que sous les coups", () => {
  const b = createBattle({ at, intensity: 2 });
  assert.equal(hpAt(b, at), b.maxHp);
  assert.equal(hpAt(b, later(BATTLE_MS)), b.maxHp);
  assert.equal(hpAt(b, later(BATTLE_MS * 10)), b.maxHp);
});

test("la pause du joueur est retirée du temps de combat", () => {
  const b = { ...createBattle({ at, intensity: 2 }), pz: 30e3, mc: 40 };
  assert.equal(rankOf(b, later(110e3)), "S");
});

test("dégâts et soins, PV plafonnés", () => {
  let b = createBattle({ at, intensity: 1 });
  b = hit(b, "heal", -500, at).battle;
  assert.equal(hpAt(b, at), b.maxHp);
  b = hit(b, "game", 1000, at).battle;
  assert.equal(hpAt(b, at), b.maxHp - 500);
  assert.equal(hit(b, "game", 0, at).dmg, 0);
});

test("rangs : S rapide avec un beau combo, A dans les temps, B abattu, C très lent", () => {
  const b = createBattle({ at, intensity: 2 });
  assert.equal(rankOf({ ...b, mc: 40 }, later(80e3)), "S");
  assert.equal(rankOf({ ...b, mc: 5 }, later(80e3)), "A");
  assert.equal(rankOf(b, later(200e3)), "B");
  assert.equal(rankOf(b, later(BATTLE_MS)), "C");
  assert.equal(rankOf(b, later(250e3)), "B");
});

test("victoire : événement avec boss, temps, rang et combo max", () => {
  const b = { ...createBattle({ at, iv: 6, trigger: "repas" }), mc: 31 };
  assert.deepEqual(victoryEvent(b, later(110e3)), { k: "craving", t: at.toISOString(), m: "game", iv: 6, i: 3, tr: "repas", b: "repas", bl: 1, kt: 110, rk: "S", mc: 31 });
});

test("bestiaire : victoires, meilleur temps, meilleur combo", () => {
  const ev = [
    { k: "craving", t: "a", b: "cafe", kt: 120, mc: 12 },
    { k: "craving", t: "b", b: "cafe", kt: 45, mc: 30 },
    { k: "craving", t: "c", m: "hold" },
  ];
  assert.deepEqual(bestiary(ev), { cafe: { wins: 2, best: 45, last: "b", mc: 30 } });
});

test("traits : une faiblesse et une résistance par boss, aucune pour Clopinette", () => {
  assert.deepEqual(traitsOf("cafe"), { spot: 0.85, size: 1, crit: 1.5, tempt: 1 });
  assert.equal(traitList("cafe").length, 2);
  assert.deepEqual(traitsOf("clope"), { spot: 1, size: 1, crit: 1, tempt: 1 });
});
