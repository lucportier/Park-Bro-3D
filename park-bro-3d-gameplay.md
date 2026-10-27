# Park Bro 3D — Gameplay

Version 0.1 — brouillon du 2026-10-23, à relire et à trancher.

Ce document remplace l'ensemble des specs de la version 2D pour la nouvelle version en Three.js. Il reste volontairement court : il décrit ce qui doit être amusant, pas comment le coder. Les valeurs chiffrées sont des points de départ à régler en jouant, réunies dans un seul fichier de réglages.

## 1. Intention

- Un petit jeu de gestion à jouer entre amis et en famille, sur ordinateur et téléphone, sans installation (un lien web).
- Une partie dure 4 à 5 minutes. On comprend en 10 secondes, sans tutoriel.
- La sensation visée : un rush du matin qu'on garde sous contrôle de justesse. Il y a toujours quelque chose à faire, et on rate parfois.
- Le visuel est low-poly coloré, vue de dessus inclinée, lisible d'un coup d'œil.

## 2. Boucle de jeu

1. Des voitures arrivent par la route d'entrée et font la queue au portail.
2. Le joueur choisit une place pour la voiture en tête de file (un clic ou un tap sur une place libre).
3. La voiture va se garer. Ses occupants descendent et marchent jusqu'au parc des expos.
4. Pendant ce temps, la file s'allonge, la patience baisse, des piétons traversent, des incidents surgissent.
5. La partie s'arrête à la fin du créneau et affiche un score et un petit bilan.

## 3. Règles

### 3.1 Voitures

- Une voiture qui attend a une jauge de patience visible. Seule la tête de file perd sa patience à plein régime ; les suivantes la perdent deux fois moins vite.
- Jauge vide : la voiture se gare seule sur une place au hasard, avec une pénalité.
- Une voiture garée ne repart pas pendant la partie.
- Il n'arrive pas plus de voitures que de places libres.

### 3.2 Piétons

- **Règle non négociable : une voiture ne roule jamais sur un piéton.** Elle s'arrête et attend.
- Les occupants d'une voiture garée (1 à 3) marchent jusqu'à l'entrée du parc des expos, par l'allée, un passage piéton et le trottoir.
- Des piétons traversent aussi la route d'entrée ; les voitures en approche s'arrêtent avant le passage.

### 3.3 Score

| Action                                                       | Points |
| ------------------------------------------------------------ | ------ |
| Voiture placée rapidement (plus de la moitié de sa patience) | +15    |
| Voiture placée                                               | +10    |
| Voiture garée seule, patience épuisée                        | −5     |

Le score ne descend jamais sous 0.

### 3.4 Fin de partie

À trancher (voir §6). Proposition : l'horloge de jeu va de 08:00 à 11:00 en 4 minutes réelles ; la partie s'arrête à 11:00 ou dès que le parking est plein.

## 4. Ajouts prévus, par ordre de priorité

Chaque ajout n'est gardé que s'il rend le jeu plus amusant une fois testé.

1. **Fin de partie et écran de bilan** (score, voitures garées, meilleur score local).
2. **Rush** : les arrivées s'accélèrent vers 09:00-09:30, puis se calment.
3. **Profils de conducteurs** : pressés (peu de patience), hésitants (roulent lentement), exposants (passent par une autre entrée).
4. **Incidents**, chacun réglé par un clic sur la voiture concernée :
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

## 6. Questions ouvertes

1. **Point de vue du joueur** : on reste en « vue de gestion » où l'on clique partout (comme la maquette), ou on incarne un agent qui doit se déplacer jusqu'aux voitures (comme la version 2D) ? Le premier est plus simple et plus nerveux. Le second ajoute de la tension mais aussi de la lourdeur.
2. **Fin de partie** : heure de fin, parking plein, ou les deux ?
3. **Durée** : 4 minutes vous convient ?
4. **Échec possible** : la partie peut-elle être perdue (par exemple, file trop longue qui bloque la route) ou seulement plus ou moins bien réussie ?
5. **Taille du parking** : 16 places suffisent-elles, ou faut-il plusieurs allées ?

## 7. Réglages actuels de la maquette

| Réglage                        | Valeur              |
| ------------------------------ | ------------------- |
| Places                         | 16 (2 rangées de 8) |
| Voitures déjà garées au départ | 6                   |
| Intervalle entre deux arrivées | 4 à 7,5 s           |
| File d'attente maximale        | 4 voitures          |
| Patience                       | 14 s                |
| Vitesse des voitures           | 7 à 9 unités/s      |
| Vitesse des piétons            | 1,6 à 2,1 unités/s  |
