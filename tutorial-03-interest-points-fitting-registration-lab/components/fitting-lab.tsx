'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ordinaryLeastSquares, prewittPlane, rotatePoints, totalLeastSquares, type Point2 } from '@/lib/fitting';
import { PrewittPlaneDiagram } from '@/components/prewitt-plane-diagram';

const tutorialPoints: Point2[] = [{ x: 0, y: -7 }, { x: 2, y: -1 }, { x: 4, y: 5 }];
// Deliberately spread measurements in both coordinates so the two objectives
// produce visibly different lines. The worksheet's exact points stay intact.
const measuredPoints: Point2[] = [
  { x: -4, y: -4 }, { x: -3, y: -2.5 }, { x: -2, y: -6 }, { x: -1, y: .5 },
  { x: 0, y: 2.5 }, { x: 1, y: -1 }, { x: 2, y: 2 }, { x: 4, y: 4.5 },
];
const measuredDirection = totalLeastSquares(measuredPoints).direction;
const measuredVerticalAngle = 90 - Math.atan2(measuredDirection.y, measuredDirection.x) * 180 / Math.PI;
const initialPatch = [2, 4, 6, 1, 3, 5, 0, 2, 4];
const verticalTutorialAngle = Math.atan(1 / 3) * 180 / Math.PI;
const chartScale = 20;

export function FittingLab() {
  const [dataset, setDataset] = useState<'tutorial' | 'measured'>('measured');
  const [method, setMethod] = useState<'ols' | 'tls'>('ols');
  const [rotation, setRotation] = useState(0);
  const [patch, setPatch] = useState(initialPatch);
  const points = useMemo(() => rotatePoints(dataset === 'tutorial' ? tutorialPoints : measuredPoints, rotation), [dataset, rotation]);
  const ols = useMemo(() => ordinaryLeastSquares(points), [points]);
  const tls = useMemo(() => totalLeastSquares(points), [points]);
  const plane = useMemo(() => prewittPlane(patch), [patch]);

  const mapX = (x: number) => 325 + x * chartScale;
  const mapY = (y: number) => 190 - y * chartScale;
  const olsDefined = Number.isFinite(ols.slope);
  const olsLine = olsDefined ? [{ x: -8, y: ols.slope * -8 + ols.intercept }, { x: 8, y: ols.slope * 8 + ols.intercept }] : null;
  const tlsLine = [{ x: tls.center.x - tls.direction.x * 20, y: tls.center.y - tls.direction.y * 20 }, { x: tls.center.x + tls.direction.x * 20, y: tls.center.y + tls.direction.y * 20 }];
  const directionDifference = Math.abs(Math.atan(ols.slope) - Math.atan2(tls.direction.y, tls.direction.x)) * 180 / Math.PI;
  const angleGap = olsDefined ? Math.min(directionDifference, 180 - directionDifference) : null;
  const linesCoincide = dataset === 'tutorial' && olsDefined;

  return (
    <section className="lab-module" aria-labelledby="fitting-title">
      <div className="module-heading">
        <div><p className="section-kicker">FITTING · QUESTIONS 1–4</p><h2 id="fitting-title">Line fitting laboratory</h2><p>Compare vertical least squares with total least squares. The worksheet points give an exact line; the measured set shows how the fits differ when both coordinates have noise.</p></div>
        <div className="model-callout"><strong>Invariant</strong><span>Total least squares is rotation-invariant; vertical least squares is not and becomes singular for a vertical line.</span></div>
      </div>
      <div className="lab-layout">
        <aside className="control-panel glass-panel">
          <fieldset className="segmented-choice"><legend>Dataset</legend><button type="button" className={dataset === 'tutorial' ? 'active' : ''} onClick={() => { setDataset('tutorial'); setRotation(0); }}>Worksheet (exact)</button><button type="button" className={dataset === 'measured' ? 'active' : ''} onClick={() => { setDataset('measured'); setRotation(0); }}>Measured (2D noise)</button></fieldset>
          <fieldset className="segmented-choice"><legend>Residual model</legend><button type="button" className={method === 'ols' ? 'active' : ''} onClick={() => setMethod('ols')}>Vertical LS</button><button type="button" className={method === 'tls' ? 'active' : ''} onClick={() => setMethod('tls')}>Total LS</button></fieldset>
          <div className="control-block"><div className="control-label"><span>Rotate data</span><output>{rotation.toFixed(2)}°</output></div><Slider aria-label="Rotate point set" value={[rotation]} min={0} max={90} step={0.1} onValueChange={(value) => setRotation(Array.isArray(value) ? value[0] : value)} /></div>
          <Button variant="outline" onClick={() => { setDataset('tutorial'); setRotation(0); }}>Tutorial numerical preset</Button>
          <Button variant="outline" onClick={() => { setDataset('tutorial'); setRotation(verticalTutorialAngle); }}>Rotate tutorial line vertical</Button>
          <Button variant="outline" onClick={() => { setDataset('measured'); setRotation(measuredVerticalAngle); }}>Show rotated contrast</Button>
          <div className="classification"><span className="fit-formula-label">{method === 'ols' ? 'y = mx + b' : 'ax + by = d'}</span><strong>{method === 'ols' ? Number.isFinite(ols.slope) ? 'm=' + ols.slope.toFixed(3) : 'vertical' : 'a=' + tls.a.toFixed(3)}</strong><small>{method === 'ols' ? Number.isFinite(ols.intercept) ? 'b = ' + ols.intercept.toFixed(3) + ' · SSE = ' + ols.error.toFixed(3) : 'normal equations are singular' : 'b = ' + tls.b.toFixed(3) + ' · d = ' + tls.d.toFixed(3) + ' · SSE⊥ = ' + tls.error.toFixed(3)}</small></div>
        </aside>
        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span>LINE FITS</span><span>{method === 'ols' ? olsDefined ? 'vertical residuals' : 'OLS undefined for vertical data' : 'orthogonal residuals'}</span></div>
          <div className="fit-legend"><span className="fit-legend-ols">Vertical LS{olsDefined ? '' : ' (undefined)'}</span><span className="fit-legend-tls">Total LS</span><span>{linesCoincide ? 'Both fits coincide for these exact points' : 'Solid: selected · dashed: comparison'}</span></div>
          <svg className="fitting-diagram" viewBox="0 0 650 390" aria-label="Point set with vertical least-squares and total least-squares lines">
            <defs><clipPath id="fitClip"><rect x="28" y="24" width="594" height="332" /></clipPath></defs>
            <g className="chart-grid">{Array.from({ length: 15 }, (_, index) => <line key={'v' + index} x1={mapX(-14 + index * 2)} x2={mapX(-14 + index * 2)} y1="24" y2="356" />)}{Array.from({ length: 9 }, (_, index) => <line key={'h' + index} x1="28" x2="622" y1={mapY(-8 + index * 2)} y2={mapY(-8 + index * 2)} />)}</g>
            <line className="chart-axis" x1="28" x2="622" y1={mapY(0)} y2={mapY(0)} /><line className="chart-axis" x1={mapX(0)} x2={mapX(0)} y1="24" y2="356" />
            <g clipPath="url(#fitClip)">
              {olsLine && (!linesCoincide || method === 'ols') ? <line className={`fit-line fit-line-ols${method === 'ols' ? '' : ' comparison'}`} x1={mapX(olsLine[0].x)} y1={mapY(olsLine[0].y)} x2={mapX(olsLine[1].x)} y2={mapY(olsLine[1].y)} /> : null}
              {(!linesCoincide || method === 'tls') ? <line className={`fit-line fit-line-tls${method === 'tls' ? '' : ' comparison'}`} x1={mapX(tlsLine[0].x)} y1={mapY(tlsLine[0].y)} x2={mapX(tlsLine[1].x)} y2={mapY(tlsLine[1].y)} /> : null}
              {points.map((point, index) => {
                const projection = method === 'ols'
                  ? { x: point.x, y: olsDefined ? ols.slope * point.x + ols.intercept : point.y }
                  : (() => { const residual = tls.a * point.x + tls.b * point.y - tls.d; return { x: point.x - residual * tls.a, y: point.y - residual * tls.b }; })();
                return <g key={index}><line className="residual-line" x1={mapX(point.x)} y1={mapY(point.y)} x2={mapX(projection.x)} y2={mapY(projection.y)} /><circle className="data-point" cx={mapX(point.x)} cy={mapY(point.y)} r="6" /></g>;
              })}
            </g>
            <text x="588" y={mapY(0) - 8} className="svg-label">x</text><text x={mapX(0) + 8} y="38" className="svg-label">y</text>
          </svg>
          <p className="fit-comparison-note">{dataset === 'tutorial' ? olsDefined ? 'The worksheet points lie exactly on one line, so both fits coincide. Rotate this set vertical to see where y = mx + b fails.' : 'The worksheet line is vertical. Total LS still represents it; vertical LS has no finite slope.' : `The fitted directions differ by ${angleGap?.toFixed(1)}°. Switch the residual model to compare vertical and perpendicular errors.`}</p>
          <div className="metric-grid fit-metrics"><article><span>OLS</span><strong>{Number.isFinite(ols.slope) ? 'm=' + ols.slope.toFixed(3) + ', b=' + ols.intercept.toFixed(3) : 'vertical / undefined'}</strong></article><article><span>TLS unit normal</span><strong>[{tls.a.toFixed(3)}, {tls.b.toFixed(3)}]ᵀ</strong></article><article><span>Centroid</span><strong>({tls.center.x.toFixed(2)}, {tls.center.y.toFixed(2)})</strong></article><article><span>Data rotation</span><strong>{rotation.toFixed(2)}°</strong></article></div>
        </div>
      </div>
      <details className="advanced-card">
        <summary>Prewitt as a least-squares plane <span>EDIT THE 3×3 PATCH</span></summary>
        <div className="prewitt-lab">
          <div className="patch-inputs">{patch.map((value, index) => <Input key={index} aria-label={'Patch value ' + (index + 1)} type="number" value={value} onChange={(event) => setPatch((current) => current.map((item, itemIndex) => itemIndex === index ? Number(event.target.value) || 0 : item))} />)}</div>
          <div className="prewitt-result"><span>Best plane z = ax + by + c</span><strong>a = {plane.a.toFixed(3)} · b = {plane.b.toFixed(3)} · c = {plane.c.toFixed(3)}</strong><p>a = (1/6)Σxz and b = (1/6)Σyz. These are the normalized Prewitt responses under the tutorial coordinate convention.</p></div>
          <PrewittPlaneDiagram a={plane.a} b={plane.b} c={plane.c} />
          <div className="prewitt-masks"><code>Mₓ = [-1 0 1; -1 0 1; -1 0 1]</code><code>Mᵧ = [1 1 1; 0 0 0; -1 -1 -1]</code></div>
        </div>
      </details>
    </section>
  );
}
