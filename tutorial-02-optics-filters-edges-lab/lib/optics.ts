export type RayState = {
  slope: number;
  height: number;
};

export function focusedImageDistance(focalLength: number, objectDistance: number) {
  if (objectDistance === Number.POSITIVE_INFINITY) return focalLength;
  if (objectDistance <= focalLength) return Number.POSITIVE_INFINITY;
  return (focalLength * objectDistance) / (objectDistance - focalLength);
}

export function circleOfConfusion(
  apertureDiameter: number,
  sensorDistance: number,
  imageDistance: number,
) {
  if (!Number.isFinite(imageDistance) || imageDistance <= 0) return 0;
  return apertureDiameter * Math.abs(sensorDistance - imageDistance) / imageDistance;
}

export function fieldOfView(sensorSize: number, planeDistance: number) {
  return 2 * Math.atan(sensorSize / (2 * planeDistance)) * 180 / Math.PI;
}

export function rayThroughLens(ray: RayState, focalLength: number, lensOffset = 0): RayState {
  return {
    slope: ray.slope - (ray.height - lensOffset) / focalLength,
    height: ray.height,
  };
}

export function propagateRay(ray: RayState, distance: number): RayState {
  return {
    slope: ray.slope,
    height: ray.height + distance * ray.slope,
  };
}

export function eventLogChange(
  gradientMagnitude: number,
  gradientAngleDegrees: number,
  speed: number,
  velocityAngleDegrees: number,
  timeInterval: number,
) {
  const angleDifference = (velocityAngleDegrees - gradientAngleDegrees) * Math.PI / 180;
  return -gradientMagnitude * speed * Math.cos(angleDifference) * timeInterval;
}

export function eventCrossings(
  logChangeRate: number,
  threshold: number,
  timeInterval: number,
  markerLimit = 6,
) {
  if (threshold <= 0 || timeInterval <= 0 || logChangeRate === 0) {
    return { total: 0, times: [] as number[] };
  }
  const rateMagnitude = Math.abs(logChangeRate);
  const total = Math.floor((rateMagnitude * timeInterval + 1e-12) / threshold);
  const times = Array.from(
    { length: Math.min(total, markerLimit) },
    (_, index) => ((index + 1) * threshold) / rateMagnitude,
  );
  return { total, times };
}

export function angularSelfSimilarity(angleRadians: number, radius: number) {
  const intensity = .5 + .4 * Math.cos(2 * angleRadians);
  const angularDerivative = -.8 * Math.sin(2 * angleRadians);
  if (radius <= 0) {
    return { intensity, gradient: { x: 0, y: 0 } };
  }
  const scale = angularDerivative / radius;
  return {
    intensity,
    gradient: {
      x: -Math.sin(angleRadians) * scale,
      y: Math.cos(angleRadians) * scale,
    },
  };
}

export function normalizationJacobian(x: number, y: number) {
  const norm = Math.hypot(x, y);
  if (norm === 0) throw new Error('The direction is undefined at the origin.');
  const denominator = norm ** 3;
  return [
    [y * y / denominator, -x * y / denominator],
    [-x * y / denominator, x * x / denominator],
  ] as const;
}
