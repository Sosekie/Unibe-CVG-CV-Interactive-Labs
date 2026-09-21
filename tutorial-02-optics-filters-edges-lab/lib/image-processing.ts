export type NoiseKind = 'gaussian' | 'salt-pepper';
export type FilterKind = 'box' | 'gaussian' | 'median' | 'modified-median';

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function gaussianSample(random: () => number) {
  const u = Math.max(1e-9, random());
  const v = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function addNoise(
  source: Uint8ClampedArray,
  kind: NoiseKind,
  level: number,
  seed: number,
) {
  const result = new Uint8ClampedArray(source);
  const random = mulberry32(seed);
  for (let index = 0; index < result.length; index += 4) {
    const original = source[index];
    let value = original;
    if (kind === 'gaussian') {
      value = original + gaussianSample(random) * level;
    } else if (random() < level / 100) {
      value = random() < .5 ? 0 : 255;
    }
    const gray = clamp(value);
    result[index] = gray;
    result[index + 1] = gray;
    result[index + 2] = gray;
    result[index + 3] = 255;
  }
  return result;
}

function pixel(source: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const safeX = Math.max(0, Math.min(width - 1, x));
  const safeY = Math.max(0, Math.min(height - 1, y));
  return source[(safeY * width + safeX) * 4];
}

function gaussianWeight(offsetX: number, offsetY: number, sigma: number) {
  return Math.exp(-(offsetX * offsetX + offsetY * offsetY) / (2 * sigma * sigma));
}

export function filterPixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  kind: FilterKind,
  kernelSize: number,
) {
  const result = new Uint8ClampedArray(source.length);
  const radius = Math.floor(kernelSize / 2);
  const sigma = Math.max(.8, kernelSize / 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const values: number[] = [];
      let weighted = 0;
      let weightSum = 0;
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const value = pixel(source, width, height, x + offsetX, y + offsetY);
          values.push(value);
          const weight = kind === 'gaussian' ? gaussianWeight(offsetX, offsetY, sigma) : 1;
          weighted += value * weight;
          weightSum += weight;
        }
      }

      let output: number;
      if (kind === 'box' || kind === 'gaussian') {
        output = weighted / weightSum;
      } else {
        values.sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];
        if (kind === 'median') {
          output = median;
        } else {
          const lowerQuartile = values[Math.floor((values.length - 1) * .25)];
          const upperQuartile = values[Math.ceil((values.length - 1) * .75)];
          const center = pixel(source, width, height, x, y);
          output = center < lowerQuartile || center > upperQuartile ? median : center;
        }
      }
      const index = (y * width + x) * 4;
      const gray = clamp(output);
      result[index] = gray;
      result[index + 1] = gray;
      result[index + 2] = gray;
      result[index + 3] = 255;
    }
  }
  return result;
}

export function convolveRow(row: number[], kernel: number[]) {
  const radius = Math.floor(kernel.length / 2);
  return row.map((_, x) => kernel.reduce((sum, weight, index) => {
    const sourceX = x + radius - index;
    return sum + (row[sourceX] ?? 0) * weight;
  }, 0));
}
