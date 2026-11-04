import { useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Stat, LevelCard, Panel, useCountdown } from "../components/ui.jsx";
import { CRAV_XP, TRIGGERS, I_NAMES } from "../data/rules.js";
import Battle from "../game/Battle.jsx";
import Pixel from "../game/Pixel.jsx";
import { BOSSES, bossFor } from "../game/bosses.js";
import { ModChips } from "../game/Battle.jsx";
import { bestiary } from "../game/battle.js";
import { durationText, pl } from "../lib/util.js";

export default function Sevrage() {
  const { S, state, flow, startCraving, setCravingField, resetFlow, commit, go, battle, startBattle } = useApp();
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

      {battle && !battle.crisis && <Battle />}

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
          <div className="prefight">
            <Pixel name={BOSSES[bossFor(craving.trigger, new Date(craving.at))].sprite} className="boss small" />
            <div>
              <span className="label">Ton adversaire</span>
              <strong className="px-name">{BOSSES[bossFor(craving.trigger, new Date(craving.at))].n}</strong>
              <small>{100 * (craving.intensity || 2)} PV · il s'épuise tout seul en 5 min</small>
              <ModChips boss={bossFor(craving.trigger, new Date(craving.at))} known={(bestiary(S.ev)[bossFor(craving.trigger, new Date(craving.at))]?.wins || 0) > 0} />
            </div>
          </div>
          {craving.intensity === 5 ? (
            <div className="stack">
              <button className="btn danger-fill big" type="button" onClick={() => startBattle(true)}>Mode crise</button>
              <button className="btn" type="button" onClick={() => startBattle(false)}>Combat normal</button>
            </div>
          ) : (
            <button className="btn green big" type="button" onClick={() => startBattle(false)}>Affronter</button>
          )}
          <p className="tip">Les deux questions sont facultatives : le déclencheur choisit ton boss, l'intensité ses points de vie. À 5, le mode crise te prend en main.</p>
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
          <div><span>Boss vaincu en tenant (points faibles ou épuisement)</span><b className="g">+{CRAV_XP.hold}</b></div>
          <div><span>Boss vaincu en respirant ou aux blocs</span><b className="g">+{CRAV_XP.breath}</b></div>
          <div><span>Boss vaincu avec un circuit</span><b className="g">+{CRAV_XP.sport}</b></div>
          <div><span>Boss vaincu en mode crise</span><b className="g">+{CRAV_XP.crisis}</b></div>
          <div><span>Bonus de rang S / A</span><b className="g">+10 / +5</b></div>
          <div><span>Défi sevrage de la semaine réussi</span><b className="g">+80</b></div>
        </div>
        <p className="tip">Une envie tuée au sport rapporte aussi l'XP sport du circuit.</p>
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
