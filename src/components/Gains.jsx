import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import { Bar } from "./ui.jsx";
import { gains, timeText, eur, MIN_PER_CIG, PACK } from "../lib/gains.js";
import { fDate } from "../lib/util.js";

/** Les gains, calculés une fois depuis l'état : même source pour la carte et la fenêtre. */
export function useGains() {
  const { S, state } = useApp();
  return gains(S.ev, { now: S.now, startAt: S.startAt, cpd: state.cpd || 0, price: state.packPrice || 0, pack: state.packSize || PACK, reward: state.reward, spent: state.spent || 0 });
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const pl = (n, w, ws = `${w}s`) => (n > 1 ? ws : w);

/**
 * Carte « Tes gains » de l'Accueil. L'argent en gros (le rythme la première semaine, puis le total),
 * la récompense choisie, le temps et les paquets en petit. Toute la carte ouvre la fenêtre qui explique.
 */
export function GainsCard() {
  const g = useGains();
  const [open, setOpen] = useState(false);
  const money = g && g.perCig > 0;
  return (
    <>
      <button type="button" className="gains-card" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="label">Tes gains</span>
        {!g ? (
          <span className="gc-empty">Dis-nous combien tu fumais : tu verras l'argent et le temps que tu gagnes.</span>
        ) : (
          <>
            {money ? (
              g.early
                ? <span className="gc-big">≈ {eur(g.perMonth)}<small> par mois</small></span>
                : <span className="gc-big">{eur(g.saved)}<small> économisés</small></span>
            ) : <span className="gc-big">{n0(g.avoided)}<small> {pl(g.avoided, "cigarette évitée", "cigarettes évitées")}</small></span>}
            {money && g.early && <span className="gc-sub">à ce rythme · {eur(g.saved)} déjà économisés</span>}
            {g.reward && (
              <span className="gc-goal">
                <span>{g.reward.n} · {eur(g.reward.have)} sur {eur(g.reward.price)}</span>
                <Bar pct={g.reward.pct * 100} color="var(--quit)" />
              </span>
            )}
            <span className="gc-sub">≈ {timeText(g.minutes)} de temps libre gagné{g.packs ? ` · ${n0(g.packs)} ${pl(g.packs, "paquet")} pas ${pl(g.packs, "acheté")}` : ""}</span>
          </>
        )}
        <span className="chev" aria-hidden="true">›</span>
      </button>
      {open && <GainsSheet onClose={() => setOpen(false)} />}
    </>
  );
}

/** Champ nombre lisible et grand, qui accepte la virgule. */
function NumField({ id, label, value, onChange, placeholder, suffix, step = 1 }) {
  return (
    <label className="g-field" htmlFor={id}>
      <span>{label}</span>
      <span className="g-in">
        <input id={id} type="number" inputMode={step < 1 ? "decimal" : "numeric"} min="0" step={step} value={value || ""} placeholder={placeholder}
          onChange={(e) => onChange(Math.max(0, +String(e.target.value).replace(",", ".") || 0))} />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  );
}

/**
 * Fenêtre « Tes gains » : le seul endroit qui explique les chiffres, avec ceux de l'utilisateur,
 * où l'on règle sa conso de départ et où l'on choisit sa récompense.
 */
export function GainsSheet({ onClose }) {
  const { S, state, patchState, flash } = useApp();
  const g = useGains();
  const [edit, setEdit] = useState(!g); // la conso se règle d'emblée si elle manque
  const [rw, setRw] = useState(null); // brouillon de récompense { n, price }
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);

  const saveReward = () => {
    if (!rw?.n?.trim() || !(rw.price > 0)) return;
    patchState({ reward: { n: rw.n.trim(), price: rw.price } });
    setRw(null);
  };
  const claim = () => {
    patchState({ spent: (state.spent || 0) + g.reward.price, reward: null });
    flash?.([`Profite bien de ${g.reward.n} : tu l'as gagné.`]);
  };

  return createPortal(
    <div className="modal set-modal" role="dialog" aria-modal="true" aria-labelledby="gains-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet set-sheet gains-sheet">
        <header className="set-sheet-h"><h2 id="gains-t">Tes gains</h2><button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button></header>

        {g && !edit && (
          <>
            {g.perCig > 0 ? (
              <section className="g-money">
                <span className="label">Argent économisé</span>
                <b>{eur(g.saved)}</b>
                <span>À ce rythme : <strong>{eur(g.perMonth)}</strong> par mois, <strong>{eur(g.perYear)}</strong> par an.</span>
              </section>
            ) : (
              <button className="g-missing" type="button" onClick={() => setEdit(true)}>Ajoute le prix du paquet pour voir l'argent économisé ›</button>
            )}

            {g.perCig > 0 && (
              <section className="g-reward">
                <span className="label">Ta récompense</span>
                {g.reward && !rw ? (
                  <>
                    <b>{g.reward.n}</b>
                    <Bar pct={g.reward.pct * 100} color="var(--quit)" />
                    <span>{eur(g.reward.have)} sur {eur(g.reward.price)}{g.reward.done ? " : c'est bon, elle est à toi." : ` · encore ${eur(g.reward.price - g.reward.have)}`}</span>
                    <div className="row2">
                      <button className="btn" type="button" onClick={() => setRw({ n: g.reward.n, price: g.reward.price })}>Modifier</button>
                      <button className="btn green" type="button" disabled={!g.reward.done} onClick={claim}>Je me l'offre</button>
                    </div>
                  </>
                ) : rw ? (
                  <form className="g-rw-form" onSubmit={(e) => { e.preventDefault(); saveReward(); }}>
                    <label className="g-field" htmlFor="rw-n"><span>Ce que tu veux t'offrir</span><input id="rw-n" type="text" maxLength={40} value={rw.n} placeholder="ex. Un week-end à la mer" onChange={(e) => setRw({ ...rw, n: e.target.value })} /></label>
                    <NumField id="rw-p" label="Son prix" value={rw.price} step={0.01} placeholder="ex. 300" suffix="€" onChange={(v) => setRw({ ...rw, price: v })} />
                    <div className="row2">
                      <button className="btn" type="button" onClick={() => setRw(null)}>Annuler</button>
                      <button className="btn green" type="submit" disabled={!rw.n?.trim() || !(rw.price > 0)}>Enregistrer</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p>Choisis ce que tu veux t'offrir avec l'argent de la cigarette : ta barre se remplit chaque jour.</p>
                    <button className="btn green" type="button" onClick={() => setRw({ n: "", price: 0 })}>Choisir ma récompense</button>
                  </>
                )}
              </section>
            )}

            <div className="g-tiles">
              <div><small>Temps libre gagné</small><b>≈ {timeText(g.minutes)}</b><span>à {MIN_PER_CIG} min par cigarette</span></div>
              <div><small>Paquets pas achetés</small><b>{n0(g.packs)}</b><span>de {PACK} cigarettes</span></div>
              <div><small>Cigarettes évitées</small><b>{n0(g.avoided)}</b><span>depuis le début</span></div>
            </div>

            <section className="g-how">
              <span className="label">Comment c'est calculé</span>
              <p>Tu fumais <b>{state.cpd} {pl(state.cpd, "cigarette")} par jour</b>{state.packPrice ? <>, à <b>{eur(state.packPrice)} le paquet</b></> : null}. Depuis le {fDate(S.startAt)}, ça aurait fait <b>{n0(g.expected)}</b> {pl(g.expected, "cigarette")}. Tu en as noté <b>{g.smoked}</b>. Différence : <b>{n0(g.avoided)} {pl(g.avoided, "cigarette évitée", "cigarettes évitées")}</b>.</p>
              <p className="tip">C'est une estimation, aussi juste que les chiffres de départ. Pense à noter chaque cigarette fumée, même après coup.</p>
              <button className="linkbtn" type="button" onClick={() => setEdit(true)}>Modifier ma conso de départ</button>
            </section>
          </>
        )}

        {(edit || !g) && (
          <form className="g-setup" onSubmit={(e) => { e.preventDefault(); if (state.cpd) setEdit(false); }}>
            <p>Avant d'arrêter, tu fumais :</p>
            <NumField id="g-cpd" label="Cigarettes par jour" value={state.cpd} placeholder="ex. 12" onChange={(v) => patchState({ cpd: Math.min(80, Math.round(v)) })} />
            <NumField id="g-price" label="Prix d'un paquet de 20" value={state.packPrice} step={0.01} placeholder="ex. 12,50" suffix="€" onChange={(v) => patchState({ packPrice: Math.min(100, v) })} />
            <button className="btn green" type="submit" disabled={!state.cpd}>{g ? "Voir mes gains" : "Indique ta conso"}</button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
