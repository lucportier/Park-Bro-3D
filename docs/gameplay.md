# Park Bro 3D — Gameplay

Version 0.2 — 2026-10-27. Les questions de la version 0.1 sont tranchées (voir §6).

Ce document remplace l'ensemble des specs de la version 2D pour la nouvelle version en Three.js. Il reste volontairement court : il décrit ce qui doit être amusant, pas comment le coder. Les valeurs chiffrées sont des points de départ à régler en jouant, réunies dans un seul fichier de réglages (`src/config.ts`).

## 1. Intention

- Un petit jeu de gestion à jouer entre amis et en famille, sur ordinateur et téléphone, sans installation (un lien web).
- Une partie dure environ 4 minutes. On comprend en 10 secondes, sans tutoriel.
- La sensation visée : un rush du matin qu'on garde sous contrôle de justesse. Il y a toujours quelque chose à faire, et on rate parfois.
- Le visuel est low-poly coloré, vue de dessus inclinée, lisible d'un coup d'œil.

## 2. Boucle de jeu

Le joueur incarne un agent de parking qui se déplace à pied.

1. Des voitures arrivent par la route d'entrée et font la queue à l'entrée du parking. Il n'y a pas de barrière (elle est levée dès 8 h) : la voiture de tête s'arrête à la ligne d'arrêt et attend l'agent.
2. Si l'agent est **dans le regard** de la voiture de tête (un cône étroit devant elle, dessiné au sol), elle quitte la file et s'avance doucement vers lui, en restant sur la chaussée (route, allées, voies latérales). S'il sort de son regard, elle s'arrête.
3. S'il **fait signe** (bouton « Signe », barre d'espace sur ordinateur) et qu'elle est assez proche, elle vient vite jusqu'à lui, même s'il sort de son regard. Cela évite de remonter jusqu'à l'entrée à chaque voiture.
4. Une fois la voiture près de l'agent (ou la tête de file à la ligne, si l'agent est tout près), les places libres s'éclairent : le joueur en choisit une (clic ou tap). La voiture s'y rend par la chaussée et s'y gare en marche avant.
5. Sans geste, la patience baisse : jauge vide, la voiture cherche une place seule (voir §3.2).
6. La voiture va se garer. Ses occupants descendent et marchent jusqu'au parc des expos.
7. Pendant ce temps, la file s'allonge, la patience baisse, des piétons traversent, des incidents surgissent.
8. La partie s'arrête à 11:00 (ou plus tôt en cas de défaite) et affiche un score et un petit bilan.

## 3. Règles

### 3.1 Agent et contrôles

- Ordinateur : clavier (ZQSD, WASD ou flèches) pour déplacer l'agent, clic pour choisir une place, barre d'espace pour faire signe.
- Téléphone : joystick virtuel pour déplacer l'agent, tap pour choisir une place, bouton « Signe » à l'écran.
- La caméra suit l'agent.

### 3.2 Voitures

- Une voiture ne roule que sur la chaussée, à droite, et ne fait pas marche arrière (elle fait le tour s'il le faut) ; elle s'arrête toujours avant l'agent.
- Une seule voiture à la fois quitte la file pour venir vers l'agent.
- Une voiture qui attend a une jauge de patience visible. Seule la tête de file perd sa patience à plein régime ; les suivantes la perdent deux fois moins vite.
- Jauge vide : la voiture se gare seule sur une place au hasard, avec une pénalité.
- Une voiture garée ne repart pas pendant la partie.
- Il n'arrive pas plus de voitures que de places libres.

### 3.3 Piétons

- **Règle non négociable : une voiture ne roule jamais sur un piéton.** Elle s'arrête et attend.
- Les occupants d'une voiture garée (1 à 3) marchent jusqu'à l'entrée du parc des expos, par l'allée, un passage piéton et le trottoir.
- Des piétons traversent aussi la route d'entrée ; les voitures en approche s'arrêtent avant le passage.

### 3.4 Score

| Action                                                          | Points |
| --------------------------------------------------------------- | ------ |
| Voiture placée par le joueur                                    | +10    |
| Bonus : placée avant d'avoir perdu la moitié de sa patience     | +15    |
| Voiture garée seule, patience épuisée                           | −5     |

Les deux premières lignes se cumulent : une voiture placée rapidement rapporte 25 points. Le score ne descend jamais sous 0.

### 3.5 Fin de partie

- L'horloge de jeu va de 08:00 à 11:00 en environ 4 minutes réelles. La partie s'arrête à 11:00.
- **Défaite** : si la file d'attente dépasse la longueur de la route d'entrée (environ 8 voitures), la route est bloquée et la partie est perdue immédiatement.

## 4. Ajouts prévus, par ordre de priorité

Chaque ajout n'est gardé que s'il rend le jeu plus amusant une fois testé.

1. **Fin de partie et écran de bilan** (score, voitures garées, meilleur score local).
2. **Rush** : les arrivées s'accélèrent vers 09:00-09:30, puis se calment.
3. **Profils de conducteurs** : pressés (peu de patience), hésitants (roulent lentement), exposants (passent par une autre entrée).
4. **Incidents**, chacun réglé quand l'agent rejoint la voiture concernée et la touche :
   - voiture en panne qui bloque l'allée ;
   - conducteur perdu qui tourne en rond ;
   - voiture mal garée qui déborde sur l'allée.
5. **Groupes de piétons** à faire traverser en sécurité (bonus si on bloque la circulation au bon moment).
6. **Sons** simples : klaxon d'impatience, bip de validation.

## 5. Hors périmètre

- Simulation déterministe, replay, sauvegarde de partie en cours.
- Difficulté adaptative, barème complexe, anti-abus.
- Applications natives sur les stores.
- Éditeur de niveaux.

## 6. Questions tranchées (2026-10-27)

1. **Point de vue du joueur** : on incarne un agent qui se déplace, avec le geste « faire signe » pour limiter les allers-retours.
2. **Fin de partie** : à 11:00. Un parking plein n'arrête pas la partie.
3. **Durée** : environ 4 minutes, à régler en jouant.
4. **Échec possible** : oui, quand la file bloque la route d'entrée.
5. **Taille du parking** : environ 40 places sur plusieurs allées (16 places se remplissaient en une minute).

## 7. Réglages de départ

Valeurs initiales, à régler en jouant dans `src/config.ts`.

| Réglage                               | Valeur              |
| ------------------------------------- | ------------------- |
| Places                                | environ 40, plusieurs allées |
| Voitures déjà garées au départ        | 6                   |
| Intervalle entre deux arrivées        | 4 à 7,5 s           |
| File maximale avant défaite           | environ 8 voitures  |
| Patience                              | 14 s                |
| Regard de la voiture de tête          | cône de ±15°, 25 m  |
| Vitesse d'approche (regard / signe)   | 2,5 / 7 unités/s    |
| Rayon du geste « faire signe »        | 30 m                |
| Vitesse des voitures                  | 7 à 9 unités/s      |
| Vitesse des piétons                   | 1,6 à 2,1 unités/s  |
| Durée réelle de 08:00 à 11:00         | environ 4 min       |
