/**
 * Combat clicker (module pur, testé dans tests/combo.test.js).
 *
 * - Jauge de rythme : deux cercles partent des bords et se rejoignent au centre ; on touche l'écran quand ils y sont.
 *   Parfait (dans la petite fenêtre) ou bon : le combo monte. Trop tôt, trop tard ou pas du tout : il retombe à zéro.
 *   Les cercles vont de plus en plus vite avec le combo.
 * - Neuf paliers d'impact : les coups ordinaires sont des paliers 1 (« coup ») ou 2 (« coup sûr »),
 *   et certains combos précis déclenchent les paliers 3 à 9. Ces seuils sont calés sur la durée du combat :
 *   plus l'envie est forte, plus le combat est long, plus les seuils sont espacés.
 * - Les paliers visuels au-delà de ce qui est débloqué (arbre de compétences) s'affichent comme le plus haut débloqué ;
 *   les dégâts, eux, ne changent pas.
 */

export const TIER_NAMES = ["", "Coup", "Coup sûr", "Coup net", "Critique", "Critique noir", "Impact noir", "Fracture", "Supernova", "Transe"];

/** Durée visée d'un combat bien joué, en secondes, selon l'intensité de l'envie. */
export const TARGET_S = { 1: 60, 2: 90, 3: 120, 4: 150, 5: 180 };
/** Envie notée sur 10 → échelle de jeu de 1 à 5 (continue). */
export const scale5 = (iv) => (iv ? 1 + ((Math.min(10, Math.max(1, iv)) - 1) * 4) / 9 : 2);
/** Valeur d'une table 1 à 5 pour une intensité continue (interpolation linéaire). */
const lerpT = (T, x) => { const v = Math.min(5, Math.max(1, x || 2)), a = Math.floor(v), b = Math.min(5, a + 1); return T[a] + (T[b] - T[a]) * (v - a); };
export const targetOf = (intensity) => lerpT(TARGET_S, intensity);

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
export const HIT = { base: 100, fast: 140 };
export const TIER_BONUS = [0, 0, 0, 150, 250, 400, 600, 1000, 1000, 1400];
/** Multiplicateur de combo : ×1, ×1,25 dès le 2e seuil, ×1,5 dès le 4e, ×2 en transe. */
export const COMBO_MULT = [1, 1.25, 1.5, 2];
export function damageFor(tier, { fast = false, trance = false, combo = 0, ms, power = 1, crit = 1, tranceMult = COMBO_MULT[3] } = {}) {
  const mult = trance ? tranceMult : ms && combo >= ms[3] ? COMBO_MULT[2] : ms && combo >= ms[1] ? COMBO_MULT[1] : COMBO_MULT[0];
  const bonus = TIER_BONUS[tier] * (tier >= 3 ? crit : 1);
  return Math.round(((fast ? HIT.fast : HIT.base) * mult + bonus) * power);
}

/** Durée de la course des cercles jusqu'au centre : de 1,15 s à 0,43 s quand le combo monte. slow > 1 ralentit. */
export const approachMs = (combo, slow = 1) => Math.round(Math.max(430, 1150 * (1 - combo / 75)) * slow);
/** Pause entre deux notes. */
export const NOTE_GAP = 220;
/**
 * Fenêtres de jugement autour de l'arrivée au centre (ms). late : retard pardonné,
 * parce qu'on tape presque toujours un poil tard sur un écran tactile.
 */
export const WINDOW = { perfect: 90, good: 210, late: 40 };
/** Parfaits d'affilée pour une série (bonus). */
export const STREAK = 5;
export const STREAK_BONUS = 300;
export function judge(dt, { perfect = WINDOW.perfect, good = WINDOW.good, late = WINDOW.late } = {}) {
  const a = dt > 0 ? Math.max(0, dt - late) : -dt;
  return a <= perfect ? "perfect" : a <= good ? "good" : "miss";
}
/** Une note sur combien est une clope tendue (ne pas toucher : elle s'écrase et le boss encaisse). */
export const CIG_EVERY = [12, 18];
/** Pause après un gros palier, le temps de la mise en scène. */
export const pauseAfter = (shownTier) => (shownTier >= 7 ? 1500 : shownTier === 6 ? 450 : 0);

/**
 * PV d'un boss, calibrés par simulation au rythme de la jauge : un bon joueur (93 % de coups réussis, 45 % de parfaits,
 * la plupart des clopes refusées) le tue en targetOf(intensité) secondes, à la seule force de ses coups.
 * (Valeurs de la 0.3.3 moins la part que faisait l'épuisement, (T / 5 min)², supprimé en 0.3.6.)
 * Un expert met environ les trois quarts de ce temps ; un robot parfait, un peu plus de la moitié (la jauge impose le rythme).
 */
export const HP_BASE = { 1: 8150, 2: 12750, 3: 17650, 4: 24400, 5: 31700 };
export const clickerHp = (intensity, lvl = 1) => Math.round((lerpT(HP_BASE, intensity) * (1 + 0.1 * (lvl - 1))) / 50) * 50;

/** Rang : S rapide avec un beau combo, A dans les temps, B abattu, C au-delà de trois fois le temps visé. */
export function rankFor({ kt, intensity, maxCombo = 0, exhausted = false }) {
  const T = targetOf(intensity), ms = milestonesFor(intensity);
  if (exhausted || kt > T * 3) return "C";
  if (kt <= T && maxCombo >= ms[3]) return "S";
  if (kt <= T * 1.5) return "A";
  return "B";
}
