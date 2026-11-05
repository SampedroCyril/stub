import { useState } from "react";
import { useApp, sectionOn } from "../store/AppStore.jsx";
import { Stat, LevelCard, Panel, useCountdown } from "../components/ui.jsx";
import { CRAV_XP, ivName } from "../data/rules.js";
import TriggerPicker from "../components/TriggerPicker.jsx";
import { SmokeSheet } from "./Clopes.jsx";
import Battle from "../game/Battle.jsx";
import BossThumb from "../game/BossThumb.jsx";
import { BOSSES, bossFor } from "../game/bosses.js";
import { ModChips } from "../game/Battle.jsx";
import { bestiary } from "../game/battle.js";
import { targetOf, scale5 } from "../game/combo.js";
import { durationText, pl } from "../lib/util.js";

export default function Sevrage() {
  const { S, state, flow, setFlow, startCraving, setCravingField, resetFlow, commit, go, battle, startBattle } = useApp();
  const [confirm, setConfirm] = useState(false);
  const craving = flow.mode === "craving" ? flow.craving : null;
  const countdown = useCountdown(craving?.endsAt);



  return (
    <Panel id="sevrage">
      <LevelCard kind="quit" label="Niveau sevrage" />

      {battle && <Battle />}

      {!craving && !battle && <button className="btn green big" type="button" onClick={startCraving}>J'ai envie de fumer</button>}

      {craving && (
        <section className="card quit">
          <div className="card-head"><h2>Envie notée</h2><span className="timer">{countdown}</span></div>
          <div className="stack">
            <span className="label">Elle est forte comment ?</span>
            <div className={`iv${craving.intensity ? "" : " unset"}`} style={{ "--k": ((craving.intensity || 5) - 1) / 9 }}>
              <div className="iv-head"><b className="iv-n">{craving.intensity ?? "?"}<small>/10</small></b><span>{craving.intensity ? ivName(craving.intensity) : "Fais glisser"}</span></div>
              <input className="iv-range" type="range" min="1" max="10" step="1" value={craving.intensity ?? 5} aria-label="Force de l'envie, de 1 à 10"
                aria-valuetext={craving.intensity ? `${craving.intensity} sur 10, ${ivName(craving.intensity)}` : "Pas encore notée"}
                onChange={(e) => setCravingField("intensity", +e.target.value)}
                onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCravingField("intensity", Math.min(10, Math.max(1, Math.round(1 + (9 * (e.clientX - r.left - 15)) / (r.width - 30))))); }} />
              <div className="iv-scale"><span>1 · légère</span><span>10 · insupportable</span></div>
            </div>
          </div>
          <div className="stack">
            <span className="label">Qu'est-ce qui la déclenche ?</span>
            <TriggerPicker value={craving.trigger} onChange={(v) => setCravingField("trigger", v)} />
          </div>
          <div className="stack">
            <span className="label">Comment tu la fais passer ?</span>
            <div className="choices">
              {sectionOn(state, "joueur") && <button className="choice c-fight" type="button" onClick={startBattle}>
                <BossThumb id={bossFor(craving.trigger, new Date(craving.at))} />
                <span><b>Combat</b><small>{BOSSES[bossFor(craving.trigger, new Date(craving.at))].n} · {Math.round(targetOf(craving.intensity ? scale5(craving.intensity) : null) / 60 * 10) / 10} min environ</small></span>
              </button>}
              <button className="choice c-breath" type="button" onClick={() => { setFlow({ mode: "breath", craving, autostart: true }); go("respirer"); }}>
                <span className="choice-ic" aria-hidden="true">◯</span>
                <span><b>Respirer</b><small>Le cercle guidé, sans réfléchir</small></span>
              </button>
              {sectionOn(state, "sport") && <button className="choice c-move" type="button" onClick={() => { setFlow({ mode: "circuit", craving }); go("circuit"); }}>
                <span className="choice-ic" aria-hidden="true">↯</span>
                <span><b>Bouger</b><small>Un circuit renfo + cardio</small></span>
              </button>}
            </div>
            {sectionOn(state, "joueur") && <ModChips boss={bossFor(craving.trigger, new Date(craving.at))} known={(bestiary(S.ev)[bossFor(craving.trigger, new Date(craving.at))]?.wins || 0) > 0} />}
          </div>
          <p className="tip">Les deux questions sont facultatives{sectionOn(state, "joueur") ? " : le déclencheur choisit ton boss, l'intensité la durée du combat" : ""}. Chaque façon tient l'envie et rapporte de l'XP.</p>
          <button className="linkbtn" type="button" style={{ alignSelf: "flex-start" }} onClick={resetFlow}>Fausse alerte, j'annule</button>
        </section>
      )}

      <section className="stack">
        <h2>Depuis ta dernière clope</h2>
        <div className="stats">
          <Stat label="Jours sans" value={S.streak} small={durationText(S.elapsed)} />
          <Stat label="Envies tenues" value={S.res} small={`${S.resSport} au sport · ${S.resBreath} en respirant`} />
          <Stat label="XP sevrage" value={S.quitXp} />
          <Stat label="Jours" value={`+${S.xpDays}`} small={`${pl(S.streak, "jour")} × 100`} />
          <Stat label="Envies" value={`+${S.xpCrav}`} small={pl(S.res, "envie")} />
          <Stat label="Défis" value={`+${S.xpDefQ}`} small="défis sevrage" />
        </div>
      </section>

      <details className="box fold">
        <summary>Comment tu gagnes de l'XP sevrage</summary>
        <div className="rules">
          <div><span>Chaque jour complet sans clope</span><b className="g">+100</b></div>
          <div><span>Envie tenue en combat (boss vaincu)</span><b className="g">+{CRAV_XP.game}</b></div>
          <div><span>Bonus de rang S / A au combat</span><b className="g">+10 / +5</b></div>
          <div><span>Envie tenue en respirant</span><b className="g">+{CRAV_XP.breath}</b></div>
          <div><span>Envie tenue au sport</span><b className="g">+{CRAV_XP.sport}</b></div>
          <div><span>Défi sevrage de la semaine réussi</span><b className="g">+80</b></div>
        </div>
        <p className="tip">Une envie tenue au sport rapporte aussi l'XP sport du circuit, et un combat de l'XP joueur pour l'arbre de compétences.</p>
      </details>

      <section className="stack">
        <h2>{state.goal === "reduce" ? "Une clope fumée" : "Rechute"}</h2>
        <p className="sub">{state.goal === "reduce" ? "Note-la : elle compte dans ton objectif du jour, et tes stats sont dans l'onglet Clopes." : "Si tu as fumé, dis-le ici : ton sevrage repart de zéro, le reste est gardé."}</p>
        <button className={`btn ${state.goal === "reduce" ? "blue" : "danger"}`} type="button" onClick={() => setConfirm(true)}>J'ai fumé une clope</button>
        {confirm && <SmokeSheet onClose={() => setConfirm(false)} />}
      </section>
    </Panel>
  );
}
