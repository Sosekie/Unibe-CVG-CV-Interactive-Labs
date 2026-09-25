'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { interestPointMetrics } from '@/lib/interest-points';
import { HarrisVisualization, intensityColor } from '@/components/harris-visualization';

const points = {
  star: { row: 3, column: 3, label: '(*) corner candidate' },
  double: { row: 5, column: 3, label: '(**) edge candidate' },
} as const;

export function InterestPointsLab() {
  const [contrast, setContrast] = useState(1);
  const [k, setK] = useState(.05);
  const [point, setPoint] = useState<keyof typeof points>('star');
  const selected = points[point];
  const metrics = useMemo(() => interestPointMetrics(contrast, selected.row, selected.column, k), [contrast, k, selected.column, selected.row]);
  const format = (value: number) => Math.abs(value) < 1e-8 ? '0' : value.toFixed(4);

  return (
    <section className="lab-module" aria-labelledby="interest-title">
      <div className="module-heading">
        <div><p className="section-kicker">INTEREST POINTS · QUESTIONS 1–3</p><h2 id="interest-title">Harris &amp; Hessian playground</h2><p>Use the exact 6×6 Tutorial 03 pattern. Image y points upward: Iᵧ(r,c) = I(r−1,c) − I(r+1,c). Reflection padding is used at image boundaries. The Hessian uses direct second differences, as on the sheet.</p></div>
        <div className="model-callout"><strong>Observe</strong><span>Scaling image intensity by α scales the Harris response by α⁴.</span></div>
      </div>
      <div className="lab-layout">
        <aside className="control-panel glass-panel">
          <div className="control-block"><div className="control-label"><span>Intensity / contrast</span><output>{contrast.toFixed(2)}</output></div><Slider aria-label="Image intensity" value={[contrast]} min={.25} max={1.5} step={.05} onValueChange={(value) => setContrast(Array.isArray(value) ? value[0] : value)} /></div>
          <div className="control-block"><div className="control-label"><span>Harris constant k</span><output>{k.toFixed(3)}</output></div><Slider aria-label="Harris constant k" value={[k]} min={.04} max={.08} step={.005} onValueChange={(value) => setK(Array.isArray(value) ? value[0] : value)} /></div>
          <fieldset className="point-choice"><legend>Evaluate tutorial point</legend>{Object.entries(points).map(([id, item]) => <button type="button" key={id} className={point === id ? 'active' : ''} onClick={() => setPoint(id as keyof typeof points)}><b>{id === 'star' ? '(*)' : '(**)'}</b><span>{item.label.replace(/^\(\*+\) /, '')}</span></button>)}</fieldset>
          <div className="classification"><span>Harris classification</span><strong>{metrics.classification}</strong><small>λ₁ = {format(metrics.eigenvalues[0])} · λ₂ = {format(metrics.eigenvalues[1])}</small></div>
        </aside>
        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span>TUTORIAL IMAGE I</span><span>selected {point === 'star' ? '(*)' : '(**)'}</span></div>
          <div className="matrix-grid" aria-label="Tutorial 6 by 6 intensity image">
            {metrics.image.flatMap((row, r) => row.map((value, c) => {
              const isSelected = r === selected.row && c === selected.column;
              return <div key={`${r}-${c}`} className={`${isSelected ? 'selected ' : ''}${Math.abs(r - selected.row) <= 1 && Math.abs(c - selected.column) <= 1 ? 'window' : ''}`} style={{ backgroundColor: intensityColor(value), color: value > .85 ? '#fff' : '#344b65' }}><span>{value.toFixed(contrast % 1 ? 2 : 0)}</span>{isSelected ? <b>{point === 'star' ? '*' : '**'}</b> : null}</div>;
            }))}
          </div>
          <HarrisVisualization contrast={contrast} k={k} row={selected.row} column={selected.column} />
          <div className="metric-grid">
            <article><span>Second moment A</span><strong>[{format(metrics.tensor[0][0])} {format(metrics.tensor[0][1])}; {format(metrics.tensor[1][0])} {format(metrics.tensor[1][1])}]</strong></article>
            <article><span>det(A) / tr(A)</span><strong>{format(metrics.determinant)} / {format(metrics.trace)}</strong></article>
            <article><span>Harris R</span><strong className={metrics.harris > 0 ? 'positive' : 'negative'}>{format(metrics.harris)}</strong></article>
            <article><span>det(Hessian)</span><strong>{format(metrics.hessian)}</strong></article>
          </div>
        </div>
      </div>
      <div className="formula-strip"><div><span>Structure tensor</span><strong>A = avg([Iₓ², IₓIᵧ; IₓIᵧ, Iᵧ²])</strong></div><div><span>Harris score</span><strong>R = det(A) − k·tr(A)²</strong></div><div><span>Interpretation</span><strong>two large λ → corner · one → edge</strong></div></div>
    </section>
  );
}
