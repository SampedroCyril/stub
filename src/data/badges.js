import { pl, mins } from "../lib/util.js";

export const TIER_NAMES = ["Bronze", "Argent", "Or", "Émeraude", "Saphir", "Améthyste", "Rubis", "Diamant", "Légende"];
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

/** Tous les badges sont acquis pour de bon, même après une rechute (« Sans fumer » suit le record de jours). */
export const BADGES = [
  { id: "streak", g: "quit", n: "Sans fumer", tiers: [1, 3, 7, 14, 30, 60, 90, 180, 365], f: (v) => pl(v, "jour") },
  { id: "res", g: "quit", n: "Envies tenues", tiers: [1, 10, 25, 50, 100, 250, 500], f: (v) => pl(v, "envie") },
  { id: "ressport", g: "quit", n: "Envies tuées au sport", tiers: [1, 5, 15, 30, 60, 120, 250], f: (v) => pl(v, "envie") },
  { id: "lvlq", g: "quit", n: "Niveau sevrage", tiers: [5, 15, 30, 50, 100, 200, 370, 620, 999], f: (v) => `niveau ${v}`, lvl: true },
  { id: "circ", g: "sport", n: "Circuits", tiers: [1, 10, 25, 50, 100, 250, 500, 1000], f: (v) => pl(v, "circuit") },
  { id: "pompes", g: "sport", n: "Pompes", tiers: [50, 100, 250, 500, 1000, 2500, 5000, 10000], f: (v) => pl(v, "pompe") },
  { id: "squats", g: "sport", n: "Squats", tiers: [50, 100, 250, 500, 1000, 2500, 5000, 10000], f: (v) => pl(v, "squat") },
  { id: "fentes", g: "sport", n: "Fentes", tiers: [50, 100, 250, 500, 1000, 2500, 5000], f: (v) => pl(v, "fente") },
  { id: "gainage", g: "sport", n: "Gainage", tiers: [60, 300, 600, 1800, 3600, 7200, 18000], f: mins },
  { id: "cardio", g: "sport", n: "Cardio", tiers: [300, 900, 1800, 3600, 7200, 18000, 36000], f: mins },
  { id: "burpees", g: "sport", n: "Burpees", tiers: [10, 50, 100, 250, 500, 1000, 2500], f: (v) => pl(v, "burpee") },
  { id: "reps", g: "sport", n: "Reps au total", tiers: [100, 500, 1000, 2500, 5000, 10000, 25000, 50000], f: (v) => pl(v, "rep") },
  { id: "camreps", g: "sport", n: "Reps validées caméra", tiers: [10, 50, 150, 500, 1000, 2500, 5000], f: (v) => pl(v, "rep") },
  { id: "serie", g: "sport", n: "Régularité", tiers: [2, 3, 5, 7, 14, 30, 60, 100], f: (v) => `${pl(v, "jour")} d'affilée` },
  { id: "lvls", g: "sport", n: "Niveau sport", tiers: [2, 3, 5, 7, 10, 15, 20], f: (v) => `niveau ${v}`, lvl: true },
  { id: "boss", g: "sport", n: "Boss vaincus", tiers: [1, 10, 25, 50, 100, 250, 500, 1000], f: (v) => pl(v, "boss").replace("bosss", "boss") },
  { id: "frenzy", g: "sport", n: "Coups en Frénésie", tiers: [25, 100, 250, 600, 1200, 2500, 5000], f: (v) => pl(v, "coup") },
  { id: "breath", g: "sport", n: "Respiration", tiers: [1, 5, 15, 30, 60, 120, 250], f: (v) => pl(v, "séance") },
  { id: "defis", g: "sport", n: "Défis relevés", tiers: [1, 3, 6, 12, 25, 50, 100, 150], f: (v) => pl(v, "défi") },
];

/** Palier atteint + dates d'obtention, à partir de la série chronologique {t, v} du badge. */
export function badgeInfo(b, S) {
  const ser = S.ser[b.id] || [];
  const v = ser.length ? ser[ser.length - 1].v : b.lvl ? 1 : 0;
  let t = 0;
  while (t < b.tiers.length && v >= b.tiers[t]) t++;
  const dates = b.tiers.slice(0, t).map((th) => (ser.find((p) => p.v >= th) || {}).t);
  return { t, v, dates, date: t ? dates[t - 1] : null };
}

export const badgeSnapshot = (S) => Object.fromEntries(BADGES.map((b) => [b.id, badgeInfo(b, S).t]));
