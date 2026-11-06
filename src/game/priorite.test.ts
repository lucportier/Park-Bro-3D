import { describe, expect, it } from 'vitest';
import { distanceLibre, obstaclesPietons, peutAvancer, type PietonMobile, type VoitureVue } from './priorite';

const reglages = { couloir: 1.5, marge: 1.2, anticipation: 1 };
const reglagesPieton = { distanceVoiture: 3, margeCarrosserie: 0.4 };
const DEMI_LONGUEUR = 2.3;
const DEMI_LARGEUR = 1;
const FREINAGE = 6;
const DT = 1 / 60;

// Piéton qui marche tout droit à sa vitesse, sauf quand il doit attendre.
interface Marcheur extends PietonMobile {
  marcheX: number;
  marcheZ: number;
}

function marcheur(x: number, z: number, marcheX: number, marcheZ: number): Marcheur {
  return { x, z, vx: 0, vz: 0, marcheX, marcheZ };
}

// Une voiture roule vers l'est sur z = 0 (cap π/2) avec la même loi de freinage que le jeu,
// et les piétons suivent les mêmes règles que dans le jeu. À chaque pas, on vérifie que
// la carrosserie ne touche aucun piéton.
function simuler(pietons: Marcheur[], secondes: number, vitesseMax = 9): { x: number } {
  const voiture = { x: -30, vitesse: vitesseMax };
  for (let t = 0; t < secondes; t += DT) {
    const vue: VoitureVue = {
      x: voiture.x,
      z: 0,
      cap: Math.PI / 2,
      demiLongueur: DEMI_LONGUEUR,
      demiLargeur: DEMI_LARGEUR,
      roule: voiture.vitesse > 0.5,
    };
    for (const p of pietons) {
      const libre = peutAvancer(p, { x: p.x + p.marcheX, z: p.z + p.marcheZ }, [vue], reglagesPieton);
      p.vx = libre ? p.marcheX : 0;
      p.vz = libre ? p.marcheZ : 0;
      p.x += p.vx * DT;
      p.z += p.vz * DT;
    }
    const libre = distanceLibre({ x: voiture.x, z: 0 }, Math.PI / 2, DEMI_LONGUEUR, 1000, obstaclesPietons(pietons, reglages));
    voiture.vitesse = Math.min(vitesseMax, Math.sqrt(2 * FREINAGE * libre));
    voiture.x += Math.min(voiture.vitesse * DT, libre);
    for (const p of pietons) {
      const touche = Math.abs(p.x - voiture.x) < DEMI_LONGUEUR + 0.2 && Math.abs(p.z) < DEMI_LARGEUR + 0.2;
      expect(touche, `piéton touché en (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) à t = ${t.toFixed(2)} s`).toBe(false);
    }
  }
  return voiture;
}

describe('priorité piétonne', () => {
  it('une voiture s\'arrête devant un piéton immobile et ne le touche jamais', () => {
    const voiture = simuler([marcheur(0, 0.3, 0, 0)], 10);
    expect(voiture.x).toBeLessThan(-DEMI_LONGUEUR - 1);
    expect(voiture.x).toBeGreaterThan(-DEMI_LONGUEUR - reglages.marge - 0.5);
  });

  it('elle ne touche jamais un piéton qui traverse, quel que soit son moment d\'arrivée', () => {
    for (let depart = -14; depart <= 0; depart += 0.25) {
      for (const vitesse of [1.6, 2.1]) {
        simuler([marcheur(0, depart - 2, 0, vitesse)], 12);
        simuler([marcheur(0, 2 - depart, 0, -vitesse)], 12);
      }
    }
  });

  it('elle repart une fois le piéton passé', () => {
    const voiture = simuler([marcheur(0, -4, 0, 1.8)], 14);
    expect(voiture.x).toBeGreaterThan(20);
  });

  it('un piéton qui longe la voie, hors du couloir, ne l\'arrête pas', () => {
    const libre = distanceLibre(
      { x: 0, z: 0 },
      Math.PI / 2,
      DEMI_LONGUEUR,
      50,
      obstaclesPietons([{ x: 6, z: 1.65, vx: 1.8, vz: 0 }], reglages),
    );
    expect(libre).toBe(50);
  });

  it('un groupe de piétons serrés est aussi protégé, et finit par passer', () => {
    const groupe = [0, 0.6, 1.2].map((dx) => marcheur(dx, -3 - dx, 0, 1.7));
    const voiture = simuler(groupe, 16);
    expect(groupe.every((p) => p.z > 2)).toBe(true);
    expect(voiture.x).toBeGreaterThan(20);
  });

  it('un piéton attend au bord qu\'une voiture qui roule soit passée', () => {
    const voiture = (x: number, roule: boolean): VoitureVue => ({ x, z: 0, cap: Math.PI / 2, demiLongueur: 2.3, demiLargeur: 1, roule });
    const ici = { x: 0, z: -3 };
    const but = { x: 0, z: 3 };
    expect(peutAvancer(ici, but, [voiture(1.5, true)], reglagesPieton)).toBe(false);
    expect(peutAvancer(ici, but, [voiture(12, true)], reglagesPieton)).toBe(true);
    // Il ne marche pas non plus dans une voiture arrêtée en travers de son chemin.
    expect(peutAvancer({ x: 0, z: -1.6 }, but, [voiture(0, false)], reglagesPieton)).toBe(false);
  });
});
