/**
 * Ce que l'arrêt fait gagner (module pur, testé dans tests/gains.test.js) : argent, temps, paquets, cigarettes évitées,
 * et la progression vers la récompense choisie. Une seule source pour l'Accueil et la fenêtre « Tes gains ».
 *
 * Estimation : on compare à la conso de départ (cpd cigarettes par jour), sur le temps écoulé depuis le début du suivi,
 * cigarettes notées déduites. Hypothèses affichées à l'utilisateur : 20 cigarettes par paquet, environ 5 minutes par cigarette.
 */
import { DAY } from "./util.js";

export const MIN_PER_CIG = 5;
export const PACK = 20;
/** Les 7 premiers jours, le total est encore petit : on met en avant le rythme (par mois). */
export const RATE_DAYS = 7;

export function gains(ev, { now = new Date(), startAt, cpd = 0, price = 0, pack = PACK, reward = null, spent = 0 } = {}) {
  if (!cpd || !startAt) return null;
  const t0 = +new Date(startAt), t = +now;
  const days = Math.max(0, (t - t0) / DAY);
  const smokes = ev.filter((e) => e.k === "smoked" && +new Date(e.t) >= t0);
  const expected = cpd * days;
  const avoided = Math.max(0, Math.round(expected - smokes.length));
  const perCig = price && pack ? price / pack : 0;
  // rythme : sur les 7 derniers jours (ou depuis le début s'il est plus récent), au moins un jour pour ne pas s'emballer
  const win = Math.min(RATE_DAYS, days);
  const smoked7 = smokes.filter((e) => t - +new Date(e.t) <= win * DAY).length;
  const perDay = Math.max(0, cpd - smoked7 / Math.max(1, win));
  const saved = avoided * perCig;
  const pot = Math.max(0, saved - spent); // ce qui reste pour la récompense en cours
  return {
    days, expected: Math.round(expected), smoked: smokes.length, avoided,
    perCig, saved, minutes: avoided * MIN_PER_CIG, packs: Math.floor(avoided / pack),
    perDay, perMonth: perDay * perCig * 30, perYear: perDay * perCig * 365,
    early: days < RATE_DAYS,
    reward: reward && reward.price > 0 ? { ...reward, have: Math.min(pot, reward.price), pct: Math.min(1, pot / reward.price), done: pot >= reward.price } : null,
  };
}

/** Temps lisible : « 40 min », « 3 h 20 », « 2 j 4 h ». */
export function timeText(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  if (m < 24 * 60) { const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`; }
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return h ? `${d} j ${h} h` : `${d} j`;
}

export const eur = (v) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: v >= 100 ? 0 : 2, minimumFractionDigits: v >= 100 ? 0 : 2 });
