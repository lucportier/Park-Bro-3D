// Chaussée du parking : la route d'entrée, les deux allées et les deux voies latérales,
// vues comme un petit réseau de segments (lignes médianes). Une voiture qui vient vers
// l'agent ne roule que là-dessus : jamais à travers une place.
// Logique pure, sans Three.js, pour pouvoir la tester.

export interface Point {
  x: number;
  z: number;
}

export interface Reseau {
  noeuds: Point[];
  aretes: [number, number][];
}

interface Projection {
  arete: number;
  t: number;
  point: Point;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Point de la chaussée le plus proche de p.
export function projeter(r: Reseau, p: Point): Projection {
  let meilleure: Projection | null = null;
  let dMin = Infinity;
  r.aretes.forEach(([i, j], arete) => {
    const a = r.noeuds[i]!;
    const b = r.noeuds[j]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)) : 0;
    const point = { x: a.x + t * dx, z: a.z + t * dz };
    const d = distance(p, point);
    if (d < dMin) {
      dMin = d;
      meilleure = { arete, t, point };
    }
  });
  return meilleure!;
}

// Une voiture ne fait jamais demi-tour : un virage de plus de 120° est interdit.
const VIRAGE_MAX = -0.5;
// Sur un premier tronçon plus court que ça, c'est l'orientation de la voiture elle-même
// qui compte au premier carrefour : elle n'a pas la place de se réaligner avant (m).
const DEPART_COURT = 6;

// Plus court chemin sur la chaussée, du point le plus proche de `de` au point le plus
// proche de `vers`. Le réseau est minuscule : un Dijkstra naïf suffit.
// Avec `cap` (direction (sin cap, cos cap) d'une voiture), le chemin part vers l'avant et
// ne fait jamais demi-tour : une voiture fait le tour s'il le faut.
export function chemin(r: Reseau, de: Point, vers: Point, cap?: number): Point[] {
  const a = projeter(r, de);
  const b = projeter(r, vers);
  const noeuds = [...r.noeuds, a.point, b.point];
  const ia = noeuds.length - 2;
  const ib = noeuds.length - 1;
  const voisins: { vers: number; cout: number }[][] = noeuds.map(() => []);
  const relier = (i: number, j: number): void => {
    const cout = distance(noeuds[i]!, noeuds[j]!);
    voisins[i]!.push({ vers: j, cout });
    voisins[j]!.push({ vers: i, cout });
  };
  r.aretes.forEach(([i, j], arete) => {
    // Les deux points projetés coupent leur arête en morceaux.
    const coupes = [
      { n: i, t: 0 },
      { n: j, t: 1 },
      ...(arete === a.arete ? [{ n: ia, t: a.t }] : []),
      ...(arete === b.arete ? [{ n: ib, t: b.t }] : []),
    ].sort((u, v) => u.t - v.t);
    for (let k = 0; k + 1 < coupes.length; k++) relier(coupes[k]!.n, coupes[k + 1]!.n);
  });

  const direction = (i: number, j: number): Point | null => {
    const d = distance(noeuds[i]!, noeuds[j]!);
    return d > 1e-6 ? { x: (noeuds[j]!.x - noeuds[i]!.x) / d, z: (noeuds[j]!.z - noeuds[i]!.z) / d } : null;
  };
  const orientation = cap !== undefined ? { x: Math.sin(cap), z: Math.cos(cap) } : null;
  // D'abord un départ franchement vers l'avant ; s'il n'y en a pas (voiture en travers),
  // le départ le moins brusque.
  const points = plusCourt(0) ?? plusCourt(VIRAGE_MAX) ?? [];
  // Sans chemin possible (ne devrait pas arriver sur un anneau), on vise le but tout droit.
  return points.length > 0 ? points : [a.point, b.point];

  // Dijkstra sur des états (nœud, direction d'arrivée), pour interdire les demi-tours.
  function plusCourt(seuilDepart: number): Point[] | null {
    interface Etat {
      n: number;
      // Directions d'arrivée à respecter : celle du tronçon, et sur un premier tronçon
      // court, l'orientation de la voiture (elle n'a pas la place de se réaligner avant).
      dirs: Point[];
      roule: number;
      cout: number;
      precedent: Etat | null;
    }
    const ouverts: Etat[] = [{ n: ia, dirs: orientation ? [orientation] : [], roule: 0, cout: 0, precedent: null }];
    const faits = new Set<string>();
    const cle = (e: Etat) => `${e.n}|${e.dirs.map((d) => `${d.x.toFixed(3)},${d.z.toFixed(3)}`).join(';')}`;
    while (ouverts.length > 0) {
      let k = 0;
      for (let i = 1; i < ouverts.length; i++) if (ouverts[i]!.cout < ouverts[k]!.cout) k = i;
      const e = ouverts.splice(k, 1)[0]!;
      if (faits.has(cle(e))) continue;
      faits.add(cle(e));
      if (e.n === ib) {
        const pts: Point[] = [];
        for (let p: Etat | null = e; p; p = p.precedent) {
          const q = noeuds[p.n]!;
          if (pts.length === 0 || distance(pts[0]!, q) > 1e-6) pts.unshift(q);
        }
        return pts;
      }
      const auDepart = e.roule < 1e-6;
      for (const { vers: w, cout } of voisins[e.n]!) {
        const sortie = direction(e.n, w);
        const seuil = auDepart && orientation ? seuilDepart : VIRAGE_MAX;
        if (sortie && e.dirs.some((d) => d.x * sortie.x + d.z * sortie.z <= seuil)) continue;
        const dirs = !sortie ? e.dirs : auDepart && orientation && cout < DEPART_COURT ? [sortie, orientation] : [sortie];
        ouverts.push({ n: w, dirs, roule: e.roule + cout, cout: e.cout + cout, precedent: e });
      }
    }
    return null;
  }
}

export function longueur(points: Point[]): number {
  let total = 0;
  for (let k = 0; k + 1 < points.length; k++) total += distance(points[k]!, points[k + 1]!);
  return total;
}

// Point situé à la distance d le long d'une ligne brisée (le dernier point au-delà).
export function pointA(points: Point[], d: number): Point {
  let reste = d;
  for (let k = 0; k + 1 < points.length; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    const l = distance(a, b);
    if (reste <= l && l > 0) return { x: a.x + ((b.x - a.x) * reste) / l, z: a.z + ((b.z - a.z) * reste) / l };
    reste -= l;
  }
  return points[points.length - 1]!;
}
