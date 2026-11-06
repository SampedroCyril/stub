# Stub

App web pour arrêter de fumer, gamifiée : chaque envie de fumer se tient au combat (un boss en pixel art à abattre au clicker), en respirant ou en bougeant. Deux progressions séparées (sevrage et sport), des défis hebdo, des badges à paliers, le suivi des bénéfices santé, et un **coach caméra** qui compte tes répétitions et vérifie ta forme.

Tout tourne dans le navigateur : pas de compte, pas de serveur, la vidéo ne quitte jamais l'appareil.

## Fonctionnalités

Navigation en 6 sections (barre du bas) : **Accueil**, **Sevrage** (envies, respirer), **Santé** (récupération, symptômes, la cigarette), **Sport** (circuit, records, exos), **Joueur** (talents, boutique, arcade, boss) et **Progrès** (défis, badges, stats). Santé, Sport, Joueur et Progrès peuvent être masqués : l'app ne montre que ce qui te parle.

Quand on note une envie, sa force se règle sur une jauge de 1 à 10 (les envies notées avant sur 5 comptent double dans les stats) ; elle règle les PV du boss. Un combat quitté en cours de route reste ouvert : quelques secondes plus tard, l'app demande s'il faut l'annuler.

**Une cigarette fumée** se note dans Sevrage (« J'ai fumé une cigarette »), avec son déclencheur si on veut : la série et les caps santé repartent de zéro, le multiplicateur garde la moitié de son bonus ; l'XP, le niveau et les badges sont gardés. L'app affiche ensuite un bilan sans jugement, un conseil adapté au déclencheur et le bonus de rebond à aller chercher. Une cigarette notée par erreur s'annule dans le quart d'heure. Les économies (Santé, La cigarette) se calculent depuis le début du suivi, cigarettes fumées déduites.

**Déclencheurs** (envies et cigarettes) rangés en quatre catégories : Situation, Émotion, Entourage, Corps, plus « Autre ». Chaque déclencheur amène son boss.

Chaque catégorie a ses réglages derrière la roue crantée de son en-tête (Sevrage : dernière cigarette ; Sport : coach caméra ; Joueur : bruitages, jauge, effets intenses). La roue crantée de l'Accueil ouvre les réglages généraux : sections affichées, installation, données, aide.

L'Accueil ne garde que l'essentiel : depuis quand, le bouton « J'ai envie de fumer », envies tenues, cigarettes évitées et euros économisés, le niveau de chaque catégorie affichée et le prochain cap santé.

**Santé** : la frise de récupération (sources Vidal et NHS) ; le suivi des symptômes du sevrage (on coche ce qu'on ressent, une courbe sur 14 jours, la durée habituelle de chaque symptôme et quand consulter, d'après le MSD Manual et le ministère australien de la Santé ; signaux d'urgence et 15, Tabac Info Service 39 89, 3114) ; « La cigarette » : ce que représente sa consommation (semaine, mois, an, euros) et les risques même à petite dose (Hackshaw et al., BMJ 2018 ; Bjartveit et Tverdal, Tobacco Control 2005 ; Santé publique France).

Aucune animation ne tourne pour rien : les boucles de dessin ne vivent que pendant un combat ou une scène, le cendrier de victoire s'arrête une fois la cigarette éteinte, et le réglage « réduire les animations » du téléphone est respecté partout.

| Écran | Contenu |
|---|---|
| Accueil | Temps sans cigarette, niveaux sevrage et sport, prochain cap santé, défis de la semaine, meilleurs badges |
| Sevrage | Noter une envie (intensité 1-5, déclencheur), la tenir au sport, en respirant ou sans rien. Bouton « J'ai fumé » protégé par une confirmation |
| Circuit | Rotation renfo + cardio adaptée au niveau, coach caméra par exercice |
| Respirer | Cohérence cardiaque, expiration longue, respiration carrée, de 1 à 5 min |
| Santé | 10 caps (20 min → 15 ans) datés depuis la dernière nicotine |
| Défis | 3 défis tirés chaque lundi, +80 XP chacun, historique et récap par semaine |
| Badges | 17 badges, 7 à 9 paliers chacun, avec date d'obtention |
| Stats | Intensité sur 14 jours, déclencheurs, heures critiques, sport, journal |
| Réglages | Installation, export/import des données, date de la dernière cigarette, coach caméra, aide |
| Exos | 25 exercices illustrés, difficulté, XP, compatibilité caméra |

Le récap de la semaine s'ouvre tout seul le dimanche à partir de 18h (ou à la prochaine ouverture si tu l'as raté).

## Le jeu (0.4.1)

- **Trois façons de tenir une envie** : **Combat** (le boss de l'envie, en clicker), **Respirer** (le cercle guidé, au moins une minute) ou **Bouger** (un circuit). Les trois écrasent la cigarette au cendrier et rapportent de l'XP sevrage.
- **Boss d'envie** : un par déclencheur (Le Café Maudit, Le Repas Traître, La Pinte Perfide, Le Glitch…, le Spectre de 2h du mat' la nuit, Clopinette sinon). Chacun a un trait faible et un trait fort (points faibles plus lents ou plus vifs, plus ou moins faciles à toucher, sensible ou blindé aux gros paliers, tentations plus ou moins fréquentes), révélés après la première victoire.
- **Combat en rythme, plein écran** : sous le boss, une jauge ; deux cercles partent des bords et se rejoignent au centre. Touche l'écran (n'importe où) quand ils y sont : parfait ou bon, le combo monte ; trop tôt, trop tard ou pas du tout, il retombe à zéro. Les cercles vont de plus en plus vite avec le combo.
- **Pause et sortie** : en haut à gauche, la flèche retour (pause puis confirmation : le boss attend ton retour, le score d'Arcade est gardé) ; en haut à droite, la pause. L'appli passée en arrière-plan se met en pause. La pause fige tout le combat (PV, chrono, barre de temps de l'Arcade) ; « Fausse alerte » est dans le menu pause.
- **Neuf paliers d'impact** : coup, coup sûr, coup net, *Éclat d'or*, *Frappe du Vide*, *Éclipse* (le seul en rouge et noir), deux paliers d'ultime, *Éveil*. Les paliers 3 à 9 tombent à des combos précis, plus espacés pour les grosses envies ; l'Éveil double les dégâts jusqu'au prochain raté. Les gros titres s'affichent en Chakra Petch, aux couleurs de chaque effet.
- **Durée** : PV calibrés par simulation pour qu'un bon joueur gagne en 1 min (envie à 1) à 3 min (envie à 5). Pas d'épuisement : seuls tes coups font tomber le boss, et il t'attend si tu quittes le combat. On ne perd qu'en déclarant une rechute.
- **Jauge à thèmes** : Néon fluide, Katana ou Arcade LED, au choix dans les réglages (aperçu animé). Parfait (±90 ms), bien (±210 ms), 40 ms de retard pardonnés. Cinq parfaits d'affilée : une série, avec un coup bonus.
- **Tentation** : de temps en temps, ce sont deux cigarettes qui glissent dans la jauge. Ne touche pas : elles s'écrasent au centre et le boss perd 3 % de PV, combo intact. Toucher, c'est la prendre : il se soigne de 8 % et le combo casse.
- **Rang** : S (dans le temps visé avec un beau combo), A (moins de 1,5 × le temps visé), B (moins de 3 ×), C (au-delà).
- **Niveau joueur et talents** : chaque combat rapporte de l'XP joueur (victoire, combo max, rang), l'Arcade aussi (plafonnée par jour). Un point par niveau dans un arbre en constellation, qui tient en entier sur l'écran : une bulle s'apprend dès qu'elle touche une bulle acquise, les chemins se croisent ; on touche une bulle pour lire sa fiche juste dessous (flèches pour passer à la suivante), et un filtre met une branche en avant. *Puissance* (dégâts, paliers plus tôt, refus cinglant, coup de grâce), *Technique* (fenêtres plus larges, notes plus lentes, ratés pardonnés), *Paliers* (Éclipse, deux paliers d'ultime, Éveil, Éveil prolongé) et trois ponts (Brûlure, Concentration, Série dorée). L'arbre ne change que la façon de jouer. Réinitialisable.
- **Boutique et Arsenal** : la monnaie, ce sont les mégots, gagnés en tenant le sevrage (10 par envie tenue, 5 de plus au rang S, 15 par journée entière sans fumer, et un peu d'Arcade, 10 par jour au plus). On y achète des ultimes (*Courroux Céleste*, *Dernier Trait*, *Erreur Fatale*, *Chute d'Astre*, *Mille Entailles*), des K.O. (*Fin du Chapitre*, *Fin de Transmission*, *Talon de Fer*, *Bouquet Final*, *Zéro Absolu*) et des signatures de coups (*Poing de Braise*, *Sumi-e*, *Nuit Néon*, *Sakura*, *Jackpot*, *Prisme*), avec un aperçu sur le boss. Sept pièces ne s'achètent pas et se gagnent par exploit (dont deux cendriers et une aura, plus bas) : *Cendres au Vent* (7 jours d'affilée), *Aller Simple* (rang S contre les 11 boss), *Singularité* (un Boss Run complet), *Kaboom* (50 envies tenues). Offerts d'office : *Brise-Monde*, *Soleil Déchu*, *Dernière Lame*, *Étincelles*. Et des cendriers pour la victoire : *Bleu* (offert), *Verre*, *Obsidienne*, *Néon*, et deux par exploit, *Pot de fleur* (14 jours d'affilée) et *Trophée* (30 jours d'affilée). Des auras d'Éveil, qui épousent la silhouette du boss : *Rage* (offerte), *Vortex*, *Flamme*, *Électrique*, *Givre*, *Ombre*, et *Halo* par exploit (25 boss vaincus au rang S). Des compteurs de combo, tous à la même taille et à la même place : *Classique* (offert), *Borne d'arcade*, *LCD*, *Néon*, *Manga*, *En feu*. Dans l'Arsenal, on équipe son ultime, son K.O., sa signature, son cendrier, son aura et son compteur, ou « au hasard parmi les miens ».
- **Arcade** : Entraînement (30 s), Sans fin (trois vies, ça accélère), Boss Run (les 11 boss à la suite, chrono), chacun avec son record. Rien n'y touche aux envies.
- **Victoire** : la cigarette de l'envie s'écrase dans le cendrier, crache sa braise et s'éteint. Le bocal de l'accueil compte toutes les cigarettes écrasées.
- **Records caméra** : pompes en 1 min, squats en 30 s, jumping jacks en 1 min, dips en 45 s, planche et chaise le plus longtemps possible, comptés par le coach.

Rendu en canvas (`src/game/gfx/`) : boss dessinés par code (`bossArt.js`), ombrés et contourés automatiquement, avec leurs états (respiration, clignement, parole, grimace, fissures selon les PV, colère). La scène (`BossStage.js`) gère les neuf paliers, l'Éveil et un calque plein écran pour les impacts ; les effets de la boutique sont dans `fxPack.js`, la boutique elle-même (monnaie, exploits, Arsenal) dans `src/game/shop.js`. Bruitages synthétisés et précalculés (`sfx.js`), sans fichier son. Option « Effets intenses » dans les réglages pour couper flashs et inversions.

## Barème

- **Sevrage** (jamais perdu) : +100 par jour complet sans fumer ; par envie tenue +20 au combat (+10 / +5 au rang S / A), +20 en respirant, +25 au sport ; +80 par défi sevrage. **Multiplicateur d'XP** (commun à sevrage, sport et joueur, pas aux mégots) : il suit les caps de récupération de la Santé, × 1,05 à 20 min, × 1,1 à 8 h, × 1,2 à 2 jours, × 1,3 à 3 jours, × 1,5 à 3 semaines, × 1,75 à 3 mois, × 2 à 9 mois, × 2,5 à 1 an, × 4 à 10 ans, × 5 à 15 ans. Une cigarette relance les caps, mais le multiplicateur garde au moins la moitié de son bonus (× 1,50 devient × 1,25) jusqu'à ce que les caps le dépassent. **Rebond** : +100 (× multiplicateur) pour la première journée complète sans fumer après une cigarette, avec un badge. L'XP et le niveau ne sont jamais perdus.
- **Sport** (définitif) : reps × difficulté, ou secondes × difficulté ÷ 3, × 2 pour les exos « par côté », +80 par défi sport.
- **Joueur** (définitif) : +20 par boss vaincu, +1 par point de combo max (60 au plus), +30 / +15 / +5 au rang S / A / B ; Arcade : 1 XP pour 50 points, 120 par jour au plus.
- **Mégots** (monnaie de la boutique, jamais perdus) : +10 par envie tenue, +5 au rang S, +15 par journée entière sans fumer ; Arcade : 1 mégot pour 12 XP, 10 par jour au plus.
- **Niveaux** : sevrage sur 999 niveaux, le niveau L demande `100 + 2 × (L-1)^1,2` XP (100 au début, environ 600 au niveau 100, 8 000 au niveau 998) ; sans fumer, compter un mois pour le niveau 35, un an pour le niveau 145, environ 26 ans pour le 999 (un siècle sans multiplicateur). Sport et joueur : seuil cumulé `K × (L-1) × L`, K = 60 (sport) et 50 (joueur).

## Coach caméra

Détection de posture avec [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) (33 points du corps), dans le navigateur, sur GPU si possible.

- **Reps** : un angle articulaire suivi dans le temps (genou pour les squats, coude pour les pompes et les dips, hanche pour le pont et les relevés…), lissé, avec hystérésis et un cycle repos → effort → repos. Le compteur s'arme en position de repos pour ne pas compter de demi-rep au démarrage.
- **Forme** : demi-reps signalées et non comptées, bassin trop haut ou trop bas en pompe et en gainage, descente trop rapide aux squats lents, buste trop penché…
- **Exos chronométrés** : le gainage et la chaise ne comptent que le temps tenu dans la bonne position ; le cardio ne compte que le temps où tu bouges vraiment.
- 20 exos sur 25 sont pris en charge (pas encore : planche toucher d'épaules, superman, mollets, shadow boxing, patineur).
- Placement : téléphone posé au sol à 2-3 m, de profil (ou de face pour les jumping jacks et le gainage latéral), corps entier dans le cadre.

La logique de comptage est un module pur (`src/pose/counters.js`) testé sur des trajectoires synthétiques générées à partir des poses des illustrations (`tests/counters.test.js`).

## Données

Stockées dans le `localStorage` du navigateur. Onglet **Réglages → Mes données** :
- **Exporter** un fichier JSON (sauvegarde ou changement d'appareil) ;
- **Importer** un fichier ou coller le JSON exporté depuis la première version (fusion sans doublons, ou remplacement).

## Développement

```bash
npm install
npm run dev        # copie le runtime MediaPipe dans public/ puis lance Vite
npm test           # tests de la logique (node --test)
npm run build      # build de production dans dist/
npm run models     # optionnel : télécharge les modèles de posture dans public/models
```

La caméra demande HTTPS (ou `localhost`). Pour tester sur téléphone en local : `npx vite --host` puis un tunnel HTTPS, ou directement la version déployée.

## Versions

Le numéro affiché en bas des Réglages vient de `version` dans `package.json` (`0.1.0` s'affiche « 0.1 »), avec la date du build et le commit déployé. Pour passer à la suivante :

```bash
npm version 0.2.0 --no-git-tag-version
```

## Déploiement

Le workflow `.github/workflows/deploy.yml` teste, télécharge les modèles, build et publie sur GitHub Pages à chaque push sur `main`.

Une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

`base: "./"` dans `vite.config.js` : l'app fonctionne quel que soit le nom du repo.

## Structure

```
src/
  data/       exercices, barème, santé, défis, badges
  lib/        calculs purs (compute.js), stockage, rotation des circuits
  store/      état React (contexte) : données, parcours d'une envie, notifications
  pages/      un composant par onglet
  components/ éléments communs, récap hebdo
  art/        personnage 2D, poses, icônes, médailles
  pose/       coach caméra : compteurs (purs), moteur MediaPipe, interface
  game/       boss, combat et combo (purs), clicker, victoire, records ; gfx/ : rendu canvas, sprites, sons
tests/        tests node:test
```

## Avertissement

Les repères santé sont des repères généraux (NHS notamment) et varient d'une personne à l'autre. Cette app ne remplace pas un avis médical. Aide gratuite en France : Tabac Info Service, 39 89.
