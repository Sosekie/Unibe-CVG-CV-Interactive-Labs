"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { QuestionsSection } from "@/components/questions-section";
import { PinholeScene3D } from "@/components/pinhole-scene-3d";
import {
  FOCAL_MAX,
  FOCAL_MIN,
  clampPrincipalOffset,
  computeCameraModel,
  computeSensorProjection,
  computeSideDiagram,
  focalLengthFromHorizontalFov,
  horizontalFovRange,
  intrinsicMatrix,
  principalOffsetLimit,
} from "@/lib/pinhole-geometry";

type RangeControlProps = {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  accent?: "cyan" | "orange";
};

function RangeControl({
  label,
  symbol,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  accent = "cyan",
}: RangeControlProps) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  const commit = (rawValue = draft) => {
    const parsed = Number(rawValue);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    onChange(next);
    setDraft(String(next));
    setEditing(false);
  };

  return (
    <div className="control-group">
      <div className="control-heading">
        <label htmlFor={symbol}>{label}</label>
        <span className="control-symbol">{symbol}</span>
      </div>
      <div className="control-input-row">
        <Slider
          aria-label={`${label} (${symbol})`}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => {
            if (typeof next !== "number" || !Number.isFinite(next)) return;
            onChange(next);
            setDraft(String(next));
          }}
          className={accent === "orange" ? "range-orange" : "range-cyan"}
        />
        <div className="number-input-wrap">
          <Input
            id={symbol}
            inputMode="decimal"
            value={editing ? draft : String(value)}
            onFocus={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              setEditing(true);
            }}
            onBlur={(event) => commit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              commit(event.currentTarget.value);
              event.currentTarget.blur();
            }}
            aria-label={`${label} (${symbol}) value`}
          />
          <span>{unit}</span>
        </div>
      </div>
      <div className="control-limits">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function AngleArc({ centerX, radius, upperAngle, lowerAngle, label }: { centerX: number; radius: number; upperAngle: number; lowerAngle: number; label: string }) {
  const topX = centerX - radius * Math.cos(upperAngle);
  const topY = 176 - radius * Math.sin(upperAngle);
  const bottomX = centerX - radius * Math.cos(lowerAngle);
  const bottomY = 176 + radius * Math.sin(lowerAngle);
  return (
    <g>
      <path d={`M ${topX} ${topY} A ${radius} ${radius} 0 0 0 ${bottomX} ${bottomY}`} className="fov-arc" />
      <text x={centerX - radius - 150} y="120" className="svg-fov-label">
        {label}
      </text>
    </g>
  );
}

export default function Home() {
  const [focalLength, setFocalLength] = useState(35);
  const [sensorWidth, setSensorWidth] = useState(36);
  const [sensorHeight, setSensorHeight] = useState(24);
  const [objectDistance, setObjectDistance] = useState(900);
  const [objectHeight, setObjectHeight] = useState(170);
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);

  const camera = useMemo(() => computeCameraModel({
    focalLength,
    sensorWidth,
    sensorHeight,
    objectDistance,
    objectHeight,
    cx,
    cy,
  }), [cx, cy, focalLength, sensorWidth, sensorHeight, objectDistance, objectHeight]);

  const horizontalFovLimits = useMemo(() => horizontalFovRange(sensorWidth, cx), [sensorWidth, cx]);

  const setHorizontalFov = (fov: number) => {
    setFocalLength(focalLengthFromHorizontalFov(sensorWidth, fov, cx));
  };

  const setSensorWidthSafely = (value: number) => {
    setSensorWidth(value);
    setCx((current) => clampPrincipalOffset(current, value));
  };

  const setSensorHeightSafely = (value: number) => {
    setSensorHeight(value);
    setCy((current) => clampPrincipalOffset(current, value));
  };

  const diagram = useMemo(() => computeSideDiagram({
    focalLength,
    sensorHeight,
    objectDistance,
    objectHeight,
    cy,
  }), [cy, focalLength, objectDistance, objectHeight, sensorHeight]);

  const sensorProjection = useMemo(() => computeSensorProjection({
    sensorWidth,
    sensorHeight,
    imageHeight: camera.imageHeight,
    cx,
    cy,
  }), [camera.imageHeight, cx, cy, sensorHeight, sensorWidth]);

  const K = useMemo(() => intrinsicMatrix({
    fx: camera.fx,
    fy: camera.fy,
    sensorWidth,
    sensorHeight,
    cx,
    cy,
  }), [camera.fx, camera.fy, cx, cy, sensorHeight, sensorWidth]);

  return (
    <main className="lab-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="aperture-mark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className="eyebrow">COMPUTER VISION · GEOMETRY</p>
            <h1>Pinhole Camera Lab</h1>
          </div>
        </div>
        <div className="topbar-meta">
          <a className="institution-lockup" href="https://www.cvg.unibe.ch/" target="_blank" rel="noreferrer" aria-label="Computer Vision Group, University of Bern">
            <Image unoptimized src="https://www.unibe.ch/assets/media/image/logo_unibern@2x.png" alt="University of Bern" width={360} height={276} />
            <span>Computer Vision Group</span>
          </a>
          <div className="model-note"><span className="note-dot" />Ideal perspective model</div>
        </div>
      </header>

      <section className="intro-strip" aria-label="About this visualizer">
        <p>Adjust the camera and scene. Every view below is recomputed from the same pinhole projection.</p>
        <p><strong>Note:</strong> an ideal pinhole camera has no lens or focus mechanism; here, <em>f</em> is the pinhole-to-image-plane distance and is linked to field of view.</p>
      </section>

      <div className="lab-grid">
        <aside className="control-panel" aria-label="Camera controls">
          <div className="panel-title-row">
            <div><p className="section-kicker">01 / CONTROLS</p><h2>Camera & scene</h2></div>
            <span className="live-pill">LIVE</span>
          </div>
          <section className="control-section">
            <p className="control-section-title">Projection geometry</p>
            <RangeControl label="Image-plane distance" symbol="f" value={focalLength} min={FOCAL_MIN} max={FOCAL_MAX} step={0.1} unit="mm" onChange={setFocalLength} />
            <RangeControl label="Horizontal FoV" symbol="θₕ" value={Number(camera.hFov.toFixed(1))} min={horizontalFovLimits.min} max={horizontalFovLimits.max} step={0.1} unit="°" onChange={setHorizontalFov} accent="orange" />
            <p className="control-section-note">Here <em>f</em> is an image-plane distance in the ideal pinhole model, not a lens setting.</p>
          </section>
          <section className="control-section">
            <p className="control-section-title">Sensor</p>
            <div className="control-two-column">
              <RangeControl label="Width" symbol="wₛ" value={sensorWidth} min={12} max={50} step={0.1} unit="mm" onChange={setSensorWidthSafely} />
              <RangeControl label="Height" symbol="hₛ" value={sensorHeight} min={8} max={36} step={0.1} unit="mm" onChange={setSensorHeightSafely} />
            </div>
          </section>
          <section className="control-section">
            <p className="control-section-title">Object</p>
            <RangeControl label="Axial depth" symbol="Z" value={objectDistance} min={250} max={3000} step={10} unit="mm" onChange={setObjectDistance} />
            <RangeControl label="Height" symbol="H" value={objectHeight} min={20} max={300} step={1} unit="mm" onChange={setObjectHeight} />
            <p className="control-section-note">Z is measured from the pinhole along the optical axis. The vertical segment has endpoints (0, ±H/2, Z); its drawn width is symbolic.</p>
          </section>
          <section className="control-section principal-section">
            <p className="control-section-title">Principal point <span className="optional-label">optional extension</span></p>
            <div className="control-two-column">
              <RangeControl label="Horizontal offset" symbol="cₓ" value={cx} min={-principalOffsetLimit(sensorWidth)} max={principalOffsetLimit(sensorWidth)} step={0.1} unit="mm" onChange={(value) => setCx(clampPrincipalOffset(value, sensorWidth))} accent="orange" />
              <RangeControl label="Vertical offset" symbol="cᵧ" value={cy} min={-principalOffsetLimit(sensorHeight)} max={principalOffsetLimit(sensorHeight)} step={0.1} unit="mm" onChange={(value) => setCy(clampPrincipalOffset(value, sensorHeight))} accent="orange" />
            </div>
            <p className="control-section-note">Offsets are measured from the physical sensor centre: cₓ right, cᵧ up. The principal point stays on or within the sensor boundary. Non-zero offsets make the FoV asymmetric.</p>
          </section>
        </aside>

        <section className="visual-workspace" aria-label="Pinhole camera visualizations">
          <div className="workspace-heading">
            <div><p className="section-kicker">02 / PROJECTION</p><h2>One object, two views</h2></div>
            <div className="projection-status"><span>f = {focalLength.toFixed(1)} mm</span><span>·</span><span>vFoV = {camera.vFov.toFixed(1)}°</span></div>
          </div>

          <article className="diagram-card side-card">
            <div className="card-heading">
              <div><p className="diagram-label">SIDE VIEW</p><h3>Imaging geometry</h3></div>
              <span className="view-tag">y–z plane</span>
            </div>
            <div className="side-views-grid">
              <div className="side-diagram-wrap">
                <svg className="side-diagram" viewBox="0 0 600 358" role="img" aria-label="Side view of a pinhole camera projection">
                <defs>
                  <linearGradient id="sensorGlow" x1="0" x2="1"><stop offset="0" stopColor="#0d2a32" /><stop offset="1" stopColor="#123e4c" /></linearGradient>
                  <marker id="arrowHead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#819197" /></marker>
                  <marker id="axisArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#647b98" /></marker>
                  <clipPath id="sideSensorClip"><rect x={diagram.sensorX - 12} y={diagram.sensorTop} width="24" height={diagram.sensorHalf * 2} /></clipPath>
                </defs>
                <line x1="35" x2="590" y1="176" y2="176" className="axis-line" /><text x="41" y="167" className="axis-label">optical axis</text>
                <line x1={diagram.objectX} y1={diagram.objectTop} x2={diagram.sensorX} y2={diagram.imageBottom} className={`projection-ray ray-top ${diagram.imageBottom > diagram.sensorBottom || diagram.imageBottom < diagram.sensorTop ? "ray-misses-sensor" : ""}`} />
                <line x1={diagram.objectX} y1={diagram.objectBottom} x2={diagram.sensorX} y2={diagram.imageTop} className={`projection-ray ray-bottom ${diagram.imageTop < diagram.sensorTop || diagram.imageTop > diagram.sensorBottom ? "ray-misses-sensor" : ""}`} />
                <path d={`M ${diagram.sceneBoundaryX} ${diagram.fovSceneTop} L ${diagram.pinholeX} 176 L ${diagram.sensorX} ${diagram.sensorBottom}`} className="fov-boundary" /><path d={`M ${diagram.sceneBoundaryX} ${diagram.fovSceneBottom} L ${diagram.pinholeX} 176 L ${diagram.sensorX} ${diagram.sensorTop}`} className="fov-boundary" />
                <rect x={diagram.objectX - 8} y={diagram.objectTop} width="16" height={diagram.objectBottom - diagram.objectTop} rx="2" className="object-shape" /><line x1={diagram.objectX - 16} x2={diagram.objectX + 16} y1={diagram.objectTop} y2={diagram.objectTop} className="object-cap" />
                <text x={diagram.objectX - 28} y={diagram.objectTop - 29} className="svg-label object-label">object</text><text x={diagram.objectX - 28} y={diagram.objectTop - 17} className="svg-muted">H = {objectHeight.toFixed(0)} mm</text><text x={diagram.objectX - 18} y={diagram.objectBottom + 14} className="svg-muted">Z &gt; 0</text>
                <circle cx={diagram.pinholeX} cy="176" r="7" className="pinhole-outer" /><circle cx={diagram.pinholeX} cy="176" r="2.7" className="pinhole-core" /><text x={diagram.pinholeX - 27} y="214" className="svg-label">pinhole</text>
                <rect x={diagram.sensorX - 6} y={diagram.sensorTop} width="12" height={diagram.sensorHalf * 2} rx="2" fill="url(#sensorGlow)" stroke="#56d7e8" strokeWidth="1.5" /><line x1={diagram.sensorX - 3} x2={diagram.sensorX + 3} y1={diagram.imageTop} y2={diagram.imageTop} className="image-mark" clipPath="url(#sideSensorClip)" /><line x1={diagram.sensorX - 10} x2={diagram.sensorX + 10} y1={diagram.imageBottom} y2={diagram.imageBottom} className="image-mark image-cap" clipPath="url(#sideSensorClip)" /><line x1={diagram.sensorX} x2={diagram.sensorX} y1={diagram.imageTop} y2={diagram.imageBottom} className="recorded-side-image" clipPath="url(#sideSensorClip)" />
                <text x={diagram.sensorX - 29} y={Math.max(22, diagram.sensorTop - 15)} className="svg-label sensor-label">sensor</text><text x={diagram.sensorX - 39} y={Math.max(36, diagram.sensorTop - 2)} className="svg-muted">hₛ = {sensorHeight.toFixed(1)} mm</text><text x={diagram.sensorX - 16} y={Math.min(342, diagram.sensorBottom + 16)} className="svg-muted">z = −f</text>
                <line x1={diagram.pinholeX - 5} x2={diagram.pinholeX - 56} y1="137" y2="137" className="coordinate-axis" markerEnd="url(#axisArrow)" /><text x={diagram.pinholeX - 72} y="141" className="axis-label">+z</text><line x1={diagram.pinholeX} x2={diagram.pinholeX} y1="156" y2="119" className="coordinate-axis" markerEnd="url(#axisArrow)" /><text x={diagram.pinholeX + 7} y="124" className="axis-label">+y</text>
                <line x1={diagram.pinholeX + 3} x2={diagram.sensorX - 9} y1="309" y2="309" className="dimension-line" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" /><line x1={diagram.pinholeX} x2={diagram.pinholeX} y1="294" y2="319" className="extension-line" /><line x1={diagram.sensorX} x2={diagram.sensorX} y1="270" y2="319" className="extension-line" /><text x={(diagram.pinholeX + diagram.sensorX) / 2 - 26} y="298" className="svg-dimension">f = {focalLength.toFixed(1)} mm</text>
                <line x1={diagram.objectX + 9} x2={diagram.pinholeX - 10} y1="329" y2="329" className="dimension-line" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" /><line x1={diagram.objectX} x2={diagram.objectX} y1={diagram.objectBottom + 8} y2="338" className="extension-line" /><text x={(diagram.objectX + diagram.pinholeX) / 2 - 34} y="348" className="svg-dimension">Z = {objectDistance.toFixed(0)} mm</text>
                <AngleArc centerX={diagram.pinholeX} radius={38} upperAngle={diagram.upperFovHalfAngle} lowerAngle={diagram.lowerFovHalfAngle} label={`vFoV ${camera.vFov.toFixed(1)}°`} />
                </svg>
              </div>
              <PinholeScene3D
                focalLength={focalLength}
                sensorWidth={sensorWidth}
                sensorHeight={sensorHeight}
                objectDistance={objectDistance}
                objectHeight={objectHeight}
                cx={cx}
                cy={cy}
              />
            </div>
            <div className="diagram-caption"><span className="legend-item"><i className="legend-line cyan" />projection rays: object endpoints ↔ camera centre</span><span className="legend-item"><i className="legend-line dashed" />FoV boundary rays: sensor edges ↔ camera centre</span></div>
            <p className="diagram-note"><strong>Coordinate convention:</strong> Y points up and scene points have <em>Z &gt; 0</em>; the physical sensor is at <em>z = −f</em>. This view displays vFoV. Solid endpoint rays hit the sensor; dashed endpoint rays miss it. <strong>Dual display scale:</strong> each side uses its own uniform scale, preserving straight rays and <em>|h′|/f = H/Z</em>. The on-screen image/object height ratio is not the physical magnification.</p>
          </article>

          <div className="bottom-workspace-grid">
            <article className="diagram-card sensor-card">
              <div className="card-heading"><div><p className="diagram-label">PHYSICAL SENSOR</p><h3>Recorded image</h3></div><span className="view-tag">xₛ–yₛ plane</span></div>
              <svg className="sensor-diagram" viewBox="0 0 394 260" role="img" aria-label="Projection on the sensor plane">
                <defs><pattern id="fineGrid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="#253b45" strokeWidth="0.6" opacity="0.65" /></pattern><clipPath id="sensorClip"><rect x={sensorProjection.left} y={sensorProjection.top} width={sensorProjection.w} height={sensorProjection.h} rx="4" /></clipPath></defs>
                <rect x={sensorProjection.left} y={sensorProjection.top} width={sensorProjection.w} height={sensorProjection.h} rx="4" fill="url(#fineGrid)" className="sensor-frame" /><line x1={sensorProjection.left} x2={sensorProjection.left + sensorProjection.w} y1="112" y2="112" className="sensor-axis" /><line x1="197" x2="197" y1={sensorProjection.top} y2={sensorProjection.top + sensorProjection.h} className="sensor-axis" />
                <line x1={sensorProjection.centerX} x2={sensorProjection.centerX} y1={sensorProjection.top} y2={sensorProjection.top + sensorProjection.h} className="principal-axis" /><line x1={sensorProjection.left} x2={sensorProjection.left + sensorProjection.w} y1={sensorProjection.centerY} y2={sensorProjection.centerY} className="principal-axis" />
                <rect x={sensorProjection.centerX - 8} y={sensorProjection.centerY - sensorProjection.projectedH / 2} width="16" height={sensorProjection.projectedH} rx="2" className="projected-object" clipPath="url(#sensorClip)" /><line x1={sensorProjection.centerX - 14} x2={sensorProjection.centerX + 14} y1={sensorProjection.centerY + sensorProjection.projectedH / 2} y2={sensorProjection.centerY + sensorProjection.projectedH / 2} className="projected-cap" clipPath="url(#sensorClip)" /><circle cx={sensorProjection.centerX} cy={sensorProjection.centerY} r="4" className="principal-point" /><text x={sensorProjection.centerX + 8} y={sensorProjection.centerY - 9} className="sensor-label-text">principal point</text>
                <text x={sensorProjection.left - 12} y={sensorProjection.top + sensorProjection.h + 17} className="sensor-axis-label">−wₛ/2</text><text x={sensorProjection.left + sensorProjection.w - 19} y={sensorProjection.top + sensorProjection.h + 17} className="sensor-axis-label">+wₛ/2</text><text x={Math.max(3, sensorProjection.left - 37)} y={sensorProjection.top + 11} className="sensor-axis-label">+hₛ/2</text><text x={Math.max(3, sensorProjection.left - 34)} y={sensorProjection.top + sensorProjection.h - 2} className="sensor-axis-label">−hₛ/2</text><text x={sensorProjection.left + sensorProjection.w + 5} y="107" className="sensor-axis-label">xₛ</text><text x="204" y={Math.max(12, sensorProjection.top - 5)} className="sensor-axis-label">yₛ</text>
              </svg>
              <p className="sensor-coordinate-note">The geometric centre is (0, 0), with xₛ right and yₛ up. The orange crosshair is the principal point (cₓ, cᵧ). A point on the optical axis projects here. Only the part inside the frame is recorded.</p>
              <p className={camera.isCropped ? "crop-status cropped" : "crop-status"} role="status">{camera.isCropped ? "Part of the projection is outside the sensor." : "The full segment fits on the sensor."}</p>
              <div className="sensor-readout-row"><div><span>Full projected height</span><strong>{camera.imageHeight.toFixed(2)} mm</strong></div><div><span>Recorded height</span><strong>{camera.recordedHeight.toFixed(2)} mm</strong></div><div><span>Full height / sensor</span><strong>{camera.projectionPercentage.toFixed(1)}%</strong></div></div>
            </article>

            <article className="formula-card">
              <div className="card-heading"><div><p className="diagram-label">NUMERICAL READOUT</p><h3>The model</h3></div><span className="view-tag warm">physical sensor convention</span></div>
              <div className="formula-block"><p className="formula-label">Field of view</p><p className="formula formula-small">θₕ = atan((wₛ/2+cₓ)/f)<br />+ atan((wₛ/2−cₓ)/f)</p><p className="formula-result">= {camera.hFov.toFixed(2)}° &nbsp; · &nbsp; θᵥ = {camera.vFov.toFixed(2)}°</p><p className="formula-explainer">For θᵥ, use hₛ and cᵧ. These terms use the distances from the principal point to each edge. With f and sensor size fixed, total FoV is largest at zero offset and decreases as the offset magnitude grows.</p></div>
              <div className="formula-block"><p className="formula-label">Physical sensor coordinates · mm</p><p className="formula">xₛ = cₓ − f · X / Z<br />yₛ = cᵧ − f · Y / Z</p><p className="formula-explainer">The origin is the sensor centre. Displacement from the principal point: Δyₚ = yₛ − cᵧ = −f · Y / Z.</p><p className="formula formula-secondary">|h′| = f · H / Z = {camera.imageHeight.toFixed(3)} mm</p><p className="formula-explainer">Full projected height of a vertical segment whose endpoints have the same depth Z. The principal-point offset cancels when their coordinates are subtracted.</p></div>
              <div className="matrix-readout">
                <p className="formula-label">Virtual-image intrinsic matrix <em>Kᵥ</em><span>Optional extension · 1200 × 800 reference samples</span></p>
                <div className="matrix"><div><span>{K[0][0].toFixed(1)}</span><span>0</span><span>{K[0][2].toFixed(1)}</span></div><div><span>0</span><span>{K[1][1].toFixed(1)}</span><span>{K[1][2].toFixed(1)}</span></div><div><span>0</span><span>0</span><span>1</span></div></div>
                <p className="formula formula-small">[uᵥ, vᵥ, 1]ᵀ = Kᵥ [X/Z, −Y/Z, 1]ᵀ</p>
                <p className="matrix-note">Kᵥ takes normalized camera coordinates. Here Y is up, so Ycv = −Y gives the downward pixel axis. The virtual sensor is the entire physical sensor, including its frame, reflected through the pinhole.</p>
                <details className="coordinate-details"><summary>Physical sensor → tutorial plane → pixels</summary>
                  <p><strong>1. Physical pixels.</strong> With sₓ = 1200/wₛ and sᵧ = 800/hₛ (px/mm), the centre-based sensor coordinates become:</p>
                  <p className="formula formula-small">uₚ = sₓ(xₛ + wₛ/2)<br />vₚ = sᵧ(hₛ/2 − yₛ)</p>
                  <p>This is scaling and translation with a vertical-axis flip; it does not multiply by focal length again. The physical principal point is ({(1200 - K[0][2]).toFixed(1)}, {(800 - K[1][2]).toFixed(1)}) px.</p>
                  <p><strong>2. Tutorial convention.</strong> On the forward plane z = +f, coordinates relative to its principal point are xᵥ = fX/Z and yᵥ = fY/Z. Their signs are opposite to the physical principal-relative displacements.</p>
                  <p><strong>3. Same sensor, virtual image.</strong> Reflecting the frame makes its centre-based principal offset (−cₓ, −cᵧ). Thus uᵥ = 1200 − uₚ and vᵥ = 800 − vₚ, with:</p>
                  <p className="formula formula-small">u₀ᵥ = 600 − sₓcₓ<br />v₀ᵥ = 400 + sᵧcᵧ<br />fₓ = f sₓ · fᵧ = f sᵧ</p>
                  <p>These are continuous image-edge coordinates, from (0, 0) at the top-left boundary to (1200, 800) at the bottom-right boundary. The reference sampling grid is fixed; changing sensor dimensions changes sample spacing, so fₓ and fᵧ need not match.</p>
                </details>
              </div>
            </article>
          </div>
        </section>
      </div>
      <QuestionsSection />
      <footer className="lab-footer">
        <span>Interactive course visualizer</span>
        <a
          href="https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs"
          target="_blank"
          rel="noreferrer"
        >
          If this site is unavailable, find all materials and local setup instructions on GitHub.
        </a>
        <span>All distances are in millimetres unless marked otherwise.</span>
      </footer>
    </main>
  );
}
