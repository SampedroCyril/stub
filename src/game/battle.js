/**
 * Moteur de combat (module pur, testé dans tests/battle.test.js).
 *
 * - PV = 100 × intensité de l'envie (2 si non notée) × (1 + 10 % par niveau du boss).
 * - Le boss s'épuise tout seul et meurt au bout de 5 minutes : c'est la durée réelle d'une envie.
 * - Les attaques le tuent plus vite : point faible (25 % des PV max au total), cycles de respiration, circuit, Frénésie,
 *   multipliées par les faiblesses / résistances du boss.
 * - Il contre-attaque (tentation) : refuser le blesse, laisser passer le soigne.
 * - On ne perd qu'en déclarant une rechute. Le rang S/A/B/C récompense un combat bien mené.
 */
import { bossFor, BOSSES } from "./bosses.js";

export const BATTLE_MS = 5 * 60 * 1000;

/** Dégâts en fraction des PV max. */
export const DMG = {
  weak: 0.04, // point faible touché
  weakFast: 0.08, // touché dans la première demi-seconde
  tapCrit: 0.03, // coup final du mode crise
  breathCycle: 0.07,
  circuit: 0.5,
  circuitCam: 0.75,
  frenzy: 0.01, // point touché en Frénésie
  frenzyFast: 0.016, // touché vite
  frenzyBurst: 0.03, // bonus tous les 10 de combo
  refuse: 0.05, // tentation refusée
  heal: 0.15, // tentation ignorée : le boss se soigne
  crisisPhase: 0.25,
};

/** Point faible : apparaît toutes les 6 à 12 s, visible 1,2 s. Tentation : toutes les 40 à 50 s, 4 s pour refuser. */
export const WEAK = { min: 6000, max: 12000, show: 1200, fast: 500 };
export const TEMPT = { first: 20000, min: 40000, max: 50000, window: 4000 };
/**
 * Frénésie : 30 s de points faibles en chaîne, chacun visible 1 s (critique sous 0,4 s), 0,25 à 0,55 s entre deux. Combo ≥ 10 : ×1,5.
 * Une bonne partie retire ~35 % des PV : moins qu'un circuit (50 %), plus que 30 s de respiration.
 */
export const FRENZY = { dur: 30000, show: 1000, fast: 400, gapMin: 250, gapMax: 550, comboBoost: 10, boost: 1.5 };

/** Les points faibles ne peuvent pas faire plus de 25 % des PV sur un combat. */
export const WEAK_CAP = 0.25;
export const weakLeft = (b) => Math.max(0, Math.round(b.maxHp * WEAK_CAP) - b.hits.filter((h) => h.s === "weak").reduce((a, h) => a + h.d, 0));

export const RANKS = ["S", "A", "B", "C"];
export const RANK_XP = { S: 10, A: 5, B: 0, C: 0 };
const ATTACKS = ["circuit", "breath", "game", "weak"];

export const bossLevel = (victories = 0) => Math.min(10, 1 + Math.floor(victories / 5));
export const maxHpOf = (intensity, lvl) => Math.round(100 * (intensity || 2) * (1 + 0.1 * (lvl - 1)));

export function createBattle({ at = new Date(), intensity = null, trigger = null, victories = {}, crisis = false }) {
  const boss = bossFor(trigger, at);
  const lvl = bossLevel(victories[boss]);
  return {
    id: `${+at}`, at: at.toISOString(), boss, lvl, intensity, trigger, crisis,
    maxHp: Math.round(maxHpOf(intensity, lvl) * (crisis ? 1.2 : 1)),
    hits: [],
  };
}

export const dealt = (b) => b.hits.reduce((a, h) => a + h.d, 0);
export const elapsedMs = (b, now) => Math.max(0, now - new Date(b.at));

/** PV restants. Plafonnés aux PV max (les soins ne dépassent pas), et à 0 au bout de 5 minutes quoi qu'il arrive. */
export function hpAt(b, now = new Date()) {
  if (elapsedMs(b, now) >= BATTLE_MS) return 0;
  const decay = b.maxHp * (elapsedMs(b, now) / BATTLE_MS);
  return Math.max(0, Math.min(b.maxHp, Math.round(b.maxHp - decay - dealt(b))));
}

/** Multiplicateur de faiblesse / résistance du boss pour une attaque. */
export const modFor = (b, src) => BOSSES[b.boss]?.mods?.[src] ?? 1;

/**
 * Ajoute une attaque. frac = fraction des PV max (négative pour un soin du boss).
 * Les attaques circuit, breath et game sont multipliées par les faiblesses du boss. Renvoie {battle, dmg}.
 */
export function hit(b, src, frac, now = new Date()) {
  const raw = b.maxHp * frac * modFor(b, src);
  let d = frac > 0 ? Math.max(1, Math.round(raw)) : Math.round(raw);
  if (src === "weak") d = Math.min(d, weakLeft(b));
  if (src === "weak" && d <= 0) return { battle: b, dmg: 0 };
  return { battle: { ...b, hits: [...b.hits, { s: src, d, t: now.toISOString() }] }, dmg: d };
}

/** Rang de victoire : S rapide et varié, A rapide, B abattu, C tenu jusqu'à l'épuisement. */
export function rankOf(b, now = new Date()) {
  const kt = elapsedMs(b, now) / 1000;
  if (kt >= BATTLE_MS / 1000 - 1) return "C";
  const types = new Set(b.hits.filter((h) => ATTACKS.includes(h.s) && h.d > 0).map((h) => h.s)).size;
  if (kt < 120 && types >= 2) return "S";
  if (kt < 180) return "A";
  return "B";
}

/** Méthode retenue pour l'XP de l'envie : l'attaque la plus engagée l'emporte. */
export function methodOfBattle(b) {
  if (b.crisis) return "crisis";
  const by = {};
  b.hits.forEach((h) => (by[h.s] = (by[h.s] || 0) + h.d));
  if (by.circuit) return "sport";
  if (by.breath) return "breath";
  if (by.game) return "game";
  return "hold";
}

/** Événement « envie tenue » enregistré à la victoire. */
export function victoryEvent(b, now = new Date()) {
  return {
    k: "craving", t: b.at, m: methodOfBattle(b),
    ...(b.intensity ? { i: b.intensity } : {}),
    ...(b.trigger ? { tr: b.trigger } : {}),
    b: b.boss, bl: b.lvl, kt: Math.round(Math.min(elapsedMs(b, now), BATTLE_MS) / 1000),
    ...(b.crisis ? {} : { rk: rankOf(b, now) }),
  };
}

/** Victoires et meilleur temps par boss, à partir de l'historique. */
export function bestiary(events) {
  const out = {};
  events.forEach((e) => {
    if (e.k !== "craving" || !e.b) return;
    const o = (out[e.b] ||= { wins: 0, best: null, last: null });
    o.wins++;
    if (e.kt != null && (o.best == null || e.kt < o.best)) o.best = e.kt;
    o.last = e.t;
  });
  return out;
}
