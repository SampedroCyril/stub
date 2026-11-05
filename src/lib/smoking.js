/**
 * Clopes fumées (module pur, testé dans tests/smoking.test.js) : objectif du jour en mode Réduction, statistiques.
 * Une clope remet toujours le sevrage à zéro (un sevrage est un sevrage) ; la réduction a ses propres repères :
 * clopes du jour contre l'objectif, baisse par rapport à la conso de départ, jours tenus sous l'objectif.
 */
import { DAY, dayKey } from "./util.js";
import { TRIG_CAT } from "../data/triggers.js";

/** Rythmes de baisse automatique de l'objectif : une clope de moins tous les n jours. */
export const PACES = [[3, "Tous les 3 jours"], [7, "Chaque semaine"], [14, "Toutes les 2 semaines"]];
const day0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysBetween = (a, b) => Math.round((day0(b) - day0(a)) / DAY);

/**
 * Objectif du jour. reduce = { mode: "auto" | "fixed", start, from, every, fixed }.
 * Auto : on part de start le jour from, et l'objectif baisse d'une clope tous les every jours, jusqu'à 0.
 */
export function goalAt(reduce, date) {
  if (!reduce) return null;
  if (reduce.from && day0(date) < day0(reduce.from)) return null; // pas d'objectif avant le passage en réduction
  if (reduce.mode === "fixed") return reduce.fixed ?? null;
  if (reduce.start == null || !reduce.from) return null;
  const k = Math.floor(Math.max(0, daysBetween(reduce.from, date)) / (reduce.every || 7));
  return Math.max(0, reduce.start - k);
}
/**
 * Objectif de départ quand on active la Réduction : ta moyenne des 7 derniers jours si tu notes tes clopes,
 * sinon ta conso de départ, sinon 10. Baisse automatique d'une clope par semaine.
 */
export function baseGoal(ev, { now, startAt, cpd = 0 }) {
  const avg = smokeStats(ev, { now, startAt }).avg7;
  return avg ? Math.max(1, Math.ceil(avg)) : cpd || 10;
}
export const defaultReduce = (base, now = new Date()) => ({ mode: "auto", start: base, from: now.toISOString(), every: 7, fixed: base });

/** Prochaine baisse automatique : dans combien de jours, et à combien. */
export function nextDrop(reduce, now) {
  if (!reduce || reduce.mode !== "auto" || reduce.start == null || !reduce.from) return null;
  const g = goalAt(reduce, now);
  if (!g) return null;
  const e = reduce.every || 7, d = Math.max(0, daysBetween(reduce.from, now));
  return { in: e - (d % e), to: g - 1 };
}

/** Statistiques des clopes fumées sur les 30 derniers jours (et depuis le début du suivi pour les écarts). */
export function smokeStats(ev, { now = new Date(), startAt, cpd = 0, price = 0, pack = 20, reduce = null } = {}) {
  const sm = ev.filter((e) => e.k === "smoked").map((e) => ({ ...e, d: new Date(e.t) })).sort((a, b) => a.d - b.d);
  const byDay = new Map();
  sm.forEach((e) => { const k = dayKey(e.d); byDay.set(k, (byDay.get(k) || 0) + 1); });
  const start = startAt ? day0(startAt) : sm.length ? day0(sm[0].d) : day0(now);
  const today = dayKey(now);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(+day0(now) - (29 - i) * DAY), k = dayKey(d);
    return { d, k, n: byDay.get(k) || 0, goal: goalAt(reduce, d), tracked: d >= start };
  });
  // moyenne des 7 derniers jours complets suivis (aujourd'hui exclu)
  const full = days.filter((x) => x.tracked && x.k !== today).slice(-7);
  const avg7 = full.length ? full.reduce((a, x) => a + x.n, 0) / full.length : null;
  // jours tenus sous l'objectif (journées complètes depuis le passage en réduction)
  const from = reduce?.from ? day0(reduce.from) : null;
  const goalDays = days.filter((x) => x.k !== today && x.tracked && x.goal != null && (!from || x.d >= from));
  const under = goalDays.filter((x) => x.n <= x.goal).length;
  let streak = 0;
  for (let i = goalDays.length - 1; i >= 0 && goalDays[i].n <= goalDays[i].goal; i--) streak++;
  // écarts entre deux clopes
  let longest = 0;
  for (let i = 1; i < sm.length; i++) longest = Math.max(longest, sm[i].d - sm[i - 1].d);
  const last = sm.length ? sm[sm.length - 1].d : null;
  const current = last ? now - last : null;
  // heures (tranches de 2 h) et déclencheurs, sur 30 jours
  const recent = sm.filter((e) => e.d >= days[0].d);
  const hours = Array(12).fill(0);
  recent.forEach((e) => { hours[Math.floor(e.d.getHours() / 2)]++; });
  const trig = {};
  recent.forEach((e) => { if (e.tr) trig[e.tr] = (trig[e.tr] || 0) + 1; });
  const cats = {};
  recent.forEach((e) => { if (e.tr) { const c = TRIG_CAT[e.tr] || "autre"; cats[c] = (cats[c] || 0) + 1; } });
  const perCig = price && pack ? price / pack : 0;
  return {
    days, today: byDay.get(today) || 0, goalToday: goalAt(reduce, now), avg7, cpd,
    vsBase: cpd && avg7 != null ? (avg7 - cpd) / cpd : null,
    under, goalDaysN: goalDays.length, streak, longest: Math.max(longest, current || 0), current, last,
    hours, trig: Object.entries(trig).sort((a, b) => b[1] - a[1]), cats, n30: recent.length, spent30: recent.length * perCig, total: sm.length,
  };
}

/** Clopes évitées et euros économisés depuis le début du suivi, par rapport à la conso de départ. */
export function savings(ev, { now = new Date(), startAt, cpd = 0, price = 0, pack = 20 } = {}) {
  if (!cpd || !startAt) return null;
  const smoked = ev.filter((e) => e.k === "smoked" && new Date(e.t) >= new Date(startAt)).length;
  const avoided = Math.max(0, Math.round(cpd * ((now - new Date(startAt)) / DAY) - smoked));
  return { avoided, saved: price && pack ? (avoided * price) / pack : 0 };
}
