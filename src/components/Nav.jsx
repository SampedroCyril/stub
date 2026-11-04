import { useRef } from "react";
import { useApp, SUB_LABELS, sectionOf, visibleSections } from "../store/AppStore.jsx";

const ICONS = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  leaf: <><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" /><path d="M5 19 13 11" /></>,
  dumbbell: <><path d="M3 10v4M6.5 7.5v9M17.5 7.5v9M21 10v4" /><path d="M6.5 12h11" /></>,
  gamepad: <><path d="M7 9h10a4 4 0 0 1 3.9 4.9l-.6 2.6a2 2 0 0 1-3.4.9L15 15H9l-1.9 2.4a2 2 0 0 1-3.4-.9l-.6-2.6A4 4 0 0 1 7 9z" /><path d="M8 11.5v2.5M6.75 12.75h2.5M15.5 12.25h.01M17.5 13.5h.01" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5c0 3 1.5 4.5 3.5 4.8M16 6h3c0 3-1.5 4.5-3.5 4.8M12 13v4M8.5 20h7" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></>,
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

/** Titre de la section + sous-onglets quand la section en a plusieurs. */
export function SectionHeader() {
  const { view, go } = useApp();
  const sec = sectionOf(view);
  return (
    <header className="page-head">
      <h1>{sec.id === "accueil" ? "Roulement anti-clope" : sec.label}</h1>
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
