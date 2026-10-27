import * as THREE from 'three';
import { config } from '../config';

export function creerCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(config.camera.champ, 1, 0.5, 300);
  viser(camera, new THREE.Vector3(0, 0, 0));
  return camera;
}

const cibleLissee = new THREE.Vector3();

// Fait glisser doucement la caméra vers sa cible (l'agent).
export function suivre(camera: THREE.PerspectiveCamera, cible: THREE.Vector3, dt: number, immediat = false): void {
  if (immediat) cibleLissee.copy(cible);
  else cibleLissee.lerp(cible, 1 - Math.exp(-config.camera.suivi * dt));
  viser(camera, cibleLissee);
}

// Place la caméra au-dessus et en arrière de la cible, inclinée vers elle.
function viser(camera: THREE.PerspectiveCamera, cible: THREE.Vector3): void {
  const angle = THREE.MathUtils.degToRad(config.camera.inclinaison);
  const d = config.camera.distance;
  camera.position.set(cible.x, cible.y + Math.sin(angle) * d, cible.z + Math.cos(angle) * d);
  camera.lookAt(cible);
}

export function ajusterCamera(camera: THREE.PerspectiveCamera, largeur: number, hauteur: number): void {
  camera.aspect = largeur / hauteur;
  // En portrait (téléphone), on élargit le champ pour garder la même largeur de vue.
  camera.fov = camera.aspect < 1 ? config.camera.champ / Math.max(camera.aspect, 0.5) : config.camera.champ;
  camera.updateProjectionMatrix();
}
