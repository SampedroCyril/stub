import { useApp } from "../store/AppStore.jsx";
import { Panel, Bar } from "../components/ui.jsx";
import Icon from "../art/Icon.jsx";
import { DEFIS, fmtDefi } from "../data/defis.js";
import { DEFI_XP } from "../data/rules.js";
import { DOW, fDate, durationText, addDays, clamp } from "../lib/util.js";

export default function Defis({ onRecap }) {
  const { S } = useApp();
  const cw = S.weeks[S.weeks.length - 1];
  const past = S.weeks.slice(0, -1).reverse();

  return (
    <Panel id="defis">
      <div className="stack">
        <h2>Défis de la semaine</h2>
        <span className="label">{fDate(cw.ws)} – {fDate(addDays(cw.we, -1))} · reste {durationText(cw.we - S.now)}</span>
        <p className="sub">Trois nouveaux défis chaque lundi. Chaque défi réussi rapporte {DEFI_XP} XP, en sevrage ou en sport selon sa couleur.</p>
      </div>

      <div className="stack">
        {cw.defs.map((d) => {
          const D = DEFIS[d.id], won = d.doneAt && d.doneAt <= S.now;
          const pct = clamp((d.v / D.target) * 100, 0, 100);
          let meta = won ? `Réussi le ${DOW[d.doneAt.getDay()]} ${fDate(d.doneAt)}` : `${fmtDefi(d.id, d.v)} / ${fmtDefi(d.id, D.target)}`;
          if (d.id === "clean7" && !won) meta = d.broken ? "Raté cette semaine, la prochaine est à toi" : d.v === 0 && S.q > cw.ws ? "Compte à partir d'une semaine qui démarre sans clope" : `${d.v} / 7 jours`;
          return (
            <div className={`defi ${D.g}${won ? " won" : ""}`} key={d.id}>
              <Icon name={won ? "trophy" : D.ic} col={won ? "gold" : D.g === "quit" ? "quit" : "accent"} />
              <div className="info">
                <div className="top"><strong>{D.n}</strong><span className="rew">+{DEFI_XP} XP {D.g === "quit" ? "sevrage" : "sport"}</span></div>
                <Bar pct={won ? 100 : pct} />
                <div className="meta"><span>{meta}</span><span>{won ? "✓" : `${Math.round(pct)} %`}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="box">
        <h3>Semaines passées</h3>
        <div className="weeks">
          {past.length ? past.map((w) => (
            <button className="weekrow" type="button" key={+w.ws} onClick={() => onRecap(w.ws)}>
              <span>{fDate(w.ws)} – {fDate(addDays(w.we, -1))}</span>
              <span><b>{w.defs.filter((d) => d.doneAt).length} / 3</b> · <em>Récap</em></span>
            </button>
          )) : <p className="empty">C'est ta première semaine.</p>}
        </div>
        {past.length > 0 && <p className="tip">Touche une semaine pour revoir son récap.</p>}
      </section>
    </Panel>
  );
}
