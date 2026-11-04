import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import BossView from "./BossView.jsx";
import { useFrenzy } from "./useFrenzy.js";
import Figure from "../art/Figure.jsx";
import { BOSSES } from "./bosses.js";
import { hpAt, DMG, FRENZY } from "./battle.js";

const PHASE_S = 60;
const PHASES = [
  { id: "breath", n: "Respire", d: "Inspire 4 secondes, expire 6. Suis le cercle." },
  { id: "game", n: "Frénésie", d: "Une minute de points faibles. Touche-les tous, vite." },
  { id: "move", n: "Bouge", d: "Jumping jacks à fond pendant une minute." },
  { id: "final", n: "Coup final", d: "Frappe-le jusqu'à ce qu'il tombe." },
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
  const { battle, hitBattle, winBattle, fleeBattle, commit, battleView } = useApp();
  const stage = useRef(null);
  const [phase, setPhase] = useState(-1); // -1 = intro
  const [left, setLeft] = useState(3);
  const phaseEnd = useRef(0);
  const ko = useRef(false);
  const latest = useRef({});
  latest.current = { battle, winBattle };
  const [startHp] = useState(() => (battle ? hpAt(battle, new Date()) : 0));

  const frenzy = useFrenzy(stage, {
    duration: PHASE_S * 1000,
    onHit: ({ fast, combo, burst }) => hitBattle("crisis", burst ? DMG.frenzyBurst : (fast ? DMG.frenzyFast : DMG.frenzy) * (combo >= FRENZY.comboBoost ? FRENZY.boost : 1)),
    onEnd: (r) => { if (r.hits) commit([{ k: "game", t: new Date().toISOString(), g: "frenzy", s: r.score, c: r.combo, h: r.hits, d: r.sec }]); },
  });
  const frenzyRef = useRef(frenzy);
  frenzyRef.current = frenzy;

  useLayoutEffect(() => { battleView.current = true; return () => { battleView.current = false; }; }, [battleView]);
  useEffect(() => { phaseEnd.current = Date.now() + 3000; }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((phaseEnd.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && phase < 3) next();
      const s = stage.current, b = latest.current.battle;
      if (!s || !b || s.dead || s.pending || s.refuseAt) return;
      const hp = hpAt(b, new Date());
      s.setHp(hp);
      if (hp <= 0 && !ko.current) {
        ko.current = true;
        if (frenzyRef.current.active) frenzyRef.current.stop(false);
        s.ko().then(() => latest.current.winBattle());
      }
    }, 250);
    return () => clearInterval(id);
  });

  if (!battle) return null;
  const B = BOSSES[battle.boss];

  function next() {
    if (frenzyRef.current.active) frenzyRef.current.stop(false);
    if (phase >= 0 && phase < 3) {
      const d = hitBattle("crisis", DMG.crisisPhase);
      stage.current?.hit(d, { crit: true, title: `phase ${phase + 1}`, label: `-${d}` });
    }
    const p = phase + 1;
    setPhase(p);
    phaseEnd.current = p < 3 ? Date.now() + PHASE_S * 1000 : Infinity;
    if (p === 1) setTimeout(() => frenzyRef.current.start(), 900);
  }
  const P = PHASES[phase];
  const onTap = (e) => {
    if (ko.current) return;
    if (frenzy.active) { frenzy.tap(e); return; }
    const s = stage.current;
    if (!s) return;
    if (phase === 3) { const d = hitBattle("crisis", DMG.tapCrit); s.hit(d, { x: e.x, y: e.y }); navigator.vibrate?.(15); }
    else s.miss(e.x, e.y);
  };

  return (
    <div className="crisis" role="dialog" aria-modal="true" aria-label="Mode crise">
      <header className="crisis-top">
        <span className="px-name rage">{B.n} · ENRAGÉ</span>
        <ol className="crisis-steps">{PHASES.map((x, i) => <li key={x.id} className={i < phase ? "done" : i === phase ? "on" : ""}>{x.n}</li>)}</ol>
      </header>

      <div className="crisis-body arena">
        <BossView stageRef={stage} boss={battle.boss} maxHp={battle.maxHp} hp={startHp} lvl={battle.lvl} onTap={onTap} onWeakExpire={() => frenzy.active && frenzy.expire()} />
        {phase === -1 && <div className="crisis-intro"><p className="px-title">MODE CRISE</p><p>3 minutes. Tu ne réfléchis pas, tu suis. Ça commence dans {left}…</p></div>}
        {phase >= 0 && <><p className="crisis-phase">{P.n}{phase < 3 ? ` · ${left} s` : ""}</p><p className="crisis-d">{P.d}</p></>}
        {phase === 0 && <MiniBreath onCycle={() => { const d = hitBattle("crisis", DMG.breathCycle / 2); stage.current?.hit(d, { kind: "refuse", label: `-${d}` }); }} />}
        {phase === 2 && <div className="crisis-move"><Figure name="jacks" /></div>}
      </div>

      <footer className="crisis-foot">
        {phase >= 0 && phase < 3 && <button className="btn" type="button" onClick={next}>Phase suivante</button>}
        <button className="linkbtn" type="button" onClick={fleeBattle}>Fausse alerte</button>
      </footer>
    </div>
  );
}
