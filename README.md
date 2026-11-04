# Roulement anti-clope

App web pour arrêter de fumer, gamifiée : chaque envie de fumer se tient au combat (un boss en pixel art à abattre au clicker), en respirant ou en bougeant. Deux progressions séparées (sevrage et sport), des défis hebdo, des badges à paliers, le suivi des bénéfices santé, et un **coach caméra** qui compte tes répétitions et vérifie ta forme.

Tout tourne dans le navigateur : pas de compte, pas de serveur, la vidéo ne quitte jamais l'appareil.

## Fonctionnalités

Navigation en 6 sections (barre du bas) : **Accueil**, **Sevrage** (envies, respirer, santé), **Sport** (circuit, records, exos), **Joueur** (talents, arcade, boss), **Progrès** (défis, badges, stats) et **Réglages**. Sport, Joueur et Progrès peuvent être masqués dans les réglages : l'app ne montre que ce qui te parle.

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

## Le jeu (0.3.3)

- **Trois façons de tenir une envie** : **Combat** (le boss de l'envie, en clicker), **Respirer** (le cercle guidé, au moins une minute) ou **Bouger** (un circuit). Les trois écrasent la clope au cendrier et rapportent de l'XP sevrage.
- **Boss d'envie** : un par déclencheur (Le Café Maudit, Le Repas Traître, La Pinte Perfide, Le Glitch…, le Spectre de 2h du mat' la nuit, Clopinette sinon). Chacun a un trait faible et un trait fort (points faibles plus lents ou plus vifs, plus ou moins faciles à toucher, sensible ou blindé aux gros paliers, tentations plus ou moins fréquentes), révélés après la première victoire.
- **Combat en rythme, plein écran** : sous le boss, une jauge ; deux cercles partent des bords et se rejoignent au centre. Touche l'écran (n'importe où) quand ils y sont : parfait ou bon, le combo monte ; trop tôt, trop tard ou pas du tout, il retombe à zéro. Les cercles vont de plus en plus vite avec le combo.
- **Neuf paliers d'impact** : coup, coup sûr, coup net, critique, critique noir, impact noir, fracture, supernova, transe. Les paliers 3 à 9 tombent à des combos précis, plus espacés pour les grosses envies ; la transe double les dégâts jusqu'au prochain raté. K.O. en *Tranche* ou en *Manga*.
- **Durée** : PV calibrés par simulation pour qu'un bon joueur gagne en 1 min (envie à 1) à 3 min (envie à 5). Le boss s'épuise tout seul et meurt au bout de 5 minutes (épuisement lent puis rapide) : on ne perd qu'en déclarant une rechute.
- **Jauge à thèmes** : Néon fluide, Katana ou Arcade LED, au choix dans les réglages (aperçu animé). Parfait (±90 ms), bien (±210 ms), 40 ms de retard pardonnés. Cinq parfaits d'affilée : une série, avec un coup bonus.
- **Tentation** : de temps en temps, ce sont deux clopes qui glissent dans la jauge. Ne touche pas : elles s'écrasent au centre et le boss perd 3 % de PV, combo intact. Toucher, c'est la prendre : il se soigne de 8 % et le combo casse.
- **Rang** : S (dans le temps visé avec un beau combo), A (moins de 1,5 × le temps visé), B (abattu avant l'épuisement), C (épuisement).
- **Niveau joueur et talents** : chaque combat rapporte de l'XP joueur (victoire, combo max, rang), l'Arcade aussi (plafonnée par jour). Un point par niveau dans un arbre à trois branches : *Puissance* (dégâts, paliers plus tôt, refus cinglant, coup de grâce), *Technique* (fenêtres « parfait » et « bon » plus larges, cercles plus lents, ratés pardonnés), *Spectacle* (débloque les paliers 6 à 9 et le K.O. Manga). Réinitialisable.
- **Arcade** : Entraînement (30 s), Sans fin (trois vies, ça accélère), Boss Run (les 11 boss à la suite, chrono), chacun avec son record. Rien n'y touche aux envies.
- **Victoire** : la clope de l'envie s'écrase dans le cendrier, crache sa braise et s'éteint. Le bocal de l'accueil compte toutes les clopes écrasées.
- **Records caméra** : pompes en 1 min, squats en 30 s, jumping jacks en 1 min, dips en 45 s, planche et chaise le plus longtemps possible, comptés par le coach.

Rendu en canvas (`src/game/gfx/`) : boss dessinés par code (`bossArt.js`), ombrés et contourés automatiquement, avec leurs états (respiration, clignement, parole, grimace, fissures selon les PV, colère). La scène (`BossStage.js`) gère les neuf paliers, la transe et un calque plein écran pour les impacts. Bruitages synthétisés et précalculés (`sfx.js`), sans fichier son. Option « Effets intenses » dans les réglages pour couper flashs et inversions.

## Barème

- **Sevrage** (remis à zéro à chaque rechute) : +100 par jour complet ; par envie tenue +20 au combat (+10 / +5 au rang S / A), +20 en respirant, +25 au sport ; +80 par défi sevrage.
- **Sport** (définitif) : reps × difficulté, ou secondes × difficulté ÷ 3, × 2 pour les exos « par côté », +80 par défi sport.
- **Joueur** (définitif) : +20 par boss vaincu, +1 par point de combo max (60 au plus), +30 / +15 / +5 au rang S / A / B ; Arcade : 1 XP pour 50 points, 120 par jour au plus.
- **Niveaux** : seuil cumulé `K × (L-1) × L`, K = 75 (sevrage), 60 (sport) et 50 (joueur).

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
