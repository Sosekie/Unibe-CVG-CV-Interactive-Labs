import { leastSquares } from '@/lib/linear-algebra';

export type Vector3 = [number, number, number];
export type LightSet = 'ring' | 'worksheet' | 'coplanar';

const radians = (degrees: number) => degrees * Math.PI / 180;
const length = (vector: Vector3) => Math.hypot(...vector);
const unit = (vector: Vector3): Vector3 => vector.map((value) => value / length(vector)) as Vector3;
const dot = (a: Vector3, b: Vector3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const RING_ELEVATION = 55;
// Worksheet Q4: these lights with rho = 3/5 and n = (2/3, 2/3, 1/3) give I = (1/5, 3*sqrt(2)/10, 3*sqrt(2)/10).
export const WORKSHEET_ALBEDO = 0.6;
export const WORKSHEET_NORMAL: Vector3 = [2 / 3, 2 / 3, 1 / 3];

export function surfaceNormal(tiltDegrees: number, azimuthDegrees: number): Vector3 {
  const tilt = radians(tiltDegrees);
  const azimuth = radians(azimuthDegrees);
  return [Math.sin(tilt) * Math.cos(azimuth), Math.sin(tilt) * Math.sin(azimuth), Math.cos(tilt)];
}

export function lightDirections(set: LightSet, count: number, spreadDegrees: number): Vector3[] {
  if (set === 'worksheet') return [[0, 0, 1], unit([1, 0, 1]), unit([0, 1, 1])];
  if (set === 'coplanar') return [[0, 0, 1], unit([1, 0, 1]), unit([-1, 0, 1])];
  const elevation = radians(RING_ELEVATION);
  return Array.from({ length: count }, (_, index) => {
    const offset = count === 1 ? 0 : -spreadDegrees / 2 + index * spreadDegrees / (count - 1);
    const azimuth = radians(offset);
    return [Math.cos(elevation) * Math.cos(azimuth), Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation)];
  });
}

function symmetricEigenvalues3(source: number[][]) {
  const matrix = source.map((row) => [...row]);
  for (let iteration = 0; iteration < 24; iteration += 1) {
    let p = 0; let q = 1;
    if (Math.abs(matrix[0][2]) > Math.abs(matrix[p][q])) { p = 0; q = 2; }
    if (Math.abs(matrix[1][2]) > Math.abs(matrix[p][q])) { p = 1; q = 2; }
    if (Math.abs(matrix[p][q]) < 1e-12) break;
    const angle = .5 * Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]);
    const cosine = Math.cos(angle); const sine = Math.sin(angle);
    const app = matrix[p][p]; const aqq = matrix[q][q]; const apq = matrix[p][q];
    matrix[p][p] = cosine * cosine * app - 2 * sine * cosine * apq + sine * sine * aqq;
    matrix[q][q] = sine * sine * app + 2 * sine * cosine * apq + cosine * cosine * aqq;
    matrix[p][q] = 0; matrix[q][p] = 0;
    for (let row = 0; row < 3; row += 1) if (row !== p && row !== q) {
      const arp = matrix[row][p]; const arq = matrix[row][q];
      matrix[row][p] = matrix[p][row] = cosine * arp - sine * arq;
      matrix[row][q] = matrix[q][row] = sine * arp + cosine * arq;
    }
  }
  return [matrix[0][0], matrix[1][1], matrix[2][2]].sort((a, b) => a - b);
}

export function estimatePhotometricStereo(options: { set?: LightSet; count: number; spread: number; noise: number; tilt: number; azimuth?: number; albedo?: number }) {
  const set = options.set ?? 'ring';
  const normal = set === 'worksheet' ? WORKSHEET_NORMAL : surfaceNormal(options.tilt, options.azimuth ?? 35);
  const albedo = set === 'worksheet' ? WORKSHEET_ALBEDO : options.albedo ?? .78;
  const lights = lightDirections(set, options.count, options.spread);
  // Light intensities L_k = 1, so the rows of S are the unit light directions.
  const cleanIntensities = lights.map((light) => albedo * Math.max(0, dot(normal, light)));
  // A fixed, repeatable noise pattern (not random), so a setting always gives the same picture.
  const intensities = cleanIntensities.map((value, index) => Math.max(0, value + options.noise * Math.sin((index + 1) * 2.17)));
  const estimate = leastSquares(lights, intensities) as Vector3 | null;
  const ata = Array.from({ length: 3 }, (_, i) => Array.from({ length: 3 }, (_, j) => lights.reduce((sum, light) => sum + light[i] * light[j], 0)));
  const eigenvalues = symmetricEigenvalues3(ata);
  const rank = eigenvalues.filter((value) => value > 1e-7).length;
  // kappa(S) = largest / smallest singular value of S.
  const condition = eigenvalues[0] > 1e-9 ? Math.sqrt(eigenvalues[2] / eigenvalues[0]) : Number.POSITIVE_INFINITY;
  const base = { set, normal, albedo, lights, intensities, cleanIntensities, rank, condition };
  if (!estimate || rank < 3) return { ...base, estimate: null, estimatedAlbedo: Number.NaN, estimatedNormal: null, angularError: Number.POSITIVE_INFINITY, residual: Number.POSITIVE_INFINITY };
  const estimatedAlbedo = length(estimate);
  const estimatedNormal: Vector3 = estimate.map((value) => value / estimatedAlbedo) as Vector3;
  const cosine = Math.max(-1, Math.min(1, dot(normal, estimatedNormal)));
  const angularError = Math.acos(cosine) * 180 / Math.PI;
  const residual = Math.sqrt(lights.reduce((sum, light, index) => sum + (dot(light, estimate) - intensities[index]) ** 2, 0) / lights.length);
  return { ...base, estimate, estimatedAlbedo, estimatedNormal, angularError, residual };
}
