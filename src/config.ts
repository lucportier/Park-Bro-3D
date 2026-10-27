// Tous les réglages du jeu sont ici. Les valeurs se règlent en jouant.
// Unité : le mètre (une voiture fait environ 4,5 m de long).

export const config = {
  couleurs: {
    ciel: 0xbfe3f2,
    herbe: 0x9ccc6e,
    asphalte: 0x5b6068,
    lignes: 0xf4f1e8,
    trottoir: 0xd8d2c4,
    guerite: 0xf2b134,
    barriere: 0xe84a3c,
    enseigne: '#2e6fd8',
    agent: 0xffd23f,
    gilet: 0xe9f018,
    giletBandes: 0xdfe4ea,
  },

  parking: {
    // 4 rangées de 10 places, coupées au milieu par une allée piétonne.
    placesParDemiRangee: 5,
    largeurPlace: 3,
    profondeurPlace: 5.5,
    largeurAllee: 6.5,
    largeurAlleePietonne: 3,
    largeurTrottoir: 4,
    voituresGareesAuDepart: 6,
  },

  routeEntree: {
    longueur: 60,
    largeur: 7,
    // Rang de la dalle (depuis le portail) qui porte le passage piéton.
    dallePassagePieton: 2,
  },

  voitures: {
    modeles: ['sedan', 'suv', 'hatchback-sports', 'taxi', 'van', 'suv-luxury', 'sedan-sports', 'delivery'],
    // Délai entre deux arrivées, tiré au hasard entre ces bornes (secondes).
    intervalleMin: 4,
    intervalleMax: 7.5,
    // Vitesse de croisière de chaque conducteur, tirée entre ces bornes (m/s).
    vitesseMin: 7,
    vitesseMax: 9,
    acceleration: 4,
    freinage: 6,
    // Espace entre deux voitures arrêtées dans la file (m).
    ecart: 1.5,
    // Distance gardée devant l'agent quand il est sur la voie (m).
    margeObstacle: 1.5,
    // Nombre de voitures en file au-delà duquel plus rien n'arrive (la défaite viendra plus tard).
    fileMax: 8,
  },

  // Facteurs d'échelle des modèles Kenney pour passer en mètres.
  echelles: {
    voiture: 1.75,
    dalleRoute: 7,
    lampadaire: 10,
    batiment: 12,
    personnage: 2.4,
  },

  agent: {
    modele: 'character-male-b',
    // Départ par rapport au portail, côté parking.
    departX: 4,
    departZ: -5,
    // Mètres par seconde à fond (clavier ou joystick poussé au bout).
    vitesse: 6,
    // Au-delà de cette part de la vitesse, l'agent court au lieu de marcher.
    seuilCourse: 0.6,
    vitesseRotation: 12,
    fonduAnimation: 0.15,
  },

  joystick: {
    // Rayon du joystick en pixels, et glissement minimal avant qu'il s'active.
    rayon: 60,
    seuil: 12,
  },

  camera: {
    // Inclinaison par rapport au sol, en degrés (90 = vue de dessus).
    inclinaison: 55,
    // Distance entre la caméra et l'agent qu'elle suit.
    distance: 34,
    // Rapidité avec laquelle la caméra rattrape l'agent (plus grand = plus collé).
    suivi: 5,
    // Champ de vision vertical, en degrés.
    champ: 40,
  },

  rendu: {
    // Plafond de densité de pixels : au-delà, le téléphone chauffe pour rien.
    densiteMax: 2,
  },
};
