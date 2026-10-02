'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Concept, ConceptGuide, Eq, TryIt } from '@/components/concept-guide';
import { DEPTH_RANGE, ERROR_RANGE, GRID_COLUMNS, GRID_ROWS, normalIntegrationSurface, type IntegrationMethod } from '@/lib/shading';

const methods: { id: IntegrationMethod; label: string }[] = [
  { id: 'least-squares', label: 'Least squares' },
  { id: 'xy', label: 'Path: x, then y' },
  { id: 'yx', label: 'Path: y, then x' },
];

// Rounded values keep server and browser renderings identical (no hydration mismatch).
const round1 = (value: number) => Math.round(value * 10) / 10;
const fmt3 = (value: number) => (Math.abs(value) < 5e-4 ? 0 : value).toFixed(3);

function colourClass(value: number, low: number, high: number, prefix: 'depth' | 'err') {
  const t = (value - low) / (high - low);
  return { className: `${prefix}-${Math.round(Math.min(1, Math.max(0, t)) * 10)}`, clipped: t < -1e-9 || t > 1 + 1e-9 };
}

function DepthMap({ values, label, range, diverging = false }: { values: number[]; label: string; range: [number, number]; diverging?: boolean }) {
  // Rows are drawn from the top (largest y) to the bottom (y = -1), so +y points up.
  const order = Array.from({ length: GRID_ROWS }, (_, k) => GRID_ROWS - 1 - k).flatMap((row) => Array.from({ length: GRID_COLUMNS }, (_, column) => row * GRID_COLUMNS + column));
  const classes = values.map((value) => colourClass(value, range[0], range[1], diverging ? 'err' : 'depth'));
  const clipped = classes.filter((entry) => entry.clipped).length;
  return <figure className="depth-map">
    <figcaption>{label}</figcaption>
    <div className="heatmap" style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS},1fr)` }}>
      {order.map((cell) => <i key={cell} className={classes[cell].className} title={fmt3(values[cell])} />)}
    </div>
    <div className={diverging ? 'colour-bar diverging' : 'colour-bar depth'} aria-hidden="true" />
    <div className="heat-legend"><small>{range[0].toFixed(1)}</small>{diverging ? <small>0</small> : null}<small>{range[1].toFixed(1)}</small></div>
    {clipped ? <p className="clip-note">{clipped} of {values.length} cells lie outside this colour range and are shown at its end.</p> : null}
  </figure>;
}

function NeedleMap({ cells }: { cells: ReturnType<typeof normalIntegrationSurface>['cells'] }) {
  const sx = (column: number) => 70 + column * 35;
  const sy = (row: number) => 292 - row * 24; // row 0 (y = -1) at the bottom
  const length = 30;
  return <svg className="normal-field" viewBox="0 0 640 336" aria-label="Needle map of the measured normal field">
    <defs><marker id="needleHead" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#2a94c2" /></marker><marker id="axisHead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#7f97ab" /></marker></defs>
    <rect x="52" y="14" width="562" height="296" rx="3" className="needle-plot" />
    {cells.map((cell, k) => ({ cell, k })).filter(({ k }) => Math.floor(k / GRID_COLUMNS) % 2 === 0 && (k % GRID_COLUMNS) % 2 === 0).map(({ cell, k }) => {
      const row = Math.floor(k / GRID_COLUMNS); const column = k % GRID_COLUMNS;
      const x = sx(column); const y = sy(row);
      const dx = round1(cell.nx * length); const dy = round1(-cell.ny * length);
      return <g key={k}><circle cx={x} cy={y} r="2" className="needle-base" />{Math.hypot(dx, dy) > 2.5 ? <line className="normal-arrow" x1={x} y1={y} x2={round1(x + dx)} y2={round1(y + dy)} markerEnd="url(#needleHead)" /> : null}</g>;
    })}
    <line x1="34" y1="322" x2="104" y2="322" stroke="#7f97ab" strokeWidth="1.5" markerEnd="url(#axisHead)" /><text x="110" y="326" className="svg-label">x</text>
    <line x1="34" y1="322" x2="34" y2="262" stroke="#7f97ab" strokeWidth="1.5" markerEnd="url(#axisHead)" /><text x="29" y="254" className="svg-label">y</text>
    <text x="616" y="330" textAnchor="end" className="svg-label">needle = (n₁, n₂); a dot means n points at the camera</text>
  </svg>;
}

export function NormalIntegrationLab() {
  const [amplitude, setAmplitude] = useState(1);
  const [inconsistency, setInconsistency] = useState(0);
  const [method, setMethod] = useState<IntegrationMethod>('least-squares');
  const surface = useMemo(() => normalIntegrationSurface(GRID_ROWS, GRID_COLUMNS, amplitude, inconsistency), [amplitude, inconsistency]);
  const reconstructed = surface.reconstructions[method];
  const error = reconstructed.map((value, cell) => value - surface.truth[cell]);
  const methodLabel = methods.find((entry) => entry.id === method)?.label ?? '';
  const integrable = surface.curlRms < 1e-6;

  return (
    <section className="lab-module" aria-labelledby="integration-title">
      <div className="module-heading">
        <div><p className="section-kicker">NORMAL INTEGRATION · WORKSHEET Q1 · SLIDES 9, 25-28</p><h2 id="integration-title">From normals back to depth</h2><p>A normal map gives the slope of the surface at every pixel, not its height. Integrate the slopes to recover depth, and see what happens when the slopes cannot come from any surface.</p></div>
        <div className="model-callout"><strong>Key condition</strong><span>A slope field comes from a surface only if pᵧ = qₓ. Otherwise the result depends on the integration path.</span></div>
      </div>
      <div className="lab-layout">
        <aside className="control-panel glass-panel">
          <div className="control-block"><div className="control-label"><span>Surface amplitude</span><output>{amplitude.toFixed(2)}</output></div><Slider aria-label="Surface amplitude" value={[amplitude]} min={.35} max={1.6} step={.05} onValueChange={(value) => setAmplitude(Array.isArray(value) ? value[0] : value)} /></div>
          <div className="control-block"><div className="control-label"><span>Non-integrable swirl ε</span><output>{inconsistency.toFixed(2)}</output></div><Slider aria-label="Non-integrable swirl added to the slopes" value={[inconsistency]} min={0} max={1} step={.05} onValueChange={(value) => setInconsistency(Array.isArray(value) ? value[0] : value)} /><small className="control-note">Adds ε·0.35·(y, −x) to the measured slopes. No surface has this slope field.</small></div>
          <fieldset className="segmented-choice"><legend>Integration method</legend>{methods.map((entry) => <button type="button" key={entry.id} className={method === entry.id ? 'active' : ''} aria-pressed={method === entry.id} onClick={() => setMethod(entry.id)}>{entry.label}</button>)}</fieldset>
          <div className={integrable ? 'classification' : 'classification warning'}><span>Integrability residual (RMS of pᵧ − qₓ)</span><strong>{surface.curlRms.toFixed(3)}</strong><small>{integrable ? 'pᵧ = qₓ: every path gives the same depth.' : 'pᵧ ≠ qₓ: no depth map has these slopes, so the paths disagree.'}</small></div>
        </aside>
        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span>MEASURED NORMALS · NEEDLE MAP (SLIDE 21)</span><span>N = (p, q, 1)ᵀ · p = −∂z/∂x</span></div>
          <NeedleMap cells={surface.cells} />
          <div className="depth-maps">
            <DepthMap values={surface.truth} label="True depth z" range={DEPTH_RANGE} />
            <DepthMap values={reconstructed} label={`Recovered depth · ${methodLabel}`} range={DEPTH_RANGE} />
            <DepthMap values={error} label="Error = recovered − true" range={[-ERROR_RANGE, ERROR_RANGE]} diverging />
          </div>
          <p className="map-note">Top of each map is y = +1, bottom is y = −1; x runs from −1 (left) to +1 (right). Dark means low z, light means high z (toward the camera). All three maps fix the unknown constant with z = 0 in the bottom-left cell.</p>
          <div className="metric-grid"><article><span>Path x,y vs path y,x (RMS)</span><strong>{surface.pathRms.toFixed(3)}</strong></article><article><span>Error of {methodLabel.toLowerCase()} (RMS)</span><strong>{surface.errorRms[method].toFixed(3)}</strong></article><article><span>Unknown constant</span><strong>z + C, fixed by z₀₀ = 0</strong></article></div>
        </div>
      </div>
      <div className="formula-strip"><div><span>Normal (slide 9)</span><strong>N = (p, q, 1)ᵀ, p = −∂z/∂x, q = −∂z/∂y</strong></div><div><span>Slopes from normals (slide 25)</span><strong>∇z = −(n₁/n₃, n₂/n₃)</strong></div><div><span>Least squares (slides 26-28)</span><strong>min over z: ‖Dₓz + p‖² + ‖Dᵧz + q‖²</strong></div></div>
      <ConceptGuide kicker="BACKGROUND · SLIDES 9, 21, 25-28" title="What you need for this lab" intro="Normal integration turns a normal map into a depth map. These are the ideas it uses, in the order of the lecture.">
        <Concept title="Orthogonal and unit vectors">
          <p>Two vectors are orthogonal (perpendicular) when their dot product is zero. Dividing a vector by its length gives a unit vector, of length 1. A surface normal is a vector orthogonal to the surface.</p>
          <Eq>aᵀb = a₁b₁ + a₂b₂ + a₃b₃ = 0 · n = N / ‖N‖</Eq>
        </Concept>
        <Concept title="Partial derivatives and the gradient">
          <p>∂z/∂x, written zₓ, is the slope of the surface when you move in x and keep y fixed; zᵧ is the slope in y. The gradient ∇z = (zₓ, zᵧ) points uphill. On a pixel grid, derivatives become finite differences.</p>
          <Eq>zₓ ≈ (z(i+1, j) − z(i, j)) / h</Eq>
        </Concept>
        <Concept title="The normal of a depth map" slides="slide 9">
          <p>One step in x moves along the surface by Pₓ = (1, 0, zₓ); one step in y by Pᵧ = (0, 1, zᵧ). Both lie in the tangent plane, so the normal is orthogonal to both. Orthogonality gives p + zₓ = 0 and q + zᵧ = 0.</p>
          <Eq>N = Pₓ × Pᵧ = (−zₓ, −zᵧ, 1)ᵀ = (p, q, 1)ᵀ</Eq>
          <p>Example: the plane z = 2x − y + 3 rises toward +x, so its normal (−2, 1, 1)ᵀ/√6 leans toward −x. This is why p and zₓ have opposite signs.</p>
        </Concept>
        <Concept title="From normals back to slopes" slides="slides 21, 25">
          <p>Divide the first two components by the third. This fails where n₃ → 0, where the surface is seen edge-on and cannot be written as z(x, y). The needle map draws (n₁, n₂), the part of each normal that lies in the image plane.</p>
          <Eq>∇z = −(n₁/n₃, n₂/n₃)</Eq>
        </Concept>
        <Concept title="Integrability">
          <p>For a smooth surface the mixed derivatives agree, zₓᵧ = zᵧₓ. With p = −zₓ and q = −zᵧ this becomes the condition below. It also means that walking around any closed loop on a surface brings you back to the same height. A field that breaks the condition is the slope field of no surface, so integrating along different paths gives different depths.</p>
          <Eq>pᵧ = qₓ · current residual RMS: {surface.curlRms.toFixed(3)}</Eq>
        </Concept>
        <Concept title="Least squares and the unknown constant" slides="slides 26-28">
          <p>Each pair of neighbouring pixels gives one slope equation, so there are about twice as many equations as unknown depths. Least squares finds the depth map whose differences best match all measured slopes. Adding the same constant to every depth changes no difference, so one value must be fixed; here z = 0 in the bottom-left cell.</p>
          <Eq>min over z: ‖Dₓz + p‖² + ‖Dᵧz + q‖²</Eq>
        </Concept>
        <TryIt>Set the swirl to 0: all three methods reproduce the true depth exactly. Raise it to 1: each path is now off by up to about 1.4, in opposite directions, while least squares stays within about 0.06 of the true depth. The swirl contains no slope of any surface, so least squares discards it. Change the amplitude: the needles and the depth colours scale together.</TryIt>
      </ConceptGuide>
    </section>
  );
}
