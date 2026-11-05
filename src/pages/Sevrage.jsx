import { useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Stat, LevelCard, Panel } from "../components/ui.jsx";
import { CRAV_XP } from "../data/rules.js";
import CravingHost from "../components/CravingHost.jsx";
import { SmokeSheet } from "../components/SmokeSheet.jsx";
import { durationText, fTime, pl } from "../lib/util.js";

export default function Sevrage() {
  const { S, undoSmoke } = useApp();
  const [confirm, setConfirm] = useState(false);
  // une clope notée par erreur s'annule dans le quart d'heure
  const lastEv = S.smokes[S.smokes.length - 1];
  const canUndo = lastEv && S.now - new Date(lastEv.t) < 15 * 60e3;

  return (
    <Panel id="sevrage">
      <LevelCard kind="quit" label="Niveau sevrage" />

      <CravingHost />

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
        <button className="btn danger" type="button" onClick={() => setConfirm(true)}>J'ai fumé une clope</button>
        {canUndo && <button className="linkbtn" type="button" style={{ alignSelf: "flex-start" }} onClick={() => undoSmoke(lastEv)}>Annuler la clope notée à {fTime(new Date(lastEv.t))}</button>}
        {confirm && <SmokeSheet onClose={() => setConfirm(false)} />}
      </section>
    </Panel>
  );
}
