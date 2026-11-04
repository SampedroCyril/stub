import { useApp } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import Pixel from "../game/Pixel.jsx";
import { BOSSES } from "../game/bosses.js";
import { bestiary, bossLevel } from "../game/battle.js";
import { TRIG_NAME } from "../data/rules.js";
import { pad } from "../lib/util.js";

export default function Bestiaire() {
  const { S } = useApp();
  const bz = bestiary(S.ev);
  const total = Object.values(bz).reduce((a, b) => a + b.wins, 0);
  const seen = Object.keys(bz).length;

  return (
    <Panel id="bestiaire">
      <div className="topbar"><h2>Bestiaire</h2><span className="label">{seen} / {Object.keys(BOSSES).length} boss rencontrés · {total} victoires</span></div>
      <p className="sub">Chaque déclencheur a son boss. Tous les 5 victoires contre le même, il monte d'un niveau (+10 % de PV). Dès le niveau 3, il porte une couronne.</p>
      <div className="bestiary">
        {Object.entries(BOSSES).map(([id, B]) => {
          const s = bz[id];
          return (
            <article className={`beast${s ? "" : " unknown"}`} key={id}>
              <div className="beast-art"><Pixel name={B.sprite} className="boss" />{s && bossLevel(s.wins) >= 3 && <Pixel name="crown" className="crown" />}</div>
              <div className="beast-info">
                <strong className="px-name">{s ? B.n : "???"}</strong>
                <span>{s ? `${s.wins} victoire${s.wins > 1 ? "s" : ""} · niv. ${bossLevel(s.wins)}` : "Pas encore rencontré"}</span>
                {s?.best != null && <span>Record : {Math.floor(s.best / 60)}:{pad(s.best % 60)}</span>}
                <small>{B.trig ? `Apparaît avec : ${TRIG_NAME[B.trig]}` : id === "spectre" ? "Rôde entre 1h et 5h du matin" : "Sans déclencheur noté"}</small>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
