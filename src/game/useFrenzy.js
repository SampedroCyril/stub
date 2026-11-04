import { useCallback, useEffect, useRef, useState } from "react";
import { FRENZY } from "./battle.js";
import { play } from "./gfx/sfx.js";

const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * Mode Frénésie : des points faibles en chaîne pendant `duration`, combo, critique tous les 10.
 * onHit({fast, combo, burst}) renvoie les dégâts (ou points) à afficher ; onEnd({score, combo, hits, sec}) en fin de partie.
 */
export function useFrenzy(stageRef, { duration = FRENZY.dur, onHit, onEnd, unit = "-" } = {}) {
  const [active, setActive] = useState(false);
  const st = useRef(null);
  const cbs = useRef({});
  cbs.current = { onHit, onEnd };

  const next = useCallback(() => {
    const s = st.current;
    if (!s) return;
    clearTimeout(s.spot);
    s.spot = setTimeout(() => { if (st.current) stageRef.current?.showWeak(FRENZY.show, FRENZY.fast); }, rnd(FRENZY.gapMin, FRENZY.gapMax));
  }, [stageRef]);

  const stop = useCallback((silent = false) => {
    const s = st.current;
    if (!s) return;
    clearTimeout(s.spot); clearTimeout(s.end);
    st.current = null;
    setActive(false);
    const stage = stageRef.current;
    if (stage) { stage.frenzy = null; stage.hideWeak(); if (!silent) stage.breakCombo(); stage.combo = 0; }
    cbs.current.onEnd?.({ score: s.score, combo: s.maxCombo, hits: s.hits, sec: Math.round((performance.now() - s.start) / 1000), silent });
  }, [stageRef]);

  const start = useCallback(() => {
    const stage = stageRef.current;
    if (st.current || !stage || stage.dead) return;
    stage.hideWeak(); stage.combo = 0; stage.score = 0;
    stage.frenzy = { start: performance.now(), dur: duration };
    st.current = { start: performance.now(), combo: 0, maxCombo: 0, hits: 0, score: 0 };
    st.current.end = setTimeout(() => stop(false), duration);
    setActive(true);
    next();
  }, [stageRef, duration, next, stop]);

  /** Appui sur la scène pendant la Frénésie. */
  const tap = useCallback(({ x, y, weak }) => {
    const s = st.current, stage = stageRef.current;
    if (!s || !stage) return false;
    if (!weak) { stage.miss(x, y); stage.breakCombo(); s.combo = 0; return true; }
    const fast = weak.age < FRENZY.fast;
    stage.hideWeak();
    s.combo++; s.hits++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    const pts = (fast ? 25 : 10) * (1 + Math.floor(s.combo / 10));
    s.score += pts; stage.score = s.score;
    const d = cbs.current.onHit?.({ fast, combo: s.combo, burst: false, pts }) ?? pts;
    stage.combo = s.combo - 1;
    stage.frenzyHit(d, { fast, x, y, label: `${unit}${d}${fast ? "!" : ""}` });
    if (s.combo % 10 === 0) {
      const b = cbs.current.onHit?.({ burst: true, combo: s.combo, pts: 100 }) ?? 100;
      if (unit === "+") { s.score += b; stage.score = s.score; }
      play("combo");
      stage.hit(b, { crit: true, title: `combo x${s.combo}`, label: `${unit}${b}` });
    }
    next();
    return true;
  }, [stageRef, next, unit]);

  /** Un point s'est échappé : le combo casse. */
  const expire = useCallback(() => {
    const s = st.current;
    if (!s) return;
    s.combo = 0;
    stageRef.current?.breakCombo();
    next();
  }, [stageRef, next]);

  useEffect(() => () => { const s = st.current; if (s) { clearTimeout(s.spot); clearTimeout(s.end); } }, []);
  return { active, start, stop, tap, expire };
}
