export type Point2 = { x: number; y: number };

export function rotatePoints(points: Point2[], degrees: number) {
  const center = centroid(points);
  const angle = degrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return points.map((point) => {
    const x = point.x - center.x;
    const y = point.y - center.y;
    return { x: center.x + cosine * x - sine * y, y: center.y + sine * x + cosine * y };
  });
}

export function centroid(points: Point2[]) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

export function ordinaryLeastSquares(points: Point2[]) {
  const center = centroid(points);
  const xx = points.reduce((sum, point) => sum + (point.x - center.x) ** 2, 0);
  const xy = points.reduce((sum, point) => sum + (point.x - center.x) * (point.y - center.y), 0);
  if (xx < 1e-9) return { slope: Number.POSITIVE_INFINITY, intercept: Number.NaN, error: Number.POSITIVE_INFINITY, center };
  const slope = xy / xx;
  const intercept = center.y - slope * center.x;
  const error = points.reduce((sum, point) => sum + (point.y - slope * point.x - intercept) ** 2, 0);
  return { slope, intercept, error, center };
}

export function totalLeastSquares(points: Point2[]) {
  const center = centroid(points);
  const xx = points.reduce((sum, point) => sum + (point.x - center.x) ** 2, 0);
  const xy = points.reduce((sum, point) => sum + (point.x - center.x) * (point.y - center.y), 0);
  const yy = points.reduce((sum, point) => sum + (point.y - center.y) ** 2, 0);
  const directionAngle = .5 * Math.atan2(2 * xy, xx - yy);
  const direction = { x: Math.cos(directionAngle), y: Math.sin(directionAngle) };
  let normal = { a: -direction.y, b: direction.x };
  if (normal.b < 0) normal = { a: -normal.a, b: -normal.b };
  const d = normal.a * center.x + normal.b * center.y;
  const error = points.reduce((sum, point) => sum + (normal.a * point.x + normal.b * point.y - d) ** 2, 0);
  return { ...normal, d, direction, center, error, scatter: [[xx, xy], [xy, yy]] as [[number, number], [number, number]] };
}

export function prewittPlane(values: number[]) {
  if (values.length !== 9) throw new Error('A 3×3 neighborhood needs nine values.');
  const xs = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
  const ys = [1, 1, 1, 0, 0, 0, -1, -1, -1];
  return {
    a: values.reduce((sum, value, index) => sum + xs[index] * value, 0) / 6,
    b: values.reduce((sum, value, index) => sum + ys[index] * value, 0) / 6,
    c: values.reduce((sum, value) => sum + value, 0) / 9,
  };
}
