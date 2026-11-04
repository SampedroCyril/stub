import { useCallback, useEffect, useRef, useState } from "react";
import { milestonesFor, tierFor, damageFor, approachMs, judge, NOTE_GAP, WINDOW, CIG_EVERY, STREAK, STREAK_BONUS, pauseAfter } from "./combo.js";
import { perksOf } from "../data/skills.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const NO_TRAITS = { spot: 1, size: 1, crit: 1, tempt: 1 };

/**
 * Moteur du combat en rythme, partagé par le combat de boss et l'Arcade.
 * - Jauge : deux cercles partent des bords et se rejoignent au centre ; on touche l'écran quand ils y sont.
 *   Parfait ou bon : le combo monte et le boss encaisse (neuf paliers d'impact). Trop tôt, trop tard : combo à zéro.
 * - De temps en temps, ce sont deux clopes qui arrivent : il ne faut PAS toucher. Elles s'écrasent au centre et le boss
 *   encaisse un refus ; toucher, c'est la prendre : le boss se soigne et le combo casse.
 * Options : intensity, skills, traits, duration (ms), lives, ramp (accélère avec le temps), unit (« - » ou « + »).
 * onHit({dmg, tier, shown, fast, combo, maxCombo}) applique les dégâts et peut renvoyer les dégâts réels.
 * onCig(took) applique le refus (took = false) ou la rechute de jeu (took = true) et renvoie la valeur à afficher.
 */
export function useClicker(stageRef, opts) {
  const o = useRef(opts);
  o.current = opts;
  const [active, setActive] = useState(false);
  const [view, setView] = useState({ combo: 0, lives: null });
  const st = useRef(null);

  const perks = () => perksOf(o.current.skills);
  const traits = () => o.current.traits || NO_TRAITS;
  const windows = () => {
    const p = perks();
    return { perfect: WINDOW.perfect + p.perfectMs, good: WINDOW.good * p.goodWin * traits().size, late: WINDOW.late };
  };

  /** Lance la note suivante après une pause. */
  const next = useCallback((pause = 0) => {
    const s = st.current;
    if (!s || s.paused || s.hold) return;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => launch(), pause + NOTE_GAP);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const launch = () => {
    const s = st.current, stg = stageRef.current;
    if (!s || s.paused || s.hold || !stg || stg.dead) return;
    s.notes++;
    const cig = o.current.cigs !== false && s.notes >= s.nextCig;
    if (cig) s.nextCig = s.notes + Math.round(rnd(CIG_EVERY[0], CIG_EVERY[1]) * traits().tempt);
    const ramp = o.current.ramp ? Math.max(0.6, 1 - (performance.now() - s.start) / 150000) : 1;
    const w = windows();
    const dur = approachMs(s.combo, perks().slow / traits().spot * ramp);
    s.note = { t0: performance.now(), dur, kind: cig ? "cig" : "hit", ...w };
    const gg = o.current.gaugeRef?.current;
    if (gg) gg.note = s.note;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => expire(), dur + w.good + w.late + 30);
  };

  const endNote = (kind) => {
    const s = st.current, stg = stageRef.current;
    if (!s) return;
    s.note = null;
    const gg = o.current.gaugeRef?.current;
    if (gg) { gg.note = null; gg.judge(kind); }
    if (kind === "perfect") s.perfects++;
    else if (kind !== "refused") s.perfects = 0;
    void stg;
  };

  const stop = useCallback((silent = false) => {
    const s = st.current;
    if (!s) return;
    clearTimeout(s.timer); clearTimeout(s.end);
    st.current = null;
    setActive(false);
    const stg = stageRef.current;
    if (stg) { stg.frenzy = null; stg.exitTrance(); stg.combo = 0; }
    const gg = o.current.gaugeRef?.current;
    if (gg) { gg.note = null; gg.streak = 0; }
    o.current.onEnd?.({ score: s.score, combo: s.maxCombo, hits: s.hits, sec: Math.round((performance.now() - s.start) / 1000), silent, lives: s.lives });
  }, [stageRef]);

  const breakCombo = () => {
    const s = st.current, stg = stageRef.current;
    if (!s || !stg) return false;
    if (s.forgive > 0 && s.combo > 0) { s.forgive--; stg.forgiven(s.forgive); return false; }
    stg.breakCombo(); stg.exitTrance();
    s.combo = 0; s.trance = false;
    if (s.lives != null) {
      s.lives--;
      setView({ combo: 0, lives: s.lives });
      if (s.lives <= 0) { stop(false); return true; }
    } else setView((v) => ({ ...v, combo: 0 }));
    return false;
  };

  /** Un appui n'importe où sur l'écran de combat. */
  const tap = useCallback(() => {
    const s = st.current, stg = stageRef.current;
    if (!s || !stg || s.paused || s.hold || !s.note) return false;
    const n = s.note;
    clearTimeout(s.timer);
    if (n.kind === "cig") {
      // toucher la clope, c'est la prendre
      endNote("took");
      stg.miss(32, 30);
      o.current.onCig?.(true);
      if (!breakCombo()) next(500);
      return true;
    }
    const res = judge(performance.now() - (n.t0 + n.dur), n);
    if (res === "miss") { endNote("miss"); stg.miss(32, 30); if (!breakCombo()) next(250); return true; }
    endNote(res);
    const p = perks(), ms = milestonesFor(o.current.intensity, p.early), fast = res === "perfect";
    s.combo++; s.hits++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    const tier = tierFor(s.combo, ms);
    if (tier === 9) s.trance = true;
    const shown = Math.min(tier, p.unlocked);
    const dmg = damageFor(tier, { fast, trance: s.trance, combo: s.combo, ms, power: p.power, crit: traits().crit });
    const d = o.current.onHit?.({ dmg, tier, shown, fast, combo: s.combo, maxCombo: s.maxCombo }) ?? dmg;
    s.score += d;
    stg.score = s.score; stg.combo = s.combo;
    stg.tier(shown, d, { combo: s.combo, label: `${o.current.unit || "-"}${d}` });
    // série de parfaits : bonus
    if (s.perfects >= STREAK) {
      s.perfects = 0;
      const bonus = Math.round(STREAK_BONUS * p.power);
      const b = o.current.onHit?.({ dmg: bonus, tier: 3, shown: 3, fast: true, combo: s.combo, maxCombo: s.maxCombo }) ?? bonus;
      s.score += b;
      setTimeout(() => stageRef.current?.tier(3, b, { label: `${o.current.unit || "-"}${b}` }), 160);
    }
    setView((v) => ({ ...v, combo: s.combo }));
    next(pauseAfter(shown));
    return true;
  }, [stageRef, next]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Rien n'a été touché à temps : raté pour les cercles, refus réussi pour une clope. */
  const expire = () => {
    const s = st.current, stg = stageRef.current;
    if (!s || !s.note || !stg) return;
    if (s.note.kind === "cig") {
      endNote("refused");
      const d = o.current.onCig?.(false);
      if (d != null) stg.refused(d);
      next(700);
      return;
    }
    endNote("miss");
    if (!breakCombo()) next(250);
  };

  const start = useCallback(() => {
    const stg = stageRef.current;
    if (st.current || !stg || stg.dead) return;
    const p = perks(), d = o.current.duration;
    st.current = {
      start: performance.now(), combo: 0, maxCombo: 0, hits: 0, score: 0, trance: false, forgive: p.forgive,
      lives: o.current.lives ?? null, paused: false, notes: 0, nextCig: Math.round(rnd(6, 10) * traits().tempt), note: null, perfects: 0,
    };
    stg.combo = 0; stg.score = 0; stg.koStyle = p.ko;
    stg.frenzy = d ? { start: performance.now(), dur: d } : null;
    if (d) { st.current.endAt = performance.now() + d; st.current.end = setTimeout(() => stop(false), d); }
    setActive(true);
    setView({ combo: 0, lives: st.current.lives });
    next(500);
  }, [stageRef, next, stop]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Pause (K.O. intermédiaire du Boss Run) et reprise. */
  const pause = useCallback(() => {
    const s = st.current;
    if (!s) return;
    s.paused = true; s.note = null;
    clearTimeout(s.timer);
    const gg = o.current.gaugeRef?.current;
    if (gg) gg.note = null;
  }, [stageRef]);
  const resume = useCallback((delay = 300) => {
    const s = st.current;
    if (!s) return;
    s.paused = false;
    const stg = stageRef.current;
    if (stg) { stg.combo = s.combo; stg.koStyle = perks().ko; }
    next(delay);
  }, [stageRef, next]); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * Pause demandée par le joueur (bouton pause, flèche retour, appli en arrière-plan) : la note en vol est annulée
   * sans pénalité, le chrono de la partie s'arrête. Renvoie la durée de la pause à la reprise.
   */
  const hold = useCallback((on) => {
    const s = st.current;
    if (!s) return 0;
    const now = performance.now(), gg = o.current.gaugeRef?.current, stg = stageRef.current;
    if (on) {
      if (s.hold) return 0;
      s.hold = now; s.note = null;
      clearTimeout(s.timer);
      if (gg) gg.note = null;
      if (s.end) { clearTimeout(s.end); s.endLeft = s.endAt - now; }
      return 0;
    }
    if (!s.hold) return 0;
    const d = now - s.hold;
    s.hold = 0; s.start += d;
    if (stg?.frenzy) stg.frenzy.start += d;
    if (s.endLeft != null) { s.endAt = now + s.endLeft; s.end = setTimeout(() => stop(false), s.endLeft); s.endLeft = null; }
    next(500);
    return d;
  }, [stageRef, next, stop]);
  const state = useCallback(() => st.current, []);

  useEffect(() => () => { const s = st.current; if (s) { clearTimeout(s.timer); clearTimeout(s.end); } }, []);
  return { active, view, start, stop, tap, pause, resume, hold, state };
}
