import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import Pixel from "./Pixel.jsx";
import Blocs from "./Blocs.jsx";
import { BOSSES, ATTACK_NAME, modsOf } from "./bosses.js";
import { hpAt, elapsedMs, modFor, weakLeft, bestiary, BATTLE_MS, DMG, WEAK, TEMPT } from "./battle.js";
import { pad } from "../lib/util.js";

let floatId = 0;
const rand = (a, b) => a + Math.random() * (b - a);
const pct = (x) => `${Math.round(x * 100)} %`;

/** Faiblesses connues (boss déjà battu au moins une fois). */
export function ModChips({ boss, known }) {
  const mods = modsOf(boss);
  if (!mods.length) return <span className="mods"><span className="mod">Aucune faiblesse</span></span>;
  if (!known) return <span className="mods"><span className="mod">Faiblesses : ???</span></span>;
  return (
    <span className="mods">
      {mods.map((m) => <span key={m.src} className={`mod ${m.weak ? "weak" : "res"}`}>{m.weak ? "Faible" : "Résiste"} : {ATTACK_NAME[m.src]} ×{String(m.x).replace(".", ",")}</span>)}
    </span>
  );
}

/** Écran de combat contre le boss d'une envie. */
export default function Battle() {
  const { battle, hitBattle, winBattle, fleeBattle, setFlow, go, commit, S } = useApp();
  const [, setTick] = useState(0);
  const [floats, setFloats] = useState([]);
  const [hurt, setHurt] = useState(0);
  const [taunt, setTaunt] = useState(0);
  const [arcade, setArcade] = useState(false);
  const [confirmFlee, setConfirmFlee] = useState(false);
  const [weak, setWeak] = useState(null); // {x, y, born}
  const [tempt, setTempt] = useState(null); // {until}
  const won = useRef(false);
  const inArcade = useRef(false);
  inArcade.current = arcade;
  const temptRef = useRef(null);
  temptRef.current = tempt;

  // quitter l'écran en pleine partie de blocs : on libère l'attaque pour ne pas bloquer la victoire
  useEffect(() => () => { if (inArcade.current) setFlow({ mode: "idle" }); }, [setFlow]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 250);
    const tid = setInterval(() => setTaunt((x) => x + 1), 7000);
    return () => { clearInterval(id); clearInterval(tid); };
  }, []);

  // point faible : apparaît au hasard, disparaît vite
  useEffect(() => {
    if (arcade || tempt || weak) return;
    const id = setTimeout(() => setWeak({ x: rand(22, 78), y: rand(25, 75), born: Date.now() }), rand(WEAK.min, WEAK.max));
    return () => clearTimeout(id);
  }, [weak, arcade, tempt]);
  useEffect(() => {
    if (!weak) return;
    const id = setTimeout(() => setWeak(null), WEAK.show);
    return () => clearTimeout(id);
  }, [weak]);

  // tentation : le boss contre-attaque
  useEffect(() => {
    if (arcade || !battle) return;
    const since = elapsedMs(battle, new Date());
    const wait = since < TEMPT.first ? TEMPT.first - since : rand(TEMPT.min, TEMPT.max);
    const id = setTimeout(() => setTempt({ until: Date.now() + TEMPT.window }), wait);
    return () => clearTimeout(id);
  }, [tempt, arcade, battle?.id]);
  useEffect(() => {
    if (!tempt) return;
    const id = setTimeout(() => {
      if (temptRef.current !== tempt) return;
      const d = hitBattle("heal", -DMG.heal);
      pop(`+${-d} PV`, "heal");
      navigator.vibrate?.([60, 40, 60]);
      setTempt(null);
    }, tempt.until - Date.now());
    return () => clearTimeout(id);
  }, [tempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const hp = battle ? hpAt(battle, now) : 0;
  useEffect(() => {
    if (battle && hp <= 0 && !won.current && !arcade) { won.current = true; setTimeout(winBattle, 450); }
  }, [battle, hp, arcade, winBattle]);
  if (!battle) return null;

  const B = BOSSES[battle.boss];
  const hpPct = (hp / battle.maxHp) * 100;
  const left = Math.max(0, Math.ceil((BATTLE_MS - elapsedMs(battle, now)) / 1000));
  const known = (bestiary(S.ev)[battle.boss]?.wins || 0) > 0;
  const weakDone = weakLeft(battle) <= 0;
  const eff = (src, base) => pct(base * (known ? modFor(battle, src) : 1));

  function pop(text, kind = "", x = 50) {
    const id = ++floatId;
    setFloats((f) => [...f, { id, text, kind, x }]);
    if (kind !== "miss" && kind !== "heal") setHurt((h) => h + 1);
    setTimeout(() => setFloats((f) => f.filter((p) => p.id !== id)), 900);
  }
  const tapBoss = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    pop("Raté !", "miss", ((e.clientX - r.left) / r.width) * 100 || 50);
  };
  const tapWeak = (e) => {
    e.stopPropagation();
    if (!weak) return;
    const fast = Date.now() - weak.born < WEAK.fast;
    const d = hitBattle("weak", fast ? DMG.weakFast : DMG.weak);
    setWeak(null);
    pop(d ? `${fast ? "CRIT " : ""}-${d}` : "Max !", fast ? "crit" : "", weak.x);
    navigator.vibrate?.(fast ? 30 : 12);
  };
  const refuse = () => {
    const d = hitBattle("refuse", DMG.refuse);
    setTempt(null);
    pop(`NON ! -${d}`, "crit");
    navigator.vibrate?.(20);
  };

  return (
    <section className="arena" aria-label={`Combat contre ${B.n}`}>
      <div className="arena-head">
        <span className="px-name">{B.n}</span>
        <span className="px-lvl">Niv. {battle.lvl}{battle.intensity ? ` · envie ${battle.intensity}/5` : ""}</span>
      </div>
      <ModChips boss={battle.boss} known={known} />
      <div className="hp" role="meter" aria-label="Points de vie du boss" aria-valuemin={0} aria-valuemax={battle.maxHp} aria-valuenow={hp}>
        <i style={{ width: `${hpPct}%` }} className={hpPct < 25 ? "low" : hpPct < 55 ? "mid" : ""} />
        <span>{hp} / {battle.maxHp} PV</span>
      </div>
      <p className="bubble" key={taunt}>« {B.taunts[taunt % B.taunts.length]} »</p>
      <div className={`boss-hit${hurt % 2 ? " hurt-a" : hurt ? " hurt-b" : ""}${hp <= 0 ? " dying" : ""}`} onClick={tapBoss} role="presentation">
        <Pixel name={B.sprite} className="boss" />
        {battle.lvl >= 3 && <Pixel name="crown" className="crown" />}
        {weak && !weakDone && (
          <button type="button" className="weakspot" style={{ left: `${weak.x}%`, top: `${weak.y}%` }} onClick={tapWeak} aria-label="Point faible : touche-le vite" />
        )}
        {floats.map((f) => <span key={f.id} className={`dmg ${f.kind}`} style={{ left: `${f.x}%` }}>{f.text}</span>)}
      </div>
      <p className="arena-tip">
        {weakDone ? "Points faibles épuisés : passe aux vraies attaques." : "Guette le point faible et touche-le vite."} Il s'épuise tout seul dans <b>{Math.floor(left / 60)}:{pad(left % 60)}</b>.
      </p>

      {tempt && createPortal(
        <div className="tempt" role="alertdialog" aria-label="Tentation">
          <Pixel name="clope" className="tempt-art" />
          <p className="px-name">{B.n} te tend une clope !</p>
          <button className="btn danger-fill big" type="button" onClick={refuse}>Refuser</button>
          <div className="tempt-bar"><i style={{ animationDuration: `${TEMPT.window}ms` }} /></div>
          <small>Refuse : −{pct(DMG.refuse)} PV pour lui. Laisse passer : il récupère {pct(DMG.heal)}.</small>
        </div>, document.body
      )}

      {!arcade ? (
        <div className="attacks">
          <button className="atk sport" type="button" onClick={() => { setFlow({ mode: "circuit", attack: true }); go("circuit"); }}>
            <b>Circuit</b><small>−{eff("circuit", DMG.circuit)} · {eff("circuit", DMG.circuitCam)} caméra</small>
          </button>
          <button className="atk breath" type="button" onClick={() => { setFlow({ mode: "breath", attack: true, autostart: true }); go("respirer"); }}>
            <b>Respirer</b><small>−{eff("breath", DMG.breathCycle)} par cycle</small>
          </button>
          <button className="atk game" type="button" onClick={() => { setFlow({ mode: "game", attack: true }); setArcade(true); setWeak(null); setTempt(null); }}>
            <b>Blocs</b><small>−{eff("game", DMG.line)} par ligne</small>
          </button>
        </div>
      ) : (
        <Blocs
          duration={180} autoStart
          onLines={(n) => { const d = hitBattle("game", n >= 4 ? DMG.quad : DMG.line * n); pop(`-${d}`, n >= 4 ? "crit" : ""); }}
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
