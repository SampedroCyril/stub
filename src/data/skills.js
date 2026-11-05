/**
 * Arbre de compétences du niveau joueur, en constellation : un point par niveau.
 * L'arbre décide comment tu joues (dégâts, fenêtres, paliers débloqués) ; ce dont ça a l'air se choisit à la boutique.
 * Une bulle s'apprend dès qu'elle est reliée à une bulle acquise (le Départ l'est toujours). Réinitialisable gratuitement.
 */
export const BRANCHES = [
  { id: "power", n: "Puissance", d: "Taper plus fort" },
  { id: "tech", n: "Technique", d: "Taper plus juste" },
  { id: "show", n: "Paliers", d: "Débloquer les gros paliers" },
  { id: "hyb", n: "Ponts", d: "Entre deux branches" },
];

/** Bulles : position dans la constellation (viewBox 520 × 540), taille (small, big, key), icône. */
export const SKILLS = [
  { id: "root", br: "root", x: 260, y: 268, k: "key", ic: "★", n: "Départ", d: "Le point de départ : tout part d'ici." },
  { id: "p1", br: "power", x: 192, y: 322, k: "small", ic: "✦", n: "Poigne", d: "+10 % de dégâts." },
  { id: "p2", br: "power", x: 128, y: 376, k: "big", ic: "»", n: "Élan", d: "Les paliers arrivent 10 % plus tôt dans le combo." },
  { id: "p3", br: "power", x: 200, y: 423, k: "small", ic: "✕", n: "Refus cinglant", d: "Refuser une clope fait deux fois plus mal au boss." },
  { id: "p4", br: "power", x: 70, y: 440, k: "small", ic: "✦", n: "Poigne d'acier", d: "+20 % de dégâts en plus." },
  { id: "p5", br: "power", x: 130, y: 492, k: "key", ic: "☠", n: "Coup de grâce", d: "Sous 5 % de PV, ton coup suivant l'achève." },
  { id: "t1", br: "tech", x: 328, y: 322, k: "small", ic: "◎", n: "Réflexes", d: "La fenêtre « parfait » est plus large." },
  { id: "t2", br: "tech", x: 392, y: 376, k: "big", ic: "◉", n: "Œil de lynx", d: "La fenêtre « bien » est 25 % plus large." },
  { id: "t3", br: "tech", x: 320, y: 423, k: "small", ic: "♥", n: "Seconde chance", d: "Un raté pardonné par combat." },
  { id: "t4", br: "tech", x: 450, y: 440, k: "small", ic: "❄", n: "Sang-froid", d: "Les notes arrivent 15 % moins vite." },
  { id: "t5", br: "tech", x: 390, y: 492, k: "key", ic: "♥", n: "Increvable", d: "Deux ratés pardonnés par combat." },
  { id: "s1", br: "show", x: 260, y: 195, k: "small", ic: "ϟ", n: "Éclipse", d: "Débloque le palier 6 : Éclipse, l'image d'impact rouge et noir." },
  { id: "s2", br: "show", x: 196, y: 135, k: "big", ic: "◇", n: "Ascension", d: "Un palier d'ultime de plus : ton ultime équipé tombe au palier 7, puis au 8 avec Apogée." },
  { id: "s3", br: "show", x: 324, y: 135, k: "big", ic: "☀", n: "Apogée", d: "Un palier d'ultime de plus : ton ultime équipé tombe au palier 7, puis au 8 avec Ascension." },
  { id: "s4", br: "show", x: 260, y: 83, k: "small", ic: "∞", n: "Éveil", d: "Débloque le palier 9 : l'Éveil, dégâts doublés jusqu'au prochain raté." },
  { id: "s5", br: "show", x: 260, y: 30, k: "key", ic: "✺", n: "Éveil prolongé", d: "En Éveil, ton premier raté ne te fait pas retomber." },
  { id: "h1", br: "hyb", x: 92, y: 221, k: "big", ic: "♨", n: "Brûlure", d: "En Éveil, dégâts × 2,5 au lieu de × 2." },
  { id: "h2", br: "hyb", x: 428, y: 221, k: "big", ic: "◌", n: "Concentration", d: "Après une Éclipse ou un ultime, la note suivante arrive plus lentement." },
  { id: "h3", br: "hyb", x: 260, y: 466, k: "big", ic: "◆", n: "Série dorée", d: "La série se déclenche à 4 parfaits au lieu de 5." },
];
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
/** Liens de la constellation : chemins de branche, ponts, et deux chemins qui se croisent sous le Départ. */
export const LINKS = [
  ["root", "p1"], ["root", "t1"], ["root", "s1"], ["p1", "p2"], ["p2", "p3"], ["p2", "p4"], ["p3", "p5"], ["p4", "p5"],
  ["t1", "t2"], ["t2", "t3"], ["t2", "t4"], ["t3", "t5"], ["t4", "t5"], ["s1", "s2"], ["s1", "s3"], ["s2", "s4"], ["s3", "s4"], ["s4", "s5"],
  ["p2", "h1"], ["s2", "h1"], ["t2", "h2"], ["s3", "h2"], ["p3", "h3"], ["t3", "h3"], ["p1", "t3"], ["t1", "p3"],
];

const linked = (id, owned) => LINKS.some(([a, b]) => (a === id && (b === "root" || owned.includes(b))) || (b === id && (a === "root" || owned.includes(a))));
/** État d'une bulle : acquise, apprenable (reliée à une bulle acquise) ou verrouillée. */
export const skillState = (id, owned = []) => (id === "root" || owned.includes(id) ? "has" : linked(id, owned) ? "can" : "lock");
export const canLearn = (id, owned, points) => points > 0 && skillState(id, owned) === "can";

/** Effets en jeu des compétences possédées. */
export function perksOf(owned = []) {
  const has = (id) => owned.includes(id);
  return {
    power: 1 + (has("p1") ? 0.1 : 0) + (has("p4") ? 0.2 : 0),
    early: has("p2") ? 0.1 : 0,
    refuse: has("p3") ? 2 : 1,
    grace: has("p5"),
    perfectMs: has("t1") ? 30 : 0,
    goodWin: has("t2") ? 1.25 : 1,
    forgive: has("t5") ? 2 : has("t3") ? 1 : 0,
    slow: has("t4") ? 1.15 : 1,
    unlocked: 5 + ["s1", "s2", "s3", "s4"].filter(has).length,
    keepTrance: has("s5"),
    tranceMult: has("h1") ? 2.5 : 2,
    focus: has("h2"),
    streak: has("h3") ? 4 : 5,
  };
}
