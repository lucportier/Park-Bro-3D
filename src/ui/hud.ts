// Affichage par-dessus le jeu : le score, et des points qui s'envolent au-dessus des voitures.

const boite = document.createElement('div');
boite.className = 'hud-score';
boite.innerHTML = '<span class="hud-titre">Score</span><span class="hud-valeur">0</span>';
document.body.appendChild(boite);
const valeur = boite.querySelector('.hud-valeur') as HTMLSpanElement;

export function afficherScore(score: number): void {
  valeur.textContent = String(score);
  // Petit rebond à chaque changement.
  boite.classList.remove('rebond');
  void boite.offsetWidth;
  boite.classList.add('rebond');
}

// Texte qui monte et s'efface depuis un point de l'écran (en pixels).
export function pointsVolants(texte: string, x: number, y: number, positif: boolean): void {
  const el = document.createElement('div');
  el.className = `points-volants ${positif ? 'positif' : 'negatif'}`;
  el.textContent = texte;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
