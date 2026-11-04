import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import { PATTERNS, BREATH_DURS } from "../data/rules.js";
import { mins, pad } from "../lib/util.js";
import { DMG, hpAt } from "../game/battle.js";
import { BOSSES } from "../game/bosses.js";

const CIRC = 703.7;
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

export default function Respirer() {
  const { state, flow, setFlow, patchState, resetFlow, commit, go, battle, hitBattle } = useApp();
  const [run, setRun] = useState(null); // {p, total, t0, craving}
  const els = useRef({});
  const fromCraving = flow.mode === "breath" && !!flow.attack && !!battle;

  const start = () => setRun({ p: state.bp, total: state.bd, t0: performance.now(), attack: fromCraving });

  // lancement automatique depuis « Je respire 2 minutes »
  useEffect(() => {
    if (flow.mode === "breath" && flow.autostart) {
      setFlow((f) => ({ ...f, autostart: false }));
      setRun({ p: state.bp, total: state.bd, t0: performance.now(), attack: !!flow.attack });
    }
  }, [flow, setFlow, state.bp, state.bd]);

  const finish = (complete) => {
    if (!run) return;
    const sec = Math.round(Math.min(run.total, (performance.now() - run.t0) / 1000));
    const r = run;
    setRun(null);
    const cyc = PATTERNS[r.p].ph.reduce((a, x) => a + x[1], 0);
    const cycles = Math.floor(sec / cyc);
    const msg = [];
    if (r.attack && battle && cycles) msg.push(`${BOSSES[battle.boss].n} prend ${hitBattle("breath", cycles * DMG.breathCycle)} dégâts !`);
    resetFlow();
    if (!complete && sec < 60) {
      if (r.attack) { go("sevrage"); if (msg.length) commit([], msg); }
      return;
    }
    go(r.attack ? "sevrage" : "accueil");
    commit([{ k: "breath", t: new Date().toISOString(), sec, p: r.p }], [`Respiration : ${mins(sec)}`, ...msg]);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (!run) return;
    let raf;
    const P = PATTERNS[run.p].ph, cyc = P.reduce((a, x) => a + x[1], 0);
    const loop = () => {
      const el = (performance.now() - run.t0) / 1000;
      let tc = el % cyc, i = 0;
      while (tc >= P[i][1]) { tc -= P[i][1]; i++; }
      const [lab, dur, a, b] = P[i];
      const k = a + (b - a) * ease(tc / dur);
      const r = 48 + 44 * k, e = els.current;
      e.blob?.setAttribute("r", r.toFixed(1));
      e.halo?.setAttribute("r", (r + 10 + 4 * k).toFixed(1));
      e.halo2?.setAttribute("r", (r + 22 + 8 * k).toFixed(1));
      if (e.phase) e.phase.textContent = lab;
      if (e.count) e.count.textContent = Math.ceil(dur - tc);
      e.prog?.setAttribute("stroke-dashoffset", (CIRC * (1 - Math.min(1, el / run.total))).toFixed(1));
      const left = Math.max(0, Math.ceil(run.total - el));
      if (e.left) e.left.textContent = `${Math.floor(left / 60)}:${pad(left % 60)} restant`;
      if (el >= run.total) { finishRef.current(true); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  const ref = (k) => (n) => { els.current[k] = n; };

  return (
    <Panel id="respirer">
      {fromCraving && <div className="banner teal"><span>Attaque contre {BOSSES[battle.boss].n} : −{Math.round(DMG.breathCycle * 100)} % PV par cycle respiré.</span><b>{hpAt(battle, new Date())} PV</b></div>}
      <section className="breath-stage">
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <defs>
            <radialGradient id="bgrad" cx="45%" cy="40%" r="65%">
              <stop offset="0" style={{ stopColor: "var(--breath)", stopOpacity: 0.55 }} />
              <stop offset="1" style={{ stopColor: "var(--breath)", stopOpacity: 0.95 }} />
            </radialGradient>
          </defs>
          <circle cx="120" cy="120" r="112" fill="none" style={{ stroke: "var(--surface)" }} strokeWidth="6" />
          <circle ref={ref("prog")} cx="120" cy="120" r="112" fill="none" style={{ stroke: "var(--breath)" }} strokeWidth="6" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 120 120)" />
          <circle ref={ref("halo2")} cx="120" cy="120" r="70" style={{ fill: "var(--breath)" }} opacity=".08" />
          <circle ref={ref("halo")} cx="120" cy="120" r="60" style={{ fill: "var(--breath)" }} opacity=".14" />
          <circle ref={ref("blob")} cx="120" cy="120" r="50" fill="url(#bgrad)" />
          <text ref={ref("phase")} className="b-phase" x="120" y="118" textAnchor="middle" style={{ fill: "#fff" }}>{run ? "" : "Prêt"}</text>
          <text ref={ref("count")} className="b-count" x="120" y="142" textAnchor="middle" style={{ fill: "#fff", opacity: 0.9 }} />
        </svg>
        <span className="b-left" ref={ref("left")}>{run ? "" : "Choisis un rythme et une durée"}</span>
        <div className="row2" style={{ width: "100%" }}>
          {!run && <button className="btn teal" type="button" onClick={start}>Commencer</button>}
          {run && <button className="btn" type="button" onClick={() => finish(false)}>Arrêter</button>}
        </div>
      </section>

      {!run && (
        <section className="stack">
          <h2>Rythme</h2>
          <div className="patterns">
            {Object.entries(PATTERNS).map(([k, p]) => (
              <button key={k} className="pattern" type="button" aria-pressed={state.bp === k} onClick={() => patchState({ bp: k })}>
                <strong>{p.n}</strong><code>{p.code}</code><span>{p.d}</span>
              </button>
            ))}
          </div>
          <h2>Durée</h2>
          <div className="chiprow">
            {BREATH_DURS.map((d) => (
              <button key={d} className="pick" type="button" aria-pressed={state.bd === d} onClick={() => patchState({ bd: d })}>{d / 60} min</button>
            ))}
          </div>
          <p className="safety"><strong>Si la tête tourne, reprends une respiration normale.</strong> Inspire par le nez, expire par la bouche, sans forcer.</p>
        </section>
      )}
    </Panel>
  );
}
