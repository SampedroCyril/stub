/**
 * Stockage local (localStorage) + export/import JSON.
 * Format compatible avec l'export de la version Claude :
 *   { app: "anti-clope", version, state, days }
 * days[YYYY-MM-DD] = liste d'événements :
 *   craving {m: "sport"|"breath"|"hold", i?: 1-5, tr?: string}
 *   breath  {sec, p}
 *   circuit {items: [{e, n, cam?}], f}
 *   smoked
 */

const KEY = "anticlope:v4";
const LEGACY = { state: "ac_state", days: "ac_days" };

export const DEFAULT_STATE = {
  v: 4,
  quitAt: new Date(2026, 10, 2).toISOString(),
  startAt: null,
  best: 0,
  adj: 0,
  ri: 0,
  ci: 0,
  bp: "coherence",
  bd: 120,
  recapSeen: "",
  sound: true,
  gameSound: true,
  skills: [],
  sections: { sport: true, joueur: true, progres: true },
  intense: null,
  model: "lite",
};

const OLD = [["squats", 20, "jacks", 30], ["pompes", 12, "genoux", 30], ["fentes", 10, "climbers", 20], ["gainage", 40, "jacks", 30], ["dips", 12, "genoux", 30], ["squats_lents", 15, "climbers", 20], ["pompes_serrees", 10, "jacks", 30], ["chaise", 45, "genoux", 30]];

/** Convertit les tout premiers événements {t, c, f} au format actuel. */
export function normalizeList(list) {
  const out = [];
  (list || []).forEach((e) => {
    if (e && e.k) out.push(e.k === "craving" && !e.m ? { ...e, m: e.sport ? "sport" : "hold" } : e);
    else if (e && e.t) {
      const o = OLD[e.c] || OLD[0];
      out.push({ k: "craving", t: e.t, m: "sport" }, { k: "circuit", t: e.t, f: e.f || 0, items: [{ e: o[0], n: o[1] }, { e: o[2], n: o[3] }] });
    }
  });
  return out;
}

export function migrateState(s) {
  if (!s) return { ...DEFAULT_STATE, startAt: DEFAULT_STATE.quitAt };
  if (s.v >= 3) {
    const o = { ...DEFAULT_STATE, ...s, v: 4 };
    if (!o.startAt) o.startAt = o.quitAt;
    return o;
  }
  const q = s.quit ? new Date(`${s.quit}T00:00:00`) : null;
  const qa = q && !isNaN(q) ? q.toISOString() : DEFAULT_STATE.quitAt;
  return { ...DEFAULT_STATE, quitAt: qa, startAt: qa, adj: s.v === 2 ? s.adj || 0 : 0, ri: s.ri || 0, ci: s.ci || 0 };
}

export function normalizeData(raw) {
  const days = {};
  Object.entries(raw?.days || {}).forEach(([k, list]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
    const l = normalizeList(list);
    if (l.length) days[k] = l;
  });
  return { state: migrateState(raw?.state), days };
}

const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

export function load() {
  const cur = safe(() => JSON.parse(localStorage.getItem(KEY)), null);
  if (cur) return normalizeData(cur);
  const legacyState = safe(() => JSON.parse(localStorage.getItem(LEGACY.state)), null);
  const legacyDays = safe(() => JSON.parse(localStorage.getItem(LEGACY.days)), null);
  return normalizeData({ state: legacyState, days: legacyDays || {} });
}

export function save(data) {
  safe(() => localStorage.setItem(KEY, JSON.stringify({ app: "anti-clope", version: 4, ...data })), null);
}

export const exportJson = (data) =>
  JSON.stringify({ app: "anti-clope", version: 4, exportedAt: new Date().toISOString(), ...data }, null, 2);

/** Lit un export ; lève une erreur lisible si le contenu n'est pas reconnu. */
export function parseImport(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error("Ce n'est pas du JSON valide."); }
  if (!raw || typeof raw !== "object" || !raw.days || typeof raw.days !== "object") {
    throw new Error("Fichier non reconnu : il manque l'historique (days).");
  }
  return normalizeData(raw);
}

/** Fusionne deux historiques sans doublons (même type + même horodatage). */
export function mergeDays(a, b) {
  const out = {};
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
    const seen = new Set(), list = [];
    [...(a[k] || []), ...(b[k] || [])].forEach((e) => {
      const id = `${e.k}@${e.t}`;
      if (!seen.has(id)) { seen.add(id); list.push(e); }
    });
    list.sort((x, y) => (x.t < y.t ? -1 : 1));
    out[k] = list;
  });
  return out;
}
