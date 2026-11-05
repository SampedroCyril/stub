/**
 * Cigarettes fumées (module pur, testé dans tests/smoking.test.js) : ce que le sevrage a fait gagner.
 * Une cigarette fumée remet le sevrage à zéro (un sevrage est un sevrage).
 */
import { DAY } from "./util.js";

/** Cigarettes évitées et euros économisés depuis le début du suivi, par rapport à la conso de départ. */
export function savings(ev, { now = new Date(), startAt, cpd = 0, price = 0, pack = 20 } = {}) {
  if (!cpd || !startAt) return null;
  const smoked = ev.filter((e) => e.k === "smoked" && new Date(e.t) >= new Date(startAt)).length;
  const avoided = Math.max(0, Math.round(cpd * ((now - new Date(startAt)) / DAY) - smoked));
  return { avoided, saved: price && pack ? (avoided * price) / pack : 0 };
}
