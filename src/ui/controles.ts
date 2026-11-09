import { config } from '../config';

// Direction demandée par le joueur, dans le plan du sol : x vers la droite de l'écran,
// z vers le bas de l'écran. Longueur entre 0 (immobile) et 1 (pleine vitesse).
export interface Direction {
  x: number;
  z: number;
}

const touchesEnfoncees = new Set<string>();

// KeyboardEvent.code désigne la position de la touche : KeyW/KeyA/KeyS/KeyD
// correspondent à ZQSD sur un clavier AZERTY et à WASD sur un QWERTY.
const HAUT = ['KeyW', 'ArrowUp'];
const BAS = ['KeyS', 'ArrowDown'];
const GAUCHE = ['KeyA', 'ArrowLeft'];
const DROITE = ['KeyD', 'ArrowRight'];
const TOUCHES_JEU = [...HAUT, ...BAS, ...GAUCHE, ...DROITE];

// Geste « faire signe » : barre d'espace ou bouton à l'écran, consommé une fois.
let signe = false;

window.addEventListener('keydown', (e) => {
  if (TOUCHES_JEU.includes(e.code) || e.code === 'Space') e.preventDefault();
  if (e.code === 'Space' && !e.repeat) signe = true;
  touchesEnfoncees.add(e.code);
});
window.addEventListener('keyup', (e) => touchesEnfoncees.delete(e.code));
// Fenêtre quittée touche enfoncée : on ne veut pas d'agent qui file tout seul.
window.addEventListener('blur', () => touchesEnfoncees.clear());

function appuye(codes: string[]): boolean {
  return codes.some((c) => touchesEnfoncees.has(c));
}

// Joystick virtuel flottant : il apparaît là où le doigt se pose, mais ne s'active
// qu'après un petit glissement, pour qu'un simple tap reste libre (choix de place).
const j = config.joystick;
const socle = document.createElement('div');
socle.className = 'joystick';
const bouton = document.createElement('div');
bouton.className = 'joystick-bouton';
socle.appendChild(bouton);
document.body.appendChild(socle);

let doigt: { id: number; x0: number; y0: number; actif: boolean } | null = null;
const directionJoystick: Direction = { x: 0, z: 0 };

// Dernier tap (doigt posé puis levé sans glisser) ou clic, en pixels écran.
let tap: { x: number; y: number } | null = null;
let souris: { x0: number; y0: number } | null = null;

window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') {
    if (e.button === 0) souris = { x0: e.clientX, y0: e.clientY };
    return;
  }
  if (e.pointerType !== 'touch' || doigt) return;
  doigt = { id: e.pointerId, x0: e.clientX, y0: e.clientY, actif: false };
});

window.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse' || !souris) return;
  if (Math.hypot(e.clientX - souris.x0, e.clientY - souris.y0) < j.seuil) tap = { x: e.clientX, y: e.clientY };
  souris = null;
});

window.addEventListener('pointermove', (e) => {
  if (!doigt || e.pointerId !== doigt.id) return;
  const dx = e.clientX - doigt.x0;
  const dy = e.clientY - doigt.y0;
  const distance = Math.hypot(dx, dy);
  if (!doigt.actif) {
    if (distance < j.seuil) return;
    doigt.actif = true;
    socle.style.left = `${doigt.x0}px`;
    socle.style.top = `${doigt.y0}px`;
    socle.classList.add('visible');
  }
  const limite = Math.min(distance, j.rayon);
  const ux = distance > 0 ? dx / distance : 0;
  const uy = distance > 0 ? dy / distance : 0;
  bouton.style.transform = `translate(${ux * limite}px, ${uy * limite}px)`;
  directionJoystick.x = (ux * limite) / j.rayon;
  directionJoystick.z = (uy * limite) / j.rayon;
});

function relacher(e: PointerEvent): void {
  if (!doigt || e.pointerId !== doigt.id) return;
  // Doigt levé sans avoir glissé : c'est un tap, pas un coup de joystick.
  if (!doigt.actif && e.type === 'pointerup') tap = { x: e.clientX, y: e.clientY };
  doigt = null;
  directionJoystick.x = 0;
  directionJoystick.z = 0;
  socle.classList.remove('visible');
  bouton.style.transform = '';
}
window.addEventListener('pointerup', relacher);
window.addEventListener('pointercancel', relacher);

export function lireDirection(): Direction {
  if (directionJoystick.x !== 0 || directionJoystick.z !== 0) return { ...directionJoystick };
  const x = (appuye(DROITE) ? 1 : 0) - (appuye(GAUCHE) ? 1 : 0);
  const z = (appuye(BAS) ? 1 : 0) - (appuye(HAUT) ? 1 : 0);
  const longueur = Math.hypot(x, z);
  return longueur > 0 ? { x: x / longueur, z: z / longueur } : { x: 0, z: 0 };
}

const boutonSigne = document.createElement('button');
boutonSigne.className = 'bouton-signe';
boutonSigne.type = 'button';
boutonSigne.innerHTML = '<span>✋</span>Signe';
// Le doigt posé sur le bouton ne doit pas lancer le joystick.
boutonSigne.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  e.preventDefault();
  signe = true;
});
document.body.appendChild(boutonSigne);

export function signeDemande(): boolean {
  const demande = signe;
  signe = false;
  return demande;
}

export function prendreTap(): { x: number; y: number } | null {
  const t = tap;
  tap = null;
  return t;
}
