import { useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel, LevelCard } from "../components/ui.jsx";
import { BRANCHES, SKILLS, canLearn, requires, SKILL } from "../data/skills.js";
import { RANK_PXP, ARCADE_DAY_CAP } from "../data/rules.js";
import { pl } from "../lib/util.js";

/** Niveau joueur et arbre de compétences : un point par niveau, réinitialisable. */
export default function Talents() {
  const { S, state, patchState, flash } = useApp();
  const [confirm, setConfirm] = useState(false);
  const owned = state.skills || [];
  const points = Math.max(0, S.player.L - 1 - owned.length);

  const learn = (id) => {
    if (!canLearn(id, owned, points)) return;
    patchState({ skills: [...owned, id] });
    flash?.([`Compétence apprise : ${SKILL[id].n}`]);
  };

  return (
    <Panel id="talents">
      <LevelCard kind="player" label="Niveau joueur" />
      <p className={`talent-points${points ? " on" : ""}`}>{points ? `${pl(points, "point")} à dépenser` : "Aucun point à dépenser : gagne des combats pour monter de niveau."}</p>

      <div className="tree">
        {BRANCHES.map((br) => (
          <section key={br.id} className={`branch ${br.id}`} aria-label={br.n}>
            <h3>{br.n}<small>{br.d}</small></h3>
            <ol>
              {SKILLS.filter((s) => s.br === br.id).map((s) => {
                const has = owned.includes(s.id), can = canLearn(s.id, owned, points);
                const lockedBy = !has && requires(s.id) && !owned.includes(requires(s.id));
                return (
                  <li key={s.id}>
                    <button type="button" className={`skill${has ? " has" : can ? " can" : ""}`} disabled={!can} aria-pressed={has} onClick={() => learn(s.id)}>
                      <b>{s.n}</b>
                      <small>{s.d}</small>
                      <em>{has ? "Acquis" : can ? "Apprendre · 1 point" : lockedBy ? `Après ${SKILL[requires(s.id)].n}` : "Pas de point"}</em>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <details className="box fold">
        <summary>Comment tu gagnes de l'XP joueur</summary>
        <div className="rules">
          <div><span>Boss vaincu</span><b className="g">+20</b></div>
          <div><span>Par point de combo max (60 au plus)</span><b className="g">+1</b></div>
          <div><span>Rang S / A / B</span><b className="g">+{RANK_PXP.S} / +{RANK_PXP.A} / +{RANK_PXP.B}</b></div>
          <div><span>Arcade : 1 XP pour 50 points de score</span><b className="g">{ARCADE_DAY_CAP} max par jour</b></div>
        </div>
        <p className="tip">L'XP joueur ne repart jamais à zéro, même après une rechute. L'Arcade est plafonnée pour que les vraies envies restent la meilleure façon de progresser.</p>
      </details>

      {owned.length > 0 && (!confirm
        ? <button className="linkbtn" type="button" onClick={() => setConfirm(true)}>Réinitialiser mes talents</button>
        : <div className="confirm"><p>Tu récupères tes {owned.length} points pour les replacer autrement.</p><div className="row2"><button className="btn" type="button" onClick={() => setConfirm(false)}>Annuler</button><button className="btn danger-fill" type="button" onClick={() => { patchState({ skills: [] }); setConfirm(false); }}>Réinitialiser</button></div></div>)}
    </Panel>
  );
}
