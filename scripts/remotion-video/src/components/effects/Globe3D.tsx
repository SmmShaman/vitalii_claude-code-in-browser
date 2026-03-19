/**
 * Globe3D — rotating wireframe globe with neon grid.
 * Uses @remotion/three + three.js for real 3D rendering.
 * Triggered by "globe", "world", "global", "earth" in sceneDescription.
 */
import React, { useRef, useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { clampBoth } from "../../design-system";

interface Globe3DProps {
  accentColor?: string;
  rotationSpeed?: number;
  showPulses?: boolean;
}

const GlobeScene: React.FC<{
  frame: number;
  fps: number;
  accentColor: string;
  rotationSpeed: number;
}> = ({ frame, fps, accentColor, rotationSpeed }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  // Rotation
  const t = frame / fps;
  const rotY = t * rotationSpeed * 0.5;
  const rotX = Math.sin(t * 0.3) * 0.15;

  // Scale in
  const scaleVal = interpolate(frame, [0, 20], [0.3, 1], clampBoth);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color={accentColor} />

      {/* Wireframe globe */}
      <mesh
        ref={meshRef}
        rotation={[rotX, rotY, 0]}
        scale={[scaleVal * 2.2, scaleVal * 2.2, scaleVal * 2.2]}
      >
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh
        rotation={[rotX, rotY, 0]}
        scale={[scaleVal * 2.15, scaleVal * 2.15, scaleVal * 2.15]}
      >
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Orbit ring */}
      <mesh
        rotation={[Math.PI / 2 + 0.3, 0, rotY * 0.7]}
        scale={[scaleVal * 2.8, scaleVal * 2.8, scaleVal * 2.8]}
      >
        <torusGeometry args={[1, 0.008, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* Pulse dots on globe surface */}
      {Array.from({ length: 8 }).map((_, i) => {
        const phi = (i / 8) * Math.PI * 2 + t * 0.5;
        const theta = Math.PI * 0.3 + (i % 3) * 0.7;
        const r = 1.01;
        const x = r * Math.sin(theta) * Math.cos(phi + rotY);
        const y = r * Math.cos(theta);
        const z = r * Math.sin(theta) * Math.sin(phi + rotY);
        const pulseScale = (Math.sin(t * 3 + i * 1.2) + 1) / 2;

        return (
          <mesh key={i} position={[x * scaleVal * 2.2, y * scaleVal * 2.2, z * scaleVal * 2.2]}>
            <sphereGeometry args={[0.04 + pulseScale * 0.03, 8, 8]} />
            <meshBasicMaterial color="white" transparent opacity={0.5 + pulseScale * 0.5} />
          </mesh>
        );
      })}
    </>
  );
};

export const Globe3D: React.FC<Globe3DProps> = ({
  accentColor = "#4ecdc4",
  rotationSpeed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], clampBoth);
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clampBoth);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeIn * fadeOut,
        pointerEvents: "none",
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <GlobeScene
          frame={frame}
          fps={fps}
          accentColor={accentColor}
          rotationSpeed={rotationSpeed}
        />
      </ThreeCanvas>
    </div>
  );
};
