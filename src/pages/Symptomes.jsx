import { useApp } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import { SYMPTOMS, SYMPTOM, RED_FLAGS, SOURCES } from "../data/health.js";
import { dayKey, DAY, DOW } from "../lib/util.js";

const DAYS = 14;

/** Suivi des symptômes du sevrage : on coche ce qu'on ressent aujourd'hui, la courbe montre qu'ils reculent. */
export default function Symptomes() {
  const { S, state, patchState } = useApp();
  const log = state.sympt || {}, today = dayKey(S.now), cur = log[today];
  const set = (list) => patchState({ sympt: { ...log, [today]: list } });
  const toggle = (id) => set(cur?.includes(id) ? cur.filter((x) => x !== id) : [...(cur || []), id]);
  const days = Array.from({ length: DAYS }, (_, i) => { const d = new Date(+S.now - (DAYS - 1 - i) * DAY); const k = dayKey(d); return { d, k, n: log[k]?.length, on: k in log }; });
  const max = Math.max(3, ...days.map((x) => x.n || 0));
  const flagged = (cur || []).some((id) => SYMPTOM[id]?.flag);
  const since = (id) => { let n = 0; for (let i = 0; i < 60; i++) { const k = dayKey(new Date(+S.now - i * DAY)); if (log[k]?.includes(id)) n++; else if (i > 0) break; } return n; };

  return (
    <Panel id="symptomes">
      <section className="box sym-today">
        <h2>Aujourd'hui, tu ressens…</h2>
        <div className="sym-grid">
          {SYMPTOMS.map((s) => (
            <button key={s.id} type="button" className="sym" aria-pressed={!!cur?.includes(s.id)} onClick={() => toggle(s.id)}>{s.n}</button>
          ))}
        </div>
        <button type="button" className={`sym-none${cur && !cur.length ? " on" : ""}`} aria-pressed={!!cur && !cur.length} onClick={() => set([])}>Rien de spécial aujourd'hui</button>
      </section>

      {flagged && <Alert strong />}

      {cur?.length > 0 && (
        <section className="sym-list" aria-label="Ce que tu ressens">
          {cur.map((id) => {
            const s = SYMPTOM[id], n = since(id);
            if (!s) return null;
            return (
              <article key={id} className={`box sym-card${s.warn || s.flag ? " warn" : ""}`}>
                <header><b>{s.n}</b>{n > 1 && <small>{n} jours de suite</small>}</header>
                <p className="sym-dur">{s.dur}</p>
                <p>{s.why}</p>
                {s.tip && <p className="sym-tip">{s.tip}</p>}
                {s.warn && <p className="sym-warn">{s.warn}</p>}
                {s.src && <a className="src" href={SOURCES[s.src].u} target="_blank" rel="noreferrer">Source : {SOURCES[s.src].n}</a>}
              </article>
            );
          })}
        </section>
      )}

      <section className="box">
        <h2>Tes {DAYS} derniers jours</h2>
        <div className="sym-chart" role="img" aria-label={`Nombre de symptômes cochés par jour sur ${DAYS} jours`}>
          {days.map((x) => (
            <div key={x.k} className={`sym-bar${x.on ? "" : " off"}${x.k === today ? " today" : ""}`}>
              <i style={{ height: x.on ? `${Math.max(4, ((x.n || 0) / max) * 100)}%` : "100%" }}>{x.on && x.n ? <span>{x.n}</span> : null}</i>
              <small>{DOW[x.d.getDay()].slice(0, 1)}</small>
            </div>
          ))}
        </div>
        <p className="tip">Chaque barre compte les symptômes cochés ce jour-là ; les jours en pointillés n'ont pas été notés. La plupart des symptômes du sevrage sont passagers : quelques jours à quelques semaines.</p>
      </section>

      {!flagged && <Alert />}

      <section className="box help">
        <div><b>Tabac Info Service</b><small>Gratuit, avec des tabacologues</small></div><a className="set-link" href="tel:3989">39 89</a>
      </section>
    </Panel>
  );
}

function Alert({ strong }) {
  return (
    <section className={`box sym-alert${strong ? " strong" : ""}`} role={strong ? "alert" : undefined}>
      <h2>Quand appeler le 15</h2>
      <p>Ces signes ne sont pas le sevrage :</p>
      <ul>{RED_FLAGS.map((r) => <li key={r}>{r}</li>)}</ul>
      <a className="btn danger-fill" href="tel:15">Appeler le 15</a>
    </section>
  );
}
