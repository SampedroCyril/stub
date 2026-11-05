/**
 * Déclencheurs d'une envie ou d'une cigarette, rangés par catégorie.
 * [id, nom, boss] : le boss qui apparaît pour une envie avec ce déclencheur (voir bosses.js).
 * Les anciens identifiants (cafe, repas, stress…) sont gardés pour l'historique.
 */
export const TRIG_CATS = [
  { id: "situation", n: "Situation", items: [
    ["cafe", "Café", "cafe"], ["repas", "Après manger", "repas"], ["reveil", "Réveil", "reveil"], ["pause", "Pause au travail", "cafe"],
    ["trajet", "En voiture, en trajet", "clope"], ["attente", "En attendant", "ennui"], ["ecran", "Écran, jeu", "ecran"],
    ["tel", "Au téléphone", "ecran"], ["alcool", "Alcool, apéro", "alcool"], ["coucher", "Avant de dormir", "spectre"],
  ] },
  { id: "emotion", n: "Émotion", items: [
    ["stress", "Stress", "stress"], ["anxiete", "Anxiété", "stress"], ["colere", "Colère, énervement", "stress"], ["frustration", "Frustration", "stress"],
    ["ennui", "Ennui", "ennui"], ["tristesse", "Tristesse", "ennui"], ["solitude", "Solitude", "ennui"],
    ["joie", "Joie, envie de fêter", "alcool"], ["recompense", "Récompense, « je l'ai mérité »", "repas"],
  ] },
  { id: "social", n: "Entourage", items: [
    ["potes", "Entre potes", "potes"], ["fumeur", "Quelqu'un fume à côté", "potes"], ["soiree", "Soirée", "potes"],
    ["collegues", "Collègues", "potes"], ["dispute", "Dispute", "stress"], ["famille", "En famille", "repas"],
  ] },
  { id: "corps", n: "Corps", items: [
    ["manque", "Manque, besoin physique", "clope"], ["fatigue", "Fatigue", "fatigue"], ["faim", "Faim", "repas"],
    ["concentration", "Besoin de me concentrer", "ecran"], ["habitude", "Réflexe, sans y penser", "clope"],
  ] },
];
export const TRIG_OTHER = ["autre", "Autre", "clope"];

const ALL = [...TRIG_CATS.flatMap((c) => c.items.map((it) => [...it, c.id])), [...TRIG_OTHER, "autre"]];
/** Liste à plat [id, nom] (compatibilité avec l'ancien format). */
export const TRIGGERS = ALL.map(([id, n]) => [id, n]);
export const TRIG_NAME = Object.fromEntries(ALL.map(([id, n]) => [id, n]));
export const TRIG_BOSS = Object.fromEntries(ALL.map(([id, , b]) => [id, b]));
export const TRIG_CAT = Object.fromEntries(ALL.map(([id, , , c]) => [id, c]));
export const CAT_NAME = Object.fromEntries([...TRIG_CATS.map((c) => [c.id, c.n]), ["autre", "Autre"]]);
