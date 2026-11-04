import { lazy, Suspense, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { LevelCard, Panel, useCountdown } from "../components/ui.jsx";
import Figure from "../art/Figure.jsx";
import Icon from "../art/Icon.jsx";
import { EX, xpOf, fmtAmt, sides } from "../data/exercises.js";
import { CRAV_XP } from "../data/rules.js";
import { amount, pairAt, upcoming, randomPair, advanceRotation } from "../lib/circuit.js";
import { cameraSupported } from "../pose/counters.js";
import { clamp } from "../lib/util.js";

const CameraCoach = lazy(() => import("../pose/CameraCoach.jsx"));

/** Résultat caméra → quantité enregistrée (par côté si l'exo se fait des deux côtés). */
function fromCamera(e, r) {
  const x = EX[e], s = sides(e);
  const raw = x.u === "s" ? r.sec : r.count;
  return Math.max(1, Math.round(raw / s));
}

function Move({ e, kind, sportL, adj, result, onCamera, onDetails }) {
  const x = EX[e];
  const target = amount(e, sportL, adj);
  const n = result ? result.n : target;
  return (
    <div className="move-wrap">
      <button className="move" type="button" onClick={onDetails}>
        <Figure name={x.fig} />
        <span>
          <small>{kind}</small>
          <strong>{x.n}</strong>
          {x.side && <span className="per">{x.side}</span>}
        </span>
        <span className="amt">
          <em>{fmtAmt(e, n)}</em>
          <span className="xp">+{xpOf(e, n)} XP</span>
        </span>
      </button>
      {cameraSupported(e) && (
        result
          ? <p className="cam-ok">✓ Validé à la caméra : {x.u === "s" ? `${n} s` : `${n} reps`}{x.side ? ` ${x.side}` : ""} (objectif {fmtAmt(e, target)}) <button className="linkbtn" type="button" onClick={onCamera}>Refaire</button></p>
          : <button className="cam-btn" type="button" onClick={onCamera}><Icon name="camera" col="accent" plain /> Compter avec la caméra</button>
      )}
    </div>
  );
}

export default function Circuit() {
  const { S, state, flow, setFlow, cravingEvent, resetFlow, commit, go } = useApp();
  const [coach, setCoach] = useState(null);
  const active = flow.mode === "circuit";
  const fromCraving = active && !!flow.craving;
  const countdown = useCountdown(fromCraving ? flow.craving.endsAt : null);
  const sportL = S.sport.L, adj = state.adj;
  const pair = flow.override || pairAt(state, sportL);
  const results = flow.results || {};

  const qty = (e) => (results[e] ? results[e].n : amount(e, sportL, adj));
  const totalXp = pair.reduce((a, e) => a + xpOf(e, qty(e)), 0);

  const finish = (f) => {
    const items = pair.map((e) => ({ e, n: qty(e), ...(results[e] ? { cam: true } : {}) }));
    const xp = items.reduce((a, it) => a + xpOf(it.e, it.n), 0);
    const events = [], msg = [`Circuit : +${xp} XP sport`];
    if (fromCraving) { events.push(cravingEvent("sport", flow.craving)); msg.push(`Envie tuée : +${CRAV_XP.sport} XP sevrage`); }
    events.push({ k: "circuit", t: new Date().toISOString(), f, items });
    const patch = { adj: clamp(adj + f, -3, 5), ...(flow.override ? {} : advanceRotation(state, sportL)) };
    resetFlow();
    go("accueil");
    commit(events, msg, patch);
  };

  const openCoach = (e) => {
    const target = amount(e, sportL, adj) * sides(e);
    setCoach({ e, target });
  };

  return (
    <Panel id="circuit">
      <LevelCard kind="sport" label="Niveau sport" />

      {!active && <button className="btn blue big" type="button" onClick={() => setFlow({ mode: "circuit" })}>Lancer un circuit</button>}

      {active && (
        <section className={`card${fromCraving ? " quit" : ""}`}>
          {fromCraving && <div className="banner"><span>Envie en cours, ce circuit la tue.</span><b>{countdown}</b></div>}
          <div className="card-head">
            <h2>{flow.override ? "Circuit au hasard" : "Ton circuit"}</h2>
            <span className="timer">+{totalXp} XP</span>
          </div>
          <div className="moves">
            {pair.map((e, i) => (
              <Move
                key={e} e={e} kind={i ? "Cardio" : "Renfo"} sportL={sportL} adj={adj} result={results[e]}
                onCamera={() => openCoach(e)}
                onDetails={() => { go("exos"); setTimeout(() => document.getElementById(`ex-${e}`)?.scrollIntoView({ block: "center" }), 60); }}
              />
            ))}
          </div>
          <p className="tip">Enchaîne les deux, souffle 30 secondes, refais un tour si tu veux. Touche un exo pour voir comment le faire.</p>
          <div className="row2">
            <button className="btn" type="button" onClick={() => setFlow((f) => ({ ...f, override: randomPair(pair, sportL), results: {} }))}>Autre circuit au hasard</button>
            <button className="btn" type="button" onClick={() => (fromCraving ? (setFlow((f) => ({ mode: "craving", craving: f.craving })), go("sevrage")) : resetFlow())}>Annuler</button>
          </div>
          <div className="done">
            <span className="label">Terminé. C'était…</span>
            <div className="done-btns">
              <button className="btn" type="button" onClick={() => finish(-1)}>Trop dur</button>
              <button className="btn blue" type="button" onClick={() => finish(0)}>Nickel</button>
              <button className="btn" type="button" onClick={() => finish(1)}>Trop facile</button>
            </div>
            <p className="tip">Ton retour ajuste les quantités des prochains circuits.</p>
          </div>
        </section>
      )}

      <p className="safety"><strong>Si la tête tourne, tu t'arrêtes.</strong> Les vertiges sont fréquents les premiers jours sans nicotine : assieds-toi, respire lentement, bois de l'eau.</p>

      <section className="stack">
        <h2>Prochains circuits</h2>
        <div className="list">
          {upcoming(state, sportL, 5).map(([r, c], i) => (
            <div className={`lrow${i === 0 ? " now" : ""}`} key={i}>
              <span className="n">{i === 0 ? "▶" : i + 1}</span>
              <span>{EX[r].n} <b>{fmtAmt(r, amount(r, sportL, adj))}</b> · {EX[c].n} <b>{fmtAmt(c, amount(c, sportL, adj))}</b></span>
            </div>
          ))}
        </div>
      </section>

      <section className="box">
        <h3>Comment tu gagnes de l'XP sport</h3>
        <div className="rules">
          <div><span>Exo en répétitions</span><b className="s">reps × difficulté</b></div>
          <div><span>Exo en secondes</span><b className="s">secondes × difficulté ÷ 3</b></div>
          <div><span>Exo par jambe ou par côté</span><b className="s">× 2</b></div>
          <div><span>Défi sport de la semaine réussi</span><b className="s">+80</b></div>
        </div>
        <p className="tip">La difficulté va de 1 à 5. Les quantités montent de 10 % par niveau sport et bougent de 12 % à chaque « trop dur » ou « trop facile ». Avec la caméra, c'est ce que tu as vraiment fait qui compte : plus de reps, plus d'XP.</p>
      </section>

      {coach && (
        <Suspense fallback={<div className="coach"><p className="coach-msg">Chargement…</p></div>}>
          <CameraCoach
            exId={coach.e} target={coach.target} model={state.model} sound={state.sound}
            onClose={() => setCoach(null)}
            onDone={(r) => {
              setFlow((f) => ({ ...f, results: { ...(f.results || {}), [coach.e]: { n: fromCamera(coach.e, r) } } }));
              setCoach(null);
            }}
          />
        </Suspense>
      )}
    </Panel>
  );
}
