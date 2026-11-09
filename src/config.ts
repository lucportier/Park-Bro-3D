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
    enseigne: '#2e6fd8',
    agent: 0xffd23f,
    gilet: 0xe9f018,
    giletBandes: 0xdfe4ea,
    regard: 0xffffff,
  },

  parking: {
    // 4 rangées de 10 places, coupées au milieu par une allée piétonne.
    placesParDemiRangee: 5,
    largeurPlace: 3,
    profondeurPlace: 5.5,
    largeurAllee: 7,
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

  // La voiture de tête qui voit l'agent devant elle quitte la file et vient vers lui.
  approche: {
    // Regard du conducteur : demi-angle du cône (degrés) et portée (m).
    angleRegard: 15,
    porteeRegard: 25,
    // Vitesse quand elle voit simplement l'agent, et quand il lui a fait signe (m/s).
    vitesseLente: 2.5,
    vitesseSigne: 7,
    // Distance gardée entre l'avant de la voiture et l'agent (m).
    distanceAgent: 2,
    // Plus petit rayon de virage, et distance du point visé sur la chaussée (m).
    rayonBraquage: 4.5,
    visee: 3.5,
  },

  // La voiture prête reçoit sa place quand le joueur la tape, puis va s'y garer.
  garage: {
    // Distance entre l'agent et la voiture pour qu'elle attende sa place (m).
    distanceChoix: 9,
    vitesse: 4.5,
    // On roule à droite de la ligne médiane des allées (m).
    decalageDroite: 1.5,
    // À cette distance de l'allée devant sa place, la voiture entame sa manœuvre (m).
    distanceManoeuvre: 4.5,
    vitesseManoeuvre: 2.5,
    // Demi-largeur du couloir devant une voiture où l'agent ou une autre voiture l'arrête (m).
    couloirAgent: 1.5,
    // Distance gardée devant l'agent par une voiture qui se gare (m).
    margeAgent: 0.8,
    couloirVoiture: 2.1,
  },

  patience: {
    // Patience d'une voiture qui attend (s). La tête de file la perd à plein régime,
    // les suivantes (à l'arrêt dans la file) moins vite.
    duree: 14,
    ratioSuivantes: 0.5,
    // Jauge au-dessus des voitures (m).
    largeurJauge: 2.2,
    hauteurJauge: 0.32,
    hauteurAuDessus: 3.8,
  },

  score: {
    placee: 10,
    bonusRapide: 15,
    // Bonus si la voiture est placée avec plus de cette part de patience.
    seuilBonus: 0.5,
    gareeSeule: -5,
    // Voiture arrêtée par prudence devant des piétons (une fois par voiture).
    prudence: 5,
  },

  // Occupants qui descendent d'une voiture garée et marchent jusqu'au parc des expos.
  pietons: {
    modeles: [
      'character-female-a', 'character-female-b', 'character-female-c', 'character-female-d',
      'character-female-e', 'character-female-f', 'character-male-a', 'character-male-c',
      'character-male-d', 'character-male-e', 'character-male-f',
    ],
    occupantsMin: 1,
    occupantsMax: 3,
    // Temps entre l'arrêt de la voiture et la descente de chaque occupant (s).
    delaiDescente: 0.6,
    vitesseMin: 1.6,
    vitesseMax: 2.1,
    // Vitesse pour laquelle l'animation de marche ne glisse pas (m/s).
    vitesseAnimation: 2.2,
    // Distance entre l'arrière des voitures garées et le chemin des piétons dans l'allée (m).
    decalageAllee: 0.2,
    // Écart entre deux occupants d'une même voiture qui marchent côte à côte (m).
    ecartGroupe: 0.7,
    largeurPorte: 6,
    dureeDisparition: 0.35,
    // Un piéton ne passe jamais à moins de ça des flancs d'une voiture (m), ni devant son
    // pare-chocs à moins de `margeAvant` si elle est arrêtée, `devantRoulante` si elle roule
    // (il la laisse passer).
    margeCarrosserie: 0.9,
    margeAvant: 1.6,
    devantRoulante: 4,
    // Après tant d'attente devant une voiture arrêtée, il passe devant elle ; après tant,
    // si elle lui barre le chemin, il la contourne (s).
    patience: 1.5,
    patienceContournement: 3,
    // Les voitures : couloir où un piéton les arrête, distance gardée, et anticipation (s).
    couloir: 1.5,
    marge: 2,
    anticipation: 3,
    // Au pas quand un piéton marche à moins de ça de leur couloir, sur cette portée (m, m/s).
    vigilance: 3,
    porteeVigilance: 10,
    vitesseVigilance: 2,
    // Après s'être arrêtée pour un piéton, elle attend ce temps avant de repartir (s),
    // sauf si l'agent lui fait signe.
    delaiRedemarrage: 1.5,
  },

  signe: {
    // Distance à laquelle la voiture de tête remarque le geste (m).
    rayon: 30,
    // Durée du geste (s).
    duree: 0.7,
    // Arrêt par prudence : un signe arrête une voiture qui roule à cette distance de l'agent
    // si des piétons sont à moins de `zonePietons` d'elle. Elle repart seule quand ils
    // sont loin depuis `liberation` secondes (m, m, s).
    rayonArret: 12,
    zonePietons: 8,
    liberation: 1,
    // Une voiture arrêtée par signe repart au plus tard après ce temps (s).
    arretMax: 8,
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
