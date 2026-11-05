import { config } from '../config';
import type { Reseau } from './chaussee';

// Plan du parking, vu de dessus : x vers la droite, z vers le bas de l'écran.
// Le parc des expos est au nord (z négatif), la route d'entrée arrive par l'ouest.
//
//   ── trottoir ──────────────── parc des expos
//   rangée A  ▮▮▮▮▮ ┊ ▮▮▮▮▮
//   allée 1   ═══════════════
//   rangée B  ▮▮▮▮▮ ┊ ▮▮▮▮▮
//   rangée C  ▮▮▮▮▮ ┊ ▮▮▮▮▮
//   allée 2   ═══════════════ ◄── portail ◄── route d'entrée
//   rangée D  ▮▮▮▮▮ ┊ ▮▮▮▮▮

export interface Place {
  id: number;
  x: number;
  z: number;
  // Rotation de la voiture garée (le nez vers le fond de la place).
  angle: number;
}

export interface Rect {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

const p = config.parking;
const demiPassage = p.largeurAlleePietonne / 2;
const largeurDemiRangee = p.placesParDemiRangee * p.largeurPlace;
const xBord = demiPassage + largeurDemiRangee;

// Bords nord des bandes, du nord au sud, parking centré sur z = 0.
const zA = -(4 * p.profondeurPlace + 2 * p.largeurAllee) / 2;
const zAllee1 = zA + p.profondeurPlace;
const zB = zAllee1 + p.largeurAllee;
const zC = zB + p.profondeurPlace;
const zAllee2 = zC + p.profondeurPlace;
const zD = zAllee2 + p.largeurAllee;
const zFin = zD + p.profondeurPlace;

// Rangées : bord nord et sens du nez des voitures (vers l'allée opposée).
const rangees = [
  { z: zA, angle: Math.PI }, // nez au nord
  { z: zB, angle: 0 }, // nez au sud
  { z: zC, angle: Math.PI },
  { z: zD, angle: 0 },
];

function creerPlaces(): Place[] {
  const places: Place[] = [];
  for (const rangee of rangees) {
    const zCentre = rangee.z + p.profondeurPlace / 2;
    for (const cote of [-1, 1]) {
      for (let i = 0; i < p.placesParDemiRangee; i++) {
        const x = cote * (demiPassage + (i + 0.5) * p.largeurPlace);
        places.push({ id: places.length, x, z: zCentre, angle: rangee.angle });
      }
    }
  }
  return places;
}

export const places = creerPlaces();

// Voies de circulation latérales qui relient les deux allées.
const largeurVoieLaterale = p.largeurAllee;

export const plan = {
  asphalte: { x1: -xBord - largeurVoieLaterale, z1: zA, x2: xBord + largeurVoieLaterale, z2: zFin } as Rect,
  allees: [
    { x1: -xBord - largeurVoieLaterale, z1: zAllee1, x2: xBord + largeurVoieLaterale, z2: zB },
    { x1: -xBord - largeurVoieLaterale, z1: zAllee2, x2: xBord + largeurVoieLaterale, z2: zD },
  ] as Rect[],
  rangees: rangees.map((r) => r.z),
  xBord,
  demiPassage,
  zNord: zA,
  zSud: zFin,
  // Centre de l'allée par laquelle arrivent les voitures.
  zEntree: zAllee2 + p.largeurAllee / 2,
  // Entrée du parking (pas de barrière : elle reste levée dès 8 h).
  xPortail: -xBord - largeurVoieLaterale,
  // Ligne peinte sur la route où la tête de file s'arrête pour attendre l'agent.
  xLigneArret: -xBord - largeurVoieLaterale - 1,
};

// Chaussée sur laquelle une voiture peut venir vers l'agent : lignes médianes de la
// voie d'arrivée (depuis la ligne d'arrêt), des deux allées et des deux voies latérales.
const xOuest = plan.asphalte.x1 + largeurVoieLaterale / 2;
const xEst = plan.asphalte.x2 - largeurVoieLaterale / 2;
const zNordAllee = zAllee1 + p.largeurAllee / 2;
const zSudAllee = plan.zEntree;

export const chaussee: Reseau = {
  noeuds: [
    { x: plan.xLigneArret, z: plan.zEntree + config.routeEntree.largeur / 4 },
    { x: xOuest, z: zSudAllee },
    { x: xEst, z: zSudAllee },
    { x: xEst, z: zNordAllee },
    { x: xOuest, z: zNordAllee },
  ],
  aretes: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ],
};
