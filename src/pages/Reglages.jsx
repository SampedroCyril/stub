import { useRef, useState } from "react";
import { useApp, SECTIONS, sectionOn } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import { Group, Toggle } from "../components/Settings.jsx";
import { APP_NAME } from "../data/brand.js";
import InstallCard from "../components/InstallCard.jsx";
import { isStandalone } from "../lib/install.js";
import { exportJson, parseImport, mergeDays } from "../lib/storage.js";
import { dayKey, fDate } from "../lib/util.js";

export default function Reglages() {
  const { S, data, state, patchState, replaceData, wipe } = useApp();
  const [msg, setMsg] = useState(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(null); // données importées en attente de confirmation
  const [confirmWipe, setConfirmWipe] = useState(false);
  const file = useRef(null);
  const nEvents = Object.values(data.days).reduce((a, l) => a + l.length, 0);
  const firstDay = Object.keys(data.days).sort()[0];

  const download = () => {
    const blob = new Blob([exportJson(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stub-${dayKey(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg({ ok: true, t: "Sauvegarde téléchargée." });
  };
  const read = (raw) => {
    try {
      const d = parseImport(raw);
      setPending({ d, n: Object.values(d.days).reduce((a, l) => a + l.length, 0) });
      setMsg(null);
    } catch (e) {
      setMsg({ ok: false, t: e.message });
    }
  };
  const apply = (mode) => {
    const { d } = pending;
    if (mode === "replace") replaceData(d);
    else {
      // fusion : historique combiné ; dernière clope = la plus récente si une rechute a été notée ici, sinon celle importée
      const localSmoked = S.smokes.length > 0;
      const quitAt = localSmoked && data.state.quitAt > d.state.quitAt ? data.state.quitAt : d.state.quitAt;
      const keep = { sound: data.state.sound, model: data.state.model, bp: data.state.bp, bd: data.state.bd };
      replaceData({ state: { ...d.state, ...keep, quitAt, best: Math.max(d.state.best || 0, data.state.best || 0) }, days: mergeDays(data.days, d.days) });
    }
    setMsg({ ok: true, t: `Import réussi : ${pending.n} événements.` });
    setPending(null);
    setText("");
  };

  return (
    <Panel id="reglages">
      <Group title="Application">
        {isStandalone()
          ? <div className="set-row"><span><b>App installée</b><small>Tu l'utilises depuis ton écran d'accueil.</small></span><span className="set-ok">✓</span></div>
          : <InstallCard />}
      </Group>

      <Group title="Mes données" note="Tout est stocké sur cet appareil uniquement. Exporte de temps en temps pour garder une sauvegarde.">
        <div className="set-row">
          <span><b>{nEvents} événements</b><small>{firstDay ? `depuis le ${fDate(new Date(`${firstDay}T00:00:00`))}` : "Aucun historique pour l'instant"}</small></span>
        </div>
        <button className="set-row action" type="button" onClick={download}><span><b>Exporter une sauvegarde</b><small>Fichier JSON</small></span><span className="chev">›</span></button>
        <button className="set-row action" type="button" onClick={() => file.current?.click()}><span><b>Importer un fichier</b><small>Sauvegarde ou export de la version Claude</small></span><span className="chev">›</span></button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) read(await f.text()); e.target.value = ""; }} />
        <details className="set-row fold-row">
          <summary><span><b>Coller un JSON</b><small>Copié depuis la page Claude</small></span></summary>
          <textarea className="paste" value={text} onChange={(e) => setText(e.target.value)} placeholder='{"app":"anti-clope", ...}' aria-label="JSON à importer" />
          <button className="btn green" type="button" disabled={!text.trim()} onClick={() => read(text)}>Lire</button>
        </details>
        {pending && (
          <div className="set-row col">
            <span><b>{pending.n} événements trouvés</b><small>Fusionner garde aussi ce qui est déjà ici, sans doublons. Remplacer efface les données actuelles de cet appareil.</small></span>
            <div className="row2">
              <button className="btn green" type="button" onClick={() => apply("merge")}>Fusionner</button>
              <button className="btn" type="button" onClick={() => apply("replace")}>Remplacer</button>
              <button className="btn" type="button" onClick={() => setPending(null)}>Annuler</button>
            </div>
          </div>
        )}
        {msg && <p className={`set-msg${msg.ok ? "" : " err"}`} role="status">{msg.t}</p>}
      </Group>

      <Group title="Sections de l'app">
        <p className="set-note">Garde seulement ce qui te parle. Tes données restent, même pour une section masquée. Les réglages propres à chaque catégorie sont dans sa roue crantée, en haut à droite.</p>
        {SECTIONS.filter((s) => s.optional).map((s) => (
          <Toggle key={s.id} id={`sec-${s.id}`} label={s.label} sub={s.d} checked={sectionOn(state, s.id)} onChange={(v) => patchState({ sections: { ...(state.sections || {}), [s.id]: v } })} />
        ))}
      </Group>

      <Group title="Aide">
        <div className="set-row"><span><b>Tabac Info Service</b><small>Gratuit, avec un suivi personnalisé par des tabacologues</small></span><a className="set-link" href="tel:3989">39 89</a></div>
        <a className="set-row action" href="https://github.com/SampedroCyril/killing-smoke" target="_blank" rel="noreferrer"><span><b>Code source</b><small>github.com/SampedroCyril/killing-smoke</small></span><span className="chev">›</span></a>
      </Group>

      <Group title="Zone sensible">
        {!confirmWipe
          ? <button className="set-row action danger" type="button" onClick={() => setConfirmWipe(true)}><span><b>Tout effacer</b><small>Historique, niveaux et badges de cet appareil</small></span></button>
          : (
            <div className="set-row col">
              <span><b>Effacer toutes les données de cet appareil ?</b><small>Exporte une sauvegarde avant si tu veux pouvoir revenir en arrière.</small></span>
              <div className="row2">
                <button className="btn" type="button" onClick={() => setConfirmWipe(false)}>Annuler</button>
                <button className="btn danger-fill" type="button" onClick={() => { wipe(); setConfirmWipe(false); }}>Tout effacer</button>
              </div>
            </div>
          )}
      </Group>

      <footer className="app-version">
        <b>{APP_NAME}</b>
        <span>Version {__APP_VERSION__}</span>
        <span>Mise à jour du {fDate(new Date(__BUILD_DATE__))} {new Date(__BUILD_DATE__).getFullYear()}{__COMMIT__ ? ` · ${__COMMIT__}` : ""}</span>
      </footer>
    </Panel>
  );
}
