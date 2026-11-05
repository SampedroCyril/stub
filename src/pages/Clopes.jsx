import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import { Panel, Bar } from "../components/ui.jsx";
import TriggerPicker from "../components/TriggerPicker.jsx";
import { smokeStats, nextDrop } from "../lib/smoking.js";
import { TRIG_NAME, CAT_NAME, TRIG_CATS } from "../data/triggers.js";
import { durationText, fTime, DOW, pl } from "../lib/util.js";

const eur = (v) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: v >= 100 ? 0 : 2 });
const fmt1 = (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** Fenêtre pour noter une clope : déclencheur facultatif, et l'avertissement de remise à zéro en mode Arrêt. */
export function SmokeSheet({ onClose }) {
  const { state, logSmoke } = useApp();
  const [tr, setTr] = useState(null);
  const reduce = state.goal === "reduce";
  return createPortal(
    <div className="modal set-modal" role="dialog" aria-modal="true" aria-labelledby="smk-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet set-sheet smk-sheet">
        <header className="set-sheet-h"><h2 id="smk-t">Noter une clope</h2><button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button></header>
        <p className="tip">{reduce ? "Elle compte dans ton objectif du jour, et le compteur « sans clope » repart de zéro." : "Ton sevrage repart de zéro : niveau, XP et badges sevrage. Tes stats, ton sport et ton record sont gardés. Une rechute fait partie du chemin pour beaucoup de gens."}</p>
        <span className="label">Qu'est-ce qui l'a déclenchée ? (facultatif)</span>
        <TriggerPicker value={tr} onChange={setTr} />
        <div className="row2">
          <button className="btn" type="button" onClick={onClose}>Annuler</button>
          <button className={`btn ${reduce ? "blue" : "danger-fill"}`} type="button" onClick={() => { logSmoke(tr); onClose(); }}>Noter la clope</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Onglet Clopes : les clopes fumées, l'objectif du mode Réduction, et ce que disent les stats. */
export default function Clopes() {
  const { S, state, go, undoSmoke } = useApp();
  const [sheet, setSheet] = useState(false);
  const reduce = state.goal === "reduce";
  const st = smokeStats(S.ev, { now: S.now, startAt: S.startAt, cpd: state.cpd || 0, price: state.packPrice || 0, pack: state.packSize || 20, reduce: reduce ? state.reduce : null });
  const drop = reduce ? nextDrop(state.reduce, S.now) : null;
  const g = st.goalToday, over = g != null && st.today > g;
  const lastEv = S.ev.filter((e) => e.k === "smoked").slice(-1)[0];
  const canUndo = lastEv && S.now - new Date(lastEv.t) < 15 * 60e3;
  const maxDay = Math.max(3, ...st.days.map((x) => Math.max(x.n, x.goal || 0)));
  const maxH = Math.max(1, ...st.hours);

  return (
    <Panel id="clopes">
      <section className={`box smk-today${over ? " over" : ""}`}>
        <div className="smk-top">
          <div>
            <span className="label">Aujourd'hui</span>
            <b className="smk-n">{st.today}{g != null && <small> / {g}</small>}</b>
            <span className="smk-sub">{g != null ? (over ? "Objectif dépassé, demain on repart" : g - st.today === 0 ? "Objectif atteint, on n'en ajoute plus" : `Encore ${pl(g - st.today, "clope")} sous l'objectif`) : st.today ? pl(st.today, "clope") : "Aucune clope aujourd'hui"}</span>
          </div>
          <div className="smk-since"><span className="label">Dernière</span><b>{st.last ? durationText(st.current) : "–"}</b></div>
        </div>
        {g != null && <Bar pct={g ? Math.min(100, (st.today / g) * 100) : st.today ? 100 : 0} color={over ? "var(--danger)" : "var(--accent)"} />}
        {drop && <p className="tip">Objectif automatique : {drop.to} par jour dans {pl(drop.in, "jour")}.</p>}
        <button className={`btn ${reduce ? "blue" : "danger"}`} type="button" onClick={() => setSheet(true)}>J'ai fumé une clope</button>
        {canUndo && <button className="linkbtn" type="button" onClick={() => undoSmoke(lastEv)}>Annuler la dernière (notée à {fTime(new Date(lastEv.t))})</button>}
        {!reduce && <p className="tip">Tu veux plutôt réduire progressivement ? Choisis « Réduire » dans la roue crantée de Sevrage.</p>}
      </section>

      {reduce && (
        <section className="smk-tiles">
          <div><small>Moyenne sur 7 jours</small><b>{st.avg7 != null ? fmt1(st.avg7) : "–"}</b><span>par jour{st.cpd ? ` · départ ${st.cpd}` : ""}</span></div>
          <div className={st.vsBase != null && st.vsBase <= 0 ? "good" : ""}><small>Par rapport au départ</small><b>{st.vsBase != null ? `${st.vsBase > 0 ? "+" : "−"}${Math.abs(Math.round(st.vsBase * 100))} %` : "–"}</b><span>{st.cpd ? "sur ta conso de départ" : <button className="linkbtn" type="button" onClick={() => go("risques")}>Indique ta conso</button>}</span></div>
          <div className="good"><small>Jours sous l'objectif</small><b>{st.streak}</b><span>de suite · {st.under}/{st.goalDaysN} sur 30 j</span></div>
          <div><small>Plus long écart</small><b>{st.longest ? durationText(st.longest) : "–"}</b><span>entre deux clopes</span></div>
        </section>
      )}

      <section className="box">
        <h2>Tes 30 derniers jours</h2>
        <div className="smk-chart" role="img" aria-label="Clopes fumées par jour sur 30 jours">
          {st.days.map((x) => (
            <div key={x.k} className={`smk-bar${x.goal != null && x.n > x.goal ? " over" : ""}${x.tracked ? "" : " off"}`} title={`${DOW[x.d.getDay()]} ${x.d.getDate()} : ${x.n}`}>
              {x.goal != null && <i className="goal" style={{ bottom: `${(x.goal / maxDay) * 100}%` }} />}
              <i className="v" style={{ height: `${(x.n / maxDay) * 100}%` }} />
            </div>
          ))}
        </div>
        <p className="tip">{st.n30 ? `${pl(st.n30, "clope")} en 30 jours${st.spent30 ? `, soit ${eur(st.spent30)}` : ""}.` : "Aucune clope notée sur 30 jours."}{reduce ? " Le trait, c'est l'objectif du jour." : ""}</p>
      </section>

      {st.n30 > 0 && (
        <>
          <section className="box">
            <h2>Tes heures à risque</h2>
            <div className="smk-hours" role="img" aria-label="Clopes par tranche de deux heures">
              {st.hours.map((n, i) => <div key={i}><i style={{ height: `${(n / maxH) * 100}%` }} /><small>{i * 2}h</small></div>)}
            </div>
          </section>
          {st.trig.length > 0 && (
            <section className="box">
              <h2>Ce qui les déclenche</h2>
              <div className="smk-cats">{[...TRIG_CATS.map((c) => c.id), "autre"].filter((c) => st.cats[c]).map((c) => <span key={c}>{CAT_NAME[c]} <b>{st.cats[c]}</b></span>)}</div>
              <div className="rules">{st.trig.slice(0, 5).map(([id, n]) => <div key={id}><span>{TRIG_NAME[id] || id}</span><b>{n}</b></div>)}</div>
            </section>
          )}
        </>
      )}
      {sheet && <SmokeSheet onClose={() => setSheet(false)} />}
    </Panel>
  );
}
