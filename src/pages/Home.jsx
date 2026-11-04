import { useApp } from "../store/AppStore.jsx";
import { Stat, Bar, LevelCard, Panel } from "../components/ui.jsx";
import Icon, { Medal } from "../art/Icon.jsx";
import { healthState } from "../lib/compute.js";
import { HEALTH } from "../data/rules.js";
import { DEFIS, fmtDefi } from "../data/defis.js";
import { BADGES, TIER_NAMES, badgeInfo } from "../data/badges.js";
import { DOW, fDate, fTime, pl, durationText } from "../lib/util.js";

export default function Home() {
  const { S, go, startCraving, setFlow } = useApp();
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
      </section>

      <section className="levels" aria-label="Niveaux">
        <LevelCard kind="quit" label="Sevrage" />
        <LevelCard kind="sport" label="Sport" />
      </section>

      <div className="row3">
        <button className="btn green" type="button" onClick={startCraving}>J'ai envie</button>
        <button className="btn blue" type="button" onClick={() => { setFlow({ mode: "circuit" }); go("circuit"); }}>Circuit</button>
        <button className="btn teal" type="button" onClick={() => go("respirer")}>Respirer</button>
      </div>

      <button className="linkcard" type="button" onClick={() => go("sante")}>
        {hs.next ? (
          <>
            <Icon name={hs.next.ic} col={hs.next.col} />
            <div>
              <span className="label">Prochain cap santé · {hs.next.lab}</span>
              <strong>{hs.next.t}</strong>
              <Bar pct={hs.frac * 100} color="var(--quit)" />
              <span>Dans {durationText(hs.next.ms - S.elapsed)} · {hs.doneN}/{HEALTH.length} caps atteints</span>
            </div>
          </>
        ) : (
          <><Icon name="trophy" col="quit" /><div><span className="label">Santé</span><strong>Tous les caps sont atteints</strong></div></>
        )}
      </button>

      <button className="linkcard" type="button" onClick={() => go("defis")}>
        <Icon name="star" col="gold" />
        <div>
          <span className="label">Défis de la semaine</span>
          <strong>{won} / 3 réussis</strong>
          <Bar pct={(won / 3) * 100} color="var(--gold)" />
          <span>{open ? `En cours : ${DEFIS[open.id].n.toLowerCase()} (${fmtDefi(open.id, open.v)} / ${fmtDefi(open.id, DEFIS[open.id].target)})` : "Tout est bouclé, reviens lundi."}</span>
        </div>
      </button>

      <section className="stack">
        <h2>L'essentiel</h2>
        <div className="stats">
          <Stat label="Envies tenues" value={S.cravAll.length} />
          <Stat label="XP sevrage" value={S.quitXp} />
          <Stat label="Record" value={`${S.best} j`} />
          <Stat label="Circuits" value={S.c.circ} />
          <Stat label="XP sport" value={S.sportXp} />
          <Stat label="Respirations" value={S.breaths.length} />
        </div>
      </section>

      <section className="stack">
        <div className="topbar">
          <h2>Meilleurs badges</h2>
          <button className="linkbtn" type="button" onClick={() => go("badges")}>Tous les badges</button>
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
