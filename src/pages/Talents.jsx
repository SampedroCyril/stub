import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel, Bar } from "../components/ui.jsx";
import { BRANCHES, SKILLS, SKILL, LINKS, skillState, canLearn } from "../data/skills.js";
import { RANK_PXP, ARCADE_DAY_CAP, P_TITLES, titleOf } from "../data/rules.js";
import { pl } from "../lib/util.js";

const R = { small: 13, big: 17, key: 22 };
const VW = 520, VH = 540, TOP = 46, BOT = 52; // marges pour le niveau (en haut) et les branches (en bas)
/** Étoiles du fond, fixes. */
const STARS = Array.from({ length: 70 }, (_, i) => [(i * 389) % VW, (i * 557) % VH, (i % 3) * 0.5 + 0.4]);
const BR = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));
/** Ordre de parcours avec les flèches de la fiche : branche par branche. */
const ORDER = ["root", ...["power", "tech", "show", "hyb"].flatMap((b) => SKILLS.filter((s) => s.br === b).map((s) => s.id))];

/**
 * Niveau joueur et arbre de compétences. Toute la constellation tient à l'écran (pas de défilement ni de zoom),
 * la fiche de la bulle choisie est juste dessous, avec des flèches pour passer d'une bulle à l'autre.
 */
export default function Talents() {
  const { S, state, patchState, flash } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [sel, setSel] = useState(null);
  const [focus, setFocus] = useState(null); // branche mise en avant
  const owned = (state.skills || []).filter((id) => SKILL[id]);
  const points = Math.max(0, S.player.L - 1 - owned.length);
  const st = (id) => skillState(id, owned);
  const learnable = useMemo(() => ORDER.filter((id) => st(id) === "can"), [owned.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  // à l'ouverture : la première bulle qu'on peut apprendre, sinon le Départ
  useEffect(() => { if (!sel) setSel(points && learnable[0] ? learnable[0] : "root"); }, [sel, points, learnable]);
  const N = SKILL[sel || "root"], ns = st(N.id);
  const step = (d) => { const i = ORDER.indexOf(N.id); setSel(ORDER[(i + d + ORDER.length) % ORDER.length]); };
  // une bulle touchée : sa fiche se montre si elle était sous le bord de l'écran
  const sheet = useRef(null), touched = useRef(false);
  useEffect(() => { if (touched.current) sheet.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [sel]);
  const choose = (id) => { touched.current = true; setSel(id); };

  const learn = (id) => {
    if (!canLearn(id, owned, points)) return;
    patchState({ skills: [...owned, id] });
    flash?.([`Compétence apprise : ${SKILL[id].n}`]);
  };
  const lv = S.player;

  return (
    <Panel id="talents">
      <div className={`constel${focus ? ` focus-${focus}` : ""}`}>
        <div className="tal-head">
          <div><b>niv. {lv.L} · {titleOf(P_TITLES, lv.L)}</b><Bar pct={(lv.cur / lv.need) * 100} /></div>
          <span className={`tal-pts${points ? " on" : ""}`}>{points ? pl(points, "point") : "0 point"}</span>
        </div>
        <svg viewBox={`0 ${-TOP} ${VW} ${VH + TOP + BOT}`} className="constel-svg" role="group" aria-label="Arbre de compétences">
          <rect y={-TOP} width={VW} height={VH + TOP + BOT} className="tree-bg" />
          {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className="star" />)}
          <g className="links">
            {LINKS.map(([a, b]) => {
              const A = SKILL[a], B = SKILL[b], ha = st(a) === "has", hb = st(b) === "has";
              const br = B.br === "hyb" || A.br === "root" ? B.br : A.br;
              return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} className={`link br-${br} ${ha && hb ? "on" : ha || hb ? "half" : "off"}`} />;
            })}
          </g>
          {SKILLS.map((n) => {
            const s = st(n.id), r = R[n.k], pick = () => choose(n.id);
            return (
              <g key={n.id} className={`node ${s} br-${n.br} k-${n.k}${sel === n.id ? " sel" : ""}`} transform={`translate(${n.x} ${n.y})`}
                tabIndex={0} role="button" aria-label={`${n.n} : ${n.d}`} aria-pressed={sel === n.id}
                onClick={pick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }}>
                <circle r={Math.max(r + 12, 28)} className="hit" />
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
                {(s !== "lock" || n.k === "key" || sel === n.id) && <text y={r + 17} className="lab" textAnchor="middle">{n.n}</text>}
              </g>
            );
          })}
        </svg>
        <div className="tal-legend" role="group" aria-label="Mettre une branche en avant">
          {BRANCHES.map((b) => (
            <button key={b.id} type="button" className={`tal-chip br-${b.id}`} aria-pressed={focus === b.id} onClick={() => setFocus(focus === b.id ? null : b.id)}>{b.n}</button>
          ))}
        </div>
      </div>

      <section ref={sheet} className={`skill-sheet br-${N.br}`} aria-live="polite">
        <div className="skill-sheet-h">
          <button className="skill-nav" type="button" aria-label="Bulle précédente" onClick={() => step(-1)}>‹</button>
          <div><b>{N.n}</b><small>{N.br === "root" ? "Départ" : BR[N.br].n}</small></div>
          <button className="skill-nav" type="button" aria-label="Bulle suivante" onClick={() => step(1)}>›</button>
        </div>
        <p>{N.d}</p>
        {N.br !== "root" && (ns === "has"
          ? <p className="skill-st has">Acquise</p>
          : ns === "can"
            ? <button className="btn green" type="button" disabled={!points} onClick={() => learn(N.id)}>{points ? "Apprendre · 1 point" : "Pas de point à dépenser"}</button>
            : <p className="skill-st">Verrouillée : apprends d'abord une bulle reliée à celle-ci.</p>)}
      </section>

      <p className="tip">L'arbre change ta façon de jouer. Ce dont tes coups ont l'air se choisit dans la Boutique.</p>

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
