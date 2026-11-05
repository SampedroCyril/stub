import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import TriggerPicker from "./TriggerPicker.jsx";

/** Fenêtre pour noter une clope (une rechute) : déclencheur facultatif, et ce que ça change. */
export function SmokeSheet({ onClose }) {
  const { logSmoke } = useApp();
  const [tr, setTr] = useState(null);
  return createPortal(
    <div className="modal set-modal" role="dialog" aria-modal="true" aria-labelledby="smk-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet set-sheet smk-sheet">
        <header className="set-sheet-h"><h2 id="smk-t">Noter une clope</h2><button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button></header>
        <p className="tip">Ton sevrage repart de zéro : niveau, XP et badges sevrage. Tes stats, ton sport et ton record sont gardés. Une rechute fait partie du chemin pour beaucoup de gens.</p>
        <span className="label">Qu'est-ce qui l'a déclenchée ? (facultatif)</span>
        <TriggerPicker value={tr} onChange={setTr} />
        <div className="row2">
          <button className="btn" type="button" onClick={onClose}>Annuler</button>
          <button className="btn danger-fill" type="button" onClick={() => { logSmoke(tr); onClose(); }}>Noter la clope</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
