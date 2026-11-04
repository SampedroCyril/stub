export const DAY = 864e5;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pad = (n) => String(n).padStart(2, "0");
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromDayKey = (k) => new Date(`${k}T00:00:00`);

export const DOW = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
export const MON = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const fDate = (d) => `${d.getDate()} ${MON[d.getMonth()]}`;
export const fTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fDay = (d) => `${DOW[d.getDay()]} ${d.getDate()}`;

/** "3 jours", "1 jour" */
export const pl = (v, w) => `${v} ${w}${v > 1 ? "s" : ""}`;

/** Durée en secondes → "45 s", "12 min", "1,5 h" */
export const mins = (s) =>
  s < 60 ? `${Math.round(s)} s` : s >= 3600 ? `${(Math.round(s / 360) / 10).toString().replace(".", ",")} h` : `${Math.round(s / 60)} min`;

export const fmt1 = (v) => v.toFixed(1).replace(".", ",");

/** Durée en ms → "2 j 04 h", "3 h 12", "5 min", "4 mois", "1 an 2 mois" */
export function durationText(ms) {
  ms = Math.max(0, ms);
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  if (d >= 365) {
    const y = Math.floor(d / 365);
    return pl(y, "an") + (d % 365 >= 30 ? ` ${Math.floor((d % 365) / 30)} mois` : "");
  }
  if (d >= 60) return `${Math.floor(d / 30)} mois`;
  return d ? `${d} j ${pad(h)} h` : h ? `${h} h ${pad(m)}` : `${m} min`;
}

/** Lundi 00:00 de la semaine de d */
export function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function lastNDays(n, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    out.push({ d, k: dayKey(d) });
  }
  return out;
}

/** Hash FNV-1a + PRNG mulberry32, pour tirer les défis de façon stable par semaine */
export const hashStr = (s) => {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
export function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
