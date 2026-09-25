export type Matrix2 = [[number, number], [number, number]];

export const tutorialPattern = (contrast: number) => Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 6 }, (_, column) => row >= 3 && column >= 3 ? contrast : 0),
);

function reflect(index: number, length: number) {
  if (index < 0) return -index;
  if (index >= length) return 2 * length - 2 - index;
  return index;
}

function sample(image: number[][], row: number, column: number) {
  return image[reflect(row, image.length)][reflect(column, image[0].length)];
}

export function gradients(image: number[][]) {
  return image.map((row, r) => row.map((_, c) => ({
    x: sample(image, r, c + 1) - sample(image, r, c - 1),
    y: sample(image, r - 1, c) - sample(image, r + 1, c),
  })));
}

export function interestPointMetrics(contrast: number, row: number, column: number, k: number) {
  const image = tutorialPattern(contrast);
  const first = gradients(image);
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const gradient = first[reflect(row + dr, 6)][reflect(column + dc, 6)];
      xx += gradient.x * gradient.x;
      xy += gradient.x * gradient.y;
      yy += gradient.y * gradient.y;
    }
  }
  const tensor: Matrix2 = [[xx / 9, xy / 9], [xy / 9, yy / 9]];
  const determinant = tensor[0][0] * tensor[1][1] - tensor[0][1] ** 2;
  const trace = tensor[0][0] + tensor[1][1];
  const discriminant = Math.sqrt(Math.max(0, trace ** 2 - 4 * determinant));
  const eigenvalues: [number, number] = [(trace + discriminant) / 2, (trace - discriminant) / 2];
  const harris = determinant - k * trace ** 2;

  const ixx = sample(image, row, column + 1) - 2 * sample(image, row, column) + sample(image, row, column - 1);
  const iyy = sample(image, row - 1, column) - 2 * sample(image, row, column) + sample(image, row + 1, column);
  const ixy = (
    sample(image, row - 1, column + 1) - sample(image, row - 1, column - 1)
    - sample(image, row + 1, column + 1) + sample(image, row + 1, column - 1)
  ) / 4;
  const hessian = ixx * iyy - ixy ** 2;
  const classification = trace < 1e-10 ? 'flat' : harris > 1e-12 ? 'corner' : harris < -1e-12 ? 'edge' : 'flat';

  return { image, tensor, determinant, trace, eigenvalues, harris, hessian, classification };
}
