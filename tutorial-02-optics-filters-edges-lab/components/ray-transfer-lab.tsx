'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RangeControl } from '@/components/range-control';
import { fitDiagramScale } from '@/lib/diagram-geometry';
import { propagateRay, rayThroughLens, type RayState } from '@/lib/optics';

type Stage = { label: string; matrix: string; state: RayState };
const displayY = (height: number, scale: number) => 180 - height * scale;

export function RayTransferLab() {
  const [theta, setTheta] = useState(8);
  const [height, setHeight] = useState(12);
  const [focalLength, setFocalLength] = useState(55);
  const [open, setOpen] = useState(false);
  const [f1, setF1] = useState(45);
  const [f2, setF2] = useState(35);
  const [delta1, setDelta1] = useState(70);
  const [delta2, setDelta2] = useState(45);
  const [offset, setOffset] = useState(8);
  const [stageIndex, setStageIndex] = useState(0);

  const incomingSlope = Math.tan(theta * Math.PI / 180);
  const outgoing = rayThroughLens({ slope: incomingSlope, height }, focalLength);
  const phi = Math.atan(outgoing.slope) * 180 / Math.PI;

  const start: RayState = { slope: incomingSlope, height };
  const afterL1 = rayThroughLens(start, f1);
  const beforeL2 = propagateRay(afterL1, delta1);
  const afterL2 = rayThroughLens(beforeL2, f2, offset);
  const sensor = propagateRay(afterL2, delta2);
  const stages: Stage[] = [
    { label: 'At lens 1', matrix: 'r₀ (defined at L₁)', state: start },
    { label: 'After lens 1', matrix: 'L(f₁) r₀', state: afterL1 },
    { label: 'At lens 2', matrix: 'S(Δ₁) L(f₁) r₀', state: beforeL2 },
    { label: 'After lens 2', matrix: 'L(f₂,b) S(Δ₁) L(f₁) r₀', state: afterL2 },
    { label: 'At sensor', matrix: 'S(Δ₂) L(f₂,b) S(Δ₁) L(f₁) r₀', state: sensor },
  ];

  const nextStage = () => setStageIndex((stageIndex + 1) % stages.length);
  const xLens = 380;
  const beforeX = 65;
  const afterX = 760;
  const incomingHeight = height - incomingSlope * 70;
  const outgoingHeight = height + outgoing.slope * 85;
  const singleScale = fitDiagramScale(3.2, 132, [incomingHeight, height, outgoingHeight]);
  const incomingY = displayY(incomingHeight, singleScale);
  const outgoingY = displayY(outgoingHeight, singleScale);

  const firstLensX = 300;
  const spaceScale = Math.min(3.2, 470 / (delta1 + delta2));
  const secondLensX = firstLensX + delta1 * spaceScale;
  const sensorPlaneX = secondLensX + delta2 * spaceScale;
  const incomingStartX = 75;
  const incomingStartDistance = (firstLensX - incomingStartX) / spaceScale;
  const incomingStartHeight = height - incomingSlope * incomingStartDistance;
  const afterL1Preview = propagateRay(afterL1, delta1 * .28);
  const afterL2Preview = propagateRay(afterL2, delta2 * .28);
  const afterL1PreviewX = firstLensX + (secondLensX - firstLensX) * .28;
  const afterL2PreviewX = secondLensX + (sensorPlaneX - secondLensX) * .28;
  const dualScale = fitDiagramScale(3.2, 128, [
    incomingStartHeight,
    start.height,
    afterL1Preview.height,
    beforeL2.height,
    afterL2Preview.height,
    sensor.height,
    offset,
  ]);
  const incomingStartY = displayY(incomingStartHeight, dualScale);
  const secondLensCenterY = displayY(offset, dualScale);

  return (
    <section className="lab-module" aria-labelledby="ray-title">
      <div className="module-heading">
        <div><p className="section-kicker">CAMERA 4–5</p><h2 id="ray-title">Ray transfer</h2><p>Follow direction and height as separate state variables. A lens changes slope; empty space changes height.</p></div>
        <div className="model-callout"><span><strong>Paraxial approximation</strong> · angles are represented by their tangent.</span></div>
      </div>

      <div className="lab-layout ray-layout">
        <aside className="control-panel glass-panel">
          <RangeControl label="incident angle" symbol="θ" value={theta} min={-18} max={18} step={0.5} unit="°" onChange={setTheta} />
          <RangeControl label="signed ray height" symbol="d" value={height} min={-25} max={25} step={1} unit="mm" onChange={setHeight} />
          <RangeControl label="focal length" symbol="f" value={focalLength} min={25} max={100} step={1} unit="mm" onChange={setFocalLength} />
          <div className="state-card">
            <span>Augmented ray state</span>
            <strong>r = [ tan θ, d, 1 ]ᵀ</strong>
            <code>[ {incomingSlope.toFixed(3)}, {height.toFixed(1)}, 1 ]ᵀ</code>
            <small>This vector represents a ray state, not a 3D point.</small>
          </div>
        </aside>
        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span>single thin lens · vertical scale auto-fits</span><span>φ = {phi.toFixed(2)}°</span></div>
          <svg className="ray-diagram" viewBox="0 0 820 340" aria-label="Incident and exiting ray through a thin lens">
            <line x1="35" y1="180" x2="790" y2="180" className="optical-axis" />
            <path d={`M ${xLens} 44 Q ${xLens - 28} 180 ${xLens} 316 Q ${xLens + 28} 180 ${xLens} 44`} className="lens-shape" />
            <line x1={beforeX} y1={incomingY} x2={xLens} y2={displayY(height, singleScale)} className="ray ray-a" />
            <line x1={xLens} y1={displayY(height, singleScale)} x2={afterX} y2={outgoingY} className="ray ray-b" />
            <circle cx={xLens} cy={displayY(height, singleScale)} r="6" className="ray-hit" />
            <text x="62" y="55" className="svg-label">incident θ</text>
            <text x="675" y="55" className="svg-label">exiting φ</text>
            <line x1={xLens - 16} y1={displayY(height, singleScale)} x2={xLens + 16} y2={displayY(height, singleScale)} className="height-mark" />
            <text x={xLens + 18} y={displayY(height, singleScale) - 8} className="svg-label">d</text>
          </svg>
          <div className="equation-focus"><span>Direction update</span><strong>tan φ = tan θ − d / f = {outgoing.slope.toFixed(3)}</strong></div>
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen} className="advanced-card">
        <CollapsibleTrigger className="advanced-trigger">
          <span><small>CHALLENGING</small><strong>Trace a displaced two-lens system</strong></span>
          {open ? <ChevronUp /> : <ChevronDown />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="dual-lens-grid">
            <div className="dual-controls">
              <RangeControl label="lens 1 focal length" symbol="f₁" value={f1} min={20} max={90} step={1} unit="mm" onChange={(v) => { setF1(v); setStageIndex(0); }} />
              <RangeControl label="lens 2 focal length" symbol="f₂" value={f2} min={20} max={90} step={1} unit="mm" onChange={(v) => { setF2(v); setStageIndex(0); }} />
              <RangeControl label="lens separation" symbol="Δ₁" value={delta1} min={25} max={120} step={1} unit="mm" onChange={(v) => { setDelta1(v); setStageIndex(0); }} />
              <RangeControl label="sensor separation" symbol="Δ₂" value={delta2} min={20} max={100} step={1} unit="mm" onChange={(v) => { setDelta2(v); setStageIndex(0); }} />
              <RangeControl label="lens 2 offset" symbol="b" value={offset} min={-15} max={15} step={1} unit="mm" onChange={(v) => { setOffset(v); setStageIndex(0); }} />
              <div className="dual-initial-state"><span>Initial state at lens 1</span><code>r₀ = [{incomingSlope.toFixed(3)}, {height.toFixed(1)}, 1]ᵀ</code></div>
            </div>
            <div className="dual-visual">
              <svg className="dual-diagram" viewBox="0 0 820 330" aria-label="Staged ray trace through two lenses and free space">
                <line x1="30" y1="180" x2="790" y2="180" className="optical-axis" />
                <path d={`M ${firstLensX} 65 Q ${firstLensX - 28} 180 ${firstLensX} 295 Q ${firstLensX + 28} 180 ${firstLensX} 65`} className="lens-shape" />
                <path d={`M ${secondLensX} ${secondLensCenterY - 115} Q ${secondLensX - 28} ${secondLensCenterY} ${secondLensX} ${secondLensCenterY + 115} Q ${secondLensX + 28} ${secondLensCenterY} ${secondLensX} ${secondLensCenterY - 115}`} className="lens-shape second-lens" />
                <line x1={sensorPlaneX} y1="60" x2={sensorPlaneX} y2="300" className="sensor-line" />
                <line x1={incomingStartX} y1={incomingStartY} x2={firstLensX} y2={displayY(start.height, dualScale)} className="ray ray-a" />
                {stageIndex === 1 ? <line x1={firstLensX} y1={displayY(afterL1.height, dualScale)} x2={afterL1PreviewX} y2={displayY(afterL1Preview.height, dualScale)} className="ray ray-b" /> : null}
                {stageIndex >= 2 ? <line x1={firstLensX} y1={displayY(afterL1.height, dualScale)} x2={secondLensX} y2={displayY(beforeL2.height, dualScale)} className="ray ray-b" /> : null}
                {stageIndex === 3 ? <line x1={secondLensX} y1={displayY(afterL2.height, dualScale)} x2={afterL2PreviewX} y2={displayY(afterL2Preview.height, dualScale)} className="ray ray-a" /> : null}
                {stageIndex >= 4 ? <line x1={secondLensX} y1={displayY(afterL2.height, dualScale)} x2={sensorPlaneX} y2={displayY(sensor.height, dualScale)} className="ray ray-a" /> : null}
                <circle cx={secondLensX} cy={secondLensCenterY} r="4" className="focus-dot" />
                <text x={firstLensX - 30} y="318" className="svg-label">L₁</text><text x={secondLensX - 27} y="318" className="svg-label">L₂ + b</text><text x={sensorPlaneX - 28} y="318" className="svg-label">sensor</text>
              </svg>
              <div className="stage-controls">
                <Button onClick={nextStage}><Play size={15} /> Next optical element</Button>
                <Button variant="outline" size="icon" aria-label="Reset trace" onClick={() => setStageIndex(0)}><RotateCcw size={15} /></Button>
                <span><strong>{stages[stageIndex].label}</strong><code>{stages[stageIndex].matrix}</code><code>r = [{stages[stageIndex].state.slope.toFixed(3)}, {stages[stageIndex].state.height.toFixed(2)}, 1]ᵀ</code></span>
              </div>
              <div className="matrix-sequence" aria-label="Matrix multiplication order">
                {['S(Δ₂)', 'L(f₂,b)', 'S(Δ₁)', 'L(f₁)'].map((matrix, index) => <span key={matrix} className={stageIndex > 0 && index === 4 - stageIndex ? 'active' : ''}>{matrix}</span>)}
              </div>
              <p className="micro-note correction-note"><strong>State convention:</strong> this animation defines r₀ at lens 1, so the displayed product begins with L(f₁). If a ray is instead initialized at object point P, first apply S(−Pz) to obtain this r₀. Δ₁ and Δ₂ remain the physical separations shown in the question.</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
