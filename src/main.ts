import * as THREE from 'three';
import { ajusterCamera, creerCamera } from './scene/camera';
import { creerRendu, creerScene } from './scene/scene';

const rendu = creerRendu();
const scene = creerScene();
const camera = creerCamera();
const repere = scene.getObjectByName('repere');

function redimensionner(): void {
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  rendu.setSize(largeur, hauteur);
  ajusterCamera(camera, largeur, hauteur);
}
window.addEventListener('resize', redimensionner);
redimensionner();

const horloge = new THREE.Timer();

function boucle(temps: number): void {
  horloge.update(temps);
  // Plafonné : un onglet revenu au premier plan ne doit pas faire de bond.
  const dt = Math.min(horloge.getDelta(), 0.1);
  if (repere) repere.rotation.y += dt * 0.6;
  rendu.render(scene, camera);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);
