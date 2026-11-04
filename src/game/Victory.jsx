import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { AshtrayScene } from "./gfx/Ashtray.js";
import { BOSSES } from "./bosses.js";
import { CRAV_XP, METHOD_NAME, playerXpOf } from "../data/rules.js";
import { RANK_XP } from "./battle.js";
import { pad, pl } from "../lib/util.js";

/** Écran de victoire : la clope de l'envie s'écrase et s'éteint dans le cendrier. */
export default function Victory() {
  const { victory, setVictory, S } = useApp();
  const btn = useRef(null), cv = useRef(null);
  const [count, setCount] = useState(0);
  const total = S.cravAll.length;

  useEffect(() => {
    if (!victory) return;
    setCount(Math.max(0, total - 1));
    const scene = new AshtrayScene(cv.current, { count: Math.max(0, total - 1), onCount: setCount });
    btn.current?.focus({ preventScroll: true });
    return () => scene.destroy();
  }, [victory]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!victory) return null;
  const { battle: b, ev } = victory;
  const B = b ? BOSSES[b.boss] : null;
  const pxp = playerXpOf(ev);
  const close = () => setVictory(null);

  return (
    <div className="modal victory" role="dialog" aria-modal="true" aria-labelledby="v-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet v-sheet">
        <div className="v-stage">
          {ev.rk && <p className={`rank rank-${ev.rk}`} aria-label={`Rang ${ev.rk}`}>{ev.rk}</p>}
          <p className="px-title" id="v-title">{B ? "VICTOIRE !" : "ENVIE TENUE !"}</p>
          <p className="v-death">{B ? B.death : `Tenue ${METHOD_NAME[ev.m]}. Elle finit au cendrier.`}</p>
        </div>
        <div className="v-ash">
          <canvas ref={cv} className="ash-canvas" aria-label="La clope s'écrase et s'éteint dans le cendrier" />
          <p className="v-count"><b key={count}>{count}</b> {pl(count, "clope").replace(/^\d+ /, "")} écrasée{count > 1 ? "s" : ""}</p>
        </div>
        <div className="v-stats">
          {B ? <div><span className="label">Temps</span><b>{Math.floor(ev.kt / 60)}:{pad(ev.kt % 60)}</b></div> : null}
          {B ? <div><span className="label">Combo max</span><b>{ev.mc || 0}</b>{pxp ? <small className="v-bonus">+{pxp} XP joueur</small> : null}</div> : <div><span className="label">Façon</span><b>{{ breath: "Respiration", sport: "Sport", game: "Combat" }[ev.m] || "Tenue"}</b></div>}
          <div><span className="label">XP sevrage</span><b>+{CRAV_XP[ev.m] + (RANK_XP[ev.rk] || 0)}</b>{RANK_XP[ev.rk] ? <small className="v-bonus">dont +{RANK_XP[ev.rk]} rang {ev.rk}</small> : null}</div>
        </div>
        <div className="r-foot"><button ref={btn} className="btn green" type="button" onClick={close}>Continuer</button></div>
      </div>
    </div>
  );
}
