"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

// Theme colors
const COLORS = {
  black: new THREE.Color("#0A0A0A"),
  grey: new THREE.Color("#1A1A1A"),
  red: new THREE.Color("#8B0000"),
  redLight: new THREE.Color("#CC0000"),
  white: new THREE.Color("#E8E8E8"),
  green: new THREE.Color("#00CC66"),
  dimButton: new THREE.Color("#222222"),
  metalDark: new THREE.Color("#2A2A2A"),
  metalLight: new THREE.Color("#3A3A3A"),
};

interface LockSceneProps {
  pattern: number[];
  buttonStates: Record<number, "idle" | "active" | "correct" | "wrong">;
  activeIndex: number;
  onButtonClick: (index: number) => void;
  vaultOpen: boolean;
  shaking: boolean;
  phase: "showing" | "hidden" | "result";
  playerClicks: number[];
}

/* ------------------------------------------------------------------ */
/* Vault Button                                                       */
/* ------------------------------------------------------------------ */
function VaultButton({
  index,
  position,
  state,
  onClick,
  phase,
  isClicked,
}: {
  index: number;
  position: [number, number, number];
  state: "idle" | "active" | "correct" | "wrong";
  onClick: () => void;
  phase: string;
  isClicked: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const targetColor = useMemo(() => {
    switch (state) {
      case "active":
        return COLORS.green.clone();
      case "correct":
        return COLORS.green.clone();
      case "wrong":
        return COLORS.redLight.clone();
      default:
        return COLORS.dimButton.clone();
    }
  }, [state]);

  const targetEmissive = useMemo(() => {
    switch (state) {
      case "active":
        return COLORS.green.clone().multiplyScalar(0.6);
      case "correct":
        return COLORS.green.clone().multiplyScalar(0.8);
      case "wrong":
        return COLORS.redLight.clone().multiplyScalar(0.8);
      default:
        if (hovered && phase === "hidden") return new THREE.Color("#444444");
        return new THREE.Color("#111111");
    }
  }, [state, hovered, phase]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    materialRef.current.color.lerp(targetColor, delta * 8);
    materialRef.current.emissive.lerp(targetEmissive, delta * 8);
    materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
      materialRef.current.emissiveIntensity,
      state === "active" || state === "correct" ? 1.5 : state === "wrong" ? 2.0 : 0.3,
      delta * 6
    );

    // Subtle pulse on active
    if (meshRef.current && state === "active") {
      const s = 1 + Math.sin(Date.now() * 0.01) * 0.05;
      meshRef.current.scale.setScalar(s);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 5);
    }
  });

  const interactive = phase === "hidden" && !isClicked;

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onClick();
      }}
      onPointerOver={() => {
        if (interactive) {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <boxGeometry args={[0.32, 0.32, 0.12]} />
      <meshStandardMaterial
        ref={materialRef}
        color={COLORS.dimButton}
        emissive={new THREE.Color("#111111")}
        emissiveIntensity={0.3}
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Vault Door Group (handles rotation + shake)                        */
/* ------------------------------------------------------------------ */
function VaultDoor({
  pattern,
  buttonStates,
  onButtonClick,
  vaultOpen,
  shaking,
  phase,
  playerClicks,
}: Omit<LockSceneProps, "activeIndex">) {
  const groupRef = useRef<THREE.Group>(null);
  const doorRotation = useRef(0);
  const shakeOffset = useRef(0);

  // Button grid positions — 4x4 centered on the door face
  const buttonPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const spacing = 0.45;
    const startX = -spacing * 1.5;
    const startY = spacing * 1.5;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        positions.push([startX + col * spacing, startY - row * spacing, 0.52]);
      }
    }
    return positions;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Vault open animation
    if (vaultOpen) {
      doorRotation.current = THREE.MathUtils.lerp(doorRotation.current, -Math.PI / 2, delta * 2);
    }

    // Shake animation
    if (shaking) {
      shakeOffset.current = Math.sin(Date.now() * 0.05) * 0.06;
    } else {
      shakeOffset.current = THREE.MathUtils.lerp(shakeOffset.current, 0, delta * 10);
    }

    groupRef.current.rotation.y = doorRotation.current;
    groupRef.current.position.x = shakeOffset.current;
  });

  return (
    <group ref={groupRef}>
      {/* Vault door body — thick cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 1, 64]} />
        <meshStandardMaterial
          color={COLORS.metalDark}
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* Door face plate rotated to face camera */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* Outer ring */}
        <mesh position={[0, 0, 0.01]}>
          <torusGeometry args={[1.5, 0.12, 16, 64]} />
          <meshStandardMaterial
            color={COLORS.metalLight}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Inner ring */}
        <mesh position={[0, 0, 0.02]}>
          <torusGeometry args={[1.1, 0.06, 16, 64]} />
          <meshStandardMaterial
            color={"#444444"}
            metalness={0.9}
            roughness={0.15}
            emissive={vaultOpen ? COLORS.green : COLORS.red}
            emissiveIntensity={vaultOpen ? 0.8 : 0.15}
          />
        </mesh>

        {/* Button grid */}
        {buttonPositions.map((pos, i) => (
          <VaultButton
            key={i}
            index={i}
            position={pos}
            state={buttonStates[i] || "idle"}
            onClick={() => onButtonClick(i)}
            phase={phase}
            isClicked={playerClicks.includes(i)}
          />
        ))}

        {/* Center hub */}
        <mesh position={[0, 0, 0.05]}>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 32]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.9}
            roughness={0.1}
            emissive={vaultOpen ? COLORS.green : COLORS.red}
            emissiveIntensity={vaultOpen ? 1.2 : 0.3}
          />
        </mesh>
      </group>

      {/* Handle bars */}
      <mesh position={[0.6, 0, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 16]} />
        <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.6, 0, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 16]} />
        <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Green flood light on success                                       */
/* ------------------------------------------------------------------ */
function SuccessLight({ active }: { active: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    if (!lightRef.current) return;
    const target = active ? 4 : 0;
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, target, delta * 3);
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 0, 3]}
      color={COLORS.green}
      intensity={0}
      distance={10}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Main exported scene                                                */
/* ------------------------------------------------------------------ */
export default function LockScene(props: LockSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 50 }}
      style={{ background: "#0A0A0A" }}
      gl={{ antialias: true, alpha: false }}
    >
      {/* Fog */}
      <fog attach="fog" args={["#0A0A0A", 5, 12]} />

      {/* Lighting */}
      <ambientLight intensity={0.15} color="#E8E8E8" />
      <spotLight
        position={[2, 3, 5]}
        angle={0.5}
        penumbra={0.8}
        intensity={1.5}
        color="#E8E8E8"
        castShadow
      />
      <spotLight
        position={[-2, -1, 4]}
        angle={0.4}
        penumbra={1}
        intensity={0.5}
        color="#8B0000"
      />
      <pointLight position={[0, 0, 3]} intensity={0.3} color="#CC0000" />

      {/* Success flood light */}
      <SuccessLight active={props.vaultOpen} />

      {/* Vault door */}
      <VaultDoor
        pattern={props.pattern}
        buttonStates={props.buttonStates}
        onButtonClick={props.onButtonClick}
        vaultOpen={props.vaultOpen}
        shaking={props.shaking}
        phase={props.phase}
        playerClicks={props.playerClicks}
      />

      {/* Wall behind vault */}
      <mesh position={[0, 0, -1.2]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#111111" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Floor */}
      <mesh position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#0D0D0D" roughness={0.95} metalness={0.05} />
      </mesh>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        minAzimuthAngle={-Math.PI / 8}
        maxAzimuthAngle={Math.PI / 8}
      />
    </Canvas>
  );
}
