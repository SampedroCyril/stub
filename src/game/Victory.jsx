import { useEffect, useRef } from "react";
import { useApp } from "../store/AppStore.jsx";
import Pixel from "./Pixel.jsx";
import Cendrier, { stageOf } from "./Cendrier.jsx";
import { BOSSES } from "./bosses.js";
import { CRAV_XP, METHOD_NAME } from "../data/rules.js";
import { pad } from "../lib/util.js";

/** Écran de victoire : le boss disparaît, une clope tombe dans le cendrier. */
export default function Victory() {
  const { victory, setVictory, S } = useApp();
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus({ preventScroll: true }); }, [victory]);
  if (!victory) return null;
  const { battle: b, ev } = victory;
  const B = BOSSES[b.boss];
  const count = S.cravAll.length;
  const st = stageOf(count);
  const close = () => setVictory(null);

  return (
    <div className="modal victory" role="dialog" aria-modal="true" aria-labelledby="v-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet v-sheet">
        <div className="v-stage">
          <Pixel name={B.sprite} className="boss dissolve" />
          <p className="ko" aria-hidden="true">K.O.</p>
          <p className="px-title" id="v-title">VICTOIRE !</p>
          <p className="v-death">{B.death}</p>
        </div>
        <div className="v-stats">
          <div><span className="label">Temps</span><b>{Math.floor(ev.kt / 60)}:{pad(ev.kt % 60)}</b></div>
          <div><span className="label">Arme</span><b>{METHOD_NAME[ev.m].replace(/^(au|en) /, "")}</b></div>
          <div><span className="label">XP sevrage</span><b>+{CRAV_XP[ev.m]}</b></div>
        </div>
        <div className="v-ash">
          <Cendrier count={count} drop />
          <div>
            <b>{count} clope{count > 1 ? "s" : ""} écrasée{count > 1 ? "s" : ""}</b>
            <span>{st.n} · {st.max === Infinity ? "rempli pour toujours" : `${count - st.lo} / ${st.max - st.lo}`}</span>
          </div>
        </div>
        <div className="r-foot"><button ref={btn} className="btn green" type="button" onClick={close}>Continuer</button></div>
      </div>
    </div>
  );
}
