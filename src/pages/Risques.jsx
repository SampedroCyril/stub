import { useApp } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import { RISKS, SOURCES } from "../data/health.js";
import { savings } from "../lib/smoking.js";

const Src = ({ k }) => <a className="src" href={SOURCES[k].u} target="_blank" rel="noreferrer">Source : {SOURCES[k].n}</a>;
const eur = (v) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: v >= 100 ? 0 : 2 });
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");

/** Ce que fait la cigarette, même à petite dose, et ce que coûtait ta consommation. */
export default function Risques() {
  const { S, state, patchState } = useApp();
  const cpd = state.cpd || 0, price = state.packPrice || 0, pack = state.packSize || 20;
  const perCig = price && pack ? price / pack : 0;
  const R1 = RISKS.oneADay, R2 = RISKS.light, R3 = RISKS.france;

  return (
    <Panel id="risques">
      <section className="box conso">
        <h2>Ta consommation</h2>
        <div className="conso-in">
          <label><span>Cigarettes par jour</span><input type="number" inputMode="numeric" min="0" max="80" value={cpd || ""} placeholder="ex. 12" onChange={(e) => patchState({ cpd: Math.max(0, Math.min(80, +e.target.value || 0)) })} /></label>
          <label><span>Prix du paquet (€)</span><input type="number" inputMode="decimal" min="0" step="0.1" value={price || ""} placeholder="ex. 12,50" onChange={(e) => patchState({ packPrice: Math.max(0, +e.target.value || 0) })} /></label>
        </div>
        {cpd > 0 ? (
          <>
            <div className="conso-grid">
              {[["Par semaine", 7], ["Par mois", 30.4], ["Par an", 365]].map(([n, d]) => (
                <div key={n}><small>{n}</small><b>{n0(cpd * d)}</b><span>cigarettes{perCig ? ` · ${eur(cpd * d * perCig)}` : ""}</span></div>
              ))}
            </div>
            {(() => { const sv = savings(S.ev, { now: S.now, startAt: S.startAt, cpd, price, pack }); return sv && <p className="conso-won">Depuis le début du suivi : <b>{n0(sv.avoided)} cigarettes évitées</b>{sv.saved ? <> et <b>{eur(sv.saved)} économisés</b></> : null}, clopes fumées déduites.</p>; })()}
          </>
        ) : <p className="tip">Indique ce que tu fumais pour voir ce que ça représente, et ce que tu économises depuis l'arrêt.</p>}
      </section>

      <section className="box risk">
        <h2>{R1.t}</h2>
        <p>{R1.d}</p>
        <div className="risk-bars">
          {R1.rows.map((r) => <div key={r.n}><span>{r.n}</span><i style={{ "--k": r.v / 100 }} /><b>{r.v} %</b></div>)}
        </div>
        <p className="tip">{R1.note}</p>
        <Src k={R1.src} />
      </section>

      <section className="box risk">
        <h2>{R2.t}</h2>
        <table className="risk-table">
          <thead><tr><th>Risque de…</th><th>Hommes</th><th>Femmes</th></tr></thead>
          <tbody>{R2.rows.map((r) => <tr key={r.n}><td>{r.n}</td><td>{r.m}</td><td>{r.f}</td></tr>)}</tbody>
        </table>
        <p className="tip">{R2.note}</p>
        <Src k={R2.src} />
      </section>

      <section className="box risk">
        <h2>{R3.t}</h2>
        <p className="risk-big">{R3.d}</p>
        <p className="tip">{R3.note}</p>
        <Src k={R3.src} />
      </section>
    </Panel>
  );
}
