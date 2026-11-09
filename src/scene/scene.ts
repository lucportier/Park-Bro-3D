import * as THREE from 'three';
import { config } from '../config';

export function creerRendu(): THREE.WebGLRenderer {
  const rendu = new THREE.WebGLRenderer({ antialias: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, config.rendu.densiteMax));
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(rendu.domElement);
  return rendu;
}

export function creerScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.couleurs.ciel);
  scene.fog = new THREE.Fog(config.couleurs.ciel, 60, 140);

  // Lumière d'ambiance : ciel clair au-dessus, reflet chaud du sol en dessous.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a98a, 1.6));

  // Soleil du matin, un peu de biais, qui porte les ombres.
  const soleil = new THREE.DirectionalLight(0xfff1dc, 2.2);
  soleil.position.set(-25, 50, 20);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  soleil.shadow.camera.far = 150;
  const zone = 50;
  soleil.shadow.camera.left = -zone;
  soleil.shadow.camera.right = zone;
  soleil.shadow.camera.top = zone;
  soleil.shadow.camera.bottom = -zone;
  soleil.shadow.bias = -0.0005;
  scene.add(soleil);

  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: config.couleurs.herbe, roughness: 1 }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);

  return scene;
}
