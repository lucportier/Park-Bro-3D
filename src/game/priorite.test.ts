import { describe, expect, it } from 'vitest';
import { config } from '../config';
import {
  distanceLibre,
  obstaclesPietons,
  peutAvancer,
  pietonPresDeLaVoie,
  plafondPietons,
  type PietonMobile,
  type VoitureVue,
} from './priorite';

// Les mêmes réglages que dans le jeu.
const reglages = config.pietons;
const reglagesPieton = config.pietons;
// Écarts exigés à tout instant entre la carrosserie et un piéton (m) : devant ou derrière
// la voiture ; sur le côté, jamais moins de ECART_COTE, et moins de ECART_COTE_VITE
// seulement au pas (un piéton qui attend au bord pendant qu'elle passe).
const ECART_DEVANT = 1.5;
const ECART_COTE = 0.5;
const ECART_COTE_VITE = 0.9;
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
  const voiture = { x: -30, vitesse: vitesseMax, reprise: 0 };
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
    const pos = { x: voiture.x, z: 0 };
    const libre = distanceLibre(pos, Math.PI / 2, DEMI_LONGUEUR, 1000, obstaclesPietons(pietons, reglages));
    const plafond = plafondPietons(voiture, pos, Math.PI / 2, DEMI_LONGUEUR, pietons, reglages, DT);
    // Même loi que le jeu : freinage sec devant un obstacle, en douceur sous le plafond.
    const cible = Math.min(vitesseMax, Math.sqrt(2 * FREINAGE * libre));
    const vise = Math.min(cible, plafond);
    voiture.vitesse =
      voiture.vitesse < vise
        ? Math.min(vise, voiture.vitesse + 4 * DT)
        : Math.min(cible, Math.max(vise, voiture.vitesse - FREINAGE * DT));
    voiture.x += Math.min(voiture.vitesse * DT, libre);
    for (const p of pietons) {
      const lon = Math.abs(p.x - voiture.x) - DEMI_LONGUEUR;
      const lat = Math.abs(p.z) - DEMI_LARGEUR;
      const auPas = voiture.vitesse <= reglages.vitesseVigilance + 1e-6;
      const frole =
        (lat < 0 && lon < ECART_DEVANT) || (lon < 0 && (lat < ECART_COTE || (lat < ECART_COTE_VITE && !auPas)));
      expect(frole, `piéton frôlé en (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) à t = ${t.toFixed(2)} s`).toBe(false);
    }
  }
  return voiture;
}

describe('priorité piétonne', () => {
  it('une voiture s\'arrête à 2 m devant un piéton immobile', () => {
    const voiture = simuler([marcheur(0, 0.3, 0, 0)], 10);
    expect(voiture.x + DEMI_LONGUEUR).toBeCloseTo(-reglages.marge, 1);
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

  it('une voiture roule au pas quand un piéton longe sa voie devant elle', () => {
    const largeur = reglages.couloir + reglages.vigilance;
    const pres = (x: number, z: number, vz = 0) =>
      pietonPresDeLaVoie({ x: 0, z: 0 }, Math.PI / 2, 2.3, [{ x, z, vx: 0, vz }], largeur, 12, reglages.anticipation);
    expect(pres(6, 2.5)).toBe(true);
    expect(pres(-6, 2.5)).toBe(false);
    expect(pres(6, 7)).toBe(false);
    // Plus loin, mais il se dirige vers la voie.
    expect(pres(6, 7, -2)).toBe(true);
  });

  it('après s\'être arrêtée pour un piéton, elle attend un moment avant de repartir', () => {
    const etat = { reprise: 0 };
    // Arrêtée à 2 m devant le piéton.
    const pos = { x: -DEMI_LONGUEUR - reglages.marge - 0.1, z: 0 };
    const plafond = (pietons: PietonMobile[], dt = 0.1) =>
      plafondPietons(etat, pos, Math.PI / 2, DEMI_LONGUEUR, pietons, reglages, dt);
    expect(plafond([{ x: 0, z: 0, vx: 0, vz: 0 }])).toBe(0);
    // Le piéton est passé, loin de la voie : elle attend encore, puis repart.
    const passe = [{ x: 0, z: 20, vx: 0, vz: 0 }];
    let t = 0;
    while (plafond(passe) === 0) t += 0.1;
    expect(t).toBeCloseTo(reglages.delaiRedemarrage - 0.1, 5);
    expect(plafond(passe)).toBe(Infinity);
  });

  it('un piéton attend au bord qu\'une voiture qui roule soit passée', () => {
    const voiture = (x: number, roule: boolean): VoitureVue => ({ x, z: 0, cap: Math.PI / 2, demiLongueur: 2.3, demiLargeur: 1, roule });
    const ici = { x: 0, z: -2.2 };
    const but = { x: 0, z: 3 };
    expect(peutAvancer(ici, but, [voiture(-2, true)], reglagesPieton)).toBe(false);
    expect(peutAvancer(ici, but, [voiture(12, true)], reglagesPieton)).toBe(true);
    expect(peutAvancer({ x: 0, z: -3 }, but, [voiture(-2, true)], reglagesPieton)).toBe(true);
    // Il ne marche pas non plus dans une voiture arrêtée en travers de son chemin.
    expect(peutAvancer({ x: 0, z: -1.6 }, but, [voiture(0, false)], reglagesPieton)).toBe(false);
  });
});
