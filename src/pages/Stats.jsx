import { useApp } from "../store/AppStore.jsx";
import { Panel, Stat } from "../components/ui.jsx";
import { EX, fmtAmt, circuitXp } from "../data/exercises.js";
import { TRIG_NAME, METHOD_NAME, PATTERNS, DEFI_XP, methodOf } from "../data/rules.js";
import { BOSSES } from "../game/bosses.js";
import { DOW, DAY, dayKey, fTime, fmt1, mins, clamp, lastNDays, weekStart } from "../lib/util.js";

function DayBars({ rows }) {
  return (
    <div className="days">
      {rows.map((r) => (
        <div className="day" key={r.key}>
          <span>{r.label}</span>
          <div className="track">{r.parts.map((p, i) => <i key={i} className={p.cls} style={{ width: `${p.pct}%` }} />)}</div>
          <b>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

export default function Stats({ onRecap }) {
  const { S, days } = useApp();
  const today = dayKey(S.now), crav = S.cravAll, w = lastNDays(7, S.now);
  const firstDay = Object.keys(days).sort()[0];
  const span = firstDay ? clamp(Math.floor((new Date(today) - new Date(firstDay)) / DAY) + 1, 1, 7) : 1;
  const byDay = (k) => crav.filter((e) => dayKey(new Date(e.t)) === k);
  const cw = w.map((x) => { const l = byDay(x.k); const m = (k) => l.filter((e) => methodOf(e) === k).length; return { ...x, s: m("sport"), b: m("breath"), g: m("game") + m("crisis"), h: m("hold") }; });
  const sum7 = cw.reduce((a, x) => a + x.s + x.b + x.g + x.h, 0);
  const withI = crav.filter((e) => e.i);
  const avgI = withI.length ? withI.reduce((a, e) => a + e.i, 0) / withI.length : null;

  // intensité sur 14 jours
  const d14 = lastNDays(14, S.now).map((x) => { const l = byDay(x.k).filter((e) => e.i); return { ...x, n: l.length, avg: l.length ? l.reduce((a, e) => a + e.i, 0) / l.length : 0 }; });
  const a7 = d14.slice(7).filter((x) => x.n), b7 = d14.slice(0, 7).filter((x) => x.n);
  const m = (l) => l.reduce((a, x) => a + x.avg, 0) / l.length;

  // déclencheurs
  const tc = {};
  crav.forEach((e) => { if (e.tr) tc[e.tr] = (tc[e.tr] || 0) + 1; });
  const tl = Object.entries(tc).sort((a, b) => b[1] - a[1]);
  const tTot = tl.reduce((a, x) => a + x[1], 0), tMax = tl.length ? tl[0][1] : 1;

  // heures
  const hours = Array(24).fill(0);
  crav.forEach((e) => hours[new Date(e.t).getHours()]++);
  const maxH = Math.max(1, ...hours);
  const top = hours.map((n, h) => ({ n, h })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 3);
  const ts = new Set(top.map((x) => x.h));

  const maxC = Math.max(1, ...cw.map((x) => x.s + x.b + x.g + x.h));
  const xw = w.map((x) => ({ ...x, xp: S.ev.filter((e) => e.k === "circuit" && dayKey(new Date(e.t)) === x.k).reduce((a, e) => a + circuitXp(e), 0) }));
  const maxX = Math.max(1, ...xw.map((x) => x.xp));
  const tops = Object.keys(S.tot).filter((e) => EX[e]).map((e) => ({ e, n: S.tot[e], xp: Math.round(EX[e].u === "s" ? (S.tot[e] * EX[e].d) / 3 : S.tot[e] * EX[e].d) })).sort((a, b) => b.xp - a.xp).slice(0, 6);
  const recent = S.ev.slice().reverse().slice(0, 25);

  return (
    <Panel id="stats">
      <p className="sub">Tout ton historique, rechutes comprises. Rien ici n'est effacé quand tu fumes.</p>
      <section className="box recap-open">
        <div><h3>Récap de la semaine</h3><p className="tip">S'ouvre tout seul le dimanche à partir de 18h.</p></div>
        <button className="btn green" type="button" style={{ flex: "0 0 auto" }} onClick={() => onRecap(weekStart(S.now))}>Voir</button>
      </section>

      <h2 className="sec-title">Envies</h2>
      <div className="stats four">
        <Stat label="Aujourd'hui" value={byDay(today).length} />
        <Stat label="Moy. / jour" value={crav.length ? fmt1(sum7 / span).replace(",0", "") : "0"} small="7 derniers jours" />
        <Stat label="Intensité moy." value={avgI ? fmt1(avgI) : "–"} small="sur 5" />
        <Stat label="Au sport" value={crav.length ? `${Math.round((crav.filter((e) => methodOf(e) === "sport").length / crav.length) * 100)}%` : "–"} small="des envies" />
        <Stat label="Tenues" value={crav.length} small="au total" />
        <Stat label="Record" value={`${S.best} j`} small="sans fumer" />
        <Stat label="Rechutes" value={S.smokes.length} />
        <Stat label="Tentative" value={`n°${S.smokes.length + 1}`} />
      </div>

      <section className="box">
        <h3>Intensité des envies</h3>
        <p className="insight">
          {!withI.length ? "Note l'intensité quand tu appuies sur « J'ai envie » pour voir tes envies faiblir."
            : a7.length && b7.length ? (m(a7) <= m(b7)
              ? <>Tes envies baissent : <b>{fmt1(m(a7))}</b> en moyenne cette semaine contre {fmt1(m(b7))} la semaine d'avant.</>
              : <>Semaine plus dure : <b>{fmt1(m(a7))}</b> en moyenne contre {fmt1(m(b7))} avant. Ça arrive, tiens bon.</>)
              : <>Intensité moyenne : <b>{fmt1(avgI)}</b> sur 5. La tendance s'affiche après deux semaines.</>}
        </p>
        <svg className="ichart" viewBox="0 0 340 120" role="img" aria-label="Intensité moyenne des envies par jour">
          {[1, 2, 3, 4, 5].map((v) => { const y = 100 - v * 18; return <g key={v}><line x1="22" x2="336" y1={y} y2={y} style={{ stroke: "var(--line)" }} strokeWidth="1" /><text x="12" y={y + 3.5} textAnchor="middle">{v}</text></g>; })}
          {d14.map((x, i) => {
            const bx = 26 + i * 22.2, h = x.avg * 18;
            const col = x.avg < 2.5 ? "--quit" : x.avg < 3.5 ? "--warn" : "--danger";
            return (
              <g key={x.k}>
                {x.n ? <rect x={bx.toFixed(1)} y={(100 - h).toFixed(1)} width="15" height={h.toFixed(1)} rx="3" style={{ fill: `var(${col})` }} /> : <rect x={bx.toFixed(1)} y="98" width="15" height="2" rx="1" style={{ fill: "var(--line)" }} />}
                {(i % 2 === 0 || i === 13) && <text x={(bx + 7.5).toFixed(1)} y="116" textAnchor="middle">{x.d.getDate()}</text>}
              </g>
            );
          })}
        </svg>
      </section>

      <section className="box">
        <h3>Tes déclencheurs</h3>
        <p className="insight">{tl.length ? <>Ton déclencheur n°1 : <b>{TRIG_NAME[tl[0][0]]}</b> ({Math.round((tl[0][1] / tTot) * 100)} % des envies notées). Prépare une parade pour ce moment-là.</> : "Choisis un déclencheur quand tu notes une envie pour voir ce qui te fait craquer."}</p>
        <DayBars rows={tl.map(([k, n], i) => ({ key: k, label: TRIG_NAME[k] || k, value: n, parts: [{ cls: i === 0 ? "w" : "q3", pct: (n / tMax) * 100 }] }))} />
      </section>

      <section className="box">
        <h3>Tes heures critiques</h3>
        <p className="insight">{top.length ? <>Ton pic : <b>{top[0].h}h–{(top[0].h + 1) % 24}h</b>{top.length > 1 ? `, puis ${top.slice(1).map((x) => `${x.h}h`).join(" et ")}` : ""}. Prévois un circuit ou une respiration juste avant.</> : "Pas encore de données. Chaque envie notée s'ajoute ici avec son heure."}</p>
        <svg className="hours" viewBox="0 0 336 124" role="img" aria-label="Envies par heure">
          {hours.map((n, h) => {
            const bh = n ? Math.max(3, (n / maxH) * 96) : 2;
            return (
              <g key={h}>
                <rect x={2 + h * 14} y={104 - bh} width="11" height={bh} rx="2" style={{ fill: `var(${ts.has(h) ? "--quit" : n ? "--smoke" : "--line"})` }} />
                {h % 3 === 0 && <text x={7.5 + h * 14} y="120" textAnchor="middle">{h}h</text>}
              </g>
            );
          })}
        </svg>
      </section>

      <section className="box">
        <h3>Envies sur 7 jours</h3>
        <div className="legend"><span>Au sport</span><span className="l2">En respirant</span><span className="l4">En jouant</span><span className="l3">Tenues</span></div>
        <DayBars rows={cw.map((x) => ({ key: x.k, label: `${DOW[x.d.getDay()]} ${x.d.getDate()}`, value: x.s + x.b + x.g + x.h, parts: [{ cls: "q", pct: (x.s / maxC) * 100 }, { cls: "q2", pct: (x.b / maxC) * 100 }, { cls: "q4", pct: (x.g / maxC) * 100 }, { cls: "q3", pct: (x.h / maxC) * 100 }] }))} />
      </section>

      <h2 className="sec-title sport">Sport</h2>
      <div className="stats four">
        <Stat label="XP sport" value={S.sportXp} />
        <Stat label="Circuits" value={S.c.circ} />
        <Stat label="Jours actifs" value={`${w.filter((x) => S.sportDays.has(x.k)).length}/7`} small="7 derniers jours" />
        <Stat label="Série" value={`${S.sStreak} j`} small={`record ${S.bestRun} j`} />
        <Stat label="Respirations" value={S.breaths.length} small={`${mins(S.breathSec)} au total`} />
        <Stat label="Défis" value={S.allWins.length} small="réussis" />
        <Stat label="Défis sport" value={`+${S.sportWinsN * DEFI_XP}`} small="XP gagnée" />
        <Stat label="Validées caméra" value={S.c.camreps} small="reps" />
      </div>
      <section className="box">
        <h3>Totaux</h3>
        <div className="totals">
          {[["Pompes", S.c.pompes], ["Squats", S.c.squats], ["Fentes", S.c.fentes], ["Gainage", mins(S.c.gainage)], ["Cardio", mins(S.c.cardio)], ["Burpees", S.c.burpees]].map(([l, v]) => <div key={l}><span className="label">{l}</span><b>{v}</b></div>)}
        </div>
      </section>
      <section className="box">
        <h3>XP sport sur 7 jours</h3>
        <DayBars rows={xw.map((x) => ({ key: x.k, label: `${DOW[x.d.getDay()]} ${x.d.getDate()}`, value: x.xp, parts: [{ cls: "s", pct: (x.xp / maxX) * 100 }] }))} />
      </section>
      <section className="box">
        <h3>Tes exos les plus faits</h3>
        <div className="topx">
          {tops.length ? tops.map((x) => <div key={x.e}><span>{EX[x.e].n}</span><b>{EX[x.e].u === "s" ? mins(x.n) : `${x.n} reps`}</b><em>{x.xp} XP</em></div>) : <p className="empty">Aucun circuit pour l'instant.</p>}
        </div>
      </section>

      <h2>Journal</h2>
      <section className="box">
        <div className="log">
          {recent.length ? recent.map((e, i) => {
            const d = new Date(e.t);
            const when = <time>{DOW[d.getDay()]} {d.getDate()} · {fTime(d)}</time>;
            if (e.k === "craving") return <div key={i}>{when}<span className="what"><span className="k-craving">{e.b ? `${BOSSES[e.b]?.n || "Boss"} vaincu` : "Envie tenue"}</span> {METHOD_NAME[methodOf(e)]}{e.kt ? ` en ${Math.floor(e.kt / 60)}:${String(e.kt % 60).padStart(2, "0")}` : ""}{e.i ? ` · ${e.i}/5` : ""}{e.tr ? ` · ${TRIG_NAME[e.tr] || e.tr}` : ""}</span></div>;
            if (e.k === "breath") return <div key={i}>{when}<span className="what"><span className="k-breath">Respiration</span> {PATTERNS[e.p] ? PATTERNS[e.p].n.toLowerCase() : ""} · {mins(e.sec || 0)}</span></div>;
            if (e.k === "game") return <div key={i}>{when}<span className="what"><span className="k-game">Blocs</span> {e.s} points · {e.l} lignes</span></div>;
            if (e.k === "challenge") return <div key={i}>{when}<span className="what"><span className="k-circuit">Défi caméra</span> {(e.items || []).filter((it) => EX[it.e]).map((it) => `${EX[it.e].n} ${fmtAmt(it.e, it.n)}`).join("")} · +{circuitXp(e)} XP</span></div>;
            if (e.k === "smoked") return <div key={i}>{when}<span className="what"><span className="k-smoked">Clope fumée</span>, sevrage remis à zéro</span></div>;
            return <div key={i}>{when}<span className="what"><span className="k-circuit">Circuit</span> {(e.items || []).filter((it) => EX[it.e]).map((it) => `${EX[it.e].n} ${fmtAmt(it.e, it.n)}${it.cam ? " ✓" : ""}`).join(" + ")} · +{circuitXp(e)} XP</span></div>;
          }) : <p className="empty">Rien pour l'instant.</p>}
        </div>
      </section>


    </Panel>
  );
}
