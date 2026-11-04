import { useCallback, useEffect, useState } from "react";
import { AppProvider, useApp } from "./store/AppStore.jsx";
import { Toast } from "./components/ui.jsx";
import { BottomNav, SectionHeader } from "./components/Nav.jsx";
import Reglages from "./pages/Reglages.jsx";
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
  const { S, state, now, flow, patchState } = useApp();
  const [recap, setRecap] = useState(null); // {ws, auto}

  // Récap du dimanche : s'ouvre seul à partir de 18h, ou à la prochaine ouverture si raté.
  useEffect(() => {
    if (recap || flow.mode !== "idle") return;
    const ws = recapDue(S, state, now, RECAP_HOUR);
    if (ws) setRecap({ ws, auto: true });
  }, [S, state, now, flow.mode, recap]);

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
      <Sante />
      <Defis onRecap={open} />
      <Badges />
      <Stats onRecap={open} />
      <Exos />
      <Reglages />
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
