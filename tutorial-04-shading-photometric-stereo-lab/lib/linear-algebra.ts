export function solveLinearSystem(matrix: number[][], values: number[]) {
  const n = values.length;
  if (matrix.length !== n || matrix.some((row) => row.length !== n)) return null;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const scale = augmented[column][column];
    for (let entry = column; entry <= n; entry += 1) augmented[column][entry] /= scale;
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let entry = column; entry <= n; entry += 1) augmented[row][entry] -= factor * augmented[column][entry];
    }
  }
  return augmented.map((row) => row[n]);
}

// Gauss-Jordan inverse with partial pivoting; null for a singular matrix.
export function invertMatrix(matrix: number[][]) {
  const n = matrix.length;
  if (matrix.some((row) => row.length !== n)) return null;
  const left = matrix.map((row) => [...row]);
  const right = Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, column) => (row === column ? 1 : 0)));
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(left[row][column]) > Math.abs(left[pivot][column])) pivot = row;
    if (Math.abs(left[pivot][column]) < 1e-12) return null;
    [left[column], left[pivot]] = [left[pivot], left[column]];
    [right[column], right[pivot]] = [right[pivot], right[column]];
    const scale = left[column][column];
    for (let entry = 0; entry < n; entry += 1) { left[column][entry] /= scale; right[column][entry] /= scale; }
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = left[row][column];
      if (factor === 0) continue;
      for (let entry = 0; entry < n; entry += 1) { left[row][entry] -= factor * left[column][entry]; right[row][entry] -= factor * right[column][entry]; }
    }
  }
  return right;
}

export function leastSquares(matrix: number[][], values: number[]) {
  if (!matrix.length || matrix.length !== values.length) return null;
  const columns = matrix[0].length;
  const ata = Array.from({ length: columns }, () => Array(columns).fill(0));
  const atb = Array(columns).fill(0);
  for (let row = 0; row < matrix.length; row += 1) for (let i = 0; i < columns; i += 1) {
    atb[i] += matrix[row][i] * values[row];
    for (let j = 0; j < columns; j += 1) ata[i][j] += matrix[row][i] * matrix[row][j];
  }
  return solveLinearSystem(ata, atb);
}
