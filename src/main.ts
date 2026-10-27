import * as THREE from 'three';
import { ajusterCamera, creerCamera } from './scene/camera';
import { creerDecor } from './scene/decor';
import { creerRendu, creerScene } from './scene/scene';

const rendu = creerRendu();
const scene = creerScene();
const camera = creerCamera();
creerDecor(scene).catch((erreur) => console.error('Décor non chargé', erreur));

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
  rendu.render(scene, camera);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);
