import { lazy, Suspense, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import Figure from "../art/Figure.jsx";
import { EX, xpOf } from "../data/exercises.js";
import { CHALLENGES, recordsOf } from "../game/challenges.js";
import { fDate } from "../lib/util.js";

const CameraCoach = lazy(() => import("../pose/CameraCoach.jsx"));

export default function Records() {
  const { S, state, commit } = useApp();
  const [open, setOpen] = useState(null);
  const rec = recordsOf(S.ev);

  const done = (c, r) => {
    const v = c.kind === "hold" ? r.sec : r.count;
    setOpen(null);
    if (!v) return;
    const prev = rec[c.id]?.v || 0;
    const items = [{ e: c.e, n: v, cam: true }];
    const msg = [`${c.n} : ${v}${c.kind === "hold" ? " s" : ""} · +${xpOf(c.e, v)} XP sport`];
    if (v > prev) msg.unshift(prev ? `Nouveau record ! ${prev} → ${v}` : "Premier record posé !");
    commit([{ k: "challenge", t: new Date().toISOString(), c: c.id, v, items }], msg);
  };

  return (
    <Panel id="records">
      <p className="sub">Des défis courts, comptés et validés par la caméra. Bats tes records, chaque tentative rapporte de l'XP sport.</p>
      <div className="records">
        {CHALLENGES.map((c) => {
          const r = rec[c.id];
          return (
            <article className="rec" key={c.id}>
              <Figure name={EX[c.e].fig} />
              <div className="rec-info">
                <strong>{c.n}</strong>
                <span className="rec-best">{r ? <><b>{r.v}{c.kind === "hold" ? " s" : ""}</b> · le {fDate(new Date(r.t))}</> : "Pas encore de record"}</span>
                <small>{c.d} · {r ? `${r.tries} tentative${r.tries > 1 ? "s" : ""}` : "caméra " + EX[c.e].cam}</small>
              </div>
              <button className="btn blue" type="button" onClick={() => setOpen(c)}>Tenter</button>
            </article>
          );
        })}
      </div>
      <p className="safety"><strong>Chauffe-toi avant de forcer.</strong> Un record se bat en forme, pas en pleine crise de vertiges : si la tête tourne, tu t'arrêtes.</p>

      {open && (
        <Suspense fallback={<div className="coach"><p className="coach-msg">Chargement…</p></div>}>
          <CameraCoach
            exId={open.e} title={open.n} target={rec[open.id]?.v || 0} model={state.model} sound={state.sound}
            challenge={open.kind === "hold" ? { kind: "hold" } : { kind: "reps", duration: open.sec }}
            onClose={() => setOpen(null)} onDone={(r) => done(open, r)}
          />
        </Suspense>
      )}
    </Panel>
  );
}
