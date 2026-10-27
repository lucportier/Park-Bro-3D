import * as THREE from 'three';
import { config } from '../config';
import { modele } from '../scene/modeles';
import { avancerFile, type VoitureEnFile } from './file';
import { places, plan } from './parking';

const v = config.voitures;

// On roule à droite : la voie qui mène au portail est côté sud de la route.
const zVoie = plan.zEntree + config.routeEntree.largeur / 4;
// L'avant de la tête de file s'arrête juste devant la barrière.
const ligneArret = plan.xPortail - 1;
const xApparition = plan.xPortail - config.routeEntree.longueur;
// Il n'arrive pas plus de voitures que de places libres.
const placesLibres = places.length - config.parking.voituresGareesAuDepart;
const RAYON_ROUE = 0.3 * config.echelles.voiture;

interface Voiture extends VoitureEnFile {
  objet: THREE.Object3D;
  roues: THREE.Object3D[];
}

function aleatoire(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function creerVoitures(scene: THREE.Scene) {
  const file: Voiture[] = [];
  let arrivees = 0;
  let enChargement = false;
  let prochaineArrivee = 1;

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
    mettreAJour(dt: number, agent: THREE.Vector3): void {
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

      // L'agent debout sur la voie est un obstacle : les voitures l'attendent.
      const surLaVoie = Math.abs(agent.z - zVoie) < config.routeEntree.largeur / 4 + 0.8;
      avancerFile(file, ligneArret, dt, v, surLaVoie ? [agent.x] : []);

      for (const voiture of file) {
        voiture.objet.position.x = voiture.x;
        for (const roue of voiture.roues) roue.rotation.x += (voiture.vitesse * dt) / RAYON_ROUE;
      }
    },
  };
}
