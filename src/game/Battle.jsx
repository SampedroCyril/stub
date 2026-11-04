import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import BossView from "./BossView.jsx";
import FightScreen from "./FightScreen.jsx";
import GaugeView from "./GaugeView.jsx";
import { useClicker } from "./useClicker.js";
import { BOSSES, traitsOf, traitList } from "./bosses.js";
import { hpAt, elapsedMs, bestiary, BATTLE_MS, DMG } from "./battle.js";
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
  const [confirmFlee, setConfirmFlee] = useState(false);
  const ko = useRef(false);
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

  // horloge : synchro des PV (épuisement) et K.O.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((x) => x + 1);
      const s = stage.current, b = latest.current.battle;
      if (!s || !b || s.dead || s.pending || s.refuseAt) return;
      const hp = hpAt(b, new Date());
      s.setHp(hp);
      if (hp <= 0 && !ko.current) {
        ko.current = true;
        clickerRef.current.stop(true);
        s.ko().then(() => latest.current.winBattle());
      }
    }, 250);
    const tid = setInterval(() => setTaunt((x) => x + 1), 7000);
    return () => { clearInterval(id); clearInterval(tid); };
  }, []);

  if (!battle) return null;
  const B = BOSSES[battle.boss];
  const left = Math.max(0, Math.ceil((BATTLE_MS - elapsedMs(battle, new Date())) / 1000));
  const known = (bestiary(S.ev)[battle.boss]?.wins || 0) > 0;

  const onTap = () => {
    if (ko.current) return;
    if (!started) { setStarted(true); clicker.start(); return; }
    clicker.tap();
  };

  return (
    <FightScreen
      title={B.n}
      right={`Niv. ${battle.lvl} · ${Math.floor(left / 60)}:${pad(left % 60)}`}
      label={`Combat contre ${B.n}`}
      onTap={onTap}
      top={<><ModChips boss={battle.boss} known={known} /><p className="bubble" key={taunt}>« {B.taunts[taunt % B.taunts.length]} »</p></>}
      footer={!started
        ? <p className="fight-hint"><b>Touche l'écran quand les notes arrivent au centre de la jauge.</b> Si ce sont des clopes, ne touche pas : laisse-les s'écraser.</p>
        : !confirmFlee
          ? <div className="fight-actions"><button className="linkbtn" type="button" onClick={() => go("accueil")}>Réduire</button><button className="linkbtn" type="button" onClick={() => setConfirmFlee(true)}>Fausse alerte</button></div>
          : <p className="fight-actions">Le combat s'arrête sans XP. <button className="linkbtn" type="button" onClick={fleeBattle}>Arrêter</button> <button className="linkbtn" type="button" onClick={() => setConfirmFlee(false)}>Continuer</button></p>}
    >
      <BossView stageRef={stage} boss={battle.boss} maxHp={battle.maxHp} hp={startHp} lvl={battle.lvl} />
      <GaugeView gaugeRef={gauge} style={state.gaugeStyle || "fluid"} />
      {!started && <div className="tap-start" aria-hidden="true">Touche pour commencer</div>}
    </FightScreen>
  );
}
