import { useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Stat, LevelCard, Panel, multText } from "../components/ui.jsx";
import { CRAV_XP, QUIT_MAX } from "../data/rules.js";
import CravingHost from "../components/CravingHost.jsx";
import { SmokeSheet } from "../components/SmokeSheet.jsx";
import { durationText, fTime, pl } from "../lib/util.js";

const nf = (v) => v.toLocaleString("fr-FR");

export default function Sevrage() {
  const { S, undoSmoke } = useApp();
  const [confirm, setConfirm] = useState(false);
  // une cigarette notée par erreur s'annule dans le quart d'heure
  const lastEv = S.smokes[S.smokes.length - 1];
  const canUndo = lastEv && S.now - new Date(lastEv.t) < 15 * 60e3;

  return (
    <Panel id="sevrage">
      <LevelCard kind="quit" label="Niveau sevrage" />

      <CravingHost />

      <section className="stack">
        <h2>Ton sevrage</h2>
        <div className="stats">
          <Stat label="Jours d'affilée" value={S.streak} small={durationText(S.elapsed)} />
          <Stat label="Multiplicateur" value={multText(S.mult)} small={S.streak ? `+${S.streak} % grâce à ta série` : "+1 % par jour sans fumer"} />
          <Stat label="XP sevrage" value={nf(S.quitXp)} small={`record : ${pl(S.best, "jour")}`} />
          <Stat label="Jours" value={`+${nf(S.xpDays)}`} small="jours complets sans fumer" />
          <Stat label="Envies" value={`+${nf(S.xpCrav)}`} small={`${S.res} tenue${S.res > 1 ? "s" : ""}, dont ${S.resSport} au sport`} />
          <Stat label="Défis" value={`+${nf(S.xpDefQ)}`} small="défis sevrage" />
        </div>
      </section>

      <details className="box fold">
        <summary>Comment tu gagnes de l'XP sevrage</summary>
        <div className="rules">
          <div><span>Chaque jour complet sans cigarette</span><b className="g">+100</b></div>
          <div><span>Envie tenue en combat (boss vaincu)</span><b className="g">+{CRAV_XP.game}</b></div>
          <div><span>Bonus de rang S / A au combat</span><b className="g">+10 / +5</b></div>
          <div><span>Envie tenue en respirant</span><b className="g">+{CRAV_XP.breath}</b></div>
          <div><span>Envie tenue au sport</span><b className="g">+{CRAV_XP.sport}</b></div>
          <div><span>Défi sevrage de la semaine réussi</span><b className="g">+80</b></div>
        </div>
        <div className="rules">
          <div><span>Multiplicateur, par jour d'affilée sans fumer</span><b className="g">+1 %</b></div>
        </div>
        <p className="tip">Le multiplicateur s'applique à tout ce que tu gagnes ici : après 30 jours sans fumer, chaque gain compte × 1,30. Une cigarette le ramène à × 1, mais ton XP et ton niveau restent acquis. Chaque niveau demande un peu plus d'XP que le précédent, jusqu'au niveau {QUIT_MAX}.</p>
        <p className="tip">Une envie tenue au sport rapporte aussi l'XP sport du circuit, et un combat de l'XP joueur pour l'arbre de compétences.</p>
      </details>

      <section className="stack">
        <h2>Rechute</h2>
        <p className="sub">Si tu as fumé, dis-le ici : ta série de jours et ton multiplicateur repartent de zéro. Ton XP et ton niveau sont gardés.</p>
        <button className="btn danger" type="button" onClick={() => setConfirm(true)}>J'ai fumé une cigarette</button>
        {canUndo && <button className="linkbtn" type="button" style={{ alignSelf: "flex-start" }} onClick={() => undoSmoke(lastEv)}>Annuler la cigarette notée à {fTime(new Date(lastEv.t))}</button>}
        {confirm && <SmokeSheet onClose={() => setConfirm(false)} />}
      </section>
    </Panel>
  );
}
