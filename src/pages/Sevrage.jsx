import { useState } from "react";
import { useApp, sectionOn } from "../store/AppStore.jsx";
import { Stat, LevelCard, Panel, useCountdown } from "../components/ui.jsx";
import { CRAV_XP, TRIGGERS, I_NAMES } from "../data/rules.js";
import Battle from "../game/Battle.jsx";
import BossThumb from "../game/BossThumb.jsx";
import { BOSSES, bossFor } from "../game/bosses.js";
import { ModChips } from "../game/Battle.jsx";
import { bestiary } from "../game/battle.js";
import { targetOf } from "../game/combo.js";
import { durationText, pl } from "../lib/util.js";

export default function Sevrage() {
  const { S, state, flow, setFlow, startCraving, setCravingField, resetFlow, commit, go, battle, startBattle } = useApp();
  const [confirm, setConfirm] = useState(false);
  const craving = flow.mode === "craving" ? flow.craving : null;
  const countdown = useCountdown(craving?.endsAt);

  const smoked = () => {
    const t = new Date().toISOString();
    setConfirm(false);
    resetFlow();
    go("accueil");
    commit([{ k: "smoked", t }], ["C'est noté. Le sevrage repart de zéro, ton sport et tes stats restent. La prochaine envie, tu la tiens."], { best: Math.max(state.best || 0, S.streak), quitAt: t });
  };

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
            <div className="intensity">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} className="pick" type="button" data-i={i} aria-pressed={craving.intensity === i} onClick={() => setCravingField("intensity", i)}>
                  <b>{i}</b>{I_NAMES[i]}
                </button>
              ))}
            </div>
          </div>
          <div className="stack">
            <span className="label">Qu'est-ce qui la déclenche ?</span>
            <div className="chiprow">
              {TRIGGERS.map(([k, n]) => (
                <button key={k} className="pick" type="button" aria-pressed={craving.trigger === k} onClick={() => setCravingField("trigger", k)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="stack">
            <span className="label">Comment tu la fais passer ?</span>
            <div className="choices">
              {sectionOn(state, "joueur") && <button className="choice c-fight" type="button" onClick={startBattle}>
                <BossThumb id={bossFor(craving.trigger, new Date(craving.at))} />
                <span><b>Combat</b><small>{BOSSES[bossFor(craving.trigger, new Date(craving.at))].n} · {Math.round(targetOf(craving.intensity) / 60 * 10) / 10} min environ</small></span>
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
        <h2>Rechute</h2>
        <p className="sub">Si tu as fumé, dis-le ici : ton sevrage repart de zéro, le reste est gardé.</p>
        {!confirm && <button className="btn danger" type="button" onClick={() => setConfirm(true)}>J'ai fumé</button>}
        {confirm && (
          <div className="confirm">
            <p><strong>Ton sevrage repart de zéro.</strong> Ton niveau, ton XP et tes badges sevrage sont remis à zéro. Tes stats, ton historique et toute ta progression sport restent.</p>
            <p className="tip">Une rechute fait partie du sevrage pour beaucoup de gens. Le record de ta tentative est gardé.</p>
            <div className="row2">
              <button className="btn" type="button" onClick={() => setConfirm(false)}>Annuler</button>
              <button className="btn danger-fill" type="button" onClick={smoked}>Confirmer</button>
            </div>
          </div>
        )}
      </section>
    </Panel>
  );
}
