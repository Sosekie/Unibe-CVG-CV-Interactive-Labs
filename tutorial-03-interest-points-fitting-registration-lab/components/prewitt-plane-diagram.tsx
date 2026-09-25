'use client';

import { useId } from 'react';

export function PrewittPlaneDiagram({ a, b, c }: { a: number; b: number; c: number }) {
  const arrowId = `prewitt-arrow-${useId().replace(/:/g, '')}`;
  const vector = Math.hypot(a, b);
  const length = Math.min(62, vector * 26);
  const endX = vector ? 145 + a / vector * length : 145;
  const endY = vector ? 87 - b / vector * length : 87;

  return <div className="prewitt-visual" aria-label={`Fitted plane z equals ${a.toFixed(2)} u plus ${b.toFixed(2)} v plus ${c.toFixed(2)}`}>
    <div className="harris-visual-heading"><strong>Fitted plane at the nine locations</strong><span>u → right · v ↑ up</span></div>
    <div className="prewitt-plane-grid" role="img" aria-label="Fixed-scale colors show the plane value at each patch position">
      {Array.from({ length: 9 }, (_, index) => {
        const u = index % 3 - 1;
        const v = 1 - Math.floor(index / 3);
        const height = a * u + b * v + c;
        const intensity = Math.min(1, Math.abs(height) / 9);
        const color = height >= 0 ? `rgba(213,138,63,${(.08 + .8 * intensity).toFixed(3)})` : `rgba(42,148,194,${(.08 + .8 * intensity).toFixed(3)})`;
        return <div key={index} style={{ backgroundColor: color }} title={`u=${u}, v=${v}: fitted z=${height.toFixed(3)}`}>{height.toFixed(2)}</div>;
      })}
    </div>
    <svg className="prewitt-gradient-figure" viewBox="0 0 290 164" role="img" aria-label={`Plane slope vector rightward ${a.toFixed(2)}, upward ${b.toFixed(2)}`}>
      <defs><marker id={arrowId} markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0 L9 4 L0 8 Z" fill="#d58a3f" /></marker></defs>
      <line className="prewitt-axis" x1="36" y1="87" x2="254" y2="87" /><line className="prewitt-axis" x1="145" y1="146" x2="145" y2="20" />
      <circle cx="145" cy="87" r="3" fill="#344b65" />
      {vector > 1e-8 ? <line className="prewitt-gradient" x1="145" y1="87" x2={endX} y2={endY} markerEnd={`url(#${arrowId})`} /> : null}
      <text x="247" y="103">u</text><text x="153" y="25">v</text><text x="155" y="146">∇z = ({a.toFixed(2)}, {b.toFixed(2)})</text>
    </svg>
    <p>Center height c = <strong>{c.toFixed(2)}</strong>; the arrow shows the uphill direction of the fitted plane.</p>
  </div>;
}
