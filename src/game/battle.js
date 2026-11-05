/**
 * Moteur de combat (module pur, testé dans tests/battle.test.js).
 *
 * - Le combat est un clicker : chaque point faible touché inflige des dégâts selon le combo (voir combo.js).
 * - PV calibrés pour qu'un bon joueur tue le boss en 1 à 3 minutes selon l'intensité de l'envie, +10 % par niveau du boss.
 * - Le boss s'épuise tout seul et meurt au bout de 5 minutes, la durée réelle d'une envie.
 *   L'épuisement est lent au début et s'accélère à la fin : ce sont tes coups qui comptent.
 * - Il contre-attaque (tentation) : refuser le blesse, laisser passer le soigne et casse le combo.
 * - On ne perd qu'en déclarant une rechute.
 */
import { bossFor } from "./bosses.js";
import { clickerHp, rankFor } from "./combo.js";

export const BATTLE_MS = 5 * 60 * 1000;

/** Tentation : refuser lui retire 3 % de ses PV max, la laisser passer le soigne de 8 %. */
export const DMG = { refuse: 0.03, heal: 0.08 };
/** Tentation : la première vers 20 s, puis toutes les 40 à 50 s ; 4 s pour refuser. */
export const TEMPT = { first: 20000, min: 40000, max: 50000, window: 4000 };
/** Frénésie de l'Arcade (mode Entraînement). */
export const FRENZY = { dur: 30000 };

export const RANKS = ["S", "A", "B", "C"];
export const RANK_XP = { S: 10, A: 5, B: 0, C: 0 };

export const bossLevel = (victories = 0) => Math.min(10, 1 + Math.floor(victories / 5));

export function createBattle({ at = new Date(), intensity = null, trigger = null, victories = {} }) {
  const boss = bossFor(trigger, at);
  const lvl = bossLevel(victories[boss]);
  return { id: `${+at}`, at: at.toISOString(), boss, lvl, intensity, trigger, maxHp: clickerHp(intensity, lvl), hits: [], mc: 0 };
}

export const dealt = (b) => b.hits.reduce((a, h) => a + h.d, 0);
/** Temps de combat écoulé, pauses du joueur déduites (pz, en ms). */
export const elapsedMs = (b, now) => Math.max(0, now - new Date(b.at) - (b.pz || 0));
/** Part des PV perdue par épuisement : (t / 5 min)². */
export const decayOf = (b, now) => Math.min(1, elapsedMs(b, now) / BATTLE_MS) ** 2;

/** PV restants, plafonnés aux PV max (les soins ne dépassent pas), et à 0 au bout de 5 minutes quoi qu'il arrive. */
export function hpAt(b, now = new Date()) {
  if (elapsedMs(b, now) >= BATTLE_MS) return 0;
  return Math.max(0, Math.min(b.maxHp, Math.round(b.maxHp * (1 - decayOf(b, now)) - dealt(b))));
}

/** Ajoute des dégâts (d > 0) ou un soin du boss (d < 0). Renvoie {battle, dmg}. */
export function hit(b, src, d, now = new Date()) {
  d = Math.round(d);
  if (!d) return { battle: b, dmg: 0 };
  return { battle: { ...b, hits: [...b.hits, { s: src, d, t: now.toISOString() }] }, dmg: d };
}

/** Rang de victoire (voir rankFor dans combo.js). */
export function rankOf(b, now = new Date()) {
  const kt = elapsedMs(b, now) / 1000;
  return rankFor({ kt, intensity: b.intensity, maxCombo: b.mc || 0, exhausted: kt >= BATTLE_MS / 1000 - 1 });
}

/** Événement « envie tenue » enregistré à la victoire : boss, niveau, temps, rang, combo max. */
export function victoryEvent(b, now = new Date()) {
  return {
    k: "craving", t: b.at, m: "game",
    ...(b.intensity ? { i: b.intensity } : {}),
    ...(b.trigger ? { tr: b.trigger } : {}),
    b: b.boss, bl: b.lvl, kt: Math.round(Math.min(elapsedMs(b, now), BATTLE_MS) / 1000),
    rk: rankOf(b, now), mc: b.mc || 0,
  };
}

/** Victoires et meilleur temps par boss, à partir de l'historique. */
export function bestiary(events) {
  const out = {};
  events.forEach((e) => {
    if (e.k !== "craving" || !e.b) return;
    const o = (out[e.b] ||= { wins: 0, best: null, last: null, mc: 0 });
    o.wins++;
    if (e.kt != null && (o.best == null || e.kt < o.best)) o.best = e.kt;
    o.mc = Math.max(o.mc, e.mc || 0);
    o.last = e.t;
  });
  return out;
}
