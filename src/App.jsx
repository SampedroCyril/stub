import { useCallback, useEffect, useState } from "react";
import { AppProvider, useApp } from "./store/AppStore.jsx";
import { Toast } from "./components/ui.jsx";
import { BottomNav, SectionHeader } from "./components/Nav.jsx";
import Reglages from "./pages/Reglages.jsx";
import Arcade from "./pages/Arcade.jsx";
import Records from "./pages/Records.jsx";
import Bestiaire from "./pages/Bestiaire.jsx";
import Talents from "./pages/Talents.jsx";
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

function Shell() {
  const { S, state, now, flow, patchState, battle, view, go } = useApp();
  useEffect(() => { sound.on = state.gameSound !== false; }, [state.gameSound]);
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
      <Defis onRecap={open} />
      <Bestiaire />
      <Talents />
      <Badges />
      <Stats onRecap={open} />
      <Records />
      <Exos />
      <Reglages />
      {battle && view !== "sevrage" && (
        <button className="battle-pill" type="button" onClick={() => go("sevrage")}>
          <BossThumb id={battle.boss} />
          <span>Combat en cours · {hpAt(battle, new Date())} PV</span>
        </button>
      )}
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
