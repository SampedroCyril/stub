import { useRef, useState } from "react";
import { useApp, SUB_LABELS, sectionOf, visibleSections } from "../store/AppStore.jsx";
import { SECTION_SETTINGS, SettingsSheet } from "./Settings.jsx";
import { APP_NAME } from "../data/brand.js";

const ICONS = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  leaf: <><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" /><path d="M5 19 13 11" /></>,
  dumbbell: <><path d="M3 10v4M6.5 7.5v9M17.5 7.5v9M21 10v4" /><path d="M6.5 12h11" /></>,
  gamepad: <><path d="M7 9h10a4 4 0 0 1 3.9 4.9l-.6 2.6a2 2 0 0 1-3.4.9L15 15H9l-1.9 2.4a2 2 0 0 1-3.4-.9l-.6-2.6A4 4 0 0 1 7 9z" /><path d="M8 11.5v2.5M6.75 12.75h2.5M15.5 12.25h.01M17.5 13.5h.01" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5c0 3 1.5 4.5 3.5 4.8M16 6h3c0 3-1.5 4.5-3.5 4.8M12 13v4M8.5 20h7" /></>,
  gear: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
};

/** Barre de navigation fixe en bas, façon app. */
export function BottomNav() {
  const { view, go, state } = useApp();
  const last = useRef({});
  const secs = visibleSections(state);
  const cur = sectionOf(view);
  last.current[cur.id] = view;
  return (
    <nav className="bottomnav" aria-label="Sections" style={{ gridTemplateColumns: `repeat(${secs.length}, 1fr)` }}>
      {secs.map((s) => (
        <button
          key={s.id} type="button" data-s={s.id} aria-current={cur.id === s.id ? "page" : undefined}
          onClick={() => go(cur.id === s.id ? s.views[0] : last.current[s.id] || s.views[0])}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[s.icon]}</svg>
          <span>{s.label}</span>
        </button>
      ))}
    </nav>
  );
}

const Gear = () => <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS.gear}</svg>;

/**
 * Titre de la section + sous-onglets quand la section en a plusieurs.
 * À droite, la roue crantée : réglages de la catégorie, ou réglages généraux depuis l'Accueil.
 */
export function SectionHeader() {
  const { view, go } = useApp();
  const sec = sectionOf(view);
  const [open, setOpen] = useState(false);
  const gear = sec.id === "accueil" ? () => go("reglages") : SECTION_SETTINGS[sec.id] ? () => setOpen(true) : null;
  return (
    <header className="page-head">
      <div className="page-title">
        {sec.id === "reglages" && <button className="head-ico" type="button" aria-label="Retour à l'accueil" onClick={() => go("accueil")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg></button>}
        <h1>{sec.id === "accueil" ? APP_NAME : sec.label}</h1>
        {gear && <button className="head-ico gear" type="button" aria-label={sec.id === "accueil" ? "Réglages" : `Réglages : ${sec.label}`} onClick={gear}><Gear /></button>}
      </div>
      {open && <SettingsSheet section={sec.id} onClose={() => setOpen(false)} />}
      {sec.views.length > 1 && (
        <div className="subnav" role="tablist" data-s={sec.id}>
          {sec.views.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => go(v)}>{SUB_LABELS[v]}</button>
          ))}
        </div>
      )}
    </header>
  );
}
