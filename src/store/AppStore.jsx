import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { compute } from "../lib/compute.js";
import { load, save, DEFAULT_STATE } from "../lib/storage.js";
import { dayKey } from "../lib/util.js";
import { BADGES, TIER_NAMES, badgeSnapshot } from "../data/badges.js";
import { DEFIS } from "../data/defis.js";
import { DEFI_XP, Q_TITLES, S_TITLES, titleOf } from "../data/rules.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export const VIEWS = ["accueil", "sevrage", "circuit", "respirer", "sante", "defis", "badges", "stats", "exos"];
const viewFromHash = () => {
  const v = location.hash.replace(/^#/, "");
  return VIEWS.includes(v) ? v : "accueil";
};

const CRAVING_MS = 5 * 60 * 1000;

export function AppProvider({ children }) {
  const [data, setData] = useState(load);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState(viewFromHash);
  const [toast, setToast] = useState(null);
  /**
   * flow.mode : "idle" | "craving" | "circuit" | "breath"
   * flow.craving : {at, endsAt, intensity, trigger} pendant une envie en cours
   * flow.override : paire d'exos tirée au hasard
   */
  const [flow, setFlow] = useState({ mode: "idle" });

  useEffect(() => { save(data); }, [data]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const on = () => setView(viewFromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  const S = useMemo(() => compute(data.state, data.days, now), [data, now]);

  const go = useCallback((v) => {
    if (location.hash !== `#${v}`) location.hash = v;
    setView(v);
    window.scrollTo(0, 0);
  }, []);

  const flash = useCallback((msgs) => {
    if (!msgs.length) return;
    setToast({ msgs, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(id);
  }, [toast]);

  const patchState = useCallback((patch) => {
    setData((d) => ({ ...d, state: { ...d.state, ...patch } }));
  }, []);

  /** Enregistre des événements et annonce niveaux, défis et badges débloqués. */
  const commit = useCallback((events, extra = [], statePatch = null) => {
    const t = new Date();
    const cur = dataRef.current;
    const before = compute(cur.state, cur.days, t);
    const days = { ...cur.days };
    events.forEach((ev) => {
      const k = dayKey(new Date(ev.t));
      days[k] = [...(days[k] || []), ev];
    });
    const state = statePatch ? { ...cur.state, ...statePatch } : cur.state;
    const after = compute(state, days, t);
    const msgs = [...extra];
    const won = new Set(before.allWins.map((d) => `${d.id}@${+d.doneAt}`));
    after.allWins.forEach((d) => { if (!won.has(`${d.id}@${+d.doneAt}`)) msgs.push(`Défi réussi : ${DEFIS[d.id].n} (+${DEFI_XP} XP)`); });
    if (after.quit.L > before.quit.L) msgs.push(`Sevrage niveau ${after.quit.L} : ${titleOf(Q_TITLES, after.quit.L)}`);
    if (after.sport.L > before.sport.L) msgs.push(`Sport niveau ${after.sport.L} : ${titleOf(S_TITLES, after.sport.L)}`);
    const b0 = badgeSnapshot(before), b1 = badgeSnapshot(after);
    BADGES.forEach((b) => { if (b1[b.id] > b0[b.id]) msgs.push(`Badge ${b.n} ${TIER_NAMES[b1[b.id] - 1]} débloqué`); });
    const next = { state, days };
    dataRef.current = next;
    setData(next);
    setNow(t);
    flash(msgs);
  }, [flash]);

  const replaceData = useCallback((next) => { dataRef.current = next; setData(next); setNow(new Date()); }, []);
  const wipe = useCallback(() => {
    const st = { ...DEFAULT_STATE, quitAt: dataRef.current.state.quitAt, startAt: dataRef.current.state.quitAt };
    replaceData({ state: st, days: {} });
  }, [replaceData]);

  /* ---- parcours d'une envie / d'un circuit ---- */
  const startCraving = useCallback(() => {
    const at = new Date();
    setFlow({ mode: "craving", craving: { at, endsAt: +at + CRAVING_MS, intensity: null, trigger: null } });
    go("sevrage");
  }, [go]);
  const setCravingField = useCallback((k, v) => {
    setFlow((f) => (f.craving ? { ...f, craving: { ...f.craving, [k]: f.craving[k] === v ? null : v } } : f));
  }, []);
  const cravingEvent = useCallback((m, craving) => {
    const c = craving || flow.craving;
    return { k: "craving", t: (c?.at || new Date()).toISOString(), m, ...(c?.intensity ? { i: c.intensity } : {}), ...(c?.trigger ? { tr: c.trigger } : {}) };
  }, [flow.craving]);
  const resetFlow = useCallback(() => setFlow({ mode: "idle" }), []);

  const value = {
    data, state: data.state, days: data.days, S, now, view, go, toast, flash,
    flow, setFlow, startCraving, setCravingField, cravingEvent, resetFlow,
    commit, patchState, replaceData, wipe,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
