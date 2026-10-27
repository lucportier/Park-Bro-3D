import * as THREE from 'three';
import { config } from '../config';
import { places, plan, type Rect } from '../game/parking';
import { modele } from './modeles';

const c = config.couleurs;
const e = config.echelles;

// Hauteurs des couches au sol, pour éviter qu'elles se chevauchent à l'écran.
const H_ASPHALTE = 0.02;
const H_PEINTURE = 0.04;

function materiau(couleur: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.95 });
}

const matLignes = materiau(c.lignes);

function dalle(rect: Rect, mat: THREE.Material, hauteur: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rect.x2 - rect.x1, rect.z2 - rect.z1), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((rect.x1 + rect.x2) / 2, hauteur, (rect.z1 + rect.z2) / 2);
  m.receiveShadow = true;
  return m;
}

function pave(rect: Rect, hauteur: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(rect.x2 - rect.x1, hauteur, rect.z2 - rect.z1), mat);
  m.position.set((rect.x1 + rect.x2) / 2, hauteur / 2, (rect.z1 + rect.z2) / 2);
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}

function ligne(x1: number, z1: number, x2: number, z2: number, epaisseur = 0.15): THREE.Mesh {
  const x = Math.min(x1, x2) - (x1 === x2 ? epaisseur / 2 : 0);
  const z = Math.min(z1, z2) - (z1 === z2 ? epaisseur / 2 : 0);
  const rect = {
    x1: x,
    z1: z,
    x2: x1 === x2 ? x + epaisseur : Math.max(x1, x2),
    z2: z1 === z2 ? z + epaisseur : Math.max(z1, z2),
  };
  return dalle(rect, matLignes, H_PEINTURE);
}

function sol(scene: THREE.Scene): void {
  const p = config.parking;

  scene.add(dalle(plan.asphalte, materiau(c.asphalte), H_ASPHALTE));

  // Traits des places : un séparateur de chaque côté de chaque place.
  for (const zRangee of plan.rangees) {
    for (const cote of [-1, 1]) {
      for (let i = 0; i <= p.placesParDemiRangee; i++) {
        const x = cote * (plan.demiPassage + i * p.largeurPlace);
        scene.add(ligne(x, zRangee, x, zRangee + p.profondeurPlace));
      }
    }
  }
  // Fond des places, entre les rangées B et C qui sont dos à dos.
  const zDos = plan.rangees[2]!;
  for (const cote of [-1, 1]) {
    scene.add(ligne(cote * plan.demiPassage, zDos, cote * plan.xBord, zDos));
  }

  // Allée piétonne centrale : pavés clairs entre les places, passages zébrés sur les allées.
  const matPietons = materiau(c.trottoir);
  for (const zRangee of plan.rangees) {
    scene.add(
      dalle({ x1: -plan.demiPassage, z1: zRangee, x2: plan.demiPassage, z2: zRangee + p.profondeurPlace }, matPietons, H_PEINTURE),
    );
  }
  for (const allee of plan.allees) {
    zebre(scene, -plan.demiPassage, allee.z1, plan.demiPassage, allee.z2);
  }

  // Trottoir le long du parc des expos.
  const trottoir = { x1: plan.asphalte.x1, z1: plan.zNord - p.largeurTrottoir, x2: plan.asphalte.x2, z2: plan.zNord };
  scene.add(pave(trottoir, 0.15, matPietons));
}

// Bandes blanches d'un passage piéton, perpendiculaires au sens de marche (nord-sud).
function zebre(scene: THREE.Scene, x1: number, z1: number, x2: number, z2: number): void {
  const bande = 0.5;
  for (let z = z1 + bande / 2; z + bande <= z2; z += bande * 2) {
    scene.add(dalle({ x1, z1: z, x2, z2: z + bande }, matLignes, H_PEINTURE));
  }
}

async function routeEntree(scene: THREE.Scene): Promise<void> {
  const t = config.echelles.dalleRoute;
  const n = Math.ceil(config.routeEntree.longueur / t);
  for (let i = 0; i < n; i++) {
    // Une dalle avec passage piéton, pour les piétons qui traversent la route d'entrée.
    const nom = i === config.routeEntree.dallePassagePieton ? 'road-crossing' : 'road-straight';
    const dalleRoute = await modele(`routes/${nom}`, t);
    dalleRoute.position.set(plan.xPortail - t / 2 - i * t, 0, plan.zEntree);
    scene.add(dalleRoute);
  }
}

function portail(scene: THREE.Scene): void {
  const largeur = config.routeEntree.largeur;
  const x = plan.xPortail;
  const zNord = plan.zEntree - largeur / 2;

  // Guérite au bord nord de l'entrée.
  const guerite = pave({ x1: x - 3, z1: zNord - 3.2, x2: x - 0.5, z2: zNord - 0.7 }, 2.6, materiau(c.guerite));
  scene.add(guerite);
  const toit = pave({ x1: x - 3.3, z1: zNord - 3.5, x2: x - 0.2, z2: zNord - 0.4 }, 0.3, materiau(0xffffff));
  toit.position.y = 2.75;
  scene.add(toit);

  // Barrière levée (rouge et blanche) : on la verra s'abaisser plus tard.
  const bras = new THREE.Group();
  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, largeur / segments, 0.2),
      materiau(i % 2 === 0 ? c.barriere : 0xffffff),
    );
    seg.position.y = (i + 0.5) * (largeur / segments);
    seg.castShadow = true;
    bras.add(seg);
  }
  bras.position.set(x - 0.3, 1, zNord);
  bras.rotation.x = 0.25;
  scene.add(bras);
  const poteau = pave({ x1: x - 0.6, z1: zNord - 0.3, x2: x, z2: zNord + 0.3 }, 1.1, materiau(0x3a3f47));
  scene.add(poteau);
}

async function parcDesExpos(scene: THREE.Scene): Promise<void> {
  const zFacade = plan.zNord - config.parking.largeurTrottoir;
  const largeurTotale = plan.asphalte.x2 - plan.asphalte.x1;
  const largeurBloc = e.batiment;
  const nombre = Math.floor(largeurTotale / largeurBloc);
  for (let i = 0; i < nombre; i++) {
    const nom = i % 2 === 0 ? 'low-detail-building-wide-a' : 'low-detail-building-wide-b';
    const bloc = await modele(`batiments/${nom}`, e.batiment);
    bloc.rotation.y = Math.PI;
    bloc.position.set(-((nombre - 1) / 2) * largeurBloc + i * largeurBloc, 0, zFacade - 4);
    scene.add(bloc);
  }

  // Enseigne au-dessus de l'entrée, dans l'axe de l'allée piétonne.
  const toile = document.createElement('canvas');
  toile.width = 1024;
  toile.height = 192;
  const ctx = toile.getContext('2d')!;
  ctx.fillStyle = c.enseigne;
  ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 110px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PARC DES EXPOS', toile.width / 2, toile.height / 2 + 6);
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const enseigne = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: texture }));
  enseigne.position.set(0, 8, zFacade - 0.9);
  scene.add(enseigne);
}

async function lampadaires(scene: THREE.Scene): Promise<void> {
  const xs = [-20, -8, 8, 20];
  for (const x of xs) {
    const lampe = await modele('routes/light-square', e.lampadaire);
    lampe.position.set(x, 0, plan.zNord - 0.6);
    scene.add(lampe);
    const lampeSud = await modele('routes/light-square', e.lampadaire);
    lampeSud.rotation.y = Math.PI;
    lampeSud.position.set(x, 0, plan.zSud + 0.6);
    scene.add(lampeSud);
  }
}

const modelesVoitures = ['sedan', 'suv', 'hatchback-sports', 'taxi', 'van', 'suv-luxury', 'sedan-sports'];

// Quelques voitures déjà garées, réparties dans le parking.
async function voituresGarees(scene: THREE.Scene): Promise<void> {
  const nombre = config.parking.voituresGareesAuDepart;
  const pas = Math.floor(places.length / nombre);
  for (let i = 0; i < nombre; i++) {
    const place = places[(i * pas + 3 * i) % places.length]!;
    const voiture = await modele(`voitures/${modelesVoitures[i % modelesVoitures.length]}`, e.voiture);
    voiture.position.set(place.x, 0.3 * e.voiture, place.z);
    voiture.rotation.y = place.angle;
    scene.add(voiture);
  }
}

export async function creerDecor(scene: THREE.Scene): Promise<void> {
  sol(scene);
  portail(scene);
  await Promise.all([routeEntree(scene), parcDesExpos(scene), lampadaires(scene), voituresGarees(scene)]);
}
