import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp, sectionOf } from "../store/AppStore.jsx";
import GaugeView from "../game/GaugeView.jsx";
import { GAUGE_STYLES } from "../game/gfx/Gauge.js";
import { pad } from "../lib/util.js";
import { PACES, goalAt, smokeStats } from "../lib/smoking.js";

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

/** Réglage d'un nombre de clopes avec − et +. */
function Stepper({ id, value, onChange, min = 0, max = 60 }) {
  return (
    <span className="stepper">
      <button type="button" aria-label="Moins" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <output id={id} aria-live="polite">{value}</output>
      <button type="button" aria-label="Plus" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </span>
  );
}

function GoalSettings() {
  const { S, state, patchState } = useApp();
  const reduce = state.goal === "reduce";
  const r = state.reduce || {};
  // point de départ : ta moyenne des 7 derniers jours si tu notes tes clopes, sinon ta conso de départ
  const avg = smokeStats(S.ev, { now: S.now, startAt: S.startAt }).avg7;
  const base = avg ? Math.max(1, Math.ceil(avg)) : state.cpd || 10;
  const setR = (p) => patchState({ reduce: { mode: "auto", every: 7, start: base, from: new Date().toISOString(), fixed: base, ...r, ...p } });
  const toReduce = () => patchState({ goal: "reduce", reduce: state.reduce || { mode: "auto", start: base, from: new Date().toISOString(), every: 7, fixed: base } });
  return (
    <Group title="Mon objectif" note={reduce ? "Une clope fumée remet toujours le sevrage à zéro. En mode Réduction, tu suis en plus tes clopes du jour face à ton objectif, et ta baisse par rapport à ton départ." : "Un sevrage complet. Tu préfères baisser petit à petit ? Choisis Réduire."}>
      <div className="set-row col">
        <div className="seg" role="radiogroup" aria-label="Objectif">
          <button type="button" role="radio" aria-checked={!reduce} className="pick" aria-pressed={!reduce} onClick={() => patchState({ goal: "quit" })}>Arrêter</button>
          <button type="button" role="radio" aria-checked={reduce} className="pick" aria-pressed={reduce} onClick={toReduce}>Réduire</button>
        </div>
      </div>
      {reduce && (
        <>
          <div className="set-row col">
            <span><b>Objectif par jour</b><small>{r.mode === "fixed" ? "Tu le règles toi-même." : "Il baisse tout seul, d'une clope à chaque palier."} Aujourd'hui : {goalAt(r, S.now) ?? "–"}.</small></span>
            <div className="seg" role="radiogroup" aria-label="Type d'objectif">
              <button type="button" role="radio" className="pick" aria-checked={r.mode !== "fixed"} aria-pressed={r.mode !== "fixed"} onClick={() => setR({ mode: "auto", start: goalAt(r, S.now) ?? base, from: new Date().toISOString() })}>Baisse automatique</button>
              <button type="button" role="radio" className="pick" aria-checked={r.mode === "fixed"} aria-pressed={r.mode === "fixed"} onClick={() => setR({ mode: "fixed", fixed: goalAt(r, S.now) ?? base })}>Je le règle</button>
            </div>
          </div>
          {r.mode === "fixed" ? (
            <div className="set-row"><span><b>Clopes par jour, au plus</b></span><Stepper id="g-fixed" value={r.fixed ?? base} onChange={(v) => setR({ fixed: v })} /></div>
          ) : (
            <>
              <div className="set-row"><span><b>Point de départ</b><small>Repart d'aujourd'hui</small></span><Stepper id="g-start" value={r.start ?? base} onChange={(v) => setR({ start: v, from: new Date().toISOString() })} /></div>
              <div className="set-row col">
                <span><b>Une clope de moins…</b></span>
                <div className="seg three" role="radiogroup" aria-label="Rythme de baisse">
                  {PACES.map(([n, lab]) => <button key={n} type="button" role="radio" className="pick" aria-checked={(r.every || 7) === n} aria-pressed={(r.every || 7) === n} onClick={() => setR({ every: n, start: goalAt(r, S.now) ?? base, from: new Date().toISOString() })}>{lab}</button>)}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Group>
  );
}

function SevrageSettings() {
  const { S, patchState } = useApp();
  return (
    <>
    <GoalSettings />
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
    </>
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
