'use client';

import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { fovArcEndpoint } from '@/lib/diagram-geometry';
import { clientPointToSvg } from '@/lib/svg-coordinates';

type InteractiveAnswerProps = {
  questionId: string;
  fallback: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function fixed(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function AnswerFrame({ title, takeaway, children }: { title: string; takeaway: ReactNode; children: ReactNode }) {
  return (
    <div className="worked-answer">
      <div className="answer-title-row"><span>WORKED ANSWER</span><strong>{title}</strong></div>
      {children}
      <div className="answer-takeaway"><span>TAKEAWAY</span><p>{takeaway}</p></div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <div className="answer-step"><span>{number}</span><div><strong>{title}</strong>{children}</div></div>;
}

function RangeControl({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void }) {
  return <label className="answer-range"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><output>{fixed(value, step < 1 ? 2 : 0)}{unit}</output></label>;
}

function ThinLensAnswer() {
  const [distanceM, setDistanceM] = useState(5);
  const [focalMm, setFocalMm] = useState(50);
  const imageMm = focalMm * distanceM * 1000 / (distanceM * 1000 - focalMm);
  const lensX = 360;
  const lensY = 130;
  const objectX = 250 - (distanceM - 1) * 19;
  const objectY = 72;
  const sensorX = lensX + imageMm * 3;
  const imageY = lensY + (lensY - objectY) * (sensorX - lensX) / (lensX - objectX);

  const updateObject = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = clientPointToSvg(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;
    setDistanceM(fixed(clamp((250 - point.x) / 19 + 1, 1, 10), 1));
  };

  return <AnswerFrame title="Thin-lens distance and camera thickness" takeaway={<>For the tutorial values, <b>D′ = 50.51 mm ≈ 5.05 cm</b>. This is the minimum lens-to-sensor spacing. The aperture controls light and defocus blur, but it does not enter this in-focus distance calculation.</>}>
    <div className="answer-layout">
      <div className="interactive-figure">
        <div className="figure-heading"><span>DRAG THE OBJECT</span><b>Object distance changes the required sensor position</b></div>
        <svg viewBox="0 0 720 260" aria-label="Interactive thin lens diagram. Drag the object horizontally to change object distance." onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateObject(event); }} onPointerMove={updateObject} onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}>
          <line className="diagram-axis" x1="35" y1="130" x2="685" y2="130" />
          <line className="diagram-lens" x1={lensX} y1="35" x2={lensX} y2="225" />
          <path className="diagram-lens-fill" d="M360 35 Q330 130 360 225 Q390 130 360 35Z" />
          <line className="diagram-sensor" x1={sensorX} y1="57" x2={sensorX} y2="203" />
          <line className="diagram-ray primary" x1={objectX} y1={objectY} x2={lensX} y2={lensY} />
          <line className="diagram-ray primary" x1={lensX} y1={lensY} x2={sensorX} y2={imageY} />
          <line className="diagram-ray secondary" x1={objectX} y1={objectY} x2={lensX} y2={objectY} />
          <line className="diagram-ray secondary" x1={lensX} y1={objectY} x2={sensorX} y2={imageY} />
          <line className="diagram-object" x1={objectX} y1={lensY} x2={objectX} y2={objectY} />
          <path className="diagram-object" d={`M${objectX - 8} ${objectY + 10} L${objectX} ${objectY - 2} L${objectX + 8} ${objectY + 10}`} />
          <circle className="drag-handle" cx={objectX} cy={objectY} r="11" />
          <circle className="diagram-focus" cx={sensorX} cy={imageY} r="4" />
          <text x="345" y="244">lens</text><text x={sensorX + 10} y="221">sensor</text><text x="45" y="118">D = {distanceM.toFixed(1)} m</text>
        </svg>
        <RangeControl label="Focal length f" value={focalMm} min={25} max={80} step={1} unit=" mm" onChange={setFocalMm} />
      </div>
      <div className="answer-steps">
        <Step number={1} title="Put all distances in one unit"><p>D = {distanceM.toFixed(1)} m = {(distanceM * 1000).toFixed(0)} mm, while f = {focalMm} mm.</p></Step>
        <Step number={2} title="Rearrange the thin-lens equation"><div className="answer-equation">1/D + 1/D′ = 1/f<br />D′ = fD / (D − f)</div></Step>
        <Step number={3} title="Substitute the current values"><div className="answer-equation">D′ = {focalMm}·{(distanceM * 1000).toFixed(0)} / ({(distanceM * 1000).toFixed(0)} − {focalMm}) = <b>{imageMm.toFixed(2)} mm</b></div><p>The physical camera must be at least this thick from the lens plane to the sensor.</p></Step>
        <Step number={4} title="Check whether aperture is needed"><p>No. A does not appear in the thin-lens equation. It changes light collection and out-of-focus blur, not the image distance for a focused object.</p></Step>
      </div>
    </div>
  </AnswerFrame>;
}

function BlurAnswer() {
  const [sensorMm, setSensorMm] = useState(50);
  const [apertureMm, setApertureMm] = useState(20);
  const focalMm = 40;
  const blurMm = apertureMm * Math.abs(sensorMm - focalMm) / focalMm;
  const xLens = 105;
  const scaleX = 8;
  const xFocus = xLens + focalMm * scaleX;
  const xSensor = xLens + sensorMm * scaleX;
  const apertureRadius = apertureMm * 3;
  const blurRadius = blurMm * 3;
  const [dragging, setDragging] = useState<'sensor' | 'aperture' | null>(null);
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = clientPointToSvg(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;
    if (dragging === 'sensor') setSensorMm(fixed(clamp((point.x - xLens) / scaleX, 40, 70), 1));
    else setApertureMm(fixed(clamp(Math.abs(140 - point.y) / 3, 5, 35), 1));
  };

  return <AnswerFrame title="Defocus blur from similar triangles" takeaway={<>With A = 20 mm, f = 40 mm and D′<sub>s</sub> = 50 mm, the blur diameter is <b>B = 5 mm = 0.5 cm</b>. Moving the sensor onto the focal plane makes the blur shrink to zero.</>}>
    <div className="answer-layout">
      <div className="interactive-figure">
        <div className="figure-heading"><span>DRAG BOTH HANDLES</span><b>Move the sensor or change the aperture</b></div>
        <svg viewBox="0 0 720 280" aria-label="Interactive similar triangles diagram for defocus blur." onPointerMove={move} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(null); }}>
          <line className="diagram-axis" x1="45" y1="140" x2="680" y2="140" />
          <line className="diagram-lens" x1={xLens} y1={140 - apertureRadius} x2={xLens} y2={140 + apertureRadius} />
          <line className="diagram-ray primary" x1="45" y1={140 - apertureRadius} x2={xLens} y2={140 - apertureRadius} />
          <line className="diagram-ray primary" x1={xLens} y1={140 - apertureRadius} x2={xFocus} y2="140" />
          <line className="diagram-ray primary" x1={xFocus} y1="140" x2={xSensor} y2={140 + blurRadius} />
          <line className="diagram-ray secondary" x1="45" y1={140 + apertureRadius} x2={xLens} y2={140 + apertureRadius} />
          <line className="diagram-ray secondary" x1={xLens} y1={140 + apertureRadius} x2={xFocus} y2="140" />
          <line className="diagram-ray secondary" x1={xFocus} y1="140" x2={xSensor} y2={140 - blurRadius} />
          <line className="diagram-sensor" x1={xSensor} y1="48" x2={xSensor} y2="232" />
          <line className="diagram-measure" x1={xSensor} y1={140 - blurRadius} x2={xSensor} y2={140 + blurRadius} />
          <circle className="drag-handle" cx={xSensor} cy="215" r="12" onPointerDown={(event) => { setDragging('sensor'); event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }} />
          <circle className="drag-handle warm" cx={xLens} cy={140 - apertureRadius} r="12" onPointerDown={(event) => { setDragging('aperture'); event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }} />
          <text x={xFocus - 8} y="161">f</text><text x={xSensor - 25} y="252">sensor</text><text x={xSensor + 8} y="135">B = {blurMm.toFixed(1)} mm</text>
        </svg>
      </div>
      <div className="answer-steps">
        <Step number={1} title="Locate the ideal focus"><p>An object at infinity sends parallel rays, so a thin converging lens focuses them at f = 40 mm behind the lens.</p></Step>
        <Step number={2} title="Read the two similar triangles"><div className="answer-equation">(A/2) / f = (B/2) / |D′<sub>s</sub> − f|</div><p>The aperture cone narrows to a point at f and expands again before reaching the displaced sensor.</p></Step>
        <Step number={3} title="Solve for the blur diameter"><div className="answer-equation">B = (A/f)|D′<sub>s</sub> − f|<br />= ({apertureMm.toFixed(1)}/{focalMm})·|{sensorMm.toFixed(1)} − {focalMm}| = <b>{blurMm.toFixed(2)} mm</b></div></Step>
        <Step number={4} title="Interpret the result"><p>Larger apertures and larger sensor displacement both increase blur linearly. At D′<sub>s</sub> = f the cone meets the sensor at a point.</p></Step>
      </div>
    </div>
  </AnswerFrame>;
}

function FovAnswer() {
  const [focalMm, setFocalMm] = useState(50);
  const [sensorMm, setSensorMm] = useState(40);
  const fov = 2 * Math.atan(sensorMm / (2 * focalMm)) * 180 / Math.PI;
  const xLens = 350;
  const geometryScale = 3;
  const xSensor = xLens + focalMm * geometryScale;
  const sensorRadius = sensorMm * geometryScale;
  const angleRadius = 54;
  const angleEnd = fovArcEndpoint(xLens, 140, angleRadius, sensorMm, focalMm);
  const [dragging, setDragging] = useState<'focal' | 'sensor' | null>(null);
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = clientPointToSvg(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;
    if (dragging === 'focal') setFocalMm(fixed(clamp((point.x - xLens) / geometryScale, 25, 80), 1));
    else setSensorMm(fixed(clamp(Math.abs(140 - point.y) / geometryScale * 2, 20, 70), 1));
  };

  return <AnswerFrame title="Field of view from sensor geometry" takeaway={<>For a 40 mm square sensor and f = 50 mm, both horizontal and vertical fields of view are <b>43.6°</b>. A larger sensor widens the view; a longer focal length narrows it.</>}>
    <div className="answer-layout">
      <div className="interactive-figure">
        <div className="figure-heading"><span>DRAG SENSOR EDGE OR PLANE</span><b>Explore sensor size and focal length</b></div>
        <svg viewBox="0 0 720 280" aria-label="Interactive camera field of view geometry." onPointerMove={move} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(null); }}>
          <line className="diagram-axis" x1="40" y1="140" x2="680" y2="140" />
          <line className="diagram-lens" x1={xLens} y1="78" x2={xLens} y2="202" />
          <line className="diagram-sensor" x1={xSensor} y1={140 - sensorRadius / 2} x2={xSensor} y2={140 + sensorRadius / 2} />
          <path className="diagram-fov-fill" d={`M${xLens} 140 L45 ${140 - (sensorRadius / 2) * (xLens - 45) / (xSensor - xLens)} L45 ${140 + (sensorRadius / 2) * (xLens - 45) / (xSensor - xLens)} Z`} />
          <line className="diagram-ray primary" x1="45" y1={140 - (sensorRadius / 2) * (xLens - 45) / (xSensor - xLens)} x2={xSensor} y2={140 + sensorRadius / 2} />
          <line className="diagram-ray secondary" x1="45" y1={140 + (sensorRadius / 2) * (xLens - 45) / (xSensor - xLens)} x2={xSensor} y2={140 - sensorRadius / 2} />
          <circle className="drag-handle warm" cx={xSensor} cy={140 - sensorRadius / 2} r="12" onPointerDown={(event) => { setDragging('sensor'); event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }} />
          <circle className="drag-handle" cx={xSensor} cy="140" r="12" onPointerDown={(event) => { setDragging('focal'); event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }} />
          <path className="diagram-angle" d={`M${xLens - angleRadius} 140 A${angleRadius} ${angleRadius} 0 0 1 ${angleEnd.x} ${angleEnd.y}`} />
          <text x={xLens - 87} y="111">φ</text><text x={xLens + 12} y="160">f = {focalMm.toFixed(1)} mm</text><text x={xSensor + 10} y={140 - sensorRadius / 2}>d = {sensorMm.toFixed(1)} mm</text>
        </svg>
      </div>
      <div className="answer-steps">
        <Step number={1} title="Split the symmetric viewing cone"><p>The optical axis bisects the full field of view. The right triangle therefore uses half the sensor dimension, d/2, opposite the half-angle φ.</p></Step>
        <Step number={2} title="Write the triangle relation"><div className="answer-equation">tan φ = (d/2) / f = d/(2f)</div></Step>
        <Step number={3} title="Recover the full angle"><div className="answer-equation">FoV = 2φ = 2 arctan(d/(2f))<br />= 2 arctan({sensorMm.toFixed(1)}/(2·{focalMm.toFixed(1)})) = <b>{fov.toFixed(1)}°</b></div></Step>
        <Step number={4} title="Use the square-sensor condition"><p>The sensor has the same width and height, so its nominal horizontal and vertical fields of view are equal.</p></Step>
      </div>
    </div>
  </AnswerFrame>;
}

function RepeatFilterAnswer() {
  const [values, setValues] = useState([20, 40, 65, 90, 55, 35, 15]);
  const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const first = values.map((_, index) => ((values[index - 1] ?? 0) + values[index] + (values[index + 1] ?? 0)) / 3);
  const secondCenter = (first[2] + first[3] + first[4]) / 3;
  const weightedCenter = (values[1] + 2 * values[2] + 3 * values[3] + 2 * values[4] + values[5]) / 9;

  return <AnswerFrame title="Two mean filters become one triangular filter" takeaway={<>For pixels unaffected by the boundary, two passes of [1, 1, 1]/3 equal one pass of <b>[1, 2, 3, 2, 1]/9</b>. For the center pixel, the final value is (b + 2c + 3d + 2e + f)/9. Full-image equivalence requires cropping only after both passes.</>}>
    <div className="answer-layout">
      <div className="interactive-figure filter-figure">
        <div className="figure-heading"><span>DRAG PIXEL VALUES</span><b>Watch the two passes and weighted sum agree</b></div>
        <div className="pixel-editor">{values.map((value, index) => <label key={labels[index]}><span>{labels[index]}</span><input aria-label={`Pixel ${labels[index]}`} type="range" min="0" max="100" value={value} onChange={(event) => setValues(values.map((item, itemIndex) => itemIndex === index ? Number(event.target.value) : item))} /><output>{value}</output></label>)}</div>
        <div className="filter-stage"><span>FIRST PASS NEAR d</span><div><b>c₁</b><em>{first[2].toFixed(1)}</em><b>d₁</b><em>{first[3].toFixed(1)}</em><b>e₁</b><em>{first[4].toFixed(1)}</em></div></div>
        <div className="filter-stage result"><span>SECOND PASS</span><strong>d₂ = {secondCenter.toFixed(2)}</strong><small>single 1×5 filter gives {weightedCenter.toFixed(2)}</small></div>
      </div>
      <div className="answer-steps">
        <Step number={1} title="Apply the first 1×3 mean"><div className="answer-equation">c₁ = (b+c+d)/3 = {first[2].toFixed(2)}<br />d₁ = (c+d+e)/3 = {first[3].toFixed(2)}<br />e₁ = (d+e+f)/3 = {first[4].toFixed(2)}</div></Step>
        <Step number={2} title="Average those three results again"><div className="answer-equation">d₂ = (c₁+d₁+e₁)/3<br />= (b+2c+3d+2e+f)/9 = <b>{secondCenter.toFixed(2)}</b></div></Step>
        <Step number={3} title="Convolve the filter with itself"><div className="kernel-strip"><span>1/3</span><span>1/3</span><span>1/3</span></div><div className="equation-arrow">∗</div><div className="kernel-strip"><span>1/3</span><span>1/3</span><span>1/3</span></div><div className="equation-arrow">=</div><div className="kernel-strip five"><span>1/9</span><span>2/9</span><span>3/9</span><span>2/9</span><span>1/9</span></div><p>This identity applies directly to the center calculation. With same-size zero-padded outputs at every pass, boundary pixels differ unless the extended signal is cropped only once at the end.</p></Step>
      </div>
    </div>
  </AnswerFrame>;
}

const sourcePatch = [[128, 128, 128], [64, 192, 64], [0, 128, 64]];
const targetPatch = [[96, 128, 96], [80, 128, 80], [32, 80, 64]];

function applyKernel(weights: number[]) {
  return sourcePatch.map((row) => row.map((value, index) => weights[2] * (row[index - 1] ?? 0) + weights[1] * value + weights[0] * (row[index + 1] ?? 0)));
}

function Matrix({ values, label, target }: { values: number[][]; label: string; target?: number[][] }) {
  return <div className="matrix-wrap"><span>{label}</span><div className="matrix-grid">{values.flatMap((row, rowIndex) => row.map((value, columnIndex) => <b className={target && Math.abs(value - target[rowIndex][columnIndex]) < .01 ? 'matched' : ''} key={`${rowIndex}-${columnIndex}`}>{fixed(value, 1)}</b>))}</div></div>;
}

function KernelAnswer() {
  const [weights, setWeights] = useState([.25, .5, .25]);
  const predicted = applyKernel(weights);
  const error = predicted.flat().reduce((sum, value, index) => sum + Math.abs(value - targetPatch.flat()[index]), 0);
  return <AnswerFrame title="Recover the horizontal convolution kernel" takeaway={<>Solving the three equations from the last row gives <b>k = [0.25, 0.50, 0.25]</b>. Convolution flips the kernel; symmetry makes this particular kernel unchanged by the flip.</>}>
    <div className="answer-layout">
      <div className="interactive-figure kernel-figure">
        <div className="figure-heading"><span>DRAG THE THREE WEIGHTS</span><b>Match every cell in the target patch</b></div>
        <div className="matrix-flow"><Matrix values={sourcePatch} label="I" /><span>∗ k →</span><Matrix values={predicted} label="current output" target={targetPatch} /><span>compare</span><Matrix values={targetPatch} label="I′" /></div>
        <div className="kernel-controls">{weights.map((weight, index) => <RangeControl key={index} label={`k${index + 1}`} value={weight} min={-1} max={1} step={.05} onChange={(value) => setWeights(weights.map((item, itemIndex) => itemIndex === index ? value : item))} />)}</div>
        <div className={error < .01 ? 'kernel-error solved' : 'kernel-error'}><span>Total absolute error</span><strong>{error.toFixed(1)}</strong><small>{error < .01 ? 'Exact match' : 'Adjust the weights'}</small></div>
      </div>
      <div className="answer-steps">
        <Step number={1} title="Remember that convolution flips k"><p>For a row [x₁,x₂,x₃], the center operation uses the reversed weights [k₃,k₂,k₁]. Zero padding supplies the missing values at the boundaries.</p></Step>
        <Step number={2} title="Use the third row [0,128,64]"><div className="answer-equation">128k₁ = 32 ⇒ k₁ = 0.25<br />128k₂ + 64k₁ = 80 ⇒ k₂ = 0.50<br />128k₃ + 64k₂ = 64 ⇒ k₃ = 0.25</div></Step>
        <Step number={3} title="Verify the complete patch"><p>Substituting k = [0.25, 0.50, 0.25] reproduces all nine entries of I′, not just the three equations used to solve it.</p></Step>
      </div>
    </div>
  </AnswerFrame>;
}

function EventAnswer() {
  const [motion, setMotion] = useState({ x: 95, y: 0 });
  const [gradient, setGradient] = useState(.1);
  const [threshold, setThreshold] = useState(.2);
  const deltaT = .05;
  const speed = Math.hypot(motion.x, motion.y);
  const deltaL = -gradient * motion.x * deltaT;
  const triggers = Math.abs(deltaL) >= threshold;
  const angle = Math.atan2(-motion.y, motion.x) * 180 / Math.PI;
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = clientPointToSvg(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;
    const dx = point.x - 360;
    const dy = point.y - 150;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(130, length) / length;
    setMotion({ x: fixed(dx * scale, 1), y: fixed(dy * scale, 1) });
  };

  return <AnswerFrame title="Why moving edges trigger events" takeaway={<>An event occurs when <b>|ΔL| ≈ |∇L · v|Δt ≥ C</b>. A strong edge can still stay silent when motion is tangent to it, because the motion is then perpendicular to the brightness gradient.</>}>
    <div className="answer-layout">
      <div className="interactive-figure event-figure">
        <div className="figure-heading"><span>DRAG THE MOTION VECTOR</span><b>Rotate motion relative to the edge gradient</b></div>
        <svg viewBox="0 0 720 300" aria-label="Interactive event camera diagram. Drag the motion vector to change its direction and magnitude." onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); move(event); }} onPointerMove={move} onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}>
          <rect className="event-dark" x="45" y="35" width="315" height="230" />
          <rect className="event-light" x="360" y="35" width="315" height="230" />
          <line className="event-edge" x1="360" y1="35" x2="360" y2="265" />
          <line className="gradient-arrow" x1="360" y1="150" x2="475" y2="150" />
          <path className="gradient-arrow" d="M475 150 L458 140 M475 150 L458 160" />
          <line className="motion-arrow" x1="360" y1="150" x2={360 + motion.x} y2={150 + motion.y} />
          <path className="motion-arrow" d={`M${360 + motion.x} ${150 + motion.y} l${-14 * Math.cos(Math.atan2(motion.y, motion.x) - .55)} ${-14 * Math.sin(Math.atan2(motion.y, motion.x) - .55)} M${360 + motion.x} ${150 + motion.y} l${-14 * Math.cos(Math.atan2(motion.y, motion.x) + .55)} ${-14 * Math.sin(Math.atan2(motion.y, motion.x) + .55)}`} />
          <circle className="drag-handle" cx={360 + motion.x} cy={150 + motion.y} r="13" />
          <text className="svg-light-label" x="62" y="58">dark</text><text x="620" y="58">bright</text><text x="480" y="139">∇L</text><text x={374 + motion.x} y={146 + motion.y}>v</text>
        </svg>
        <div className="event-controls"><RangeControl label="Gradient |∇L|" value={gradient} min={0} max={.2} step={.01} onChange={setGradient} /><RangeControl label="Threshold C" value={threshold} min={.05} max={.6} step={.01} onChange={setThreshold} /></div>
        <div className={triggers ? 'event-readout active' : 'event-readout'}><span>{triggers ? (deltaL > 0 ? 'ON EVENT' : 'OFF EVENT') : 'NO EVENT'}</span><strong>|ΔL| = {Math.abs(deltaL).toFixed(3)}</strong><small>motion {speed.toFixed(0)} px/s · angle {angle.toFixed(0)}° · C = {threshold.toFixed(2)}</small></div>
      </div>
      <div className="answer-steps">
        <Step number={1} title="Start from the event threshold"><div className="answer-equation">|L(x,y,t+Δt) − L(x,y,t)| = |ΔL| ≥ C,<br />where L = log I.</div></Step>
        <Step number={2} title="Differentiate constant brightness"><div className="answer-equation">dL/dt = ∇L · v + L<sub>t</sub> = 0<br />⇒ L<sub>t</sub> = −∇L · v</div></Step>
        <Step number={3} title="Approximate the change at one pixel"><div className="answer-equation">ΔL ≈ L<sub>t</sub>Δt = −∇L · v Δt<br />current: ΔL = −{gradient.toFixed(2)}·{motion.x.toFixed(1)}·{deltaT} = <b>{deltaL.toFixed(3)}</b></div></Step>
        <Step number={4} title="Interpret the dot product"><p>Uniform regions have ∇L = 0. Motion tangent to an edge is perpendicular to ∇L, so the dot product is zero. Motion across the edge aligns with ∇L and maximizes |ΔL|. The sign of ΔL determines event polarity.</p></Step>
      </div>
    </div>
  </AnswerFrame>;
}

export function InteractiveAnswer({ questionId, fallback }: InteractiveAnswerProps) {
  if (questionId === 't02-camera-thickness') return <ThinLensAnswer />;
  if (questionId === 't02-camera-blur') return <BlurAnswer />;
  if (questionId === 't02-camera-fov') return <FovAnswer />;
  if (questionId === 't02-filter-repeat') return <RepeatFilterAnswer />;
  if (questionId === 't02-filter-kernel') return <KernelAnswer />;
  if (questionId === 't02-camera-events') return <EventAnswer />;
  return <div className="released-answer"><span>ANSWER</span><p>{fallback}</p></div>;
}
