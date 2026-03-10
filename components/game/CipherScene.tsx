"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CluePanel {
  id: number;
  from: string;
  to: string;
  position: [number, number, number];
  rotation: [number, number, number];
  isNeeded: boolean;
  floatSpeed: number;
  floatIntensity: number;
}

interface CipherSceneProps {
  panels: CluePanel[];
  onPanelClick: (cipherLetter: string, realLetter: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Floating Particles                                                 */
/* ------------------------------------------------------------------ */

function Particles({ count = 120 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 24,
      y: (Math.random() - 0.5) * 14,
      z: (Math.random() - 0.5) * 20 - 2,
      speed: 0.1 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.5,
        p.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.3,
        p.z
      );
      dummy.scale.setScalar(0.02 + Math.sin(t * 2 + p.offset) * 0.01);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#8B0000" transparent opacity={0.4} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Single Clue Panel                                                  */
/* ------------------------------------------------------------------ */

function ClueBox({
  panel,
  onClick,
}: {
  panel: CluePanel;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [flashing, setFlashing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const baseColor = panel.isNeeded ? "#8B0000" : "#1A1A1A";
  const flashColor = "#CC0000";
  const edgeColor = panel.isNeeded ? "#CC0000" : "#2A2A2A";

  const handleClick = () => {
    if (flashing) return;
    setFlashing(true);
    onClick();
    setTimeout(() => setFlashing(false), 600);
  };

  return (
    <Float
      speed={panel.floatSpeed}
      floatIntensity={panel.floatIntensity}
      rotationIntensity={0.15}
    >
      <group position={panel.position} rotation={panel.rotation}>
        {/* Panel body */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[2.2, 1.4, 0.15]} />
          <meshStandardMaterial
            color={flashing ? flashColor : hovered ? edgeColor : baseColor}
            emissive={flashing ? flashColor : panel.isNeeded ? "#8B0000" : "#0A0A0A"}
            emissiveIntensity={flashing ? 2 : panel.isNeeded ? 0.4 : 0.05}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>

        {/* Edge wireframe */}
        <mesh>
          <boxGeometry args={[2.22, 1.42, 0.16]} />
          <meshBasicMaterial
            color={edgeColor}
            wireframe
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Mapping text */}
        <Text
          position={[0, 0, 0.1]}
          fontSize={0.55}

          color={flashing ? "#FFFFFF" : panel.isNeeded ? "#CC0000" : "#555555"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {`${panel.from} → ${panel.to}`}
        </Text>

        {/* Subtle label */}
        <Text
          position={[0, -0.5, 0.1]}
          fontSize={0.15}
          color={panel.isNeeded ? "#CC000066" : "#2A2A2A"}
          anchorX="center"
          anchorY="middle"
        >
          {panel.isNeeded ? "INTEL" : "NOISE"}
        </Text>

        {/* Point light on needed panels */}
        {panel.isNeeded && (
          <pointLight
            position={[0, 0, 1]}
            color="#8B0000"
            intensity={flashing ? 8 : 1.5}
            distance={5}
            decay={2}
          />
        )}
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/*  Room Environment                                                   */
/* ------------------------------------------------------------------ */

function Room() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, -3]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0A0A0A" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 2, -10]} receiveShadow>
        <planeGeometry args={[30, 16]} />
        <meshStandardMaterial color="#0D0D0D" roughness={0.95} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7, -3]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#080808" roughness={1} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene Content (inside Canvas)                                      */
/* ------------------------------------------------------------------ */

function SceneContent({
  panels,
  onPanelClick,
}: {
  panels: CluePanel[];
  onPanelClick: (cipherLetter: string, realLetter: string) => void;
}) {
  return (
    <>
      {/* Camera controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.7}
        minAzimuthAngle={-Math.PI * 0.6}
        maxAzimuthAngle={Math.PI * 0.6}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
      />

      {/* Lighting */}
      <ambientLight intensity={0.15} color="#E8E8E8" />
      <directionalLight position={[5, 8, 3]} intensity={0.3} color="#E8E8E8" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#8B0000" distance={20} decay={2} />
      <pointLight position={[-6, 2, -3]} intensity={0.3} color="#CC0000" distance={12} decay={2} />
      <pointLight position={[6, 0, -5]} intensity={0.3} color="#8B0000" distance={12} decay={2} />

      {/* Fog */}
      <fog attach="fog" args={["#0A0A0A", 8, 22]} />

      {/* Room structure */}
      <Room />

      {/* Clue panels */}
      {panels.map((panel) => (
        <ClueBox
          key={panel.id}
          panel={panel}
          onClick={() => onPanelClick(panel.from, panel.to)}
        />
      ))}

      {/* Atmospheric particles */}
      <Particles count={100} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported Scene Wrapper                                             */
/* ------------------------------------------------------------------ */

export default function CipherScene({ panels, onPanelClick }: CipherSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1, 6], fov: 60 }}
      style={{ width: "100%", height: "100%", background: "#0A0A0A" }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent panels={panels} onPanelClick={onPanelClick} />
    </Canvas>
  );
}
