import * as THREE from 'three';
import './ui/style.css';
import { creerAgent, type Agent } from './game/agent';
import { creerVoitures } from './game/voitures';
import { ajusterCamera, creerCamera, suivre } from './scene/camera';
import { creerDecor } from './scene/decor';
import { creerRendu, creerScene } from './scene/scene';
import { lireDirection, signeDemande } from './ui/controles';

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
    voitures.mettreAJour(dt, agent.objet.position, signe);
  }
  rendu.render(scene, camera);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);
