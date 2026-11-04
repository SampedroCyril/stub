import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Écran de combat plein écran : rien ne défile, tout est centré, et un appui n'importe où joue la note.
 * Les boutons gardent leur propre action.
 */
export default function FightScreen({ title, right, top, children, footer, onTap, label }) {
  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, []);
  return createPortal(
    <div
      className="fight" role="dialog" aria-modal="true" aria-label={label || title}
      onPointerDown={(e) => { if (e.target.closest("button, a, [role=alertdialog]")) return; e.preventDefault(); onTap?.(); }}
    >
      <div className="fight-in">
        <header className="fight-head"><span className="px-name">{title}</span><span className="px-lvl">{right}</span></header>
        {top}
        <div className="fight-stage">{children}</div>
        <footer className="fight-foot">{footer}</footer>
      </div>
    </div>,
    document.body,
  );
}
