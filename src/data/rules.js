import { DAY, dayKey } from "../lib/util.js";

/* ---------------- Progression ----------------
 * Seuil cumulé pour atteindre le niveau L : K × (L-1) × L
 */
export const QUIT_K = 75;
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

export const Q_TITLES = ["Premier pas", "Ça tient", "Poumons en chantier", "Souffle retrouvé", "Moins accro", "Ex-fumeur", "Libre", "Inarrêtable", "Non-fumeur", "Légende"];
export const S_TITLES = ["Rouillé", "Échauffé", "Motivé", "Régulier", "Solide", "Costaud", "Athlète", "Machine", "Monstre", "Légende"];
export const titleOf = (titles, L) => titles[Math.min(L - 1, titles.length - 1)];

export function levelOf(xp, k) {
  let L = 1;
  while (k * L * (L + 1) <= xp) L++;
  const lo = k * (L - 1) * L, hi = k * L * (L + 1);
  return { L, cur: xp - lo, need: hi - lo };
}

/* ---------------- Envies ---------------- */
export const TRIGGERS = [
  ["ennui", "Ennui"], ["repas", "Après manger"], ["cafe", "Café"], ["stress", "Stress"], ["alcool", "Alcool"],
  ["ecran", "Écran / jeu"], ["reveil", "Réveil"], ["potes", "Entre potes"], ["fatigue", "Fatigue"], ["autre", "Autre"],
];
export const TRIG_NAME = Object.fromEntries(TRIGGERS);
export const I_NAMES = ["", "Légère", "Ça va", "Forte", "Très forte", "Énorme"];
export const methodOf = (e) => e.m || (e.sport ? "sport" : "hold");
export const METHOD_NAME = { sport: "au sport", breath: "en respirant", game: "au combat", crisis: "en mode crise", hold: "sans rien" };

/* ---------------- Santé (repères après la dernière nicotine) ---------------- */
export const HEALTH = [
  { ms: 20 * 6e4, lab: "20 min", t: "Le cœur se calme", d: "Ton pouls et ta tension commencent à redescendre.", ic: "heart", col: "heart" },
  { ms: 8 * 36e5, lab: "8 heures", t: "L'oxygène remonte", d: "Le monoxyde de carbone dans ton sang est divisé par deux, l'oxygène revient vers la normale.", ic: "drop", col: "accent" },
  { ms: 2 * DAY, lab: "2 jours", t: "Goût et odorat reviennent", d: "Le monoxyde de carbone est éliminé, les poumons commencent à évacuer le mucus. Le goût et l'odorat s'améliorent.", ic: "flower", col: "pink" },
  { ms: 3 * DAY, lab: "3 jours", t: "Respirer devient plus facile", d: "La nicotine a quitté ton corps, les bronches se détendent, l'énergie remonte. C'est souvent le pic du manque, ensuite ça redescend.", ic: "lungs", col: "pink" },
  { ms: 21 * DAY, lab: "3 semaines", t: "Le manque physique recule", d: "Pour la plupart des gens, le manque physique s'estompe nettement entre 2 et 4 semaines. Restent surtout les envies liées aux habitudes.", ic: "wave", col: "breath" },
  { ms: 84 * DAY, lab: "3 mois", t: "Circulation et effort", d: "Entre 2 et 12 semaines, la circulation s'améliore : marcher, courir et faire du sport deviennent plus faciles.", ic: "bolt", col: "accent" },
  { ms: 270 * DAY, lab: "9 mois", t: "Les poumons se réparent", d: "La toux et l'essoufflement diminuent, la capacité pulmonaire peut augmenter jusqu'à 10 %.", ic: "lungsStar", col: "pink" },
  { ms: 365 * DAY, lab: "1 an", t: "Cœur protégé", d: "Le risque de crise cardiaque est environ deux fois plus faible que celui d'un fumeur.", ic: "heartShield", col: "heart" },
  { ms: 3652 * DAY, lab: "10 ans", t: "Cancer du poumon divisé par deux", d: "Le risque de cancer du poumon tombe à environ la moitié de celui d'un fumeur.", ic: "lungsShield", col: "pink" },
  { ms: 5479 * DAY, lab: "15 ans", t: "Comme un non-fumeur", d: "Entre 10 et 15 ans après l'arrêt, l'espérance de vie redevient celle d'une personne qui n'a jamais fumé.", ic: "trophy", col: "quit" },
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
