/**
 * Boutique (module pur, testé dans tests/shop.test.js).
 *
 * - Monnaie : les mégots, gagnés en tenant le sevrage. Le solde se recalcule à partir de l'historique (gains)
 *   moins les prix des objets achetés : rien à désynchroniser.
 * - Objets : ultimes, K.O. et signatures (les effets de gfx/fxPack.js). Quatre ne s'achètent pas : ils se gagnent par exploit.
 * - Arsenal : pour chaque emplacement, un objet possédé ou « au hasard parmi les miens ».
 */
import { DAY, dayKey } from "../lib/util.js";
import { playerXpOf, ARCADE_MODES } from "../data/rules.js";
import { BOSSES } from "./bosses.js";

/** Gains en mégots. L'Arcade rapporte 1 mégot pour 12 XP d'Arcade, donc 10 au plus par jour (plafond de l'XP). */
export const EARN = { craving: 10, rankS: 5, cleanDay: 15, arcadeXp: 12 };

export const SLOTS = [
  { id: "ult", n: "Ultime", d: "Ton coup aux paliers d'ultime (7 et 8, à débloquer dans l'arbre)." },
  { id: "ko", n: "K.O.", d: "La mise à mort du boss." },
  { id: "sig", n: "Signature", d: "Ce qui gicle à chaque coup ordinaire." },
  { id: "tray", n: "Cendrier", d: "Là où la clope finit écrasée, à chaque victoire." },
  { id: "aura", n: "Aura d'Éveil", d: "Ce qui entoure le boss pendant l'Éveil (palier 9)." },
  { id: "counter", n: "Compteur", d: "Le style du compteur de combo." },
];

const BOSS_N = Object.keys(BOSSES).length;
/**
 * Exploits : l'objet se débloque tout seul quand la condition est remplie, et ne s'achète pas.
 * prog(ctx) → [fait, objectif].
 */
export const EXPLOITS = {
  "k:ash": { n: "7 jours d'affilée sans fumer", prog: (c) => [Math.min(7, c.best), 7] },
  "k:sky": { n: `Rang S contre les ${BOSS_N} boss`, prog: (c) => [c.sBosses, BOSS_N] },
  "u:void": { n: "Finir un Boss Run (les 11 boss)", prog: (c) => [c.runDone ? 1 : 0, 1] },
  "s:bd": { n: "50 envies tenues", prog: (c) => [Math.min(50, c.held), 50] },
  "t:pot": { n: "14 jours d'affilée sans fumer", prog: (c) => [Math.min(14, c.best), 14] },
  "a:halo": { n: "25 boss vaincus au rang S", prog: (c) => [Math.min(25, c.sCount), 25] },
  "t:trophy": { n: "30 jours d'affilée sans fumer", prog: (c) => [Math.min(30, c.best), 30] },
};

/** Catalogue : id = emplacement abrégé + effet (u:, k:, s:). price null = offert d'office. */
export const ITEMS = [
  { id: "u:fracture", slot: "ult", fx: "fracture", price: null },
  { id: "u:nova", slot: "ult", fx: "nova", price: null },
  { id: "u:thunder", slot: "ult", fx: "thunder", price: 150 },
  { id: "u:ink", slot: "ult", fx: "ink", price: 150 },
  { id: "u:glitch", slot: "ult", fx: "glitch", price: 150 },
  { id: "u:meteor", slot: "ult", fx: "meteor", price: 180 },
  { id: "u:blades", slot: "ult", fx: "blades", price: 200 },
  { id: "u:void", slot: "ult", fx: "void", price: null, exploit: true },
  { id: "k:cut", slot: "ko", fx: "cut", price: null },
  { id: "k:manga", slot: "ko", fx: "manga", price: 80 },
  { id: "k:crt", slot: "ko", fx: "crt", price: 150 },
  { id: "k:stomp", slot: "ko", fx: "stomp", price: 150 },
  { id: "k:fireworks", slot: "ko", fx: "fireworks", price: 180 },
  { id: "k:freeze", slot: "ko", fx: "freeze", price: 180 },
  { id: "k:ash", slot: "ko", fx: "ash", price: null, exploit: true },
  { id: "k:sky", slot: "ko", fx: "sky", price: null, exploit: true },
  { id: "s:classic", slot: "sig", fx: "classic", price: null },
  { id: "s:embers", slot: "sig", fx: "embers", price: 60 },
  { id: "s:ink", slot: "sig", fx: "ink", price: 60 },
  { id: "s:neon", slot: "sig", fx: "neon", price: 60 },
  { id: "s:petals", slot: "sig", fx: "petals", price: 60 },
  { id: "s:gold", slot: "sig", fx: "gold", price: 80 },
  { id: "s:rainbow", slot: "sig", fx: "rainbow", price: 80 },
  { id: "s:bd", slot: "sig", fx: "bd", price: null, exploit: true },
  { id: "t:classic", slot: "tray", fx: "classic", price: null },
  { id: "t:glass", slot: "tray", fx: "glass", price: 80 },
  { id: "t:obsidian", slot: "tray", fx: "obsidian", price: 100 },
  { id: "t:neon", slot: "tray", fx: "neon", price: 100 },
  { id: "t:pot", slot: "tray", fx: "pot", price: null, exploit: true },
  { id: "t:trophy", slot: "tray", fx: "trophy", price: null, exploit: true },
  { id: "a:rage", slot: "aura", fx: "rage", price: null },
  { id: "a:vortex", slot: "aura", fx: "vortex", price: 150 },
  { id: "a:flame", slot: "aura", fx: "flame", price: 150 },
  { id: "a:spark", slot: "aura", fx: "spark", price: 150 },
  { id: "a:frost", slot: "aura", fx: "frost", price: 150 },
  { id: "a:shadow", slot: "aura", fx: "shadow", price: 180 },
  { id: "a:halo", slot: "aura", fx: "halo", price: null, exploit: true },
  { id: "c:classic", slot: "counter", fx: "classic", price: null },
  { id: "c:arcade", slot: "counter", fx: "arcade", price: 60 },
  { id: "c:lcd", slot: "counter", fx: "lcd", price: 60 },
  { id: "c:neon", slot: "counter", fx: "neon", price: 80 },
  { id: "c:manga", slot: "counter", fx: "manga", price: 80 },
  { id: "c:flames", slot: "counter", fx: "flames", price: 100 },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** Jours complets sans clope depuis le début du suivi (minuit à minuit, jour en cours exclu). */
export function cleanDays(ev, startAt, now = new Date()) {
  const smoked = new Set(ev.filter((e) => e.k === "smoked").map((e) => dayKey(new Date(e.t))));
  const d = new Date(startAt);
  if (isNaN(d)) return 0;
  if (d.getHours() || d.getMinutes() || d.getSeconds()) { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); }
  let n = 0;
  for (let t = new Date(d); +t + DAY <= +now; t.setDate(t.getDate() + 1)) if (!smoked.has(dayKey(t))) n++;
  return n;
}

/** Détail des mégots gagnés. */
export function earnings(ev, startAt, now = new Date()) {
  const crav = ev.filter((e) => e.k === "craving");
  const held = crav.length, rankS = crav.filter((e) => e.rk === "S").length, days = cleanDays(ev, startAt, now);
  // XP d'Arcade par jour, déjà plafonnée par playerXpOf, puis convertie jour par jour
  const xpDay = new Map();
  ev.forEach((e) => { if (e.k === "game" && ARCADE_MODES.includes(e.g)) playerXpOf(e, xpDay); });
  let arcade = 0;
  xpDay.forEach((x) => { arcade += Math.floor(x / EARN.arcadeXp); });
  const parts = { held: held * EARN.craving, rankS: rankS * EARN.rankS, days: days * EARN.cleanDay, arcade };
  return { ...parts, total: parts.held + parts.rankS + parts.days + parts.arcade, n: { held, rankS, days } };
}

/** Contexte des exploits : meilleure série, boss battus au rang S, Boss Run fini, envies tenues. */
export function exploitCtx(ev, best = 0) {
  const crav = ev.filter((e) => e.k === "craving");
  return {
    best,
    sBosses: new Set(crav.filter((e) => e.b && e.rk === "S").map((e) => e.b)).size,
    sCount: crav.filter((e) => e.rk === "S").length,
    runDone: ev.some((e) => e.k === "game" && e.g === "bossrun" && e.n >= BOSS_N),
    held: crav.length,
  };
}

/** Objets possédés : offerts d'office, achetés, et exploits réussis. */
export function ownedItems(bought = [], ctx) {
  return ITEMS.filter((i) => (i.price == null && !i.exploit) || bought.includes(i.id) || (i.exploit && ctx && (([a, b]) => a >= b)(EXPLOITS[i.id].prog(ctx)))).map((i) => i.id);
}

/** Solde : gains moins les prix des achats. */
export const balance = (earned, bought = []) => earned - bought.reduce((a, id) => a + (ITEM[id]?.price || 0), 0);
export const canBuy = (id, bal, owned) => !!ITEM[id]?.price && !owned.includes(id) && bal >= ITEM[id].price;

export const DEFAULT_EQ = { ult: "random", ko: "random", sig: "s:classic", tray: "random", aura: "random", counter: "c:classic" };
/** Effets à utiliser en combat pour un emplacement : l'objet équipé (s'il est possédé) ou tous les objets possédés. */
export function poolOf(slot, eq = DEFAULT_EQ, owned = []) {
  const mine = ITEMS.filter((i) => i.slot === slot && owned.includes(i.id));
  const pick = eq[slot];
  if (pick && pick !== "random" && owned.includes(pick)) return [ITEM[pick].fx];
  return mine.map((i) => i.fx);
}
