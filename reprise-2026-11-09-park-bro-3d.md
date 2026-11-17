# Reprise — Park Bro 3D, après l'étape 8
_Généré le 2026-11-09 · à coller en début de nouvelle session_

## Objectif
Petit jeu de gestion de parking en 3D low-poly (Vite + TypeScript + Three.js), jouable dans le navigateur sur ordinateur et téléphone, pour jouer entre amis et en famille. Dépôt `lucportier/Park-Bro-3D`. Seule spec : `docs/gameplay.md`. Le `CLAUDE.md` du dépôt fait foi. L'ancien dépôt 2D `Park-Bro` est archivé et ne s'applique pas.

## État d'avancement
- Fait (étapes 1 à 8) :
  - décor, agent (clavier, joystick), voitures en file à l'entrée ;
  - regard en cône et « Signe » pour appeler la voiture de tête ;
  - choix de la place par tap ou clic, garage en marche avant ;
  - patience, garage seul avec −5, score affiché ;
  - occupants qui marchent jusqu'au parc des expos, priorité piétonne ;
  - arrêt par prudence (+5) ;
  - correction des blocages. Dernier commit : `fcc27c1`, en ligne.
- En cours : retour de l'utilisateur sur les blocages (il n'a pas encore confirmé que c'est réglé).
- Reste à faire :
  - **étape 9** : horloge de 08:00 à 11:00 (environ 4 min réelles), défaite si la file bloque la route (environ 8 voitures), écran de fin, meilleur score local ;
  - **étape 10** : ajouts du §4 de `docs/gameplay.md`, un à la fois, chacun gardé seulement s'il amuse.

## Décisions prises
- Score :
  - +10 pour une voiture placée, +15 si elle a encore plus de la moitié de sa patience ;
  - −5 si elle se gare seule ;
  - +5 « Prudence » une fois par voiture ;
  - le score ne descend jamais sous 0.
- Patience de 14 s. La tête de file la perd à plein régime, les voitures arrêtées derrière à demi-régime, celles qui roulent encore pas du tout.
- Voitures :
  - elles roulent seulement sur la chaussée, à droite ;
  - jamais de marche arrière ni de demi-tour (virage de plus de 120° interdit dans `chemin`) ;
  - garage en marche avant par une courbe de Bézier.
- Piétons (demande de l'utilisateur, à respecter) :
  - la voiture s'arrête à 2 m d'un piéton, avec une anticipation de 3 s ;
  - elle roule au pas (2 m/s) près de piétons ;
  - après un arrêt, elle attend 1,5 s avant de repartir, sauf si l'agent lui fait signe.
- Arrêt par prudence (demande de l'utilisateur) :
  - un « Signe » près d'une voiture qui roule (moins de 12 m), avec des piétons à moins de 8 m, l'arrête et affiche une main rouge ;
  - elle repart quand aucun piéton n'est plus devant elle, au plus tard après 8 s.
- Le bouton « Signe » a donc deux rôles : appeler la tête de file, ou arrêter une voiture près de piétons.
- Piétons polis :
  - ils laissent passer une voiture qui roule (zone de 4 m devant elle) ;
  - ils restent à 1,6 m devant une voiture arrêtée et à 0,9 m de ses flancs ;
  - après 1,5 s d'attente, ils passent devant une voiture arrêtée ; après 3 s, ils contournent une voiture qui leur barre le chemin.
- Allées élargies de 6,5 m à 7 m (`decalageDroite` 1,5) pour laisser de la place aux piétons.

## Pistes écartées
- Bras levé de l'agent pour le signe : invisible vu de dessus, remplacé par un sprite ✋ et une onde jaune.
- Mesurer la distance entre le piéton et le centre de la voiture : ça provoquait des freinages au dernier moment. C'est maintenant la distance à la carrosserie.
- Ne prévoir que la position du piéton dans 2 s : la prévision « sautait » par-dessus la voie. Le chemin des 3 prochaines secondes est échantillonné toutes les 0,5 s.

## Contraintes et préférences
- `CLAUDE.md` du dépôt :
  - le fun d'abord, une fonctionnalité à la fois, puis s'arrêter pour que l'utilisateur teste ;
  - pas d'infrastructure par anticipation ;
  - pas de nouveau document sans demande ;
  - tous les réglages de jeu dans `src/config.ts` ;
  - tout en français (interface, commentaires, commits courts) ;
  - pas de nouvelle dépendance sans demande ;
  - modèles Kenney (CC0) notés dans `CREDITS.md`.
- **Règle non négociable** : une voiture ne roule jamais sur un piéton.
- Avant de coder, annoncer le plan en 2 ou 3 lignes. Après chaque changement :
  - `npm run dev`, puis Playwright sur ordinateur (1280×720) et iPhone 13, 0 erreur console ;
  - dire à l'utilisateur quoi tester.
- Git :
  - travailler **uniquement sur la branche `stage`**, avec l'autorisation permanente de pousser chaque commit ;
  - ne pas utiliser `claude/laughing-hypatia-x0c54b` ;
  - chaque push redéploie https://lucportier.github.io/Park-Bro-3D/ ;
  - vérifier le déploiement via `https://api.github.com/repos/lucportier/Park-Bro-3D/actions/runs?head_sha=<sha>`.
- Mettre à jour `docs/gameplay.md` quand une règle de jeu change.
- Tests automatiques seulement pour la logique délicate (25 tests au total).

## Livrables et fichiers
- `src/game/chaussee.ts` (+ test) : réseau de chaussée, Dijkstra sur états (nœud, direction), sans demi-tour.
- `src/game/priorite.ts` (+ test) :
  - côté voitures : `distanceLibre`, `obstaclesPietons`, `pietonPresDeLaVoie`, `plafondPietons` ;
  - côté piétons : `bloqueur`/`peutAvancer`, `contournement`.
- `src/game/voitures.ts` : file, approche, garage, patience, jauges, arrêt par signe. Événements `placee`, `seule`, `garee`, `prudence`.
- `src/game/pietons.ts` : occupants (1 à 3, en groupe), trajet par l'allée centrale jusqu'à la porte.
- `src/game/file.ts`, `src/game/score.ts`, `src/game/parking.ts` (plan, places, `chaussee`), `src/game/agent.ts`.
- `src/ui/` : contrôles, HUD (`hud.ts`). `src/main.ts` : boucle de jeu.
- Pour tester dans le navigateur : ajouter temporairement `(window as any).__test = { camera, places, pietons, voitures }` à la fin de `src/main.ts`, et le retirer avant chaque commit.
- Les scripts Playwright du scratchpad (`soak.cjs`, etc.) ne survivent pas à la session. Ils se lancent avec `NODE_PATH=$(npm root -g) node script.cjs` et le flag Chromium `--use-gl=angle --use-angle=swiftshader`.

## Questions ouvertes et prochaines étapes
1. Recueillir le retour de l'utilisateur : reste-t-il des blocages ? Si oui, demander l'endroit et la situation, puis reproduire par une longue partie automatique qui détecte toute voiture ou tout piéton immobile depuis plus de 8 s.
2. Questions posées à l'utilisateur, sans réponse :
   - les voitures sont-elles devenues trop lentes ?
   - la main rouge se voit-elle bien ?
   - le double rôle du bouton « Signe » est-il clair, ou faut-il un bouton à part ?
3. Lancer l'étape 9 seulement après le « go » de l'utilisateur.

## Amorce de relance
> Nous reprenons Park Bro 3D (dépôt `lucportier/Park-Bro-3D`, branche `stage`, push autorisé). Les étapes 1 à 8 sont faites et en ligne (commit `fcc27c1`) : piétons, priorité piétonne, arrêt par prudence et correction des blocages. Lis `CLAUDE.md` et `docs/gameplay.md`. Attends mon retour sur les blocages, puis mon « go » pour l'étape 9 (horloge de 08:00 à 11:00, défaite si la file bloque la route, écran de fin et meilleur score local).
