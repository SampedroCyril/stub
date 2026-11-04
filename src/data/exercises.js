/**
 * d    = difficulté de 1 à 5. XP = reps × d, ou secondes × d ÷ 3.
 * side = la quantité affichée est par côté ; l'exo est fait des deux → XP × 2.
 * lv   = niveau sport requis pour débloquer l'exo.
 * cam  = placement conseillé si le coach caméra sait compter cet exo.
 */
export const EX = {
  squats: { n: "Squats", t: "renfo", cat: "squats", fig: "squat", d: 1, base: 20, u: "reps", lv: 1, cam: "profil", desc: "Pieds largeur d'épaules. Descends en poussant les fesses en arrière, cuisses parallèles au sol, puis remonte en poussant dans les talons.", cue: "Dos droit, genoux dans l'axe des pieds." },
  squats_lents: { n: "Squats lents", t: "renfo", cat: "squats", fig: "squatSlow", d: 2, base: 15, u: "reps", lv: 1, cam: "profil", desc: "Le même squat avec 3 secondes de descente et 1 seconde de montée. Le tempo fait travailler plus que le nombre.", cue: "Compte dans ta tête, ne triche pas sur la descente." },
  squats_sautes: { n: "Squats sautés", t: "renfo", cat: "squats", fig: "jumpSquat", d: 3, base: 12, u: "reps", lv: 2, cam: "profil", desc: "Descends en squat puis pousse fort pour décoller. Réceptionne-toi en douceur directement dans le squat suivant.", cue: "Atterris sur l'avant du pied, genoux souples." },
  fentes: { n: "Fentes", t: "renfo", cat: "fentes", fig: "lunge", d: 2, base: 10, u: "reps", lv: 1, side: "par jambe", cam: "profil", desc: "Grand pas en avant, descends jusqu'à ce que le genou arrière frôle le sol. Repousse pour revenir et change de jambe.", cue: "Genou avant au-dessus de la cheville, buste droit." },
  fentes_sautees: { n: "Fentes sautées", t: "renfo", cat: "fentes", fig: "jumpLunge", d: 4, base: 8, u: "reps", lv: 3, side: "par jambe", cam: "profil", desc: "Depuis la position de fente, saute et inverse les jambes en l'air pour retomber en fente de l'autre côté.", cue: "Buste droit, réception contrôlée." },
  pompes: { n: "Pompes", t: "renfo", cat: "pompes", fig: "push", d: 2, base: 12, u: "reps", lv: 1, cam: "profil", desc: "Mains un peu plus larges que les épaules, corps gainé de la tête aux pieds. Descends la poitrine près du sol, puis pousse.", cue: "Ni fesses en l'air ni dos creusé. Trop dur : sur les genoux." },
  pompes_serrees: { n: "Pompes mains serrées", t: "renfo", cat: "pompes", fig: "pushClose", d: 3, base: 10, u: "reps", lv: 2, cam: "profil", desc: "Mains sous la poitrine, presque collées. Les coudes restent le long du corps pendant la descente. Cible les triceps.", cue: "Coudes vers l'arrière, pas sur les côtés." },
  pompes_declinees: { n: "Pompes déclinées", t: "renfo", cat: "pompes", fig: "decline", d: 3, base: 10, u: "reps", lv: 3, cam: "profil", desc: "Pieds posés sur une chaise, mains au sol. Le haut des pectoraux et les épaules prennent plus.", cue: "Corps aligné, chaise calée contre un mur." },
  pompes_piquees: { n: "Pompes piquées", t: "renfo", cat: "pompes", fig: "pike", d: 4, base: 8, u: "reps", lv: 4, cam: "profil", desc: "Bassin haut, corps en V inversé. Plie les coudes pour amener la tête vers le sol entre tes mains, puis pousse. Le meilleur exo épaules sans matériel.", cue: "Le bassin reste haut tout le long." },
  planche_epaules: { n: "Planche toucher d'épaules", t: "renfo", cat: "gainage", fig: "taps", d: 2, base: 16, u: "reps", lv: 1, desc: "En haut d'une pompe, touche l'épaule opposée avec une main, repose-la, puis change. Une touche compte pour une rep.", cue: "Pieds un peu écartés, le bassin ne tangue pas." },
  dips: { n: "Dips sur chaise", t: "renfo", cat: "bras", fig: "dips", d: 2, base: 12, u: "reps", lv: 1, cam: "profil", desc: "Dos à une chaise, mains sur le bord du siège, jambes fléchies devant toi. Plie les coudes vers l'arrière jusqu'à 90°, puis remonte.", cue: "Chaise calée contre un mur pour qu'elle ne glisse pas." },
  gainage: { n: "Gainage planche", t: "renfo", cat: "gainage", fig: "plank", d: 2, base: 40, u: "s", lv: 1, cam: "profil", desc: "Sur les avant-bras, coudes sous les épaules, corps aligné des talons à la tête. Tiens sans bouger.", cue: "Serre fessiers et abdos, continue de respirer." },
  gainage_lateral: { n: "Gainage latéral", t: "renfo", cat: "gainage", fig: "side", d: 2, base: 25, u: "s", lv: 2, side: "par côté", cam: "face", desc: "Sur un avant-bras, pieds empilés, bassin levé pour former une ligne droite. Tiens, puis change de côté.", cue: "Coude sous l'épaule, le bassin ne s'affaisse pas." },
  chaise: { n: "Chaise contre le mur", t: "renfo", cat: "jambes", fig: "wall", d: 2, base: 45, u: "s", lv: 1, cam: "profil", desc: "Dos plaqué au mur, cuisses parallèles au sol, genoux à 90°. Tiens la position.", cue: "Ça brûle vite, c'est normal. Mains sur les cuisses sans appuyer." },
  pont: { n: "Pont fessier", t: "renfo", cat: "jambes", fig: "bridge", d: 1, base: 20, u: "reps", lv: 1, cam: "profil", desc: "Allongé sur le dos, genoux pliés, pieds à plat. Monte le bassin jusqu'à aligner genoux, hanches et épaules, serre les fessiers, redescends.", cue: "Pousse dans les talons." },
  superman: { n: "Superman", t: "renfo", cat: "dos", fig: "superman", d: 1, base: 15, u: "reps", lv: 1, desc: "Allongé sur le ventre, bras tendus devant. Décolle en même temps bras, buste et jambes, tiens une seconde, redescends.", cue: "Regarde le sol, ne casse pas la nuque." },
  releves: { n: "Relevés de jambes", t: "renfo", cat: "abdos", fig: "legRaise", d: 2, base: 12, u: "reps", lv: 1, cam: "profil", desc: "Allongé sur le dos, mains sous les fesses. Monte les jambes tendues à la verticale, redescends lentement sans toucher le sol.", cue: "Le bas du dos reste collé au sol." },
  mollets: { n: "Mollets debout", t: "renfo", cat: "jambes", fig: "calf", d: 1, base: 25, u: "reps", lv: 1, desc: "Debout, monte sur la pointe des pieds le plus haut possible, tiens une seconde, redescends lentement.", cue: "Sur une marche, l'amplitude est meilleure." },
  jacks: { n: "Jumping jacks", t: "cardio", cat: "cardio", fig: "jacks", d: 1, base: 30, u: "s", lv: 1, cam: "face", desc: "Saute en écartant jambes et bras au-dessus de la tête, puis reviens pieds joints, bras le long du corps.", cue: "Rythme régulier, atterris sur l'avant du pied." },
  genoux: { n: "Montées de genoux", t: "cardio", cat: "cardio", fig: "knees", d: 2, base: 30, u: "s", lv: 1, cam: "profil", desc: "Course sur place en montant les genoux à hauteur des hanches, les bras accompagnent.", cue: "Buste droit, reste léger sur les pieds." },
  talons: { n: "Talons-fesses", t: "cardio", cat: "cardio", fig: "kicks", d: 1, base: 30, u: "s", lv: 1, cam: "profil", desc: "Course sur place en ramenant les talons vers les fesses à chaque foulée.", cue: "Genoux qui pointent vers le sol, rythme rapide." },
  boxe: { n: "Shadow boxing", t: "cardio", cat: "cardio", fig: "box", d: 1, base: 40, u: "s", lv: 1, desc: "En garde, pieds décalés, enchaîne directs et crochets dans le vide en restant mobile sur les appuis.", cue: "Ramène toujours la main à la garde." },
  climbers: { n: "Mountain climbers", t: "cardio", cat: "cardio", fig: "climb", d: 3, base: 20, u: "s", lv: 1, cam: "profil", desc: "En position de pompe bras tendus, ramène un genou vers la poitrine puis l'autre, en alternance rapide.", cue: "Hanches basses, épaules au-dessus des mains." },
  skaters: { n: "Patineur", t: "cardio", cat: "cardio", fig: "skate", d: 2, base: 30, u: "s", lv: 2, desc: "Saute latéralement d'une jambe sur l'autre, la jambe libre passe derrière, comme un patineur de vitesse.", cue: "Réception amortie, buste légèrement penché." },
  burpees: { n: "Burpees", t: "cardio", cat: "burpees", fig: "burpee", d: 4, base: 6, u: "reps", lv: 4, cam: "profil", desc: "Accroupi, mains au sol, jambes en arrière en planche, retour accroupi, puis saut bras en l'air.", cue: "La forme avant la vitesse." },
};

export const RENFO = Object.keys(EX).filter((k) => EX[k].t === "renfo");
export const CARDIO = Object.keys(EX).filter((k) => EX[k].t === "cardio");

export const sides = (e) => (EX[e] && EX[e].side ? 2 : 1);

/** XP d'un exo pour une quantité affichée (par côté si `side`). */
export const xpOf = (e, n) => {
  const x = EX[e];
  if (!x) return 0;
  return Math.round((x.u === "s" ? (n * x.d) / 3 : n * x.d) * sides(e));
};

export const fmtAmt = (e, n) => (EX[e].u === "s" ? `${n} s` : `× ${n}`);
export const circuitXp = (ev) => (ev.items || []).reduce((a, it) => a + xpOf(it.e, it.n), 0);
