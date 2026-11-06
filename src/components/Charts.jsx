import { useState } from "react";

/**
 * Petits graphiques en SVG pour la page Stats. Couleurs (validées pour le daltonisme, voir README) :
 * q = envies (vert), w = cigarettes (orange), a = sport (bleu), g = combat (or), m = neutre (gris).
 * Barres fines à bout arrondi, 2 px d'écart entre segments, grille discrète ; toucher une barre affiche son détail.
 */
const W = 340, X0 = 26, X1 = 336, Y0 = 8, Y1 = 100, H = 118;

/** Plafond « rond » pour l'axe : 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50… */
export function niceMax(v) {
  if (v <= 4) return Math.max(1, Math.ceil(v));
  const steps = [5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
  for (const s of steps) if (v <= s) return s;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

/** Colonne à bout arrondi (4 px en haut, carrée à la base). */
function colPath(x, y, w, h, round) {
  if (h <= 0) return "";
  const r = round ? Math.min(4, w / 2, h) : 0;
  return `M${x},${y + h}V${y + r}${r ? `Q${x},${y} ${x + r},${y}` : ""}H${x + w - r}${r ? `Q${x + w},${y} ${x + w},${y + r}` : ""}V${y + h}Z`;
}

/**
 * Histogramme en colonnes. data : [{ key, label, tip, parts: [{ v, c }] }] (une ou plusieurs parts empilées).
 * every : un libellé d'axe toutes les n colonnes, calé sur la dernière (anchor "end") ou la première ("start").
 * yMax : plafond imposé (sinon calculé).
 */
export function Cols({ data, every = 1, anchor = "end", yMax, aria, unit = "" }) {
  const off = anchor === "end" ? (data.length - 1) % every : 0;
  const [sel, setSel] = useState(null);
  const tot = (d) => d.parts.reduce((a, p) => a + p.v, 0);
  const max = yMax ?? niceMax(Math.max(0, ...data.map(tot)));
  const slot = (X1 - X0) / data.length, bw = Math.min(24, Math.max(4, slot - 2));
  const y = (v) => Y1 - (v / max) * (Y1 - Y0);
  const ticks = max <= 4 ? [...Array(max + 1).keys()] : [0, max / 2, max];
  const cur = sel != null ? data[sel] : null;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
        {ticks.map((v) => (
          <g key={v} className="grid">
            <line x1={X0} x2={X1} y1={y(v)} y2={y(v)} />
            <text x={X0 - 6} y={y(v) + 3.5} textAnchor="end">{Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = X0 + i * slot + (slot - bw) / 2;
          let base = 0;
          const parts = d.parts.filter((p) => p.v > 0);
          return (
            <g key={d.key} className={`col${sel === i ? " sel" : ""}${sel != null && sel !== i ? " dim" : ""}`}>
              {parts.map((p, j) => {
                const top = y(base + p.v), bot = y(base) - (j ? 2 : 0);
                base += p.v;
                return <path key={j} className={`f-${p.c}`} d={colPath(x, top, bw, bot - top, j === parts.length - 1)} />;
              })}
              {i % every === off && d.label !== "" && <text className="ax" x={x + bw / 2} y={H - 4} textAnchor="middle">{d.label}</text>}
              <rect className="hit" x={X0 + i * slot} y={0} width={slot} height={H} onClick={() => setSel(sel === i ? null : i)}>
                <title>{d.tip}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <p className="chart-tip" aria-live="polite">{cur ? cur.tip : " "}{cur && unit ? ` ${unit}` : ""}</p>
    </div>
  );
}

/** Une barre 100 % découpée en parts, avec sa légende (nombre et part de chaque). parts : [{ k, label, n, c }]. */
export function Split({ parts, aria }) {
  const tot = parts.reduce((a, p) => a + p.n, 0);
  if (!tot) return null;
  const vis = parts.filter((p) => p.n);
  return (
    <div className="split">
      <div className="split-bar" role="img" aria-label={aria}>
        {vis.map((p) => <i key={p.k} className={`b-${p.c}`} style={{ flex: p.n }} />)}
      </div>
      <ul className="split-leg">
        {parts.map((p) => <li key={p.k} className={p.n ? "" : "zero"}><i className={`b-${p.c}`} /><span>{p.label}</span><b>{p.n}</b><em>{Math.round((p.n / tot) * 100)} %</em></li>)}
      </ul>
    </div>
  );
}

/** Classement en barres horizontales. rows : [{ k, label, n }]. */
export function Ranked({ rows, c = "q", max }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="ranked">
      {rows.map((r) => (
        <div key={r.k}>
          <span>{r.label}</span>
          <div className="rk-track"><i className={`b-${c}`} style={{ width: `${(r.n / m) * 100}%` }} /></div>
          <b>{r.n}</b>
        </div>
      ))}
    </div>
  );
}

/** Carte de graphique : titre, phrase d'explication, contenu. */
export function ChartCard({ title, insight, children }) {
  return (
    <section className="box chart-card">
      <h3>{title}</h3>
      {insight && <p className="insight">{insight}</p>}
      {children}
    </section>
  );
}
