export function linearPlanePosition(lensPosition: number, distance: number, pixelsPerUnit: number) {
  return lensPosition + distance * pixelsPerUnit;
}

export function logarithmicPosition(
  value: number,
  minimum: number,
  maximum: number,
  positionAtMinimum: number,
  positionAtMaximum: number,
) {
  const clampedValue = Math.min(maximum, Math.max(minimum, value));
  const progress = (Math.log(clampedValue) - Math.log(minimum))
    / (Math.log(maximum) - Math.log(minimum));
  return positionAtMinimum + progress * (positionAtMaximum - positionAtMinimum);
}

export function motionVectorLength(speed: number, pixelsPerUnit = .8) {
  return Math.max(0, speed) * pixelsPerUnit;
}

export function fitDiagramScale(preferredScale: number, pixelBudget: number, values: number[]) {
  const largestMagnitude = Math.max(1, ...values.map((value) => Math.abs(value)));
  return Math.min(preferredScale, pixelBudget / largestMagnitude);
}

export function fovArcEndpoint(
  centerX: number,
  centerY: number,
  radius: number,
  sensorSize: number,
  focalLength: number,
) {
  const halfAngle = Math.atan(sensorSize / (2 * focalLength));
  return {
    halfAngle,
    x: centerX - Math.cos(halfAngle) * radius,
    y: centerY - Math.sin(halfAngle) * radius,
  };
}
