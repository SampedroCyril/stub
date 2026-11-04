/**
 * Boss d'envie : un par déclencheur, plus un sbire quand aucun déclencheur n'est choisi.
 * Ton volontairement décalé : le boss se moque de toi, tu lui réponds en le démolissant.
 * mods : multiplicateurs de dégâts par attaque (1,5 = faiblesse, 0,5 = résistance).
 */
export const BOSSES = {
  cafe: {
    n: "Le Café Maudit", sprite: "cafe", trig: "cafe",
    mods: { breath: 1.5, game: 0.5 },
    taunts: ["Un petit café sans clope ? Sois pas ridicule.", "Je suis noir, amer, et je te manque.", "Le combo café-clope, c'est sacré, non ?"],
    death: "Le Café Maudit refroidit. Pour toujours.",
  },
  spectre: {
    n: "Le Spectre de 2h du mat'", sprite: "spectre", trig: null,
    mods: { breath: 1.5, circuit: 0.5 },
    taunts: ["Tout le monde dort… personne ne verra rien.", "Une petite dernière avant de dormir ?", "Bouh. Tu peux pas dormir, hein ?"],
    death: "Le Spectre retourne hanter quelqu'un d'autre.",
  },
  ennui: {
    n: "L'Ennui Éternel", sprite: "ennui", trig: "ennui",
    mods: { game: 1.5, breath: 0.5 },
    taunts: ["Baaah… Rien à faire… Une clope, au moins ?", "Tu t'ennuies ? Moi, j'ai une idée…", "Zzz… Allume-en une, ça passera le temps."],
    death: "L'Ennui s'est ennuyé de perdre. Il part.",
  },
  repas: {
    n: "Le Repas Traître", sprite: "repas", trig: "repas",
    mods: { circuit: 1.5, game: 0.5 },
    taunts: ["Le dessert, c'est la clope. Tout le monde sait ça.", "Bien mangé ? Il manque juste un truc…", "Je suis le digestif que tu mérites."],
    death: "Le Repas Traître est digéré. Bon appétit.",
  },
  stress: {
    n: "Le Démon du Stress", sprite: "stress", trig: "stress",
    mods: { breath: 1.5, game: 0.5 },
    taunts: ["Respire ? Non. FUME.", "T'es tendu, là. Une seule, pour te calmer…", "Je te lâche pas tant que t'en as pas allumé une."],
    death: "Le Démon du Stress se dégonfle comme un ballon.",
  },
  alcool: {
    n: "La Pinte Perfide", sprite: "alcool", trig: "alcool",
    mods: { circuit: 1.5, breath: 0.5 },
    taunts: ["Une bière sans clope, c'est comme une soirée sans musique.", "Allez, c'est la fête ! Juste ce soir…", "Santé ! Enfin… façon de parler."],
    death: "La Pinte Perfide est vidée. Cul sec.",
  },
  ecran: {
    n: "Le Glitch", sprite: "ecran", trig: "ecran",
    mods: { circuit: 1.5, game: 0.5 },
    taunts: ["Pause clope entre deux parties ? Classique.", "ERREUR 404 : volonté introuvable.", "Je mets le jeu en pause, toi tu sors fumer."],
    death: "Le Glitch a été patché.",
  },
  reveil: {
    n: "Le Réveil Grognon", sprite: "reveil", trig: "reveil",
    mods: { circuit: 1.5, breath: 0.5 },
    taunts: ["DRIIING ! La clope du matin, c'est la meilleure !", "Debout ! Café, clope, et c'est parti.", "Tu commences pas la journée sans moi, si ?"],
    death: "Le Réveil Grognon est en mode silencieux.",
  },
  potes: {
    n: "Le Paquet Copain", sprite: "potes", trig: "potes",
    mods: { game: 1.5, circuit: 0.5 },
    taunts: ["T'en veux une ? Allez, une seule, ça compte pas.", "Tout le monde fume, là. Tu vas pas rester tout seul ?", "Fais pas ton relou, prends-en une."],
    death: "Le Paquet Copain est jeté. Même pas recyclé.",
  },
  fatigue: {
    n: "Le Zombie Pâteux", sprite: "fatigue", trig: "fatigue",
    mods: { circuit: 1.5, breath: 0.5 },
    taunts: ["Brrraaains… Euh… Clooope…", "T'es crevé ? Une clope, ça réveille.", "Ta volonté est fatiguée, elle aussi."],
    death: "Le Zombie Pâteux est enfin allé se coucher.",
  },
  clope: {
    n: "Clopinette", sprite: "clope", trig: null,
    mods: {},
    taunts: ["Coucou ! C'est moi, ta vieille copine.", "Rien qu'une taffe. Juste une.", "Tu me reconnais ? On a vécu des trucs ensemble."],
    death: "Clopinette est écrasée. Bien fait.",
  },
};

/** Boss d'une envie : selon le déclencheur, le Spectre la nuit (1h–5h) sans déclencheur, sinon Clopinette. */
export function bossFor(trigger, at = new Date()) {
  const byTrig = Object.entries(BOSSES).find(([, b]) => b.trig && b.trig === trigger);
  if (byTrig) return byTrig[0];
  const h = at.getHours();
  if (!trigger || trigger === "autre") return h >= 1 && h < 5 ? "spectre" : "clope";
  return "clope";
}

export const ATTACK_NAME = { circuit: "Circuit", breath: "Respirer", game: "Blocs" };

/** Faiblesses et résistances lisibles : [{src, x, weak}] */
export const modsOf = (id) => Object.entries(BOSSES[id]?.mods || {}).map(([src, x]) => ({ src, x, weak: x > 1 }));
