/**
 * Santé : symptômes du sevrage et risques de la cigarette, avec leurs sources.
 * Durées des symptômes : MSD Manual (version grand public, « Symptoms of Nicotine Withdrawal »).
 * Explications et conseils : Department of Health australien (« What quitting feels like »), sauf mention.
 */

export const SOURCES = {
  msd: { n: "MSD Manual : symptômes du sevrage nicotinique", u: "https://www.msdmanuals.com/home/multimedia/table/symptoms-of-nicotine-withdrawal" },
  aus: { n: "Department of Health (Australie) : ce que l'on ressent en arrêtant", u: "https://www.health.gov.au/topics/smoking-vaping-and-tobacco/how-to-quit/what-it-feels-like" },
  bmj: { n: "Hackshaw et al., BMJ 2018 : une cigarette par jour", u: "https://www.ucl.ac.uk/medical-sciences/news/2018/jan/one-cigarette-day-increases-cardiovascular-risk" },
  tc: { n: "Bjartveit et Tverdal, Tobacco Control 2005 : 1 à 4 cigarettes par jour", u: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1748107/" },
  spf: { n: "Santé publique France : décès attribuables au tabac", u: "https://www.santepubliquefrance.fr/tabac/article/estimation-du-nombre-de-deces-attribuables-au-tabagisme-en-france-de-2000-a-2015" },
  nhs: { n: "NHS (Northumbria) : bénéfices de l'arrêt dans le temps", u: "https://www.northumbria.nhs.uk/our-services/stop-smoking/new-you/health-benefits" },
  vidal: { n: "Vidal : les bénéfices de l'arrêt du tabac", u: "https://www.vidal.fr/maladies/psychisme/arreter-fumer-cigarette-tabac/benefices.html" },
};

/**
 * Symptômes à cocher. dur : durée habituelle · why : pourquoi ça arrive · tip : que faire · warn : quand consulter.
 * flag : affiche le rappel des signaux d'urgence quand c'est coché.
 */
export const SYMPTOMS = [
  { id: "envie", n: "Envies de fumer", ic: "🚬", dur: "Très fréquentes les 2 à 3 premiers jours, puis elles diminuent", why: "Le cerveau réclame sa nicotine, et les habitudes (café, pause, soirée) rappellent la cigarette.", tip: "Une envie ne dure que quelques minutes : respire, bouge, ou lance un combat.", src: "msd" },
  { id: "irrit", n: "Irritabilité, nervosité", ic: "😤", dur: "2 à 4 semaines", why: "C'est l'un des signes les plus courants du manque de nicotine.", tip: "Préviens ton entourage, et garde la respiration à portée de main.", src: "msd" },
  { id: "moral", n: "Moral en baisse", ic: "🌧️", dur: "1 à 2 semaines", why: "Tristesse, impression de perte : arrêter, c'est aussi quitter une habitude qui comptait.", warn: "Si c'est intense ou que ça ne passe pas, parles-en à un médecin. Idées noires : appelle le 3114, jour et nuit.", src: "aus" },
  { id: "concentr", n: "Difficulté à se concentrer", ic: "🌀", dur: "Quelques semaines", why: "Le cerveau se réhabitue à fonctionner sans nicotine.", tip: "Découpe les tâches et fais des pauses qui ne sont pas des pauses cigarette.", src: "msd" },
  { id: "faim", n: "Faim, grignotage", ic: "🍪", dur: "Jusqu'à plusieurs semaines", why: "On mange parfois à la place de fumer, et la nourriture a plus de goût et d'odeur.", tip: "Prévois de quoi grignoter léger, et bois de l'eau.", src: "aus" },
  { id: "sommeil", n: "Mal dormir", ic: "🌙", dur: "Environ une semaine", why: "Le sommeil se réorganise sans nicotine.", tip: "Évite le café en fin de journée.", src: "msd" },
  { id: "fatigue", n: "Fatigue", ic: "🥱", dur: "2 à 4 jours", why: "Le corps s'adapte à l'absence de nicotine, qui est un stimulant.", src: "msd" },
  { id: "vertige", n: "Vertiges, tête qui tourne", ic: "💫", dur: "1 à 2 jours", why: "Ton corps reçoit plus d'oxygène qu'avant.", tip: "Assieds-toi le temps que ça passe.", src: "aus" },
  { id: "tete", n: "Mal de tête", ic: "🤕", dur: "Plutôt au début du sevrage", why: "Courant pendant les premiers jours sans nicotine.", warn: "Un mal de tête violent, brutal ou inhabituel n'est pas à mettre sur le compte du sevrage : consulte.", src: null },
  { id: "nausee", n: "Nausées", ic: "🤢", dur: "Plutôt au début", why: "Le système digestif se réadapte.", warn: "Si tu prends des substituts nicotiniques, des nausées peuvent venir d'une dose trop forte : demande à un pharmacien.", src: null },
  { id: "toux", n: "Toux, gorge sèche", ic: "😮‍💨", dur: "Quelques jours", why: "Les poumons se remettent à évacuer le mucus et les résidus de fumée.", warn: "Si la toux dure plus de 3 semaines ou que tu craches du sang, consulte.", src: "msd" },
  { id: "transit", n: "Constipation, ballonnements", ic: "🫃", dur: "1 à 2 semaines", why: "La nicotine accélérait le transit ; il retrouve son rythme.", tip: "Bois de l'eau, mange des fibres, marche.", src: "msd" },
  { id: "souffle", n: "Souffle court", ic: "🫁", dur: "Le souffle s'améliore en général dès les premiers jours", why: "Une gêne peut venir du stress du sevrage.", flag: true, src: null },
  { id: "poumons", n: "Gêne dans les poumons, poitrine serrée", ic: "🫀", dur: "Poitrine serrée : quelques jours", why: "Une légère oppression peut accompagner les premiers jours.", flag: true, src: "msd" },
];
export const SYMPTOM = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s]));

/** Signaux d'urgence : ce n'est pas le sevrage, on appelle. */
export const RED_FLAGS = [
  "Une douleur dans la poitrine qui serre, ou qui part dans le bras, la mâchoire ou le dos",
  "Un essoufflement brutal, ou au repos",
  "Cracher du sang",
];

/** Ce que fait la cigarette, même à petite dose. */
export const RISKS = {
  oneADay: {
    t: "Une seule cigarette par jour, ce n'est pas un peu de risque",
    d: "Fumer 1 cigarette par jour garde une grosse part du surrisque d'un paquet par jour.",
    rows: [
      { n: "Maladie cardiaque, hommes", v: 46 },
      { n: "Maladie cardiaque, femmes", v: 31 },
      { n: "AVC, hommes", v: 41 },
      { n: "AVC, femmes", v: 34 },
    ],
    note: "Part du surrisque d'un fumeur de 20 cigarettes par jour, déjà présente à 1 cigarette par jour. Réduire ne suffit pas : il n'y a pas de dose sans danger.",
    src: "bmj",
  },
  light: {
    t: "1 à 4 cigarettes par jour",
    rows: [
      { n: "Mourir d'une maladie cardiaque", m: "× 2,7", f: "× 2,9" },
      { n: "Mourir d'un cancer du poumon", m: "× 2,8 *", f: "× 5" },
      { n: "Mourir, toutes causes confondues", m: "+ 57 %", f: "+ 47 %" },
    ],
    note: "Comparé à des personnes qui n'ont jamais fumé (étude norvégienne sur près de 43 000 adultes de 35 à 49 ans, suivis du milieu des années 1970 jusqu'en 2002). * Chez les hommes, l'écart sur le cancer du poumon n'est pas statistiquement certain.",
    src: "tc",
  },
  france: { t: "En France", d: "Plus de 75 000 décès par an sont attribuables au tabac, environ 13 % des décès.", note: "Estimation pour 2015.", src: "spf" },
};
