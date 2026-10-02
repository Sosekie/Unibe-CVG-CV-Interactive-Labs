import type { Vector3 } from '@/lib/photometric';

// Maths behind the interactive worked answers, kept apart so the tests can check
// that every figure reproduces the numbers of the solution sheet.

// Q2: the claimed slopes z_x = -p = -y and z_y = -q = -k x, integrated from (0, 0)
// to (a, b) along the two L-shaped paths. The first leg of each path adds nothing.
export function pathIntegrals(k: number, a: number, b: number) {
  const viaX = -k * a * b; // through (a, 0): then z_y = -k a along x = a
  const viaY = -a * b; // through (0, b): then z_x = -b along y = b
  return { viaX, viaY, gap: viaX - viaY, curl: 1 - k };
}

export function determinant3([a, b, c]: Vector3[]) {
  return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
}

// Q4: the worksheet lights s1 = (0, 0, 1), s2 = (1, 0, 1)/sqrt(2), s3 = (0, 1, 1)/sqrt(2)
// with L = 1, solved row by row.
export function solveWorksheetLights([i1, i2, i3]: readonly number[]) {
  const g: Vector3 = [Math.SQRT2 * i2 - i1, Math.SQRT2 * i3 - i1, i1];
  const albedo = Math.hypot(...g);
  const normal = albedo > 1e-9 ? g.map((value) => value / albedo) as Vector3 : null;
  return { g, albedo, normal };
}

// Q6: a point light at height h above the plane z = 0, at horizontal distance r
// from the point below it. With the 1/d^2 fall-off the brightness relative to the
// point below the light is (h/d)^3.
export function nearLightBrightness(height: number, r: number) {
  const distance = Math.hypot(r, height);
  const cosine = height / distance;
  return { distance, cosine, angle: Math.acos(cosine) * 180 / Math.PI, withFalloff: cosine / distance ** 2, relativeWithFalloff: cosine ** 3 };
}
