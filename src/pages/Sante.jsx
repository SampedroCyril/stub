import { useApp } from "../store/AppStore.jsx";
import { Panel, Bar } from "../components/ui.jsx";
import Icon, { LUNG_L, LUNG_R } from "../art/Icon.jsx";
import { healthState } from "../lib/compute.js";
import { HEALTH } from "../data/rules.js";
import { SOURCES } from "../data/health.js";
import { fDate, fTime, durationText } from "../lib/util.js";

export default function Sante() {
  const { S } = useApp();
  const hs = healthState(S), el = S.elapsed;
  const level = (hs.doneN + (hs.next ? hs.frac : 0)) / HEALTH.length;
  const fillY = 36 - 26 * level;

  return (
    <Panel id="sante">
      <section className="health-hero">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <defs>
            <clipPath id="lclip"><rect x="0" y={fillY.toFixed(2)} width="40" height="40" /></clipPath>
            <linearGradient id="lgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--pink)" }} />
              <stop offset="1" style={{ stopColor: "var(--heart)" }} />
            </linearGradient>
          </defs>
          <path d={LUNG_L} style={{ fill: "var(--smoke)" }} />
          <path d={LUNG_R} style={{ fill: "var(--smoke)" }} />
          <g clipPath="url(#lclip)"><path d={LUNG_L} fill="url(#lgrad)" /><path d={LUNG_R} fill="url(#lgrad)" /></g>
          <path d="M20 6v13m0 0l-4 4m4-4l4 4" fill="none" style={{ stroke: "var(--muted)" }} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10.5 22c1.2-3 2.6-4.6 4.5-5.4M29.5 22c-1.2-3-2.6-4.6-4.5-5.4" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <div>
          <span className="label">Ton corps se répare</span>
          <span className="big-num">{hs.doneN} / {HEALTH.length}</span>
          <strong>caps santé atteints</strong>
          <span className="tip">{hs.next ? `Prochain : ${hs.next.t.toLowerCase()}, dans ${durationText(hs.next.ms - el)}.` : "Tu as tout débloqué."} Les poumons se colorent à chaque cap.</span>
        </div>
      </section>

      <div className="timeline">
        {HEALTH.map((h, i) => {
          const done = el >= h.ms, isNext = i === hs.idx, at = new Date(+S.q + h.ms);
          return (
            <div className={`ms ${done ? "done" : isNext ? "next" : "todo"}`} key={h.lab}>
              <Icon name={h.ic} col={h.col} />
              <div className="body">
                <div className="when"><b>{done ? "✓ " : ""}{h.lab}</b><span>{done ? `Atteint le ${fDate(at)} à ${fTime(at)}` : `Dans ${durationText(h.ms - el)}`}</span></div>
                <h3>{h.t}</h3>
                <p>{h.d}</p>
                {isNext && <Bar pct={hs.frac * 100} />}
              </div>
            </div>
          );
        })}
      </div>
      <p className="tip">Repères généraux : les délais varient d'une personne à l'autre. La vapoteuse avec nicotine compte aussi : le compteur part de ta dernière nicotine.</p>
      <p className="srcs">Sources : <a href={SOURCES.vidal.u} target="_blank" rel="noreferrer">{SOURCES.vidal.n}</a> · <a href={SOURCES.nhs.u} target="_blank" rel="noreferrer">{SOURCES.nhs.n}</a></p>
    </Panel>
  );
}
