export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
export const FOCAL_MIN = 14;
export const FOCAL_MAX = 120;
export const REFERENCE_WIDTH = 1200;
export const REFERENCE_HEIGHT = 800;

export type CameraParameters = {
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
  objectDistance: number;
  objectHeight: number;
  cx: number;
  cy: number;
};

export function fieldOfView(sensorSize: number, focalLength: number, principalOffset = 0) {
  const firstHalf = Math.atan((sensorSize / 2 + principalOffset) / focalLength);
  const secondHalf = Math.atan((sensorSize / 2 - principalOffset) / focalLength);
  return (firstHalf + secondHalf) * DEG;
}

export function projectCoordinate(coordinate: number, focalLength: number, depth: number) {
  // Signed displacement from the physical principal point, in millimetres.
  return -(focalLength * coordinate) / depth;
}

export function projectToSensor(x: number, y: number, depth: number, focalLength: number, cx = 0, cy = 0) {
  return { x: cx + projectCoordinate(x, focalLength, depth), y: cy + projectCoordinate(y, focalLength, depth) };
}

export function sensorToPixels(x: number, y: number, sensorWidth: number, sensorHeight: number) {
  return { u: (x + sensorWidth / 2) * REFERENCE_WIDTH / sensorWidth, v: (sensorHeight / 2 - y) * REFERENCE_HEIGHT / sensorHeight };
}

export function sensorCoverage(imageHeight: number, sensorHeight: number, cy = 0) {
  const lower = cy - imageHeight / 2;
  const upper = cy + imageHeight / 2;
  const visibleLower = Math.max(-sensorHeight / 2, lower);
  const visibleUpper = Math.min(sensorHeight / 2, upper);
  return {
    visibleLower,
    visibleUpper,
    recordedHeight: Math.max(0, visibleUpper - visibleLower),
    isCropped: lower < -sensorHeight / 2 - 1e-9 || upper > sensorHeight / 2 + 1e-9,
  };
}

export function computeCameraModel({
  focalLength,
  sensorWidth,
  sensorHeight,
  objectDistance,
  objectHeight,
  cx,
  cy,
}: CameraParameters) {
  const hFov = fieldOfView(sensorWidth, focalLength, cx);
  const vFov = fieldOfView(sensorHeight, focalLength, cy);
  const imageHeight = (focalLength * objectHeight) / objectDistance;

  return {
    hFov,
    vFov,
    imageHeight,
    ...sensorCoverage(imageHeight, sensorHeight, cy),
    projectionPercentage: (imageHeight / sensorHeight) * 100,
    fx: focalLength * (REFERENCE_WIDTH / sensorWidth),
    fy: focalLength * (REFERENCE_HEIGHT / sensorHeight),
  };
}

export function horizontalFovRange(sensorWidth: number, cx = 0) {
  return {
    min: Number(fieldOfView(sensorWidth, FOCAL_MAX, cx).toFixed(1)),
    max: Number(fieldOfView(sensorWidth, FOCAL_MIN, cx).toFixed(1)),
  };
}

export function focalLengthFromHorizontalFov(sensorWidth: number, fov: number, cx = 0) {
  let low = FOCAL_MIN;
  let high = FOCAL_MAX;
  const target = Math.min(
    fieldOfView(sensorWidth, FOCAL_MIN, cx),
    Math.max(fieldOfView(sensorWidth, FOCAL_MAX, cx), fov),
  );

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (fieldOfView(sensorWidth, midpoint, cx) > target) low = midpoint;
    else high = midpoint;
  }

  return Number(((low + high) / 2).toFixed(1));
}

export function principalOffsetLimit(sensorSize: number) {
  // Round inward to the control's 0.1 mm step; nearest rounding can leave the sensor.
  return Math.floor(sensorSize * 5 + 1e-9) / 10;
}

export function clampPrincipalOffset(offset: number, sensorSize: number) {
  const limit = principalOffsetLimit(sensorSize);
  return Number(Math.min(limit, Math.max(-limit, offset)).toFixed(1));
}

export function computeSideDiagram({
  focalLength,
  sensorHeight,
  objectDistance,
  objectHeight,
  cy,
}: Pick<CameraParameters, "focalLength" | "sensorHeight" | "objectDistance" | "objectHeight" | "cy">) {
  const pinholeX = 365;
  const opticalAxisY = 176;
  const sceneScale = 0.115;
  const imagePlaneScale = 1.7;
  const displayedDepth = objectDistance * sceneScale;
  const sensorX = pinholeX + focalLength * imagePlaneScale;
  const objectX = pinholeX - displayedDepth;
  const objectHalf = objectHeight * sceneScale / 2;
  const sensorCenterY = opticalAxisY + cy * imagePlaneScale;
  const sensorHalf = sensorHeight * imagePlaneScale / 2;
  const sensorTop = sensorCenterY - sensorHalf;
  const sensorBottom = sensorCenterY + sensorHalf;
  const objectTop = opticalAxisY - objectHalf;
  const objectBottom = opticalAxisY + objectHalf;
  const imageHalf = (focalLength * objectHeight / objectDistance) * imagePlaneScale / 2;
  const imageTop = opticalAxisY - imageHalf;
  const imageBottom = opticalAxisY + imageHalf;
  const sceneBoundaryX = 5;
  const sceneContinuation = (pinholeX - sceneBoundaryX) / (sensorX - pinholeX);
  const fovSceneTop = opticalAxisY - (sensorBottom - opticalAxisY) * sceneContinuation;
  const fovSceneBottom = opticalAxisY + (opticalAxisY - sensorTop) * sceneContinuation;
  const upperFovHalfAngle = Math.atan((sensorBottom - opticalAxisY) / (sensorX - pinholeX));
  const lowerFovHalfAngle = Math.atan((opticalAxisY - sensorTop) / (sensorX - pinholeX));

  return {
    pinholeX,
    opticalAxisY,
    sensorX,
    objectX,
    objectTop,
    objectBottom,
    sensorCenterY,
    sensorHalf,
    sensorTop,
    sensorBottom,
    imageTop,
    imageBottom,
    sceneBoundaryX,
    fovSceneTop,
    fovSceneBottom,
    upperFovHalfAngle,
    lowerFovHalfAngle,
  };
}

export function computeSensorProjection({
  sensorWidth,
  sensorHeight,
  imageHeight,
  cx,
  cy,
}: Pick<CameraParameters, "sensorWidth" | "sensorHeight"> & { imageHeight: number; cx: number; cy: number }) {
  const pixelsPerMillimetre = 6;
  const w = sensorWidth * pixelsPerMillimetre;
  const h = sensorHeight * pixelsPerMillimetre;

  return {
    w,
    h,
    left: 197 - w / 2,
    top: 112 - h / 2,
    centerX: 197 + cx * pixelsPerMillimetre,
    centerY: 112 - cy * pixelsPerMillimetre,
    // Keep the physical scale exact. The SVG clips the image at the sensor edge.
    projectedH: imageHeight * pixelsPerMillimetre,
  };
}

export function intrinsicMatrix({
  fx,
  fy,
  sensorWidth,
  sensorHeight,
  cx,
  cy,
}: {
  fx: number;
  fy: number;
  sensorWidth: number;
  sensorHeight: number;
  cx: number;
  cy: number;
}) {
  // The virtual sensor is the whole physical sensor reflected through the pinhole.
  // Its metric principal offset is (-cx, -cy). Apply K to [X/Z, -Y/Z, 1].
  return [
    [fx, 0, REFERENCE_WIDTH / 2 - (cx / sensorWidth) * REFERENCE_WIDTH],
    [0, fy, REFERENCE_HEIGHT / 2 + (cy / sensorHeight) * REFERENCE_HEIGHT],
    [0, 0, 1],
  ] as const;
}
