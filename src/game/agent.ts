import * as THREE from 'three';
import { config } from '../config';
import { modeleAnime } from '../scene/modeles';
import type { Direction } from '../ui/controles';
import { plan } from './parking';

const a = config.agent;

// Zone où l'agent peut marcher : parking, trottoir des expos et route d'entrée.
const zone = {
  xMin: plan.xPortail - config.routeEntree.longueur,
  xMax: plan.asphalte.x2,
  zMin: plan.zNord - config.parking.largeurTrottoir,
  zMax: plan.zSud,
};

type Allure = 'idle' | 'walk' | 'sprint';

export interface Agent {
  objet: THREE.Object3D;
  mettreAJour(direction: Direction, dt: number): void;
}

export async function creerAgent(scene: THREE.Scene): Promise<Agent> {
  const { objet, animations } = await modeleAnime(`personnages/${a.modele}`, config.echelles.personnage);
  objet.position.set(plan.xPortail + a.departX, 0, plan.zEntree + a.departZ);
  scene.add(objet);

  // Anneau jaune au sol : on repère l'agent d'un coup d'œil parmi les piétons.
  const anneau = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 1, 32),
    new THREE.MeshBasicMaterial({ color: config.couleurs.agent, transparent: true, opacity: 0.85 }),
  );
  anneau.rotation.x = -Math.PI / 2;
  anneau.position.y = 0.06;
  scene.add(anneau);

  const mixeur = new THREE.AnimationMixer(objet);
  const actions = new Map<Allure, THREE.AnimationAction>();
  for (const nom of ['idle', 'walk', 'sprint'] as Allure[]) {
    const clip = animations.find((c) => c.name === nom);
    if (clip) actions.set(nom, mixeur.clipAction(clip));
  }
  let allure: Allure = 'idle';
  actions.get(allure)?.play();

  function changerAllure(nouvelle: Allure): void {
    if (nouvelle === allure) return;
    const avant = actions.get(allure);
    const apres = actions.get(nouvelle);
    if (apres) {
      apres.reset().play();
      if (avant) apres.crossFadeFrom(avant, a.fonduAnimation, false);
    }
    allure = nouvelle;
  }

  let angleVise = objet.rotation.y;

  return {
    objet,
    mettreAJour(direction, dt) {
      const intensite = Math.min(1, Math.hypot(direction.x, direction.z));
      if (intensite > 0.05) {
        const pas = a.vitesse * intensite * dt;
        objet.position.x = THREE.MathUtils.clamp(objet.position.x + direction.x * pas, zone.xMin, zone.xMax);
        objet.position.z = THREE.MathUtils.clamp(objet.position.z + direction.z * pas, zone.zMin, zone.zMax);
        angleVise = Math.atan2(direction.x, direction.z);
        changerAllure(intensite > a.seuilCourse ? 'sprint' : 'walk');
      } else {
        changerAllure('idle');
      }

      // Rotation lissée par le chemin le plus court.
      let ecart = angleVise - objet.rotation.y;
      ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
      objet.rotation.y += ecart * Math.min(1, a.vitesseRotation * dt);

      anneau.position.x = objet.position.x;
      anneau.position.z = objet.position.z;
      mixeur.update(dt);
    },
  };
}
