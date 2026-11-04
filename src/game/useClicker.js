import { useCallback, useEffect, useRef, useState } from "react";
import { milestonesFor, tierFor, damageFor, cadence, pauseAfter } from "./combo.js";
import { perksOf } from "../data/skills.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const NO_TRAITS = { spot: 1, size: 1, crit: 1, tempt: 1 };

/**
 * Moteur du combat clicker, partagé par le combat de boss et l'Arcade.
 * - Points faibles en chaîne, combo, neuf paliers d'impact calés sur l'intensité, transe.
 * - Un raté ou un point qui s'échappe remet le combo à zéro (sauf ratés pardonnés par les compétences).
 * Options : intensity, skills (compétences possédées), traits du boss, duration (ms, facultatif),
 * lives (facultatif : la partie s'arrête à 0), ramp (accélère avec le temps), unit (« - » ou « + »).
 * onHit({dmg, tier, fast, combo}) applique les dégâts et peut renvoyer les dégâts réels ; onMiss() ; onEnd(résultat).
 */
export function useClicker(stageRef, opts) {
  const o = useRef(opts);
  o.current = opts;
  const [active, setActive] = useState(false);
  const [view, setView] = useState({ combo: 0, lives: null });
  const st = useRef(null);

  const perks = () => perksOf(o.current.skills);
  const traits = () => o.current.traits || NO_TRAITS;

  const next = useCallback((pause = 0) => {
    const s = st.current;
    if (!s || s.paused) return;
    clearTimeout(s.spot);
    const p = perks(), c = cadence(s.combo, { show: p.show, spot: traits().spot });
    const ramp = o.current.ramp ? Math.max(0.6, 1 - (performance.now() - s.start) / 150000) : 1;
    s.spot = setTimeout(() => {
      const stg = stageRef.current;
      if (!st.current || st.current.paused || !stg || stg.dead) return;
      stg.hitR = 8 * traits().size * p.hitR; stg.koStyle = p.ko;
      stg.showWeak(Math.round(c.showMs * ramp), p.fastMs);
    }, pause + rnd(c.gapMin, c.gapMax) * ramp);
  }, [stageRef]);

  const stop = useCallback((silent = false) => {
    const s = st.current;
    if (!s) return;
    clearTimeout(s.spot); clearTimeout(s.end);
    st.current = null;
    setActive(false);
    const stg = stageRef.current;
    if (stg) { stg.frenzy = null; stg.hideWeak(); stg.exitTrance(); stg.combo = 0; }
    o.current.onEnd?.({ score: s.score, combo: s.maxCombo, hits: s.hits, sec: Math.round((performance.now() - s.start) / 1000), silent, lives: s.lives });
  }, [stageRef]);

  const start = useCallback(() => {
    const stg = stageRef.current;
    if (st.current || !stg || stg.dead) return;
    const p = perks(), d = o.current.duration;
    st.current = { start: performance.now(), combo: 0, maxCombo: 0, hits: 0, score: 0, trance: false, forgive: p.forgive, lives: o.current.lives ?? null, paused: false };
    stg.hideWeak(); stg.combo = 0; stg.score = 0; stg.koStyle = p.ko;
    stg.frenzy = d ? { start: performance.now(), dur: d } : null;
    if (d) st.current.end = setTimeout(() => stop(false), d);
    setActive(true);
    setView({ combo: 0, lives: st.current.lives });
    next(300);
  }, [stageRef, next, stop]);

  const breakCombo = useCallback((x, y) => {
    const s = st.current, stg = stageRef.current;
    if (!s || !stg) return;
    if (s.forgive > 0 && s.combo > 0) {
      s.forgive--;
      stg.float(`pardonné (${s.forgive})`, x ?? 32, (y ?? 24) - 3, { color: "#73eff7" });
      next();
      return;
    }
    if (x != null) stg.miss(x, y);
    stg.breakCombo(); stg.exitTrance();
    s.combo = 0; s.trance = false;
    o.current.onMiss?.();
    if (s.lives != null) {
      s.lives--;
      setView({ combo: 0, lives: s.lives });
      if (s.lives <= 0) { stop(false); return; }
    } else setView((v) => ({ ...v, combo: 0 }));
    next(250);
  }, [stageRef, next, stop]);

  /** Appui sur la scène. Renvoie false si le clicker ne tourne pas. */
  const tap = useCallback(({ x, y, weak }) => {
    const s = st.current, stg = stageRef.current;
    if (!s || !stg || s.paused) return false;
    if (!weak) { breakCombo(x, y); return true; }
    const p = perks(), ms = milestonesFor(o.current.intensity, p.early);
    const fast = weak.age < p.fastMs;
    stg.hideWeak();
    s.combo++; s.hits++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    const tier = tierFor(s.combo, ms);
    if (tier === 9) s.trance = true;
    const shown = Math.min(tier, p.unlocked);
    const dmg = damageFor(tier, { fast, trance: s.trance, combo: s.combo, ms, power: p.power, crit: traits().crit });
    const d = o.current.onHit?.({ dmg, tier, shown, fast, combo: s.combo, maxCombo: s.maxCombo }) ?? dmg;
    s.score += d;
    stg.score = s.score; stg.combo = s.combo; stg.comboPop = 6;
    stg.tier(shown, d, { x, y, combo: s.combo, label: `${o.current.unit || "-"}${d}${fast ? "!" : ""}` });
    setView((v) => ({ ...v, combo: s.combo }));
    next(pauseAfter(shown));
    return true;
  }, [stageRef, next, breakCombo]);

  /** Un point s'est échappé. */
  const expire = useCallback(() => { if (st.current && !st.current.paused) breakCombo(); }, [breakCombo]);
  /** Pause (tentation, K.O. intermédiaire) et reprise. */
  const pause = useCallback(() => { const s = st.current; if (!s) return; s.paused = true; clearTimeout(s.spot); stageRef.current?.hideWeak(); }, [stageRef]);
  const resume = useCallback((delay = 300) => { const s = st.current; if (!s) return; s.paused = false; next(delay); }, [next]);
  const state = useCallback(() => st.current, []);

  useEffect(() => () => { const s = st.current; if (s) { clearTimeout(s.spot); clearTimeout(s.end); } }, []);
  return { active, view, start, stop, tap, expire, pause, resume, breakCombo, state };
}
