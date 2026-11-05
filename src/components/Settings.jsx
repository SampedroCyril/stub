import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp, sectionOf } from "../store/AppStore.jsx";
import GaugeView from "../game/GaugeView.jsx";
import { GAUGE_STYLES } from "../game/gfx/Gauge.js";
import { pad } from "../lib/util.js";

export const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function Group({ title, children, note }) {
  return (
    <section className="set-group">
      {title && <h2 className="set-title">{title}</h2>}
      <div className="set-box">{children}</div>
      {note && <p className="set-note">{note}</p>}
    </section>
  );
}

export function Toggle({ id, label, sub, checked, onChange }) {
  return (
    <label className="set-row" htmlFor={id}>
      <span><b>{label}</b>{sub && <small>{sub}</small>}</span>
      <input id={id} type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function SevrageSettings() {
  const { S, patchState } = useApp();
  return (
    <Group>
      <label className="set-row" htmlFor="quit">
        <span><b>Dernière clope</b><small>Point de départ du compteur et de la récupération</small></span>
        <input
          type="datetime-local" id="quit" value={toLocalInput(S.q)}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (isNaN(d) || d > new Date()) return;
            patchState({ quitAt: d.toISOString(), ...(S.smokes.length ? {} : { startAt: d.toISOString() }) });
          }}
        />
      </label>
    </Group>
  );
}

function SportSettings() {
  const { state, patchState } = useApp();
  return (
    <Group title="Coach caméra">
      <Toggle id="sound" label="Son" sub="Un bip à chaque rep" checked={state.sound} onChange={(v) => patchState({ sound: v })} />
      <Toggle id="model" label="Détection précise" sub="Plus fiable, plus lourde pour le téléphone" checked={state.model === "full"} onChange={(v) => patchState({ model: v ? "full" : "lite" })} />
    </Group>
  );
}

function JeuSettings() {
  const { state, patchState } = useApp();
  const style = state.gaugeStyle || "fluid";
  return (
    <Group title="Jeu">
      <Toggle id="gamesound" label="Bruitages des combats" sub="Coups, critiques, K.O., clope écrasée" checked={state.gameSound !== false} onChange={(v) => patchState({ gameSound: v })} />
      <div className="set-row col">
        <span><b>Style de la jauge</b><small>Le look de la jauge de rythme, en combat et dans l'Arcade</small></span>
        <div className="gauge-pick" role="radiogroup" aria-label="Style de la jauge">
          {GAUGE_STYLES.map(([id, n]) => (
            <button key={id} type="button" role="radio" className="pick" aria-checked={style === id} aria-pressed={style === id} onClick={() => patchState({ gaugeStyle: id })}>{n}</button>
          ))}
        </div>
        <div className="gauge-preview"><GaugeView style={style} demo /></div>
      </div>
      <Toggle id="intense" label="Effets intenses" sub="Flashs et écran inversé sur les gros coups. À couper si tu es sensible aux lumières clignotantes." checked={state.intense ?? !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches} onChange={(v) => patchState({ intense: v })} />
    </Group>
  );
}

/** Réglages propres à une catégorie, ouverts par la roue crantée de son en-tête. */
export const SECTION_SETTINGS = { sevrage: SevrageSettings, sport: SportSettings, joueur: JeuSettings };

export function SettingsSheet({ section, onClose }) {
  const { view } = useApp();
  const Body = SECTION_SETTINGS[section];
  const label = sectionOf(view).label;
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  if (!Body) return null;
  return createPortal(
    <div className="modal set-modal" role="dialog" aria-modal="true" aria-labelledby="set-sheet-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet set-sheet">
        <header className="set-sheet-h">
          <h2 id="set-sheet-t">Réglages · {label}</h2>
          <button className="set-close" type="button" aria-label="Fermer" onClick={onClose}>✕</button>
        </header>
        <Body />
      </div>
    </div>,
    document.body,
  );
}
