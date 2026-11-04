import { useEffect, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Q_TITLES, S_TITLES, titleOf } from "../data/rules.js";
import { pad } from "../lib/util.js";

export const Stat = ({ label, value, small }) => (
  <div className="stat">
    <span className="label">{label}</span>
    <b>{value}</b>
    {small != null && small !== "" && <small>{small}</small>}
  </div>
);

export const Bar = ({ pct, color, height }) => (
  <div className="bar" style={height ? { height } : undefined}>
    <i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, ...(color ? { background: color } : {}) }} />
  </div>
);

export function LevelCard({ kind, label }) {
  const { S } = useApp();
  const lv = kind === "quit" ? S.quit : S.sport;
  const titles = kind === "quit" ? Q_TITLES : S_TITLES;
  return (
    <div className={`lvl ${kind === "quit" ? "quit" : "sport"}`}>
      <span className="label">{label}</span>
      <div className="lvl-top">
        <span className="lvl-num"><small>niv.</small>{lv.L}</span>
        <span className="lvl-xp">{lv.cur} / {lv.need} XP</span>
      </div>
      <span className="lvl-title">{titleOf(titles, lv.L)}</span>
      <Bar pct={(lv.cur / lv.need) * 100} />
    </div>
  );
}

export const Dots = ({ d }) => (
  <span className="dots" aria-label={`Difficulté ${d} sur 5`}>
    {"●".repeat(d)}<span>{"●".repeat(5 - d)}</span>
  </span>
);

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <p className="toast" aria-live="polite" key={toast.id}>
      {toast.msgs.map((m, i) => <span key={i}>{m}<br /></span>)}
    </p>
  );
}

/** Décompte « Passe dans ~4:12 » jusqu'à endsAt. */
export function useCountdown(endsAt) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return "";
  const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  return left > 0 ? `Passe dans ~${Math.floor(left / 60)}:${pad(left % 60)}` : "C'est passé 💪";
}

export const Panel = ({ id, children }) => {
  const { view } = useApp();
  if (view !== id) return null;
  return <div className="panel" id={`panel-${id}`} role="tabpanel">{children}</div>;
};
