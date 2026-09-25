export function solveLinearSystem(matrix: number[][], values: number[]) {
  const n = values.length;
  if (matrix.length !== n || matrix.some((row) => row.length !== n)) return null;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
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

export function leastSquares(matrix: number[][], values: number[]) {
  if (!matrix.length || matrix.length !== values.length) return null;
  const columns = matrix[0].length;
  const ata = Array.from({ length: columns }, () => Array(columns).fill(0));
  const atb = Array(columns).fill(0);
  for (let row = 0; row < matrix.length; row += 1) {
    for (let i = 0; i < columns; i += 1) {
      atb[i] += matrix[row][i] * values[row];
      for (let j = 0; j < columns; j += 1) ata[i][j] += matrix[row][i] * matrix[row][j];
    }
  }
  return solveLinearSystem(ata, atb);
}
