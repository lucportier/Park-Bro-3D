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

// Chaque piéton compte là où il est, et tout le long du chemin qu'il fera bientôt (un point
// par demi-seconde) : la voiture freine avant qu'il n'entre dans son couloir, pas au
// dernier moment, et ne repart pas pendant qu'il s'en approche.
export function obstaclesPietons(pietons: PietonMobile[], r: ReglagesPriorite): Obstacle[] {
  const liste: Obstacle[] = [];
  for (const p of pietons) {
    const bouge = p.vx !== 0 || p.vz !== 0;
    for (let t = 0; t <= (bouge ? r.anticipation : 0) + 1e-9; t += 0.5) {
      liste.push({ point: { x: p.x + p.vx * t, z: p.z + p.vz * t }, demiLargeur: r.couloir, marge: r.marge });
    }
  }
  return liste;
}

// Un piéton est-il (ou sera-t-il bientôt) près de la voie, devant la voiture ou à côté
// d'elle ? Elle roule alors au pas : elle peut s'arrêter en douceur s'il traverse, et ne
// le dépasse que lentement.
export function pietonPresDeLaVoie(
  pos: Point,
  cap: number,
  demiLongueur: number,
  pietons: PietonMobile[],
  largeur: number,
  portee: number,
  anticipation: number,
): boolean {
  const dir = { x: Math.sin(cap), z: Math.cos(cap) };
  const pres = (x: number, z: number): boolean => {
    const dx = x - pos.x;
    const dz = z - pos.z;
    const devant = dx * dir.x + dz * dir.z;
    return devant > -demiLongueur && devant < portee && Math.abs(dx * dir.z - dz * dir.x) < largeur;
  };
  return pietons.some((p) => pres(p.x, p.z) || pres(p.x + p.vx * anticipation, p.z + p.vz * anticipation));
}

export interface ReglagesPrudence extends ReglagesPriorite {
  vigilance: number;
  porteeVigilance: number;
  vitesseVigilance: number;
  delaiRedemarrage: number;
}

// Plafond de vitesse d'une voiture à cause des piétons : à l'arrêt tant qu'un piéton la
// bloque et encore `delaiRedemarrage` secondes après, puis au pas tant qu'un piéton
// marche près de sa voie devant elle. `etat.reprise` garde l'attente d'une image à l'autre.
export function plafondPietons(
  etat: { reprise: number },
  pos: Point,
  cap: number,
  demiLongueur: number,
  pietons: PietonMobile[],
  r: ReglagesPrudence,
  dt: number,
): number {
  if (distanceLibre(pos, cap, demiLongueur, 1, obstaclesPietons(pietons, r)) < 0.3) etat.reprise = r.delaiRedemarrage;
  else etat.reprise = Math.max(0, etat.reprise - dt);
  if (etat.reprise > 0) return 0;
  if (pietonPresDeLaVoie(pos, cap, demiLongueur, pietons, r.couloir + r.vigilance, r.porteeVigilance + demiLongueur, r.anticipation)) {
    return r.vitesseVigilance;
  }
  return Infinity;
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

// Position du point p dans le repère de la voiture : en avant du centre, et sur le côté.
function repere(p: Point, v: VoitureVue): { long: number; lat: number } {
  const dx = p.x - v.x;
  const dz = p.z - v.z;
  return { long: dx * Math.sin(v.cap) + dz * Math.cos(v.cap), lat: Math.abs(dx * Math.cos(v.cap) - dz * Math.sin(v.cap)) };
}

// Le point est-il trop près de la voiture : à moins de `cote` de ses flancs et de son
// arrière, ou à moins de `avant` devant son pare-chocs ?
function tropPres(q: { long: number; lat: number }, v: VoitureVue, cote: number, avant: number): boolean {
  return q.long > -v.demiLongueur - cote && q.long < v.demiLongueur + avant && q.lat < v.demiLargeur + cote;
}

// Distance en dessous de laquelle un piéton touche presque une carrosserie (m).
const CONTACT = 0.3;

export interface ReglagesPieton {
  // Distance gardée sur les côtés d'une voiture (m).
  margeCarrosserie: number;
  // Devant le pare-chocs : une voiture à l'arrêt, une voiture qui roule (m).
  margeAvant: number;
  devantRoulante: number;
}

// Le piéton peut-il faire son prochain pas ? Il n'entre jamais dans la zone d'une voiture :
// ses flancs, et devant elle (bien plus loin si elle roule : il la laisse passer). S'il y
// est déjà, il peut s'en écarter, et passer devant une voiture arrêtée, mais pas se
// rapprocher d'une voiture qui roule. Quand il attend, il ne compte plus que là où il est
// (vitesse nulle) : la voiture qui s'était arrêtée pour lui peut repartir.
// `patient` : il attend depuis un moment devant une voiture arrêtée (souvent arrêtée pour
// d'autres piétons) ; il passe alors devant elle, sans jamais la toucher.
export function peutAvancer(
  depuis: Point,
  vers: Point,
  voitures: VoitureVue[],
  r: ReglagesPieton,
  patient = false,
): boolean {
  return bloqueur(depuis, vers, voitures, r, patient) === null;
}

// La voiture qui empêche le prochain pas du piéton, ou null.
export function bloqueur(
  depuis: Point,
  vers: Point,
  voitures: VoitureVue[],
  r: ReglagesPieton,
  patient = false,
): VoitureVue | null {
  const l = Math.hypot(vers.x - depuis.x, vers.z - depuis.z);
  if (l === 0) return null;
  const pas = { x: depuis.x + ((vers.x - depuis.x) / l) * 0.5, z: depuis.z + ((vers.z - depuis.z) / l) * 0.5 };
  const libre = (v: VoitureVue): boolean => {
    const avant = v.roule ? r.devantRoulante : patient ? CONTACT : r.margeAvant;
    const apres = repere(pas, v);
    if (!tropPres(apres, v, r.margeCarrosserie, avant)) return true;
    const ici = repere(depuis, v);
    if (!tropPres(ici, v, r.margeCarrosserie, avant)) return false;
    // Déjà trop près : il ne se colle jamais à la carrosserie, et ne se rapproche pas
    // d'une voiture qui roule.
    if (tropPres(apres, v, CONTACT, CONTACT) && !tropPres(ici, v, CONTACT, CONTACT)) return false;
    return !v.roule || apres.lat >= ici.lat - 1e-9;
  };
  return voitures.find((v) => !libre(v)) ?? null;
}

// Point où passer pour contourner une voiture arrêtée en travers du chemin : le coin de sa
// carrosserie (élargie de `marge`) qui allonge le moins le trajet, du côté du piéton.
export function contournement(depuis: Point, vers: Point, v: VoitureVue, marge: number): Point {
  const ax = { x: Math.sin(v.cap), z: Math.cos(v.cap) };
  const lat = { x: Math.cos(v.cap), z: -Math.sin(v.cap) };
  const coins: Point[] = [];
  for (const sl of [-1, 1]) {
    for (const st of [-1, 1]) {
      const l = sl * (v.demiLongueur + marge);
      const t = st * (v.demiLargeur + marge);
      coins.push({ x: v.x + ax.x * l + lat.x * t, z: v.z + ax.z * l + lat.z * t });
    }
  }
  const d = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.z - q.z);
  // Les deux coins les plus proches du piéton sont de son côté : il y va sans traverser la voiture.
  const proches = coins.sort((p, q) => d(depuis, p) - d(depuis, q)).slice(0, 2);
  return proches.reduce((m, c) => (d(depuis, c) + d(c, vers) < d(depuis, m) + d(m, vers) ? c : m));
}
