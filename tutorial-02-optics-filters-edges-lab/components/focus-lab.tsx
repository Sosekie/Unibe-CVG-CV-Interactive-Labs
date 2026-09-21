'use client';

import { useMemo, useState } from 'react';
import { Aperture, Crosshair, Focus, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RangeControl } from '@/components/range-control';
import { fovArcEndpoint, linearPlanePosition, logarithmicPosition } from '@/lib/diagram-geometry';
import { circleOfConfusion, fieldOfView, focusedImageDistance } from '@/lib/optics';

const lensX = 455;
const axisY = 205;
const objectTopY = 88;
const horizontalPixelsPerMm = 2.45;

const presetExplanations = {
  1: {
    label: 'Q1 · minimum camera thickness',
    text: <><strong>Principle.</strong> A finite object is focused using 1/D + 1/D′ = 1/f. <strong>Why these values.</strong> With f = 50 mm and D = 5 m, the object is far away but not at infinity, so D′ is slightly larger than f; autofocus places the sensor exactly there. <strong>Result.</strong> D′ = fD/(D − f) = 50.51 mm ≈ 5.05 cm, which is the minimum lens-to-sensor thickness. The aperture is not needed. <strong>Look at.</strong> The dashed ideal-focus plane and the blue sensor line coincide, while the blur diameter is zero.</>,
  },
  2: {
    label: 'Q2 · defocus blur',
    text: <><strong>Principle.</strong> An object at infinity sends parallel rays to the lens and focuses at D′ = f. <strong>Why these values.</strong> The 40 mm lens focuses at 40 mm, but the sensor is deliberately fixed 10 mm farther back at 50 mm; the 20 mm aperture makes the defocus visible. <strong>Result.</strong> B = A|D′ₛ − D′|/D′ = 20·10/40 = 5 mm = 0.5 cm. <strong>Look at.</strong> Follow the parallel incoming rays to the ideal focus, then watch them separate again at the sensor; the marked segment B is the blur diameter.</>,
  },
  3: {
    label: 'Q3 · field of view',
    text: <><strong>Principle.</strong> FoV is determined by sensor size and focal length: 2 tan⁻¹(d/2f). <strong>Why these values.</strong> A square 40 × 40 mm sensor and f = 50 mm make the horizontal and vertical cases identical; focusing at infinity also puts the sensor on the focal plane. <strong>Result.</strong> Both nominal FoVs are 43.6°, and the sensor-plane value matches. <strong>Look at.</strong> Use the two lower cross-sections: the boundary rays, angle arc φ, and horizontal/vertical readouts should change together when w, h, or f changes.</>,
  },
} as const;

function imagePlaneX(distance: number) {
  return linearPlanePosition(lensX, distance, horizontalPixelsPerMm);
}

function FovSlice({ label, sensorSize, focalLength }: { label: string; sensorSize: number; focalLength: number }) {
  const centerY = 88;
  const sliceLensX = 178;
  const focalPixels = 45 + focalLength * .7;
  const sliceSensorX = sliceLensX + focalPixels;
  const sensorHalf = sensorSize / 2 * focalPixels / focalLength;
  const sceneX = sliceLensX - focalPixels;
  const arcRadius = 28;
  const arcEnd = fovArcEndpoint(sliceLensX, centerY, arcRadius, sensorSize, focalLength);

  return (
    <article className="fov-slice">
      <span>{label}</span>
      <svg viewBox="0 0 360 176" aria-label={`${label} field-of-view geometry`}>
        <path className="fov-fill" d={`M ${sliceLensX} ${centerY} L ${sceneX} ${centerY - sensorHalf} L ${sceneX} ${centerY + sensorHalf} Z`} />
        <line x1="34" y1={centerY} x2="326" y2={centerY} className="optical-axis" />
        <line x1={sliceLensX} y1="34" x2={sliceLensX} y2="142" className="diagram-lens" />
        <line x1={sliceSensorX} y1={centerY - sensorHalf} x2={sliceSensorX} y2={centerY + sensorHalf} className="sensor-active" />
        <line x1={sceneX} y1={centerY - sensorHalf} x2={sliceSensorX} y2={centerY + sensorHalf} className="ray ray-a" />
        <line x1={sceneX} y1={centerY + sensorHalf} x2={sliceSensorX} y2={centerY - sensorHalf} className="ray ray-b" />
        <path className="diagram-angle" d={`M ${sliceLensX - arcRadius} ${centerY} A ${arcRadius} ${arcRadius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`} />
        <text x={sliceLensX - 43} y={centerY - 13} className="svg-label">φ</text>
        <text x={sliceSensorX - 20} y="164" className="svg-label">{sensorSize} mm</text>
      </svg>
      <strong>{fieldOfView(sensorSize, focalLength).toFixed(1)}°</strong>
    </article>
  );
}

export function FocusLab() {
  const [focalLength, setFocalLength] = useState(50);
  const [objectDistance, setObjectDistance] = useState(5000);
  const [sensorDistance, setSensorDistance] = useState(50.5);
  const [aperture, setAperture] = useState(20);
  const [sensorWidth, setSensorWidth] = useState(40);
  const [sensorHeight, setSensorHeight] = useState(40);
  const [autofocus, setAutofocus] = useState(true);
  const [objectAtInfinity, setObjectAtInfinity] = useState(false);
  const [activePreset, setActivePreset] = useState<1 | 2 | 3 | null>(null);

  const idealDistance = useMemo(
    () => focusedImageDistance(focalLength, objectAtInfinity ? Number.POSITIVE_INFINITY : objectDistance),
    [focalLength, objectAtInfinity, objectDistance],
  );
  const actualSensorDistance = autofocus ? idealDistance : sensorDistance;
  const blur = circleOfConfusion(aperture, actualSensorDistance, idealDistance);
  const nominalHFov = fieldOfView(sensorWidth, focalLength);
  const nominalVFov = fieldOfView(sensorHeight, focalLength);
  const sensorPlaneHFov = fieldOfView(sensorWidth, actualSensorDistance);

  const sensorX = imagePlaneX(actualSensorDistance);
  const focusX = imagePlaneX(idealDistance);
  const objectX = logarithmicPosition(objectDistance, 250, 10000, 185, 92);
  const imagePointY = objectAtInfinity
    ? axisY
    : axisY + (axisY - objectTopY) * (focusX - lensX) / (lensX - objectX);
  const sensorImageY = axisY + (sensorX - lensX) * (imagePointY - axisY) / (focusX - lensX);
  const apertureRadiusMm = aperture / 2;
  const sensorHalfMm = sensorHeight / 2;
  const blurRadiusMm = blur / 2;
  const diagramHalfHeight = 112;
  const blurRoom = Math.max(18, diagramHalfHeight - Math.abs(sensorImageY - axisY));
  const verticalPixelsPerMm = Math.min(
    3,
    diagramHalfHeight / Math.max(apertureRadiusMm, 1),
    diagramHalfHeight / Math.max(sensorHalfMm, 1),
    blurRoom / Math.max(blurRadiusMm, 1),
  );
  const apertureHalf = apertureRadiusMm * verticalPixelsPerMm;
  const sensorHalf = sensorHalfMm * verticalPixelsPerMm;
  const rayAtSensor = (lensY: number) => lensY
    + (sensorX - lensX) * (imagePointY - lensY) / (focusX - lensX);
  const upperSensorY = rayAtSensor(axisY - apertureHalf);
  const lowerSensorY = rayAtSensor(axisY + apertureHalf);
  const blurTopY = Math.min(upperSensorY, lowerSensorY);
  const blurBottomY = Math.max(upperSensorY, lowerSensorY);
  const incomingUpperY = objectAtInfinity ? axisY - apertureHalf : objectTopY;
  const incomingLowerY = objectAtInfinity ? axisY + apertureHalf : objectTopY;

  const setFixedSensor = (value: number) => {
    setActivePreset(null);
    setAutofocus(false);
    setSensorDistance(value);
  };

  const preset = (question: 1 | 2 | 3) => {
    if (question === 1) {
      setFocalLength(50); setObjectDistance(5000); setObjectAtInfinity(false); setAperture(20); setAutofocus(true);
    } else if (question === 2) {
      setFocalLength(40); setObjectDistance(10000); setObjectAtInfinity(true); setAperture(20); setAutofocus(false); setSensorDistance(50);
    } else {
      setFocalLength(50); setObjectDistance(10000); setObjectAtInfinity(true); setSensorWidth(40); setSensorHeight(40); setAutofocus(false); setSensorDistance(50);
    }
    setActivePreset(question);
  };

  return (
    <section className="lab-module" aria-labelledby="focus-title">
      <div className="module-heading">
        <div>
          <p className="section-kicker">CAMERA 1–3</p>
          <h2 id="focus-title">Focus &amp; field of view</h2>
          <p>Predict where the image becomes sharp, then move the sensor or let autofocus place it for you.</p>
        </div>
        <div className="model-callout"><Aperture size={17} /><span><strong>Physical thin-lens model</strong> — this is not Tutorial 01’s ideal pinhole camera.</span></div>
      </div>

      <div className="preset-row" aria-label="Tutorial presets">
        <span>Load a tutorial case</span>
        <Button variant="outline" size="sm" aria-pressed={activePreset === 1} onClick={() => preset(1)}>Q1 · thickness</Button>
        <Button variant="outline" size="sm" aria-pressed={activePreset === 2} onClick={() => preset(2)}>Q2 · blur</Button>
        <Button variant="outline" size="sm" aria-pressed={activePreset === 3} onClick={() => preset(3)}>Q3 · FoV</Button>
      </div>
      {activePreset && (
        <aside className="preset-explainer" aria-live="polite">
          <span>{presetExplanations[activePreset].label}</span>
          <p>{presetExplanations[activePreset].text}</p>
        </aside>
      )}

      <div className="lab-layout focus-layout">
        <aside className="control-panel glass-panel">
          <div className="mode-toggle">
            <span><Focus size={16} /> Autofocus</span>
            <Switch checked={autofocus} onCheckedChange={(value) => { setActivePreset(null); setAutofocus(value); }} aria-label="Toggle autofocus" />
          </div>
          <div className="mode-toggle">
            <span><ScanLine size={16} /> Object at infinity</span>
            <Switch checked={objectAtInfinity} onCheckedChange={(value) => { setActivePreset(null); setObjectAtInfinity(value); }} aria-label="Treat object as infinitely distant" />
          </div>
          <RangeControl label="focal length" symbol="f" value={focalLength} min={25} max={80} step={1} unit="mm" onChange={(value) => { setActivePreset(null); setFocalLength(value); }} />
          <RangeControl label="object distance" symbol="D" value={objectAtInfinity ? 10000 : objectDistance} min={250} max={10000} step={50} unit="mm" onChange={(value) => { setActivePreset(null); setObjectAtInfinity(false); setObjectDistance(value); }} displayValue={objectAtInfinity ? '∞' : undefined} />
          <RangeControl label="sensor distance" symbol="D′ₛ" value={actualSensorDistance} min={25} max={125} step={0.1} unit="mm" onChange={setFixedSensor} disabled={autofocus} />
          <RangeControl label="aperture diameter" symbol="A" value={aperture} min={2} max={30} step={1} unit="mm" onChange={(value) => { setActivePreset(null); setAperture(value); }} />
          <RangeControl label="sensor width" symbol="w" value={sensorWidth} min={10} max={60} step={1} unit="mm" onChange={(value) => { setActivePreset(null); setSensorWidth(value); }} />
          <RangeControl label="sensor height" symbol="h" value={sensorHeight} min={10} max={60} step={1} unit="mm" onChange={(value) => { setActivePreset(null); setSensorHeight(value); }} />
        </aside>

        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span><ScanLine size={15} /> side view · not to scale</span><span>{autofocus ? 'sensor locked to focus' : 'sensor fixed manually'}</span></div>
          <svg className="focus-diagram" viewBox="0 0 820 350" aria-label="Thin lens diagram showing object, lens, focus plane, sensor and blur circle">
            <defs>
              <linearGradient id="lens-fill" x1="0" x2="1"><stop stopColor="#dff4ff" /><stop offset="1" stopColor="#a9d8ff" /></linearGradient>
            </defs>
            <line x1="34" y1={axisY} x2="786" y2={axisY} className="optical-axis" />
            {objectAtInfinity ? (
              <text x="54" y="64" className="svg-label">parallel rays from ∞</text>
            ) : (
              <>
                <line x1={objectX} y1={axisY} x2={objectX} y2={objectTopY} className="object-line" />
                <path d={`M ${objectX - 8} ${objectTopY + 12} L ${objectX} ${objectTopY} L ${objectX + 8} ${objectTopY + 12}`} className="object-line" />
                <text x={objectX - 25} y="322" className="svg-label">object</text>
              </>
            )}

            <path d={`M ${lensX} 88 Q ${lensX - 34} ${axisY} ${lensX} 322 Q ${lensX + 34} ${axisY} ${lensX} 88`} fill="url(#lens-fill)" className="lens-shape" />
            <line x1={lensX} y1={axisY - apertureHalf} x2={lensX} y2={axisY + apertureHalf} className="aperture-line" />
            <text x={lensX - 24} y="338" className="svg-label">thin lens</text>

            <line x1={objectX} y1={incomingUpperY} x2={lensX} y2={axisY - apertureHalf} className="ray ray-a" />
            <line x1={lensX} y1={axisY - apertureHalf} x2={focusX} y2={imagePointY} className="ray ray-a" />
            <line x1={focusX} y1={imagePointY} x2={sensorX} y2={upperSensorY} className="ray ray-a muted-tail" />
            <line x1={objectX} y1={incomingLowerY} x2={lensX} y2={axisY + apertureHalf} className="ray ray-b" />
            <line x1={lensX} y1={axisY + apertureHalf} x2={focusX} y2={imagePointY} className="ray ray-b" />
            <line x1={focusX} y1={imagePointY} x2={sensorX} y2={lowerSensorY} className="ray ray-b muted-tail" />
            <line x1={focusX} y1="78" x2={focusX} y2="314" className="ideal-plane" />
            <circle cx={focusX} cy={imagePointY} r="5" className="focus-dot" />
            <text x={focusX - 35} y="64" className="svg-label">ideal focus D′</text>

            <line x1={sensorX} y1={axisY - sensorHalf - 8} x2={sensorX} y2={axisY + sensorHalf + 8} className="sensor-line" />
            <line x1={sensorX} y1={axisY - sensorHalf} x2={sensorX} y2={axisY + sensorHalf} className="sensor-active" />
            <line x1={sensorX} y1={blurTopY} x2={sensorX} y2={blurBottomY} className="blur-line" />
            <circle cx={sensorX} cy={sensorImageY} r="3.5" className="focus-dot" />
            <text x={sensorX - 23} y={Math.min(340, axisY + sensorHalf + 27)} className="svg-label">sensor</text>
            <text x={sensorX + 12} y={sensorImageY + 4} className="svg-label blur-label">B</text>
          </svg>

          <div className="focus-fov-slices" aria-label="Horizontal and vertical field-of-view cross-sections">
            <FovSlice label="HORIZONTAL · sensor width w" sensorSize={sensorWidth} focalLength={focalLength} />
            <FovSlice label="VERTICAL · sensor height h" sensorSize={sensorHeight} focalLength={focalLength} />
          </div>

          <div className="readout-grid">
            <article><Crosshair size={18} /><span>Ideal image distance</span><strong>{idealDistance.toFixed(2)} mm</strong></article>
            <article><Focus size={18} /><span>Blur diameter</span><strong>{blur.toFixed(2)} mm</strong></article>
            <article><ScanLine size={18} /><span>Nominal hFoV / vFoV</span><strong>{nominalHFov.toFixed(1)}° / {nominalVFov.toFixed(1)}°</strong></article>
            <article><ScanLine size={18} /><span>Current sensor-plane hFoV</span><strong>{sensorPlaneHFov.toFixed(1)}°</strong></article>
          </div>
        </div>
      </div>

      <div className="formula-strip">
        <div><span>Thin lens</span><strong>1/D + 1/D′ = 1/f</strong></div>
        <div><span>Finite-distance blur</span><strong>B = A |D′ₛ − D′| / D′</strong></div>
        <div><span>Nominal FoV</span><strong>2 tan⁻¹(d / 2f)</strong></div>
      </div>
      <p className="micro-note">The aperture A is intentionally shown for all cases, but it is not needed to solve Q1. Object distance is shown on a logarithmic horizontal display scale so the full 250–10,000 mm range remains visible. The image-formation diagram automatically rescales vertically while preserving aperture, sensor and blur ratios. The two FoV cross-sections show the true angles controlled by sensor width and height.</p>
    </section>
  );
}
