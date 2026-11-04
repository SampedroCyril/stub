import { useApp } from "../store/AppStore.jsx";
import { Panel, Dots } from "../components/ui.jsx";
import Figure from "../art/Figure.jsx";
import { EX, RENFO, CARDIO } from "../data/exercises.js";
import { isUnlocked } from "../lib/circuit.js";
import { cameraSupported } from "../pose/counters.js";

function ExCard({ k, sportL }) {
  const x = EX[k], lock = !isUnlocked(k, sportL);
  return (
    <article className={`ex${lock ? " locked" : ""}`} id={`ex-${k}`}>
      <figure><Figure name={x.fig} /></figure>
      <div className="ex-body">
        <div className="ex-top"><h3>{x.n}</h3><Dots d={x.d} /></div>
        <div className="chips">
          <span className={`chip ${x.t}`}>{x.t}</span>
          <span className="chip">{x.u === "s" ? `${x.d} XP / 3 s` : `${x.d} XP / rep`}</span>
          {x.side && <span className="chip">{x.side} · XP ×2</span>}
          {cameraSupported(k) && <span className="chip cam">Caméra · {x.cam}</span>}
          {lock && <span className="chip lock">Niveau sport {x.lv}</span>}
        </div>
        <p>{x.desc}</p>
        <p className="cue"><b>Clé :</b> {x.cue}</p>
      </div>
    </article>
  );
}

export default function Exos() {
  const { S } = useApp();
  const n = Object.keys(EX).filter(cameraSupported).length;
  return (
    <Panel id="exos">
      <p className="sub">{Object.keys(EX).length} mouvements sans matériel. Les points indiquent la difficulté. Les exos grisés se débloquent en montant en niveau sport. {n} exos peuvent être comptés par la caméra.</p>
      <div className="stack">
        <div className="group-title"><h2>Renfo</h2><span className="label">{RENFO.length} exos</span></div>
        <div className="ex-grid">{RENFO.map((k) => <ExCard key={k} k={k} sportL={S.sport.L} />)}</div>
      </div>
      <div className="stack">
        <div className="group-title"><h2>Cardio</h2><span className="label">{CARDIO.length} exos</span></div>
        <div className="ex-grid">{CARDIO.map((k) => <ExCard key={k} k={k} sportL={S.sport.L} />)}</div>
      </div>
    </Panel>
  );
}
