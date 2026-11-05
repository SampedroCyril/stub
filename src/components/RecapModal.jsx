import { useEffect, useRef } from "react";
import { useApp } from "../store/AppStore.jsx";
import Icon, { Medal } from "../art/Icon.jsx";
import { weekData } from "../lib/compute.js";
import { DEFIS } from "../data/defis.js";
import { TIER_NAMES } from "../data/badges.js";
import { DEFI_XP, TRIG_NAME } from "../data/rules.js";
import { DOW, fDate, fmt1, mins, pl, addDays } from "../lib/util.js";

function Delta({ cur, prev, lowerIsBetter, fmt = (v) => v }) {
  if (prev == null || cur == null) return null;
  const d = cur - prev;
  if (Math.abs(d) < 1e-9) return <span className="delta flat">= sem. dernière</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return <span className={`delta ${good ? "good" : "bad"}`}>{d > 0 ? "▲" : "▼"} {fmt(Math.abs(d))} vs sem. dernière</span>;
}

export default function RecapModal({ ws, onClose }) {
  const { S, state, go } = useApp();
  const closeRef = useRef(null);
  useEffect(() => {
    const prevFocus = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", onKey); prevFocus?.focus?.(); };
  }, [onClose]);

  const W = weekData(S, state, ws);
  const prevWs = addDays(ws, -7);
  const P = S.weeks.some((w) => +w.ws === +prevWs) ? weekData(S, state, prevWs) : null;
  const end = addDays(W.we, -1);
  const verdict = W.smokes === 0 && W.counted === 7 ? "Semaine parfaite : 7 jours sans une cigarette."
    : W.smokes === 0 ? `${pl(W.clean, "jour")} sans cigarette, aucune rechute. Continue comme ça.`
      : `${pl(W.smokes, "rechute")} cette semaine, et tu es toujours là. La semaine prochaine se joue maintenant.`;
  const totM = W.crav || 1;
  const lvl = (lab, [a, b]) => (b > a ? <div className="r-line"><span>{lab}</span><b>niv. {a} → {b}</b></div> : null);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="r-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <header className="r-head">
          <Icon name="star" col="gold" />
          <span className="label">{W.live && S.now.getDay() !== 0 ? "Ta semaine jusqu'ici" : "Récap de la semaine"} · {fDate(W.ws)} – {fDate(end)}</span>
          <h2 id="r-title">{W.smokes === 0 && W.counted ? "Semaine tenue" : "Ta semaine"}</h2>
          <p>{verdict}</p>
        </header>
        <div className="r-body">
          <div className="r-tiles">
            <div className="r-tile"><span className="label">Jours sans cigarette</span><b>{W.clean}<small style={{ fontSize: 14 }}> / {W.counted || 7}</small></b>{W.smokes > 0 && <span className="delta bad">{pl(W.smokes, "rechute")}</span>}</div>
            <div className="r-tile"><span className="label">Envies tenues</span><b>{W.crav}</b>{P && <Delta cur={W.crav} prev={P.crav} lowerIsBetter />}</div>
            <div className="r-tile"><span className="label">Intensité moy.</span><b>{W.avgI != null ? fmt1(W.avgI) : "–"}</b>{P && P.avgI != null && W.avgI != null ? <Delta cur={W.avgI} prev={P.avgI} lowerIsBetter fmt={fmt1} /> : <small>{W.withI ? "sur 10" : "non notée"}</small>}</div>
            <div className="r-tile"><span className="label">XP sport</span><b>{W.xpS}</b>{P && <Delta cur={W.xpS} prev={P.xpS} />}</div>
          </div>

          <section className="r-sec">
            <h3>Envies</h3>
            {W.crav ? (
              <>
                <div className="r-meth">
                  <i style={{ width: `${(W.meth.sport / totM) * 100}%`, background: "var(--accent)" }} />
                  <i style={{ width: `${(W.meth.breath / totM) * 100}%`, background: "var(--breath)" }} />
                  <i style={{ width: `${(W.meth.hold / totM) * 100}%`, background: "var(--quit)", opacity: 0.5 }} />
                </div>
                <div className="r-line"><span>Tuées au sport</span><b>{W.meth.sport}</b></div>
                <div className="r-line"><span>Tenues en respirant</span><b>{W.meth.breath}</b></div>
                <div className="r-line"><span>Tenues sans rien</span><b>{W.meth.hold}</b></div>
                <div className="r-line"><span>Déclencheur n°1</span><b>{W.topT ? `${TRIG_NAME[W.topT[0]]} (${W.topT[1]})` : "–"}</b></div>
                <div className="r-line"><span>Heure la plus dure</span><b>{W.topH != null ? `${W.topH}h–${(W.topH + 1) % 24}h` : "–"}</b></div>
              </>
            ) : <p className="empty">Aucune envie notée cette semaine.</p>}
            <div className="r-line"><span>XP sevrage gagnée</span><b>+{W.xpQ}</b></div>
            {lvl("Niveau sevrage", W.lvQ)}
          </section>

          <section className="r-sec sport">
            <h3>Sport et respiration</h3>
            <div className="r-line"><span>Circuits</span><b>{W.circ}</b></div>
            <div className="r-line"><span>Reps</span><b>{W.reps}</b></div>
            <div className="r-line"><span>Respirations</span><b>{W.breaths}{W.breaths ? ` · ${mins(W.breathSec)}` : ""}</b></div>
            {lvl("Niveau sport", W.lvS)}
          </section>

          <section className="r-sec gold">
            <h3>Défis {W.wins.length} / 3, badges et santé</h3>
            {W.wins.length + W.badges.length + W.caps.length ? (
              <div className="r-items">
                {W.wins.map((d) => <div className="r-item" key={d.id}><Icon name="trophy" col="gold" /><div>{DEFIS[d.id].n}<span>Défi réussi le {DOW[d.doneAt.getDay()]} {fDate(d.doneAt)} · +{DEFI_XP} XP</span></div></div>)}
                {W.badges.slice(0, 6).map((x) => <div className="r-item" key={x.b.id}><Medal t={x.t} /><div>{x.b.n} {TIER_NAMES[x.t - 1]}<span>{x.b.f(x.b.tiers[x.t - 1])}</span></div></div>)}
                {W.caps.map((h) => <div className="r-item" key={h.lab}><Icon name={h.ic} col={h.col} /><div>{h.t}<span>Cap santé {h.lab}</span></div></div>)}
              </div>
            ) : <p className="empty">Rien de débloqué cette semaine.{W.live ? " Il reste encore du temps." : ""}</p>}
          </section>
        </div>
        <div className="r-foot">
          <button className="btn" type="button" onClick={() => { onClose(); go("stats"); }}>Voir les stats</button>
          <button className="btn green" type="button" ref={closeRef} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
