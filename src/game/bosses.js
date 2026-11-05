import { TRIG_BOSS } from "../data/triggers.js";
/**
 * Boss d'envie : un par déclencheur, plus un sbire quand aucun déclencheur n'est choisi.
 * Ton volontairement décalé : le boss se moque de toi, tu lui réponds en le démolissant.
 * traits : une faiblesse et une résistance dans le combat clicker (voir TRAITS).
 */
export const BOSSES = {
  cafe: {
    n: "Le Café Maudit", sprite: "cafe", trig: "cafe",
    traits: { weak: "crit", res: "spot" },
    taunts: ["Un petit café sans cigarette ? Sois pas ridicule.", "Je suis noir, amer, et je te manque.", "Le combo café-cigarette, c'est sacré, non ?"],
    death: "Le Café Maudit refroidit. Pour toujours.",
  },
  spectre: {
    n: "Le Spectre de 2h du mat'", sprite: "spectre", trig: null,
    traits: { weak: "size", res: "spot" },
    taunts: ["Tout le monde dort… personne ne verra rien.", "Une petite dernière avant de dormir ?", "Bouh. Tu peux pas dormir, hein ?"],
    death: "Le Spectre retourne hanter quelqu'un d'autre.",
  },
  ennui: {
    n: "L'Ennui Éternel", sprite: "ennui", trig: "ennui",
    traits: { weak: "spot", res: "crit" },
    taunts: ["Baaah… Rien à faire… Une cigarette, au moins ?", "Tu t'ennuies ? Moi, j'ai une idée…", "Zzz… Allume-en une, ça passera le temps."],
    death: "L'Ennui s'est ennuyé de perdre. Il part.",
  },
  repas: {
    n: "Le Repas Traître", sprite: "repas", trig: "repas",
    traits: { weak: "tempt", res: "size" },
    taunts: ["Le dessert, c'est la cigarette. Tout le monde sait ça.", "Bien mangé ? Il manque juste un truc…", "Je suis le digestif que tu mérites."],
    death: "Le Repas Traître est digéré. Bon appétit.",
  },
  stress: {
    n: "Le Démon du Stress", sprite: "stress", trig: "stress",
    traits: { weak: "crit", res: "tempt" },
    taunts: ["Respire ? Non. FUME.", "T'es tendu, là. Une seule, pour te calmer…", "Je te lâche pas tant que t'en as pas allumé une."],
    death: "Le Démon du Stress se dégonfle comme un ballon.",
  },
  alcool: {
    n: "La Pinte Perfide", sprite: "alcool", trig: "alcool",
    traits: { weak: "spot", res: "tempt" },
    taunts: ["Une bière sans cigarette, c'est comme une soirée sans musique.", "Allez, c'est la fête ! Juste ce soir…", "Santé ! Enfin… façon de parler."],
    death: "La Pinte Perfide est vidée. Cul sec.",
  },
  ecran: {
    n: "Le Glitch", sprite: "ecran", trig: "ecran",
    traits: { weak: "tempt", res: "spot" },
    taunts: ["Pause cigarette entre deux parties ? Classique.", "ERREUR 404 : volonté introuvable.", "Je mets le jeu en pause, toi tu sors fumer."],
    death: "Le Glitch a été patché.",
  },
  reveil: {
    n: "Le Réveil Grognon", sprite: "reveil", trig: "reveil",
    traits: { weak: "size", res: "crit" },
    taunts: ["DRIIING ! La cigarette du matin, c'est la meilleure !", "Debout ! Café, cigarette, et c'est parti.", "Tu commences pas la journée sans moi, si ?"],
    death: "Le Réveil Grognon est en mode silencieux.",
  },
  potes: {
    n: "Le Paquet Copain", sprite: "potes", trig: "potes",
    traits: { weak: "crit", res: "tempt" },
    taunts: ["T'en veux une ? Allez, une seule, ça compte pas.", "Tout le monde fume, là. Tu vas pas rester tout seul ?", "Fais pas ton relou, prends-en une."],
    death: "Le Paquet Copain est jeté. Même pas recyclé.",
  },
  fatigue: {
    n: "Le Zombie Pâteux", sprite: "fatigue", trig: "fatigue",
    traits: { weak: "spot", res: "size" },
    taunts: ["Brrraaains… Euh… Cigaaarette…", "T'es crevé ? Une cigarette, ça réveille.", "Ta volonté est fatiguée, elle aussi."],
    death: "Le Zombie Pâteux est enfin allé se coucher.",
  },
  clope: {
    n: "Clopinette", sprite: "clope", trig: null,
    traits: {},
    taunts: ["Coucou ! C'est moi, ta vieille copine.", "Rien qu'une taffe. Juste une.", "Tu me reconnais ? On a vécu des trucs ensemble."],
    death: "Clopinette est écrasée. Bien fait.",
  },
};

/** Boss d'une envie : selon le déclencheur, le Spectre la nuit (1h–5h) sans déclencheur, sinon Clopinette. */
export function bossFor(trigger, at = new Date()) {
  const h = at.getHours();
  if (h >= 1 && h < 5 && (!trigger || trigger === "autre" || trigger === "coucher")) return "spectre";
  const id = TRIG_BOSS[trigger];
  if (id && id !== "spectre" && BOSSES[id]) return id;
  const byTrig = Object.entries(BOSSES).find(([, b]) => b.trig && b.trig === trigger);
  return byTrig ? byTrig[0] : "clope";
}

/** Traits de combat : chaque boss a une faiblesse (weak) et une résistance (res). */
export const TRAITS = {
  spot: { v: { weak: 1.2, res: 0.85 }, weak: ["Lent", "Ses cercles arrivent moins vite"], res: ["Vif", "Ses cercles arrivent plus vite"] },
  size: { v: { weak: 1.25, res: 0.8 }, weak: ["Large", "La fenêtre pour le toucher est plus large"], res: ["Fuyant", "La fenêtre pour le toucher est plus étroite"] },
  crit: { v: { weak: 1.5, res: 0.6 }, weak: ["Fragile", "Les gros paliers lui font 50 % de dégâts en plus"], res: ["Blindé", "Les gros paliers lui font 40 % de dégâts en moins"] },
  tempt: { v: { weak: 1.4, res: 0.7 }, weak: ["Patient", "Il glisse moins de cigarettes dans la jauge"], res: ["Insistant", "Il glisse plus de cigarettes dans la jauge"] },
};
/** Multiplicateurs du boss : spot (durée des points), size (zone de toucher), crit (bonus des paliers), tempt (délai des tentations). */
export function traitsOf(id) {
  const t = BOSSES[id]?.traits || {}, out = { spot: 1, size: 1, crit: 1, tempt: 1 };
  if (t.weak) out[t.weak] = TRAITS[t.weak].v.weak;
  if (t.res) out[t.res] = TRAITS[t.res].v.res;
  return out;
}
/** Traits lisibles pour le bestiaire et l'écran de combat. */
export function traitList(id) {
  const t = BOSSES[id]?.traits || {};
  return [t.weak && { weak: true, k: t.weak, n: TRAITS[t.weak].weak[0], d: TRAITS[t.weak].weak[1] }, t.res && { weak: false, k: t.res, n: TRAITS[t.res].res[0], d: TRAITS[t.res].res[1] }].filter(Boolean);
}
