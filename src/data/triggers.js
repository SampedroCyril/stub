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

/**
 * Conseil affiché après une cigarette notée, selon son déclencheur : de quoi mieux se préparer la prochaine fois.
 * Repères : Tabac Info Service, et ce que l'app propose déjà (respiration, sport, combat).
 */
export const TRIG_TIP = {
  cafe: "Change le rituel : une autre tasse, un autre endroit, ou le café après quelques minutes de marche. L'envie liée au café passe en quelques minutes.",
  repas: "En fin de repas, lève-toi tout de suite de table : brosse-toi les dents, fais la vaisselle ou marche cinq minutes.",
  reveil: "Prépare un autre premier geste du matin : un grand verre d'eau, la douche tout de suite, le petit-déjeuner avant tout le reste.",
  pause: "Garde la pause, change ce que tu y fais : marcher, t'étirer, boire de l'eau, ou la prendre avec un collègue qui ne fume pas.",
  trajet: "Occupe tes mains et ta bouche pendant le trajet (chewing-gum, eau, podcast), et enlève paquet et briquet de la voiture ou du sac.",
  attente: "Pour les temps morts, garde de quoi t'occuper à portée de main : un article à lire, un jeu, quelques respirations lentes.",
  ecran: "Fais des pauses loin de l'écran avant que l'envie monte, et garde un verre d'eau à côté de toi.",
  tel: "Pendant les appels, occupe tes mains autrement : marcher, griffonner, tenir un stylo.",
  alcool: "L'alcool affaiblit la volonté. Les premières semaines, réduis-le ou alterne avec des boissons sans alcool, et préviens ceux qui sont avec toi.",
  coucher: "Remplace la dernière cigarette par un rituel calme : une tisane, quelques pages, quelques minutes de respiration lente.",
  stress: "Quand le stress monte, lance la respiration guidée : quelques minutes suffisent souvent à faire redescendre l'envie. La cigarette soulage surtout le manque, pas le stress lui-même.",
  anxiete: "La nicotine soulage le manque, pas l'anxiété. Respiration lente, marche, ou parler à quelqu'un : repère ce qui marche pour toi.",
  colere: "Laisse passer quelques minutes avant d'agir : sors marcher, respire, ou dépense-toi. L'envie retombe avec la colère.",
  frustration: "Fais une vraie coupure de cinq minutes : bouger ou respirer aide à relâcher la tension sans cigarette.",
  ennui: "Prépare une liste de petites choses à faire quand tu t'ennuies : appeler quelqu'un, sortir, ranger, faire un combat dans l'app.",
  tristesse: "Dans les moments tristes, cherche du soutien plutôt qu'une cigarette : un proche, une marche, ou le 39 89. Si la tristesse dure, parles-en à un médecin.",
  solitude: "Appelle ou écris à quelqu'un, même brièvement. Les tabacologues du 39 89 peuvent aussi t'accompagner, gratuitement.",
  joie: "Trouve une autre façon de marquer le coup : un bon repas, une sortie, un cadeau payé avec l'argent que tu ne dépenses plus en tabac.",
  recompense: "Choisis une vraie récompense, sans tabac : regarde ce que tu as déjà économisé et fais-toi plaisir avec.",
  potes: "Dis à tes amis que tu arrêtes et demande-leur de ne pas te proposer de cigarette. Pendant leurs pauses, reste avec ceux qui ne fument pas.",
  fumeur: "Éloigne-toi de la fumée quand c'est possible, et demande qu'on ne fume pas à côté de toi le temps de ton sevrage.",
  soiree: "Pour les prochaines soirées, prépare ta réponse à « t'en veux une ? », reste du côté non-fumeur et surveille l'alcool.",
  collegues: "Sur les pauses entre collègues, propose une petite marche ou un café ailleurs, et dis que tu as arrêté.",
  dispute: "Avant de répondre, ou juste après, prends cinq minutes pour respirer ou marcher : la cigarette ne règle pas le conflit.",
  famille: "Parle de ton arrêt à ta famille et demande-leur un coup de main : ne pas fumer devant toi, ne pas te proposer de cigarette.",
  manque: "Le manque physique se soigne : patchs, gommes ou pastilles de nicotine aident vraiment. Un médecin ou un pharmacien peut t'aider à trouver le bon dosage.",
  fatigue: "Quand la fatigue arrive, bouge un peu, bois de l'eau ou fais une courte sieste plutôt que de chercher un coup de fouet.",
  faim: "Garde des en-cas sains à portée (fruits, légumes croquants, oléagineux) et bois de l'eau.",
  concentration: "Découpe ton travail en courtes sessions avec de vraies pauses. La concentration revient en quelques semaines sans nicotine.",
  habitude: "Repère le moment où le réflexe arrive et prévois un autre geste à la place. Éloigne cigarettes, briquets et cendriers de ta vue.",
};
export const TRIG_TIP_DEFAULT = "Repense à ce qui s'est passé juste avant : repérer le moment aide à mieux s'y préparer la prochaine fois. Si les envies sont fortes, les substituts nicotiniques et le 39 89 peuvent t'aider.";
