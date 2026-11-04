import { EX, sides, circuitXp } from "./exercises.js";
import { methodOf } from "./rules.js";
import { DAY, clamp, dayKey, hashStr, rng } from "../lib/util.js";

/** Défis hebdo : 1 sevrage + 1 sport + 1 au hasard, tirés de façon stable selon la semaine. */
export const DEFIS = {
  resist10: { g: "quit", n: "Tenir 10 envies", target: 10, ic: "shield", acc: (e) => (e.k === "craving" ? 1 : 0) },
  ressport3: { g: "quit", n: "Tuer 3 envies avec un circuit", target: 3, ic: "flame", acc: (e) => (e.k === "craving" && methodOf(e) === "sport" ? 1 : 0) },
  breath3: { g: "quit", n: "Faire 3 séances de respiration", target: 3, ic: "wind", acc: (e) => (e.k === "breath" ? 1 : 0) },
  note5: { g: "quit", n: "Noter le déclencheur de 5 envies", target: 5, ic: "tag", acc: (e) => (e.k === "craving" && e.tr ? 1 : 0) },
  clean7: { g: "quit", n: "Une semaine entière sans clope", target: 7, ic: "calendar", clean: true },
  circ5: { g: "sport", n: "Faire 5 circuits", target: 5, ic: "dumbbell", acc: (e) => (e.k === "circuit" ? 1 : 0) },
  days3: { g: "sport", n: "Du sport 3 jours différents", target: 3, ic: "calendar", days: true },
  xp200: { g: "sport", n: "Gagner 200 XP sport", target: 200, ic: "star", acc: (e) => (e.k === "circuit" ? circuitXp(e) : 0) },
  reps150: {
    g: "sport", n: "Faire 150 reps", target: 150, ic: "bolt",
    acc: (e) => (e.k === "circuit" ? (e.items || []).reduce((a, it) => a + (EX[it.e] && EX[it.e].u === "reps" ? it.n * sides(it.e) : 0), 0) : 0),
  },
};

export function pickDefis(weekKey) {
  const r = rng(hashStr(`anticlope-${weekKey}`));
  const q = Object.keys(DEFIS).filter((k) => DEFIS[k].g === "quit");
  const s = Object.keys(DEFIS).filter((k) => DEFIS[k].g === "sport");
  const a = q[Math.floor(r() * q.length)], b = s[Math.floor(r() * s.length)];
  const rest = Object.keys(DEFIS).filter((k) => k !== a && k !== b);
  return [a, b, rest[Math.floor(r() * rest.length)]];
}

export const fmtDefi = (id, v) => (id === "clean7" ? `${v} j` : String(v));

/** Progression d'un défi sur une semaine [ws, we). */
export function evalDefi(id, list, ws, we, now, smokes, startAt) {
  const D = DEFIS[id];
  let v = 0, doneAt = null;
  if (D.clean) {
    const smokedIn = smokes.some((e) => { const t = new Date(e.t); return t >= ws && t < we; });
    const before = smokes.some((e) => new Date(e.t) < ws);
    const ok = !smokedIn && (before || startAt <= ws);
    v = ok ? clamp(Math.floor((Math.min(+now, +we) - ws) / DAY), 0, 7) : 0;
    if (ok && now >= we) doneAt = new Date(we);
    return { v, doneAt, broken: smokedIn };
  }
  if (D.days) {
    const seen = new Set();
    list.forEach((e) => {
      if (e.k !== "circuit") return;
      const k = dayKey(new Date(e.t));
      if (seen.has(k)) return;
      seen.add(k);
      v = seen.size;
      if (!doneAt && v >= D.target) doneAt = new Date(e.t);
    });
    return { v, doneAt };
  }
  list.forEach((e) => {
    const a = D.acc(e);
    if (!a) return;
    v += a;
    if (!doneAt && v >= D.target) doneAt = new Date(e.t);
  });
  return { v, doneAt };
}
