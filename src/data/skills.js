/**
 * Arbre de compétences du niveau joueur : un point par niveau, trois branches de cinq.
 * Chaque compétence demande la précédente de sa branche. Réinitialisable gratuitement.
 */
export const BRANCHES = [
  { id: "power", n: "Puissance", d: "Taper plus fort" },
  { id: "tech", n: "Technique", d: "Taper plus juste" },
  { id: "show", n: "Spectacle", d: "Débloquer les gros effets" },
];

export const SKILLS = [
  { id: "p1", br: "power", n: "Poigne", d: "+10 % de dégâts" },
  { id: "p2", br: "power", n: "Élan", d: "Les paliers arrivent 10 % plus tôt dans le combo" },
  { id: "p3", br: "power", n: "Refus cinglant", d: "Refuser la clope lui fait deux fois plus mal" },
  { id: "p4", br: "power", n: "Poigne d'acier", d: "+20 % de dégâts en plus" },
  { id: "p5", br: "power", n: "Coup de grâce", d: "Sous 5 % de PV, ton prochain coup l'achève" },
  { id: "t1", br: "tech", n: "Réflexes", d: "Le coup rapide compte 0,1 s plus longtemps" },
  { id: "t2", br: "tech", n: "Œil de lynx", d: "Points faibles 25 % plus faciles à toucher" },
  { id: "t3", br: "tech", n: "Seconde chance", d: "Un raté pardonné par combat" },
  { id: "t4", br: "tech", n: "Sang-froid", d: "Points faibles visibles 15 % plus longtemps" },
  { id: "t5", br: "tech", n: "Increvable", d: "Deux ratés pardonnés par combat" },
  { id: "s1", br: "show", n: "Impact noir", d: "Débloque le palier 6 : l'écran s'inverse, éclairs noirs" },
  { id: "s2", br: "show", n: "Fracture", d: "Débloque le palier 7 : l'écran se fissure et vole en éclats" },
  { id: "s3", br: "show", n: "Supernova", d: "Débloque le palier 8 : la lumière avale l'écran" },
  { id: "s4", br: "show", n: "Transe", d: "Débloque le palier 9 : l'arène s'embrase" },
  { id: "s5", br: "show", n: "K.O. Manga", d: "Deuxième mise à mort, tirée au hasard avec la Tranche" },
];
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

/** Compétence requise avant celle-ci (la précédente de la branche). */
export function requires(id) {
  const br = SKILLS.filter((s) => s.br === SKILL[id].br), i = br.findIndex((s) => s.id === id);
  return i > 0 ? br[i - 1].id : null;
}
export const canLearn = (id, owned, points) => points > 0 && !owned.includes(id) && (!requires(id) || owned.includes(requires(id)));

/** Effets en jeu des compétences possédées. */
export function perksOf(owned = []) {
  const has = (id) => owned.includes(id);
  return {
    power: 1 + (has("p1") ? 0.1 : 0) + (has("p4") ? 0.2 : 0),
    early: has("p2") ? 0.1 : 0,
    refuse: has("p3") ? 2 : 1,
    grace: has("p5"),
    fastMs: 420 + (has("t1") ? 100 : 0),
    hitR: has("t2") ? 1.25 : 1,
    forgive: has("t5") ? 2 : has("t3") ? 1 : 0,
    show: has("t4") ? 1.15 : 1,
    unlocked: 5 + ["s1", "s2", "s3", "s4"].filter(has).length,
    ko: has("s5") ? "random" : "cut",
  };
}
