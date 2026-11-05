import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import TriggerPicker from "./TriggerPicker.jsx";

/** Fenêtre pour noter une cigarette (une rechute) : déclencheur facultatif, et ce que ça change. */
export function SmokeSheet({ onClose }) {
  const { logSmoke } = useApp();
  const [tr, setTr] = useState(null);
  return createPortal(
    <div className="modal set-modal" role="dialog" aria-modal="true" aria-labelledby="smk-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet set-sheet smk-sheet">
        <header className="set-sheet-h"><h2 id="smk-t">Noter une cigarette</h2><button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button></header>
        <p className="tip">Ta série de jours sans fumer repart de zéro, et ton multiplicateur revient à × 1. Ton XP, ton niveau, tes badges et ton record sont gardés. Une rechute fait partie du chemin pour beaucoup de gens.</p>
        <span className="label">Qu'est-ce qui l'a déclenchée ? (facultatif)</span>
        <TriggerPicker value={tr} onChange={setTr} />
        <div className="row2">
          <button className="btn" type="button" onClick={onClose}>Annuler</button>
          <button className="btn danger-fill" type="button" onClick={() => { logSmoke(tr); onClose(); }}>Noter la cigarette</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
