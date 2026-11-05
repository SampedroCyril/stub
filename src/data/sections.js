/**
 * Navigation : les sections en bas de l'écran, chacune avec ses sous-onglets.
 * Les Réglages généraux ne sont pas dans la barre : on y va par la roue crantée de l'Accueil (nav: false).
 */
export const SECTIONS = [
  { id: "accueil", label: "Accueil", icon: "home", views: ["accueil"] },
  { id: "sevrage", label: "Sevrage", icon: "leaf", views: ["sevrage", "respirer"] },
  { id: "sante", label: "Santé", icon: "heart", views: ["sante", "symptomes", "risques"], optional: true, d: "Ton corps qui récupère, tes symptômes de sevrage, ce que fait la clope." },
  { id: "sport", label: "Sport", icon: "dumbbell", views: ["circuit", "records", "exos"], optional: true, d: "Circuits, records caméra, exercices. Masquée : plus de « Bouger » quand tu notes une envie." },
  { id: "joueur", label: "Joueur", icon: "gamepad", views: ["talents", "boutique", "arcade", "bestiaire"], optional: true, d: "Combats de boss, talents, boutique, Arcade, bestiaire. Masquée : plus de « Combat » quand tu notes une envie." },
  { id: "progres", label: "Progrès", icon: "trophy", views: ["defis", "badges", "stats"], optional: true, d: "Défis de la semaine, badges, statistiques." },
  { id: "reglages", label: "Réglages", icon: "gear", views: ["reglages"], nav: false },
];
export const SUB_LABELS = { sevrage: "Envies", respirer: "Respirer", sante: "Récupération", symptomes: "Symptômes", risques: "La clope", circuit: "Circuit", records: "Records", exos: "Exos", talents: "Talents", boutique: "Boutique", arcade: "Arcade", bestiaire: "Boss", defis: "Défis", badges: "Badges", stats: "Stats" };
/** Sections de la barre du bas, selon les réglages (Accueil et Sevrage sont toujours là). */
export const visibleSections = (state) => SECTIONS.filter((s) => s.nav !== false && (!s.optional || state?.sections?.[s.id] !== false));
export const sectionOn = (state, id) => state?.sections?.[id] !== false;
export const VIEWS = SECTIONS.flatMap((s) => s.views);
export const sectionOf = (v) => SECTIONS.find((s) => s.views.includes(v)) || SECTIONS[0];
