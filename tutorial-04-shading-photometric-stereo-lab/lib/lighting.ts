// Lambertian plane z = 0 lit by a nearby point light (worksheet Q7, slides 7-8 and 12).
// The plane is 0 <= x, y <= 10, sampled every 0.5, so a light moved in steps
// of 0.5 always has its foot point on a sample.
export const PLANE_SIZE = 10;
export const PLANE_SAMPLES = 21;

export function planeIllumination(lightX: number, lightY: number, height: number, inverseSquare: boolean) {
  const brightness = (x: number, y: number) => {
    const distanceSquared = (lightX - x) ** 2 + (lightY - y) ** 2 + height ** 2;
    const cosine = height / Math.sqrt(distanceSquared); // <n, s> with n = (0, 0, 1)
    return inverseSquare ? cosine / distanceSquared : cosine;
  };
  const step = PLANE_SIZE / (PLANE_SAMPLES - 1);
  const maximum = brightness(lightX, lightY); // directly below the light
  const cells = Array.from({ length: PLANE_SAMPLES * PLANE_SAMPLES }, (_, cell) => {
    const row = Math.floor(cell / PLANE_SAMPLES); // row 0 is y = 0 (bottom)
    const column = cell % PLANE_SAMPLES;
    const x = column * step; const y = row * step;
    const value = brightness(x, y);
    return { x, y, brightness: value, relative: value / maximum };
  });
  const minimum = Math.min(...cells.map((cell) => cell.brightness));
  return { cells, maximum, minimum, brightest: { x: lightX, y: lightY }, cornerRatio: brightness(0, 0) / maximum };
}
