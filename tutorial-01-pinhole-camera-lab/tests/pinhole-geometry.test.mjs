import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});
const geometry = await vite.ssrLoadModule("/lib/pinhole-geometry.ts");

after(async () => {
  await vite.close();
});

const baseline = {
  focalLength: 35,
  sensorWidth: 36,
  sensorHeight: 24,
  objectDistance: 900,
  objectHeight: 170,
  cx: 0,
  cy: 0,
};

test("FoV and focal length remain inverse-linked", () => {
  for (const focalLength of [14, 24, 35, 50, 85, 120]) {
    const camera = geometry.computeCameraModel({ ...baseline, focalLength });
    const recovered = geometry.focalLengthFromHorizontalFov(baseline.sensorWidth, camera.hFov, baseline.cx);
    assert.ok(Math.abs(recovered - focalLength) <= 0.05);
  }
});

test("increasing Z moves the object away and reduces its image", () => {
  const nearCamera = geometry.computeCameraModel({ ...baseline, objectDistance: 250 });
  const farCamera = geometry.computeCameraModel({ ...baseline, objectDistance: 3000 });
  const nearDiagram = geometry.computeSideDiagram({ ...baseline, objectDistance: 250 });
  const farDiagram = geometry.computeSideDiagram({ ...baseline, objectDistance: 3000 });

  assert.ok(farDiagram.objectX < nearDiagram.objectX);
  assert.ok(farCamera.imageHeight < nearCamera.imageHeight);
  assert.equal(farDiagram.objectTop, nearDiagram.objectTop);
  assert.equal(farDiagram.objectBottom, nearDiagram.objectBottom);
});

test("both projection rays stay collinear through the pinhole", () => {
  for (const focalLength of [14, 35, 120]) {
    for (const objectDistance of [250, 900, 3000]) {
      const d = geometry.computeSideDiagram({ ...baseline, focalLength, objectDistance });
      const yAtPinhole = (startY, endY) => {
        const t = (d.pinholeX - d.objectX) / (d.sensorX - d.objectX);
        return startY + t * (endY - startY);
      };

      assert.ok(Math.abs(yAtPinhole(d.objectTop, d.imageBottom) - d.opticalAxisY) < 1e-9);
      assert.ok(Math.abs(yAtPinhole(d.objectBottom, d.imageTop) - d.opticalAxisY) < 1e-9);
    }
  }
});

test("sensor height changes FoV boundaries but not fixed-point projection rays", () => {
  const shortDiagram = geometry.computeSideDiagram({ ...baseline, sensorHeight: 8 });
  const tallDiagram = geometry.computeSideDiagram({ ...baseline, sensorHeight: 36 });

  assert.notEqual(shortDiagram.sensorHalf, tallDiagram.sensorHalf);
  assert.equal(shortDiagram.objectTop, tallDiagram.objectTop);
  assert.equal(shortDiagram.objectBottom, tallDiagram.objectBottom);
  assert.equal(shortDiagram.imageTop, tallDiagram.imageTop);
  assert.equal(shortDiagram.imageBottom, tallDiagram.imageBottom);
  assert.notEqual(shortDiagram.fovSceneTop, tallDiagram.fovSceneTop);
  assert.notEqual(shortDiagram.fovSceneBottom, tallDiagram.fovSceneBottom);
});

test("FoV boundary rays continue straight through the pinhole into the scene", () => {
  const d = geometry.computeSideDiagram({ ...baseline, sensorHeight: 31, cy: 4 });
  const yAtPinhole = (sceneY, sensorY) => {
    const t = (d.pinholeX - d.sceneBoundaryX) / (d.sensorX - d.sceneBoundaryX);
    return sceneY + t * (sensorY - sceneY);
  };

  assert.ok(Math.abs(yAtPinhole(d.fovSceneTop, d.sensorBottom) - d.opticalAxisY) < 1e-9);
  assert.ok(Math.abs(yAtPinhole(d.fovSceneBottom, d.sensorTop) - d.opticalAxisY) < 1e-9);
});

test("the physical image plane uses the signed projection convention", () => {
  assert.equal(geometry.projectCoordinate(20, 35, 700), -1);
  assert.equal(geometry.projectCoordinate(-20, 35, 700), 1);
});

test("principal-point offsets stay on the sensor and create asymmetric FoV", () => {
  assert.equal(geometry.clampPrincipalOffset(20, 24), 12);
  assert.equal(geometry.clampPrincipalOffset(-20, 24), -12);
  const centred = geometry.computeCameraModel(baseline);
  const offset = geometry.computeCameraModel({ ...baseline, cx: 12, cy: 5 });
  assert.notEqual(offset.hFov, centred.hFov);
  assert.notEqual(offset.vFov, centred.vFov);
  const recovered = geometry.focalLengthFromHorizontalFov(baseline.sensorWidth, offset.hFov, 12);
  assert.ok(Math.abs(recovered - baseline.focalLength) <= 0.05);
});

test("sensor-plane image keeps exact scale and is cropped by the view", () => {
  const camera = geometry.computeCameraModel({
    ...baseline,
    focalLength: 120,
    objectDistance: 250,
    objectHeight: 300,
  });
  const projection = geometry.computeSensorProjection({
    sensorWidth: baseline.sensorWidth,
    sensorHeight: 8,
    imageHeight: camera.imageHeight,
    cx: 0,
    cy: 0,
  });

  assert.equal(projection.projectedH, camera.imageHeight * 6);
  assert.ok(projection.projectedH > projection.h);
});

test("the intrinsic matrix updates all dependent entries", () => {
  const camera = geometry.computeCameraModel(baseline);
  const K = geometry.intrinsicMatrix({
    fx: camera.fx,
    fy: camera.fy,
    sensorWidth: baseline.sensorWidth,
    sensorHeight: baseline.sensorHeight,
    cx: 3,
    cy: -2,
  });

  assert.equal(K[0][0], camera.fx);
  assert.equal(K[1][1], camera.fy);
  assert.equal(K[0][2], 500);
  assert.ok(Math.abs(K[1][2] - 333.3333333333333) < 1e-9);
});

test("principal bounds stay inside odd-tenth sensor sizes", () => {
  for (let tenths = 80; tenths <= 500; tenths++) {
    const size = tenths / 10;
    assert.ok(geometry.clampPrincipalOffset(99, size) <= size / 2);
    assert.ok(geometry.clampPrincipalOffset(-99, size) >= -size / 2);
  }
  assert.equal(geometry.principalOffsetLimit(12.3), 6.1);
});

test("cropping detects offset images below 100 percent and measures the recorded interval", () => {
  const partial = geometry.sensorCoverage(10, 24, 10);
  assert.equal(partial.isCropped, true);
  assert.equal(partial.recordedHeight, 7);
  assert.equal(geometry.sensorCoverage(10, 24, -10).recordedHeight, 7);
  assert.equal(geometry.sensorCoverage(24, 24, 0).isCropped, false);
  assert.equal(geometry.sensorCoverage(144, 8, 0).recordedHeight, 8);
  assert.equal(geometry.sensorCoverage(10, 24, 30).recordedHeight, 0);
});

test("physical positions and virtual K map the same ray and reflected sensor frame", () => {
  assert.deepEqual(geometry.projectToSensor(0, 100, 1000, 35, 3, 4), { x: 3, y: 0.5 });
  for (const [sensorWidth, sensorHeight] of [[36, 24], [50, 24], [12, 36]]) {
    for (const [cx, cy] of [[0, 0], [3, 4], [-5, -8]]) {
      const camera = geometry.computeCameraModel({ ...baseline, sensorWidth, sensorHeight, cx, cy });
      const K = geometry.intrinsicMatrix({ ...camera, sensorWidth, sensorHeight, cx, cy });
      for (const [x, y, z] of [[0, 0, 1000], [80, 100, 1000], [-50, -60, 400]]) {
        const physical = geometry.projectToSensor(x, y, z, 35, cx, cy);
        const pixel = geometry.sensorToPixels(physical.x, physical.y, sensorWidth, sensorHeight);
        const u = K[0][0] * x / z + K[0][2];
        const v = K[1][1] * -y / z + K[1][2];
        assert.ok(Math.abs(u - (1200 - pixel.u)) < 1e-9);
        assert.ok(Math.abs(v - (800 - pixel.v)) < 1e-9);
        const onPhysical = pixel.u >= 0 && pixel.u <= 1200 && pixel.v >= 0 && pixel.v <= 800;
        const onVirtual = u >= 0 && u <= 1200 && v >= 0 && v <= 800;
        assert.equal(onPhysical, onVirtual);
      }
    }
  }
});

test("both within-side screen ratios preserve similar triangles", () => {
  const d = geometry.computeSideDiagram(baseline);
  const imageRatio = (d.imageBottom - d.imageTop) / (d.sensorX - d.pinholeX);
  const objectRatio = (d.objectBottom - d.objectTop) / (d.pinholeX - d.objectX);
  assert.ok(Math.abs(imageRatio - objectRatio) < 1e-9);
  assert.ok(Math.abs(imageRatio - baseline.objectHeight / baseline.objectDistance) < 1e-9);
});
