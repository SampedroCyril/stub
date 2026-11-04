# Roulement anti-clope

App web pour arrêter de fumer, gamifiée : chaque envie de fumer devient un boss en pixel art à abattre, au circuit de sport, en respirant ou au jeu de blocs. Deux progressions séparées (sevrage et sport), des défis hebdo, des badges à paliers, le suivi des bénéfices santé, et un **coach caméra** qui compte tes répétitions et vérifie ta forme.

Tout tourne dans le navigateur : pas de compte, pas de serveur, la vidéo ne quitte jamais l'appareil.

## Fonctionnalités

Navigation en 5 sections (barre du bas) : **Accueil**, **Sevrage** (envies, respirer, arcade, santé), **Sport** (circuit, records, exos), **Progrès** (défis, boss, badges, stats) et **Réglages**.

| Écran | Contenu |
|---|---|
| Accueil | Temps sans clope, niveaux sevrage et sport, prochain cap santé, défis de la semaine, meilleurs badges |
| Sevrage | Noter une envie (intensité 1-5, déclencheur), la tenir au sport, en respirant ou sans rien. Bouton « J'ai fumé » protégé par une confirmation |
| Circuit | Rotation renfo + cardio adaptée au niveau, coach caméra par exercice |
| Respirer | Cohérence cardiaque, expiration longue, respiration carrée, de 1 à 5 min |
| Santé | 10 caps (20 min → 15 ans) datés depuis la dernière nicotine |
| Défis | 3 défis tirés chaque lundi, +80 XP chacun, historique et récap par semaine |
| Badges | 17 badges, 7 à 9 paliers chacun, avec date d'obtention |
| Stats | Intensité sur 14 jours, déclencheurs, heures critiques, sport, journal |
| Réglages | Installation, export/import des données, date de la dernière clope, coach caméra, aide |
| Exos | 25 exercices illustrés, difficulté, XP, compatibilité caméra |

Le récap de la semaine s'ouvre tout seul le dimanche à partir de 18h (ou à la prochaine ouverture si tu l'as raté).

## Le jeu (0.11)

- **Boss d'envie** : chaque envie notée fait apparaître un boss lié à son déclencheur (Le Café Maudit, Le Repas Traître, La Pinte Perfide, Le Glitch…, et le Spectre de 2h du mat' la nuit). PV = 100 × intensité, +10 % par niveau du boss (un niveau toutes les 5 victoires, couronne dès le niveau 3).
- **Il s'épuise tout seul en 5 minutes**, la durée réelle d'une envie. Les attaques l'abattent plus vite : tapes (1 %, critique 3 %), cycle de respiration (8 %), ligne aux blocs (10 %, 4 lignes 50 %), circuit (60 %, 80 % si validé caméra). On ne perd qu'en déclarant une rechute.
- **Mode crise** (envie à 5) : boss enragé (+20 % PV), 3 minutes guidées en plein écran : respirer, jouer, bouger, puis le coup final.
- **Arcade** : jeu de blocs tactile, parties libres avec record, ou 3 minutes en combat.
- **Cendrier** : chaque victoire écrase une clope dans un bocal pixel art qui évolue (bocal, poubelle, benne, volcan éteint).
- **Records caméra** : pompes en 1 min, squats en 30 s, jumping jacks en 1 min, dips en 45 s, planche et chaise le plus longtemps possible, comptés par le coach.
- **Bestiaire** : victoires, niveau et meilleur temps par boss.

Les sprites sont dessinés en texte (`src/game/sprites.js`, 16 × 16, une lettre par couleur) et rendus en SVG net.

## Barème

- **Sevrage** (remis à zéro à chaque rechute) : +100 par jour complet ; par boss vaincu +15 en tenant, +20 en respirant ou aux blocs, +25 avec un circuit, +30 en mode crise ; +80 par défi sevrage.
- **Sport** (définitif) : reps × difficulté, ou secondes × difficulté ÷ 3, × 2 pour les exos « par côté », +80 par défi sport.
- **Niveaux** : seuil cumulé `K × (L-1) × L`, K = 75 (sevrage) et 60 (sport).

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
  game/       boss, sprites pixel art, combat (pur), jeu de blocs (pur), crise, cendrier, records
tests/        tests node:test
```

## Avertissement

Les repères santé sont des repères généraux (NHS notamment) et varient d'une personne à l'autre. Cette app ne remplace pas un avis médical. Aide gratuite en France : Tabac Info Service, 39 89.
