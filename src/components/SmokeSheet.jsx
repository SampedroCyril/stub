import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import TriggerPicker from "./TriggerPicker.jsx";
import { multText } from "./ui.jsx";
import { afterSmoke, segMult, withMult, REBOUND_XP } from "../data/rules.js";
import { TRIG_NAME, TRIG_TIP, TRIG_TIP_DEFAULT } from "../data/triggers.js";

const nf = (v) => v.toLocaleString("fr-FR");

/**
 * Fenêtre pour noter une cigarette : déclencheur facultatif, puis un bilan sans jugement.
 * Ce qui change (la série, la moitié du bonus), ce qui reste (XP, niveau, badges), un conseil pour la prochaine fois
 * selon le déclencheur, et le bonus de rebond à aller chercher.
 */
export function SmokeSheet({ onClose }) {
  const { S, logSmoke } = useApp();
  const [tr, setTr] = useState(null);
  const [done, setDone] = useState(null); // {tr, before, after, xp, lv}

  const confirm = () => {
    setDone({ tr, before: S.mult, after: afterSmoke(S.mult), xp: S.quitXp, lv: S.quit.L });
    logSmoke(tr, { silent: true });
  };

  return createPortal(
    <div className="modal set-modal" role="dialog" aria-modal="true" aria-labelledby="smk-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet set-sheet smk-sheet">
        {!done ? (
          <>
            <header className="set-sheet-h"><h2 id="smk-t">Noter une cigarette</h2><button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button></header>
            <p className="tip">Ta série et tes caps santé repartent de zéro ; ton multiplicateur d'XP garde la moitié de son bonus. Ton XP, ton niveau, tes badges et ton record sont gardés. Une rechute fait partie du chemin pour beaucoup de gens.</p>
            <span className="label">Qu'est-ce qui l'a déclenchée ? (facultatif)</span>
            <TriggerPicker value={tr} onChange={setTr} />
            <div className="row2">
              <button className="btn" type="button" onClick={onClose}>Annuler</button>
              <button className="btn danger-fill" type="button" onClick={confirm}>Noter la cigarette</button>
            </div>
          </>
        ) : (
          <>
            <header className="set-sheet-h"><h2 id="smk-t">C'est noté</h2><button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button></header>
            <p className="smk-lead">Une cigarette ne défait pas ce que tu as construit. On repart d'ici.</p>
            <div className="smk-after">
              <div><small>XP sevrage</small><b>{nf(done.xp)}</b><span>gardée · niveau {done.lv}</span></div>
              <div><small>Multiplicateur</small><b>{multText(done.after)}</b><span>au lieu de {multText(done.before)}</span></div>
              <div><small>Série</small><b>0 jour</b><span>elle repart maintenant</span></div>
            </div>
            <section className="smk-tip">
              <span className="label">Pour la prochaine fois{done.tr && TRIG_NAME[done.tr] ? ` · ${TRIG_NAME[done.tr]}` : ""}</span>
              <p>{(done.tr && TRIG_TIP[done.tr]) || TRIG_TIP_DEFAULT}</p>
            </section>
            <p className="smk-reb"><b>Rebond</b> : tiens 24 heures sans fumer et gagne +{withMult(REBOUND_XP, segMult(864e5, done.after - 1))} XP en plus de ta journée.</p>
            <button className="btn green" type="button" onClick={onClose}>On repart</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
