import { useState } from "react";
import { useApp, sectionOn } from "../store/AppStore.jsx";
import { Stat, LevelCard, Panel, multText } from "../components/ui.jsx";
import { CRAV_XP, QUIT_MAX, REBOUND_XP, HEALTH } from "../data/rules.js";
import CravingHost from "../components/CravingHost.jsx";
import { SmokeSheet } from "../components/SmokeSheet.jsx";
import { fTime, pl } from "../lib/util.js";

const nf = (v) => v.toLocaleString("fr-FR");
/** D'où vient le multiplicateur : le dernier cap santé atteint, ou la moitié gardée après une cigarette. */
const multNote = (S) => {
  if (S.multKept) return "moitié gardée de ton bonus";
  const h = HEALTH.filter((x) => S.elapsed >= x.ms).pop();
  return h ? `cap santé « ${h.lab} »` : "premier cap à 20 min";
};

export default function Sevrage() {
  const { S, state, go, undoSmoke } = useApp();
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
          <Stat label="Jours d'affilée" value={S.streak} small={S.best ? `record : ${pl(S.best, "jour")}` : "premier jour en cours"} />
          <Stat label="Multiplicateur" value={multText(S.mult)} small={multNote(S)} />
          <Stat label="Envies tenues" value={S.res} small="au total" />
        </div>
        {sectionOn(state, "progres") && <button className="linkbtn" type="button" style={{ alignSelf: "flex-start" }} onClick={() => go("stats")}>Toutes tes stats ›</button>}
      </section>

      <details className="box fold">
        <summary>Ton XP sevrage et comment la gagner</summary>
        <div className="rules">
          <div><span>XP des jours complets sans fumer{S.rebonds ? ", rebonds compris" : ""}</span><b>{nf(S.xpDays + S.xpReb)} XP</b></div>
          <div><span>XP de tes {pl(S.res, "envie")} tenue{S.res > 1 ? "s" : ""}</span><b>{nf(S.xpCrav)} XP</b></div>
          <div><span>XP des défis sevrage</span><b>{nf(S.xpDefQ)} XP</b></div>
          <div><span><b>Total</b></span><b>{nf(S.quitXp)} XP</b></div>
        </div>
        <span className="label">Barème</span>
        <div className="rules">
          <div><span>Chaque jour complet sans cigarette</span><b className="g">+100</b></div>
          <div><span>Envie tenue en combat (boss vaincu)</span><b className="g">+{CRAV_XP.game}</b></div>
          <div><span>Bonus de rang S / A au combat</span><b className="g">+10 / +5</b></div>
          <div><span>Envie tenue en respirant</span><b className="g">+{CRAV_XP.breath}</b></div>
          <div><span>Envie tenue au sport</span><b className="g">+{CRAV_XP.sport}</b></div>
          <div><span>Défi sevrage de la semaine réussi</span><b className="g">+80</b></div>
        </div>
        <div className="rules">
          <div><span>Rebond : première journée complète sans fumer après une cigarette</span><b className="g">+{REBOUND_XP}</b></div>
        </div>
        <span className="label">Multiplicateur d'XP, selon ta récupération</span>
        <div className="rules mult-rules">
          {HEALTH.map((h) => <div key={h.lab} className={S.elapsed >= h.ms ? "on" : ""}><span>{h.lab} sans fumer</span><b>{multText(h.x)}</b></div>)}
        </div>
        <p className="tip">Chaque cap santé atteint augmente ton multiplicateur, qui s'applique à toute l'XP de l'app : sevrage, sport et joueur (pas aux mégots). Une cigarette relance les caps, mais tu gardes au moins la moitié de ton bonus (× 1,50 devient × 1,25) jusqu'à ce que les caps le dépassent à nouveau. Ton XP et ton niveau restent acquis. Chaque niveau demande un peu plus d'XP que le précédent, jusqu'au niveau {QUIT_MAX}.</p>
        <p className="tip">Une envie tenue au sport rapporte aussi l'XP sport du circuit, et un combat de l'XP joueur pour l'arbre de compétences.</p>
      </details>

      <section className="stack">
        <h2>Rechute</h2>
        <p className="sub">Si tu as fumé, dis-le ici : ta série et tes caps santé repartent de zéro, ton multiplicateur garde la moitié de son bonus. Ton XP et ton niveau sont gardés.</p>
        <button className="btn danger" type="button" onClick={() => setConfirm(true)}>J'ai fumé une cigarette</button>
        {canUndo && <button className="linkbtn" type="button" style={{ alignSelf: "flex-start" }} onClick={() => undoSmoke(lastEv)}>Annuler la cigarette notée à {fTime(new Date(lastEv.t))}</button>}
        {confirm && <SmokeSheet onClose={() => setConfirm(false)} />}
      </section>
    </Panel>
  );
}
