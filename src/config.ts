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

  // Facteurs d'échelle des modèles Kenney pour passer en mètres.
  echelles: {
    voiture: 1.75,
    dalleRoute: 7,
    lampadaire: 10,
    batiment: 12,
    personnage: 2.4,
  },

  camera: {
    // Inclinaison par rapport au sol, en degrés (90 = vue de dessus).
    inclinaison: 55,
    // Distance entre la caméra et le point regardé.
    distance: 70,
    // Champ de vision vertical, en degrés.
    champ: 40,
  },

  rendu: {
    // Plafond de densité de pixels : au-delà, le téléphone chauffe pour rien.
    densiteMax: 2,
  },
};
