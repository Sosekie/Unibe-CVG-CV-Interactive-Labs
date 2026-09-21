"use client";

import { Canvas } from "@react-three/fiber";
import { Edges, Grid, Html, Line, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";

type PinholeScene3DProps = {
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
  objectDistance: number;
  objectHeight: number;
  cx: number;
  cy: number;
};

type Point3 = [number, number, number];

function CameraScene({
  focalLength,
  sensorWidth,
  sensorHeight,
  objectDistance,
  objectHeight,
  cx,
  cy,
}: PinholeScene3DProps) {
  const geometry = useMemo(() => {
    // A compact schematic scale keeps the millimetre-sized sensor and the
    // distant object readable together. Rays remain exactly collinear in 3D.
    const sensorZ = -focalLength / 30;
    const frameWidth = sensorWidth / 30;
    const frameHeight = sensorHeight / 30;
    const frameCenterX = -cx / 30;
    const frameCenterY = -cy / 30;
    const depth = objectDistance / 250;
    const height = objectHeight / 200;
    const projectedHeight = height * Math.abs(sensorZ) / depth;

    const objectTop: Point3 = [0, height / 2, depth];
    const objectBottom: Point3 = [0, -height / 2, depth];
    const imageTop: Point3 = [0, -projectedHeight / 2, sensorZ];
    const imageBottom: Point3 = [0, projectedHeight / 2, sensorZ];
    const corners: Point3[] = [
      [frameCenterX - frameWidth / 2, frameCenterY - frameHeight / 2, sensorZ],
      [frameCenterX + frameWidth / 2, frameCenterY - frameHeight / 2, sensorZ],
      [frameCenterX + frameWidth / 2, frameCenterY + frameHeight / 2, sensorZ],
      [frameCenterX - frameWidth / 2, frameCenterY + frameHeight / 2, sensorZ],
    ];

    return {
      sensorZ,
      frameWidth,
      frameHeight,
      frameCenterX,
      frameCenterY,
      depth,
      height,
      projectedHeight,
      objectTop,
      objectBottom,
      imageTop,
      imageBottom,
      corners,
    };
  }, [cx, cy, focalLength, objectDistance, objectHeight, sensorHeight, sensorWidth]);

  return (
    <>
      <color attach="background" args={["#f5f9fd"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.65} color="#77ccec" />

      <Grid
        position={[0, -1.08, 1.5]}
        args={[12, 12]}
        cellSize={0.35}
        cellThickness={0.45}
        cellColor="#cbd9e4"
        sectionSize={1.75}
        sectionThickness={0.8}
        sectionColor="#9fb6c8"
        fadeDistance={10}
        fadeStrength={1}
      />

      <Line points={[[-2.4, -0.9, 0], [4.8, -0.9, 0]]} color="#70879a" lineWidth={1} dashed dashSize={0.12} gapSize={0.08} />

      <group position={[geometry.frameCenterX, geometry.frameCenterY, geometry.sensorZ]}>
        <mesh>
          <boxGeometry args={[geometry.frameWidth, geometry.frameHeight, 0.065]} />
          <meshStandardMaterial color="#2c8eb8" emissive="#1c6e91" emissiveIntensity={0.12} metalness={0.18} roughness={0.38} transparent opacity={0.82} />
          <Edges color="#155d7d" linewidth={1.3} />
        </mesh>
        <mesh position={[0, 0, 0.038]}>
          <planeGeometry args={[geometry.frameWidth * 0.9, geometry.frameHeight * 0.88]} />
          <meshBasicMaterial color="#d8f5ff" transparent opacity={0.42} />
        </mesh>
        <Html position={[0, geometry.frameHeight / 2 + 0.2, 0]} center className="scene-label scene-label-sensor">
          sensor · z = −f
        </Html>
      </group>

      <mesh position={[0, 0, geometry.sensorZ + 0.075]}>
        <boxGeometry args={[0.075, Math.max(0.025, geometry.projectedHeight), 0.025]} />
        <meshBasicMaterial color="#d98735" />
      </mesh>
      <mesh position={[0, 0, geometry.sensorZ + 0.09]}>
        <sphereGeometry args={[0.038, 18, 12]} />
        <meshBasicMaterial color="#fffaf0" />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.105, 30, 20]} />
        <meshStandardMaterial color="#26475c" metalness={0.5} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <sphereGeometry args={[0.03, 20, 14]} />
        <meshBasicMaterial color="#f0a04b" />
      </mesh>
      <Html position={[0, 0.27, 0]} center className="scene-label scene-label-pinhole">
        pinhole O
      </Html>

      <group position={[0, 0, geometry.depth]}>
        <mesh>
          <boxGeometry args={[0.17, geometry.height, 0.17]} />
          <meshStandardMaterial color="#dc8a37" emissive="#bd6823" emissiveIntensity={0.12} roughness={0.36} />
          <Edges color="#99521c" linewidth={1.2} />
        </mesh>
        <mesh position={[0, geometry.height / 2, 0]}>
          <boxGeometry args={[0.48, 0.065, 0.065]} />
          <meshStandardMaterial color="#2c98c5" roughness={0.32} />
        </mesh>
        <Html position={[0, geometry.height / 2 + 0.23, 0]} center className="scene-label scene-label-object">
          object H · Z
        </Html>
      </group>

      <Line points={[geometry.objectTop, [0, 0, 0], geometry.imageBottom]} color="#2698c6" lineWidth={2} />
      <Line points={[geometry.objectBottom, [0, 0, 0], geometry.imageTop]} color="#d98735" lineWidth={2} />
      {geometry.corners.map((corner, index) => (
        <Line key={index} points={[corner, [0, 0, 0]]} color="#7f9ead" lineWidth={0.75} dashed dashSize={0.08} gapSize={0.055} transparent opacity={0.82} />
      ))}

      <Line points={[[0, 0, geometry.sensorZ], [0, 0, geometry.depth]]} color="#7e95a6" lineWidth={0.9} dashed dashSize={0.1} gapSize={0.07} />
      <Html position={[0.25, 0.12, geometry.depth * 0.52]} className="scene-axis-label">
        optical axis
      </Html>

      <OrbitControls makeDefault enablePan={false} minDistance={3.4} maxDistance={11} target={[0, 0, 1.2]} />
    </>
  );
}

export function PinholeScene3D(props: PinholeScene3DProps) {
  return (
    <div className="three-d-panel" aria-label="Interactive 3D pinhole camera model">
      <div className="three-d-panel-heading">
        <span>3D VIEW</span>
        <span>drag to rotate</span>
      </div>
      <Canvas camera={{ position: [4.5, 2.7, 6.25], fov: 43 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <CameraScene {...props} />
      </Canvas>
      <div className="three-d-scale-note">schematic display scale</div>
    </div>
  );
}
