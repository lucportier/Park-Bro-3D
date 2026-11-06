import * as THREE from 'three';
import { config } from '../config';
import { modeleAnime } from '../scene/modeles';
import type { Point } from './chaussee';
import { plan, type Place } from './parking';
import { bloqueur, contournement, type PietonMobile, type VoitureVue } from './priorite';

const pc = config.pietons;
const p = config.parking;

// Les occupants d'une voiture garée marchent jusqu'à l'entrée du parc des expos :
// le long de l'arrière des voitures, puis par l'allée piétonne centrale et ses passages,
// puis le trottoir.

interface Pieton extends PietonMobile {
  objet: THREE.Object3D;
  mixeur: THREE.AnimationMixer;
  marche: THREE.AnimationAction;
  repos: THREE.AnimationAction;
  trajet: Point[];
  etape: number;
  vitesse: number;
  // Délai avant de descendre de la voiture (s), puis disparition à la porte.
  attente: number;
  // Temps passé à attendre une voiture (s).
  bloque: number;
  disparition: number;
  apparition: number;
  enMarche: boolean;
}

function aleatoire(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Trajet d'un occupant depuis l'arrière de sa voiture jusqu'à la porte des expos.
// Les occupants d'une même voiture marchent côte à côte, décalés selon leur rang.
function trajetDepuis(place: Place, rang: number, xAllee: number, xPorte: number): Point[] {
  // Le nez de la voiture pointe vers le fond : l'arrière donne sur l'allée.
  const versPlace = Math.cos(place.angle) > 0 ? 1 : -1;
  const zMarche = place.z - versPlace * (p.profondeurPlace / 2 + pc.decalageAllee);
  const decalage = (rang - 1) * pc.ecartGroupe;
  const zTrottoir = plan.zNord - p.largeurTrottoir / 2;
  const zPorte = plan.zNord - p.largeurTrottoir + 0.3;
  return [
    { x: place.x + decalage, z: zMarche },
    { x: xAllee + decalage, z: zMarche },
    { x: xAllee + decalage, z: zTrottoir + decalage },
    { x: xPorte + decalage, z: zPorte },
  ];
}

export function creerPietons(scene: THREE.Scene) {
  const pietons: Pieton[] = [];

  async function ajouter(place: Place, rang: number, xAllee: number, xPorte: number, vitesse: number): Promise<void> {
    const nom = pc.modeles[Math.floor(Math.random() * pc.modeles.length)]!;
    const { objet, animations } = await modeleAnime(`personnages/${nom}`, config.echelles.personnage);
    const trajet = trajetDepuis(place, rang, xAllee, xPorte);
    objet.position.set(trajet[0]!.x, 0, trajet[0]!.z);
    objet.visible = false;
    objet.scale.setScalar(0.001);
    scene.add(objet);
    const mixeur = new THREE.AnimationMixer(objet);
    const clip = (n: string) => animations.find((c) => c.name === n)!;
    const marche = mixeur.clipAction(clip('walk'));
    const repos = mixeur.clipAction(clip('idle'));
    marche.timeScale = vitesse / pc.vitesseAnimation;
    repos.play();
    pietons.push({
      objet,
      mixeur,
      marche,
      repos,
      trajet,
      etape: 1,
      vitesse,
      attente: rang * pc.delaiDescente + pc.delaiDescente,
      bloque: 0,
      disparition: -1,
      apparition: 0,
      enMarche: false,
      x: objet.position.x,
      z: objet.position.z,
      vx: 0,
      vz: 0,
    });
  }

  function changer(pi: Pieton, enMarche: boolean): void {
    if (pi.enMarche === enMarche) return;
    const [de, vers] = enMarche ? [pi.repos, pi.marche] : [pi.marche, pi.repos];
    vers.reset().play();
    vers.crossFadeFrom(de, 0.2, false);
    pi.enMarche = enMarche;
  }

  return {
    // Une voiture vient de se garer : ses occupants descendent les uns après les autres.
    faireDescendre(place: Place): void {
      const nombre = pc.occupantsMin + Math.floor(Math.random() * (pc.occupantsMax - pc.occupantsMin + 1));
      // Même allure et même chemin pour tout le groupe, au milieu de l'allée piétonne.
      const vitesse = aleatoire(pc.vitesseMin, pc.vitesseMax);
      const xAllee = (Math.sign(place.x) || 1) * aleatoire(0.2, plan.demiPassage - 0.2 - pc.ecartGroupe);
      const xPorte = aleatoire(-pc.largeurPorte / 2, pc.largeurPorte / 2);
      for (let rang = 0; rang < nombre; rang++) {
        ajouter(place, rang, xAllee, xPorte, vitesse).catch((erreur) => console.error('Piéton non chargé', erreur));
      }
    },

    // Positions et vitesses des piétons visibles, pour que les voitures s'arrêtent devant eux.
    mobiles(): PietonMobile[] {
      return pietons.filter((pi) => pi.objet.visible);
    },

    // `voitures` : les voitures qui circulent dans le parking.
    mettreAJour(dt: number, voitures: VoitureVue[]): void {
      for (let i = pietons.length - 1; i >= 0; i--) {
        const pi = pietons[i]!;
        pi.mixeur.update(dt);
        if (pi.attente > 0) {
          pi.attente -= dt;
          if (pi.attente <= 0) pi.objet.visible = true;
          continue;
        }
        // Il apparaît en grandissant, comme s'il sortait de la voiture.
        pi.apparition = Math.min(1, pi.apparition + dt / pc.dureeDisparition);
        if (pi.disparition < 0) pi.objet.scale.setScalar(config.echelles.personnage * pi.apparition);
        if (pi.disparition >= 0) {
          // Arrivé à la porte : il rapetisse et entre.
          pi.disparition += dt;
          pi.objet.scale.setScalar(config.echelles.personnage * Math.max(0, 1 - pi.disparition / pc.dureeDisparition));
          if (pi.disparition >= pc.dureeDisparition) {
            scene.remove(pi.objet);
            pietons.splice(i, 1);
          }
          continue;
        }

        const ici = { x: pi.x, z: pi.z };
        const but = pi.trajet[pi.etape]!;
        const dx = but.x - ici.x;
        const dz = but.z - ici.z;
        const d = Math.hypot(dx, dz);
        if (d < 1e-6) {
          pi.etape++;
          if (pi.etape >= pi.trajet.length) pi.disparition = 0;
          continue;
        }
        // Patient au bout d'un moment : il passe devant une voiture arrêtée (souvent pour
        // d'autres piétons), et la contourne si elle lui barre le chemin.
        const gene = bloqueur(ici, but, voitures, pc, pi.bloque > pc.patience);
        if (gene) {
          pi.bloque += dt;
          if (!gene.roule && pi.bloque > pc.patienceContournement) {
            pi.trajet.splice(pi.etape, 0, contournement(ici, but, gene, pc.margeCarrosserie));
            pi.bloque = 0;
          }
          pi.vx = pi.vz = 0;
          changer(pi, false);
          continue;
        }
        pi.bloque = 0;
        changer(pi, true);
        const pas = Math.min(d, pi.vitesse * dt);
        pi.vx = (dx / d) * pi.vitesse;
        pi.vz = (dz / d) * pi.vitesse;
        pi.x += (dx / d) * pas;
        pi.z += (dz / d) * pas;
        pi.objet.position.set(pi.x, 0, pi.z);
        // Tourné vers sa marche, en douceur.
        let ecart = Math.atan2(dx, dz) - pi.objet.rotation.y;
        ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
        pi.objet.rotation.y += ecart * Math.min(1, 10 * dt);
        if (pas >= d - 1e-6) {
          pi.etape++;
          if (pi.etape >= pi.trajet.length) {
            pi.disparition = 0;
            pi.vx = pi.vz = 0;
          }
        }
      }
    },
  };
}
