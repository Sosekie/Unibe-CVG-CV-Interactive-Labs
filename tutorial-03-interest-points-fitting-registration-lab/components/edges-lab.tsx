'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { edgeDetectionInterval, gaussianStepProfile } from '@/lib/edges';

const xScale = (x: number) => 46 + x * 7.08;
const intensityY = (value: number) => 165 - value * 105;
// One linear scale covers every allowed contrast and sigma, so peak heights
// remain directly comparable without clipping or automatic rescaling.
const gradientAxisMax = .9 / Math.sqrt(2 * Math.PI);
const gradientY = (value: number) => 466 - value / gradientAxisMax * 245;

function pathFor(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

export function EdgesLab() {
  const [edgePosition, setEdgePosition] = useState(50);
  const [contrast, setContrast] = useState(.8);
  const [sigma, setSigma] = useState(5);
  const [threshold, setThreshold] = useState(.03);
  const samples = useMemo(() => gaussianStepProfile(edgePosition, contrast, sigma), [contrast, edgePosition, sigma]);
  const detection = edgeDetectionInterval(edgePosition, contrast, sigma, threshold);
  const intensityPath = pathFor(samples.map((sample) => ({ x: xScale(sample.x), y: intensityY(sample.intensity) })));
  const gradientPath = pathFor(samples.map((sample) => ({ x: xScale(sample.x), y: gradientY(sample.gradient) })));
  const thresholdY = gradientY(threshold);
  const halfWidth = sigma * Math.sqrt(2 * Math.log(2));
  const halfPeakY = gradientY(detection.peak / 2);
  const fwhm = 2 * halfWidth;

  return (
    <section className="lab-module" aria-labelledby="edges-title">
      <div className="module-heading">
        <div><p className="section-kicker">EDGES · GRADIENTS &amp; THRESHOLDING</p><h2 id="edges-title">From an intensity step to an edge response</h2><p>Blur a one-dimensional step, inspect its derivative, and see how the detection threshold changes the width of the reported edge region.</p></div>
        <div className="model-callout"><strong>Key idea</strong><span>Smoothing reduces noise, but it also lowers and widens the gradient peak.</span></div>
      </div>
      <div className="lab-layout">
        <aside className="control-panel glass-panel">
          <Control label="Edge position" value={edgePosition} min={25} max={75} step={1} display={`${edgePosition} px`} onChange={setEdgePosition} />
          <Control label="Step contrast" value={contrast} min={.2} max={.9} step={.05} display={contrast.toFixed(2)} onChange={setContrast} />
          <Control label="Gaussian scale σ" value={sigma} min={1} max={12} step={.5} display={`${sigma.toFixed(1)} px`} onChange={setSigma} />
          <Control label="Gradient threshold" value={threshold} min={.005} max={.12} step={.005} display={threshold.toFixed(3)} onChange={setThreshold} />
          <div className={detection.interval ? 'classification' : 'classification warning'}><span>Detection</span><strong>{detection.interval ? 'edge found' : 'no edge'}</strong><small>peak |Iₓ| = {detection.peak.toFixed(4)}</small></div>
        </aside>
        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span>SMOOTHED STEP AND DERIVATIVE</span><span>fixed linear |Iₓ| scale 0–{gradientAxisMax.toFixed(2)}</span></div>
          <svg className="edge-diagram" viewBox="0 0 800 500" role="img" aria-label={`Smoothed intensity step, gradient, threshold, and full width at half maximum ${fwhm.toFixed(1)} pixels, on a fixed linear gradient scale`}>
            <defs><clipPath id="edgeGradientClip"><rect x="46" y="218" width="708" height="252" /></clipPath></defs>
            <line className="edge-axis" x1="46" y1="170" x2="754" y2="170" />
            <line className="edge-axis" x1="46" y1="470" x2="754" y2="470" />
            <line className="edge-position" x1={xScale(edgePosition)} y1="42" x2={xScale(edgePosition)} y2="470" />
            <path className="intensity-profile" d={intensityPath} />
            <path className="gradient-profile" d={gradientPath} clipPath="url(#edgeGradientClip)" />
            <line className="threshold-line" x1="46" y1={thresholdY} x2="754" y2={thresholdY} />
            {detection.interval ? <rect className="detected-region" x={xScale(detection.interval[0])} y="218" width={xScale(detection.interval[1]) - xScale(detection.interval[0])} height="252" /> : null}
            <line className="edge-fwhm" x1={xScale(edgePosition - halfWidth)} x2={xScale(edgePosition + halfWidth)} y1={halfPeakY} y2={halfPeakY} />
            <line className="edge-fwhm-cap" x1={xScale(edgePosition - halfWidth)} x2={xScale(edgePosition - halfWidth)} y1={halfPeakY - 5} y2={halfPeakY + 5} />
            <line className="edge-fwhm-cap" x1={xScale(edgePosition + halfWidth)} x2={xScale(edgePosition + halfWidth)} y1={halfPeakY - 5} y2={halfPeakY + 5} />
            <text className="edge-label" x="58" y="55">smoothed intensity Iσ</text>
            <text className="edge-label" x="58" y="229">gradient magnitude |Iₓ|</text>
            <text className="edge-label warm" x="648" y={thresholdY - 7}>threshold</text>
            <text className="edge-label" x={Math.min(700, xScale(edgePosition) + 8)} y="190">true edge</text>
          </svg>
          <p className="edge-width-note">Half-peak width: <strong>{fwhm.toFixed(1)} px = 2√(2 ln 2)σ</strong>. This width grows with σ; the interval above a fixed threshold can change differently because the peak also falls.</p>
          <div className="metric-grid">
            <article><span>True position</span><strong>{edgePosition.toFixed(1)} px</strong></article>
            <article><span>Gradient peak</span><strong>{detection.peak.toFixed(4)}</strong></article>
            <article><span>Detected interval</span><strong>{detection.interval ? `${detection.interval[0].toFixed(1)}–${detection.interval[1].toFixed(1)} px` : 'none'}</strong></article>
            <article><span>Localization</span><strong>{detection.interval ? 'centered on the step' : 'gradient below threshold'}</strong></article>
          </div>
        </div>
      </div>
      <div className="formula-strip"><div><span>Smoothed step</span><strong>Iσ = I ∗ Gσ</strong></div><div><span>Edge response</span><strong>∂(I ∗ Gσ)/∂x = I ∗ ∂Gσ/∂x</strong></div><div><span>Scale trade-off</span><strong>larger σ → lower, wider peak</strong></div></div>
    </section>
  );
}

function Control({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return <div className="control-block"><div className="control-label"><span>{label}</span><output>{display}</output></div><Slider aria-label={label} value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)} /></div>;
}
