import assert from 'node:assert/strict';
import test from 'node:test';
import { convolveRow } from '../lib/image-processing';
import { fitDiagramScale, fovArcEndpoint, linearPlanePosition, logarithmicPosition, motionVectorLength } from '../lib/diagram-geometry';
import {
  angularSelfSimilarity,
  circleOfConfusion,
  eventCrossings,
  eventLogChange,
  fieldOfView,
  focusedImageDistance,
  normalizationJacobian,
  propagateRay,
  rayThroughLens,
} from '../lib/optics';

void test('Tutorial Camera 1 preset gives 5.05 cm minimum thickness', () => {
  assert.ok(Math.abs(focusedImageDistance(50, 5000) - 50.5050505) < 1e-6);
});

void test('Tutorial Camera 2 preset gives a 0.5 cm infinity blur circle', () => {
  assert.equal(focusedImageDistance(40, Number.POSITIVE_INFINITY), 40);
  assert.equal(circleOfConfusion(20, 50, 40), 5);
});

void test('Tutorial Camera 3 preset gives 43.6 degrees FoV', () => {
  assert.ok(Math.abs(fieldOfView(40, 50) - 43.6028189) < 1e-6);
});

void test('lens changes ray slope and free space changes only ray height', () => {
  const incoming = { slope: .2, height: 10 };
  const afterLens = rayThroughLens(incoming, 50);
  assert.ok(Math.abs(afterLens.slope) < 1e-12);
  assert.equal(afterLens.height, 10);
  assert.deepEqual(propagateRay(afterLens, 80), { slope: 0, height: 10 });
});

void test('two mean passes produce the center weights [1,2,3,2,1]/9', () => {
  const impulse = [0, 0, 0, 1, 0, 0, 0];
  const mean = [1 / 3, 1 / 3, 1 / 3];
  const twice = convolveRow(convolveRow(impulse, mean), mean);
  assert.deepEqual(twice.map((value) => Number(value.toFixed(6))), [0, 0.111111, 0.222222, 0.333333, 0.222222, 0.111111, 0]);
});

void test('same-size zero padding breaks repeated-filter equivalence at the boundary', () => {
  const signal = [9, 0, 0, 0, 0, 0, 0];
  const mean = [1 / 3, 1 / 3, 1 / 3];
  const triangular = [1 / 9, 2 / 9, 3 / 9, 2 / 9, 1 / 9];
  const twice = convolveRow(convolveRow(signal, mean), mean);
  const once = convolveRow(signal, triangular);
  assert.deepEqual(twice.slice(0, 3), [2, 2, 1]);
  assert.deepEqual(once.slice(0, 3), [3, 2, 1]);
});

void test('the tutorial kernel maps I to I prime', () => {
  const source = [[128, 128, 128], [64, 192, 64], [0, 128, 64]];
  const expected = [[96, 128, 96], [80, 128, 80], [32, 80, 64]];
  assert.deepEqual(source.map((row) => convolveRow(row, [.25, .5, .25])), expected);
});

void test('events vanish for motion tangent to an edge gradient', () => {
  assert.ok(Math.abs(eventLogChange(.1, 0, 80, 90, .05)) < 1e-12);
  assert.ok(Math.abs(eventLogChange(.1, 0, 80, 0, .05) + .4) < 1e-12);
});

void test('event markers occur at threshold crossing times and keep the full count', () => {
  const crossings = eventCrossings(-4.868, .2, .06);
  assert.equal(crossings.total, 1);
  assert.ok(Math.abs(crossings.times[0] - .04108463) < 1e-7);
  const many = eventCrossings(-18, .05, .12);
  assert.equal(many.total, 43);
  assert.equal(many.times.length, 6);
});

void test('the displayed self-similar field is constant along rays and has tangent gradient', () => {
  const angle = 35 * Math.PI / 180;
  const near = angularSelfSimilarity(angle, 80);
  const far = angularSelfSimilarity(angle, 160);
  assert.equal(near.intensity, far.intensity);
  const radial = { x: Math.cos(angle) * 80, y: Math.sin(angle) * 80 };
  assert.ok(Math.abs(near.gradient.x * radial.x + near.gradient.y * radial.y) < 1e-12);
  assert.ok(Math.abs(Math.hypot(near.gradient.x, near.gradient.y) / Math.hypot(far.gradient.x, far.gradient.y) - 2) < 1e-12);
});

void test('the corrected normalized-vector Jacobian annihilates v', () => {
  const x = 3;
  const y = 4;
  const jacobian = normalizationJacobian(x, y);
  assert.ok(Math.abs(jacobian[0][0] * x + jacobian[0][1] * y) < 1e-12);
  assert.ok(Math.abs(jacobian[1][0] * x + jacobian[1][1] * y) < 1e-12);
  assert.throws(() => normalizationJacobian(0, 0));
});

void test('focus planes move continuously across the full sensor-distance range', () => {
  assert.equal(linearPlanePosition(455, 123, 2.45), 756.35);
  assert.equal(linearPlanePosition(455, 125, 2.45), 761.25);
});

void test('finite object position responds across the full distance range', () => {
  const nearest = logarithmicPosition(250, 250, 10000, 185, 92);
  const middle = logarithmicPosition(2500, 250, 10000, 185, 92);
  const farthest = logarithmicPosition(10000, 250, 10000, 185, 92);
  assert.equal(nearest, 185);
  assert.ok(middle < nearest && middle > farthest);
  assert.equal(farthest, 92);
});

void test('zero speed has a zero-length velocity vector', () => {
  assert.equal(motionVectorLength(0), 0);
  assert.equal(motionVectorLength(120), 96);
});

void test('FoV angle geometry responds to sensor size', () => {
  const narrow = fovArcEndpoint(350, 140, 54, 20, 50);
  const wide = fovArcEndpoint(350, 140, 54, 60, 50);
  assert.ok(wide.halfAngle > narrow.halfAngle);
  assert.ok(wide.y < narrow.y);
});

void test('ray display scale keeps extreme legal rays inside its vertical budget', () => {
  const scale = fitDiagramScale(3.2, 132, [25, -60]);
  assert.ok(Math.abs(-60 * scale) <= 132);
});
