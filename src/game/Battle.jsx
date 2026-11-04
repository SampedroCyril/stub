import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppStore.jsx";
import Pixel from "./Pixel.jsx";
import BossView from "./BossView.jsx";
import { useClicker } from "./useClicker.js";
import { BOSSES, traitsOf, traitList } from "./bosses.js";
import { hpAt, elapsedMs, bestiary, BATTLE_MS, DMG, TEMPT } from "./battle.js";
import { perksOf } from "../data/skills.js";
import { pad } from "../lib/util.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pct = (x) => `${Math.round(x * 100)} %`;

/** Traits du boss (faiblesse et résistance), visibles après la première victoire. */
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

/** Combat contre le boss d'une envie : un clicker à combo, jusqu'au K.O. */
export default function Battle() {
  const { battle, state, hitBattle, patchBattle, winBattle, fleeBattle, S, battleView } = useApp();
  const stage = useRef(null), arena = useRef(null);
  const [, setTick] = useState(0);
  const [taunt, setTaunt] = useState(0);
  const [started, setStarted] = useState(false);
  const [confirmFlee, setConfirmFlee] = useState(false);
  const [tempt, setTempt] = useState(null); // {until}
  const temptRef = useRef(null);
  temptRef.current = tempt;
  const ko = useRef(false);
  const latest = useRef({});
  latest.current = { battle, winBattle };
  const [startHp] = useState(() => (battle ? hpAt(battle, new Date()) : 0));
  const traits = battle ? traitsOf(battle.boss) : undefined;
  const perks = perksOf(state.skills);

  const clicker = useClicker(stage, {
    intensity: battle?.intensity, skills: state.skills, traits,
    onHit: ({ dmg, maxCombo }) => {
      const b = latest.current.battle;
      if (!b) return dmg;
      let d = dmg;
      // Coup de grâce : sous 5 % de PV, le coup achève le boss
      const left = hpAt(b, new Date());
      if (perks.grace && left - d <= b.maxHp * 0.05) d = Math.max(d, left);
      d = hitBattle("game", Math.min(d, Math.max(1, left)));
      if (maxCombo > (b.mc || 0)) patchBattle({ mc: maxCombo });
      return d;
    },
  });
  const clickerRef = useRef(clicker);
  clickerRef.current = clicker;

  // tant que cet écran est affiché, c'est lui qui joue le K.O. et déclare la victoire
  useLayoutEffect(() => { battleView.current = true; return () => { battleView.current = false; }; }, [battleView]);
  useEffect(() => { arena.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, []);
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
        setTempt(null);
        s.ko().then(() => latest.current.winBattle());
      }
    }, 250);
    const tid = setInterval(() => setTaunt((x) => x + 1), 7000);
    return () => { clearInterval(id); clearInterval(tid); };
  }, []);

  // tentation : le boss tend une clope, le combo est suspendu
  useEffect(() => {
    if (!started || tempt || !battle) return;
    const k = traits?.tempt || 1;
    const since = elapsedMs(battle, new Date());
    const wait = since < TEMPT.first * k ? TEMPT.first * k - since : rand(TEMPT.min, TEMPT.max) * k;
    const id = setTimeout(() => { if (ko.current) return; clickerRef.current.pause(); setTempt({ until: Date.now() + TEMPT.window }); }, wait);
    return () => clearTimeout(id);
  }, [tempt, started, battle?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!tempt) return;
    const id = setTimeout(() => {
      if (temptRef.current !== tempt) return;
      const b = latest.current.battle;
      const d = hitBattle("heal", -Math.round(b.maxHp * DMG.heal));
      stage.current?.heal(-d);
      setTempt(null);
      clickerRef.current.resume(900);
      clickerRef.current.breakCombo();
    }, tempt.until - Date.now());
    return () => clearTimeout(id);
  }, [tempt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!battle) return null;
  const B = BOSSES[battle.boss];
  const now = new Date();
  const left = Math.max(0, Math.ceil((BATTLE_MS - elapsedMs(battle, now)) / 1000));
  const known = (bestiary(S.ev)[battle.boss]?.wins || 0) > 0;

  const onTap = (e) => {
    if (ko.current) return;
    if (!started) { setStarted(true); clicker.start(); return; }
    clicker.tap(e);
  };
  const refuse = () => {
    const d = hitBattle("refuse", Math.round(battle.maxHp * DMG.refuse * perks.refuse));
    setTempt(null);
    stage.current?.refused(d);
    clicker.resume(900);
  };

  return (
    <section className="arena" ref={arena} aria-label={`Combat contre ${B.n}`}>
      <div className="arena-head">
        <span className="px-name">{B.n}</span>
        <span className="px-lvl">Niv. {battle.lvl}{battle.intensity ? ` · envie ${battle.intensity}/5` : ""}</span>
      </div>
      <ModChips boss={battle.boss} known={known} />
      <p className="bubble" key={taunt}>« {B.taunts[taunt % B.taunts.length]} »</p>
      <div className="boss-wrap">
        <BossView stageRef={stage} boss={battle.boss} maxHp={battle.maxHp} hp={startHp} lvl={battle.lvl} onTap={onTap} onWeakExpire={clicker.expire} />
        {!started && <button className="tap-start" type="button" onClick={() => onTap({})}>Touche pour commencer</button>}
      </div>
      <p className="arena-tip">
        {started ? "Touche chaque point faible avant que ses crochets se referment. Un raté remet le combo à zéro." : "Les points faibles vont apparaître sur le boss : enchaîne-les sans en rater un pour monter les paliers."}
        {" "}Il s'épuise tout seul dans <b>{Math.floor(left / 60)}:{pad(left % 60)}</b>.
      </p>

      {tempt && createPortal(
        <div className="tempt" role="alertdialog" aria-label="Tentation">
          <Pixel name="clope" className="tempt-art" />
          <p className="px-name">{B.n} te tend une clope !</p>
          <button className="btn danger-fill big" type="button" onClick={refuse}>Refuser</button>
          <div className="tempt-bar"><i style={{ animationDuration: `${TEMPT.window}ms` }} /></div>
          <small>Refuse : il perd {pct(DMG.refuse * perks.refuse)} de ses PV et ton combo continue. Laisse passer : il récupère {pct(DMG.heal)} et ton combo casse.</small>
        </div>, document.body,
      )}

      {!confirmFlee
        ? <button className="linkbtn arena-flee" type="button" onClick={() => setConfirmFlee(true)}>Fausse alerte, j'arrête le combat</button>
        : <p className="arena-flee">Le combat s'arrête sans XP. <button className="linkbtn" type="button" onClick={fleeBattle}>Arrêter</button> · <button className="linkbtn" type="button" onClick={() => setConfirmFlee(false)}>Continuer</button></p>}
    </section>
  );
}
