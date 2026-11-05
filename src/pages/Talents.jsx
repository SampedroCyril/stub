import { useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel, LevelCard } from "../components/ui.jsx";
import { BRANCHES, SKILLS, SKILL, LINKS, skillState, canLearn } from "../data/skills.js";
import { RANK_PXP, ARCADE_DAY_CAP } from "../data/rules.js";
import { pl } from "../lib/util.js";

const R = { small: 13, big: 17, key: 22 };
const VW = 520, VH = 610;
/** Étoiles du fond, fixes. */
const STARS = Array.from({ length: 90 }, (_, i) => [(i * 389) % VW, (i * 557) % VH, (i % 3) * 0.5 + 0.4]);
const BR = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));

/** Niveau joueur et arbre de compétences en constellation : un point par niveau, réinitialisable. */
export default function Talents() {
  const { S, state, patchState, flash, view } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [sel, setSel] = useState("root");
  const box = useRef(null);
  const [zoom, setZoom] = useState(0.7);
  const owned = (state.skills || []).filter((id) => SKILL[id]);
  const points = Math.max(0, S.player.L - 1 - owned.length);

  // zoom de départ : la constellation tient en largeur, centrée sur le Départ
  useLayoutEffect(() => {
    const h = box.current;
    if (!h) return;
    const z = Math.max(0.6, Math.min(1.2, (h.clientWidth - 4) / VW));
    setZoom(z);
    requestAnimationFrame(() => { h.scrollLeft = 260 * z - h.clientWidth / 2; h.scrollTop = 315 * z - h.clientHeight / 2; });
  }, [view]);
  const rezoom = (z) => {
    const h = box.current, cx = (h.scrollLeft + h.clientWidth / 2) / zoom, cy = (h.scrollTop + h.clientHeight / 2) / zoom;
    const nz = Math.max(0.5, Math.min(1.6, z));
    setZoom(nz);
    requestAnimationFrame(() => { h.scrollLeft = cx * nz - h.clientWidth / 2; h.scrollTop = cy * nz - h.clientHeight / 2; });
  };

  const learn = (id) => {
    if (!canLearn(id, owned, points)) return;
    patchState({ skills: [...owned, id] });
    flash?.([`Compétence apprise : ${SKILL[id].n}`]);
  };
  const st = (id) => skillState(id, owned);
  const N = SKILL[sel], ns = st(sel);

  return (
    <Panel id="talents">
      <LevelCard kind="player" label="Niveau joueur" />
      <p className={`talent-points${points ? " on" : ""}`}>{points ? `${pl(points, "point")} à dépenser` : "Aucun point à dépenser : gagne des combats pour monter de niveau."}</p>

      <div className="constel">
        <div className="constel-box" ref={box}>
          <svg viewBox={`0 0 ${VW} ${VH}`} width={VW * zoom} height={VH * zoom} className="constel-svg" role="group" aria-label="Arbre de compétences">
            <rect width={VW} height={VH} className="tree-bg" />
            {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className="star" />)}
            <g className="links">
              {LINKS.map(([a, b]) => {
                const A = SKILL[a], B = SKILL[b], ha = st(a) === "has", hb = st(b) === "has";
                return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} className={`link ${ha && hb ? "on" : ha || hb ? "half" : "off"}`} />;
              })}
            </g>
            {SKILLS.map((n) => {
              const s = st(n.id), r = R[n.k];
              const pick = () => setSel(n.id);
              return (
                <g key={n.id} className={`node ${s} br-${n.br} k-${n.k}${sel === n.id ? " sel" : ""}`} transform={`translate(${n.x} ${n.y})`}
                  tabIndex={0} role="button" aria-label={`${n.n} : ${n.d}`} aria-pressed={sel === n.id}
                  onClick={pick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }}>
                  {s === "has" && <circle r={r + 6} className="glow" />}
                  {s === "can" && (
                    <circle r={r + 4} className="halo">
                      <animate attributeName="r" values={`${r + 3};${r + 7};${r + 3}`} dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values=".8;.2;.8" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {sel === n.id && <circle r={r + 9} className="selring" />}
                  <circle r={r} className="bub" />
                  <text y={1} className="ic" dominantBaseline="middle" textAnchor="middle" fontSize={r * 0.95}>{s === "lock" && n.k !== "key" ? "?" : n.ic}</text>
                  <text y={r + 13} className="lab" textAnchor="middle">{n.n}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="constel-zoom">
          <button type="button" aria-label="Zoomer" onClick={() => rezoom(zoom + 0.2)}>+</button>
          <button type="button" aria-label="Dézoomer" onClick={() => rezoom(zoom - 0.2)}>−</button>
        </div>
      </div>

      <section className={`skill-sheet br-${N.br}`} aria-live="polite">
        <div className="skill-sheet-h"><b>{N.n}</b><small>{N.br === "root" ? "Départ" : BR[N.br].n}</small></div>
        <p>{N.d}</p>
        {N.br !== "root" && (ns === "has"
          ? <p className="skill-st has">Acquise</p>
          : ns === "can"
            ? <button className="btn green" type="button" disabled={!points} onClick={() => learn(N.id)}>{points ? "Apprendre · 1 point" : "Pas de point à dépenser"}</button>
            : <p className="skill-st">Verrouillée : apprends d'abord une bulle reliée à celle-ci.</p>)}
      </section>

      <p className="tip">L'arbre change ta façon de jouer. Ce dont tes coups ont l'air (ultimes, K.O., signatures) se choisit dans la Boutique.</p>

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
