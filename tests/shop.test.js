import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanDays, earnings, exploitCtx, ownedItems, balance, canBuy, poolOf, ITEMS, EARN } from "../src/game/shop.js";
import { skillState, canLearn, perksOf } from "../src/data/skills.js";

const start = new Date(2026, 10, 1, 0, 0);
const at = (d, h = 12) => new Date(2026, 10, d, h).toISOString();

test("jours sans clope : jours complets seulement, ceux avec une clope ne comptent pas", () => {
  const now = new Date(2026, 10, 6, 10);
  assert.equal(cleanDays([], start, now), 5);
  assert.equal(cleanDays([{ k: "smoked", t: at(3) }], start, now), 4);
  assert.equal(cleanDays([], new Date(2026, 10, 1, 15), now), 4); // le premier jour entamé ne compte pas
});

test("mégots : envies tenues, rang S, jours sans clope, Arcade plafonnée", () => {
  const ev = [
    { k: "craving", t: at(1), m: "game", b: "cafe", rk: "S" },
    { k: "craving", t: at(2), m: "breath" },
    { k: "game", t: at(2), g: "frenzy", s: 100000 }, // XP plafonnée à 120 → 10 mégots
    { k: "game", t: at(2, 13), g: "frenzy", s: 100000 },
  ];
  const e = earnings(ev, start, new Date(2026, 10, 3, 9));
  assert.equal(e.held, 2 * EARN.craving);
  assert.equal(e.rankS, EARN.rankS);
  assert.equal(e.days, 2 * EARN.cleanDay);
  assert.equal(e.arcade, 10);
  assert.equal(e.total, 20 + 5 + 30 + 10);
});

test("boutique : offerts, achats, exploits et solde", () => {
  const ctx = exploitCtx([], 7);
  const owned = ownedItems(["s:embers"], ctx);
  assert.ok(owned.includes("u:fracture") && owned.includes("k:cut") && owned.includes("s:classic"));
  assert.ok(owned.includes("s:embers"));
  assert.ok(owned.includes("k:ash")); // 7 jours d'affilée
  assert.ok(!owned.includes("k:sky"));
  assert.equal(balance(100, ["s:embers"]), 40);
  assert.ok(canBuy("u:thunder", 150, owned));
  assert.ok(!canBuy("u:thunder", 149, owned));
  assert.ok(!canBuy("k:sky", 9999, owned)); // un exploit ne s'achète pas
  assert.ok(ITEMS.every((i) => i.price == null || i.price > 0));
});

test("arsenal : objet équipé, ou au hasard parmi les siens", () => {
  const owned = ["u:fracture", "u:nova", "u:thunder", "k:cut"];
  assert.deepEqual(poolOf("ult", { ult: "random" }, owned), ["fracture", "nova", "thunder"]);
  assert.deepEqual(poolOf("ult", { ult: "u:thunder" }, owned), ["thunder"]);
  assert.deepEqual(poolOf("ult", { ult: "u:blades" }, owned), ["fracture", "nova", "thunder"]); // pas possédé : hasard
  assert.deepEqual(poolOf("ko", { ko: "random" }, owned), ["cut"]);
});

test("arbre en constellation : une bulle s'apprend si elle touche une bulle acquise", () => {
  assert.equal(skillState("p1", []), "can");
  assert.equal(skillState("p2", []), "lock");
  assert.equal(skillState("p3", ["t1"]), "can"); // chemin qui se croise
  assert.equal(skillState("h1", ["s2"]), "can"); // pont
  assert.ok(!canLearn("p1", [], 0));
  const p = perksOf(["s1", "s3", "h3", "h1"]);
  assert.equal(p.unlocked, 7);
  assert.equal(p.streak, 4);
  assert.equal(p.tranceMult, 2.5);
});
