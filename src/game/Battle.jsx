import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import Pixel from "./Pixel.jsx";
import Blocs from "./Blocs.jsx";
import { BOSSES } from "./bosses.js";
import { hpAt, elapsedMs, BATTLE_MS, DMG } from "./battle.js";
import { pad } from "../lib/util.js";

let floatId = 0;

/** Écran de combat contre le boss d'une envie. */
export default function Battle() {
  const { battle, hitBattle, winBattle, fleeBattle, setFlow, go, commit } = useApp();
  const [, setTick] = useState(0);
  const [floats, setFloats] = useState([]);
  const [hurt, setHurt] = useState(0);
  const [taunt, setTaunt] = useState(0);
  const [arcade, setArcade] = useState(false);
  const [confirmFlee, setConfirmFlee] = useState(false);
  const won = useRef(false);
  const inArcade = useRef(false);
  inArcade.current = arcade;
  // quitter l'écran en pleine partie de blocs : on libère l'attaque pour ne pas bloquer la victoire
  useEffect(() => () => { if (inArcade.current) setFlow({ mode: "idle" }); }, [setFlow]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 250);
    const tid = setInterval(() => setTaunt((x) => x + 1), 7000);
    return () => { clearInterval(id); clearInterval(tid); };
  }, []);

  const now = new Date();
  const hp = battle ? hpAt(battle, now) : 0;
  useEffect(() => {
    if (battle && hp <= 0 && !won.current && !arcade) { won.current = true; setTimeout(winBattle, 450); }
  }, [battle, hp, arcade, winBattle]);
  if (!battle) return null;

  const B = BOSSES[battle.boss];
  const pct = (hp / battle.maxHp) * 100;
  const left = Math.max(0, Math.ceil((BATTLE_MS - elapsedMs(battle, now)) / 1000));

  const pop = (dmg, crit, x = 50) => {
    const id = ++floatId;
    setFloats((f) => [...f, { id, dmg, crit, x }]);
    setHurt((h) => h + 1);
    setTimeout(() => setFloats((f) => f.filter((p) => p.id !== id)), 900);
  };
  const tap = (e) => {
    const crit = Math.random() < 0.1;
    const dmg = hitBattle("tap", crit ? DMG.tapCrit : DMG.tap);
    const r = e.currentTarget.getBoundingClientRect();
    pop(dmg, crit, ((e.clientX - r.left) / r.width) * 100 || 50);
    navigator.vibrate?.(crit ? 25 : 8);
  };

  return (
    <section className="arena" aria-label={`Combat contre ${B.n}`}>
      <div className="arena-head">
        <span className="px-name">{B.n}</span>
        <span className="px-lvl">Niv. {battle.lvl}{battle.intensity ? ` · envie ${battle.intensity}/5` : ""}</span>
      </div>
      <div className="hp" role="meter" aria-label="Points de vie du boss" aria-valuemin={0} aria-valuemax={battle.maxHp} aria-valuenow={hp}>
        <i style={{ width: `${pct}%` }} className={pct < 25 ? "low" : pct < 55 ? "mid" : ""} />
        <span>{hp} / {battle.maxHp} PV</span>
      </div>
      <p className="bubble" key={taunt}>« {B.taunts[taunt % B.taunts.length]} »</p>
      <button type="button" className={`boss-hit${hurt % 2 ? " hurt-a" : hurt ? " hurt-b" : ""}${hp <= 0 ? " dying" : ""}`} onClick={tap} aria-label="Taper le boss">
        <Pixel name={B.sprite} className="boss" />
        {battle.lvl >= 3 && <Pixel name="crown" className="crown" />}
        {floats.map((f) => <span key={f.id} className={`dmg${f.crit ? " crit" : ""}`} style={{ left: `${f.x}%` }}>{f.crit ? "CRIT " : "-"}{f.dmg}</span>)}
      </button>
      <p className="arena-tip">Tape-le pour l'user. Il s'épuise tout seul dans <b>{Math.floor(left / 60)}:{pad(left % 60)}</b> : tiens jusque-là et c'est gagné.</p>

      {!arcade ? (
        <div className="attacks">
          <button className="atk sport" type="button" onClick={() => { setFlow({ mode: "circuit", attack: true }); go("circuit"); }}>
            <b>Circuit</b><small>−{Math.round(DMG.circuit * 100)} % PV · +25 XP</small>
          </button>
          <button className="atk breath" type="button" onClick={() => { setFlow({ mode: "breath", attack: true, autostart: true }); go("respirer"); }}>
            <b>Respirer</b><small>−{Math.round(DMG.breathCycle * 100)} % par cycle · +20 XP</small>
          </button>
          <button className="atk game" type="button" onClick={() => { setFlow({ mode: "game", attack: true }); setArcade(true); }}>
            <b>Blocs</b><small>−{Math.round(DMG.line * 100)} % par ligne · +20 XP</small>
          </button>
        </div>
      ) : (
        <Blocs
          duration={180} autoStart
          onLines={(n) => { const d = hitBattle("game", n >= 4 ? DMG.quad : DMG.line * n); pop(d, n >= 4); }}
          onEnd={(r) => {
            commit([{ k: "game", t: new Date().toISOString(), g: "blocs", s: r.score, l: r.lines, d: r.sec }]);
            setArcade(false);
            setFlow({ mode: "idle" });
          }}
        />
      )}

      {!confirmFlee
        ? <button className="linkbtn arena-flee" type="button" onClick={() => setConfirmFlee(true)}>Fausse alerte, j'arrête le combat</button>
        : <p className="arena-flee">Le combat s'arrête sans XP. <button className="linkbtn" type="button" onClick={fleeBattle}>Arrêter</button> · <button className="linkbtn" type="button" onClick={() => setConfirmFlee(false)}>Continuer</button></p>}
    </section>
  );
}
