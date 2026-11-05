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
  // Fait signe : main levée et onde qui montre jusqu'où porte le geste.
  faireSigne(): void;
}

// Gilet jaune fluo à deux bandes réfléchissantes, accroché à l'os du torse pour
// suivre les animations. Dimensions dans l'unité du modèle Kenney (avant mise à l'échelle).
function creerGilet(): THREE.Group {
  const gilet = new THREE.Group();
  const jaune = new THREE.MeshStandardMaterial({ color: config.couleurs.gilet, roughness: 0.6, emissive: config.couleurs.gilet, emissiveIntensity: 0.15 });
  const bandes = new THREE.MeshStandardMaterial({ color: config.couleurs.giletBandes, roughness: 0.3, metalness: 0.4 });
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.19, 0.3), jaune);
  corps.castShadow = true;
  gilet.add(corps);
  for (const y of [-0.045, 0.035]) {
    const bande = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.025, 0.31), bandes);
    bande.position.y = y;
    gilet.add(bande);
  }
  gilet.position.set(0, 0.06, 0.005);
  return gilet;
}

export async function creerAgent(scene: THREE.Scene): Promise<Agent> {
  const { objet, animations } = await modeleAnime(`personnages/${a.modele}`, config.echelles.personnage);
  objet.position.set(plan.xPortail + a.departX, 0, plan.zEntree + a.departZ);
  objet.getObjectByName('torso')?.add(creerGilet());
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

  // Geste : une main levée au-dessus de la tête, et une onde jaune qui s'étale
  // jusqu'à la portée du signe. (Le bras du modèle est trop court pour se voir d'en haut.)
  const toile = document.createElement('canvas');
  toile.width = toile.height = 128;
  const ctx = toile.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '76px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✋', 64, 70);
  const texteMain = new THREE.CanvasTexture(toile);
  texteMain.colorSpace = THREE.SRGBColorSpace;
  const main = new THREE.Sprite(new THREE.SpriteMaterial({ map: texteMain, transparent: true, depthTest: false }));
  main.scale.setScalar(1.6);
  main.visible = false;
  scene.add(main);
  const onde = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1, 64),
    new THREE.MeshBasicMaterial({ color: config.couleurs.agent, transparent: true, opacity: 0, depthWrite: false }),
  );
  onde.rotation.x = -Math.PI / 2;
  onde.position.y = 0.2;
  onde.visible = false;
  scene.add(onde);
  let tempsSigne = 0;

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

      if (tempsSigne > 0) {
        tempsSigne = Math.max(0, tempsSigne - dt);
        const avancement = 1 - tempsSigne / config.signe.duree;
        main.visible = tempsSigne > 0;
        main.position.set(objet.position.x, 3.4 + 0.3 * Math.sin(avancement * Math.PI), objet.position.z);
        const rayon = 1 + (config.signe.rayon - 1) * Math.min(1, avancement * 1.6);
        onde.scale.setScalar(rayon);
        onde.position.x = objet.position.x;
        onde.position.z = objet.position.z;
        (onde.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - avancement);
        onde.visible = tempsSigne > 0;
      }
    },
    faireSigne() {
      tempsSigne = config.signe.duree;
    },
  };
}
