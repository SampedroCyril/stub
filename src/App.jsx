import { useCallback, useEffect, useRef, useState } from "react";
import { AppProvider, useApp, sectionOf, sectionOn } from "./store/AppStore.jsx";
import { Toast } from "./components/ui.jsx";
import { BottomNav, SectionHeader } from "./components/Nav.jsx";
import Reglages from "./pages/Reglages.jsx";
import Arcade from "./pages/Arcade.jsx";
import Records from "./pages/Records.jsx";
import Bestiaire from "./pages/Bestiaire.jsx";
import Talents from "./pages/Talents.jsx";
import Boutique from "./pages/Boutique.jsx";
import Symptomes from "./pages/Symptomes.jsx";
import Risques from "./pages/Risques.jsx";
import Victory from "./game/Victory.jsx";
import BossThumb from "./game/BossThumb.jsx";
import { BOSSES } from "./game/bosses.js";
import { hpAt } from "./game/battle.js";
import { sound } from "./game/gfx/sfx.js";
import RecapModal from "./components/RecapModal.jsx";
import Home from "./pages/Home.jsx";
import Sevrage from "./pages/Sevrage.jsx";
import Circuit from "./pages/Circuit.jsx";
import Respirer from "./pages/Respirer.jsx";
import Sante from "./pages/Sante.jsx";
import Defis from "./pages/Defis.jsx";
import Badges from "./pages/Badges.jsx";
import Stats from "./pages/Stats.jsx";
import Exos from "./pages/Exos.jsx";
import { recapDue } from "./lib/compute.js";
import { RECAP_HOUR } from "./data/rules.js";
import { dayKey } from "./lib/util.js";

/**
 * Combat laissé en plan : quelques secondes après avoir quitté l'écran de combat, on demande s'il faut l'annuler.
 * « Non » garde le combat (la pastille reste) et ne redemande pas avant la prochaine sortie.
 */
function PendingBattle() {
  const { battle, view, go, fleeBattle } = useApp();
  const [ask, setAsk] = useState(false);
  const asked = useRef(null);
  const away = !!battle && view !== "sevrage";
  useEffect(() => {
    if (!away) { setAsk(false); if (view === "sevrage") asked.current = null; return; }
    if (asked.current === battle.id) return;
    const t = setTimeout(() => { asked.current = battle.id; setAsk(true); }, 4000);
    return () => clearTimeout(t);
  }, [away, view, battle]);
  if (!away) return null;
  return (
    <>
      <button className="battle-pill" type="button" onClick={() => go("sevrage")}>
        <BossThumb id={battle.boss} />
        <span>Combat en cours · {hpAt(battle, new Date())} PV</span>
      </button>
      {ask && (
        <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="pb-t" aria-describedby="pb-d">
          <div className="sheet pb-sheet">
            <h2 id="pb-t">Combat en cours</h2>
            <p id="pb-d">Tu as laissé {BOSSES[battle.boss].n} en plan. Tu veux annuler ce combat ? L'envie ne sera pas comptée.</p>
            <div className="row2">
              <button className="btn" type="button" onClick={() => setAsk(false)}>Non, je le garde</button>
              <button className="btn danger-fill" type="button" onClick={() => { setAsk(false); fleeBattle(); }}>Oui, l'annuler</button>
            </div>
            <button className="linkbtn" type="button" onClick={() => { setAsk(false); go("sevrage"); }}>Reprendre le combat</button>
          </div>
        </div>
      )}
    </>
  );
}

function Shell() {
  const { S, state, now, flow, patchState, battle, view, go } = useApp();
  useEffect(() => { sound.on = state.gameSound !== false; }, [state.gameSound]);
  // section masquée dans les réglages : retour à l'accueil
  useEffect(() => { const sec = sectionOf(view); if (sec.optional && !sectionOn(state, sec.id)) go("accueil"); }, [view, state, go]);
  const [recap, setRecap] = useState(null); // {ws, auto}

  // Récap du dimanche : s'ouvre seul à partir de 18h, ou à la prochaine ouverture si raté.
  useEffect(() => {
    if (recap || flow.mode !== "idle" || battle) return;
    const ws = recapDue(S, state, now, RECAP_HOUR);
    if (ws) setRecap({ ws, auto: true });
  }, [S, state, now, flow.mode, recap, battle]);

  const close = useCallback(() => {
    setRecap((r) => {
      if (r?.auto) {
        const k = dayKey(r.ws);
        if (k > (state.recapSeen || "")) patchState({ recapSeen: k });
      }
      return null;
    });
  }, [patchState, state.recapSeen]);
  const open = useCallback((ws) => setRecap({ ws, auto: false }), []);

  return (
    <div className="wrap">
      <SectionHeader />
      <Toast />
      <Home />
      <Sevrage />
      <Circuit />
      <Respirer />
      <Arcade />
      <Sante />
      <Symptomes />
      <Risques />
      <Defis onRecap={open} />
      <Bestiaire />
      <Talents />
      <Boutique />
      <Badges />
      <Stats onRecap={open} />
      <Records />
      <Exos />
      <Reglages />
      <PendingBattle />
      <Victory />
      <BottomNav />
      {recap && <RecapModal ws={recap.ws} onClose={close} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
