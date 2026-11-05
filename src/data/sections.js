/**
 * Navigation : les sections en bas de l'écran, chacune avec ses sous-onglets.
 * Les Réglages généraux ne sont pas dans la barre : on y va par la roue crantée de l'Accueil (nav: false).
 */
export const SECTIONS = [
  { id: "accueil", label: "Accueil", icon: "home", views: ["accueil"] },
  { id: "sevrage", label: "Sevrage", icon: "leaf", views: ["sevrage", "respirer"], optional: true, core: true, d: "Arrêter pour de bon : jours sans clope, niveau et XP sevrage. Une clope fumée le remet à zéro." },
  { id: "reduction", label: "Réduction", icon: "down", views: ["reduction", "clopes", "respirer"], optional: true, core: true, d: "Fumer moins, petit à petit : tes clopes du jour face à un objectif qui baisse, et tes stats." },
  { id: "sante", label: "Santé", icon: "heart", views: ["sante", "symptomes", "risques"], optional: true, d: "Ton corps qui récupère, tes symptômes de sevrage, ce que fait la clope." },
  { id: "sport", label: "Sport", icon: "dumbbell", views: ["circuit", "records", "exos"], optional: true, d: "Circuits, records caméra, exercices. Masquée : plus de « Bouger » quand tu notes une envie." },
  { id: "joueur", label: "Joueur", icon: "gamepad", views: ["talents", "boutique", "arcade", "bestiaire"], optional: true, d: "Combats de boss, talents, boutique, Arcade, bestiaire. Masquée : plus de « Combat » quand tu notes une envie." },
  { id: "progres", label: "Progrès", icon: "trophy", views: ["defis", "badges", "stats"], optional: true, d: "Défis de la semaine, badges, statistiques." },
  { id: "reglages", label: "Réglages", icon: "gear", views: ["reglages"], nav: false },
];
export const SUB_LABELS = { sevrage: "Envies", respirer: "Respirer", reduction: "Aujourd'hui", clopes: "Stats", sante: "Récupération", symptomes: "Symptômes", risques: "La clope", circuit: "Circuit", records: "Records", exos: "Exos", talents: "Talents", boutique: "Boutique", arcade: "Arcade", bestiaire: "Boss", defis: "Défis", badges: "Badges", stats: "Stats" };
/** Sections masquées tant qu'on ne les a pas activées. */
const OFF_BY_DEFAULT = new Set(["reduction"]);
const rawOn = (state, id) => { const v = state?.sections?.[id]; return v === undefined ? !OFF_BY_DEFAULT.has(id) : v !== false; };
/**
 * Sevrage et Réduction sont deux catégories à part, chacune activable, mais au moins une reste active :
 * si les deux sont coupées (vieil export, import), le Sevrage revient.
 */
export const sectionOn = (state, id) => (id === "sevrage" ? rawOn(state, "sevrage") || !rawOn(state, "reduction") : rawOn(state, id));
export const visibleSections = (state) => SECTIONS.filter((s) => s.nav !== false && (!s.optional || sectionOn(state, s.id)));
/** Vues où vit une envie (et son combat) : la page Envies du Sevrage, la page du jour de la Réduction. */
export const CRAVING_VIEWS = ["sevrage", "reduction"];
export const cravingHome = (state) => (sectionOn(state, "sevrage") ? "sevrage" : "reduction");
export const VIEWS = [...new Set(SECTIONS.flatMap((s) => s.views))];
/** Section d'une vue. Une vue partagée (Respirer) va à la première section active qui la contient. */
export const sectionOf = (v, state) => SECTIONS.find((s) => s.views.includes(v) && (!state || !s.optional || sectionOn(state, s.id))) || SECTIONS.find((s) => s.views.includes(v)) || SECTIONS[0];
