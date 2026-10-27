# Park Bro 3D — CLAUDE.md

Petit jeu de gestion de parking en 3D low-poly, jouable dans le navigateur (ordinateur et téléphone). Il est fait pour s'amuser entre amis et en famille, pas pour être vendu.

Le gameplay est décrit dans `docs/gameplay.md`. C'est la seule spec du projet.

## Philosophie : le fun d'abord, le plus simple possible

Une première version 2D a été abandonnée : trop d'architecture, de specs et de tests pour un résultat moche et peu amusant (archive : dépôt `lucportier/Park-Bro`). Ce projet fait l'inverse.

- **Jouable avant tout.** Chaque changement doit pouvoir être essayé dans le navigateur dans la foulée.
- **Une fonctionnalité à la fois.** Faire le plus petit pas qui se voit en jouant, puis s'arrêter pour que je teste. Ne pas enchaîner plusieurs ajouts sans retour.
- **Pas d'infrastructure par anticipation.** Pas de simulation déterministe, de replay, de sauvegarde, de système d'événements, d'injection de dépendances ni de couches d'abstraction tant que le jeu n'en a pas besoin concrètement.
- **Pas de nouvelle spec ni de document** sans que je le demande. Mettre à jour `docs/gameplay.md` quand une règle de jeu change.
- **Le beau compte.** Un ajout visible doit être propre : couleurs cohérentes, mouvements fluides, retours visuels clairs.

## Seule règle non négociable

Une voiture ne roule jamais sur un piéton : elle s'arrête et attend. Aucune simplification ne doit casser ça.

## Stack

- Vite + TypeScript + Three.js. TypeScript en mode `strict`, sans en faire une contrainte : la lisibilité passe avant la pureté des types.
- Modèles : packs low-poly gratuits (Kenney, licence CC0) au format glTF dans `public/models/`. Toute source d'assets est notée dans `CREDITS.md`.
- Pas d'autre dépendance sans me demander.
- Publication : site statique (GitHub Pages ou équivalent), partagé par un simple lien.

## Organisation du code

Rester petit et plat. Point de départ :

- `src/main.ts` : démarrage, boucle de jeu.
- `src/config.ts` : **tous les réglages de jeu** (patience, cadences, vitesses, points). Aucun nombre magique de gameplay ailleurs.
- `src/scene/` : décor, caméra, lumières.
- `src/game/` : voitures, piétons, file d'attente, score.
- `src/ui/` : HUD et écrans (HTML/CSS par-dessus le canvas).

Découper un fichier quand il devient difficile à lire, pas avant.

## Façon de travailler

- Avant de coder une fonctionnalité, dire en deux ou trois lignes ce qui va être fait. Ne poser une question que si le choix change vraiment le jeu.
- Après chaque changement : lancer le jeu (`npm run dev`), le regarder dans le navigateur, vérifier qu'il n'y a pas d'erreur dans la console, puis me dire quoi tester.
- Tests automatiques seulement pour la logique délicate et facile à casser (files d'attente, priorité piétonne, calcul du score). Pas d'objectif de couverture.
- Penser au téléphone : le tap doit marcher comme le clic, le texte doit rester lisible, et il faut 60 images/s sur un téléphone moyen.
- Commits courts et fréquents, en français. Ne jamais pousser sans que je le demande.

## Commandes

```bash
npm run dev
npm run build
npm test
```

## Langue

Tout en français : interface du jeu, commentaires, commits, documents.
