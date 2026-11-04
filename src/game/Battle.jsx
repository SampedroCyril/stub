import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import Pixel from "./Pixel.jsx";
import BossView from "./BossView.jsx";
import { useFrenzy } from "./useFrenzy.js";
import { BOSSES, ATTACK_NAME, modsOf } from "./bosses.js";
import { hpAt, elapsedMs, modFor, weakLeft, bestiary, BATTLE_MS, DMG, WEAK, TEMPT, FRENZY } from "./battle.js";
import { pad } from "../lib/util.js";

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
  const { battle, hitBattle, winBattle, fleeBattle, setFlow, go, commit, S, takeFx, battleView } = useApp();
  const stage = useRef(null), arena = useRef(null);
  const [, setTick] = useState(0);
  const [taunt, setTaunt] = useState(0);
  const [confirmFlee, setConfirmFlee] = useState(false);
  const [tempt, setTempt] = useState(null); // {until}
  const temptRef = useRef(null);
  temptRef.current = tempt;
  const ko = useRef(false);
  const busyUntil = useRef(0);
  const latest = useRef({});
  latest.current = { battle, winBattle };

  // effets en attente (circuit, respiration) : le boss les encaisse à l'écran en revenant
  const queued = useRef(null);
  if (queued.current === null) queued.current = battle ? takeFx() : [];
  const startHp = useRef(null);
  if (startHp.current === null && battle) startHp.current = Math.min(battle.maxHp, hpAt(battle, new Date()) + queued.current.reduce((a, f) => a + f.dmg, 0));

  const frenzy = useFrenzy(stage, {
    onHit: ({ fast, combo, burst }) => hitBattle("game", burst ? DMG.frenzyBurst : (fast ? DMG.frenzyFast : DMG.frenzy) * (combo >= FRENZY.comboBoost ? FRENZY.boost : 1)),
    onEnd: (r) => {
      if (r.hits) commit([{ k: "game", t: new Date().toISOString(), g: "frenzy", s: r.score, c: r.combo, h: r.hits, d: r.sec }]);
      setFlow({ mode: "idle" });
    },
  });
  const frenzyRef = useRef(frenzy);
  frenzyRef.current = frenzy;

  // tant que cet écran est affiché, c'est lui qui joue le K.O. et déclare la victoire
  useLayoutEffect(() => { battleView.current = true; return () => { battleView.current = false; }; }, [battleView]);
  // le boss d'abord : on amène l'arène en haut de l'écran
  useEffect(() => { arena.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, []);
  useEffect(() => () => {
    if (frenzyRef.current.active) setFlow({ mode: "idle" });
    const { battle: b, winBattle: w } = latest.current;
    if (b && hpAt(b, new Date()) <= 0) setTimeout(w, 0);
  }, [setFlow]);

  useEffect(() => {
    const q = queued.current;
    if (!q.length) return;
    let t = 450;
    const ids = q.map((fx) => {
      const at = t;
      t += fx.kind === "ultimate" ? 2700 : 1100;
      return setTimeout(() => {
        const s = stage.current;
        if (!s) return;
        if (fx.kind === "ultimate") s.hit(fx.dmg, { big: true, label: `-${fx.dmg}` });
        else s.hit(fx.dmg, { kind: "refuse", label: `-${fx.dmg}` });
      }, at);
    });
    busyUntil.current = performance.now() + t;
    return () => ids.forEach(clearTimeout);
  }, []);

  // horloge : synchro des PV (épuisement) et K.O.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((x) => x + 1);
      const s = stage.current, b = latest.current.battle;
      if (!s || !b || s.dead || s.pending || s.refuseAt || performance.now() < busyUntil.current) return;
      const hp = hpAt(b, new Date());
      s.setHp(hp);
      if (hp <= 0 && !ko.current) {
        ko.current = true;
        if (frenzyRef.current.active) frenzyRef.current.stop(false);
        setTempt(null);
        s.ko().then(() => latest.current.winBattle());
      }
    }, 250);
    const tid = setInterval(() => setTaunt((x) => x + 1), 7000);
    return () => { clearInterval(id); clearInterval(tid); };
  }, []);

  // point faible hors Frénésie : toutes les 6 à 12 s, jusqu'au plafond de 25 %
  useEffect(() => {
    if (frenzy.active || tempt) return;
    let id;
    const loop = () => {
      id = setTimeout(() => {
        const s = stage.current, b = latest.current.battle;
        if (s && b && !ko.current && weakLeft(b) > 0 && performance.now() > busyUntil.current) s.showWeak(WEAK.show, WEAK.fast);
        loop();
      }, rand(WEAK.min, WEAK.max));
    };
    loop();
    return () => clearTimeout(id);
  }, [frenzy.active, tempt]);

  // tentation : le boss tend une clope
  useEffect(() => {
    if (frenzy.active || !battle) return;
    const since = elapsedMs(battle, new Date());
    const wait = since < TEMPT.first ? TEMPT.first - since : rand(TEMPT.min, TEMPT.max);
    const id = setTimeout(() => { if (!ko.current) setTempt({ until: Date.now() + TEMPT.window }); }, wait);
    return () => clearTimeout(id);
  }, [tempt, frenzy.active, battle?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!tempt) return;
    const id = setTimeout(() => {
      if (temptRef.current !== tempt) return;
      const d = hitBattle("heal", -DMG.heal);
      stage.current?.heal(-d);
      setTempt(null);
    }, tempt.until - Date.now());
    return () => clearTimeout(id);
  }, [tempt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!battle) return null;
  const B = BOSSES[battle.boss];
  const now = new Date();
  const left = Math.max(0, Math.ceil((BATTLE_MS - elapsedMs(battle, now)) / 1000));
  const known = (bestiary(S.ev)[battle.boss]?.wins || 0) > 0;
  const weakDone = weakLeft(battle) <= 0;
  const eff = (src, base) => pct(base * (known ? modFor(battle, src) : 1));

  const onTap = (e) => {
    if (ko.current) return;
    if (frenzy.active) { frenzy.tap(e); return; }
    const s = stage.current;
    if (!s) return;
    if (!e.weak) { s.miss(e.x, e.y); return; }
    const fast = e.weak.age < WEAK.fast;
    s.hideWeak();
    const d = hitBattle("weak", fast ? DMG.weakFast : DMG.weak);
    if (d > 0) s.hit(d, { crit: fast, x: e.x, y: e.y });
    else s.float("max !", e.x, e.y - 3, { color: "#94b0c2" });
  };
  const refuse = () => {
    const d = hitBattle("refuse", DMG.refuse);
    setTempt(null);
    stage.current?.refused(d);
  };
  const startFrenzy = () => {
    setTempt(null);
    setFlow({ mode: "game", attack: true });
    frenzy.start();
  };

  return (
    <section className="arena" ref={arena} aria-label={`Combat contre ${B.n}`}>
      <div className="arena-head">
        <span className="px-name">{B.n}</span>
        <span className="px-lvl">Niv. {battle.lvl}{battle.intensity ? ` · envie ${battle.intensity}/5` : ""}</span>
      </div>
      <ModChips boss={battle.boss} known={known} />
      <p className="bubble" key={taunt}>« {B.taunts[taunt % B.taunts.length]} »</p>
      <BossView stageRef={stage} boss={battle.boss} maxHp={battle.maxHp} hp={startHp.current} lvl={battle.lvl} onTap={onTap} onWeakExpire={() => frenzy.active && frenzy.expire()} />
      <p className="arena-tip">
        {frenzy.active ? "Frénésie : touche chaque point faible, le plus vite possible. Un raté casse le combo." : weakDone ? "Points faibles épuisés : passe aux vraies attaques." : "Guette le point faible et touche-le avant que les crochets se referment."}
        {" "}Il s'épuise tout seul dans <b>{Math.floor(left / 60)}:{pad(left % 60)}</b>.
      </p>

      {tempt && createPortal(
        <div className="tempt" role="alertdialog" aria-label="Tentation">
          <Pixel name="clope" className="tempt-art" />
          <p className="px-name">{B.n} te tend une clope !</p>
          <button className="btn danger-fill big" type="button" onClick={refuse}>Refuser</button>
          <div className="tempt-bar"><i style={{ animationDuration: `${TEMPT.window}ms` }} /></div>
          <small>Refuse : −{pct(DMG.refuse)} PV pour lui. Laisse passer : il récupère {pct(DMG.heal)}.</small>
        </div>, document.body,
      )}

      {!frenzy.active ? (
        <div className="attacks">
          <button className="atk sport" type="button" onClick={() => { setFlow({ mode: "circuit", attack: true }); go("circuit"); }}>
            <b>Circuit</b><small>−{eff("circuit", DMG.circuit)} · {eff("circuit", DMG.circuitCam)} caméra</small>
          </button>
          <button className="atk breath" type="button" onClick={() => { setFlow({ mode: "breath", attack: true, autostart: true }); go("respirer"); }}>
            <b>Respirer</b><small>−{eff("breath", DMG.breathCycle)} par cycle</small>
          </button>
          <button className="atk game" type="button" onClick={startFrenzy}>
            <b>Frénésie</b><small>{FRENZY.dur / 1000} s · −{eff("game", DMG.frenzy)} à {eff("game", DMG.frenzyFast)} par coup</small>
          </button>
        </div>
      ) : (
        <button className="linkbtn arena-flee" type="button" onClick={() => frenzy.stop(false)}>Arrêter la Frénésie</button>
      )}

      {!confirmFlee
        ? <button className="linkbtn arena-flee" type="button" onClick={() => setConfirmFlee(true)}>Fausse alerte, j'arrête le combat</button>
        : <p className="arena-flee">Le combat s'arrête sans XP. <button className="linkbtn" type="button" onClick={fleeBattle}>Arrêter</button> · <button className="linkbtn" type="button" onClick={() => setConfirmFlee(false)}>Continuer</button></p>}
    </section>
  );
}
