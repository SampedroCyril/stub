import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const Back = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" /></svg>;
const Bars = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" fill="currentColor" /><rect x="14" y="4" width="5" height="16" fill="currentColor" /></svg>;

/**
 * Écran de combat plein écran : rien ne défile, tout est centré, et un appui n'importe où joue la note.
 * En haut : flèche retour à gauche, pause à droite (icônes seules). onBack et onPause ouvrent le menu (menu = son contenu),
 * qui recouvre la scène ; l'appli passée en arrière-plan met aussi en pause.
 */
export default function FightScreen({ title, right, top, children, footer, onTap, onBack, onPause, menu, label }) {
  const pauseRef = useRef(onPause);
  pauseRef.current = onPause;
  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    const vis = () => { if (document.hidden) pauseRef.current?.(); };
    document.addEventListener("visibilitychange", vis);
    return () => { html.style.overflow = prev; document.removeEventListener("visibilitychange", vis); };
  }, []);
  return createPortal(
    <div
      className="fight" role="dialog" aria-modal="true" aria-label={label || title}
      onPointerDown={(e) => { if (menu || e.target.closest("button, a, [role=alertdialog]")) return; e.preventDefault(); onTap?.(); }}
    >
      <div className="fight-in">
        <header className="fight-head">
          <button className="fight-ico" type="button" aria-label="Quitter" onClick={onBack}><Back /></button>
          <div className="fight-title"><span className="px-name">{title}</span>{right ? <span className="px-lvl">{right}</span> : null}</div>
          {onPause ? <button className="fight-ico" type="button" aria-label="Pause" onClick={onPause}><Bars /></button> : <span className="fight-ico" />}
        </header>
        {top}
        <div className="fight-stage">{children}</div>
        <footer className="fight-foot">{footer}</footer>
      </div>
      {menu && <div className="fight-menu" role="alertdialog" aria-modal="true" aria-label="Pause"><div className="fight-menu-in">{menu}</div></div>}
    </div>,
    document.body,
  );
}

/** Contenu standard du menu : titre, ligne facultative, boutons (le premier est l'action principale), liens discrets. */
export function FightMenu({ title, sub, children, actions = [], links = [] }) {
  return (
    <>
      <p className="fight-menu-t">{title}</p>
      {sub && <p className="fight-menu-s">{sub}</p>}
      {children}
      <div className="fight-menu-b">
        {actions.map(([t, fn, cls], i) => <button key={t} className={`btn ${cls || (i === 0 ? "green" : "")}`} type="button" onClick={fn} autoFocus={i === 0}>{t}</button>)}
      </div>
      {links.length > 0 && <p className="fight-menu-l">{links.map(([t, fn]) => <button key={t} className="linkbtn" type="button" onClick={fn}>{t}</button>)}</p>}
    </>
  );
}
