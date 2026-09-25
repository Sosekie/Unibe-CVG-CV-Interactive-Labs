'use client';

import { interestPointMetrics } from '@/lib/interest-points';

type Props = { contrast: number; k: number; row: number; column: number };

export function intensityColor(value: number) {
  const level = Math.round(249 - Math.min(1, value / 1.5) * 190);
  return `rgb(${level}, ${Math.min(255, level + 22)}, ${Math.min(255, level + 35)})`;
}

export function HarrisVisualization({ contrast, k, row, column }: Props) {
  const responses = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => interestPointMetrics(contrast, r, c, k).harris),
  );
  const selected = interestPointMetrics(contrast, row, column, k);
  const [lambda1, lambda2] = selected.eigenvalues;
  const det = selected.determinant;
  const penalty = k * selected.trace ** 2;
  const alphaFourth = contrast ** 4;
  const boundaryRatio = (1 - 2 * k - Math.sqrt(1 - 4 * k)) / (2 * k);
  const plotX = (value: number) => 36 + Math.min(value, 1.7) / 1.7 * 224;
  const plotY = (value: number) => 170 - Math.min(value, 1.7) / 1.7 * 142;

  return <div className="harris-visuals">
    <section className="harris-response-panel" aria-label="Harris response heatmap">
      <div className="harris-visual-heading"><strong>Harris R across the image</strong><span>fixed color scale · blue positive · amber negative</span></div>
      <div className="harris-response-grid" role="img" aria-label={`Six by six Harris response heatmap at intensity factor ${contrast.toFixed(2)} and k ${k.toFixed(3)}`}>
        {responses.flatMap((line, r) => line.map((value, c) => {
          // A fixed square-root color scale preserves the alpha-fourth-power
          // change while leaving weak responses visible.
          const strength = Math.min(1, Math.sqrt(Math.abs(value) / .7));
          const color = value >= 0 ? `rgba(42,148,194,${(.06 + .88 * strength).toFixed(3)})` : `rgba(213,138,63,${(.06 + .88 * strength).toFixed(3)})`;
          return <div key={`${r}-${c}`} className={r === row && c === column ? 'selected' : ''} style={{ backgroundColor: color }} title={`row ${r + 1}, column ${c + 1}: R = ${value.toFixed(5)}`}><span>{Math.abs(value) < .0005 ? '0' : value.toFixed(3)}</span></div>;
        }))}
      </div>
    </section>
    <section className="harris-eigen-panel" aria-label="Eigenvalue plane and Harris threshold">
      <div className="harris-visual-heading"><strong>λ₁–λ₂ plane</strong><span>R = 0 boundary moves with k</span></div>
      <svg viewBox="0 0 285 192" role="img" aria-label={`Eigenvalues ${lambda1.toFixed(3)}, ${lambda2.toFixed(3)} and Harris zero boundary for k ${k.toFixed(3)}`}>
        <line className="harris-axis" x1="36" y1="170" x2="269" y2="170" /><line className="harris-axis" x1="36" y1="170" x2="36" y2="18" />
        <path className="harris-boundary-zone" d={`M36 170 L260 ${plotY(((1 - .08 * 2 - Math.sqrt(1 - .08 * 4)) / (.08 * 2)) * 1.7)} L260 ${plotY(((1 - .04 * 2 - Math.sqrt(1 - .04 * 4)) / (.04 * 2)) * 1.7)} Z`} />
        <line className="harris-zero-line" x1="36" y1="170" x2="260" y2={plotY(boundaryRatio * 1.7)} />
        <circle className="harris-eigen-point" cx={plotX(lambda1)} cy={plotY(lambda2)} r="6" />
        <text x="248" y="187">λ₁</text><text x="11" y="25">λ₂</text><text x="143" y="159">R = 0</text>
      </svg>
      <div className="harris-score-balance"><span>det(A)</span><div><i style={{ width: `${Math.min(100, det / (.2 * alphaFourth) * 100)}%` }} /></div><b>{det.toFixed(4)}</b><span>k·tr(A)²</span><div><i className="penalty" style={{ width: `${Math.min(100, penalty / (.08 * alphaFourth) * 100)}%` }} /></div><b>{penalty.toFixed(4)}</b></div>
      <p>R = det(A) − k·tr(A)² = <strong>{selected.harris.toFixed(4)}</strong>. Bars divide out α⁴ to show k clearly; k need not change this point’s label.</p>
    </section>
  </div>;
}
