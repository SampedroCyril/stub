import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel, Stat } from "../components/ui.jsx";
import BossView from "../game/BossView.jsx";
import FightScreen, { FightMenu } from "../game/FightScreen.jsx";
import GaugeView from "../game/GaugeView.jsx";
import { useClicker } from "../game/useClicker.js";
import { FRENZY } from "../game/battle.js";
import { BOSSES, traitsOf } from "../game/bosses.js";
import { DOW, fTime, pad } from "../lib/util.js";

const MODES = [
  { id: "frenzy", n: "Entraînement", d: `${FRENZY.dur / 1000} secondes pour le meilleur score. Parfait pour trouver le rythme.` },
  { id: "endless", n: "Sans fin", d: "Trois vies. Chaque raté en coûte une, et ça accélère sans arrêt." },
  { id: "bossrun", n: "Boss Run", d: "Les 11 boss à la suite, de plus en plus coriaces. Le combo continue d'un boss à l'autre : bats ton meilleur temps." },
];
const RUN = Object.keys(BOSSES).filter((id) => id !== "clope").concat("clope");
const runHp = (i) => 3000 + i * 1200;
const fmt = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;

/** Arcade : s'entraîner sans fausser ses envies. Trois modes, chacun avec son record. */
export default function Arcade() {
  const { S, state, commit, battle, go } = useApp();
  const [mode, setMode] = useState("frenzy");
  const [playing, setPlaying] = useState(false);
  const stage = useRef(null), gauge = useRef(null);
  const [last, setLast] = useState(null);
  const [idx, setIdx] = useState(0);
  const [menu, setMenu] = useState(null); // null · pause · quit
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
    gaugeRef: gauge,
    traits: mode === "bossrun" ? traitsOf(RUN[idx]) : undefined,
    duration: mode === "frenzy" ? FRENZY.dur : null,
    lives: mode === "endless" ? 3 : null,
    ramp: mode === "endless",
    unit: mode === "bossrun" ? "-" : "+",
    onHit: ({ dmg }) => {
      if (mode !== "bossrun") return dmg;
      const r = run.current, d = Math.min(dmg, Math.max(1, r.hp));
      r.hp -= d;
      if (r.hp <= 0) nextBoss();
      return d;
    },
    onCig: (took) => {
      if (took) return null;
      if (mode !== "bossrun") return 300;
      const r = run.current, d = Math.min(Math.round(runHp(r.idx) * 0.03), Math.max(1, r.hp));
      r.hp -= d;
      if (r.hp <= 0) setTimeout(nextBoss, 400);
      return d;
    },
    onEnd: (res) => {
      setPlaying(false); setMenu(null);
      if (res.silent || !res.hits) return;
      const n = mode === "bossrun" ? run.current.idx + (run.current.hp <= 0 ? 1 : 0) : undefined;
      setLast({ ...res, n, record: mode === "bossrun" ? n === RUN.length && (best == null || res.sec < best) : res.score > best });
      commit([{ k: "game", t: new Date().toISOString(), g: mode, s: res.score, c: res.combo, h: res.hits, d: res.sec, ...(n != null ? { n } : {}) }]);
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
      setTimeout(() => cl.current.resume(600), 250);
    });
  }
  // la scène existe une fois l'écran de jeu ouvert : on lance alors la partie
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => cl.current.start(), 120);
    return () => clearTimeout(id);
  }, [playing]);
  useEffect(() => { if (!clicker.active) return; const id = setInterval(() => setTick((x) => x + 1), 500); return () => clearInterval(id); }, [clicker.active]);
  useEffect(() => () => cl.current.stop(true), []);

  const open = (m) => { if (!cl.current.active || menu) return; cl.current.hold(true); setMenu(m); };
  const close = () => {
    setMenu(null);
    const d = cl.current.hold(false);
    run.current.t0 += d; // le chrono du Boss Run s'arrête aussi
  };
  const quit = () => cl.current.stop(false);
  const start = () => {
    setLast(null);
    if (mode === "bossrun") { run.current = { hp: runHp(0), t0: performance.now(), idx: 0 }; setIdx(0); }
    setPlaying(true);
  };
  const M = MODES.find((m) => m.id === mode);
  const boss = mode === "bossrun" ? RUN[idx] : "clope";
  const elapsed = mode === "bossrun" && clicker.active ? Math.round((performance.now() - run.current.t0) / 1000) : 0;

  return (
    <Panel id="arcade">
      <p className="sub">Ici tu t'entraînes sans toucher à tes envies. Ça rapporte de l'XP joueur pour tes talents, plafonnée à la journée.</p>
      {battle && (
        <button className="linkcard" type="button" onClick={() => go("sevrage")}>
          <span className="px-name" style={{ gridColumn: "1 / -1" }}>Un boss t'attend : retourne au combat de ton envie</span>
        </button>
      )}
      <div className="chiprow modes" role="tablist" aria-label="Mode de jeu">
        {MODES.map((m) => (
          <button key={m.id} className="pick" role="tab" type="button" aria-selected={mode === m.id} aria-pressed={mode === m.id} onClick={() => { setMode(m.id); setLast(null); }}>{m.n}</button>
        ))}
      </div>
      <section className="box arcade-card">
        <h3>{M.n}</h3>
        <p>{M.d}</p>
        {last && <p className="arcade-last">{last.record ? "Nouveau record ! " : ""}{mode === "bossrun" ? <><b>{last.n}/{RUN.length}</b> boss en {fmt(last.sec)}</> : <><b>{last.score}</b> points</>} · combo max {last.combo}</p>}
        <button className="btn green big" type="button" onClick={start}>{last ? "Rejouer" : "Jouer"}</button>
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

      {playing && (
        <FightScreen
          title={mode === "bossrun" ? `${idx + 1}/${RUN.length} · ${BOSSES[boss].n}` : M.n}
          right={mode === "endless" ? "♥".repeat(Math.max(0, clicker.view.lives ?? 3)) : mode === "bossrun" ? fmt(elapsed) : best ? `Record ${best}` : ""}
          onTap={() => clicker.tap()}
          onBack={() => open("quit")}
          onPause={() => open("pause")}
          menu={menu === "pause"
            ? <FightMenu title="Pause" actions={[["Reprendre", close], ["Quitter", quit]]} />
            : menu === "quit" ? <FightMenu title="Quitter la partie ?" sub="Ton score est gardé." actions={[["Quitter", quit], ["Reprendre", close, " "]]} /> : null}
        >
          <BossView key={mode === "bossrun" ? `run-${idx}` : "train"} stageRef={stage} boss={boss} maxHp={mode === "bossrun" ? runHp(idx) : 100} hp={mode === "bossrun" ? (idx === run.current.idx ? run.current.hp : runHp(idx)) : 100} training={mode !== "bossrun"} />
          <GaugeView gaugeRef={gauge} style={state.gaugeStyle || "fluid"} />
        </FightScreen>
      )}
    </Panel>
  );
}
