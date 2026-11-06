// Calcul du score et de la perte de patience. Logique pure, testée.

export interface ReglagesScore {
  placee: number;
  bonusRapide: number;
  // Part de patience restante au-dessus de laquelle le bonus est accordé.
  seuilBonus: number;
  gareeSeule: number;
}

// Points gagnés quand le joueur place une voiture, selon la patience qui lui reste (0 à 1).
export function pointsPlacement(patienceRestante: number, r: ReglagesScore): number {
  return r.placee + (patienceRestante > r.seuilBonus ? r.bonusRapide : 0);
}

// Le score ne descend jamais sous 0.
export function ajouter(score: number, points: number): number {
  return Math.max(0, score + points);
}

// Patience perdue pendant dt : la tête de file à plein régime, les suivantes moins vite.
export function perteDePatience(estEnTete: boolean, dt: number, ratioSuivantes: number): number {
  return estEnTete ? dt : dt * ratioSuivantes;
}
