import { describe, expect, it } from 'vitest';
import { ajouter, perteDePatience, pointsPlacement, type ReglagesScore } from './score';

const r: ReglagesScore = { placee: 10, bonusRapide: 15, seuilBonus: 0.5, gareeSeule: -5 };

describe('score', () => {
  it('une voiture placée vite rapporte 25, sinon 10', () => {
    expect(pointsPlacement(0.9, r)).toBe(25);
    expect(pointsPlacement(0.51, r)).toBe(25);
    expect(pointsPlacement(0.5, r)).toBe(10);
    expect(pointsPlacement(0, r)).toBe(10);
  });

  it('ne descend jamais sous 0', () => {
    expect(ajouter(3, r.gareeSeule)).toBe(0);
    expect(ajouter(0, r.gareeSeule)).toBe(0);
    expect(ajouter(20, r.gareeSeule)).toBe(15);
    expect(ajouter(15, pointsPlacement(1, r))).toBe(40);
  });

  it('la tête de file perd sa patience deux fois plus vite que les suivantes', () => {
    expect(perteDePatience(true, 1, 0.5)).toBe(1);
    expect(perteDePatience(false, 1, 0.5)).toBe(0.5);
  });
});
