import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel, Stat } from "../components/ui.jsx";
import BossView from "../game/BossView.jsx";
import { useClicker } from "../game/useClicker.js";
import { FRENZY } from "../game/battle.js";
import { BOSSES, traitsOf } from "../game/bosses.js";
import { DOW, fTime, pad } from "../lib/util.js";

const MODES = [
  { id: "frenzy", n: "Entraînement", d: `${FRENZY.dur / 1000} secondes pour le meilleur score. Parfait pour s'échauffer.` },
  { id: "endless", n: "Sans fin", d: "Trois vies. Chaque raté en coûte une, et ça accélère sans arrêt." },
  { id: "bossrun", n: "Boss Run", d: "Les 11 boss à la suite, de plus en plus coriaces. Le combo continue d'un boss à l'autre : bats ton meilleur temps." },
];
const RUN = Object.keys(BOSSES).filter((id) => id !== "clope").concat("clope");
const runHp = (i) => 300 + i * 120;
const fmt = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;

/** Arcade : s'entraîner sans fausser ses envies. Trois modes, chacun avec son record. */
export default function Arcade() {
  const { S, state, commit, battle, go } = useApp();
  const [mode, setMode] = useState("frenzy");
  const stage = useRef(null);
  const [last, setLast] = useState(null);
  const [idx, setIdx] = useState(0); // boss en cours du Boss Run
  const run = useRef({ hp: 0, t0: 0, idx: 0 });
  const [, setTick] = useState(0);
  const games = S.ev.filter((e) => e.k === "game" && e.g === mode);
  const best = mode === "bossrun"
    ? games.filter((e) => e.n === RUN.length).reduce((a, e) => (a == null || e.d < a ? e.d : a), null)
    : games.reduce((a, e) => Math.max(a, e.s || 0), 0);
  const bestCombo = games.reduce((a, e) => Math.max(a, e.c || 0), 0);
  const top = mode === "bossrun"
    ? [...games].sort((a, b) => (b.n || 0) - (a.n || 0) || a.d - b.d).slice(0, 5)
    : [...games].sort((a, b) => (b.s || 0) - (a.s || 0)).slice(0, 5);

  const clicker = useClicker(stage, {
    intensity: mode === "bossrun" ? 3 : 2,
    skills: state.skills,
    traits: mode === "bossrun" ? traitsOf(RUN[idx]) : undefined,
    duration: mode === "frenzy" ? FRENZY.dur : null,
    lives: mode === "endless" ? 3 : null,
    ramp: mode === "endless",
    unit: mode === "bossrun" ? "-" : "+",
    onHit: ({ dmg }) => {
      if (mode !== "bossrun") return dmg;
      const r = run.current;
      const d = Math.min(dmg, Math.max(1, r.hp));
      r.hp -= d;
      if (r.hp <= 0) nextBoss();
      return d;
    },
    onEnd: (res) => {
      if (res.silent || !res.hits) return;
      const n = mode === "bossrun" ? run.current.idx + (run.current.hp <= 0 ? 1 : 0) : undefined;
      const ev = { k: "game", t: new Date().toISOString(), g: mode, s: res.score, c: res.combo, h: res.hits, d: res.sec, ...(n != null ? { n } : {}) };
      setLast({ ...res, n, record: mode === "bossrun" ? n === RUN.length && (best == null || res.sec < best) : res.score > best });
      commit([ev]);
    },
  });
  const cl = useRef(clicker);
  cl.current = clicker;

  function nextBoss() {
    const r = run.current;
    cl.current.pause();
    stage.current?.ko().then(() => {
      if (r.idx + 1 >= RUN.length) { cl.current.stop(false); return; }
      r.idx++;
      r.hp = runHp(r.idx);
      setIdx(r.idx);
      setTimeout(() => { if (stage.current) stage.current.combo = cl.current.state()?.combo || 0; cl.current.resume(600); }, 200);
    });
  }
  const start = () => {
    setLast(null);
    if (mode === "bossrun") { run.current = { hp: runHp(0), t0: performance.now(), idx: 0 }; setIdx(0); }
    setTimeout(() => cl.current.start(), mode === "bossrun" ? 150 : 0);
  };
  useEffect(() => { if (!clicker.active) return; const id = setInterval(() => setTick((x) => x + 1), 500); return () => clearInterval(id); }, [clicker.active]);
  useEffect(() => () => cl.current.stop(true), [mode]);

  const onTap = (e) => { if (!clicker.tap(e)) stage.current?.miss(e.x, e.y); };
  const M = MODES.find((m) => m.id === mode);
  const boss = mode === "bossrun" ? RUN[idx] : "clope";
  const elapsed = clicker.active && mode === "bossrun" ? Math.round((performance.now() - run.current.t0) / 1000) : 0;

  return (
    <Panel id="arcade">
      <p className="sub">Ici tu t'entraînes sans toucher à tes envies. Ça rapporte de l'XP joueur pour l'arbre de compétences, plafonnée à la journée.</p>
      {battle && (
        <button className="linkcard" type="button" onClick={() => go("sevrage")}>
          <span className="px-name" style={{ gridColumn: "1 / -1" }}>Un boss t'attend : retourne au combat de ton envie</span>
        </button>
      )}
      <div className="chiprow modes" role="tablist" aria-label="Mode de jeu">
        {MODES.map((m) => (
          <button key={m.id} className="pick" role="tab" type="button" aria-selected={mode === m.id} aria-pressed={mode === m.id} disabled={clicker.active} onClick={() => { setMode(m.id); setLast(null); }}>{m.n}</button>
        ))}
      </div>
      <section className="arena">
        <div className="arena-head">
          <span className="px-name">{mode === "bossrun" ? `${idx + 1}/${RUN.length} · ${BOSSES[boss].n}` : "Mannequin d'entraînement"}</span>
          <span className="px-lvl">{mode === "endless" && clicker.active ? "♥".repeat(Math.max(0, clicker.view.lives || 0)) : mode === "bossrun" ? (clicker.active ? fmt(elapsed) : best != null ? `Record ${fmt(best)}` : "") : `Record ${best}`}</span>
        </div>
        <BossView key={mode === "bossrun" ? `run-${idx}` : "train"} stageRef={stage} boss={boss} maxHp={mode === "bossrun" ? runHp(idx) : 100} hp={mode === "bossrun" ? runHp(idx) : 100} training={mode !== "bossrun"} onTap={onTap} onWeakExpire={clicker.expire} />
        {!clicker.active
          ? <button className="btn green big" type="button" onClick={start}>{last ? "Rejouer" : `Lancer : ${M.n}`}</button>
          : <button className="linkbtn arena-flee" type="button" onClick={() => clicker.stop(false)}>Arrêter</button>}
        <p className="arena-tip">
          {last && !clicker.active
            ? <>{last.record ? "Nouveau record ! " : ""}{mode === "bossrun" ? <><b>{last.n}/{RUN.length}</b> boss en {fmt(last.sec)}</> : <><b>{last.score}</b> points</>} · combo max {last.combo}</>
            : M.d}
        </p>
      </section>
      <div className="stats">
        <Stat label="Record" value={mode === "bossrun" ? (best != null ? fmt(best) : "–") : best} small={mode === "bossrun" ? "run complet" : "points"} />
        <Stat label="Combo max" value={bestCombo} />
        <Stat label="Parties" value={games.length} />
      </div>
      {top.length > 0 && (
        <section className="box">
          <h3>Meilleures parties</h3>
          <div className="topx">
            {top.map((e, i) => { const d = new Date(e.t); return <div key={i}><span>{DOW[d.getDay()]} {d.getDate()} · {fTime(d)}</span><b>combo {e.c}</b><em>{mode === "bossrun" ? `${e.n}/${RUN.length} · ${fmt(e.d)}` : e.s}</em></div>; })}
          </div>
        </section>
      )}
    </Panel>
  );
}
