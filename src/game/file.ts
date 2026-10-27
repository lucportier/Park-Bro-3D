// File d'attente sur la route d'entrée : les voitures roulent vers le portail
// (x croissant) et s'arrêtent derrière la ligne d'arrêt ou la voiture de devant.
// Logique pure, sans Three.js, pour pouvoir la tester.

export interface VoitureEnFile {
  // Position du centre de la voiture le long de la route.
  x: number;
  vitesse: number;
  vitesseMax: number;
  longueur: number;
}

export interface ReglagesFile {
  acceleration: number;
  freinage: number;
  // Espace laissé entre deux voitures arrêtées.
  ecart: number;
  // Distance gardée devant un obstacle (l'agent debout sur la voie).
  margeObstacle: number;
}

// Fait avancer toute la file d'un pas de temps. `voitures` est triée de la tête
// (la plus proche du portail) vers la queue. `obstacles` : positions x d'obstacles sur la voie.
export function avancerFile(
  voitures: VoitureEnFile[],
  ligneArret: number,
  dt: number,
  r: ReglagesFile,
  obstacles: number[] = [],
): void {
  let devant: VoitureEnFile | null = null;
  for (const v of voitures) {
    const demi = v.longueur / 2;
    let limite = devant ? devant.x - devant.longueur / 2 - r.ecart - demi : ligneArret - demi;
    for (const o of obstacles) {
      // Seuls comptent les obstacles devant l'arrière de la voiture.
      if (o > v.x - demi) limite = Math.min(limite, o - r.margeObstacle - demi);
    }

    const distance = Math.max(0, limite - v.x);
    // Vitesse qui permet encore de s'arrêter pile à la limite.
    const vitesseCible = Math.min(v.vitesseMax, Math.sqrt(2 * r.freinage * distance));
    v.vitesse = v.vitesse < vitesseCible ? Math.min(vitesseCible, v.vitesse + r.acceleration * dt) : vitesseCible;

    // Jamais au-delà de la limite, et jamais en marche arrière.
    v.x = Math.min(v.x + v.vitesse * dt, Math.max(v.x, limite));
    devant = v;
  }
}
