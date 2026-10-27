import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as clonerAvecSquelette } from 'three/examples/jsm/utils/SkeletonUtils.js';

const chargeur = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();

function charger(chemin: string): Promise<GLTF> {
  let promesse = cache.get(chemin);
  if (!promesse) {
    promesse = chargeur.loadAsync(`${import.meta.env.BASE_URL}models/${chemin}.glb`).then((gltf) => {
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      return gltf;
    });
    cache.set(chemin, promesse);
  }
  return promesse;
}

// Charge un modèle de public/models une seule fois, puis en renvoie des copies.
export async function modele(chemin: string, echelle = 1): Promise<THREE.Object3D> {
  const copie = (await charger(chemin)).scene.clone();
  copie.scale.setScalar(echelle);
  return copie;
}

// Pour un personnage animé : la copie doit dupliquer aussi son squelette.
export async function modeleAnime(
  chemin: string,
  echelle = 1,
): Promise<{ objet: THREE.Object3D; animations: THREE.AnimationClip[] }> {
  const gltf = await charger(chemin);
  const objet = clonerAvecSquelette(gltf.scene);
  objet.scale.setScalar(echelle);
  return { objet, animations: gltf.animations };
}
