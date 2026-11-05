import { useState } from "react";
import { TRIG_CATS, TRIG_OTHER, TRIG_CAT } from "../data/triggers.js";

/** Choix d'un déclencheur, par catégorie (Situation, Émotion, Entourage, Corps), plus « Autre ». Toucher à nouveau désélectionne. */
export default function TriggerPicker({ value, onChange, label = "Déclencheur" }) {
  const [cat, setCat] = useState(() => (value && TRIG_CAT[value] !== "autre" ? TRIG_CAT[value] : "situation"));
  const C = TRIG_CATS.find((c) => c.id === cat) || TRIG_CATS[0];
  const pick = (id) => onChange(value === id ? null : id);
  return (
    <div className="trig">
      <div className="trig-cats" role="tablist" aria-label={`${label} : catégories`}>
        {TRIG_CATS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={TRIG_CAT[value] === c.id ? "has" : ""} onClick={() => setCat(c.id)}>{c.n}</button>
        ))}
      </div>
      <div className="chiprow" role="group" aria-label={`${label} : ${C.n}`}>
        {C.items.map(([id, n]) => <button key={id} className="pick" type="button" aria-pressed={value === id} onClick={() => pick(id)}>{n}</button>)}
        <button className="pick" type="button" aria-pressed={value === TRIG_OTHER[0]} onClick={() => pick(TRIG_OTHER[0])}>{TRIG_OTHER[1]}</button>
      </div>
    </div>
  );
}
