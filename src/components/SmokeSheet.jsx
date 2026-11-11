import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import TriggerPicker from "./TriggerPicker.jsx";
import { multText } from "./ui.jsx";
import { toLocalInput } from "./Settings.jsx";
import { segMult, withMult, REBOUND_XP } from "../data/rules.js";
import { TRIG_NAME, TRIG_TIP, TRIG_TIP_DEFAULT } from "../data/triggers.js";
import { DOW, fTime } from "../lib/util.js";

const nf = (v) => v.toLocaleString("fr-FR");
const when = (d) => `${DOW[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString("fr-FR", { month: "short" })}, ${fTime(d)}`;

/** Quand : maintenant, ou plus tôt (cigarette oubliée), avec la date et l'heure. */
function WhenPicker({ id, at, setAt, min }) {
  const now = new Date();
  const past = at != null;
  return (
    <fieldset className="smk-when">
      <legend className="label">Quand ?</legend>
      <div className="seg" role="radiogroup" aria-label="Quand">
        <button type="button" role="radio" className="pick" aria-checked={!past} aria-pressed={!past} onClick={() => setAt(null)}>À l'instant</button>
        <button type="button" role="radio" className="pick" aria-checked={past} aria-pressed={past} onClick={() => setAt(past ? at : new Date(Math.max(+min, +now - 36e5)))}>Plus tôt</button>
      </div>
      {past && (
        <label className="g-field" htmlFor={id}>
          <span>Date et heure</span>
          <input id={id} type="datetime-local" value={toLocalInput(at)} min={toLocalInput(min)} max={toLocalInput(now)}
            onChange={(e) => { const d = new Date(e.target.value); if (!isNaN(d)) setAt(new Date(Math.min(Math.max(+d, +min), +now))); }} />
        </label>
      )}
    </fieldset>
  );
}

/**
 * Fenêtre « J'ai fumé une cigarette » : quand (maintenant ou plus tôt), le déclencheur, puis un bilan sans jugement.
 * On y corrige aussi les cigarettes déjà notées (heure, déclencheur) ou on les retire.
 */
export function SmokeSheet({ onClose, start = "new", edit = null }) {
  const { S, logSmoke, undoSmoke, editSmoke } = useApp();
  const [mode, setMode] = useState(edit ? "edit" : start); // new | done | list | edit
  const [tr, setTr] = useState(edit?.tr || null);
  const [at, setAt] = useState(edit ? new Date(edit.t) : null);
  const [cur, setCur] = useState(edit); // cigarette en cours de correction
  const [before, setBefore] = useState(null); // { mult, xp, lv, t, tr }
  const [sure, setSure] = useState(false);
  const min = new Date(Math.min(+S.startAt, +S.q));
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);

  const reset = (m) => { setTr(null); setAt(null); setCur(null); setSure(false); setMode(m); };
  const confirm = () => {
    const t = at || new Date();
    setBefore({ mult: S.mult, t: t.toISOString(), tr });
    logSmoke(tr, { silent: true, t, late: !!at });
    setMode("done");
  };
  const openEdit = (e) => { setCur(e); setTr(e.tr || null); setAt(new Date(e.t)); setSure(false); setMode("edit"); };
  const recent = S.smokes.slice(-20).reverse();
  const justNoted = before && S.smokes.find((e) => e.t === before.t);
  const title = { new: "J'ai fumé une cigarette", done: "C'est noté", list: "Corriger mes cigarettes", edit: "Modifier la cigarette" }[mode];

  return createPortal(
    <div className="modal set-modal" role="dialog" aria-modal="true" aria-labelledby="smk-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet set-sheet smk-sheet">
        <header className="set-sheet-h">
          {(mode === "list" || (mode === "edit" && !edit)) && <button className="set-back" type="button" aria-label="Retour" onClick={() => reset(mode === "edit" ? "list" : "new")}>‹</button>}
          <h2 id="smk-t">{title}</h2>
          <button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button>
        </header>

        {mode === "new" && (
          <>
            <WhenPicker id="smk-at" at={at} setAt={setAt} min={min} />
            <span className="label">Qu'est-ce qui l'a déclenchée ? (facultatif)</span>
            <TriggerPicker value={tr} onChange={setTr} label="Déclencheur" />
            <p className="tip">Ta série et tes caps santé repartent de zéro ; ton multiplicateur d'XP garde la moitié de son bonus. Ton XP, ton niveau et tes badges sont gardés.</p>
            <button className="btn danger-fill" type="button" onClick={confirm}>Noter la cigarette</button>
            {S.smokes.length > 0 && <button className="linkbtn" type="button" onClick={() => reset("list")}>Corriger une cigarette déjà notée</button>}
          </>
        )}

        {mode === "done" && before && (
          <>
            <p className="smk-lead">Une cigarette ne défait pas ce que tu as construit. On repart d'ici.</p>
            <div className="smk-after">
              <div><small>XP sevrage</small><b>{nf(S.quitXp)}</b><span>gardée · niveau {S.quit.L}</span></div>
              <div><small>Multiplicateur</small><b>{multText(S.mult)}</b><span>{S.mult < before.mult ? `au lieu de ${multText(before.mult)}` : "inchangé"}</span></div>
              <div><small>Série</small><b>{S.streak} j</b><span>{+S.q !== +new Date(before.t) ? "ta série continue" : S.streak ? "depuis cette cigarette" : "elle repart maintenant"}</span></div>
            </div>
            <section className="smk-tip">
              <span className="label">Pour la prochaine fois{before.tr && TRIG_NAME[before.tr] ? ` · ${TRIG_NAME[before.tr]}` : ""}</span>
              <p>{(before.tr && TRIG_TIP[before.tr]) || TRIG_TIP_DEFAULT}</p>
            </section>
            {S.streak === 0 && <p className="smk-reb"><b>Rebond</b> : tiens 24 heures sans fumer et gagne +{withMult(REBOUND_XP, segMult(864e5, S.mult - 1))} XP en plus de ta journée.</p>}
            <button className="btn green" type="button" onClick={onClose}>On repart</button>
            <div className="row2 smk-more">
              <button className="linkbtn" type="button" onClick={() => reset("new")}>J'en ai fumé une autre</button>
              {justNoted && <button className="linkbtn" type="button" onClick={() => { undoSmoke(justNoted); onClose(); }}>Annuler, erreur</button>}
            </div>
          </>
        )}

        {mode === "list" && (
          <>
            <p className="tip">Touche une cigarette pour changer son heure ou son déclencheur, ou pour la retirer.</p>
            <ul className="smk-list">
              {recent.map((e) => (
                <li key={e.t}><button type="button" onClick={() => openEdit(e)}>
                  <b>{when(new Date(e.t))}</b><span>{e.tr ? TRIG_NAME[e.tr] || e.tr : "Sans déclencheur"}</span><i aria-hidden="true">›</i>
                </button></li>
              ))}
            </ul>
            {S.smokes.length > recent.length && <p className="tip">Les plus anciennes sont dans Progrès › Stats › Journal.</p>}
          </>
        )}

        {mode === "edit" && cur && (
          <>
            <label className="g-field" htmlFor="smk-edit-at">
              <span>Date et heure</span>
              <input id="smk-edit-at" type="datetime-local" value={toLocalInput(at)} min={toLocalInput(min)} max={toLocalInput(new Date())}
                onChange={(e) => { const d = new Date(e.target.value); if (!isNaN(d)) setAt(new Date(Math.min(Math.max(+d, +min), Date.now()))); }} />
            </label>
            <span className="label">Déclencheur</span>
            <TriggerPicker value={tr} onChange={setTr} label="Déclencheur" />
            <button className="btn green" type="button" onClick={() => { editSmoke(cur, { t: at, tr }); edit ? onClose() : reset("list"); }}>Enregistrer</button>
            {!sure
              ? <button className="btn danger" type="button" onClick={() => setSure(true)}>Retirer cette cigarette</button>
              : (
                <div className="confirm">
                  <p>Elle sera retirée de ton historique, et ta série recalculée.</p>
                  <div className="row2">
                    <button className="btn" type="button" onClick={() => setSure(false)}>Garder</button>
                    <button className="btn danger-fill" type="button" onClick={() => { undoSmoke(cur); edit || !S.smokes.length ? onClose() : reset("list"); }}>Retirer</button>
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
