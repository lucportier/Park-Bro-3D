// Tous les réglages du jeu sont ici. Les valeurs se règlent en jouant.

export const config = {
  couleurs: {
    ciel: 0xbfe3f2,
    sol: 0xd9d4c7,
    repere: 0xff7a45,
  },

  camera: {
    // Inclinaison par rapport au sol, en degrés (90 = vue de dessus).
    inclinaison: 55,
    // Distance entre la caméra et le point regardé.
    distance: 28,
    // Champ de vision vertical, en degrés.
    champ: 40,
  },

  rendu: {
    // Plafond de densité de pixels : au-delà, le téléphone chauffe pour rien.
    densiteMax: 2,
  },
};
