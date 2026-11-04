import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import Pixel from "./Pixel.jsx";
import Blocs from "./Blocs.jsx";
import Figure from "../art/Figure.jsx";
import { BOSSES } from "./bosses.js";
import { hpAt, DMG } from "./battle.js";

const PHASE_S = 60;
const PHASES = [
  { id: "breath", n: "Respire", d: "Inspire 4 secondes, expire 6. Suis le cercle." },
  { id: "game", n: "Joue", d: "Une minute de blocs. Chaque ligne le blesse." },
  { id: "move", n: "Bouge", d: "Jumping jacks à fond pendant une minute." },
  { id: "final", n: "Coup final", d: "Tape-le jusqu'à ce qu'il tombe." },
];

/** Cercle de respiration 4 · 6 ; appelle onCycle à chaque cycle terminé. */
function MiniBreath({ onCycle }) {
  const blob = useRef(null), label = useRef(null), cb = useRef(onCycle);
  cb.current = onCycle;
  useEffect(() => {
    const t0 = performance.now();
    let raf, cycles = 0;
    const loop = () => {
      const el = (performance.now() - t0) / 1000, tc = el % 10;
      const inhale = tc < 4, k = inhale ? 0.5 - 0.5 * Math.cos((Math.PI * tc) / 4) : 0.5 + 0.5 * Math.cos((Math.PI * (tc - 4)) / 6);
      blob.current?.setAttribute("r", (34 + 40 * k).toFixed(1));
      if (label.current) label.current.textContent = inhale ? "Inspire" : "Expire";
      const done = Math.floor(el / 10);
      if (done > cycles) { cycles = done; cb.current?.(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg viewBox="0 0 200 200" className="crisis-breath" aria-hidden="true">
      <circle ref={blob} cx="100" cy="100" r="34" style={{ fill: "var(--breath)" }} />
      <text ref={label} x="100" y="106" textAnchor="middle" className="b-phase" style={{ fill: "#fff" }}>Inspire</text>
    </svg>
  );
}

/** Mode crise : envie à 5, boss enragé, 4 phases qui s'enchaînent sans choix à faire. */
export default function Crisis() {
  const { battle, hitBattle, winBattle, fleeBattle, commit } = useApp();
  const [phase, setPhase] = useState(-1); // -1 = intro
  const [left, setLeft] = useState(3);
  const [hurt, setHurt] = useState(0);
  const phaseEnd = useRef(0);

  useEffect(() => { phaseEnd.current = Date.now() + 3000; }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((phaseEnd.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && phase < 3) next();
    }, 250);
    return () => clearInterval(id);
  });

  if (!battle) return null;
  const B = BOSSES[battle.boss];
  const hp = hpAt(battle, new Date());
  const pct = (hp / battle.maxHp) * 100;

  function next() {
    if (phase >= 0 && phase < 3) { hitBattle("crisis", DMG.crisisPhase); setHurt((h) => h + 1); }
    const p = phase + 1;
    setPhase(p);
    phaseEnd.current = p < 3 ? Date.now() + PHASE_S * 1000 : Infinity;
  }
  const P = PHASES[phase];

  return (
    <div className="crisis" role="dialog" aria-modal="true" aria-label="Mode crise">
      <header className="crisis-top">
        <span className="px-name rage">{B.n} · ENRAGÉ</span>
        <div className="hp"><i style={{ width: `${pct}%` }} className={pct < 25 ? "low" : pct < 55 ? "mid" : ""} /><span>{hp} PV</span></div>
        <ol className="crisis-steps">{PHASES.map((x, i) => <li key={x.id} className={i < phase ? "done" : i === phase ? "on" : ""}>{x.n}</li>)}</ol>
      </header>

      <div className="crisis-body">
        {phase === -1 && (
          <div className="crisis-intro">
            <Pixel name={B.sprite} className="boss rage-shake" />
            <p className="px-title">MODE CRISE</p>
            <p>3 minutes. Tu ne réfléchis pas, tu suis. Ça commence dans {left}…</p>
          </div>
        )}
        {phase >= 0 && <><p className="crisis-phase">{P.n}{phase < 3 ? ` · ${left} s` : ""}</p><p className="crisis-d">{P.d}</p></>}
        {phase === 0 && <MiniBreath onCycle={() => { hitBattle("crisis", DMG.breathCycle / 2); setHurt((h) => h + 1); }} />}
        {phase === 1 && (
          <Blocs duration={PHASE_S} autoStart
            onLines={(n) => { hitBattle("crisis", n >= 4 ? DMG.quad / 2 : (DMG.line / 2) * n); setHurt((h) => h + 1); }}
            onEnd={(r) => commit([{ k: "game", t: new Date().toISOString(), g: "blocs", s: r.score, l: r.lines, d: r.sec }])}
          />
        )}
        {phase === 2 && <div className="crisis-move"><Figure name="jacks" /></div>}
        {phase === 3 && (
          <button type="button" className={`boss-hit final${hurt % 2 ? " hurt-a" : " hurt-b"}`}
            onClick={() => {
              hitBattle("crisis", DMG.tapCrit);
              setHurt((h) => h + 1);
              navigator.vibrate?.(20);
              if (hpAt(battle, new Date()) <= Math.round(battle.maxHp * DMG.tapCrit)) setTimeout(winBattle, 300);
            }}
            aria-label="Frapper le boss"
          >
            <Pixel name={B.sprite} className={`boss${hurt % 2 ? " hurt" : ""}`} />
          </button>
        )}
      </div>

      <footer className="crisis-foot">
        {phase >= 0 && phase < 3 && <button className="btn" type="button" onClick={next}>Phase suivante</button>}
        <button className="linkbtn" type="button" onClick={fleeBattle}>Fausse alerte</button>
      </footer>
    </div>
  );
}
