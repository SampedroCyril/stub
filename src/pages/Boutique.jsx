import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppStore.jsx";
import { Panel } from "../components/ui.jsx";
import BossView from "../game/BossView.jsx";
import { useShop } from "../game/useArsenal.js";
import { ITEMS, ITEM, SLOTS, EXPLOITS, EARN, canBuy } from "../game/shop.js";
import { ULT, KO, HIT_SKINS } from "../game/gfx/fxPack.js";
import { TRAYS, AURAS, COUNTERS } from "../game/gfx/fxMore.js";
import { AshtrayScene } from "../game/gfx/Ashtray.js";
import { BOSSES } from "../game/bosses.js";

const FX = { ult: ULT, ko: KO, sig: HIT_SKINS, tray: TRAYS, aura: AURAS, counter: COUNTERS };
const PLURAL = { ult: "Ultimes", ko: "K.O.", sig: "Signatures", tray: "Cendriers", aura: "Auras d'Éveil", counter: "Compteurs de combo" };
const info = (it) => FX[it.slot][it.fx];
const BOSS_IDS = Object.keys(BOSSES);

/** Mégot en pixels : la monnaie de la boutique. */
export const Megot = ({ size = 16 }) => (
  <svg className="megot" viewBox="0 0 16 8" width={size} height={size / 2} aria-hidden="true" shapeRendering="crispEdges">
    <rect x="0" y="1" width="16" height="6" fill="#140c1c" />
    <rect x="1" y="2" width="6" height="4" fill="#d9822b" /><rect x="2" y="2" width="1" height="1" fill="#f2b45a" /><rect x="5" y="4" width="1" height="1" fill="#a85a1a" />
    <rect x="7" y="2" width="6" height="4" fill="#f4f4f4" /><rect x="7" y="5" width="6" height="1" fill="#c2c3c7" />
    <rect x="13" y="2" width="2" height="4" fill="#566c86" /><rect x="14" y="3" width="1" height="1" fill="#ef7d57" />
  </svg>
);

/** Boutique des coups spéciaux (mégots, exploits) et Arsenal (ce qu'on équipe). */
export default function Boutique() {
  const { state, patchState, flash } = useApp();
  const shop = useShop();
  const [tab, setTab] = useState("vitrine");
  const [open, setOpen] = useState(null); // id de l'objet en aperçu

  const buy = (id) => {
    if (!canBuy(id, shop.bal, shop.owned)) return;
    patchState({ shop: { ...state.shop, bought: [...shop.bought, id] } });
    flash?.([`${info(ITEM[id]).n} est à toi`]);
  };
  const equip = (slot, id) => patchState({ shop: { ...state.shop, eq: { ...shop.eq, [slot]: id } } });

  return (
    <Panel id="boutique">
      <section className="shop-bal">
        <div><span className="label">Tes mégots</span><b><Megot size={28} /> {shop.bal.toLocaleString("fr-FR")}</b></div>
        <p>Chaque envie tenue rapporte des mégots. Dépense-les pour de nouveaux coups spéciaux.</p>
      </section>

      <div className="chiprow modes" role="tablist" aria-label="Boutique">
        {[["vitrine", "Vitrine"], ["arsenal", "Arsenal"]].map(([id, n]) => (
          <button key={id} className="pick" role="tab" type="button" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>{n}</button>
        ))}
      </div>

      {tab === "vitrine" && SLOTS.map((sl) => (
        <section key={sl.id} className="shop-sec">
          <h3>{PLURAL[sl.id]}<small>{sl.d}</small></h3>
          <div className="shop-grid">
            {ITEMS.filter((it) => it.slot === sl.id).map((it) => <Card key={it.id} it={it} shop={shop} onOpen={() => setOpen(it.id)} />)}
          </div>
        </section>
      ))}

      {tab === "arsenal" && (
        <>
          <p className="sub">Équipe un effet par emplacement, ou laisse le hasard choisir parmi les tiens à chaque coup.</p>
          {SLOTS.map((sl) => {
            const mine = ITEMS.filter((it) => it.slot === sl.id && shop.owned.includes(it.id)), cur = shop.eq[sl.id];
            return (
              <section key={sl.id} className="box ars-slot">
                <h3>{sl.n}<small>{sl.d}</small></h3>
                <div className="chiprow" role="radiogroup" aria-label={sl.n}>
                  {mine.length > 1 && <button className="pick" type="button" role="radio" aria-checked={cur === "random"} aria-pressed={cur === "random"} onClick={() => equip(sl.id, "random")}>Au hasard parmi les miens</button>}
                  {mine.map((it) => <button key={it.id} className="pick" type="button" role="radio" aria-checked={cur === it.id || (mine.length === 1)} aria-pressed={cur === it.id || mine.length === 1} onClick={() => equip(sl.id, it.id)}>{info(it).n}</button>)}
                </div>
                <button className="linkbtn" type="button" onClick={() => setOpen(cur !== "random" && shop.owned.includes(cur) ? cur : mine[(Math.random() * mine.length) | 0].id)}>Voir en action</button>
              </section>
            );
          })}
        </>
      )}

      <details className="box fold">
        <summary>Comment tu gagnes des mégots</summary>
        <div className="rules">
          <div><span>Envie tenue (combat, souffle ou sport)</span><b className="g">+{EARN.craving}</b></div>
          <div><span>Boss vaincu au rang S</span><b className="g">+{EARN.rankS}</b></div>
          <div><span>Journée entière sans fumer</span><b className="g">+{EARN.cleanDay}</b></div>
          <div><span>Arcade : 1 mégot pour {EARN.arcadeXp} XP joueur</span><b className="g">10 max par jour</b></div>
        </div>
        <div className="rules shop-earned">
          <div><span>{shop.earn.n.held} envies tenues</span><b>{shop.earn.held}</b></div>
          <div><span>{shop.earn.n.rankS} rangs S</span><b>{shop.earn.rankS}</b></div>
          <div><span>{shop.earn.n.days} jours sans fumer</span><b>{shop.earn.days}</b></div>
          <div><span>Arcade</span><b>{shop.earn.arcade}</b></div>
        </div>
        <p className="tip">Les achats ne se perdent jamais, même après une rechute. Sept pièces ne s'achètent pas : elles se gagnent par exploit.</p>
      </details>

      {open && <Preview id={open} shop={shop} onClose={() => setOpen(null)} onBuy={buy} onEquip={equip} />}
    </Panel>
  );
}

function Card({ it, shop, onOpen }) {
  const I = info(it), has = shop.owned.includes(it.id), eqd = shop.eq[it.slot] === it.id;
  const ex = it.exploit && EXPLOITS[it.id], [a, b] = ex ? ex.prog(shop.ctx) : [0, 0];
  return (
    <button type="button" className={`shop-card s-${it.slot}${has ? " has" : ""}${ex ? " ex" : ""}`} onClick={onOpen}>
      <b>{I.n}</b>
      <small>{I.d}</small>
      {has
        ? <em className="own">{eqd ? "Équipé" : "À toi"}</em>
        : ex
          ? <em className="exp"><span>Exploit · {ex.n}</span><i style={{ "--k": a / b }} /><span>{a}/{b}</span></em>
          : <em className={`price${shop.bal >= it.price ? "" : " short"}`}><Megot /> {it.price}</em>}
    </button>
  );
}

/** Aperçu : le boss encaisse l'effet, avec achat ou équipement. */
function Preview({ id, shop, onClose, onBuy, onEquip }) {
  const it = ITEM[id], I = info(it), stage = useRef(null);
  const [run, setRun] = useState(0);
  const [boss] = useState(() => BOSS_IDS[(Math.random() * BOSS_IDS.length) | 0]);
  const has = shop.owned.includes(id), ex = it.exploit && EXPLOITS[id], eqd = shop.eq[it.slot] === id;
  const busy = useRef(false);

  const ashCv = useRef(null), ash = useRef(null);
  const play = () => {
    if (it.slot === "tray") { ash.current?.destroy(); ash.current = new AshtrayScene(ashCv.current, { count: 5, style: it.fx }); return; }
    const s = stage.current;
    if (!s || busy.current) return;
    busy.current = true;
    if (it.slot === "ult") { s.hit(800, { big: true, style: it.fx, charge: 16, label: "-800" }); setTimeout(() => { busy.current = false; }, 1600); }
    else if (it.slot === "aura") { s.aura = it.fx; s.exitTrance(); s.enterTrance(); busy.current = false; }
    else if (it.slot === "counter") {
      s.counter = it.fx; s.combo = 0;
      let i = 0;
      const go = () => { const st = stage.current; if (!st) return; i++; if (i > 16) { st.combo = 0; st.breakCombo(); busy.current = false; return; } st.combo = i; st.tier(i % 5 === 0 ? 3 : i % 2 ? 1 : 2, 100 + i * 5, { combo: i, label: `-${100 + i * 5}` }); setTimeout(go, 260); };
      go();
    } else if (it.slot === "ko") s.ko(it.fx).then(() => setTimeout(() => { busy.current = false; setRun((r) => r + 1); }, 300));
    else {
      s.hitSkin = it.fx === "classic" ? null : it.fx;
      let i = 0;
      const go = () => { if (!stage.current) return; i++; stage.current.tier(i % 4 === 0 ? 3 : i % 2 ? 1 : 2, 120 + i * 10, { combo: i, label: `-${120 + i * 10}` }); if (i < 7) setTimeout(go, 240); else busy.current = false; };
      go();
    }
  };
  useEffect(() => { const t = setTimeout(play, it.slot === "tray" ? 50 : 500); return () => { clearTimeout(t); ash.current?.destroy(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="modal shop-modal" role="dialog" aria-modal="true" aria-label={I.n} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet shop-sheet">
        <div className="arena shop-arena">
          {it.slot === "tray" ? <div className="v-ash shop-ash"><canvas ref={ashCv} className="ash-canvas" aria-label="Le cendrier" /></div> : <BossView key={run} stageRef={stage} boss={boss} maxHp={9999} hp={9999} />}
        </div>
        <div className="shop-sheet-b">
          <h3>{I.n}</h3>
          <p>{I.d}</p>
          <button className="btn" type="button" onClick={play}>Rejouer</button>
          {has
            ? <button className="btn green" type="button" disabled={eqd} onClick={() => onEquip(it.slot, id)}>{eqd ? "Équipé" : "Équiper"}</button>
            : ex
              ? <p className="shop-lock">Exploit : {ex.n} ({ex.prog(shop.ctx).join("/")}). Ça ne s'achète pas.</p>
              : <button className="btn green" type="button" disabled={shop.bal < it.price} onClick={() => onBuy(id)}>{shop.bal >= it.price ? <>Acheter · <Megot /> {it.price}</> : <>Il te manque {it.price - shop.bal} mégots</>}</button>}
          <button className="linkbtn" type="button" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
