import * as THREE from 'three';
import './ui/style.css';
import { creerAgent, type Agent } from './game/agent';
import { creerVoitures } from './game/voitures';
import { ajusterCamera, creerCamera, suivre } from './scene/camera';
import { creerDecor } from './scene/decor';
import { creerRendu, creerScene } from './scene/scene';
import { lireDirection, prendreTap, signeDemande } from './ui/controles';
import { placeSous } from './game/parking';

const rendu = creerRendu();
const scene = creerScene();
const camera = creerCamera();
creerDecor(scene).catch((erreur) => console.error('Décor non chargé', erreur));

const voitures = creerVoitures(scene);
let agent: Agent | null = null;
creerAgent(scene)
  .then((a) => {
    agent = a;
    suivre(camera, a.objet.position, 0, true);
  })
  .catch((erreur) => console.error('Agent non chargé', erreur));

function redimensionner(): void {
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  rendu.setSize(largeur, hauteur);
  ajusterCamera(camera, largeur, hauteur);
}
window.addEventListener('resize', redimensionner);
redimensionner();

// Un tap ou un clic sur une place libre l'attribue à la voiture qui attend.
const lanceur = new THREE.Raycaster();
const sol = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function taper(x: number, y: number): void {
  const ecran = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  lanceur.setFromCamera(ecran, camera);
  const point = lanceur.ray.intersectPlane(sol, new THREE.Vector3());
  const place = point && placeSous(point.x, point.z);
  if (place) voitures.choisirPlace(place);
}

const horloge = new THREE.Timer();

function boucle(temps: number): void {
  horloge.update(temps);
  // Plafonné : un onglet revenu au premier plan ne doit pas faire de bond.
  const dt = Math.min(horloge.getDelta(), 0.1);
  if (agent) {
    const signe = signeDemande();
    if (signe) agent.faireSigne();
    agent.mettreAJour(lireDirection(), dt);
    suivre(camera, agent.objet.position, dt);
    const tap = prendreTap();
    if (tap) taper(tap.x, tap.y);
    voitures.mettreAJour(dt, agent.objet.position, signe);
  }
  rendu.render(scene, camera);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);
