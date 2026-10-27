import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const chargeur = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Object3D>>();

// Charge un modèle de public/models une seule fois, puis en renvoie des copies.
export async function modele(chemin: string, echelle = 1): Promise<THREE.Object3D> {
  let promesse = cache.get(chemin);
  if (!promesse) {
    promesse = chargeur.loadAsync(`${import.meta.env.BASE_URL}models/${chemin}.glb`).then((gltf) => {
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      return gltf.scene;
    });
    cache.set(chemin, promesse);
  }
  const copie = (await promesse).clone();
  copie.scale.setScalar(echelle);
  return copie;
}
