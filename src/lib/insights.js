/**
 * Calculs des stats (module pur, testé dans tests/insights.test.js) : envies et cigarettes fumées.
 * Les graphiques de la page Stats se contentent d'afficher ce qui sort d'ici.
 */
import { DAY, dayKey, lastNDays } from "./util.js";
import { methodOf, ivOf } from "../data/rules.js";
import { TRIG_CAT } from "../data/triggers.js";

const t = (e) => new Date(e.t);
/** Lundi = 0 … dimanche = 6. */
export const dowMon = (d) => (d.getDay() + 6) % 7;

/** Comptes par déclencheur et par catégorie, triés du plus fréquent au moins fréquent. */
export function triggerCounts(list) {
  const by = {}, cats = {};
  let tagged = 0;
  list.forEach((e) => {
    if (!e.tr) return;
    tagged++;
    by[e.tr] = (by[e.tr] || 0) + 1;
    const c = TRIG_CAT[e.tr] || "autre";
    cats[c] = (cats[c] || 0) + 1;
  });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const catList = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  return { top, cats: catList, tagged, untagged: list.length - tagged };
}

/** Répartition par heure (24 cases) et par jour de la semaine (lundi d'abord). */
export function timeProfile(list) {
  const hours = Array(24).fill(0), dow = Array(7).fill(0);
  list.forEach((e) => { const d = t(e); hours[d.getHours()]++; dow[dowMon(d)]++; });
  const peakH = list.length ? hours.indexOf(Math.max(...hours)) : null;
  const peakD = list.length ? dow.indexOf(Math.max(...dow)) : null;
  return { hours, dow, peakH, peakD };
}

/** Envies : rythme, intensité et façon de les tenir. */
export function cravingStats(crav, now) {
  const d14 = lastNDays(14, now).map((x) => {
    const l = crav.filter((e) => dayKey(t(e)) === x.k);
    const m = (k) => l.filter((e) => methodOf(e) === k).length;
    const withI = l.filter((e) => ivOf(e));
    return { ...x, n: l.length, sport: m("sport"), breath: m("breath"), game: m("game") + m("crisis"), hold: m("hold"), iv: withI.length ? withI.reduce((a, e) => a + ivOf(e), 0) / withI.length : null };
  });
  const sum = (l) => l.reduce((a, x) => a + x.n, 0);
  const avgIv = (l) => { const k = l.filter((x) => x.iv != null); return k.length ? k.reduce((a, x) => a + x.iv, 0) / k.length : null; };
  const week = d14.slice(7), prev = d14.slice(0, 7);
  const methods = ["sport", "breath", "game", "hold"].map((k) => [k, crav.filter((e) => (k === "game" ? ["game", "crisis"].includes(methodOf(e)) : methodOf(e) === k)).length]);
  return {
    total: crav.length, d14, week: sum(week), prev: sum(prev),
    iv: avgIv(week), ivPrev: avgIv(prev), methods,
    ...timeProfile(crav), trig: triggerCounts(crav),
  };
}

/**
 * Cigarettes fumées : quand, pourquoi, et la part d'envies tenues face aux cigarettes, semaine par semaine.
 * weeks : 8 semaines glissantes (la dernière finit aujourd'hui), held = envies tenues, smoked = cigarettes.
 */
export function smokeStats(smokes, crav, now) {
  const d30 = lastNDays(30, now).map((x) => ({ ...x, n: smokes.filter((e) => dayKey(t(e)) === x.k).length }));
  const end = +now;
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const to = end - (7 - i) * 7 * DAY, from = to - 7 * DAY;
    const inW = (e) => { const x = +t(e); return x > from && x <= to; };
    return { from: new Date(from + 1), to: new Date(to), held: crav.filter(inW).length, smoked: smokes.filter(inW).length };
  });
  const in30 = (e) => end - t(e) < 30 * DAY;
  const held30 = crav.filter(in30).length, smoked30 = smokes.filter(in30).length;
  const sorted = smokes.map(t).sort((a, b) => a - b);
  return {
    total: smokes.length, last: sorted[sorted.length - 1] || null, d30, weeks,
    n30: smoked30, held30, heldPct: held30 + smoked30 ? held30 / (held30 + smoked30) : null,
    ...timeProfile(smokes), trig: triggerCounts(smokes),
  };
}
