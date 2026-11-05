import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import BossView from "./BossView.jsx";
import FightScreen, { FightMenu } from "./FightScreen.jsx";
import GaugeView from "./GaugeView.jsx";
import { useClicker } from "./useClicker.js";
import { BOSSES, traitsOf, traitList } from "./bosses.js";
import { hpAt, elapsedMs, bestiary, DMG } from "./battle.js";
import { perksOf } from "../data/skills.js";
import { pad } from "../lib/util.js";

/** Traits du boss (faible et fort), visibles après la première victoire. */
export function ModChips({ boss, known }) {
  const list = traitList(boss);
  if (!list.length) return <span className="mods"><span className="mod">Aucun trait</span></span>;
  if (!known) return <span className="mods"><span className="mod">Traits : ???</span></span>;
  return (
    <span className="mods">
      {list.map((t) => <span key={t.k} className={`mod ${t.weak ? "weak" : "res"}`} title={t.d}>{t.n} · {t.d.toLowerCase()}</span>)}
    </span>
  );
}

/** Combat contre le boss d'une envie, en plein écran : jauge de rythme, combo, paliers, jusqu'au K.O. */
export default function Battle() {
  const { battle, state, hitBattle, patchBattle, winBattle, fleeBattle, go, S, battleView } = useApp();
  const stage = useRef(null), gauge = useRef(null);
  const [, setTick] = useState(0);
  const [taunt, setTaunt] = useState(0);
  const [started, setStarted] = useState(false);
  const [menu, setMenu] = useState(null); // null · pause · quit · flee
  const ko = useRef(false);
  const pausedAt = useRef(0); // pause du joueur : le combat entier s'arrête (PV, chrono)
  const clock = () => new Date(pausedAt.current || Date.now());
  const latest = useRef({});
  latest.current = { battle, winBattle };
  const [startHp] = useState(() => (battle ? hpAt(battle, new Date()) : 0));
  const traits = battle ? traitsOf(battle.boss) : undefined;
  const perks = perksOf(state.skills);

  const clicker = useClicker(stage, {
    intensity: battle?.intensity, skills: state.skills, traits, gaugeRef: gauge,
    onHit: ({ dmg, maxCombo }) => {
      const b = latest.current.battle;
      if (!b) return dmg;
      const left = hpAt(b, new Date());
      let d = dmg;
      if (perks.grace && left - d <= b.maxHp * 0.05) d = Math.max(d, left); // Coup de grâce
      d = hitBattle("game", Math.min(d, Math.max(1, left)));
      if (maxCombo > (b.mc || 0)) patchBattle({ mc: maxCombo });
      return d;
    },
    onCig: (took) => {
      const b = latest.current.battle;
      if (!b) return null;
      if (took) { const d = hitBattle("heal", -Math.round(b.maxHp * DMG.heal)); stage.current?.heal(-d); return null; }
      return hitBattle("refuse", Math.round(b.maxHp * DMG.refuse * perks.refuse));
    },
  });
  const clickerRef = useRef(clicker);
  clickerRef.current = clicker;

  // tant que cet écran est affiché, c'est lui qui joue le K.O. et déclare la victoire
  useLayoutEffect(() => { battleView.current = true; return () => { battleView.current = false; }; }, [battleView]);
  useEffect(() => () => {
    const { battle: b, winBattle: w } = latest.current;
    if (b && hpAt(b, new Date()) <= 0) setTimeout(w, 0);
  }, []);

  // horloge : synchro des PV et K.O.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((x) => x + 1);
      const s = stage.current, b = latest.current.battle;
      if (!s || !b || s.dead || s.pending || s.refuseAt || pausedAt.current) return;
      const hp = hpAt(b, new Date());
      s.setHp(hp);
      if (hp <= 0 && !ko.current) {
        ko.current = true;
        setMenu(null);
        clickerRef.current.stop(true);
        s.ko().then(() => latest.current.winBattle());
      }
    }, 250);
    const tid = setInterval(() => setTaunt((x) => x + 1), 7000);
    return () => { clearInterval(id); clearInterval(tid); };
  }, []);

  if (!battle) return null;
  const B = BOSSES[battle.boss];
  const sec = Math.floor(elapsedMs(battle, clock()) / 1000);
  const known = (bestiary(S.ev)[battle.boss]?.wins || 0) > 0;

  const onTap = () => {
    if (ko.current || menu) return;
    if (!started) { setStarted(true); clicker.start(); return; }
    clicker.tap();
  };
  const open = (m) => {
    if (!started) { if (m === "quit") go("accueil"); return; }
    if (ko.current || pausedAt.current) return;
    pausedAt.current = Date.now();
    clicker.hold(true); setMenu(m);
  };
  /** Fin de pause : le temps passé en pause est retiré du chrono du combat. */
  const unpause = () => {
    if (!pausedAt.current) return;
    patchBattle({ pz: (battle.pz || 0) + (Date.now() - pausedAt.current) });
    pausedAt.current = 0;
  };
  const close = () => { unpause(); setMenu(null); clicker.hold(false); };
  const leave = () => { unpause(); go("accueil"); };
  const menus = {
    pause: <FightMenu title="Pause" actions={[["Reprendre", close], ["Quitter", leave]]} links={[["Fausse alerte", () => setMenu("flee")]]}><ModChips boss={battle.boss} known={known} /></FightMenu>,
    quit: <FightMenu title="Quitter le combat ?" sub="Le boss t'attendra : tu reprends quand tu veux." actions={[["Quitter", leave, "green"], ["Reprendre", close, " "]]} />,
    flee: <FightMenu title="Fausse alerte ?" sub="Le combat s'arrête, sans XP." actions={[["Retour", () => setMenu("pause")], ["Arrêter", fleeBattle, "danger"]]} />,
  };

  return (
    <FightScreen
      title={B.n}
      right={`Niv. ${battle.lvl} · ${Math.floor(sec / 60)}:${pad(sec % 60)}`}
      label={`Combat contre ${B.n}`}
      onTap={onTap}
      onBack={() => open("quit")}
      onPause={started ? () => open("pause") : undefined}
      menu={menu && menus[menu]}
      top={<>{!started && <ModChips boss={battle.boss} known={known} />}<p className="bubble" key={taunt}>« {B.taunts[taunt % B.taunts.length]} »</p></>}
      footer={!started && <p className="fight-hint"><b>Touche l'écran quand les notes arrivent au centre.</b> Si ce sont des cigarettes, ne touche pas : laisse-les s'écraser.</p>}
    >
      <BossView stageRef={stage} boss={battle.boss} maxHp={battle.maxHp} hp={startHp} lvl={battle.lvl} />
      <GaugeView gaugeRef={gauge} style={state.gaugeStyle || "fluid"} />
      {!started && <div className="tap-start" aria-hidden="true">Touche pour commencer</div>}
    </FightScreen>
  );
}
