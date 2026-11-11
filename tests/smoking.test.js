import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateState } from "../src/lib/storage.js";
import { bossFor } from "../src/game/bosses.js";
import { TRIG_CATS, TRIG_NAME } from "../src/data/triggers.js";

const d = (day, h = 12) => new Date(2026, 10, day, h);

test("déclencheurs par catégories, et chacun amène un boss", () => {
  assert.ok(TRIG_CATS.length >= 4);
  assert.equal(TRIG_NAME.cafe, "Café");
  assert.equal(bossFor("anxiete", d(5, 15)), "stress");
  assert.equal(bossFor("soiree", d(5, 22)), "potes");
  assert.equal(bossFor("coucher", d(5, 2)), "spectre");
  assert.equal(bossFor("coucher", d(5, 23)), "clope");
  assert.equal(bossFor("autre", d(5, 3)), "spectre");
});

test("migration 0.4.4 : les réglages du mode Réduction disparaissent", () => {
  const o = migrateState({ v: 4, quitAt: d(2).toISOString(), goal: "reduce", reduce: { mode: "fixed", fixed: 5 }, sections: { sport: false, reduction: true, sevrage: false } });
  assert.equal(o.goal, undefined);
  assert.equal(o.reduce, undefined);
  assert.deepEqual(o.sections, { sport: false });
});
