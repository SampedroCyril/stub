import { test } from "node:test";
import assert from "node:assert/strict";
import { milestonesFor, tierFor, damageFor, approachMs, judge, rankFor, targetOf, HIT, TIER_BONUS } from "../src/game/combo.js";

test("seuils des paliers : croissants, plus espacés pour les grosses envies, plus tôt avec Élan", () => {
  for (const i of [1, 2, 3, 4, 5]) {
    const ms = milestonesFor(i);
    assert.equal(ms.length, 7);
    for (let k = 1; k < 7; k++) assert.ok(ms[k] > ms[k - 1]);
  }
  assert.ok(milestonesFor(5)[6] > milestonesFor(1)[6]);
  assert.ok(milestonesFor(3, 0.1)[6] < milestonesFor(3)[6]);
});

test("paliers : ordinaires 1 puis 2, seuils 3 à 9, puis transe régulière", () => {
  const ms = milestonesFor(2);
  assert.equal(tierFor(1, ms), 1);
  assert.equal(tierFor(ms[0], ms), 3);
  assert.equal(tierFor(ms[1], ms), 4);
  assert.equal(tierFor(ms[1] + 1, ms), 2);
  assert.equal(tierFor(ms[6], ms), 9);
  const step = Math.max(5, Math.round(ms[6] / 5));
  assert.equal(tierFor(ms[6] + step, ms), 9);
  assert.equal(tierFor(ms[6] + 1, ms), 2);
});

test("dégâts : rapide > normal, multiplicateur de combo, bonus des paliers, transe ×2", () => {
  const ms = milestonesFor(2);
  assert.equal(damageFor(1, { combo: 1, ms }), HIT.base);
  assert.equal(damageFor(1, { fast: true, combo: 1, ms }), HIT.fast);
  assert.equal(damageFor(2, { combo: ms[1] + 1, ms }), Math.round(HIT.base * 1.25));
  assert.equal(damageFor(6, { combo: ms[3], ms }), HIT.base * 1.5 + TIER_BONUS[6]);
  assert.equal(damageFor(9, { trance: true, combo: 99, ms }), HIT.base * 2 + TIER_BONUS[9]);
  assert.ok(damageFor(7, { combo: ms[4], ms, crit: 1.5 }) > damageFor(7, { combo: ms[4], ms }));
});

test("jauge : les cercles accélèrent avec le combo, avec un plancher ; jugement parfait / bon / raté", () => {
  assert.ok(approachMs(30) < approachMs(0));
  assert.equal(approachMs(500), approachMs(1000));
  assert.ok(approachMs(0, 1.15) > approachMs(0));
  assert.equal(judge(40), "perfect");
  assert.equal(judge(125), "perfect");
  assert.equal(judge(-120), "good");
  assert.equal(judge(-95), "good");
  assert.equal(judge(300), "miss");
  assert.equal(judge(-100, { perfect: 105 }), "perfect");
});

test("rang selon le temps visé de l'intensité", () => {
  assert.equal(targetOf(1), 60);
  assert.equal(rankFor({ kt: 50, intensity: 1, maxCombo: 30 }), "S");
  assert.equal(rankFor({ kt: 80, intensity: 1, maxCombo: 30 }), "A");
  assert.equal(rankFor({ kt: 170, intensity: 1 }), "B");
  assert.equal(rankFor({ kt: 200, intensity: 1 }), "C");
  assert.equal(rankFor({ kt: 300, intensity: 1, exhausted: true }), "C");
});
