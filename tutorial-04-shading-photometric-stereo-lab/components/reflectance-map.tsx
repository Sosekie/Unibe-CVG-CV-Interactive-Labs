'use client';

import { useMemo, useRef, type PointerEvent } from 'react';
import { contourSegments, reflectance } from '@/lib/reflectance';

// Lambertian reflectance map in gradient space (slides 10-12), shared by
// lab 03 and the worked answer to question 5.
export const EXTENT = 3;
const LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
// Rounded screen coordinates keep server and browser renderings identical.
const toX = (p: number) => Math.round((30 + (p + EXTENT) * 50) * 10) / 10;
const toY = (q: number) => Math.round((330 - (q + EXTENT) * 50) * 10) / 10;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// The line p*ps + q*qs + 1 = 0 (R = 0) clipped to the plotted square.
function shadowLine(ps: number, qs: number) {
  const norm2 = ps * ps + qs * qs;
  if (norm2 < 1e-9) return null;
  const p0 = [-ps / norm2, -qs / norm2];
  const d = [-qs, ps];
  let low = -Infinity; let high = Infinity;
  for (let axis = 0; axis < 2; axis += 1) {
    if (Math.abs(d[axis]) < 1e-12) { if (Math.abs(p0[axis]) > EXTENT) return null; continue; }
    const t1 = (-EXTENT - p0[axis]) / d[axis]; const t2 = (EXTENT - p0[axis]) / d[axis];
    low = Math.max(low, Math.min(t1, t2)); high = Math.min(high, Math.max(t1, t2));
  }
  if (low >= high) return null;
  return [p0[0] + low * d[0], p0[1] + low * d[1], p0[0] + high * d[0], p0[1] + high * d[1]];
}

// The square clipped to the shadow half-plane p*ps + q*qs + 1 < 0.
function shadowPolygon(ps: number, qs: number) {
  const f = (point: number[]) => point[0] * ps + point[1] * qs + 1;
  const square = [[-EXTENT, -EXTENT], [EXTENT, -EXTENT], [EXTENT, EXTENT], [-EXTENT, EXTENT]];
  const output: number[][] = [];
  square.forEach((current, index) => {
    const next = square[(index + 1) % square.length];
    const a = f(current); const b = f(next);
    if (a < 0) output.push(current);
    if ((a < 0) !== (b < 0)) { const t = a / (a - b); output.push([current[0] + t * (next[0] - current[0]), current[1] + t * (next[1] - current[1])]); }
  });
  return output.length >= 3 ? output : null;
}

const segmentPath = (segments: [number, number, number, number][]) => segments.map(([a, b, c, d]) => `M${toX(a).toFixed(1)} ${toY(b).toFixed(1)}L${toX(c).toFixed(1)} ${toY(d).toFixed(1)}`).join('');

type Props = {
  ps: number;
  qs: number;
  p: number;
  q: number;
  // Which point a click or drag moves: the surface orientation or the light.
  drag?: 'orientation' | 'light';
  showOrientation?: boolean;
  onPick: (x: number, y: number) => void;
};

export function ReflectanceMap({ ps, qs, p, q, drag = 'orientation', showOrientation = true, onPick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const contours = useMemo(() => LEVELS.map((level) => ({ level, path: segmentPath(contourSegments(ps, qs, level, EXTENT)) })), [ps, qs]);
  const value = reflectance(p, q, ps, qs);
  const highlight = useMemo(() => (showOrientation && value > 0.001 && value < 0.999 ? segmentPath(contourSegments(ps, qs, value, EXTENT)) : ''), [ps, qs, value, showOrientation]);
  const line = shadowLine(ps, qs);
  const shadow = shadowPolygon(ps, qs);
  const lightVisible = Math.abs(ps) <= EXTENT && Math.abs(qs) <= EXTENT;
  const limit = drag === 'light' ? 2.5 : EXTENT;
  const pickFromEvent = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    onPick(Math.round(clamp((point.x - 30) / 50 - EXTENT, -limit, limit) * 10) / 10, Math.round(clamp((330 - point.y) / 50 - EXTENT, -limit, limit) * 10) / 10);
  };
  const label = drag === 'light'
    ? `Reflectance map. Drag to move the light to (${ps.toFixed(1)}, ${qs.toFixed(1)}).`
    : `Reflectance map for light (${ps.toFixed(1)}, ${qs.toFixed(1)}); selected orientation (${p.toFixed(1)}, ${q.toFixed(1)}) has brightness ${value.toFixed(3)}`;
  return <svg ref={svgRef} className="gradient-plot" viewBox="0 0 360 372" aria-label={label}
    onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); pickFromEvent(event); }}
    onPointerMove={(event) => { if (dragging.current) pickFromEvent(event); }}
    onPointerUp={(event) => { dragging.current = false; event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { dragging.current = false; }}>
    <rect x="30" y="30" width="300" height="300" className="gp-frame" />
    {shadow ? <polygon className="gp-shadow" points={shadow.map(([a, b]) => `${toX(a)},${toY(b)}`).join(' ')} /> : null}
    {[-2, -1, 1, 2].map((tick) => <g key={tick}><line x1={toX(tick)} y1="30" x2={toX(tick)} y2="330" className="gp-grid" /><line x1="30" y1={toY(tick)} x2="330" y2={toY(tick)} className="gp-grid" /><text x={toX(tick)} y="346" textAnchor="middle" className="svg-label">{tick}</text><text x="22" y={toY(tick) + 3} textAnchor="end" className="svg-label">{tick}</text></g>)}
    <line x1="30" y1={toY(0)} x2="330" y2={toY(0)} className="gp-axis" /><line x1={toX(0)} y1="30" x2={toX(0)} y2="330" className="gp-axis" />
    <text x="338" y={toY(0) + 4} className="svg-label strong">p</text><text x={toX(0) + 5} y="24" className="svg-label strong">q</text>
    {contours.map((entry) => <path key={entry.level} d={entry.path} className="gp-contour" />)}
    {line ? <line x1={toX(line[0])} y1={toY(line[1])} x2={toX(line[2])} y2={toY(line[3])} className="gp-zero" /> : null}
    {highlight ? <path d={highlight} className="gp-highlight" /> : null}
    {lightVisible ? <circle cx={toX(ps)} cy={toY(qs)} r={drag === 'light' ? 10 : 7} className={drag === 'light' ? 'gp-light drag' : 'gp-light'} /> : null}
    {showOrientation ? <circle cx={toX(p)} cy={toY(q)} r="8" className="gp-selected" /> : null}
    {lightVisible ? <text x={toX(ps) + 12} y={toY(qs) - 12} className="svg-label strong gp-label">n = s · R = 1</text> : null}
    <text x="30" y="364" className="svg-label">thin lines: R = 0.1, 0.2, …, 0.9 · dashed: R = 0 · shaded: attached shadow</text>
  </svg>;
}
