import { useApp } from "../store/AppStore.jsx";
import { Panel, Bar } from "../components/ui.jsx";
import { Medal } from "../art/Icon.jsx";
import { BADGES, TIER_NAMES, badgeInfo } from "../data/badges.js";
import { fDate, clamp } from "../lib/util.js";

function BadgeCard({ b, S }) {
  const { t, v, date } = badgeInfo(b, S);
  const done = t >= b.tiers.length;
  const prev = t ? b.tiers[t - 1] : b.lvl ? 1 : 0, next = b.tiers[Math.min(t, b.tiers.length - 1)];
  const pct = done ? 100 : clamp(((v - prev) / (next - prev)) * 100, 0, 100);
  return (
    <div className="badge" style={{ "--tc": `var(--t${Math.min(t + 1, 9)})` }}>
      <Medal t={t} />
      <div className="info">
        <h3>{b.n}</h3>
        <span className="meta">{t ? `${TIER_NAMES[t - 1]} le ${fDate(date)} · ` : ""}{b.f(v)}</span>
        <Bar pct={pct} height={6} />
        <span className="meta">{done ? "Tous les paliers débloqués" : `Prochain : ${b.f(next)}${b.lvl ? "" : ` · encore ${b.f(next - v)}`}`}</span>
        <div className="tiers">{b.tiers.map((_, i) => <i key={i} style={i < t ? { background: `var(--t${i + 1})` } : undefined} />)}</div>
      </div>
    </div>
  );
}

export default function Badges() {
  const { S } = useApp();
  const got = BADGES.reduce((a, b) => a + badgeInfo(b, S).t, 0), all = BADGES.reduce((a, b) => a + b.tiers.length, 0);
  return (
    <Panel id="badges">
      <div className="topbar"><h2>Badges</h2><span className="label">{got} / {all} paliers</span></div>
      <p className="sub">Chaque badge a plusieurs paliers, de Bronze à Légende. Ils sont acquis pour de bon, même après une rechute.</p>
      <div className="stack">
        <h3 className="sec-title">Sevrage</h3>
        <div className="badge-grid">{BADGES.filter((b) => b.g === "quit").map((b) => <BadgeCard key={b.id} b={b} S={S} />)}</div>
      </div>
      <div className="stack">
        <h3 className="sec-title sport">Sport, respiration et défis</h3>
        <div className="badge-grid">{BADGES.filter((b) => b.g === "sport").map((b) => <BadgeCard key={b.id} b={b} S={S} />)}</div>
      </div>
    </Panel>
  );
}
