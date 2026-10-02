import assert from 'node:assert/strict';
import test from 'node:test';
import { planeIllumination } from '../lib/lighting';
import { estimatePhotometricStereo } from '../lib/photometric';
import { contourSegments, reflectance } from '../lib/reflectance';
import { GRID_COLUMNS, GRID_ROWS, normalFromSlopes, normalIntegrationSurface } from '../lib/shading';
import { tutorialQuestions } from '../lib/question-bank';
import { determinant3, nearLightBrightness, pathIntegrals, solveWorksheetLights } from '../lib/worked-answers';

const closeTo = (actual: number, expected: number, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} within ${tolerance} of ${expected}`);
const methods = ['least-squares', 'xy', 'yx'] as const;

void test('slide-9 convention: the plane z = 2x - y + 3 has n = (-2, 1, 1)/sqrt(6)', () => {
  const { p, q, n } = normalFromSlopes(2, -1);
  assert.equal(p, -2); assert.equal(q, 1);
  closeTo(n[0], -2 / Math.sqrt(6)); closeTo(n[1], 1 / Math.sqrt(6)); closeTo(n[2], 1 / Math.sqrt(6));
  // grad z = -(n1/n3, n2/n3) recovers the slopes
  closeTo(-n[0] / n[2], 2); closeTo(-n[1] / n[2], -1);
});

void test('an integrable field is recovered exactly by least squares and by both paths', () => {
  const surface = normalIntegrationSurface(GRID_ROWS, GRID_COLUMNS, 1, 0);
  assert.ok(surface.curlRms < 1e-10);
  assert.ok(surface.pathRms < 1e-10);
  for (const method of methods) assert.ok(surface.errorRms[method] < 1e-9, method);
});

void test('a swirl makes the paths disagree while least squares stays close to the truth', () => {
  const surface = normalIntegrationSurface(GRID_ROWS, GRID_COLUMNS, 1, 1);
  closeTo(surface.curlRms, 0.7, 1e-9);
  assert.ok(surface.pathRms > 0.5);
  assert.ok(surface.errorRms.xy > 0.4 && surface.errorRms.yx > 0.4);
  const leastSquaresMax = Math.max(...surface.reconstructions['least-squares'].map((value, cell) => Math.abs(value - surface.truth[cell])));
  const pathMax = Math.max(...surface.reconstructions.xy.map((value, cell) => Math.abs(value - surface.truth[cell])));
  assert.ok(leastSquaresMax < 0.07, `least-squares max error ${leastSquaresMax}`);
  assert.ok(pathMax > 1.3 && pathMax < 1.5, `path max error ${pathMax}`);
});

void test('normal integration emits unit normals that lean against the slope', () => {
  const surface = normalIntegrationSurface(8, 9, 1.2, .3);
  for (const cell of surface.cells) {
    closeTo(Math.hypot(cell.nx, cell.ny, cell.nz), 1);
    closeTo(cell.nx / cell.nz, cell.p); closeTo(cell.ny / cell.nz, cell.q);
  }
});

void test('three independent lights exactly recover albedo and normal without noise', () => {
  const result = estimatePhotometricStereo({ count: 3, spread: 220, noise: 0, tilt: 32 });
  assert.equal(result.rank, 3);
  closeTo(result.estimatedAlbedo, .78, 1e-8);
  assert.ok(result.angularError < 1e-6);
  assert.ok(result.residual < 1e-8);
});

void test('the worksheet Q4 preset reproduces rho = 3/5 and n = (2/3, 2/3, 1/3)', () => {
  const result = estimatePhotometricStereo({ set: 'worksheet', count: 3, spread: 0, noise: 0, tilt: 0 });
  closeTo(result.intensities[0], 1 / 5, 1e-12);
  closeTo(result.intensities[1], 3 * Math.SQRT2 / 10, 1e-12);
  closeTo(result.intensities[2], 3 * Math.SQRT2 / 10, 1e-12);
  closeTo(result.estimatedAlbedo, .6, 1e-10);
  assert.ok(result.estimatedNormal);
  result.estimatedNormal.forEach((value, index) => closeTo(value, [2 / 3, 2 / 3, 1 / 3][index], 1e-10));
});

void test('coplanar lights (worksheet Q3b) are rank 2 and give no unique estimate', () => {
  const result = estimatePhotometricStereo({ set: 'coplanar', count: 3, spread: 0, noise: 0, tilt: 20 });
  assert.equal(result.rank, 2);
  assert.equal(result.estimate, null);
  assert.equal(result.condition, Number.POSITIVE_INFINITY);
});

void test('a narrow light ring is badly conditioned and amplifies the same noise', () => {
  const wide = estimatePhotometricStereo({ count: 3, spread: 220, noise: .08, tilt: 28 });
  const narrow = estimatePhotometricStereo({ count: 3, spread: 40, noise: .08, tilt: 28 });
  assert.ok(narrow.condition > 3 * wide.condition);
  assert.ok(narrow.angularError > wide.angularError);
});

void test('an overdetermined lighting system still recovers the exact scaled normal', () => {
  const result = estimatePhotometricStereo({ count: 6, spread: 300, noise: 0, tilt: 45 });
  assert.equal(result.rank, 3);
  closeTo(result.estimatedAlbedo, .78, 1e-8);
  assert.ok(result.angularError < 1e-6);
});

void test('reflectance map for s ∝ (1, 0, 1): maximum at n = s, zero on p = -1, parabola at 1/sqrt(2)', () => {
  closeTo(reflectance(1, 0, 1, 0), 1);
  for (const q of [-2, 0, 1.5]) closeTo(reflectance(-1, q, 1, 0), 0);
  for (const [p, q] of [[0, 0], [2, 2], [2, -2], [0.5, 1]]) closeTo(reflectance(p, q, 1, 0), Math.SQRT1_2, 1e-12);
  const segments = contourSegments(1, 0, Math.SQRT1_2, 3);
  assert.ok(segments.length > 20);
  for (const [p1, q1, p2, q2] of segments) { assert.ok(Math.abs(q1 * q1 - 2 * p1) < .03); assert.ok(Math.abs(q2 * q2 - 2 * p2) < .03); }
});

void test('nearby light (worksheet Q7): brightest below the light, contrast 0.82 vs 0.54', () => {
  const unitDirection = planeIllumination(5, 5, 10, false);
  const falloff = planeIllumination(5, 5, 10, true);
  assert.deepEqual(unitDirection.brightest, { x: 5, y: 5 });
  closeTo(unitDirection.maximum, 1);
  closeTo(unitDirection.cornerRatio, 10 / Math.sqrt(150));
  closeTo(falloff.cornerRatio, (100 / 150) ** 1.5);
  const peak = unitDirection.cells.reduce((best, cell) => (cell.brightness > best.brightness ? cell : best));
  assert.deepEqual([peak.x, peak.y], [5, 5]);
  for (const cell of falloff.cells) assert.ok(cell.relative <= 1 + 1e-12);
});

void test('the question bank has two questions per lab with unique ids', () => {
  const ids = new Set(tutorialQuestions.map((question) => question.id));
  assert.equal(ids.size, tutorialQuestions.length);
  const counts = new Map<string, number>();
  for (const question of tutorialQuestions) counts.set(question.groupName, (counts.get(question.groupName) ?? 0) + 1);
  assert.deepEqual([...counts.values()], [2, 2, 2]);
});

void test('worked answer Q2: the two paths for (y, 0) give 0 and -1, and (y, x) gives one answer', () => {
  const failing = pathIntegrals(0, 1, 1);
  closeTo(failing.viaX, 0); closeTo(failing.viaY, -1); closeTo(failing.gap, 1);
  for (const [a, b] of [[1, 1], [0.4, 1.3], [1.5, 0.2]]) closeTo(pathIntegrals(1, a, b).gap, 0);
  const general = pathIntegrals(0.4, 1.3, 0.7);
  closeTo(general.gap, general.curl * 1.3 * 0.7);
});

void test('worked answer Q3: the worksheet lights are coplanar, the Q4 lights are not', () => {
  const coplanar = [[0, 0, 1], [Math.SQRT1_2, 0, Math.SQRT1_2], [-Math.SQRT1_2, 0, Math.SQRT1_2]] as [number, number, number][];
  const independent = [[0, 0, 1], [Math.SQRT1_2, 0, Math.SQRT1_2], [0, Math.SQRT1_2, Math.SQRT1_2]] as [number, number, number][];
  closeTo(determinant3(coplanar), 0, 1e-12);
  closeTo(determinant3(independent), 0.5, 1e-12);
});

void test('worked answer Q4: the worksheet intensities give rho = 3/5, and scaling I keeps n', () => {
  const intensities = [0.2, 0.3 * Math.SQRT2, 0.3 * Math.SQRT2];
  const solved = solveWorksheetLights(intensities);
  closeTo(solved.albedo, 0.6, 1e-12);
  assert.ok(solved.normal);
  solved.normal.forEach((value, index) => closeTo(value, [2 / 3, 2 / 3, 1 / 3][index], 1e-12));
  const brighter = solveWorksheetLights(intensities.map((value) => 1.5 * value));
  closeTo(brighter.albedo, 0.9, 1e-12);
  assert.ok(brighter.normal);
  brighter.normal.forEach((value, index) => closeTo(value, solved.normal![index], 1e-12));
  assert.equal(solveWorksheetLights([0, 0, 0]).normal, null);
});

void test('worked answer Q6: corner ratio 0.816 without and 0.544 with the 1/d^2 fall-off', () => {
  const corner = nearLightBrightness(10, Math.sqrt(50));
  closeTo(corner.cosine, 10 / Math.sqrt(150));
  closeTo(corner.relativeWithFalloff, (100 / 150) ** 1.5);
  const below = nearLightBrightness(10, 0);
  closeTo(below.cosine, 1); closeTo(below.withFalloff, 0.01); closeTo(below.angle, 0);
});
