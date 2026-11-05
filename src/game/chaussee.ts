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

// Plus court chemin sur la chaussée, du point le plus proche de `de` au point le plus
// proche de `vers`. Le réseau est minuscule : un Dijkstra naïf suffit.
export function chemin(r: Reseau, de: Point, vers: Point): Point[] {
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

  const dist = noeuds.map(() => Infinity);
  const precedent = noeuds.map(() => -1);
  const fait = noeuds.map(() => false);
  dist[ia] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < noeuds.length; i++) if (!fait[i] && (u < 0 || dist[i]! < dist[u]!)) u = i;
    if (u < 0 || dist[u] === Infinity || u === ib) break;
    fait[u] = true;
    for (const { vers: w, cout } of voisins[u]!) {
      if (dist[u]! + cout < dist[w]!) {
        dist[w] = dist[u]! + cout;
        precedent[w] = u;
      }
    }
  }

  const points: Point[] = [];
  for (let n = ib; n >= 0; n = precedent[n]!) {
    points.unshift(noeuds[n]!);
    if (n === ia) break;
  }
  return points;
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
