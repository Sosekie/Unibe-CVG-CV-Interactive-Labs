'use client';

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Slider } from '@/components/ui/slider';
import { estimateAffine, estimateHomography, quadrilateralIssue, reprojectionError, transformPoint, type Matrix3 } from '@/lib/registration';
import type { Point2 } from '@/lib/fitting';

const source: Point2[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
const initialTarget: Point2[] = [{ x: .10, y: .16 }, { x: .88, y: .08 }, { x: .78, y: .86 }, { x: .19, y: .94 }];

const clamp = (value: number) => Math.max(.02, Math.min(.98, value));
const sourceScreen = (point: Point2) => ({ x: 55 + point.x * 220, y: 55 + point.y * 230 });
const targetScreen = (point: Point2) => ({ x: 390 + point.x * 260, y: 55 + point.y * 230 });
const formatMatrix = (matrix: Matrix3) => matrix.map((row) => row.map((value) => value.toFixed(3)).join('  ')).join(' ; ');

export function RegistrationLab() {
  const [model, setModel] = useState<'affine' | 'homography'>('affine');
  const [count, setCount] = useState(3);
  const [target, setTarget] = useState(initialTarget);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const candidate = useMemo(() => model === 'affine' ? estimateAffine(source.slice(0, count), target.slice(0, count)) : count === 4 ? estimateHomography(source, target) : null, [count, model, target]);
  const targetIssue = model === 'homography' && count === 4 ? quadrilateralIssue(target) : null;
  const affineCollapsed = model === 'affine' && candidate && Math.abs(candidate[0][0] * candidate[1][1] - candidate[0][1] * candidate[1][0]) < 1e-5;
  const matrix = targetIssue || affineCollapsed ? null : candidate;
  const error = useMemo(() => reprojectionError(matrix, source.slice(0, count), target.slice(0, count)), [count, matrix, target]);
  const validMatrix = Number.isFinite(error) ? matrix : null;
  const required = model === 'affine' ? 3 : 4;
  const equations = count * 2;
  const degrees = model === 'affine' ? 6 : 8;

  const warpedLines = useMemo(() => {
    if (!validMatrix) return [];
    const lines: string[] = [];
    for (let grid = 0; grid <= 4; grid += 1) {
      const t = grid / 4;
      const horizontal: string[] = [];
      const vertical: string[] = [];
      for (let step = 0; step <= 20; step += 1) {
        const s = step / 20;
        const h = transformPoint(validMatrix, { x: s, y: t });
        const v = transformPoint(validMatrix, { x: t, y: s });
        if (h) { const screen = targetScreen(h); horizontal.push(screen.x.toFixed(1) + ',' + screen.y.toFixed(1)); }
        if (v) { const screen = targetScreen(v); vertical.push(screen.x.toFixed(1) + ',' + screen.y.toFixed(1)); }
      }
      lines.push(horizontal.join(' '), vertical.join(' '));
    }
    return lines;
  }, [validMatrix]);

  const moveHandle = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activeHandle === null) return;
    const transform = event.currentTarget.getScreenCTM();
    if (!transform) return;
    const pointer = event.currentTarget.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const location = pointer.matrixTransform(transform.inverse());
    setTarget((current) => current.map((point, index) => index === activeHandle ? { x: clamp((location.x - 390) / 260), y: clamp((location.y - 55) / 230) } : point));
  };

  const status = validMatrix ? 'solvable' : count < required ? 'underdetermined' : targetIssue === 'folded' ? 'invalid warp' : 'degenerate';
  const statusDetail = validMatrix ? 'RMS reprojection error = ' + error.toExponential(2)
    : count < required ? 'Need at least ' + required + ' point pairs'
      : targetIssue === 'collinear' ? 'Three target points are collinear or nearly so; move a corner away from the line.'
        : targetIssue === 'folded' ? 'The target quadrilateral folds or crosses infinity; move its corners apart.'
          : affineCollapsed ? 'The affine map collapses area; separate the target points.' : 'The point configuration cannot be solved.';

  return (
    <section className="lab-module" aria-labelledby="registration-title">
      <div className="module-heading">
        <div><p className="section-kicker">REGISTRATION · QUESTIONS 1–3</p><h2 id="registration-title">Affine &amp; homography lab</h2><p>Drag target correspondences and compare a six-parameter affine map with an eight-degree-of-freedom homography.</p></div>
        <div className="model-callout"><strong>Geometry note</strong><span>The fixed source square already satisfies affine non-collinearity. For a finite homography grid, keep the four target corners in general position and in a convex outline.</span></div>
      </div>
      <div className="lab-layout">
        <aside className="control-panel glass-panel">
          <fieldset className="segmented-choice"><legend>Transformation model</legend><button type="button" className={model === 'affine' ? 'active' : ''} onClick={() => { setModel('affine'); setCount((current) => Math.max(3, current)); }}>Affine</button><button type="button" className={model === 'homography' ? 'active' : ''} onClick={() => { setModel('homography'); setCount(4); }}>Homography</button></fieldset>
          <div className="control-block"><div className="control-label"><span>Correspondence pairs</span><output>{count}</output></div><Slider aria-label="Number of point correspondences" value={[count]} min={2} max={4} step={1} onValueChange={(value) => setCount(Array.isArray(value) ? value[0] : value)} /></div>
          <div className="equation-balance"><div><span>Unknowns</span><strong>{degrees}</strong></div><div><span>Available equations</span><strong>{equations}</strong></div></div>
          <div className={validMatrix ? 'classification' : 'classification warning'}><span>System status</span><strong>{status}</strong><small>{statusDetail}</small></div>
        </aside>
        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span>POINT CORRESPONDENCES</span><span>drag orange target handles</span></div>
          <svg className="registration-diagram" viewBox="0 0 700 340" aria-label="Source square and target correspondences" onPointerMove={moveHandle} onPointerUp={() => setActiveHandle(null)} onPointerCancel={() => setActiveHandle(null)} onLostPointerCapture={() => setActiveHandle(null)}>
            <rect x="55" y="55" width="220" height="230" className="source-plane" /><text x="55" y="38" className="svg-label">source plane</text><text x="390" y="38" className="svg-label">target plane</text>
            {Array.from({ length: 5 }, (_, index) => <g key={index}><line className="source-grid" x1={55 + index * 55} x2={55 + index * 55} y1="55" y2="285" /><line className="source-grid" x1="55" x2="275" y1={55 + index * 57.5} y2={55 + index * 57.5} /></g>)}
            {warpedLines.map((points, index) => <polyline key={index} className="warped-grid" points={points} />)}
            {source.map((point, index) => {
              const start = sourceScreen(point);
              const end = targetScreen(target[index]);
              const active = index < count;
              return <g key={index}><line className={active ? 'correspondence active' : 'correspondence'} x1={start.x} y1={start.y} x2={end.x} y2={end.y} /><circle className={active ? 'source-point active' : 'source-point'} cx={start.x} cy={start.y} r="7" /><text className="point-index" x={start.x - 3} y={start.y + 3}>{index + 1}</text><g className="target-drag-area" onPointerDown={(event) => { event.preventDefault(); setActiveHandle(index); event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }}><circle className="target-hit" cx={end.x} cy={end.y} r="50" /><circle className={`${active ? 'target-handle active' : 'target-handle'} desktop-handle`} cx={end.x} cy={end.y} r="9" /><circle className={`${active ? 'target-handle active' : 'target-handle'} mobile-handle`} cx={end.x} cy={end.y} r="17" /></g><text className="point-index target-index" x={end.x - 3} y={end.y + 3}>{index + 1}</text></g>;
            })}
          </svg>
          <div className="matrix-readout"><span>{model === 'affine' ? 'Affine matrix A' : 'Homography H (h₃₃ = 1 gauge)'}</span><code>{validMatrix ? formatMatrix(validMatrix) : targetIssue === 'folded' ? 'Grid hidden: target outline folds or crosses infinity.' : 'No nonsingular solution shown for this configuration.'}</code></div>
        </div>
      </div>
      <div className="formula-strip"><div><span>Affine</span><strong>2N equations · 6 unknowns · N ≥ 3</strong></div><div><span>This exact four-pair lab</span><strong>fix h₃₃ = 1 · solve 8 equations</strong></div><div><span>Lecture DLT for noisy pairs</span><strong>Ah = 0 · ‖h‖ = 1 · SVD</strong></div></div>
    </section>
  );
}
