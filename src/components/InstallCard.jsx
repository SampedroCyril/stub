import { useEffect, useState } from "react";
import { canPrompt, isStandalone, platform, promptInstall, subscribe } from "../lib/install.js";

const KEY = "anticlope:install-dismissed";

const ShareIcon = () => (
  <svg className="inline-ico" viewBox="0 0 24 24" aria-label="Partager">
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Carte « Installer l'app ».
 * dismissible : sur l'accueil, on peut la masquer ; dans les réglages, elle reste.
 */
export default function InstallCard({ dismissible = false }) {
  const [, force] = useState(0);
  const [hidden, setHidden] = useState(() => { try { return dismissible && localStorage.getItem(KEY) === "1"; } catch { return false; } });
  useEffect(() => subscribe(() => force((x) => x + 1)), []);
  if (isStandalone() || hidden) return null;

  const p = platform();
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch { /* sans effet */ } setHidden(true); };

  return (
    <section className="install">
      <img src="./icon-192.png" alt="" width="48" height="48" />
      <div className="install-body">
        <strong>Installe l'app sur ton écran d'accueil</strong>
        {canPrompt() ? (
          <>
            <span>Elle s'ouvre en plein écran comme une vraie app et marche même hors ligne.</span>
            <button className="btn green" type="button" onClick={promptInstall}>Installer</button>
          </>
        ) : p === "ios-safari" ? (
          <ol>
            <li>Touche <ShareIcon /> <b>Partager</b> en bas de Safari.</li>
            <li>Choisis <b>Sur l'écran d'accueil</b> (fais défiler si besoin).</li>
            <li>Touche <b>Ajouter</b>.</li>
          </ol>
        ) : p === "ios-other" ? (
          <span>Ouvre cette page dans <b>Safari</b>, puis Partager → <b>Sur l'écran d'accueil</b>. Selon ta version d'iOS, le bouton Partager de ce navigateur peut aussi le proposer.</span>
        ) : p === "android" ? (
          <span>Dans le menu <b>⋮</b> du navigateur, choisis <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>.</span>
        ) : (
          <span>Dans Chrome ou Edge, clique sur l'icône d'installation dans la barre d'adresse, ou menu → <b>Installer Roulement anti-clope</b>.</span>
        )}
        {p.startsWith("ios") && (
          <p className="install-warn">Sur iPhone, l'app installée a sa propre mémoire, séparée de Safari. Installe-la d'abord, puis importe tes données dedans (Réglages → Mes données).</p>
        )}
      </div>
      {dismissible && <button className="install-x" type="button" aria-label="Masquer" onClick={dismiss}>×</button>}
    </section>
  );
}
