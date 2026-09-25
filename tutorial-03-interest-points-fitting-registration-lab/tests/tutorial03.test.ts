import assert from "node:assert/strict";
import test from "node:test";

import { interestPointMetrics } from "../lib/interest-points";
import {
  ordinaryLeastSquares,
  prewittPlane,
  totalLeastSquares,
} from "../lib/fitting";
import type { Point2 } from "../lib/fitting";
import { edgeDetectionInterval, gaussianStepProfile } from "../lib/edges";
import {
  estimateAffine,
  estimateHomography,
  quadrilateralIssue,
  reprojectionError,
  transformPoint,
  type Matrix3,
} from "../lib/registration";

const closeTo = (actual: number, expected: number, tolerance = 1e-6) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

void test("Gaussian smoothing keeps the derivative peak centered on the edge", () => {
  const profile = gaussianStepProfile(43, 0.8, 4, 101);
  const peak = profile.reduce((best, sample) => sample.gradient > best.gradient ? sample : best);
  closeTo(peak.x, 43);
  closeTo(peak.gradient, 0.8 / (Math.sqrt(2 * Math.PI) * 4));
});

void test("strong smoothing can lower an edge below a fixed threshold", () => {
  assert.ok(edgeDetectionInterval(50, 0.8, 2, 0.05).interval);
  assert.equal(edgeDetectionInterval(50, 0.8, 10, 0.05).interval, null);
});

void test("Harris scores reproduce the tutorial values and intensity scaling", () => {
  const star = interestPointMetrics(1, 3, 3, 0.05);
  const doubleStar = interestPointMetrics(1, 5, 3, 0.05);
  const halfContrast = interestPointMetrics(0.5, 3, 3, 0.05);

  closeTo(star.harris, 0.145679012345679);
  closeTo(doubleStar.harris, -0.0222222222222222);
  closeTo(halfContrast.harris, star.harris / 16);
  closeTo(star.tensor[0][1], -1 / 9);
  closeTo(star.hessian, 15 / 16);
  closeTo(doubleStar.hessian, 0);
  assert.equal(star.classification, "corner");
  assert.equal(doubleStar.classification, "edge");
});

void test("ordinary least squares returns y = 3x - 7 for the tutorial preset", () => {
  const fit = ordinaryLeastSquares([
    { x: 1, y: -4 },
    { x: 2, y: -1 },
    { x: 3, y: 2 },
    { x: 4, y: 5 },
  ]);

  closeTo(fit.slope, 3);
  closeTo(fit.intercept, -7);
});

void test("total least squares returns the orthogonal line representation", () => {
  const fit = totalLeastSquares([
    { x: 1, y: -4 },
    { x: 2, y: -1 },
    { x: 3, y: 2 },
    { x: 4, y: 5 },
  ]);

  closeTo(fit.a, -3 / Math.sqrt(10));
  closeTo(fit.b, 1 / Math.sqrt(10));
  closeTo(fit.d, -7 / Math.sqrt(10));
});

void test("least-squares plane fitting recovers the Prewitt coefficients", () => {
  const fit = prewittPlane([2, 4, 6, 1, 3, 5, 0, 2, 4]);

  closeTo(fit.a, 2);
  closeTo(fit.b, 1);
  closeTo(fit.c, 3);
});

void test("affine estimation maps all non-collinear correspondences", () => {
  const source: Point2[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
  const target = source.map(({ x, y }) => ({
    x: 2 * x + 0.5 * y + 1,
    y: -x + 3 * y - 2,
  }));
  const matrix = estimateAffine(source, target);

  assert.ok(matrix);
  source.forEach((point, index) => {
    const mapped = transformPoint(matrix, point);
    assert.ok(mapped);
    closeTo(mapped.x, target[index].x);
    closeTo(mapped.y, target[index].y);
  });
});

void test("homography estimation recovers a projective transformation", () => {
  const source: Point2[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const expected: Matrix3 = [
    [1.2, 0.2, 0.1],
    [0.1, 0.9, 0.2],
    [0.15, 0.1, 1],
  ];
  const target = source.map((point) => {
    const mapped = transformPoint(expected, point);
    assert.ok(mapped);
    return mapped;
  });
  const matrix = estimateHomography(source, target);

  assert.ok(matrix);
  source.forEach((point, index) => {
    const mapped = transformPoint(matrix, point);
    assert.ok(mapped);
    closeTo(mapped.x, target[index].x, 1e-5);
    closeTo(mapped.y, target[index].y, 1e-5);
  });
});

void test("affine estimation rejects three collinear source points", () => {
  const source: Point2[] = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ];
  const target: Point2[] = [
    { x: 0, y: 1 },
    { x: 2, y: 3 },
    { x: 4, y: 5 },
  ];

  assert.equal(estimateAffine(source, target), null);
});

void test("homography rejects collinear targets and identifies a folded grid", () => {
  const source: Point2[] = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  ];
  const collinear = [
    { x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  ];
  const folded = [
    { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 },
  ];
  assert.equal(quadrilateralIssue(collinear), "collinear");
  assert.equal(estimateHomography(source, collinear), null);
  assert.equal(quadrilateralIssue(folded), "folded");
  assert.equal(reprojectionError(null, source, collinear), Number.POSITIVE_INFINITY);
});
