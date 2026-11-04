/**
 * Combat clicker (module pur, testé dans tests/combo.test.js).
 *
 * - Chaque point faible touché fait monter le combo ; un raté ou un point qui s'échappe le remet à zéro.
 * - Neuf paliers d'impact : les coups ordinaires sont des paliers 1 (« coup ») ou 2 (« coup sûr »),
 *   et certains combos précis déclenchent les paliers 3 à 9. Ces seuils sont calés sur la durée du combat :
 *   plus l'envie est forte, plus le combat est long, plus les seuils sont espacés.
 * - Les paliers visuels au-delà de ce qui est débloqué (arbre de compétences) s'affichent comme le plus haut débloqué ;
 *   les dégâts, eux, ne changent pas.
 */

export const TIER_NAMES = ["", "Coup", "Coup sûr", "Coup net", "Critique", "Critique noir", "Impact noir", "Fracture", "Supernova", "Transe"];

/** Durée visée d'un combat bien joué, en secondes, selon l'intensité de l'envie. */
export const TARGET_S = { 1: 60, 2: 90, 3: 120, 4: 150, 5: 180 };
export const targetOf = (intensity) => TARGET_S[intensity || 2];

/** Seuils de combo des paliers 3 à 9, pour une envie d'intensité 3. */
const BASE_MS = [5, 10, 15, 20, 26, 32, 40];

/** Seuils de combo des paliers 3 à 9 pour cette intensité ; early = part d'avance (compétence Élan). */
export function milestonesFor(intensity = 2, early = 0) {
  const k = (0.8 + 0.1 * (intensity || 2)) * (1 - early);
  const ms = [];
  BASE_MS.forEach((c) => ms.push(Math.max((ms[ms.length - 1] || 2) + 1, Math.round(c * k))));
  return ms;
}

/** Palier de jeu d'un coup au combo donné (avant le plafond visuel). */
export function tierFor(combo, ms) {
  const i = ms.indexOf(combo);
  if (i >= 0) return i + 3;
  const last = ms[ms.length - 1], step = Math.max(5, Math.round(last / 5));
  if (combo > last && (combo - last) % step === 0) return 9;
  return combo >= ms[1] ? 2 : 1;
}

/** Dégâts d'un coup : base (rapide ou non) × multiplicateur de combo + bonus du palier. */
export const HIT = { base: 10, fast: 14 };
export const TIER_BONUS = [0, 0, 0, 15, 25, 40, 60, 100, 100, 140];
/** Multiplicateur de combo : ×1, ×1,25 dès le 2e seuil, ×1,5 dès le 4e, ×2 en transe. */
export const COMBO_MULT = [1, 1.25, 1.5, 2];
export function damageFor(tier, { fast = false, trance = false, combo = 0, ms, power = 1, crit = 1 } = {}) {
  const mult = trance ? COMBO_MULT[3] : ms && combo >= ms[3] ? COMBO_MULT[2] : ms && combo >= ms[1] ? COMBO_MULT[1] : COMBO_MULT[0];
  const bonus = TIER_BONUS[tier] * (tier >= 3 ? crit : 1);
  return Math.round(((fast ? HIT.fast : HIT.base) * mult + bonus) * power);
}

/** Cadence : les points faibles restent moins longtemps et arrivent plus vite quand le combo monte. */
export function cadence(combo, { show = 1, spot = 1 } = {}) {
  const speed = Math.max(0.55, 1 - combo / 90);
  return { showMs: Math.round(1150 * speed * show * spot), gapMin: 220 * speed, gapMax: 480 * speed };
}
/** Pause après un gros palier, le temps de la mise en scène. */
export const pauseAfter = (shownTier) => (shownTier >= 7 ? 1500 : shownTier === 6 ? 450 : 0);

/**
 * PV d'un boss, calibrés par simulation : un bon joueur (94 % de points touchés, un peu plus de la moitié
 * en coup rapide, ~0,3 s de réaction) le tue en targetOf(intensité) secondes, épuisement compris.
 * Un expert (98,5 %) met environ deux tiers de ce temps ; un robot parfait, un bon tiers.
 */
export const HP_BASE = { 1: 1900, 2: 2950, 3: 4100, 4: 5550, 5: 7700 };
export const clickerHp = (intensity, lvl = 1) => Math.round((HP_BASE[intensity || 2] * (1 + 0.1 * (lvl - 1))) / 10) * 10;

/** Rang : S rapide avec un beau combo, A dans les temps, B abattu avant l'épuisement, C épuisement. */
export function rankFor({ kt, intensity, maxCombo = 0, exhausted = false }) {
  if (exhausted) return "C";
  const T = targetOf(intensity), ms = milestonesFor(intensity);
  if (kt <= T && maxCombo >= ms[3]) return "S";
  if (kt <= T * 1.5) return "A";
  return "B";
}
