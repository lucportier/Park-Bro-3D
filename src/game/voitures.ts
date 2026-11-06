import * as THREE from 'three';
import { config } from '../config';
import { modele } from '../scene/modeles';
import { chemin, longueur, pointA, type Point } from './chaussee';
import { avancerFile, type VoitureEnFile } from './file';
import { chaussee, entreeDePlace, places, placesOccupeesAuDepart, plan, type Place } from './parking';

const v = config.voitures;
const ap = config.approche;
const ga = config.garage;
const DEG = Math.PI / 180;

// On roule à droite : la voie qui mène au parking est côté sud de la route.
const zVoie = plan.zEntree + config.routeEntree.largeur / 4;
// L'avant de la tête de file s'arrête sur la ligne d'arrêt, à l'entrée du parking.
const ligneArret = plan.xLigneArret;
const xApparition = plan.xPortail - config.routeEntree.longueur;
// Il n'arrive pas plus de voitures que de places libres.
const placesLibres = places.length - config.parking.voituresGareesAuDepart;
const RAYON_ROUE = 0.3 * config.echelles.voiture;

interface Voiture extends VoitureEnFile {
  objet: THREE.Object3D;
  roues: THREE.Object3D[];
}

// Voiture sortie de la file, qui roule dans le parking : vers l'agent, puis vers sa place.
interface Roulante {
  voiture: Voiture;
  // Cap : angle autour de y, l'avant du modèle pointant vers (sin cap, cos cap).
  cap: number;
  // Ordre de départ : une voiture cède le passage à celles parties avant elle.
  ordre: number;
  // L'agent lui a fait signe : elle vient vite, même s'il sort de son regard.
  appelee: boolean;
  // Place choisie par le joueur (null tant qu'elle vient vers l'agent).
  place: Place | null;
  // Manœuvre finale vers le centre de la place : courbe échantillonnée et distance parcourue.
  courbe: { points: Point[]; s: number } | null;
}

type Obstacle = { point: Point; demiLargeur: number; marge: number };

// Distance que la voiture peut encore parcourir avant un obstacle dans son couloir.
function libreDevant(r: Roulante, libre: number, obstacles: Obstacle[]): number {
  const pos = r.voiture.objet.position;
  const dir = { x: Math.sin(r.cap), z: Math.cos(r.cap) };
  for (const o of obstacles) {
    const dx = o.point.x - pos.x;
    const dz = o.point.z - pos.z;
    const devant = dx * dir.x + dz * dir.z;
    const cote = Math.abs(dx * dir.z - dz * dir.x);
    if (devant > 0 && cote < o.demiLargeur) libre = Math.min(libre, devant - r.voiture.longueur / 2 - o.marge);
  }
  return Math.max(0, libre);
}

// Courbe de Bézier de la position actuelle au centre de la place, qui arrive nez en avant.
function courbeVersPlace(r: Roulante, place: Place): Point[] {
  const p0 = { x: r.voiture.objet.position.x, z: r.voiture.objet.position.z };
  const p3 = { x: place.x, z: place.z };
  const k = Math.max(1.5, distance2D(p0, p3) * 0.45);
  const p1 = { x: p0.x + Math.sin(r.cap) * k, z: p0.z + Math.cos(r.cap) * k };
  const p2 = { x: p3.x - Math.sin(place.angle) * k, z: p3.z - Math.cos(place.angle) * k };
  const points: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    points.push({ x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, z: a * p0.z + b * p1.z + c * p2.z + d * p3.z });
  }
  return points;
}

function avantDe(objet: THREE.Object3D, cap: number, longueurVoiture: number): Point {
  return {
    x: objet.position.x + Math.sin(cap) * (longueurVoiture / 2),
    z: objet.position.z + Math.cos(cap) * (longueurVoiture / 2),
  };
}

// L'agent est-il dans le cône de regard du conducteur ?
function voit(avant: Point, cap: number, agent: THREE.Vector3): boolean {
  const dx = agent.x - avant.x;
  const dz = agent.z - avant.z;
  const d = Math.hypot(dx, dz);
  if (d > ap.porteeRegard) return false;
  if (d < ap.distanceAgent + 1) return true;
  const ecart = Math.atan2(Math.sin(Math.atan2(dx, dz) - cap), Math.cos(Math.atan2(dx, dz) - cap));
  return Math.abs(ecart) <= ap.angleRegard * DEG;
}

// Cône du regard peint au sol, en dégradé : blanc discret, jaune quand l'agent y est.
function creerCone(): { objet: THREE.Group; materiau: THREE.MeshBasicMaterial } {
  const toile = document.createElement('canvas');
  toile.width = toile.height = 256;
  const ctx = toile.getContext('2d')!;
  const degrade = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  degrade.addColorStop(0, 'rgba(255,255,255,0.4)');
  degrade.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 256, 256);
  const materiau = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(toile),
    color: config.couleurs.regard,
    transparent: true,
    depthWrite: false,
  });
  const angle = ap.angleRegard * DEG;
  // Secteur centré sur +y, couché au sol il pointe vers -z ; le groupe le tourne ensuite.
  const secteur = new THREE.Mesh(new THREE.CircleGeometry(ap.porteeRegard, 32, Math.PI / 2 - angle, 2 * angle), materiau);
  secteur.rotation.x = -Math.PI / 2;
  const objet = new THREE.Group();
  objet.add(secteur);
  objet.position.y = 0.18;
  objet.visible = false;
  return { objet, materiau };
}

function aleatoire(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function distance2D(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Fait rouler une voiture le long d'un trajet sur la chaussée, à droite de la ligne
// médiane, en freinant pour s'arrêter après `distanceLibre` mètres. Elle s'arrête aussi
// devant tout obstacle dans son couloir : jamais elle ne roule sur l'agent.
function rouler(
  r: Roulante,
  trajet: Point[],
  vitesseMax: number,
  distanceLibre: number,
  obstacles: Obstacle[],
  visee: number,
  dt: number,
): void {
  const { voiture } = r;
  const pos = { x: voiture.objet.position.x, z: voiture.objet.position.z };
  const reste = longueur(trajet);

  // Point visé un peu devant sur le trajet, décalé vers la droite tant qu'on n'est pas
  // près du but (on roule à droite : deux voitures se croisent sans se toucher).
  const d = Math.min(visee, reste);
  const vise = pointA(trajet, d);
  const plusLoin = pointA(trajet, Math.min(d + 0.5, reste));
  const l = distance2D(vise, plusLoin);
  const decalage = ga.decalageDroite * THREE.MathUtils.clamp((reste - 4) / 4, 0, 1);
  if (l > 0.01) {
    const droiteX = -(plusLoin.z - vise.z) / l;
    const droiteZ = (plusLoin.x - vise.x) / l;
    vise.x += droiteX * decalage;
    vise.z += droiteZ * decalage;
  }
  let ecart = Math.atan2(vise.x - pos.x, vise.z - pos.z) - r.cap;
  ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));

  // Ralentit dans les virages ; pas de marche arrière : si le but est derrière, elle attend.
  let vMax = vitesseMax * Math.max(0.35, Math.cos(ecart));
  if (Math.abs(ecart) > 110 * DEG) vMax = 0;

  const libre = libreDevant(r, distanceLibre, obstacles);

  const vitesseCible = Math.min(vMax, Math.sqrt(2 * v.freinage * libre));
  voiture.vitesse =
    voiture.vitesse < vitesseCible ? Math.min(vitesseCible, voiture.vitesse + v.acceleration * dt) : vitesseCible;

  // Virage limité par le rayon de braquage : on tourne d'autant plus qu'on avance.
  const virageMax = (voiture.vitesse / ap.rayonBraquage) * dt;
  r.cap += THREE.MathUtils.clamp(ecart, -virageMax, virageMax);
  const pas = Math.min(voiture.vitesse * dt, libre);
  voiture.objet.position.x += Math.sin(r.cap) * pas;
  voiture.objet.position.z += Math.cos(r.cap) * pas;
  voiture.objet.rotation.y = r.cap;
  for (const roue of voiture.roues) roue.rotation.x += pas / RAYON_ROUE;
}

// Rectangles jaunes sur les places libres, visibles quand une voiture attend sa place.
function creerSurbrillances(scene: THREE.Scene): { meshes: THREE.Mesh[]; materiau: THREE.MeshBasicMaterial } {
  const materiau = new THREE.MeshBasicMaterial({
    color: config.couleurs.agent,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const geometrie = new THREE.PlaneGeometry(config.parking.largeurPlace - 0.5, config.parking.profondeurPlace - 0.6);
  const meshes = places.map((pl) => {
    const m = new THREE.Mesh(geometrie, materiau);
    m.rotation.x = -Math.PI / 2;
    m.position.set(pl.x, 0.05, pl.z);
    m.visible = false;
    scene.add(m);
    return m;
  });
  return { meshes, materiau };
}

export function creerVoitures(scene: THREE.Scene) {
  const file: Voiture[] = [];
  let arrivees = 0;
  let enChargement = false;
  let prochaineArrivee = 1;
  let departs = 0;
  // Voiture qui vient vers l'agent (une seule à la fois), et celles qui vont se garer.
  let approche: Roulante | null = null;
  const garages: Roulante[] = [];
  const libres = places.map((pl) => !placesOccupeesAuDepart.includes(pl.id));
  const cone = creerCone();
  scene.add(cone.objet);
  const surbrillances = creerSurbrillances(scene);
  let temps = 0;
  let agentPos = new THREE.Vector3();

  async function faireArriver(): Promise<void> {
    enChargement = true;
    const nom = v.modeles[Math.floor(Math.random() * v.modeles.length)]!;
    const objet = await modele(`voitures/${nom}`, config.echelles.voiture);
    // Avant du modèle vers +z : un quart de tour pour rouler vers l'est.
    objet.rotation.y = Math.PI / 2;
    const longueurVoiture = new THREE.Box3().setFromObject(objet).getSize(new THREE.Vector3()).x;
    const vitesseMax = aleatoire(v.vitesseMin, v.vitesseMax);
    const roues = objet.children.filter((o) => o.name.startsWith('wheel'));
    const voiture: Voiture = { objet, roues, x: xApparition, vitesse: vitesseMax, vitesseMax, longueur: longueurVoiture };
    objet.position.set(voiture.x, 0, zVoie);
    scene.add(objet);
    file.push(voiture);
    arrivees++;
    enChargement = false;
  }

  // La dernière voiture a-t-elle dégagé l'entrée de la route ?
  function entreeLibre(): boolean {
    const derniere = file[file.length - 1];
    return !derniere || derniere.x - derniere.longueur / 2 > xApparition + 6 + v.ecart;
  }

  function teteALaLigne(): Voiture | null {
    const tete = file[0];
    return tete && tete.x > ligneArret - tete.longueur / 2 - 3 ? tete : null;
  }

  function sortirDeLaFile(voiture: Voiture, appelee: boolean): Roulante {
    file.shift();
    return { voiture, cap: Math.PI / 2, ordre: departs++, appelee, place: null, courbe: null };
  }

  // Voiture prête à recevoir une place : celle venue près de l'agent, ou la tête de
  // file à la ligne si l'agent se tient tout près d'elle.
  function voiturePrete(): { roulante: Roulante | null; tete: Voiture | null } | null {
    if (approche && approche.voiture.objet.position.distanceTo(agentPos) <= ga.distanceChoix) {
      return { roulante: approche, tete: null };
    }
    const tete = !approche ? teteALaLigne() : null;
    if (tete && tete.objet.position.distanceTo(agentPos) <= ga.distanceChoix) return { roulante: null, tete };
    return null;
  }

  // Obstacles pour une voiture qui roule : l'agent, et les voitures parties avant elle.
  function obstaclesPour(r: Roulante) {
    // En se garant, la voiture roule au pas : elle peut s'approcher plus près de l'agent.
    const marge = r.place ? ga.margeAgent : ap.distanceAgent;
    const liste = [{ point: { x: agentPos.x, z: agentPos.z }, demiLargeur: ga.couloirAgent, marge }];
    for (const autre of garages) {
      if (autre !== r && autre.ordre < r.ordre) {
        const p = autre.voiture.objet.position;
        liste.push({ point: { x: p.x, z: p.z }, demiLargeur: ga.couloirVoiture, marge: autre.voiture.longueur / 2 + v.ecart });
      }
    }
    return liste;
  }

  function avancerVersAgent(r: Roulante, dt: number): void {
    const pos = { x: r.voiture.objet.position.x, z: r.voiture.objet.position.z };
    const agent = { x: agentPos.x, z: agentPos.z };
    const trajet = [pos, ...chemin(chaussee, pos, agent, r.cap)];
    const avant = avantDe(r.voiture.objet, r.cap, r.voiture.longueur);
    const vitesseMax = r.appelee ? ap.vitesseSigne : voit(avant, r.cap, agentPos) ? ap.vitesseLente : 0;
    // Elle s'arrête avant l'agent, le long du trajet comme en ligne droite.
    const libre = Math.min(longueur(trajet), distance2D(pos, agent)) - r.voiture.longueur / 2 - ap.distanceAgent;
    rouler(r, trajet, vitesseMax, libre, obstaclesPour(r), ap.visee, dt);
  }

  // Roule jusqu'à l'allée devant la place, puis y entre en marche avant par une courbe douce.
  function allerSeGarer(r: Roulante, dt: number): boolean {
    const place = r.place!;
    const voiture = r.voiture;
    if (!r.courbe) {
      const pos = { x: voiture.objet.position.x, z: voiture.objet.position.z };
      const trajet = [pos, ...chemin(chaussee, pos, entreeDePlace(place), r.cap)];
      // Assez près de l'entrée de la place (et devant elle) : on lance la manœuvre.
      if (longueur(trajet) <= ga.distanceManoeuvre) {
        r.courbe = { points: courbeVersPlace(r, place), s: 0 };
      } else {
        rouler(r, trajet, ga.vitesse, longueur(trajet), obstaclesPour(r), ap.visee, dt);
        return false;
      }
    }

    const { points } = r.courbe;
    const total = longueur(points);
    const libre = libreDevant(r, total - r.courbe.s, obstaclesPour(r));
    const vitesseCible = Math.min(ga.vitesseManoeuvre, Math.sqrt(2 * v.freinage * libre) + 0.3);
    voiture.vitesse =
      voiture.vitesse < vitesseCible ? Math.min(vitesseCible, voiture.vitesse + v.acceleration * dt) : vitesseCible;
    const pas = Math.min(voiture.vitesse * dt, libre);
    r.courbe.s = Math.min(total, r.courbe.s + pas);
    const ici = pointA(points, r.courbe.s);
    const devant = pointA(points, Math.min(total, r.courbe.s + 0.3));
    if (distance2D(ici, devant) > 0.01) r.cap = Math.atan2(devant.x - ici.x, devant.z - ici.z);
    voiture.objet.position.x = ici.x;
    voiture.objet.position.z = ici.z;
    voiture.objet.rotation.y = r.cap;
    for (const roue of voiture.roues) roue.rotation.x += pas / RAYON_ROUE;
    if (r.courbe.s < total - 0.01) return false;
    voiture.objet.rotation.y = place.angle;
    voiture.vitesse = 0;
    return true;
  }

  return {
    // Le joueur a tapé une place : la voiture prête s'y rend, si la place est libre.
    choisirPlace(place: Place): boolean {
      const prete = voiturePrete();
      if (!prete || !libres[place.id]) return false;
      const r = prete.roulante ?? sortirDeLaFile(prete.tete!, false);
      if (r === approche) approche = null;
      r.place = place;
      libres[place.id] = false;
      garages.push(r);
      return true;
    },

    mettreAJour(dt: number, agent: THREE.Vector3, signe: boolean): void {
      agentPos = agent;
      temps += dt;
      prochaineArrivee -= dt;
      if (
        prochaineArrivee <= 0 &&
        !enChargement &&
        file.length < v.fileMax &&
        arrivees < placesLibres &&
        entreeLibre()
      ) {
        prochaineArrivee = aleatoire(v.intervalleMin, v.intervalleMax);
        faireArriver().catch((erreur) => console.error('Voiture non chargée', erreur));
      }

      // La tête de file arrivée à la ligne part vers l'agent si elle le voit ou s'il lui fait signe.
      const tete = !approche ? teteALaLigne() : null;
      if (tete) {
        const appelee = signe && tete.objet.position.distanceTo(agent) <= config.signe.rayon;
        const proche = tete.objet.position.distanceTo(agent) <= ga.distanceChoix;
        if (appelee || (!proche && voit(avantDe(tete.objet, Math.PI / 2, tete.longueur), Math.PI / 2, agent))) {
          approche = sortirDeLaFile(tete, appelee);
        }
      }

      // Obstacles pour la file : l'agent debout sur la voie, et les voitures sorties de la
      // file tant qu'elles n'ont pas dégagé la route.
      const obstacles: number[] = [];
      if (Math.abs(agent.z - zVoie) < config.routeEntree.largeur / 4 + 0.8) obstacles.push(agent.x);
      for (const r of approche ? [approche, ...garages] : garages) {
        const arriere = r.voiture.objet.position.x - r.voiture.longueur / 2;
        if (arriere < plan.xPortail + 2) obstacles.push(arriere + v.margeObstacle - v.ecart);
      }
      avancerFile(file, ligneArret, dt, v, obstacles);

      for (const voiture of file) {
        voiture.objet.position.x = voiture.x;
        for (const roue of voiture.roues) roue.rotation.x += (voiture.vitesse * dt) / RAYON_ROUE;
      }

      if (approche) {
        if (signe && approche.voiture.objet.position.distanceTo(agent) <= config.signe.rayon) approche.appelee = true;
        approche.ordre = departs; // toujours la dernière servie : elle cède le passage
        avancerVersAgent(approche, dt);
      }
      for (let i = garages.length - 1; i >= 0; i--) {
        if (allerSeGarer(garages[i]!, dt)) garages.splice(i, 1);
      }

      // Places libres en surbrillance pendant qu'une voiture attend sa place.
      const attend = voiturePrete() !== null;
      surbrillances.materiau.opacity = 0.22 + 0.12 * Math.sin(temps * 5);
      surbrillances.meshes.forEach((m, i) => (m.visible = attend && libres[i]!));

      // Le cône suit la voiture qui regarde : celle en approche, sinon la tête de file à la ligne.
      const teteVisible = teteALaLigne();
      const regard = approche
        ? { voiture: approche.voiture, cap: approche.cap }
        : teteVisible
          ? { voiture: teteVisible, cap: Math.PI / 2 }
          : null;
      cone.objet.visible = regard !== null;
      if (regard) {
        const avant = avantDe(regard.voiture.objet, regard.cap, regard.voiture.longueur);
        cone.objet.position.x = avant.x;
        cone.objet.position.z = avant.z;
        cone.objet.rotation.y = regard.cap + Math.PI;
        cone.materiau.color.set(
          voit(avant, regard.cap, agent) || approche?.appelee ? config.couleurs.agent : config.couleurs.regard,
        );
      }
    },
  };
}
