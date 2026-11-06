import { useMemo, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel, Stat } from "../components/ui.jsx";
import { Cols, Split, Ranked, ChartCard } from "../components/Charts.jsx";
import { EX, fmtAmt, circuitXp } from "../data/exercises.js";
import { METHOD_NAME, PATTERNS, methodOf, ivOf } from "../data/rules.js";
import { TRIG_NAME, CAT_NAME } from "../data/triggers.js";
import { BOSSES } from "../game/bosses.js";
import { cravingStats, smokeStats } from "../lib/insights.js";
import { DOW, dayKey, fTime, fmt1, mins, pl, durationText, lastNDays, weekStart } from "../lib/util.js";

const TABS = [["envies", "Envies"], ["cigarettes", "Cigarettes"], ["sport", "Sport"], ["journal", "Journal"]];
const DOW_MON = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
const DOW_LONG = ["le lundi", "le mardi", "le mercredi", "le jeudi", "le vendredi", "le samedi", "le dimanche"];
const dayLab = (d) => `${DOW[d.getDay()]} ${d.getDate()}`;
const hourLab = (h) => `${h}h–${(h + 1) % 24}h`;
const KEY = "stub:stats-tab";
const readTab = () => { try { return localStorage.getItem(KEY) || "envies"; } catch { return "envies"; } };

/**
 * Stats : un seul endroit, quatre onglets. Chaque onglet commence par trois chiffres clés,
 * puis un graphique par question (combien, quand, pourquoi), chacun avec une phrase qui le résume.
 */
export default function Stats({ onRecap }) {
  const { S } = useApp();
  const [tab, setTabState] = useState(readTab);
  const setTab = (t) => { setTabState(t); try { localStorage.setItem(KEY, t); } catch { /* stockage indisponible */ } };

  return (
    <Panel id="stats">
      <div className="chiprow modes stat-tabs" role="tablist" aria-label="Thème">
        {TABS.map(([id, n]) => <button key={id} className="pick" role="tab" type="button" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>{n}</button>)}
      </div>
      {tab === "envies" && <Envies />}
      {tab === "cigarettes" && <Cigarettes />}
      {tab === "sport" && <Sport />}
      {tab === "journal" && <Journal />}
      <section className="box recap-open">
        <div><h3>Récap de la semaine</h3><p className="tip">S'ouvre tout seul le dimanche à partir de 18h.</p></div>
        <button className="btn" type="button" style={{ flex: "0 0 auto" }} onClick={() => onRecap(weekStart(S.now))}>Voir</button>
      </section>
    </Panel>
  );
}

/** Ce qui déclenche : catégories puis déclencheurs précis. */
function Triggers({ trig, c, what }) {
  if (!trig.tagged) return <p className="empty">Choisis un déclencheur quand tu notes {what} : ses causes apparaîtront ici.</p>;
  return (
    <>
      <Ranked c={c} rows={trig.cats.map(([k, n]) => ({ k, label: CAT_NAME[k] || k, n }))} />
      <span className="label rk-sub">En détail</span>
      <Ranked c={c} rows={trig.top.slice(0, 5).map(([k, n]) => ({ k, label: TRIG_NAME[k] || k, n }))} />
      {trig.untagged > 0 && <p className="tip">{trig.untagged} sans déclencheur noté.</p>}
    </>
  );
}

function Envies() {
  const { S } = useApp();
  const s = useMemo(() => cravingStats(S.cravAll, S.now), [S.cravAll, S.now]);
  if (!s.total) return <p className="empty box">Aucune envie notée pour l'instant. Appuie sur « J'ai envie de fumer » la prochaine fois : tes stats se construiront ici.</p>;
  const diff = s.week - s.prev;
  const [tTop] = s.trig.top;
  const M = { sport: ["Au sport", "a"], breath: ["En respirant", "q"], game: ["Au combat", "g"], hold: ["Sans rien", "m"] };
  return (
    <>
      <div className="stats">
        <Stat label="Cette semaine" value={s.week} small={diff === 0 ? "autant qu'avant" : `${Math.abs(diff)} de ${diff > 0 ? "plus" : "moins"} qu'avant`} />
        <Stat label="Intensité" value={s.iv != null ? fmt1(s.iv) : "–"} small="sur 10, 7 jours" />
        <Stat label="Tenues" value={s.total} small="au total" />
      </div>

      <ChartCard title="Tes envies, jour par jour" insight={s.week < s.prev ? <>Moins d'envies que la semaine d'avant : <b>{s.week}</b> contre {s.prev}.</> : <>{s.week} envie{s.week > 1 ? "s" : ""} ces 7 derniers jours. Chacune tenue te rapproche du but.</>}>
        <Cols aria="Envies par jour sur 14 jours" every={2} data={s.d14.map((x) => ({ key: x.k, label: x.d.getDate(), tip: `${dayLab(x.d)} : ${pl(x.n, "envie")}`, parts: [{ v: x.n, c: "q" }] }))} />
      </ChartCard>

      <ChartCard title="Leur intensité" insight={s.iv != null && s.ivPrev != null ? (s.iv <= s.ivPrev ? <>Tes envies faiblissent : <b>{fmt1(s.iv)}</b> sur 10 en moyenne, contre {fmt1(s.ivPrev)} la semaine d'avant.</> : <>Semaine plus dure : <b>{fmt1(s.iv)}</b> sur 10 contre {fmt1(s.ivPrev)}. Ça arrive, et ça redescend.</>) : "La tendance s'affiche quand tu as noté l'intensité deux semaines de suite."}>
        <Cols aria="Intensité moyenne des envies par jour, sur 10" every={2} yMax={10} data={s.d14.map((x) => ({ key: x.k, label: x.d.getDate(), tip: x.iv != null ? `${dayLab(x.d)} : ${fmt1(x.iv)} sur 10` : `${dayLab(x.d)} : pas d'intensité notée`, parts: [{ v: x.iv || 0, c: "q" }] }))} />
      </ChartCard>

      <ChartCard title="Comment tu les tiens">
        <Split aria="Répartition des envies tenues par façon" parts={s.methods.map(([k, n]) => ({ k, label: M[k][0], n, c: M[k][1] }))} />
        {S.breaths.length > 0 && <p className="tip">{pl(S.breaths.length, "séance")} de respiration au total, {mins(S.breathSec)}.</p>}
      </ChartCard>

      <ChartCard title="Quand elles arrivent" insight={<>Ton heure la plus difficile : <b>{hourLab(s.peakH)}</b>, et ton jour : <b>{DOW_LONG[s.peakD]}</b>. Prévois une respiration ou un circuit juste avant.</>}>
        <Cols aria="Envies par heure de la journée" every={3} anchor="start" data={s.hours.map((n, h) => ({ key: h, label: `${h}h`, tip: `${hourLab(h)} : ${pl(n, "envie")}`, parts: [{ v: n, c: "q" }] }))} />
        <Cols aria="Envies par jour de la semaine" data={s.dow.map((n, i) => ({ key: i, label: DOW_MON[i], tip: `${DOW_MON[i]} : ${pl(n, "envie")}`, parts: [{ v: n, c: "q" }] }))} />
      </ChartCard>

      <ChartCard title="Ce qui les déclenche" insight={tTop ? <>Ton déclencheur n°1 : <b>{TRIG_NAME[tTop[0]]}</b> ({Math.round((tTop[1] / s.trig.tagged) * 100)} % des envies où tu l'as noté).</> : null}>
        <Triggers trig={s.trig} c="q" what="une envie" />
      </ChartCard>
    </>
  );
}

function Cigarettes() {
  const { S } = useApp();
  const s = useMemo(() => smokeStats(S.smokes, S.cravAll, S.now), [S.smokes, S.cravAll, S.now]);
  const [tTop] = s.trig.top;
  if (!s.total) {
    return (
      <section className="box empty-good">
        <h3>Aucune cigarette notée</h3>
        <p>Si ça arrive, note-la avec son déclencheur : tu verras ici quand et pourquoi, pour mieux t'y préparer.</p>
        {S.cravAll.length > 0 && <p><b>{S.cravAll.length}</b> envie{S.cravAll.length > 1 ? "s" : ""} tenue{S.cravAll.length > 1 ? "s" : ""}, aucune cigarette : 100 %.</p>}
      </section>
    );
  }
  return (
    <>
      <div className="stats">
        <Stat label="Dernière" value={durationText(S.now - s.last)} small={`${dayLab(s.last)}, ${fTime(s.last)}`} />
        <Stat label="Sur 30 jours" value={s.n30} small={`${s.total} au total`} />
        <Stat label="Envies tenues" value={s.heldPct != null ? `${Math.round(s.heldPct * 100)} %` : "–"} small="sur 30 jours" />
      </div>

      <ChartCard title="Envies tenues face aux cigarettes" insight={s.heldPct != null ? <>Sur 30 jours, tu as tenu <b>{s.held30}</b> envie{s.held30 > 1 ? "s" : ""} pour {pl(s.n30, "cigarette")}.</> : null}>
        <div className="legend"><span className="lg-q">Envies tenues</span><span className="lg-w">Cigarettes</span></div>
        <Cols aria="Envies tenues et cigarettes par semaine, sur 8 semaines" data={s.weeks.map((w, i) => ({ key: i, label: i === 7 ? "Cette sem." : `${w.from.getDate()}/${w.from.getMonth() + 1}`, tip: `Semaine du ${w.from.getDate()}/${w.from.getMonth() + 1} : ${w.held} tenue${w.held > 1 ? "s" : ""}, ${pl(w.smoked, "cigarette")}`, parts: [{ v: w.smoked, c: "w" }, { v: w.held, c: "q" }] }))} every={2} />
      </ChartCard>

      <ChartCard title="Jour par jour">
        <Cols aria="Cigarettes par jour sur 30 jours" every={5} data={s.d30.map((x) => ({ key: x.k, label: x.d.getDate(), tip: `${dayLab(x.d)} : ${pl(x.n, "cigarette")}`, parts: [{ v: x.n, c: "w" }] }))} />
      </ChartCard>

      <ChartCard title="Quand" insight={<>Le plus souvent vers <b>{hourLab(s.peakH)}</b>, et surtout <b>{DOW_LONG[s.peakD]}</b>. C'est le moment à préparer.</>}>
        <Cols aria="Cigarettes par heure de la journée" every={3} anchor="start" data={s.hours.map((n, h) => ({ key: h, label: `${h}h`, tip: `${hourLab(h)} : ${pl(n, "cigarette")}`, parts: [{ v: n, c: "w" }] }))} />
        <Cols aria="Cigarettes par jour de la semaine" data={s.dow.map((n, i) => ({ key: i, label: DOW_MON[i], tip: `${DOW_MON[i]} : ${pl(n, "cigarette")}`, parts: [{ v: n, c: "w" }] }))} />
      </ChartCard>

      <ChartCard title="Pourquoi" insight={tTop ? <>Ce qui te fait le plus craquer : <b>{TRIG_NAME[tTop[0]]}</b> ({Math.round((tTop[1] / s.trig.tagged) * 100)} %).</> : null}>
        <Triggers trig={s.trig} c="w" what="une cigarette" />
      </ChartCard>

      <p className="tip">Record sans fumer : {pl(S.best, "jour")}. Une cigarette ne t'enlève ni ton XP ni ton niveau.</p>
    </>
  );
}

function Sport() {
  const { S } = useApp();
  const d14 = lastNDays(14, S.now).map((x) => ({ ...x, xp: S.ev.filter((e) => e.k === "circuit" && dayKey(new Date(e.t)) === x.k).reduce((a, e) => a + circuitXp(e), 0) }));
  const tops = Object.keys(S.tot).filter((e) => EX[e]).map((e) => ({ e, n: S.tot[e], xp: Math.round(EX[e].u === "s" ? (S.tot[e] * EX[e].d) / 3 : S.tot[e] * EX[e].d) })).sort((a, b) => b.xp - a.xp).slice(0, 5);
  const active = lastNDays(7, S.now).filter((x) => S.sportDays.has(x.k)).length;
  if (!S.c.circ) return <p className="empty box">Aucun circuit pour l'instant. Lance-en un depuis Sport, ou choisis « Bouger » pendant une envie.</p>;
  return (
    <>
      <div className="stats">
        <Stat label="Circuits" value={S.c.circ} small={`${active}/7 jours actifs`} />
        <Stat label="Série" value={`${S.sStreak} j`} small={`record ${S.bestRun} j`} />
        <Stat label="XP sport" value={S.sportXp.toLocaleString("fr-FR")} small={S.c.camreps ? `${S.c.camreps} reps à la caméra` : "au total"} />
      </div>
      <ChartCard title="XP sport, jour par jour" insight="Sans multiplicateur, pour comparer tes séances entre elles.">
        <Cols aria="XP sport par jour sur 14 jours" every={2} data={d14.map((x) => ({ key: x.k, label: x.d.getDate(), tip: `${dayLab(x.d)} : ${x.xp} XP`, parts: [{ v: x.xp, c: "a" }] }))} />
      </ChartCard>
      <ChartCard title="Tes totaux">
        <div className="totals">
          {[["Pompes", S.c.pompes], ["Squats", S.c.squats], ["Fentes", S.c.fentes], ["Gainage", mins(S.c.gainage)], ["Cardio", mins(S.c.cardio)], ["Burpees", S.c.burpees]].map(([l, v]) => <div key={l}><span className="label">{l}</span><b>{v}</b></div>)}
        </div>
      </ChartCard>
      <ChartCard title="Tes exercices les plus faits">
        <Ranked c="a" rows={tops.map((x) => ({ k: x.e, label: `${EX[x.e].n} · ${EX[x.e].u === "s" ? mins(x.n) : `${x.n} reps`}`, n: x.xp }))} />
        <p className="tip">Classés par XP de base gagnée.</p>
      </ChartCard>
    </>
  );
}

const KINDS = [["all", "Tout"], ["craving", "Envies"], ["smoked", "Cigarettes"], ["sport", "Sport"], ["game", "Jeux"]];
const kindOf = (e) => (e.k === "circuit" || e.k === "challenge" ? "sport" : e.k === "breath" ? "craving" : e.k);

/** Journal : tout ce qui a été noté, groupé par jour, filtrable. */
function Journal() {
  const { S } = useApp();
  const [f, setF] = useState("all");
  const [n, setN] = useState(40);
  const list = S.ev.filter((e) => f === "all" || kindOf(e) === f).slice().reverse();
  const shown = list.slice(0, n);
  const groups = [];
  shown.forEach((e) => { const k = dayKey(new Date(e.t)); if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, d: new Date(e.t), l: [] }); groups[groups.length - 1].l.push(e); });
  return (
    <>
      <div className="chiprow mini" role="group" aria-label="Filtrer le journal">
        {KINDS.map(([id, lab]) => <button key={id} className="pick" type="button" aria-pressed={f === id} onClick={() => { setF(id); setN(40); }}>{lab}</button>)}
      </div>
      {groups.length ? groups.map((g) => (
        <section key={g.k} className="box log-day">
          <h3>{g.d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase())}</h3>
          <div className="log">{g.l.map((e, i) => <Line key={i} e={e} />)}</div>
        </section>
      )) : <p className="empty box">Rien pour l'instant.</p>}
      {list.length > n && <button className="btn" type="button" onClick={() => setN(n + 40)}>Voir plus</button>}
    </>
  );
}

function Line({ e }) {
  const d = new Date(e.t), when = <time>{fTime(d)}</time>;
  const row = (cls, title, rest) => <div>{when}<span className="what"><span className={cls}>{title}</span>{rest}</span></div>;
  if (e.k === "craving") return row("k-craving", e.b ? `${BOSSES[e.b]?.n || "Boss"} vaincu` : "Envie tenue", ` ${METHOD_NAME[methodOf(e)]}${ivOf(e) ? ` · ${ivOf(e)}/10` : ""}${e.tr ? ` · ${TRIG_NAME[e.tr] || e.tr}` : ""}`);
  if (e.k === "breath") return row("k-breath", "Respiration", ` ${PATTERNS[e.p] ? PATTERNS[e.p].n.toLowerCase() : ""} · ${mins(e.sec || 0)}`);
  if (e.k === "game") return row("k-game", e.g === "frenzy" ? "Frénésie" : "Blocs", ` ${e.s} points`);
  if (e.k === "smoked") return row("k-smoked", "Cigarette", e.tr ? ` · ${TRIG_NAME[e.tr] || e.tr}` : "");
  if (e.k === "challenge") return row("k-circuit", "Défi caméra", ` ${(e.items || []).filter((it) => EX[it.e]).map((it) => `${EX[it.e].n} ${fmtAmt(it.e, it.n)}`).join("")}`);
  return row("k-circuit", "Circuit", ` ${(e.items || []).filter((it) => EX[it.e]).map((it) => `${EX[it.e].n} ${fmtAmt(it.e, it.n)}${it.cam ? " ✓" : ""}`).join(" + ")}`);
}
