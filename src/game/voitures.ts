import * as THREE from 'three';
import { config } from '../config';
import { modele } from '../scene/modeles';
import { chemin, longueur, pointA, type Point } from './chaussee';
import { avancerFile, type VoitureEnFile } from './file';
import { chaussee, places, plan } from './parking';

const v = config.voitures;
const ap = config.approche;
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

// Voiture sortie de la file qui vient vers l'agent.
interface VoitureEnApproche {
  voiture: Voiture;
  // Cap : angle autour de y, l'avant du modèle pointant vers (sin cap, cos cap).
  cap: number;
  // L'agent lui a fait signe : elle vient vite, même s'il sort de son regard.
  appelee: boolean;
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

export function creerVoitures(scene: THREE.Scene) {
  const file: Voiture[] = [];
  let arrivees = 0;
  let enChargement = false;
  let prochaineArrivee = 1;
  let approche: VoitureEnApproche | null = null;
  const cone = creerCone();
  scene.add(cone.objet);

  async function faireArriver(): Promise<void> {
    enChargement = true;
    const nom = v.modeles[Math.floor(Math.random() * v.modeles.length)]!;
    const objet = await modele(`voitures/${nom}`, config.echelles.voiture);
    // Avant du modèle vers +z : un quart de tour pour rouler vers l'est.
    objet.rotation.y = Math.PI / 2;
    const longueur = new THREE.Box3().setFromObject(objet).getSize(new THREE.Vector3()).x;
    const vitesseMax = aleatoire(v.vitesseMin, v.vitesseMax);
    const roues = objet.children.filter((o) => o.name.startsWith('wheel'));
    const voiture: Voiture = { objet, roues, x: xApparition, vitesse: vitesseMax, vitesseMax, longueur };
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

  return {
    mettreAJour(dt: number, agent: THREE.Vector3, signe: boolean): void {
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
      const tete = file[0];
      const teteALaLigne = !approche && tete && tete.x > ligneArret - tete.longueur / 2 - 3;
      if (teteALaLigne) {
        const appelee = signe && tete.objet.position.distanceTo(agent) <= config.signe.rayon;
        if (appelee || voit(avantDe(tete.objet, Math.PI / 2, tete.longueur), Math.PI / 2, agent)) {
          file.shift();
          approche = { voiture: tete, cap: Math.PI / 2, appelee };
        }
      }

      // Obstacles pour la file : l'agent debout sur la voie, et la voiture en approche
      // tant qu'elle n'a pas dégagé la route.
      const obstacles: number[] = [];
      if (Math.abs(agent.z - zVoie) < config.routeEntree.largeur / 4 + 0.8) obstacles.push(agent.x);
      if (approche) {
        const arriere = approche.voiture.objet.position.x - approche.voiture.longueur / 2;
        if (arriere < plan.xPortail + 2) obstacles.push(arriere + v.margeObstacle - v.ecart);
      }
      avancerFile(file, ligneArret, dt, v, obstacles);

      for (const voiture of file) {
        voiture.objet.position.x = voiture.x;
        for (const roue of voiture.roues) roue.rotation.x += (voiture.vitesse * dt) / RAYON_ROUE;
      }

      if (approche) {
        if (signe && approche.voiture.objet.position.distanceTo(agent) <= config.signe.rayon) approche.appelee = true;
        avancerVersAgent(approche, agent, dt);
      }

      // Le cône suit la voiture qui regarde : celle en approche, sinon la tête de file à la ligne.
      const regard = approche ? { voiture: approche.voiture, cap: approche.cap } : teteALaLigne && file[0] ? { voiture: file[0], cap: Math.PI / 2 } : null;
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

// La voiture roule sur la chaussée vers le point le plus proche de l'agent : lentement
// s'il est dans son regard, vite s'il lui a fait signe, sinon elle s'arrête.
// Elle freine pour s'arrêter avant lui : jamais elle ne roule sur l'agent.
function avancerVersAgent(a: VoitureEnApproche, agent: THREE.Vector3, dt: number): void {
  const { voiture } = a;
  const pos = { x: voiture.objet.position.x, z: voiture.objet.position.z };
  const trajet = [pos, ...chemin(chaussee, pos, { x: agent.x, z: agent.z })];
  const reste = longueur(trajet);

  const vise = pointA(trajet, Math.min(ap.visee, reste));
  let ecart = Math.atan2(vise.x - pos.x, vise.z - pos.z) - a.cap;
  ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));

  const avant = avantDe(voiture.objet, a.cap, voiture.longueur);
  let vitesseMax = a.appelee ? ap.vitesseSigne : voit(avant, a.cap, agent) ? ap.vitesseLente : 0;
  // Ralentit dans les virages ; pas de marche arrière : si l'agent est passé derrière, elle attend.
  vitesseMax *= Math.max(0.35, Math.cos(ecart));
  if (Math.abs(ecart) > 110 * DEG) vitesseMax = 0;

  // Elle s'arrête avant l'agent, et à distance de lui en ligne droite aussi.
  const marge = voiture.longueur / 2 + ap.distanceAgent;
  const distance = Math.max(0, Math.min(reste, Math.hypot(agent.x - pos.x, agent.z - pos.z)) - marge);
  const vitesseCible = Math.min(vitesseMax, Math.sqrt(2 * v.freinage * distance));
  voiture.vitesse =
    voiture.vitesse < vitesseCible ? Math.min(vitesseCible, voiture.vitesse + v.acceleration * dt) : vitesseCible;

  // Virage limité par le rayon de braquage : on tourne d'autant plus qu'on avance.
  const virageMax = (voiture.vitesse / ap.rayonBraquage) * dt;
  a.cap += THREE.MathUtils.clamp(ecart, -virageMax, virageMax);
  const pas = Math.min(voiture.vitesse * dt, distance);
  voiture.objet.position.x += Math.sin(a.cap) * pas;
  voiture.objet.position.z += Math.cos(a.cap) * pas;
  voiture.objet.rotation.y = a.cap;
  for (const roue of voiture.roues) roue.rotation.x += pas / RAYON_ROUE;
}
