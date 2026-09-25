import { leastSquares, solveLinearSystem } from '@/lib/linear-algebra';
import type { Point2 } from '@/lib/fitting';

export type Matrix3 = [[number, number, number], [number, number, number], [number, number, number]];

const cross = (a: Point2, b: Point2, c: Point2) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

function hasCollinearTriple(points: Point2[]) {
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      for (let k = j + 1; k < points.length; k += 1) {
        // The controls are in a unit square; flag near-collinearity before
        // rounding and solver noise produce an unstable visual warp.
        if (Math.abs(cross(points[i], points[j], points[k])) < 0.008) return true;
      }
    }
  }
  return false;
}

// A folded target can have a mathematical projectivity, but its image of the
// source square passes through infinity and is unsuitable for this finite grid.
export function quadrilateralIssue(points: Point2[]): 'collinear' | 'folded' | null {
  if (points.length !== 4) return null;
  if (hasCollinearTriple(points)) return 'collinear';
  const turns = points.map((point, index) => cross(point, points[(index + 1) % 4], points[(index + 2) % 4]));
  return turns.every((turn) => turn > 0) || turns.every((turn) => turn < 0) ? null : 'folded';
}

export function estimateAffine(source: Point2[], target: Point2[]): Matrix3 | null {
  if (source.length < 3 || source.length !== target.length) return null;
  const matrix: number[][] = [];
  const values: number[] = [];
  source.forEach((point, index) => {
    const mapped = target[index];
    matrix.push([point.x, point.y, 0, 0, 1, 0], [0, 0, point.x, point.y, 0, 1]);
    values.push(mapped.x, mapped.y);
  });
  const solution = leastSquares(matrix, values);
  if (!solution) return null;
  return [[solution[0], solution[1], solution[4]], [solution[2], solution[3], solution[5]], [0, 0, 1]];
}

export function estimateHomography(source: Point2[], target: Point2[]): Matrix3 | null {
  if (source.length !== 4 || target.length !== 4) return null;
  if (hasCollinearTriple(source) || hasCollinearTriple(target)) return null;
  const matrix: number[][] = [];
  const values: number[] = [];
  source.forEach((point, index) => {
    const mapped = target[index];
    matrix.push(
      [point.x, point.y, 1, 0, 0, 0, -mapped.x * point.x, -mapped.x * point.y],
      [0, 0, 0, point.x, point.y, 1, -mapped.y * point.x, -mapped.y * point.y],
    );
    values.push(mapped.x, mapped.y);
  });
  const h = solveLinearSystem(matrix, values);
  if (!h) return null;
  const result: Matrix3 = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
  const determinant = result[0][0] * (result[1][1] - result[1][2] * result[2][1])
    - result[0][1] * (result[1][0] - result[1][2] * result[2][0])
    + result[0][2] * (result[1][0] * result[2][1] - result[1][1] * result[2][0]);
  return Math.abs(determinant) < 1e-10 ? null : result;
}

export function transformPoint(matrix: Matrix3, point: Point2) {
  const scale = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
  if (!Number.isFinite(scale) || Math.abs(scale) < 1e-10) return null;
  const mapped = {
    x: (matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2]) / scale,
    y: (matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2]) / scale,
  };
  return Number.isFinite(mapped.x) && Number.isFinite(mapped.y) ? mapped : null;
}

export function reprojectionError(matrix: Matrix3 | null, source: Point2[], target: Point2[]) {
  if (!matrix) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let index = 0; index < source.length; index += 1) {
    const point = source[index];
    const mapped = transformPoint(matrix, point);
    if (!mapped) return Number.POSITIVE_INFINITY;
    sum += (mapped.x - target[index].x) ** 2 + (mapped.y - target[index].y) ** 2;
  }
  return Math.sqrt(sum / source.length);
}
