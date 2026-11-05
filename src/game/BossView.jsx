import { useEffect, useRef } from "react";
import { BossStage } from "./gfx/BossStage.js";
import { useApp } from "../store/AppStore.jsx";
import { useArsenal } from "./useArsenal.js";

/**
 * Scène de combat en canvas (gfx/BossStage) dans un composant React.
 * stageRef reçoit l'instance BossStage ; onTap / onWeakExpire peuvent changer sans recréer la scène.
 */
export default function BossView({ stageRef, boss, maxHp, hp, lvl = 1, training = false, onTap, onWeakExpire, className = "" }) {
  const { state } = useApp();
  const arsenal = useArsenal();
  const cv = useRef(null), cbs = useRef({}), ars = useRef(arsenal);
  ars.current = arsenal;
  cbs.current = { onTap, onWeakExpire };
  const intense = state.intense ?? !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const s = new BossStage(cv.current, {
      boss, maxHp, hp, lvl, training, intense,
      shakeEl: cv.current.closest(".fight-in, .arena") || cv.current.parentElement,
      fxRoot: cv.current.closest(".fight") || document.getElementById("root"),
      onTap: (e) => cbs.current.onTap?.(e),
      onWeakExpire: () => cbs.current.onWeakExpire?.(),
    });
    // Arsenal : réserves d'ultimes et de K.O., signature tirée pour tout le combat
    const a = ars.current;
    s.ultPool = a.ult; s.koPool = a.ko;
    const one = (l) => l[(Math.random() * l.length) | 0];
    s.hitSkin = one(a.sig); s.aura = one(a.aura); s.counter = one(a.counter);
    stageRef.current = s;
    return () => { s.destroy(); if (stageRef.current === s) stageRef.current = null; };
    // la scène n'est recréée que pour un autre boss ou un autre combat
  }, [boss, maxHp, lvl, training]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (stageRef.current) stageRef.current.intense = intense; }, [intense, stageRef]);

  return <div className={`boss-view ${className}`}><canvas ref={cv} className="boss-canvas" aria-label="Le boss et la jauge de rythme : touche l'écran quand les cercles arrivent au centre" /></div>;
}
