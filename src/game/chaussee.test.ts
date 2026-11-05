import { describe, expect, it } from 'vitest';
import { chemin, longueur, pointA, projeter, type Reseau } from './chaussee';

// Anneau 20 × 10 (deux allées et deux voies latérales) plus une route qui arrive à l'ouest.
//   NO(0,0) ───── NE(20,0)
//     │              │
//   SO(0,10) ──── SE(20,10) ◄ route depuis L(-5,10)
const reseau: Reseau = {
  noeuds: [
    { x: -5, z: 10 },
    { x: 0, z: 10 },
    { x: 20, z: 10 },
    { x: 20, z: 0 },
    { x: 0, z: 0 },
  ],
  aretes: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ],
};

describe('chaussée', () => {
  it('projette un point sur le segment le plus proche', () => {
    expect(projeter(reseau, { x: 8, z: 7 }).point).toEqual({ x: 8, z: 10 });
    expect(projeter(reseau, { x: 30, z: 4 }).point).toEqual({ x: 20, z: 4 });
  });

  it('prend le plus court des deux côtés de l\'anneau', () => {
    // Vers l'allée nord, côté ouest : par la voie latérale ouest.
    const ouest = chemin(reseau, { x: -5, z: 10 }, { x: 3, z: 0 });
    expect(ouest).toEqual([
      { x: -5, z: 10 },
      { x: 0, z: 10 },
      { x: 0, z: 0 },
      { x: 3, z: 0 },
    ]);
    // Vers le haut de la voie est : par l'allée sud.
    const est = chemin(reseau, { x: -5, z: 10 }, { x: 23, z: 2 });
    expect(longueur(est)).toBeCloseTo(5 + 20 + 8);
    expect(est[2]).toEqual({ x: 20, z: 10 });
  });

  it('reste sur la même allée quand départ et arrivée y sont', () => {
    expect(chemin(reseau, { x: 4, z: 10 }, { x: 12, z: 11 })).toEqual([
      { x: 4, z: 10 },
      { x: 12, z: 10 },
    ]);
  });

  it('donne un point le long d\'une ligne brisée', () => {
    const ligne = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
    ];
    expect(pointA(ligne, 15)).toEqual({ x: 10, z: 5 });
    expect(pointA(ligne, 99)).toEqual({ x: 10, z: 10 });
  });
});
