import { DAY, dayKey } from "../lib/util.js";

/* ---------------- Progression ----------------
 * Sport et joueur : seuil cumulé pour atteindre le niveau L : K × (L-1) × L.
 * Sevrage : voir quitLevelOf plus bas (999 niveaux, multiplicateur de série).
 */
export const SPORT_K = 60;
export const XP_DAY = 100;
export const DEFI_XP = 80;
export const CRAV_XP = { hold: 15, breath: 20, game: 20, sport: 25, crisis: 30 };

/* ---------------- Niveau joueur (combats et Arcade, jamais remis à zéro) ---------------- */
export const PLAYER_K = 50;
export const P_TITLES = ["Débutant", "Apprenti", "Cogneur", "Bagarreur", "Enchaîneur", "Briseur", "Fléau", "Cauchemar", "Boss final", "Légende"];
export const RANK_PXP = { S: 30, A: 15, B: 5, C: 0 };
export const ARCADE_DAY_CAP = 120;
export const ARCADE_MODES = ["frenzy", "endless", "bossrun"];
/** XP joueur d'un événement. dayMap cumule l'XP d'Arcade par jour (plafonnée). */
export function playerXpOf(e, dayMap = new Map()) {
  if (e.k === "craving" && e.b) return 20 + Math.min(60, e.mc || 0) + (RANK_PXP[e.rk] || 0);
  if (e.k === "game" && ARCADE_MODES.includes(e.g)) {
    const k = dayKey(new Date(e.t)), got = dayMap.get(k) || 0;
    const x = Math.max(0, Math.min(ARCADE_DAY_CAP - got, Math.floor((e.s || 0) / 50)));
    dayMap.set(k, got + x);
    return x;
  }
  return 0;
}

/**
 * Multiplicateur d'XP, commun à tous les modules (sevrage, sport, joueur ; pas les mégots) : il suit les caps de
 * récupération de la Santé. Chaque cap atteint depuis la dernière cigarette fixe un nouveau multiplicateur (voir HEALTH.x).
 * Une cigarette relance les caps ; le multiplicateur garde au moins la moitié de son bonus (× 1,50 devient × 1,25),
 * jusqu'à ce que les caps le dépassent à nouveau. La première journée complète sans fumer après une cigarette
 * rapporte un bonus de rebond.
 */
/** Multiplicateur des caps santé atteints après ms sans fumer. */
export function stageMult(ms) {
  let m = 1;
  for (const h of HEALTH) { if (ms >= h.ms) m = h.x; else break; }
  return m;
}
/** Multiplicateur dans une série : le meilleur entre les caps atteints et le bonus gardé de la série d'avant. */
export const segMult = (ms, b0 = 0) => Math.max(1 + b0, stageMult(ms));
/** Bonus gardé après une cigarette : la moitié. */
export const afterSmoke = (mult) => 1 + Math.round(((mult - 1) / 2) * 10000) / 10000;
export const REBOUND_XP = 100;
/** XP multipliée, arrondie. */
export const withMult = (x, m = 1) => Math.round(x * m);

/**
 * Niveaux sevrage : l'XP ne repart jamais à zéro. 999 niveaux ; le niveau L demande 100 + 2 × (L - 1)^1,2 XP.
 * Sans fumer, compter un mois pour le niveau 35, un an pour le 145, environ 26 ans pour le 999 (un siècle sans multiplicateur).
 */
export const QUIT_MAX = 999;
export const quitNeed = (L) => Math.round(100 + 2 * (L - 1) ** 1.2);
/** Q_CUM[L - 1] : XP cumulée pour atteindre le niveau L. */
const Q_CUM = [0];
for (let L = 1; L < QUIT_MAX; L++) Q_CUM.push(Q_CUM[L - 1] + quitNeed(L));
export function quitLevelOf(xp) {
  let lo = 1, hi = QUIT_MAX;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (Q_CUM[m - 1] <= xp) lo = m; else hi = m - 1; }
  if (lo === QUIT_MAX) return { L: lo, cur: 1, need: 1, max: true };
  return { L: lo, cur: xp - Q_CUM[lo - 1], need: quitNeed(lo) };
}
/** Titres du sevrage, par niveau de départ. */
export const Q_TITLES = [[1, "Premier pas"], [5, "Bien parti"], [15, "Poumons en chantier"], [35, "Souffle retrouvé"], [65, "Moins dépendant"], [145, "Ex-fumeur"], [225, "Libre"], [365, "Inarrêtable"], [515, "Non-fumeur"], [999, "Légende"]];
export const S_TITLES = ["Rouillé", "Échauffé", "Motivé", "Régulier", "Solide", "Costaud", "Athlète", "Machine", "Monstre", "Légende"];
/** Titre d'un niveau : liste simple (un titre par niveau), ou liste de [niveau de départ, titre]. */
export const titleOf = (titles, L) => (Array.isArray(titles[0]) ? titles.filter(([m]) => m <= L).pop()[1] : titles[Math.min(L - 1, titles.length - 1)]);

export function levelOf(xp, k) {
  let L = 1;
  while (k * L * (L + 1) <= xp) L++;
  const lo = k * (L - 1) * L, hi = k * L * (L + 1);
  return { L, cur: xp - lo, need: hi - lo };
}

/* ---------------- Envies ---------------- */
// déclencheurs : rangés par catégorie dans triggers.js
export { TRIGGERS, TRIG_NAME } from "./triggers.js";
export const I_NAMES = ["", "Légère", "Ça va", "Forte", "Très forte", "Énorme"];
/** Force d'une envie sur 10 (0.4.1). Les envies notées avant sur 5 comptent double. */
export const ivOf = (e) => e?.iv ?? (e?.i ? e.i * 2 : null);
export const ivName = (v) => ["", "Légère", "Légère", "Ça titille", "Ça titille", "Bien présente", "Bien présente", "Forte", "Forte", "Très forte", "Insupportable"][v] || "";
export const methodOf = (e) => e.m || (e.sport ? "sport" : "hold");
export const METHOD_NAME = { sport: "au sport", breath: "en respirant", game: "au combat", crisis: "en mode crise", hold: "sans rien" };

/* ---------------- Santé (repères après la dernière nicotine) ---------------- */
/** Caps de récupération. x : multiplicateur d'XP une fois le cap atteint. */
export const HEALTH = [
  { ms: 20 * 6e4, lab: "20 min", x: 1.05, t: "Le cœur se calme", d: "Ton pouls et ta tension commencent à redescendre.", ic: "heart", col: "heart" },
  { ms: 8 * 36e5, lab: "8 heures", x: 1.1, t: "L'oxygène remonte", d: "Le monoxyde de carbone dans ton sang est divisé par deux, l'oxygène revient vers la normale.", ic: "drop", col: "accent" },
  { ms: 2 * DAY, lab: "2 jours", x: 1.2, t: "Goût et odorat reviennent", d: "Le monoxyde de carbone est éliminé, les poumons commencent à évacuer le mucus. Le goût et l'odorat s'améliorent.", ic: "flower", col: "pink" },
  { ms: 3 * DAY, lab: "3 jours", x: 1.3, t: "Respirer devient plus facile", d: "La nicotine a quitté ton corps, les bronches se détendent, l'énergie remonte. C'est souvent le pic du manque, ensuite ça redescend.", ic: "lungs", col: "pink" },
  { ms: 21 * DAY, lab: "3 semaines", x: 1.5, t: "Le manque physique recule", d: "Pour la plupart des gens, le manque physique s'estompe nettement entre 2 et 4 semaines. Restent surtout les envies liées aux habitudes.", ic: "wave", col: "breath" },
  { ms: 84 * DAY, lab: "3 mois", x: 1.75, t: "Circulation et effort", d: "Entre 2 et 12 semaines, la circulation s'améliore : marcher, courir et faire du sport deviennent plus faciles.", ic: "bolt", col: "accent" },
  { ms: 270 * DAY, lab: "9 mois", x: 2, t: "Les poumons se réparent", d: "La toux et l'essoufflement diminuent, la capacité pulmonaire peut augmenter jusqu'à 10 %.", ic: "lungsStar", col: "pink" },
  { ms: 365 * DAY, lab: "1 an", x: 2.5, t: "Cœur protégé", d: "Le risque de crise cardiaque est environ deux fois plus faible que celui d'un fumeur.", ic: "heartShield", col: "heart" },
  { ms: 3652 * DAY, lab: "10 ans", x: 4, t: "Cancer du poumon divisé par deux", d: "Le risque de cancer du poumon tombe à environ la moitié de celui d'un fumeur.", ic: "lungsShield", col: "pink" },
  { ms: 5479 * DAY, lab: "15 ans", x: 5, t: "Comme un non-fumeur", d: "Entre 10 et 15 ans après l'arrêt, l'espérance de vie redevient celle d'une personne qui n'a jamais fumé.", ic: "trophy", col: "quit" },
];

/* ---------------- Respiration ---------------- */
export const PATTERNS = {
  coherence: { n: "Cohérence cardiaque", code: "5 · 5", d: "6 respirations par minute. Le plus simple pour calmer le rythme cardiaque et le stress.", ph: [["Inspire", 5, 0, 1], ["Expire", 5, 1, 0]] },
  soupir: { n: "Expiration longue", code: "4 · 6", d: "Expirer plus longtemps qu'on inspire active la détente. Idéal en pleine envie.", ph: [["Inspire", 4, 0, 1], ["Expire", 6, 1, 0]] },
  carre: { n: "Respiration carrée", code: "4 · 4 · 4 · 4", d: "Inspire, bloque, expire, bloque. Demande de la concentration, ça occupe la tête.", ph: [["Inspire", 4, 0, 1], ["Bloque", 4, 1, 1], ["Expire", 4, 1, 0], ["Bloque", 4, 0, 0]] },
};
export const BREATH_DURS = [60, 120, 180, 300];

/* ---------------- Récap ---------------- */
export const RECAP_HOUR = 18;
