import { useApp, sectionOn } from "../store/AppStore.jsx";
import { Stat, Bar, LevelCard, Panel } from "../components/ui.jsx";
import Icon, { Medal } from "../art/Icon.jsx";
import { healthState } from "../lib/compute.js";
import { HEALTH } from "../data/rules.js";
import { DEFIS, fmtDefi } from "../data/defis.js";
import { BADGES, TIER_NAMES, badgeInfo } from "../data/badges.js";
import { DOW, fDate, fTime, pl, durationText } from "../lib/util.js";
import Cendrier, { stageOf } from "../game/Cendrier.jsx";
import { bestiary } from "../game/battle.js";

export default function Home() {
  const { S, go, startCraving, state } = useApp();
  const sport = sectionOn(state, "sport"), joueur = sectionOn(state, "joueur"), progres = sectionOn(state, "progres");
  const hs = healthState(S);
  const cw = S.weeks[S.weeks.length - 1];
  const won = cw.defs.filter((d) => d.doneAt && d.doneAt <= S.now).length;
  const open = cw.defs.filter((d) => !(d.doneAt && d.doneAt <= S.now)).sort((a, b) => b.v / DEFIS[b.id].target - a.v / DEFIS[a.id].target)[0];
  const got = BADGES.map((b) => ({ b, ...badgeInfo(b, S) })).filter((x) => x.t).sort((a, b) => b.t - a.t || (b.date || 0) - (a.date || 0));

  return (
    <Panel id="accueil">
      <section className="hero">
        <span className="label">Sans clope depuis</span>
        <span className="count">{durationText(S.elapsed)}</span>
        <span className="since">
          Depuis le {DOW[S.q.getDay()]} {fDate(S.q)} à {fTime(S.q)}
          {S.best > S.streak ? ` · record ${pl(S.best, "jour")}` : ""}
        </span>
        <button className="hero-cta" type="button" onClick={startCraving}>J'ai envie de fumer</button>
      </section>

      <section className="levels" aria-label="Niveaux">
        <LevelCard kind="quit" label="Sevrage" />
        {sport ? <LevelCard kind="sport" label="Sport" /> : joueur ? <LevelCard kind="player" label="Joueur" /> : null}
      </section>

      <section className="stack">
        <h2>Cette semaine</h2>
        {progres && <button className="linkcard" type="button" onClick={() => go("defis")}>
          <Icon name="star" col="gold" />
          <div>
            <span className="label">Défis · {won} / 3 réussis</span>
            <strong>{open ? DEFIS[open.id].n : "Tous les défis sont bouclés"}</strong>
            <Bar pct={open ? (open.v / DEFIS[open.id].target) * 100 : 100} color="var(--gold)" />
            <span>{open ? `${fmtDefi(open.id, open.v)} / ${fmtDefi(open.id, DEFIS[open.id].target)}` : "Nouveaux défis lundi."}</span>
          </div>
          <span className="chev" aria-hidden="true">›</span>
        </button>}
        <button className="linkcard" type="button" onClick={() => go("sante")}>
          {hs.next ? (
            <>
              <Icon name={hs.next.ic} col={hs.next.col} />
              <div>
                <span className="label">Prochain cap santé · {hs.next.lab}</span>
                <strong>{hs.next.t}</strong>
                <Bar pct={hs.frac * 100} color="var(--quit)" />
                <span>Dans {durationText(hs.next.ms - S.elapsed)} · {hs.doneN}/{HEALTH.length} atteints</span>
              </div>
            </>
          ) : (
            <><Icon name="trophy" col="quit" /><div><span className="label">Santé</span><strong>Tous les caps sont atteints</strong></div></>
          )}
          <span className="chev" aria-hidden="true">›</span>
        </button>
      </section>

      <button className="linkcard ash" type="button" onClick={() => go(joueur ? "bestiaire" : "sevrage")}>
        <Cendrier count={S.cravAll.length} />
        <div>
          <span className="label">Le cendrier · {stageOf(S.cravAll.length).n}</span>
          <strong>{pl(S.cravAll.length, "clope")} écrasée{S.cravAll.length > 1 ? "s" : ""}</strong>
          <span>{joueur && S.bossN ? `${S.bossN} boss vaincu${S.bossN > 1 ? "s" : ""} · ${Object.keys(bestiary(S.ev)).length} au bestiaire` : "Chaque envie tenue écrase une clope ici."}</span>
        </div>
        <span className="chev" aria-hidden="true">›</span>
      </button>

      <section className="stack">
        <h2>En bref</h2>
        <div className="stats">
          <Stat label="Envies tenues" value={S.cravAll.length} />
          {sport ? <Stat label="Circuits" value={S.c.circ} /> : <Stat label="Jours sans" value={S.streak} />}
          <Stat label="Respirations" value={S.breaths.length} />
        </div>
      </section>

      <section className="stack">
        <div className="topbar">
          <h2>Meilleurs badges</h2>
          {progres && <button className="linkbtn" type="button" onClick={() => go("badges")}>Tout voir</button>}
        </div>
        <div className="mini-badges">
          {got.length ? got.slice(0, 4).map((x) => (
            <div className="mb" key={x.b.id}>
              <Medal t={x.t} />
              <div>
                <strong>{x.b.n}</strong>
                <span>{TIER_NAMES[x.t - 1]} · {x.b.f(x.b.tiers[x.t - 1])}</span>
                <span>le {fDate(x.date)}</span>
              </div>
            </div>
          )) : <p className="empty">Ton premier badge tombe au premier jour complet, à la première envie tenue ou au premier circuit.</p>}
        </div>
      </section>
    </Panel>
  );
}
