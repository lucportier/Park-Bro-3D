import { describe, expect, it } from 'vitest';
import { avancerFile, type ReglagesFile, type VoitureEnFile } from './file';

const reglages: ReglagesFile = { acceleration: 4, freinage: 6, ecart: 1.5, margeObstacle: 1.5 };
const LIGNE = 0;
const DT = 1 / 60;

function voiture(x: number, vitesseMax = 8, longueur = 4.6): VoitureEnFile {
  return { x, vitesse: vitesseMax, vitesseMax, longueur };
}

// Vérifie à chaque pas qu'aucune voiture ne mord sur la suivante ni ne recule.
function simuler(file: VoitureEnFile[], secondes: number, obstacles: number[] = []): void {
  for (let t = 0; t < secondes; t += DT) {
    const avant = file.map((v) => v.x);
    avancerFile(file, LIGNE, DT, reglages, obstacles);
    file.forEach((v, i) => {
      expect(v.x).toBeGreaterThanOrEqual(avant[i]!);
      expect(v.vitesse).toBeGreaterThanOrEqual(0);
      const suivante = file[i + 1];
      if (suivante) {
        const espace = v.x - v.longueur / 2 - (suivante.x + suivante.longueur / 2);
        expect(espace).toBeGreaterThanOrEqual(reglages.ecart - 1e-6);
      }
    });
  }
}

describe('file d\'attente au portail', () => {
  it('la tête s\'arrête pile à la ligne et les suivantes se rangent derrière', () => {
    const file = Array.from({ length: 8 }, (_, i) => voiture(-60 - i * 9, 7 + (i % 3)));
    simuler(file, 40);
    expect(file[0]!.x).toBeCloseTo(LIGNE - file[0]!.longueur / 2, 2);
    expect(file.every((v) => v.vitesse < 0.01)).toBe(true);
  });

  it('la file se resserre quand la tête s\'en va', () => {
    const file = Array.from({ length: 4 }, (_, i) => voiture(-60 - i * 9));
    simuler(file, 30);
    const deuxieme = file[1]!;
    file.shift();
    simuler(file, 15);
    expect(deuxieme.x).toBeCloseTo(LIGNE - deuxieme.longueur / 2, 2);
  });

  it('une voiture s\'arrête devant un obstacle et ne le dépasse jamais', () => {
    const file = [voiture(-60)];
    const obstacle = -30;
    simuler(file, 20, [obstacle]);
    expect(file[0]!.x + file[0]!.longueur / 2).toBeLessThanOrEqual(obstacle - reglages.margeObstacle + 1e-6);
    expect(file[0]!.vitesse).toBeLessThan(0.01);
  });

  it('une voiture ne bouge pas si l\'obstacle est déjà contre elle', () => {
    const file = [voiture(-30)];
    simuler(file, 5, [-29]);
    expect(file[0]!.x).toBe(-30);
  });
});
