import { useApp } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import { RISKS, SOURCES } from "../data/health.js";
import { useState } from "react";
import { GainsSheet } from "../components/Gains.jsx";

const Src = ({ k }) => <a className="src" href={SOURCES[k].u} target="_blank" rel="noreferrer">Source : {SOURCES[k].n}</a>;
const eur = (v) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: v >= 100 ? 0 : 2 });
const n0 = (v) => Math.round(v).toLocaleString("fr-FR");

/** Ce que fait la cigarette, même à petite dose, et ce que coûtait ta consommation. */
export default function Risques() {
  const { state } = useApp();
  const [gainsOpen, setGains] = useState(false);
  const cpd = state.cpd || 0, price = state.packPrice || 0, pack = state.packSize || 20;
  const perCig = price && pack ? price / pack : 0;
  const R1 = RISKS.oneADay, R2 = RISKS.light, R3 = RISKS.france;

  return (
    <Panel id="risques">
      <section className="box conso">
        <h2>Ce que la cigarette te coûtait</h2>
        {cpd > 0 ? (
          <div className="conso-grid">
            {[["Par semaine", 7], ["Par mois", 30.4], ["Par an", 365]].map(([n, d]) => (
              <div key={n}><small>{n}</small><b>{n0(cpd * d)}</b><span>cigarettes{perCig ? ` · ${eur(cpd * d * perCig)}` : ""}</span></div>
            ))}
          </div>
        ) : <p className="tip">Indique ce que tu fumais pour voir ce que ça représentait.</p>}
        <button className="btn" type="button" onClick={() => setGains(true)}>{cpd > 0 ? "Tes gains et ta conso de départ" : "Indiquer ce que je fumais"}</button>
      </section>
      {gainsOpen && <GainsSheet onClose={() => setGains(false)} />}

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
