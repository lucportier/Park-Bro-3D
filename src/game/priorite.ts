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
  // Arrêtée depuis longtemps pour des piétons, elle réclame son tour : aucun nouveau
  // piéton ne s'engage devant elle, ceux qui y sont déjà finissent de passer.
  presse: boolean;
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
export const CONTACT = 0.3;

export interface ReglagesPieton {
  // Distance gardée sur les côtés d'une voiture (m).
  margeCarrosserie: number;
  // Devant le pare-chocs : une voiture à l'arrêt, une voiture qui roule (m).
  margeAvant: number;
  devantRoulante: number;
  // Devant une voiture qui réclame son tour (m).
  devantPresse: number;
  // Distance gardée au flanc d'une voiture qui roule quand il marche le long de sa voie (m).
  margeLonger: number;
}

// Le piéton peut-il faire son prochain pas ? Il n'entre jamais dans la zone d'une voiture :
// ses flancs, et devant elle (bien plus loin si elle roule : il la laisse passer). S'il y
// est déjà, il peut s'en écarter, et passer devant une voiture arrêtée, mais pas se
// rapprocher d'une voiture qui roule. Quand il attend, il ne compte d'abord plus que là où
// il est (vitesse nulle) : la voiture qui s'était arrêtée pour lui peut repartir. S'il
// attend trop longtemps des voitures qui roulent, il insiste (voir pietons.ts).
// `patient` : il attend depuis un moment devant une voiture arrêtée (souvent arrêtée pour
// d'autres piétons) ; il passe alors devant elle ou la longe, sans jamais la toucher.
// `coince` : il n'a pas bougé depuis longtemps ; il se faufile alors entre les voitures
// arrêtées, même celles qui réclament leur tour.
export function peutAvancer(
  depuis: Point,
  vers: Point,
  voitures: VoitureVue[],
  r: ReglagesPieton,
  patient = false,
  coince = false,
): boolean {
  return bloqueur(depuis, vers, voitures, r, patient, coince) === null;
}

// La voiture qui empêche le prochain pas du piéton, ou null.
export function bloqueur(
  depuis: Point,
  vers: Point,
  voitures: VoitureVue[],
  r: ReglagesPieton,
  patient = false,
  coince = false,
): VoitureVue | null {
  const l = Math.hypot(vers.x - depuis.x, vers.z - depuis.z);
  if (l === 0) return null;
  // Il regarde un demi-mètre devant lui, sans dépasser le point qu'il vise.
  const k = Math.min(0.5, l) / l;
  const pas = { x: depuis.x + (vers.x - depuis.x) * k, z: depuis.z + (vers.z - depuis.z) * k };
  const libre = (v: VoitureVue): boolean => {
    // Il cède le passage à une voiture qui roule ou qui réclame son tour. Patient, il
    // frôle une autre voiture arrêtée (à `CONTACT`), devant comme sur les flancs.
    const cede = v.roule || (v.presse && !coince);
    const serre = !cede && (patient || coince);
    const avant = v.roule ? r.devantRoulante : cede ? r.devantPresse : serre ? CONTACT : r.margeAvant;
    const cote = serre ? CONTACT : r.margeCarrosserie;
    const apres = repere(pas, v);
    if (!tropPres(apres, v, cote, avant)) return true;
    const ici = repere(depuis, v);
    // Il peut marcher le long de la voie d'une voiture qui roule, ou s'en écarter, assez
    // loin de son flanc : il ne se met jamais sur son chemin.
    if (cede && apres.lat >= ici.lat - 1e-9 && apres.lat >= v.demiLargeur + r.margeLonger) return true;
    if (!tropPres(ici, v, cote, avant)) return false;
    // Déjà trop près : il ne se colle jamais à la carrosserie, et ne se rapproche pas
    // d'une voiture qui roule.
    if (tropPres(apres, v, CONTACT, CONTACT) && !tropPres(ici, v, CONTACT, CONTACT)) return false;
    return !v.roule || apres.lat >= ici.lat - 1e-9;
  };
  return voitures.find((v) => !libre(v)) ?? null;
}

// Le segment a → b (dans le repère de la voiture) traverse-t-il le rectangle
// [l1, l2] × [-t, t] (en avant, sur le côté) ?
function traverse(a: { long: number; lat: number }, b: { long: number; lat: number }, l1: number, l2: number, t: number): boolean {
  let debut = 0;
  let fin = 1;
  for (const [p, q, min, max] of [
    [a.long, b.long - a.long, l1, l2],
    [a.lat, b.lat - a.lat, -t, t],
  ] as const) {
    if (Math.abs(q) < 1e-12) {
      if (p <= min || p >= max) return false;
      continue;
    }
    const t1 = (min - p) / q;
    const t2 = (max - p) / q;
    debut = Math.max(debut, Math.min(t1, t2));
    fin = Math.min(fin, Math.max(t1, t2));
    if (debut >= fin) return false;
  }
  return true;
}

// Points où passer pour contourner une voiture arrêtée en travers du chemin : un ou
// plusieurs coins de sa carrosserie élargie (de `cote` sur les flancs et à l'arrière, de
// `avant` devant), chacun atteignable en ligne droite depuis le précédent, par le côté
// qui allonge le moins le trajet.
export function contournement(depuis: Point, vers: Point, v: VoitureVue, cote: number, avant: number): Point[] {
  const ax = { x: Math.sin(v.cap), z: Math.cos(v.cap) };
  const lat = { x: Math.cos(v.cap), z: -Math.sin(v.cap) };
  const devant = v.demiLongueur + avant;
  const derriere = -(v.demiLongueur + cote);
  const flanc = v.demiLargeur + cote;
  // Coins dans l'ordre du tour de la voiture (repère local : en avant, sur le côté).
  const locaux = [
    { long: devant, lat: flanc },
    { long: devant, lat: -flanc },
    { long: derriere, lat: -flanc },
    { long: derriere, lat: flanc },
  ];
  const monde = (c: { long: number; lat: number }): Point => ({
    x: v.x + ax.x * c.long + lat.x * c.lat,
    z: v.z + ax.z * c.long + lat.z * c.lat,
  });
  const local = (p: Point) => {
    const dx = p.x - v.x;
    const dz = p.z - v.z;
    return { long: dx * ax.x + dz * ax.z, lat: dx * lat.x + dz * lat.z };
  };
  // Vue dégagée : le segment ne coupe pas la carrosserie élargie (un peu rétrécie, pour
  // longer ses bords). Depuis l'intérieur de cette zone, il garde au moins `CONTACT`.
  const e = 0.05;
  const vue = (a: Point, b: { long: number; lat: number }): boolean => {
    const la = local(a);
    const dedans = la.long > derriere + e && la.long < devant - e && Math.abs(la.lat) < flanc - e;
    return dedans
      ? !traverse(la, b, -v.demiLongueur - CONTACT - e, v.demiLongueur + CONTACT + e, v.demiLargeur + CONTACT + e)
      : !traverse(la, b, derriere + e, devant - e, flanc - e);
  };
  const d = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.z - q.z);
  const coins = locaux.map(monde);
  const lv = local(vers);
  let meilleur: Point[] = [];
  let cout = Infinity;
  for (let i = 0; i < 4; i++) {
    if (!vue(depuis, locaux[i]!)) continue;
    // Le long de la carrosserie dans les deux sens, jusqu'à un coin d'où le but se voit.
    for (const sens of [1, 3]) {
      const chemin = [coins[i]!];
      let c = d(depuis, coins[i]!);
      let j = i;
      for (let n = 0; n < 4; n++) {
        if (!traverse(locaux[j]!, lv, derriere + e, devant - e, flanc - e)) {
          if (c + d(coins[j]!, vers) < cout) {
            cout = c + d(coins[j]!, vers);
            meilleur = [...chemin];
          }
          break;
        }
        const k = (j + sens) % 4;
        c += d(coins[j]!, coins[k]!);
        chemin.push(coins[k]!);
        j = k;
      }
    }
  }
  return meilleur;
}
