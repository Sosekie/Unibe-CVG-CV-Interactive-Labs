import { leastSquares, solveLinearSystem } from '@/lib/linear-algebra';
import type { Point2 } from '@/lib/fitting';

export type Matrix3 = [[number, number, number], [number, number, number], [number, number, number]];

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
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

export function transformPoint(matrix: Matrix3, point: Point2) {
  const scale = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
  if (Math.abs(scale) < 1e-10) return null;
  return {
    x: (matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2]) / scale,
    y: (matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2]) / scale,
  };
}

export function reprojectionError(matrix: Matrix3 | null, source: Point2[], target: Point2[]) {
  if (!matrix) return Number.POSITIVE_INFINITY;
  return Math.sqrt(source.reduce((sum, point, index) => {
    const mapped = transformPoint(matrix, point);
    return sum + (mapped ? (mapped.x - target[index].x) ** 2 + (mapped.y - target[index].y) ** 2 : 1e6);
  }, 0) / source.length);
}
