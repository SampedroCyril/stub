/** Défis caméra : max de reps en un temps donné, ou position tenue le plus longtemps possible. */
export const CHALLENGES = [
  { id: "pompes60", e: "pompes", kind: "reps", sec: 60, n: "Pompes en 1 minute", d: "Le plus de pompes propres en 60 s" },
  { id: "squats30", e: "squats", kind: "reps", sec: 30, n: "Squats en 30 secondes", d: "Le plus de squats complets en 30 s" },
  { id: "jacks60", e: "jacks", kind: "reps", sec: 60, n: "Jumping jacks en 1 minute", d: "Le plus de sauts en 60 s" },
  { id: "dips45", e: "dips", kind: "reps", sec: 45, n: "Dips en 45 secondes", d: "Le plus de dips sur chaise en 45 s" },
  { id: "planche", e: "gainage", kind: "hold", n: "Planche la plus longue", d: "Tenir le gainage, bassin aligné" },
  { id: "chaise", e: "chaise", kind: "hold", n: "Chaise contre le mur", d: "Tenir genoux à 90°" },
];

/** Meilleure valeur, date et nombre de tentatives par défi. */
export function recordsOf(events) {
  const out = {};
  events.forEach((e) => {
    if (e.k !== "challenge") return;
    const o = (out[e.c] ||= { v: 0, t: null, tries: 0 });
    o.tries++;
    if (e.v > o.v) { o.v = e.v; o.t = e.t; }
  });
  return out;
}
