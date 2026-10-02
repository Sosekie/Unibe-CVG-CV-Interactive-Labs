// Normal integration on a small grid.
// Convention (slide 9): x to the right, y upward, z toward the camera,
// N = (p, q, 1), p = -dz/dx, q = -dz/dy, and grad z = -(n1/n3, n2/n3).
import { invertMatrix } from '@/lib/linear-algebra';

export type IntegrationMethod = 'least-squares' | 'xy' | 'yx';
export type SurfaceCell = { x: number; y: number; depth: number; p: number; q: number; nx: number; ny: number; nz: number };

export const GRID_ROWS = 12;
export const GRID_COLUMNS = 16;
// Fixed colour ranges, so that changing a slider changes the picture.
export const DEPTH_RANGE: [number, number] = [-0.6, 1.2];
export const ERROR_RANGE = 0.5;

const SWIRL = 0.35;
const index = (row: number, column: number, columns: number) => row * columns + column;

// Unit normal of a surface with slopes (zx, zy), slide 9: N = (p, q, 1), p = -zx, q = -zy.
export function normalFromSlopes(zx: number, zy: number) {
  const p = -zx; const q = -zy;
  const length = Math.sqrt(p * p + q * q + 1);
  return { p, q, n: [p / length, q / length, 1 / length] as [number, number, number] };
}

export function depthAt(x: number, y: number, amplitude: number) {
  const mound = Math.exp(-3.2 * (x * x + y * y));
  const ripple = Math.sin(Math.PI * x) * Math.cos(Math.PI * y);
  return amplitude * (0.64 * mound + 0.25 * ripple);
}

// Least-squares matrix D^T D for slope equations in slope units, with the
// unknown at cell 0 fixed to zero. It depends only on the grid, so it is cached.
const inverseCache = new Map<string, number[][]>();
function leastSquaresInverse(rows: number, columns: number, stepX: number, stepY: number) {
  const key = `${rows}x${columns}`;
  const cached = inverseCache.get(key);
  if (cached) return cached;
  const size = rows * columns;
  const normal = Array.from({ length: size }, () => Array(size).fill(0));
  const addEdge = (a: number, b: number, step: number) => {
    const w = 1 / (step * step);
    normal[a][a] += w; normal[b][b] += w; normal[a][b] -= w; normal[b][a] -= w;
  };
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns - 1; column += 1) addEdge(index(row, column, columns), index(row, column + 1, columns), stepX);
  for (let row = 0; row < rows - 1; row += 1) for (let column = 0; column < columns; column += 1) addEdge(index(row, column, columns), index(row + 1, column, columns), stepY);
  const reduced = normal.slice(1).map((line) => line.slice(1));
  const inverse = invertMatrix(reduced);
  if (!inverse) throw new Error('Normal-integration system is singular.');
  inverseCache.set(key, inverse);
  return inverse;
}

export function normalIntegrationSurface(rows: number, columns: number, amplitude: number, inconsistency: number) {
  const stepX = 2 / (columns - 1);
  const stepY = 2 / (rows - 1);
  const xs = Array.from({ length: columns }, (_, column) => -1 + column * stepX);
  const ys = Array.from({ length: rows }, (_, row) => -1 + row * stepY); // row 0 is the bottom row
  const raw = Array.from({ length: rows * columns }, (_, cell) => depthAt(xs[cell % columns], ys[Math.floor(cell / columns)], amplitude));
  const truth = raw.map((value) => value - raw[0]); // the unknown constant is fixed by z = 0 at the bottom-left cell

  // Measured slopes on grid edges: forward differences of the true depth,
  // plus an optional swirl (SWIRL*y, -SWIRL*x) that no surface can produce.
  const slopeX = Array.from({ length: rows }, (_, row) => Array.from({ length: columns - 1 }, (_, column) =>
    (truth[index(row, column + 1, columns)] - truth[index(row, column, columns)]) / stepX + inconsistency * SWIRL * ys[row]));
  const slopeY = Array.from({ length: rows - 1 }, (_, row) => Array.from({ length: columns }, (_, column) =>
    (truth[index(row + 1, column, columns)] - truth[index(row, column, columns)]) / stepY - inconsistency * SWIRL * xs[column]));

  const pathXY = Array(rows * columns).fill(0);
  for (let column = 1; column < columns; column += 1) pathXY[index(0, column, columns)] = pathXY[index(0, column - 1, columns)] + slopeX[0][column - 1] * stepX;
  for (let column = 0; column < columns; column += 1) for (let row = 1; row < rows; row += 1) pathXY[index(row, column, columns)] = pathXY[index(row - 1, column, columns)] + slopeY[row - 1][column] * stepY;
  const pathYX = Array(rows * columns).fill(0);
  for (let row = 1; row < rows; row += 1) pathYX[index(row, 0, columns)] = pathYX[index(row - 1, 0, columns)] + slopeY[row - 1][0] * stepY;
  for (let row = 0; row < rows; row += 1) for (let column = 1; column < columns; column += 1) pathYX[index(row, column, columns)] = pathYX[index(row, column - 1, columns)] + slopeX[row][column - 1] * stepX;

  // Least squares: minimise sum ((z_right - z)/hx - slopeX)^2 + ((z_up - z)/hy - slopeY)^2 with z_0 = 0.
  const rhs = Array(rows * columns).fill(0);
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns - 1; column += 1) {
    const b = slopeX[row][column] / stepX;
    rhs[index(row, column + 1, columns)] += b; rhs[index(row, column, columns)] -= b;
  }
  for (let row = 0; row < rows - 1; row += 1) for (let column = 0; column < columns; column += 1) {
    const b = slopeY[row][column] / stepY;
    rhs[index(row + 1, column, columns)] += b; rhs[index(row, column, columns)] -= b;
  }
  const inverse = leastSquaresInverse(rows, columns, stepX, stepY);
  const reducedRhs = rhs.slice(1);
  const leastSquares = [0, ...inverse.map((line) => line.reduce((sum, value, k) => sum + value * reducedRhs[k], 0))];

  // Discrete integrability residual p_y - q_x on every grid square.
  let curlEnergy = 0;
  let curlCount = 0;
  for (let row = 0; row < rows - 1; row += 1) for (let column = 0; column < columns - 1; column += 1) {
    const zxy = (slopeX[row + 1][column] - slopeX[row][column]) / stepY;
    const zyx = (slopeY[row][column + 1] - slopeY[row][column]) / stepX;
    curlEnergy += (zxy - zyx) ** 2;
    curlCount += 1;
  }

  const cells: SurfaceCell[] = truth.map((depth, cell) => {
    const row = Math.floor(cell / columns);
    const column = cell % columns;
    const sx = [slopeX[row][column - 1], slopeX[row][column]].filter((value) => value !== undefined);
    const sy = [slopeY[row - 1]?.[column], slopeY[row]?.[column]].filter((value) => value !== undefined);
    const p = -(sx.reduce((sum, value) => sum + value, 0) / sx.length);
    const q = -(sy.reduce((sum, value) => sum + value, 0) / sy.length);
    const length = Math.sqrt(p * p + q * q + 1);
    return { x: xs[column], y: ys[row], depth, p, q, nx: p / length, ny: q / length, nz: 1 / length };
  });

  const rms = (values: number[], reference: number[]) => Math.sqrt(values.reduce((sum, value, cell) => sum + (value - reference[cell]) ** 2, 0) / values.length);
  const reconstructions = { 'least-squares': leastSquares, xy: pathXY, yx: pathYX } satisfies Record<IntegrationMethod, number[]>;
  return {
    rows, columns, cells, truth, reconstructions,
    curlRms: Math.sqrt(curlEnergy / curlCount),
    pathRms: rms(pathXY, pathYX),
    errorRms: { 'least-squares': rms(leastSquares, truth), xy: rms(pathXY, truth), yx: rms(pathYX, truth) } satisfies Record<IntegrationMethod, number>,
  };
}
