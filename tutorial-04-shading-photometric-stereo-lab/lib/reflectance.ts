// Lambertian reflectance map in gradient space (slides 10-12), with rho = L = 1.
// An orientation (p, q) has the normal N = (p, q, 1); the light is s ∝ (ps, qs, 1).

export function reflectance(p: number, q: number, ps: number, qs: number) {
  const value = (p * ps + q * qs + 1) / (Math.sqrt(1 + p * p + q * q) * Math.sqrt(1 + ps * ps + qs * qs));
  return Math.max(0, value);
}

export function incidenceAngle(p: number, q: number, ps: number, qs: number) {
  const value = (p * ps + q * qs + 1) / (Math.sqrt(1 + p * p + q * q) * Math.sqrt(1 + ps * ps + qs * qs));
  return Math.acos(Math.max(-1, Math.min(1, value))) * 180 / Math.PI;
}

export type Segment = [number, number, number, number];

// Marching squares: line segments of the level set R(p, q) = level on [-extent, extent]^2.
export function contourSegments(ps: number, qs: number, level: number, extent = 3, samples = 121): Segment[] {
  const step = 2 * extent / (samples - 1);
  const coordinate = (k: number) => -extent + k * step;
  const values = Array.from({ length: samples }, (_, j) => Array.from({ length: samples }, (_, i) => reflectance(coordinate(i), coordinate(j), ps, qs) - level));
  const segments: Segment[] = [];
  const crossing = (i0: number, j0: number, i1: number, j1: number): [number, number] => {
    const a = values[j0][i0]; const b = values[j1][i1];
    const t = a / (a - b);
    return [coordinate(i0 + t * (i1 - i0)), coordinate(j0 + t * (j1 - j0))];
  };
  for (let j = 0; j < samples - 1; j += 1) for (let i = 0; i < samples - 1; i += 1) {
    const corners = [values[j][i], values[j][i + 1], values[j + 1][i + 1], values[j + 1][i]];
    const points: [number, number][] = [];
    if ((corners[0] > 0) !== (corners[1] > 0)) points.push(crossing(i, j, i + 1, j));
    if ((corners[1] > 0) !== (corners[2] > 0)) points.push(crossing(i + 1, j, i + 1, j + 1));
    if ((corners[2] > 0) !== (corners[3] > 0)) points.push(crossing(i + 1, j + 1, i, j + 1));
    if ((corners[3] > 0) !== (corners[0] > 0)) points.push(crossing(i, j + 1, i, j));
    if (points.length === 2) segments.push([points[0][0], points[0][1], points[1][0], points[1][1]]);
    if (points.length === 4) {
      segments.push([points[0][0], points[0][1], points[1][0], points[1][1]]);
      segments.push([points[2][0], points[2][1], points[3][0], points[3][1]]);
    }
  }
  return segments;
}
