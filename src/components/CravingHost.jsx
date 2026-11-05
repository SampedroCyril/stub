import { useApp, sectionOn } from "../store/AppStore.jsx";
import { useCountdown } from "./ui.jsx";
import TriggerPicker from "./TriggerPicker.jsx";
import Battle, { ModChips } from "../game/Battle.jsx";
import BossThumb from "../game/BossThumb.jsx";
import { BOSSES, bossFor } from "../game/bosses.js";
import { bestiary } from "../game/battle.js";
import { targetOf, scale5 } from "../game/combo.js";
import { ivName } from "../data/rules.js";

/**
 * Une envie en cours : le bouton « J'ai envie de fumer », la fiche de l'envie (force, déclencheur, façon de la tenir)
 * et le combat, en haut de la page Envies du Sevrage.
 */
export default function CravingHost() {
  const { S, state, flow, setFlow, startCraving, setCravingField, resetFlow, go, battle, startBattle } = useApp();
  const craving = flow.mode === "craving" ? flow.craving : null;
  const countdown = useCountdown(craving?.endsAt);
  return (
    <>
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
    </>
  );
}
