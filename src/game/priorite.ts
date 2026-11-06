// Priorité piétonne : une voiture ne roule jamais sur un piéton.
// Logique pure, sans Three.js, pour pouvoir la tester.
import type { Point } from './chaussee';

export interface Obstacle {
  point: Point;
  // Demi-largeur du couloir devant la voiture où l'obstacle l'arrête (m).
  demiLargeur: number;
  // Distance gardée entre l'avant de la voiture et l'obstacle (m).
  marge: number;
}

export interface PietonMobile {
  x: number;
  z: number;
  // Vitesse actuelle (m/s), nulle s'il attend.
  vx: number;
  vz: number;
}

export interface ReglagesPriorite {
  couloir: number;
  marge: number;
  // La voiture freine pour l'endroit où sera le piéton dans ce temps (s).
  anticipation: number;
}

// Distance que la voiture (centre `pos`, cap `cap`) peut encore parcourir avant le
// premier obstacle de son couloir, sans dépasser `libre`.
export function distanceLibre(pos: Point, cap: number, demiLongueur: number, libre: number, obstacles: Obstacle[]): number {
  const dir = { x: Math.sin(cap), z: Math.cos(cap) };
  for (const o of obstacles) {
    const dx = o.point.x - pos.x;
    const dz = o.point.z - pos.z;
    const devant = dx * dir.x + dz * dir.z;
    const cote = Math.abs(dx * dir.z - dz * dir.x);
    if (devant > 0 && cote < o.demiLargeur) libre = Math.min(libre, devant - demiLongueur - o.marge);
  }
  return Math.max(0, libre);
}

// Chaque piéton compte deux fois : là où il est, et là où il sera bientôt. La voiture
// freine donc avant qu'il n'entre dans son couloir, pas au dernier moment.
export function obstaclesPietons(pietons: PietonMobile[], r: ReglagesPriorite): Obstacle[] {
  const liste: Obstacle[] = [];
  for (const p of pietons) {
    liste.push({ point: { x: p.x, z: p.z }, demiLargeur: r.couloir, marge: r.marge });
    if (p.vx !== 0 || p.vz !== 0) {
      liste.push({
        point: { x: p.x + p.vx * r.anticipation, z: p.z + p.vz * r.anticipation },
        demiLargeur: r.couloir,
        marge: r.marge,
      });
    }
  }
  return liste;
}

// Voiture vue par un piéton : centre, cap, demi-dimensions et si elle roule.
export interface VoitureVue {
  x: number;
  z: number;
  cap: number;
  demiLongueur: number;
  demiLargeur: number;
  roule: boolean;
}

// Le point p est-il dans la carrosserie de la voiture, élargie de `marge` ?
function dansCarrosserie(p: Point, v: VoitureVue, marge: number): boolean {
  const dx = p.x - v.x;
  const dz = p.z - v.z;
  const long = dx * Math.sin(v.cap) + dz * Math.cos(v.cap);
  const lat = dx * Math.cos(v.cap) - dz * Math.sin(v.cap);
  return Math.abs(long) < v.demiLongueur + marge && Math.abs(lat) < v.demiLargeur + marge;
}

export interface ReglagesPieton {
  // Il laisse passer une voiture qui roule à moins de cette distance devant lui (m).
  distanceVoiture: number;
  // Il ne marche pas plus près que ça d'une carrosserie (m).
  margeCarrosserie: number;
}

// Le piéton peut-il faire son prochain pas ? Il attend une voiture qui roule tout près
// devant lui, et ne marche jamais dans une carrosserie, même à l'arrêt.
// Quand il attend, il ne compte plus que là où il est (vitesse nulle) : la voiture qui
// s'était arrêtée pour lui peut repartir, il n'y a pas d'attente mutuelle.
export function peutAvancer(depuis: Point, vers: Point, voitures: VoitureVue[], r: ReglagesPieton): boolean {
  const l = Math.hypot(vers.x - depuis.x, vers.z - depuis.z);
  if (l === 0) return true;
  const ux = (vers.x - depuis.x) / l;
  const uz = (vers.z - depuis.z) / l;
  const devant = { x: depuis.x + ux * 1.5, z: depuis.z + uz * 1.5 };
  const pas = { x: depuis.x + ux * 0.5, z: depuis.z + uz * 0.5 };
  return voitures.every(
    (v) =>
      !(v.roule && Math.hypot(v.x - devant.x, v.z - devant.z) <= r.distanceVoiture) &&
      // On peut toujours s'éloigner d'une voiture trop proche, jamais s'en approcher.
      !(dansCarrosserie(pas, v, r.margeCarrosserie) && !dansCarrosserie(depuis, v, r.margeCarrosserie)),
  );
}
