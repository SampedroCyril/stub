import { useApp, sectionOn } from "../store/AppStore.jsx";
import { Bar, Panel, multText } from "../components/ui.jsx";
import Icon from "../art/Icon.jsx";
import { healthState } from "../lib/compute.js";
import { HEALTH, Q_TITLES, S_TITLES, P_TITLES, titleOf } from "../data/rules.js";
import { DOW, fDate, fTime, pl, durationText } from "../lib/util.js";
import { savings } from "../lib/smoking.js";

const eur = (v) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: v >= 100 ? 0 : 2 });

/**
 * Accueil, réduit à l'essentiel : depuis quand, le bouton pour une envie, ce qu'on a gagné,
 * le niveau de chaque catégorie affichée et le prochain cap santé. Le reste vit dans sa catégorie.
 */
export default function Home() {
  const { S, go, startCraving, state } = useApp();
  const on = (id) => sectionOn(state, id);
  const hs = healthState(S);
  const cpd = state.cpd || 0;
  const sv = savings(S.ev, { now: S.now, startAt: S.startAt, cpd, price: state.packPrice || 0, pack: state.packSize || 20 });
  const levels = [
    { k: "quit", n: "Sevrage", lv: S.quit, t: Q_TITLES, to: "sevrage", show: true },
    { k: "sport", n: "Sport", lv: S.sport, t: S_TITLES, to: "circuit", show: on("sport") },
    { k: "player", n: "Joueur", lv: S.player, t: P_TITLES, to: "talents", show: on("joueur") },
  ].filter((l) => l.show);

  return (
    <Panel id="accueil">
      <section className="hero">
        <span className="label">Sans cigarette depuis</span>
        <span className="count">{durationText(S.elapsed)}</span>
        <span className="since">
          Depuis le {DOW[S.q.getDay()]} {fDate(S.q)} à {fTime(S.q)}
          {S.best > S.streak ? ` · record ${pl(S.best, "jour")}` : ""}
        </span>
        <button className="hero-cta" type="button" onClick={startCraving}>J'ai envie de fumer</button>
      </section>

      <section className="gains" aria-label="Ce que tu as gagné">
        <div><b>{S.cravAll.length}</b><span>{S.cravAll.length > 1 ? "envies tenues" : "envie tenue"}</span></div>
        {sv
          ? <><div><b>{sv.avoided.toLocaleString("fr-FR")}</b><span>cigarettes évitées</span></div>{sv.saved > 0 && <div><b>{eur(sv.saved)}</b><span>économisés</span></div>}</>
          : on("sante") && <button type="button" className="gains-set" onClick={() => go("risques")}>Indique ta conso pour voir tes économies ›</button>}
      </section>

      <section className="lvl-list" aria-label="Niveaux">
        {levels.map((l) => (
          <button key={l.k} type="button" className={`lvl-row ${l.k}`} onClick={() => go(l.to)}>
            <span className="lvl-row-n"><small>{l.n}</small><b>{titleOf(l.t, l.lv.L)}</b></span>
            <span className="lvl-row-l">niv. <b>{l.lv.L}</b></span>
            <Bar pct={(l.lv.cur / l.lv.need) * 100} />
          </button>
        ))}
      </section>

      {on("sante") && (
        <button className="linkcard" type="button" onClick={() => go("sante")}>
          {hs.next ? (
            <>
              <Icon name={hs.next.ic} col={hs.next.col} />
              <div>
                <span className="label">Prochain cap santé · {hs.next.lab}</span>
                <strong>{hs.next.t}</strong>
                <Bar pct={hs.frac * 100} color="var(--quit)" />
                <span>Dans {durationText(hs.next.ms - S.elapsed)} · puis XP {multText(Math.max(S.mult, hs.next.x))}</span>
              </div>
            </>
          ) : (
            <><Icon name="trophy" col="quit" /><div><span className="label">Santé</span><strong>Tous les caps sont atteints</strong></div></>
          )}
          <span className="chev" aria-hidden="true">›</span>
        </button>
      )}
    </Panel>
  );
}
