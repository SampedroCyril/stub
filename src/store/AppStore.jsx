import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { compute } from "../lib/compute.js";
import { load, save, DEFAULT_STATE } from "../lib/storage.js";
import { dayKey } from "../lib/util.js";
import { BADGES, TIER_NAMES, badgeSnapshot } from "../data/badges.js";
import { EARN } from "../game/shop.js";
import { DEFIS } from "../data/defis.js";
import { DEFI_XP, Q_TITLES, S_TITLES, P_TITLES, CRAV_XP, METHOD_NAME, titleOf } from "../data/rules.js";
import { createBattle, hit, hpAt, victoryEvent, bestiary, RANK_XP } from "../game/battle.js";
import { BOSSES } from "../game/bosses.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

/**
 * Navigation : les sections en bas de l'écran, chacune avec ses sous-onglets.
 * Les Réglages généraux ne sont pas dans la barre : on y va par la roue crantée de l'Accueil (nav: false).
 */
export const SECTIONS = [
  { id: "accueil", label: "Accueil", icon: "home", views: ["accueil"] },
  { id: "sevrage", label: "Sevrage", icon: "leaf", views: ["sevrage", "respirer"] },
  { id: "sante", label: "Santé", icon: "heart", views: ["sante", "symptomes", "risques"], optional: true, d: "Ton corps qui récupère, tes symptômes de sevrage, ce que fait la clope." },
  { id: "sport", label: "Sport", icon: "dumbbell", views: ["circuit", "records", "exos"], optional: true, d: "Circuits, records caméra, exercices. Masquée : plus de « Bouger » quand tu notes une envie." },
  { id: "joueur", label: "Joueur", icon: "gamepad", views: ["talents", "boutique", "arcade", "bestiaire"], optional: true, d: "Combats de boss, talents, boutique, Arcade, bestiaire. Masquée : plus de « Combat » quand tu notes une envie." },
  { id: "progres", label: "Progrès", icon: "trophy", views: ["defis", "badges", "stats"], optional: true, d: "Défis de la semaine, badges, statistiques." },
  { id: "reglages", label: "Réglages", icon: "gear", views: ["reglages"], nav: false },
];
export const SUB_LABELS = { sevrage: "Envies", respirer: "Respirer", sante: "Récupération", symptomes: "Symptômes", risques: "La clope", circuit: "Circuit", records: "Records", exos: "Exos", talents: "Talents", boutique: "Boutique", arcade: "Arcade", bestiaire: "Boss", defis: "Défis", badges: "Badges", stats: "Stats" };
/** Sections de la barre du bas, selon les réglages (Accueil et Sevrage sont toujours là). */
export const visibleSections = (state) => SECTIONS.filter((s) => s.nav !== false && (!s.optional || state?.sections?.[s.id] !== false));
export const sectionOn = (state, id) => state?.sections?.[id] !== false;
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
    if (after.player.L > before.player.L) msgs.push(`Joueur niveau ${after.player.L} : ${titleOf(P_TITLES, after.player.L)}. Un point de talent à dépenser !`);
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
    return { k: "craving", t: (c?.at || new Date()).toISOString(), m, ...(c?.intensity ? { iv: c.intensity, i: Math.ceil(c.intensity / 2) } : {}), ...(c?.trigger ? { tr: c.trigger } : {}) };
  }, [flow.craving]);
  const resetFlow = useCallback(() => setFlow({ mode: "idle" }), []);

  /* ---- combats ---- */
  const setBattle = useCallback((b) => {
    battleRef.current = b;
    setBattleState(b);
    try { b ? localStorage.setItem(BATTLE_KEY, JSON.stringify(b)) : localStorage.removeItem(BATTLE_KEY); } catch { /* sans effet */ }
  }, []);
  const startBattle = useCallback(() => {
    const c = flow.craving || { at: new Date(), intensity: null, trigger: null };
    const victories = Object.fromEntries(Object.entries(bestiary(S.ev)).map(([k, v]) => [k, v.wins]));
    setBattle(createBattle({ at: new Date(c.at), iv: c.intensity, trigger: c.trigger, victories }));
    setFlow({ mode: "idle" });
    go("sevrage");
  }, [flow.craving, S.ev, setBattle, go]);
  /** Attaque le boss en cours (dégâts en PV, négatifs pour un soin) ; renvoie les dégâts infligés. */
  const hitBattle = useCallback((src, d) => {
    const b = battleRef.current;
    if (!b) return 0;
    const r = hit(b, src, d, new Date());
    setBattle(r.battle);
    return r.dmg;
  }, [setBattle]);
  /** Met à jour des infos du combat en cours (combo max…). */
  const patchBattle = useCallback((p) => { const b = battleRef.current; if (b) setBattle({ ...b, ...p }); }, [setBattle]);
  /** Envie tenue sans combat (respiration, circuit) : on l'enregistre et on écrase la clope au cendrier. */
  const holdCraving = useCallback((m, craving, extraEvents = [], msg = [], patch) => {
    const ev = cravingEvent(m, craving);
    setFlow({ mode: "idle" });
    setVictory({ battle: null, ev });
    commit([...extraEvents, ev], [`Envie tenue ${METHOD_NAME[m]} : +${CRAV_XP[m]} XP sevrage · +${EARN.craving} mégots`, ...msg], patch);
  }, [cravingEvent, commit]);
  const winBattle = useCallback(() => {
    const b = battleRef.current;
    if (!b) return;
    const t = new Date(), ev = victoryEvent(b, t);
    setBattle(null);
    setFlow({ mode: "idle" });
    setVictory({ battle: b, ev });
    commit([ev], [`${BOSSES[b.boss].n} vaincu${ev.rk ? ` (rang ${ev.rk})` : ""} : +${CRAV_XP[ev.m] + (RANK_XP[ev.rk] || 0)} XP sevrage · +${EARN.craving + (ev.rk === "S" ? EARN.rankS : 0)} mégots`]);
  }, [commit, setBattle]);
  const fleeBattle = useCallback(() => { setBattle(null); setFlow({ mode: "idle" }); }, [setBattle]);

  // Victoire automatique si les PV sont à 0 hors de l'écran de combat (sauf attaque en cours).
  useEffect(() => {
    if (battle && !flow.attack && !battleView.current && hpAt(battle, now) <= 0) winBattle();
  }, [battle, now, flow.attack, winBattle]);

  const value = {
    data, state: data.state, days: data.days, S, now, view, go, toast, flash,
    flow, setFlow, startCraving, setCravingField, cravingEvent, resetFlow,
    battle, startBattle, hitBattle, patchBattle, holdCraving, winBattle, fleeBattle, victory, setVictory, queueFx, takeFx, battleView,
    commit, patchState, replaceData, wipe,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
