'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, Move, Pause, Play, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RangeControl } from '@/components/range-control';
import { motionVectorLength } from '@/lib/diagram-geometry';
import { eventCrossings, eventLogChange } from '@/lib/optics';
import { clientPointToSvg } from '@/lib/svg-coordinates';

type Mode = 'sensor' | 'derivation';
type Polarity = 'positive' | 'negative';
type SensorEvent = {
  column: number;
  row: number;
  x: number;
  y: number;
  time: number;
  polarity: Polarity;
  multiplicity: number;
};

const sensorColumns = 18;
const sensorRows = 8;
const sceneDuration = 3;
const recentEventWindow = 0.11;

export function GradientsEventsLab() {
  const [mode, setMode] = useState<Mode>('sensor');
  const [gradientAngle, setGradientAngle] = useState(0);
  const [velocityAngle, setVelocityAngle] = useState(18);
  const [speed, setSpeed] = useState(96);
  const [gradientMagnitude, setGradientMagnitude] = useState(0.08);
  const [edgeContrast, setEdgeContrast] = useState(0.7);
  const [threshold, setThreshold] = useState(0.2);
  const [timeInterval, setTimeInterval] = useState(0.06);
  const [sceneTime, setSceneTime] = useState(1.55);
  const [playing, setPlaying] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState({ column: 8, row: 3 });
  const [dragging, setDragging] = useState(false);
  const eventSvg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setSceneTime((current) =>
        current + 0.03 > sceneDuration ? 0 : current + 0.03,
      );
    }, 30);
    return () => window.clearInterval(interval);
  }, [playing]);

  const angleDifference = ((velocityAngle - gradientAngle) * Math.PI) / 180;
  const normalSpeed = speed * Math.cos(angleDifference);
  const dotProduct = gradientMagnitude * speed * Math.cos(angleDifference);
  const deltaLogIntensity = eventLogChange(
    gradientMagnitude,
    gradientAngle,
    speed,
    velocityAngle,
    timeInterval,
  );
  const crossingData = eventCrossings(-dotProduct, threshold, timeInterval);
  const derivationPolarity =
    crossingData.total === 0
      ? 'none'
      : deltaLogIntensity > 0
        ? 'positive'
        : 'negative';
  const normalAngle = (gradientAngle * Math.PI) / 180;

  const sensorEvents = useMemo(() => {
    if (Math.abs(normalSpeed) < 1e-6 || edgeContrast < threshold)
      return [] as SensorEvent[];
    const nx = Math.cos(normalAngle);
    const ny = Math.sin(normalAngle);
    const startOffset = normalSpeed >= 0 ? -235 : 235;
    // The rendered edge has light pixels on its negative-normal side and dark
    // pixels on its positive-normal side. Moving along +normal therefore
    // changes a fixed pixel from dark to light (ON); reversing it gives OFF.
    const polarity: Polarity = normalSpeed >= 0 ? 'positive' : 'negative';
    const multiplicity = Math.floor((edgeContrast + 1e-9) / threshold);
    const events: SensorEvent[] = [];
    for (let row = 0; row < sensorRows; row += 1) {
      for (let column = 0; column < sensorColumns; column += 1) {
        const x = 58 + column * (704 / (sensorColumns - 1));
        const y = 46 + row * (236 / (sensorRows - 1));
        const projection = (x - 410) * nx + (y - 164) * ny;
        const time = (projection - startOffset) / normalSpeed;
        if (time >= 0 && time <= sceneDuration) {
          events.push({ column, row, x, y, time, polarity, multiplicity });
        }
      }
    }
    return events.sort((a, b) => a.time - b.time || a.row - b.row);
  }, [edgeContrast, normalAngle, normalSpeed, threshold]);

  const emittedEvents = sensorEvents.filter((event) => event.time <= sceneTime);
  const recentEvents = emittedEvents.filter(
    (event) => sceneTime - event.time <= recentEventWindow,
  );
  const selectedEvent = sensorEvents.find(
    (event) =>
      event.column === selectedPixel.column && event.row === selectedPixel.row,
  );
  const eventPackets = emittedEvents.slice(-6).reverse();
  const eventsPerCrossedPixel = Math.floor((edgeContrast + 1e-9) / threshold);
  const emittedEventCount = emittedEvents.length * eventsPerCrossedPixel;
  const startOffset = normalSpeed >= 0 ? -235 : 235;
  const edgeOffset = startOffset + normalSpeed * sceneTime;
  const edgeCenter = {
    x: 410 + Math.cos(normalAngle) * edgeOffset,
    y: 164 + Math.sin(normalAngle) * edgeOffset,
  };
  const previousTime = Math.max(0, sceneTime - 0.35);
  const previousOffset = startOffset + normalSpeed * previousTime;
  const previousEdgeCenter = {
    x: 410 + Math.cos(normalAngle) * previousOffset,
    y: 164 + Math.sin(normalAngle) * previousOffset,
  };
  const motionArrowOrigin = {
    x: Math.max(90, Math.min(730, edgeCenter.x)),
    y: Math.max(70, Math.min(250, edgeCenter.y)),
  };
  const velocityOrigin = { x: 410, y: 180 };
  const velocityLength = motionVectorLength(speed);
  const velocityEnd = {
    x:
      velocityOrigin.x +
      Math.cos((velocityAngle * Math.PI) / 180) * velocityLength,
    y:
      velocityOrigin.y +
      Math.sin((velocityAngle * Math.PI) / 180) * velocityLength,
  };
  const gradientEnd = {
    x: velocityOrigin.x + Math.cos(normalAngle) * 86,
    y: velocityOrigin.y + Math.sin(normalAngle) * 86,
  };

  const updateVelocityFromPointer = (
    event: React.PointerEvent<SVGSVGElement>,
  ) => {
    if (!dragging || !eventSvg.current) return;
    const point = clientPointToSvg(
      eventSvg.current,
      event.clientX,
      event.clientY,
    );
    if (!point) return;
    const dx = point.x - velocityOrigin.x;
    const dy = point.y - velocityOrigin.y;
    if (Math.hypot(dx, dy) > 1)
      setVelocityAngle((Math.atan2(dy, dx) * 180) / Math.PI);
    setSpeed(Math.max(0, Math.min(120, Math.hypot(dx, dy) / 0.8)));
  };

  const resetPlayback = () => {
    setPlaying(false);
    setSceneTime(0);
  };

  return (
    <section className="lab-module" aria-labelledby="events-title">
      <div className="module-heading">
        <div>
          <p className="section-kicker">EVENT-BASED CAMERAS</p>
          <h2 id="events-title">
            From brightness changes to asynchronous events
          </h2>
          <p>
            Each pixel operates independently. It emits a timestamped ON or OFF
            event only when its change in log intensity reaches the contrast
            threshold.
          </p>
        </div>
        <div
          className="mode-buttons"
          role="tablist"
          aria-label="Event camera lab mode"
        >
          <Button
            variant={mode === 'sensor' ? 'default' : 'outline'}
            onClick={() => setMode('sensor')}
          >
            <Cpu size={15} /> Sensor &amp; event stream
          </Button>
          <Button
            variant={mode === 'derivation' ? 'default' : 'outline'}
            onClick={() => setMode('derivation')}
          >
            <Zap size={15} /> Why moving edges?
          </Button>
        </div>
      </div>

      {mode === 'sensor' ? (
        <>
          <div
            className="event-principle-strip"
            aria-label="Event camera processing steps"
          >
            <article>
              <span>1</span>
              <div>
                <strong>Measure log intensity</strong>
                <small>Every pixel monitors L = log I continuously.</small>
              </div>
            </article>
            <article>
              <span>2</span>
              <div>
                <strong>Compare with its own reference</strong>
                <small>
                  The reference is the level stored after the last event.
                </small>
              </div>
            </article>
            <article>
              <span>3</span>
              <div>
                <strong>Emit an event and update</strong>
                <small>
                  When |L − L<sub>ref</sub>| ≥ C, output e<sub>k</sub> = (x, y,
                  t, p).
                </small>
              </div>
            </article>
          </div>

          <div className="lab-layout event-layout">
            <aside className="control-panel glass-panel">
              <RangeControl
                label="edge normal"
                symbol="∠∇L"
                help="The direction of the strongest increase in log intensity, perpendicular to the edge. Only motion along this normal sweeps the edge across pixels."
                value={gradientAngle}
                min={-75}
                max={75}
                step={1}
                unit="°"
                onChange={(value) => {
                  setGradientAngle(value);
                  resetPlayback();
                }}
              />
              <RangeControl
                label="motion direction"
                symbol="∠v"
                help="The direction in which the brightness pattern moves. Events are strongest when v is parallel to ∇L, vanish when v is tangent to the edge, and reverse polarity when v points the other way."
                value={velocityAngle}
                min={-180}
                max={180}
                step={1}
                unit="°"
                onChange={(value) => {
                  setVelocityAngle(value);
                  resetPlayback();
                }}
              />
              <RangeControl
                label="motion speed"
                symbol="|v|"
                help="How fast the edge moves. Faster motion along the edge normal makes pixels reach the contrast threshold sooner; zero speed produces no events."
                value={speed}
                min={0}
                max={120}
                step={1}
                unit="px/s"
                onChange={(value) => {
                  setSpeed(value);
                  resetPlayback();
                }}
              />
              <RangeControl
                label="edge contrast"
                symbol="|ΔLedge|"
                help="The total log-intensity jump from the dark side to the bright side. A larger jump can trigger more events at every pixel crossed by the edge."
                value={edgeContrast}
                min={0.1}
                max={1.2}
                step={0.05}
                unit="log"
                onChange={(value) => {
                  setEdgeContrast(value);
                  resetPlayback();
                }}
              />
              <RangeControl
                label="contrast threshold"
                symbol="C"
                help="The accumulated log-intensity change required for one event. Lower C makes the sensor more sensitive and produces more events; higher C produces fewer."
                value={threshold}
                min={0.05}
                max={0.5}
                step={0.05}
                unit="log"
                onChange={(value) => {
                  setThreshold(value);
                  resetPlayback();
                }}
              />
              <RangeControl
                label="playback time"
                symbol="t"
                help="The instant currently shown in the simulation. Move it to inspect which pixels have already fired; it changes the playback state, not the camera itself."
                value={sceneTime}
                min={0}
                max={sceneDuration}
                step={0.01}
                unit="s"
                onChange={(value) => {
                  setPlaying(false);
                  setSceneTime(value);
                }}
              />
              <div className="event-playback-buttons">
                <Button onClick={() => setPlaying((current) => !current)}>
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                  {playing ? 'Pause' : 'Play'}
                </Button>
                <Button variant="outline" onClick={resetPlayback}>
                  <RotateCcw size={15} /> Reset
                </Button>
              </div>
              <div className="state-card event-definition">
                <span>EVENT OUTPUT</span>
                <strong>
                  e<sub>k</sub> = (x<sub>k</sub>, y<sub>k</sub>, t<sub>k</sub>,
                  p<sub>k</sub>)
                </strong>
                <small>
                  Position, timestamp, and polarity. There is no global frame
                  clock and unchanged pixels send nothing.
                </small>
              </div>
            </aside>

            <div className="visual-panel glass-panel event-visual">
              <div className="diagram-toolbar">
                <span>
                  <Move size={15} /> click a pixel to inspect it
                </span>
                <span>
                  t = {sceneTime.toFixed(2)} s · {emittedEvents.length} crossed
                  pixels
                </span>
              </div>
              <svg
                className="event-sensor-diagram"
                viewBox="0 0 820 328"
                aria-label="Pixel array producing asynchronous events as an edge moves across it"
              >
                <defs>
                  <linearGradient id="sensor-edge-ramp">
                    <stop offset="0" stopColor="#20344a" />
                    <stop offset=".46" stopColor="#2e455d" />
                    <stop offset=".54" stopColor="#f1f5f8" />
                    <stop offset="1" stopColor="#fff" />
                  </linearGradient>
                  <marker
                    id="sensor-motion-arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="5"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0 0 L7 3.5 L0 7z" fill="#4e8ff1" />
                  </marker>
                </defs>
                <rect x="0" y="0" width="820" height="328" fill="#edf3f7" />
                <g
                  transform={
                    'translate(' +
                    edgeCenter.x +
                    ' ' +
                    edgeCenter.y +
                    ') rotate(' +
                    gradientAngle +
                    ')'
                  }
                >
                  <rect
                    x="0"
                    y="-900"
                    width="1200"
                    height="1800"
                    fill="#263b50"
                  />
                  <rect
                    x="-1200"
                    y="-900"
                    width="1200"
                    height="1800"
                    fill="#f7fbfe"
                  />
                  <rect
                    x="-14"
                    y="-900"
                    width="28"
                    height="1800"
                    fill="url(#sensor-edge-ramp)"
                  />
                </g>
                {sceneTime > 0 ? (
                  <g
                    transform={
                      'translate(' +
                      previousEdgeCenter.x +
                      ' ' +
                      previousEdgeCenter.y +
                      ') rotate(' +
                      gradientAngle +
                      ')'
                    }
                  >
                    <line
                      x1="0"
                      y1="-900"
                      x2="0"
                      y2="900"
                      className="edge-previous-line"
                    />
                  </g>
                ) : null}
                {Array.from(
                  { length: sensorRows * sensorColumns },
                  (_, index) => {
                    const row = Math.floor(index / sensorColumns);
                    const column = index % sensorColumns;
                    const x = 58 + column * (704 / (sensorColumns - 1));
                    const y = 46 + row * (236 / (sensorRows - 1));
                    const recent = recentEvents.find(
                      (event) => event.column === column && event.row === row,
                    );
                    const emitted = emittedEvents.find(
                      (event) => event.column === column && event.row === row,
                    );
                    const selected =
                      selectedPixel.column === column &&
                      selectedPixel.row === row;
                    return (
                      <g
                        key={index}
                        role="button"
                        aria-label={'pixel ' + column + ', ' + row}
                        onClick={() => setSelectedPixel({ column, row })}
                        className="sensor-pixel"
                      >
                        <circle cx={x} cy={y} r="5.2" className="pixel-ring" />
                        {emitted && !recent ? (
                          <circle
                            cx={x}
                            cy={y}
                            r="3.2"
                            className={
                              'pixel-event-history ' + emitted.polarity
                            }
                          />
                        ) : null}
                        {recent ? (
                          <circle
                            cx={x}
                            cy={y}
                            r="4.5"
                            className={'pixel-event ' + recent.polarity}
                          />
                        ) : null}
                        {selected ? (
                          <rect
                            x={x - 8}
                            y={y - 8}
                            width="16"
                            height="16"
                            className="pixel-selection"
                          />
                        ) : null}
                      </g>
                    );
                  },
                )}
                {speed > 0 ? (
                  <line
                    x1={motionArrowOrigin.x}
                    y1={motionArrowOrigin.y}
                    x2={
                      motionArrowOrigin.x +
                      Math.cos((velocityAngle * Math.PI) / 180) * 72
                    }
                    y2={
                      motionArrowOrigin.y +
                      Math.sin((velocityAngle * Math.PI) / 180) * 72
                    }
                    className="velocity-vector"
                    markerEnd="url(#sensor-motion-arrow)"
                  />
                ) : null}
                {speed > 0 ? (
                  <text
                    x={
                      motionArrowOrigin.x +
                      Math.cos((velocityAngle * Math.PI) / 180) * 80
                    }
                    y={
                      motionArrowOrigin.y +
                      Math.sin((velocityAngle * Math.PI) / 180) * 80 +
                      5
                    }
                    className="vector-label velocity-label"
                  >
                    image-pattern velocity v
                  </text>
                ) : null}
                <text x="24" y="312" className="svg-label">
                  blue = OFF event
                </text>
                <text x="157" y="312" className="svg-label event-on-label">
                  orange = ON event
                </text>
                <text
                  x="303"
                  y="312"
                  className="svg-label pixel-selected-label"
                >
                  yellow square = selected pixel
                </text>
              </svg>
              <div className="event-metrics four-up">
                <article>
                  <span>Normal motion</span>
                  <strong>
                    ∇L direction · v = {normalSpeed.toFixed(1)} px/s
                  </strong>
                </article>
                <article>
                  <span>Events per crossed pixel</span>
                  <strong>⌊|ΔLedge| / C⌋ = {eventsPerCrossedPixel}</strong>
                </article>
                <article>
                  <span>Total events by time t</span>
                  <strong>
                    {emittedEvents.length} pixels × {eventsPerCrossedPixel} ={' '}
                    {emittedEventCount}
                  </strong>
                </article>
                <article
                  className={
                    'event-status ' +
                    (normalSpeed >= 0 ? 'positive' : 'negative')
                  }
                >
                  <span>Polarity</span>
                  <strong>
                    {Math.abs(normalSpeed) < 1e-6 || edgeContrast < threshold
                      ? 'no events'
                      : normalSpeed >= 0
                        ? 'ON · brightening'
                        : 'OFF · darkening'}
                  </strong>
                </article>
              </div>
            </div>
          </div>

          <div className="event-detail-grid">
            <article className="glass-panel pixel-memory-card">
              <div className="detail-heading">
                <div>
                  <span>ONE PIXEL REMEMBERS ITS LAST EVENT LEVEL</span>
                  <strong>
                    Pixel ({selectedPixel.column}, {selectedPixel.row})
                  </strong>
                </div>
                <small>
                  {selectedEvent
                    ? 'edge arrival t = ' + selectedEvent.time.toFixed(3) + ' s'
                    : 'the moving edge does not reach this pixel'}
                </small>
              </div>
              <svg
                viewBox="0 0 720 210"
                aria-label="Selected pixel log intensity and event threshold crossings"
              >
                <line
                  x1="54"
                  y1="170"
                  x2="684"
                  y2="170"
                  className="timeline-axis"
                />
                <line
                  x1="54"
                  y1="42"
                  x2="54"
                  y2="170"
                  className="timeline-axis"
                />
                <text x="18" y="38" className="svg-label">
                  L
                </text>
                <text x="684" y="194" className="svg-label">
                  t
                </text>
                <line
                  x1="54"
                  y1="70"
                  x2="684"
                  y2="70"
                  className="event-threshold-guide"
                />
                <line
                  x1="54"
                  y1="145"
                  x2="684"
                  y2="145"
                  className="event-threshold-guide"
                />
                <text x="60" y="64" className="svg-label">
                  Lref + C
                </text>
                <text x="60" y="160" className="svg-label">
                  Lref − C
                </text>
                {selectedEvent ? (
                  <>
                    <path
                      d={
                        'M54 ' +
                        (selectedEvent.polarity === 'positive' ? 145 : 70) +
                        ' L' +
                        (54 + (selectedEvent.time / sceneDuration) * 630) +
                        ' ' +
                        (selectedEvent.polarity === 'positive' ? 145 : 70) +
                        ' L' +
                        (54 + (selectedEvent.time / sceneDuration) * 630) +
                        ' ' +
                        (selectedEvent.polarity === 'positive' ? 60 : 155) +
                        ' L684 ' +
                        (selectedEvent.polarity === 'positive' ? 60 : 155)
                      }
                      className="pixel-log-signal"
                    />
                    <line
                      x1={54 + (selectedEvent.time / sceneDuration) * 630}
                      y1="30"
                      x2={54 + (selectedEvent.time / sceneDuration) * 630}
                      y2="175"
                      className={'event-stem ' + selectedEvent.polarity}
                    />
                    {Array.from(
                      { length: selectedEvent.multiplicity },
                      (_, index) => (
                        <circle
                          key={index}
                          cx={
                            54 +
                            (selectedEvent.time / sceneDuration) * 630 +
                            index * 8
                          }
                          cy={selectedEvent.polarity === 'positive' ? 42 : 174}
                          r="4"
                          className={'event-dot ' + selectedEvent.polarity}
                        />
                      ),
                    )}
                  </>
                ) : (
                  <line
                    x1="54"
                    y1="107"
                    x2="684"
                    y2="107"
                    className="pixel-log-signal"
                  />
                )}
                <line
                  x1={54 + (sceneTime / sceneDuration) * 630}
                  y1="26"
                  x2={54 + (sceneTime / sceneDuration) * 630}
                  y2="177"
                  className="current-time-line"
                />
              </svg>
              <p>
                After every threshold crossing the pixel updates L<sub>ref</sub>
                . A large contrast step can therefore produce several events,
                while a static pixel produces none.
              </p>
            </article>

            <article className="glass-panel event-packet-card">
              <div className="detail-heading">
                <div>
                  <span>ASYNCHRONOUS OUTPUT</span>
                  <strong>Latest event packets</strong>
                </div>
                <small>No image frame is transmitted</small>
              </div>
              <div className="event-packet-header">
                <span>x</span>
                <span>y</span>
                <span>timestamp</span>
                <span>polarity</span>
              </div>
              <div className="event-packet-list">
                {eventPackets.length ? (
                  eventPackets.map((event, index) => (
                    <div key={event.column + '-' + event.row + '-' + index}>
                      <code>{event.column}</code>
                      <code>{event.row}</code>
                      <code>{event.time.toFixed(4)} s</code>
                      <b className={event.polarity}>
                        {event.polarity === 'positive' ? '+1 · ON' : '−1 · OFF'}
                      </b>
                    </div>
                  ))
                ) : (
                  <p>
                    Play the scene or move the time slider. Events appear only
                    when pixels cross the threshold.
                  </p>
                )}
              </div>
            </article>
          </div>

          <div className="event-takeaway glass-panel">
            <strong>What to notice</strong>
            <p>
              Stop the motion and the stream becomes silent. Rotate v until it
              is tangent to the edge and the normal speed approaches zero, so
              the edge no longer sweeps across pixels. Lower C and each crossed
              pixel emits more events. The output is sparse in space and time
              because unchanged pixels send nothing.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="lab-layout event-layout">
            <aside className="control-panel glass-panel">
              <RangeControl
                label="gradient direction"
                symbol="∠∇L"
                help="The direction of the strongest increase in log intensity, perpendicular to the edge. It sets which component of motion changes a pixel's brightness."
                value={gradientAngle}
                min={-90}
                max={90}
                step={1}
                unit="°"
                onChange={setGradientAngle}
              />
              <RangeControl
                label="motion direction"
                symbol="∠v"
                help="The direction in which the brightness pattern moves. The relative angle between v and ∇L controls the dot product ∇Lᵀv: parallel is strongest, perpendicular is zero, and opposite reverses polarity."
                value={velocityAngle}
                min={-180}
                max={180}
                step={1}
                unit="°"
                onChange={setVelocityAngle}
              />
              <RangeControl
                label="motion speed"
                symbol="|v|"
                help="How fast the image pattern moves. Greater speed increases |∇Lᵀv| and accumulates contrast change faster; zero speed gives no change and no events."
                value={speed}
                min={0}
                max={120}
                step={1}
                unit="px/s"
                onChange={setSpeed}
              />
              <RangeControl
                label="log-gradient magnitude"
                symbol="|∇L|"
                help="How rapidly log intensity changes across space. A steeper brightness transition increases |∇Lᵀv| and makes threshold crossings more likely."
                value={gradientMagnitude}
                min={0.01}
                max={0.15}
                step={0.01}
                unit="/px"
                onChange={setGradientMagnitude}
              />
              <RangeControl
                label="time interval"
                symbol="Δt"
                help="The time window in ΔL ≈ −∇LᵀvΔt. A longer interval accumulates more log-intensity change under the constant-motion approximation."
                value={timeInterval}
                min={0.01}
                max={0.12}
                step={0.01}
                unit="s"
                onChange={setTimeInterval}
              />
              <RangeControl
                label="contrast threshold"
                symbol="C"
                help="The log-intensity change required for each ON or OFF event. Lower thresholds produce more events; higher thresholds require a larger change."
                value={threshold}
                min={0.05}
                max={0.5}
                step={0.05}
                unit="log"
                onChange={setThreshold}
              />
            </aside>
            <div className="visual-panel glass-panel event-visual">
              <div className="diagram-toolbar">
                <span>
                  <Move size={15} /> drag the blue velocity handle
                </span>
                <span>fixed-pixel first-order model</span>
              </div>
              <svg
                ref={eventSvg}
                className="event-diagram"
                viewBox="0 0 820 360"
                aria-label="Brightness edge with gradient and velocity vectors"
                onPointerMove={updateVelocityFromPointer}
                onPointerUp={() => setDragging(false)}
                onPointerLeave={() => setDragging(false)}
              >
                <defs>
                  <linearGradient id="edge-ramp">
                    <stop offset="0" stopColor="#20344a" />
                    <stop offset=".47" stopColor="#2e455d" />
                    <stop offset=".53" stopColor="#f1f5f8" />
                    <stop offset="1" stopColor="#fff" />
                  </linearGradient>
                  <marker
                    id="green-arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="5"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0 0 L7 3.5 L0 7z" fill="#2a94c2" />
                  </marker>
                  <marker
                    id="blue-arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="5"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0 0 L7 3.5 L0 7z" fill="#4e8ff1" />
                  </marker>
                </defs>
                <rect x="0" y="0" width="820" height="360" fill="#e9f0f5" />
                <g
                  transform={'translate(410 180) rotate(' + gradientAngle + ')'}
                >
                  <rect
                    x="-900"
                    y="-900"
                    width="1800"
                    height="1800"
                    fill="url(#edge-ramp)"
                  />
                </g>
                <circle
                  cx={velocityOrigin.x}
                  cy={velocityOrigin.y}
                  r="6"
                  fill="#fff"
                  stroke="#20344a"
                  strokeWidth="2"
                />
                <line
                  x1={velocityOrigin.x}
                  y1={velocityOrigin.y}
                  x2={gradientEnd.x}
                  y2={gradientEnd.y}
                  className="gradient-vector"
                  markerEnd="url(#green-arrow)"
                />
                <text
                  x={gradientEnd.x + 8}
                  y={gradientEnd.y - 7}
                  className="vector-label gradient-label"
                >
                  ∇L
                </text>
                {speed > 0 ? (
                  <line
                    x1={velocityOrigin.x}
                    y1={velocityOrigin.y}
                    x2={velocityEnd.x}
                    y2={velocityEnd.y}
                    className="velocity-vector"
                    markerEnd="url(#blue-arrow)"
                  />
                ) : null}
                <circle
                  cx={velocityEnd.x}
                  cy={velocityEnd.y}
                  r="12"
                  className="velocity-handle"
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(true);
                  }}
                />
                <text
                  x={velocityEnd.x + 10}
                  y={velocityEnd.y + 22}
                  className="vector-label velocity-label"
                >
                  {speed > 0 ? 'v' : 'v = 0'}
                </text>
              </svg>
              <div className="event-metrics">
                <article>
                  <span>Directional derivative</span>
                  <strong>∇Lᵀv = {dotProduct.toFixed(3)} s⁻¹</strong>
                </article>
                <article>
                  <span>Predicted change</span>
                  <strong>ΔL ≈ {deltaLogIntensity.toFixed(3)}</strong>
                </article>
                <article className={'event-status ' + derivationPolarity}>
                  <span>Event output</span>
                  <strong>
                    {crossingData.total
                      ? crossingData.total + ' ' + derivationPolarity
                      : 'no event'}
                  </strong>
                </article>
              </div>
            </div>
          </div>

          <div className="event-derivation glass-panel">
            <div>
              <span>1 · BRIGHTNESS CONSTANCY ALONG MOTION</span>
              <strong>
                dL/dt = ∇Lᵀv + L<sub>t</sub> = 0
              </strong>
            </div>
            <div>
              <span>2 · FIXED PIXEL CHANGE</span>
              <strong>
                ΔL ≈ L<sub>t</sub>Δt = −∇Lᵀv Δt
              </strong>
            </div>
            <div>
              <span>3 · EVENT CONDITION</span>
              <strong>|ΔL| ≥ C, &nbsp; p = sign(ΔL)</strong>
            </div>
          </div>
          <div className="event-takeaway glass-panel">
            <strong>Why moving edges dominate</strong>
            <p>
              Uniform regions have ∇L ≈ 0. A strong edge also stays silent when
              its motion is tangent to the edge, because v is then perpendicular
              to ∇L and their dot product vanishes. Events become most likely
              when the motion has a large component along the gradient. This is
              the specific conclusion required by Tutorial 02.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
