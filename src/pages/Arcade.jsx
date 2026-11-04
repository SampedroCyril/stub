import { useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel, Stat } from "../components/ui.jsx";
import BossView from "../game/BossView.jsx";
import { useFrenzy } from "../game/useFrenzy.js";
import { FRENZY } from "../game/battle.js";
import { DOW, fTime } from "../lib/util.js";

/** Frénésie libre : 30 s contre un mannequin, pour le score et le combo. */
export default function Arcade() {
  const { S, commit, battle, go } = useApp();
  const stage = useRef(null);
  const [last, setLast] = useState(null);
  const games = S.ev.filter((e) => e.k === "game" && e.g === "frenzy");
  const best = games.reduce((a, e) => Math.max(a, e.s || 0), 0);
  const bestCombo = games.reduce((a, e) => Math.max(a, e.c || 0), 0);
  const top = [...games].sort((a, b) => (b.s || 0) - (a.s || 0)).slice(0, 5);

  const frenzy = useFrenzy(stage, {
    unit: "+",
    onHit: ({ pts }) => pts,
    onEnd: (r) => {
      if (r.silent || !r.hits) return;
      setLast({ ...r, record: r.score > best });
      commit([{ k: "game", t: new Date().toISOString(), g: "frenzy", s: r.score, c: r.combo, h: r.hits, d: r.sec }]);
    },
  });
  const onTap = (e) => { if (frenzy.active) frenzy.tap(e); else stage.current?.miss(e.x, e.y); };

  return (
    <Panel id="arcade">
      <p className="sub">Frénésie : {FRENZY.dur / 1000} secondes de points faibles en chaîne. Touche-les vite pour le critique, enchaîne pour le combo : tous les 10, ça explose. Se concentrer sur un jeu rapide aide à laisser passer une envie. En combat, chaque coup blesse le boss.</p>
      {battle && !battle.crisis && (
        <button className="linkcard" type="button" onClick={() => go("sevrage")}>
          <span className="px-name" style={{ gridColumn: "1 / -1" }}>Un boss t'attend : lance la Frénésie depuis l'écran de combat pour qu'il prenne les coups</span>
        </button>
      )}
      <section className="arena">
        <div className="arena-head"><span className="px-name">Mannequin d'entraînement</span><span className="px-lvl">Record {best}</span></div>
        <BossView stageRef={stage} boss="clope" maxHp={100} hp={100} training onTap={onTap} onWeakExpire={() => frenzy.active && frenzy.expire()} />
        {!frenzy.active
          ? <button className="btn green big" type="button" onClick={() => { setLast(null); frenzy.start(); }}>{last ? "Rejouer" : "Lancer la Frénésie"}</button>
          : <button className="linkbtn arena-flee" type="button" onClick={() => frenzy.stop(false)}>Arrêter</button>}
        {last && !frenzy.active && <p className="arena-tip">{last.record ? "Nouveau record ! " : ""}<b>{last.score}</b> points · {last.hits} coups · combo max {last.combo}</p>}
      </section>
      <div className="stats">
        <Stat label="Record" value={best} />
        <Stat label="Combo max" value={bestCombo} />
        <Stat label="Parties" value={games.length} />
      </div>
      {top.length > 0 && (
        <section className="box">
          <h3>Meilleures parties</h3>
          <div className="topx">
            {top.map((e, i) => { const d = new Date(e.t); return <div key={i}><span>{DOW[d.getDay()]} {d.getDate()} · {fTime(d)}</span><b>combo {e.c}</b><em>{e.s}</em></div>; })}
          </div>
        </section>
      )}
    </Panel>
  );
}
