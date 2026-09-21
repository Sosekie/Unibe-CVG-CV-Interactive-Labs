'use client';

import { useMemo, useRef, useState } from 'react';
import { Activity, Move, Orbit, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RangeControl } from '@/components/range-control';
import { motionVectorLength } from '@/lib/diagram-geometry';
import { angularSelfSimilarity, eventCrossings, eventLogChange } from '@/lib/optics';
import { clientPointToSvg } from '@/lib/svg-coordinates';

type Mode = 'events' | 'self-similarity';

const similarityCenter = { x: 380, y: 240 };
const similarityRadius = 205;
const similarityWedges = Array.from({ length: 72 }, (_, index) => {
  const startAngle = -Math.PI + index * 2 * Math.PI / 72;
  const endAngle = -Math.PI + (index + 1) * 2 * Math.PI / 72;
  const middleAngle = (startAngle + endAngle) / 2;
  const intensity = angularSelfSimilarity(middleAngle, similarityRadius).intensity;
  const start = {
    x: similarityCenter.x + Math.cos(startAngle) * similarityRadius,
    y: similarityCenter.y + Math.sin(startAngle) * similarityRadius,
  };
  const end = {
    x: similarityCenter.x + Math.cos(endAngle) * similarityRadius,
    y: similarityCenter.y + Math.sin(endAngle) * similarityRadius,
  };
  return {
    path: `M ${similarityCenter.x} ${similarityCenter.y} L ${start.x} ${start.y} A ${similarityRadius} ${similarityRadius} 0 0 1 ${end.x} ${end.y} Z`,
    fill: `hsl(205 42% ${26 + intensity * 67}%)`,
  };
});

export function GradientsEventsLab() {
  const [mode, setMode] = useState<Mode>('events');
  const [edgePosition, setEdgePosition] = useState(390);
  const [gradientAngle, setGradientAngle] = useState(0);
  const [velocityAngle, setVelocityAngle] = useState(18);
  const [speed, setSpeed] = useState(64);
  const [gradientMagnitude, setGradientMagnitude] = useState(.08);
  const [timeInterval, setTimeInterval] = useState(.06);
  const [threshold, setThreshold] = useState(.2);
  const [dragging, setDragging] = useState(false);
  const [qAngle, setQAngle] = useState(35);
  const [qRadius, setQRadius] = useState(120);
  const eventSvg = useRef<SVGSVGElement>(null);

  const angleDifference = (velocityAngle - gradientAngle) * Math.PI / 180;
  const dotProduct = gradientMagnitude * speed * Math.cos(angleDifference);
  const deltaLogIntensity = eventLogChange(gradientMagnitude, gradientAngle, speed, velocityAngle, timeInterval);
  const crossingData = eventCrossings(-dotProduct, threshold, timeInterval);
  const crossingCount = crossingData.total;
  const polarity = crossingCount === 0 ? 'none' : deltaLogIntensity > 0 ? 'positive' : 'negative';

  const velocityOrigin = { x: edgePosition, y: 180 };
  const velocityLength = motionVectorLength(speed);
  const velocityEnd = {
    x: velocityOrigin.x + Math.cos(velocityAngle * Math.PI / 180) * velocityLength,
    y: velocityOrigin.y + Math.sin(velocityAngle * Math.PI / 180) * velocityLength,
  };
  const eventGradientEnd = {
    x: velocityOrigin.x + Math.cos(gradientAngle * Math.PI / 180) * 100,
    y: velocityOrigin.y + Math.sin(gradientAngle * Math.PI / 180) * 100,
  };

  const updateVelocityFromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !eventSvg.current) return;
    const point = clientPointToSvg(eventSvg.current, event.clientX, event.clientY);
    if (!point) return;
    const dx = point.x - velocityOrigin.x;
    const dy = point.y - velocityOrigin.y;
    if (Math.hypot(dx, dy) > 1) setVelocityAngle(Math.atan2(dy, dx) * 180 / Math.PI);
    setSpeed(Math.max(0, Math.min(120, Math.hypot(dx, dy) / .8)));
  };

  const timeline = useMemo(() => {
    const items: Array<{ t: number; polarity: 'positive' | 'negative' }> = [];
    for (const crossingTime of crossingData.times) {
      items.push({ t: crossingTime / timeInterval, polarity: deltaLogIntensity > 0 ? 'positive' : 'negative' });
    }
    return items;
  }, [crossingData.times, deltaLogIntensity, timeInterval]);

  const p = similarityCenter;
  const angleRadians = qAngle * Math.PI / 180;
  const q = {
    x: p.x + Math.cos(angleRadians) * qRadius,
    y: p.y + Math.sin(angleRadians) * qRadius,
  };
  const similarity = angularSelfSimilarity(angleRadians, qRadius);
  const gradientMagnitudeAtQ = Math.hypot(similarity.gradient.x, similarity.gradient.y);
  const gradientDisplayScale = gradientMagnitudeAtQ > 1e-9 ? 72 / gradientMagnitudeAtQ : 0;
  const similarityGradientEnd = {
    x: q.x + similarity.gradient.x * gradientDisplayScale,
    y: q.y + similarity.gradient.y * gradientDisplayScale,
  };
  const radial = { x: q.x - p.x, y: q.y - p.y };
  const orthogonality = similarity.gradient.x * radial.x + similarity.gradient.y * radial.y;

  return (
    <section className="lab-module" aria-labelledby="events-title">
      <div className="module-heading">
        <div><p className="section-kicker">CAMERA 6 · EDGES 1–2</p><h2 id="events-title">Gradients &amp; events</h2><p>Move a brightness edge, compare motion with its gradient, and watch level-crossing events appear in log intensity.</p></div>
        <div className="mode-buttons" role="tablist" aria-label="Gradient lab mode">
          <Button variant={mode === 'events' ? 'default' : 'outline'} onClick={() => setMode('events')}><Zap size={15} /> Moving edge</Button>
          <Button variant={mode === 'self-similarity' ? 'default' : 'outline'} onClick={() => setMode('self-similarity')}><Orbit size={15} /> Self-similarity</Button>
        </div>
      </div>

      {mode === 'events' ? (
        <>
          <div className="lab-layout event-layout">
            <aside className="control-panel glass-panel">
              <RangeControl label="edge position" symbol="xₑ" value={edgePosition} min={210} max={610} step={1} unit="px" onChange={setEdgePosition} />
              <RangeControl label="gradient direction" symbol="∠∇L" value={gradientAngle} min={-90} max={90} step={1} unit="°" onChange={setGradientAngle} />
              <RangeControl label="motion speed" symbol="|v|" value={speed} min={0} max={120} step={1} unit="px/s" onChange={setSpeed} />
              <RangeControl label="log-gradient magnitude" symbol="|∇L|" value={gradientMagnitude} min={.01} max={.15} step={.01} unit="/px" onChange={setGradientMagnitude} />
              <RangeControl label="time interval" symbol="Δt" value={timeInterval} min={.01} max={.12} step={.01} unit="s" onChange={setTimeInterval} />
              <RangeControl label="contrast threshold" symbol="C" value={threshold} min={.05} max={.5} step={.05} unit="log" onChange={setThreshold} />
            </aside>
            <div className="visual-panel glass-panel event-visual">
              <div className="diagram-toolbar"><span><Move size={15} /> drag the blue velocity handle</span><span>fixed-pixel log-intensity model</span></div>
              <svg
                ref={eventSvg}
                className="event-diagram"
                viewBox="0 0 820 360"
                aria-label="Movable brightness edge with gradient and velocity vectors"
                onPointerMove={updateVelocityFromPointer}
                onPointerUp={() => setDragging(false)}
                onPointerLeave={() => setDragging(false)}
              >
                <defs>
                  <linearGradient id="edge-ramp"><stop offset="0" stopColor="#16241f" /><stop offset=".47" stopColor="#263933" /><stop offset=".53" stopColor="#f1f5ec" /><stop offset="1" stopColor="#fff" /></linearGradient>
                  <marker id="green-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="#25a579" /></marker>
                  <marker id="blue-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="#4e8ff1" /></marker>
                </defs>
                <rect x="0" y="0" width="820" height="360" fill="#e9eee9" />
                <g transform={`translate(${edgePosition} 180) rotate(${gradientAngle})`}><rect x="-900" y="-900" width="1800" height="1800" fill="url(#edge-ramp)" /></g>
                <circle cx={velocityOrigin.x} cy={velocityOrigin.y} r="6" fill="#fff" stroke="#193d32" strokeWidth="2" />
                <line x1={velocityOrigin.x} y1={velocityOrigin.y} x2={eventGradientEnd.x} y2={eventGradientEnd.y} className="gradient-vector" markerEnd="url(#green-arrow)" />
                <text x={eventGradientEnd.x + 8} y={eventGradientEnd.y - 7} className="vector-label gradient-label">∇L</text>
                {speed > 0 ? <line x1={velocityOrigin.x} y1={velocityOrigin.y} x2={velocityEnd.x} y2={velocityEnd.y} className="velocity-vector" markerEnd="url(#blue-arrow)" /> : null}
                <circle cx={velocityEnd.x} cy={velocityEnd.y} r="12" className="velocity-handle" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }} />
                <text x={velocityEnd.x + 10} y={velocityEnd.y + 22} className="vector-label velocity-label">{speed > 0 ? 'v' : 'v = 0'}</text>
              </svg>
              <div className="event-metrics">
                <article><span>Directional derivative</span><strong>∇Lᵀv = {dotProduct.toFixed(3)} s⁻¹</strong></article>
                <article><span>Predicted change</span><strong>ΔL ≈ {deltaLogIntensity.toFixed(3)}</strong></article>
                <article className={`event-status ${polarity}`}><span>Event output</span><strong>{crossingCount ? `${crossingCount} ${polarity}` : 'no event'}</strong></article>
              </div>
            </div>
          </div>

          <div className="event-timeline glass-panel">
            <div><span>LOG INTENSITY AT ONE PIXEL</span><strong>L(t + Δt) − L(t) ≈ −∇Lᵀv Δt</strong></div>
            <svg viewBox="0 0 900 150" aria-label="Timeline of positive or negative level-crossing events">
              <line x1="54" y1="78" x2="852" y2="78" className="timeline-axis" />
              <line x1="75" y1={Math.max(18, Math.min(138, 78 + deltaLogIntensity * 80))} x2="825" y2="78" className="log-line" />
              {timeline.map((item, index) => {
                const x = 75 + item.t * 750;
                return <g key={index}><line x1={x} y1="78" x2={x} y2={item.polarity === 'positive' ? 35 : 121} className={`event-stem ${item.polarity}`} /><circle cx={x} cy={item.polarity === 'positive' ? 35 : 121} r="5" className={`event-dot ${item.polarity}`} /></g>;
              })}
              <text x="54" y="138" className="svg-label">t</text><text x="828" y="138" className="svg-label">t + Δt</text>
            </svg>
            <p>{crossingCount > crossingData.times.length ? `Only the first ${crossingData.times.length} of ${crossingCount} event markers are drawn. ` : ''}Starting with zero residual contrast at t, crossing k occurs at tₖ − t = kC/|Lₜ|. The sign of ΔL sets ON/OFF polarity; small Δt is assumed.</p>
          </div>
        </>
      ) : (
        <div className="self-similarity-layout">
          <aside className="control-panel glass-panel">
            <RangeControl label="direction of q − p" symbol="α" value={qAngle} min={-170} max={170} step={1} unit="°" onChange={setQAngle} />
            <RangeControl label="distance from p" symbol="‖q−p‖" value={qRadius} min={50} max={185} step={1} unit="px" onChange={setQRadius} />
            <div className="state-card"><span>Same angular image model</span><strong>I(r,θ) = 0.5 + 0.4 cos(2θ)</strong><code>I(q) = {similarity.intensity.toFixed(3)} · |∇I(q)| = {gradientMagnitudeAtQ.toFixed(4)}</code><small>∇I(q)ᵀ(q − p) = {orthogonality.toFixed(6)}. Changing radius leaves intensity unchanged while gradient magnitude scales as 1/r. The green arrow is normalized to show direction; use the numeric readout for magnitude.</small></div>
          </aside>
          <div className="visual-panel glass-panel self-visual">
            <svg viewBox="0 0 760 480" aria-label="Angular self-similar image with p, q, radial displacement and its computed image gradient">
              <defs><marker id="radial-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="#e57f5c" /></marker><marker id="tangent-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="#289c78" /></marker></defs>
              {similarityWedges.map((wedge, index) => <path key={index} d={wedge.path} fill={wedge.fill} />)}
              <circle cx={p.x} cy={p.y} r="9" fill="#f4f7f9" opacity=".92" />
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="radial-vector" markerEnd="url(#radial-arrow)" />
              <line x1={q.x} y1={q.y} x2={similarityGradientEnd.x} y2={similarityGradientEnd.y} className="tangent-vector" markerEnd="url(#tangent-arrow)" />
              <circle cx={p.x} cy={p.y} r="7" className="p-point" /><circle cx={q.x} cy={q.y} r="7" className="q-point" />
              <text x={p.x + 12} y={p.y - 10} className="vector-label">p</text><text x={q.x + 12} y={q.y - 10} className="vector-label">q</text>
              <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 10} className="vector-label radial-label">q − p</text>
              <text x={similarityGradientEnd.x + 8} y={similarityGradientEnd.y - 8} className="vector-label gradient-label">∇I(q)</text>
            </svg>
            <div className="self-equations"><article><span>Self-similarity</span><strong>I(p + r u) = g(u)</strong></article><article><span>Gradient of the displayed field</span><strong>∇I = g′(θ)e<sub>θ</sub> / r</strong></article></div>
          </div>
          <div className="correction-card"><Activity size={18} /><p><strong>Course-note correction for Gradients 2:</strong> for v = q − p ≠ 0, the normalized-vector Jacobian is J(v) = (‖v‖²I − vvᵀ) / ‖v‖³. The printed ‖v‖<sup>3/2</sup> denominator is a typo; the orthogonality conclusion remains valid.</p></div>
        </div>
      )}
    </section>
  );
}
