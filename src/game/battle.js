/**
 * Moteur de combat (module pur, testé dans tests/battle.test.js).
 *
 * - PV = 100 × intensité de l'envie (2 si non notée) × (1 + 10 % par niveau du boss).
 * - Le boss s'épuise tout seul et meurt au bout de 5 minutes : c'est la durée réelle d'une envie.
 * - Les attaques le tuent plus vite : tapes, cycles de respiration, circuit, lignes au jeu de blocs.
 * - On ne perd qu'en déclarant une rechute.
 */
import { bossFor } from "./bosses.js";

export const BATTLE_MS = 5 * 60 * 1000;

/** Dégâts en fraction des PV max. */
export const DMG = {
  tap: 0.01,
  tapCrit: 0.03,
  breathCycle: 0.08,
  circuit: 0.6,
  circuitCam: 0.8,
  line: 0.1,
  quad: 0.5, // 4 lignes d'un coup
  crisisPhase: 0.25,
};

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

export function hpAt(b, now = new Date()) {
  const decay = b.maxHp * Math.min(1, elapsedMs(b, now) / BATTLE_MS);
  return Math.max(0, Math.round(b.maxHp - decay - dealt(b)));
}

/** Ajoute une attaque. frac = fraction des PV max. Renvoie {battle, dmg}. */
export function hit(b, src, frac, now = new Date()) {
  const d = Math.max(1, Math.round(b.maxHp * frac));
  return { battle: { ...b, hits: [...b.hits, { s: src, d, t: now.toISOString() }] }, dmg: d };
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
