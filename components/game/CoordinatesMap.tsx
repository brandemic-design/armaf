"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float, Line } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Hint {
  id: string;
  description: string;
  icon: string;
  correctCountry: string;
}

interface CoordinatesMapProps {
  hints: Hint[];
  countries: string[];
  onComplete: () => void;
}

interface MatchPair {
  hintId: string;
  country: string;
  correct: boolean;
}

/* ------------------------------------------------------------------ */
/*  Floating Particles                                                 */
/* ------------------------------------------------------------------ */

function Particles({ count = 100 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 16 - 3,
      speed: 0.1 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.4,
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
      <meshBasicMaterial color="#8B0000" transparent opacity={0.35} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Globe                                                              */
/* ------------------------------------------------------------------ */

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group>
      {/* Solid dark core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshStandardMaterial
          color="#111111"
          emissive="#1A1A1A"
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.6}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh rotation={[0.1, 0, 0.05]}>
        <sphereGeometry args={[1.82, 24, 24]} />
        <meshBasicMaterial color="#2A2A2A" wireframe transparent opacity={0.5} />
      </mesh>
      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.85, 0.01, 8, 64]} />
        <meshBasicMaterial color="#8B0000" transparent opacity={0.5} />
      </mesh>
      {/* Vertical ring */}
      <mesh>
        <torusGeometry args={[1.85, 0.01, 8, 64]} />
        <meshBasicMaterial color="#8B0000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Hint Panel (left side)                                             */
/* ------------------------------------------------------------------ */

function HintPanel({
  hint,
  index,
  isSelected,
  isMatched,
  matchCorrect,
  onClick,
  shaking,
}: {
  hint: Hint;
  index: number;
  isSelected: boolean;
  isMatched: boolean;
  matchCorrect: boolean;
  onClick: () => void;
  shaking: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const shakeTime = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (shaking) {
      shakeTime.current += delta * 40;
      groupRef.current.position.x = -5 + Math.sin(shakeTime.current) * 0.15;
    } else {
      shakeTime.current = 0;
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        -5,
        delta * 8
      );
    }
  });

  const yPos = 2.4 - index * 1.6;

  const borderColor = isMatched
    ? matchCorrect
      ? "#00CC66"
      : "#CC0000"
    : isSelected
    ? "#CC0000"
    : hovered
    ? "#555555"
    : "#2A2A2A";

  const bgColor = isMatched
    ? matchCorrect
      ? "#003311"
      : "#330000"
    : isSelected
    ? "#1A0000"
    : "#111111";

  const emissiveColor = isMatched
    ? matchCorrect
      ? "#00CC66"
      : "#CC0000"
    : isSelected
    ? "#8B0000"
    : "#0A0A0A";

  const emissiveIntensity = isMatched ? 0.5 : isSelected ? 0.6 : 0.05;

  return (
    <Float speed={1.2} floatIntensity={0.2} rotationIntensity={0.05}>
      <group
        ref={groupRef}
        position={[-5, yPos, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        {/* Panel body */}
        <mesh>
          <boxGeometry args={[2.8, 1.1, 0.12]} />
          <meshStandardMaterial
            color={bgColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
        {/* Border wireframe */}
        <mesh>
          <boxGeometry args={[2.82, 1.12, 0.13]} />
          <meshBasicMaterial color={borderColor} wireframe transparent opacity={0.6} />
        </mesh>
        {/* Icon */}
        <Text
          position={[-1.05, 0.15, 0.08]}
          fontSize={0.35}
          anchorX="left"
          anchorY="middle"
        >
          {hint.icon}
        </Text>
        {/* Description */}
        <Text
          position={[-0.55, 0.15, 0.08]}
          fontSize={0.16}
          color={isMatched && matchCorrect ? "#00CC66" : "#E8E8E8"}
          anchorX="left"
          anchorY="middle"
          maxWidth={1.8}
        >
          {hint.description}
        </Text>
        {/* Hint label */}
        <Text
          position={[0, -0.35, 0.08]}
          fontSize={0.1}
          color={isSelected ? "#CC0000" : "#555555"}
          anchorX="center"
          anchorY="middle"
        >
          {isMatched ? (matchCorrect ? "MATCHED" : "WRONG") : isSelected ? "SELECTED" : "CLICK TO SELECT"}
        </Text>
        {/* Glow light when selected */}
        {(isSelected || isMatched) && (
          <pointLight
            position={[0, 0, 0.8]}
            color={isMatched && matchCorrect ? "#00CC66" : "#CC0000"}
            intensity={2}
            distance={4}
            decay={2}
          />
        )}
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/*  Country Panel (right side)                                         */
/* ------------------------------------------------------------------ */

function CountryPanel({
  country,
  index,
  isMatched,
  matchCorrect,
  onClick,
  canClick,
  shaking,
}: {
  country: string;
  index: number;
  isMatched: boolean;
  matchCorrect: boolean;
  onClick: () => void;
  canClick: boolean;
  shaking: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const shakeTime = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (shaking) {
      shakeTime.current += delta * 40;
      groupRef.current.position.x = 5 + Math.sin(shakeTime.current) * 0.15;
    } else {
      shakeTime.current = 0;
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        5,
        delta * 8
      );
    }
  });

  const yPos = 2.4 - index * 1.6;

  const borderColor = isMatched
    ? matchCorrect
      ? "#00CC66"
      : "#CC0000"
    : hovered && canClick
    ? "#CC0000"
    : "#2A2A2A";

  const bgColor = isMatched
    ? matchCorrect
      ? "#003311"
      : "#330000"
    : "#111111";

  return (
    <Float speed={1.5} floatIntensity={0.15} rotationIntensity={0.05}>
      <group
        ref={groupRef}
        position={[5, yPos, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (canClick || isMatched) onClick();
        }}
        onPointerOver={() => {
          if (canClick || isMatched) {
            setHovered(true);
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <mesh>
          <boxGeometry args={[2.4, 1.1, 0.12]} />
          <meshStandardMaterial
            color={bgColor}
            emissive={isMatched && matchCorrect ? "#00CC66" : isMatched ? "#CC0000" : "#0A0A0A"}
            emissiveIntensity={isMatched ? 0.4 : 0.05}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[2.42, 1.12, 0.13]} />
          <meshBasicMaterial color={borderColor} wireframe transparent opacity={0.6} />
        </mesh>
        <Text
          position={[0, 0, 0.08]}
          fontSize={0.24}
          color={isMatched && matchCorrect ? "#00CC66" : canClick ? "#E8E8E8" : "#777777"}
          anchorX="center"
          anchorY="middle"
        >
          {country}
        </Text>
        {isMatched && (
          <pointLight
            position={[0, 0, 0.8]}
            color={matchCorrect ? "#00CC66" : "#CC0000"}
            intensity={2}
            distance={4}
            decay={2}
          />
        )}
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/*  Connection Line between matched pairs                              */
/* ------------------------------------------------------------------ */

function ConnectionLine({
  hintIndex,
  countryIndex,
  correct,
}: {
  hintIndex: number;
  countryIndex: number;
  correct: boolean;
}) {
  const hintY = 2.4 - hintIndex * 1.6;
  const countryY = 2.4 - countryIndex * 1.6;

  const points: [number, number, number][] = [
    [-3.5, hintY, 0],
    [-1, (hintY + countryY) / 2, 0.5],
    [0, (hintY + countryY) / 2, 0.8],
    [1, (hintY + countryY) / 2, 0.5],
    [3.7, countryY, 0],
  ];

  return (
    <Line
      points={points}
      color={correct ? "#00CC66" : "#CC0000"}
      lineWidth={2}
      transparent
      opacity={0.7}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Scene Content (inside Canvas)                                      */
/* ------------------------------------------------------------------ */

function SceneContent({
  hints,
  countries,
  selectedHint,
  matches,
  wrongFlash,
  onHintClick,
  onCountryClick,
}: {
  hints: Hint[];
  countries: string[];
  selectedHint: string | null;
  matches: MatchPair[];
  wrongFlash: { hintId: string; country: string } | null;
  onHintClick: (id: string) => void;
  onCountryClick: (country: string) => void;
}) {
  const getHintMatch = (id: string) => matches.find((m) => m.hintId === id);
  const getCountryMatch = (country: string) => matches.find((m) => m.country === country);

  return (
    <>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.7}
        minAzimuthAngle={-Math.PI * 0.4}
        maxAzimuthAngle={Math.PI * 0.4}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.4}
      />

      {/* Lighting */}
      <ambientLight intensity={0.2} color="#E8E8E8" />
      <pointLight position={[0, 5, 4]} intensity={0.6} color="#E8E8E8" distance={20} decay={2} />
      <pointLight position={[-6, 2, 0]} intensity={0.4} color="#8B0000" distance={15} decay={2} />
      <pointLight position={[6, 2, 0]} intensity={0.4} color="#8B0000" distance={15} decay={2} />

      {/* Fog */}
      <fog attach="fog" args={["#0A0A0A", 10, 28]} />

      {/* Globe */}
      <Globe />

      {/* Hint panels (left) */}
      {hints.map((hint, i) => {
        const match = getHintMatch(hint.id);
        const isShaking = wrongFlash?.hintId === hint.id;
        return (
          <HintPanel
            key={hint.id}
            hint={hint}
            index={i}
            isSelected={selectedHint === hint.id}
            isMatched={!!match}
            matchCorrect={match?.correct ?? false}
            onClick={() => onHintClick(hint.id)}
            shaking={isShaking}
          />
        );
      })}

      {/* Country panels (right) */}
      {countries.map((country, i) => {
        const match = getCountryMatch(country);
        const isShaking = wrongFlash?.country === country;
        return (
          <CountryPanel
            key={country}
            country={country}
            index={i}
            isMatched={!!match}
            matchCorrect={match?.correct ?? false}
            onClick={() => onCountryClick(country)}
            canClick={!!selectedHint}
            shaking={isShaking}
          />
        );
      })}

      {/* Connection lines for matches */}
      {matches
        .filter((m) => m.correct)
        .map((m) => {
          const hintIdx = hints.findIndex((h) => h.id === m.hintId);
          const countryIdx = countries.indexOf(m.country);
          return (
            <ConnectionLine
              key={`${m.hintId}-${m.country}`}
              hintIndex={hintIdx}
              countryIndex={countryIdx}
              correct={m.correct}
            />
          );
        })}

      {/* Particles */}
      <Particles count={80} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported Component with Canvas                                     */
/* ------------------------------------------------------------------ */

function CoordinatesScene({
  hints,
  countries,
  selectedHint,
  matches,
  wrongFlash,
  onHintClick,
  onCountryClick,
}: {
  hints: Hint[];
  countries: string[];
  selectedHint: string | null;
  matches: MatchPair[];
  wrongFlash: { hintId: string; country: string } | null;
  onHintClick: (id: string) => void;
  onCountryClick: (country: string) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 9], fov: 55 }}
      style={{ width: "100%", height: "100%", background: "#0A0A0A" }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent
        hints={hints}
        countries={countries}
        selectedHint={selectedHint}
        matches={matches}
        wrongFlash={wrongFlash}
        onHintClick={onHintClick}
        onCountryClick={onCountryClick}
      />
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic import wrapper                                             */
/* ------------------------------------------------------------------ */

const CoordinatesSceneDynamic = dynamic(
  () => Promise.resolve(CoordinatesScene),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  Main Exported Component                                            */
/* ------------------------------------------------------------------ */

export default function CoordinatesMap({ hints, countries, onComplete }: CoordinatesMapProps) {
  const [selectedHint, setSelectedHint] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [wrongFlash, setWrongFlash] = useState<{ hintId: string; country: string } | null>(null);
  const completedRef = useRef(false);

  // Check for completion
  useEffect(() => {
    const correctMatches = matches.filter((m) => m.correct);
    if (correctMatches.length === hints.length && !completedRef.current) {
      completedRef.current = true;
      setTimeout(() => onComplete(), 1200);
    }
  }, [matches, hints.length, onComplete]);

  const handleHintClick = useCallback(
    (hintId: string) => {
      if (completedRef.current) return;

      // If already correctly matched, allow unmatching
      const existingMatch = matches.find((m) => m.hintId === hintId);
      if (existingMatch && existingMatch.correct) {
        setMatches((prev) => prev.filter((m) => m.hintId !== hintId));
        completedRef.current = false;
        setSelectedHint(null);
        return;
      }

      // Toggle selection
      if (selectedHint === hintId) {
        setSelectedHint(null);
      } else {
        setSelectedHint(hintId);
      }
    },
    [selectedHint, matches]
  );

  const handleCountryClick = useCallback(
    (country: string) => {
      if (completedRef.current) return;

      // If clicking a matched country, unmatch it
      const existingMatch = matches.find((m) => m.country === country);
      if (existingMatch && existingMatch.correct) {
        setMatches((prev) => prev.filter((m) => m.country !== country));
        completedRef.current = false;
        setSelectedHint(null);
        return;
      }

      if (!selectedHint) return;

      // Find the hint object
      const hint = hints.find((h) => h.id === selectedHint);
      if (!hint) return;

      // Check correctness
      const isCorrect = hint.correctCountry === country;

      if (isCorrect) {
        setMatches((prev) => [
          ...prev.filter((m) => m.hintId !== selectedHint && m.country !== country),
          { hintId: selectedHint, country, correct: true },
        ]);
        setSelectedHint(null);
      } else {
        // Wrong match — flash red and shake
        setWrongFlash({ hintId: selectedHint, country });
        setTimeout(() => {
          setWrongFlash(null);
          setSelectedHint(null);
        }, 600);
      }
    },
    [selectedHint, matches, hints]
  );

  return (
    <div className="space-y-4">
      <div style={{ height: "58vh", width: "100%" }} className="rounded overflow-hidden border border-[#2A2A2A]">
        <CoordinatesSceneDynamic
          hints={hints}
          countries={countries}
          selectedHint={selectedHint}
          matches={matches}
          wrongFlash={wrongFlash}
          onHintClick={handleHintClick}
          onCountryClick={handleCountryClick}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-mission-white/50">
          {selectedHint
            ? "Now click the matching country on the right."
            : "Click a hint on the left to select it."}
        </span>
        <span className="text-mission-green">
          {matches.filter((m) => m.correct).length}/{hints.length} matched
        </span>
      </div>
    </div>
  );
}
