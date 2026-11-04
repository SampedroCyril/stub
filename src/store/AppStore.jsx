import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { compute } from "../lib/compute.js";
import { load, save, DEFAULT_STATE } from "../lib/storage.js";
import { dayKey } from "../lib/util.js";
import { BADGES, TIER_NAMES, badgeSnapshot } from "../data/badges.js";
import { DEFIS } from "../data/defis.js";
import { DEFI_XP, Q_TITLES, S_TITLES, CRAV_XP, titleOf } from "../data/rules.js";
import { createBattle, hit, hpAt, victoryEvent, bestiary, RANK_XP } from "../game/battle.js";
import { BOSSES } from "../game/bosses.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

/** Navigation : 5 sections en bas de l'écran, chacune avec ses sous-onglets. */
export const SECTIONS = [
  { id: "accueil", label: "Accueil", icon: "home", views: ["accueil"] },
  { id: "sevrage", label: "Sevrage", icon: "leaf", views: ["sevrage", "respirer", "arcade", "sante"] },
  { id: "sport", label: "Sport", icon: "dumbbell", views: ["circuit", "records", "exos"] },
  { id: "progres", label: "Progrès", icon: "trophy", views: ["defis", "bestiaire", "badges", "stats"] },
  { id: "reglages", label: "Réglages", icon: "gear", views: ["reglages"] },
];
export const SUB_LABELS = { sevrage: "Envies", respirer: "Respirer", arcade: "Arcade", sante: "Santé", circuit: "Circuit", records: "Records", exos: "Exos", defis: "Défis", bestiaire: "Boss", badges: "Badges", stats: "Stats" };
export const VIEWS = SECTIONS.flatMap((s) => s.views);
export const sectionOf = (v) => SECTIONS.find((s) => s.views.includes(v)) || SECTIONS[0];
const viewFromHash = () => {
  const v = location.hash.replace(/^#/, "");
  return VIEWS.includes(v) ? v : "accueil";
};

const CRAVING_MS = 5 * 60 * 1000;
const BATTLE_KEY = "anticlope:battle";

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
  /** Combat contre le boss d'une envie, gardé en mémoire pour survivre à une fermeture de l'app. */
  const [battle, setBattleState] = useState(() => { try { return JSON.parse(localStorage.getItem(BATTLE_KEY)); } catch { return null; } });
  const battleRef = useRef(battle);
  battleRef.current = battle;
  const [victory, setVictory] = useState(null);
  /** Effets à jouer au retour sur l'écran de combat (coup du circuit, respiration). */
  const fxQueue = useRef([]);
  const queueFx = useCallback((fx) => { fxQueue.current.push(fx); }, []);
  const takeFx = useCallback(() => { const q = fxQueue.current; fxQueue.current = []; return q; }, []);
  /** Vrai tant que l'écran de combat est affiché : c'est lui qui joue le K.O. et déclare la victoire. */
  const battleView = useRef(false);

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

  /* ---- combats ---- */
  const setBattle = useCallback((b) => {
    battleRef.current = b;
    setBattleState(b);
    try { b ? localStorage.setItem(BATTLE_KEY, JSON.stringify(b)) : localStorage.removeItem(BATTLE_KEY); } catch { /* sans effet */ }
  }, []);
  const startBattle = useCallback((crisis = false) => {
    const c = flow.craving || { at: new Date(), intensity: null, trigger: null };
    const victories = Object.fromEntries(Object.entries(bestiary(S.ev)).map(([k, v]) => [k, v.wins]));
    setBattle(createBattle({ at: new Date(c.at), intensity: c.intensity, trigger: c.trigger, victories, crisis }));
    setFlow({ mode: "idle" });
    go("sevrage");
  }, [flow.craving, S.ev, setBattle, go]);
  /** Attaque le boss en cours ; renvoie les dégâts infligés. */
  const hitBattle = useCallback((src, frac) => {
    const b = battleRef.current;
    if (!b) return 0;
    const r = hit(b, src, frac, new Date());
    setBattle(r.battle);
    return r.dmg;
  }, [setBattle]);
  const winBattle = useCallback(() => {
    const b = battleRef.current;
    if (!b) return;
    const t = new Date(), ev = victoryEvent(b, t);
    setBattle(null);
    setFlow({ mode: "idle" });
    setVictory({ battle: b, ev });
    commit([ev], [`${BOSSES[b.boss].n} vaincu${ev.rk ? ` (rang ${ev.rk})` : ""} : +${CRAV_XP[ev.m] + (RANK_XP[ev.rk] || 0)} XP sevrage`]);
  }, [commit, setBattle]);
  const fleeBattle = useCallback(() => { setBattle(null); setFlow({ mode: "idle" }); }, [setBattle]);

  // Un boss s'épuise même app fermée : victoire automatique quand ses PV tombent à 0 (sauf attaque en cours).
  useEffect(() => {
    if (battle && !flow.attack && !battleView.current && hpAt(battle, now) <= 0) winBattle();
  }, [battle, now, flow.attack, winBattle]);

  const value = {
    data, state: data.state, days: data.days, S, now, view, go, toast, flash,
    flow, setFlow, startCraving, setCravingField, cravingEvent, resetFlow,
    battle, startBattle, hitBattle, winBattle, fleeBattle, victory, setVictory, queueFx, takeFx, battleView,
    commit, patchState, replaceData, wipe,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
