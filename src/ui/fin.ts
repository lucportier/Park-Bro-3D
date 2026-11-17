// Écran de fin de partie : bilan, meilleur score gardé sur l'appareil, et « Rejouer ».

const CLE_MEILLEUR = 'park-bro-3d.meilleur-score';

// Le stockage peut être indisponible (navigation privée) : on joue quand même.
function lireMeilleur(): number {
  try {
    return Number(localStorage.getItem(CLE_MEILLEUR)) || 0;
  } catch {
    return 0;
  }
}

function ecrireMeilleur(score: number): void {
  try {
    localStorage.setItem(CLE_MEILLEUR, String(score));
  } catch {
    // Tant pis : le record ne sera pas gardé.
  }
}

export function afficherFin(raison: 'horaire' | 'bloquee', score: number, garees: number): void {
  const ancien = lireMeilleur();
  const record = score > ancien;
  if (record) ecrireMeilleur(score);

  const fond = document.createElement('div');
  fond.className = 'fin';
  const titre = raison === 'horaire' ? 'Fin de la matinée !' : 'Route bloquée !';
  const sousTitre =
    raison === 'horaire' ? 'Il est 11:00, le parc des expos ouvre.' : 'Trop de voitures attendaient sur la route.';
  fond.innerHTML = `
    <div class="fin-carte ${raison}">
      <h1>${titre}</h1>
      <p class="fin-sous-titre">${sousTitre}</p>
      <div class="fin-score">${score}</div>
      ${record ? '<p class="fin-record">Nouveau record !</p>' : ''}
      <ul class="fin-bilan">
        <li><span>Voitures garées</span><b>${garees}</b></li>
        <li><span>Meilleur score</span><b>${Math.max(score, ancien)}</b></li>
      </ul>
      <button type="button" class="fin-rejouer">Rejouer</button>
    </div>`;
  // Un tap sur l'écran de fin ne doit pas atteindre le jeu (joystick, choix de place).
  fond.addEventListener('pointerdown', (e) => e.stopPropagation());
  fond.querySelector('.fin-rejouer')!.addEventListener('click', () => location.reload());
  document.body.appendChild(fond);
}
