import { memo } from "react";

/** Paliers du cendrier : il change de forme en se remplissant. */
export const STAGES = [
  { max: 100, n: "Bocal", glass: "#94b0c2" },
  { max: 500, n: "Poubelle", glass: "#566c86" },
  { max: 1000, n: "Benne", glass: "#38b764" },
  { max: Infinity, n: "Volcan éteint", glass: "#b13e53" },
];
export const stageOf = (count) => {
  const i = STAGES.findIndex((s) => count < s.max);
  const st = STAGES[i];
  const lo = i ? STAGES[i - 1].max : 0;
  return { ...st, i, lo, frac: st.max === Infinity ? 1 : (count - lo) / (st.max - lo) };
};

/** Bocal pixel art rempli de mégots (24 × 28). */
function Cendrier({ count, drop = false, className = "" }) {
  const st = stageOf(count);
  const inner = { x: 3, y: 6, w: 18, h: 19 };
  const slots = Math.floor(inner.h / 2) * 4; // 4 mégots par rangée, une rangée toutes les 2 lignes
  const n = count === 0 ? 0 : Math.max(1, Math.round(st.frac * slots));
  const butts = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 4), col = i % 4;
    const y = inner.y + inner.h - 2 - row * 2;
    const x = inner.x + 1 + col * 4 + (row % 2 ? 1 : 0);
    butts.push(<g key={i}><rect x={x} y={y} width="2" height="1" fill="#ef7d57" /><rect x={x + 2} y={y} width="1" height="1" fill="#f4f4f4" /></g>);
  }
  const K = "#1a1c2c";
  return (
    <svg className={`pixel cendrier ${className}`} viewBox="0 0 24 28" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="2" width="20" height="2" fill={K} />
      <rect x="3" y="1" width="18" height="1" fill={st.glass} />
      <rect x="1" y="4" width="1" height="22" fill={K} />
      <rect x="22" y="4" width="1" height="22" fill={K} />
      <rect x="2" y="26" width="20" height="1" fill={K} />
      <rect x="2" y="4" width="20" height="22" fill={st.glass} opacity=".25" />
      {butts}
      <rect x="3" y="6" width="1" height="16" fill="#fff" opacity=".5" />
      <rect x="5" y="6" width="1" height="4" fill="#fff" opacity=".35" />
      {drop && <g className="falling"><rect x="10" y="-4" width="3" height="1" fill="#ef7d57" /><rect x="13" y="-4" width="2" height="1" fill="#f4f4f4" /></g>}
    </svg>
  );
}

export default memo(Cendrier);
