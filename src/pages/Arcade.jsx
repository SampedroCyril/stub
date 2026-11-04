import { useApp } from "../store/AppStore.jsx";
import { Panel, Stat } from "../components/ui.jsx";
import Blocs from "../game/Blocs.jsx";
import { DOW, fTime } from "../lib/util.js";

export default function Arcade() {
  const { S, commit, battle, go } = useApp();
  const games = S.ev.filter((e) => e.k === "game");
  const best = games.reduce((a, e) => Math.max(a, e.s || 0), 0);
  const lines = games.reduce((a, e) => a + (e.l || 0), 0);
  const top = [...games].sort((a, b) => (b.s || 0) - (a.s || 0)).slice(0, 5);

  return (
    <Panel id="arcade">
      <p className="sub">Jouer quelques minutes à un jeu de blocs fait baisser l'intensité d'une envie : c'est mesuré en labo, pas un gadget. Ici, tu joues pour le plaisir et pour ton record. En combat, chaque ligne blesse le boss.</p>
      {battle && !battle.crisis && (
        <button className="linkcard" type="button" onClick={() => go("sevrage")}>
          <span className="px-name" style={{ gridColumn: "1 / -1" }}>Un boss t'attend : joue depuis l'écran de combat pour qu'il prenne les dégâts</span>
        </button>
      )}
      <Blocs best={best} onEnd={(r) => commit([{ k: "game", t: new Date().toISOString(), g: "blocs", s: r.score, l: r.lines, d: r.sec }])} />
      <div className="stats">
        <Stat label="Record" value={best} />
        <Stat label="Parties" value={games.length} />
        <Stat label="Lignes" value={lines} small="au total" />
      </div>
      {top.length > 0 && (
        <section className="box">
          <h3>Meilleures parties</h3>
          <div className="topx">
            {top.map((e, i) => { const d = new Date(e.t); return <div key={i}><span>{DOW[d.getDay()]} {d.getDate()} · {fTime(d)}</span><b>{e.l} lignes</b><em>{e.s}</em></div>; })}
          </div>
        </section>
      )}
    </Panel>
  );
}
