"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BonusPuzzleProps {
  onComplete: (success: boolean) => void;
  timeLimit: number;
}

const TARGET_PHRASE = "ARMAF ISLAND HEIST";
const TARGET_LETTERS = "ARMAFISLANDHEIST"; // no spaces for 3D blocks

/* ------------------------------------------------------------------ */
/*  Floating Particles                                                 */
/* ------------------------------------------------------------------ */

function Particles({ count = 80 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 18,
      y: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 14 - 4,
      speed: 0.1 + Math.random() * 0.25,
      offset: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.4,
        p.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.25,
        p.z
      );
      dummy.scale.setScalar(0.02 + Math.sin(t * 2 + p.offset) * 0.008);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#8B0000" transparent opacity={0.3} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Letter Block                                                       */
/* ------------------------------------------------------------------ */

function LetterBlock({
  letter,
  index,
  initialPosition,
  initialRotation,
  state,
  targetSlotPosition,
  onClick,
}: {
  letter: string;
  index: number;
  initialPosition: [number, number, number];
  initialRotation: [number, number, number];
  state: "floating" | "correct" | "wrong";
  targetSlotPosition: [number, number, number] | null;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const wrongTime = useRef(0);
  const floatPhase = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (state === "correct" && targetSlotPosition) {
      // Fly to slot position
      groupRef.current.position.lerp(
        new THREE.Vector3(...targetSlotPosition),
        delta * 5
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 5);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 5);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 5);
    } else if (state === "wrong") {
      // Shake animation
      wrongTime.current += delta * 30;
      groupRef.current.position.x = initialPosition[0] + Math.sin(wrongTime.current) * 0.2;
      if (wrongTime.current > 12) wrongTime.current = 0;
    } else {
      // Floating / tumbling slowly
      groupRef.current.position.set(
        initialPosition[0] + Math.sin(t * 0.3 + floatPhase.current) * 0.15,
        initialPosition[1] + Math.cos(t * 0.25 + floatPhase.current) * 0.12,
        initialPosition[2]
      );
      groupRef.current.rotation.x = initialRotation[0] + Math.sin(t * 0.2 + index) * 0.1;
      groupRef.current.rotation.y = initialRotation[1] + t * 0.08;
      groupRef.current.rotation.z = initialRotation[2] + Math.cos(t * 0.15 + index) * 0.05;
    }
  });

  const blockColor =
    state === "correct"
      ? "#003311"
      : state === "wrong"
      ? "#330000"
      : hovered
      ? "#1A1A1A"
      : "#111111";

  const emissiveColor =
    state === "correct"
      ? "#00CC66"
      : state === "wrong"
      ? "#CC0000"
      : hovered
      ? "#8B0000"
      : "#1A1A1A";

  const textColor =
    state === "correct"
      ? "#00CC66"
      : state === "wrong"
      ? "#CC0000"
      : "#E8E8E8";

  const interactive = state === "floating";

  return (
    <group
      ref={groupRef}
      position={initialPosition}
      rotation={initialRotation}
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
      {/* Block body */}
      <mesh>
        <boxGeometry args={[0.65, 0.65, 0.65]} />
        <meshStandardMaterial
          color={blockColor}
          emissive={emissiveColor}
          emissiveIntensity={state === "correct" ? 0.7 : state === "wrong" ? 1.2 : 0.15}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
      {/* Wireframe edge */}
      <mesh>
        <boxGeometry args={[0.67, 0.67, 0.67]} />
        <meshBasicMaterial
          color={state === "correct" ? "#00CC66" : state === "wrong" ? "#CC0000" : "#2A2A2A"}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Letter on front face */}
      <Text
        position={[0, 0, 0.34]}
        fontSize={0.38}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {letter}
      </Text>
      {/* Letter on back face */}
      <Text
        position={[0, 0, -0.34]}
        fontSize={0.38}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI, 0]}
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {letter}
      </Text>
      {/* Point light on correct */}
      {state === "correct" && (
        <pointLight position={[0, 0, 0.5]} color="#00CC66" intensity={2} distance={3} decay={2} />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene Content                                                      */
/* ------------------------------------------------------------------ */

function SceneContent({
  letters,
  letterStates,
  letterPositions,
  letterRotations,
  slotPositions,
  placedCount,
  onLetterClick,
}: {
  letters: { char: string; originalIndex: number }[];
  letterStates: Record<number, "floating" | "correct" | "wrong">;
  letterPositions: [number, number, number][];
  letterRotations: [number, number, number][];
  slotPositions: Map<number, [number, number, number]>;
  placedCount: number;
  onLetterClick: (originalIndex: number) => void;
}) {
  return (
    <>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.65}
        minAzimuthAngle={-Math.PI * 0.35}
        maxAzimuthAngle={Math.PI * 0.35}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.4}
      />

      {/* Lighting */}
      <ambientLight intensity={0.15} color="#E8E8E8" />
      <pointLight position={[0, 6, 5]} intensity={0.5} color="#E8E8E8" distance={20} decay={2} />
      <pointLight position={[-5, 2, 2]} intensity={0.5} color="#8B0000" distance={15} decay={2} />
      <pointLight position={[5, 2, 2]} intensity={0.5} color="#8B0000" distance={15} decay={2} />
      <pointLight position={[0, -2, 4]} intensity={0.3} color="#CC0000" distance={12} decay={2} />

      {/* Fog */}
      <fog attach="fog" args={["#0A0A0A", 8, 22]} />

      {/* Letter blocks */}
      {letters.map((l, i) => {
        const st = letterStates[l.originalIndex] || "floating";
        const slotPos = slotPositions.get(l.originalIndex) ?? null;
        return (
          <LetterBlock
            key={`${l.originalIndex}-${l.char}`}
            letter={l.char}
            index={i}
            initialPosition={letterPositions[i]}
            initialRotation={letterRotations[i]}
            state={st}
            targetSlotPosition={slotPos}
            onClick={() => onLetterClick(l.originalIndex)}
          />
        );
      })}

      {/* Particles */}
      <Particles count={60} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Canvas wrapper for dynamic import                                  */
/* ------------------------------------------------------------------ */

function BonusScene(props: {
  letters: { char: string; originalIndex: number }[];
  letterStates: Record<number, "floating" | "correct" | "wrong">;
  letterPositions: [number, number, number][];
  letterRotations: [number, number, number][];
  slotPositions: Map<number, [number, number, number]>;
  placedCount: number;
  onLetterClick: (originalIndex: number) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 8], fov: 55 }}
      style={{ width: "100%", height: "100%", background: "#0A0A0A" }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}

const BonusSceneDynamic = dynamic(
  () => Promise.resolve(BonusScene),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  Generate scattered positions                                       */
/* ------------------------------------------------------------------ */

function generateScatteredLayout(count: number) {
  const positions: [number, number, number][] = [];
  const rotations: [number, number, number][] = [];

  // Spread letters in a roughly spherical arrangement
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const radius = 2.5 + Math.random() * 1.5;
    const yOffset = (Math.random() - 0.5) * 3;
    positions.push([
      Math.cos(angle) * radius,
      yOffset,
      Math.sin(angle) * radius * 0.4 - 1,
    ]);
    rotations.push([
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * 0.3,
    ]);
  }

  return { positions, rotations };
}

/* ------------------------------------------------------------------ */
/*  Answer bar slot positions (3D, along bottom)                       */
/* ------------------------------------------------------------------ */

function getSlotPosition3D(slotIndex: number, totalSlots: number): [number, number, number] {
  const totalWidth = totalSlots * 0.72;
  const startX = -totalWidth / 2 + 0.36;
  return [startX + slotIndex * 0.72, -3.2, 2];
}

/* ------------------------------------------------------------------ */
/*  Main Exported Component                                            */
/* ------------------------------------------------------------------ */

export default function BonusPuzzle({ onComplete, timeLimit }: BonusPuzzleProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [placedCount, setPlacedCount] = useState(0);
  const [letterStates, setLetterStates] = useState<Record<number, "floating" | "correct" | "wrong">>({});
  const [slotPositions, setSlotPositions] = useState<Map<number, [number, number, number]>>(new Map());
  const [finished, setFinished] = useState(false);
  const completedRef = useRef(false);

  // Shuffle letters for display (with original index tracking)
  const { shuffledLetters, positions, rotations } = useMemo(() => {
    const arr = TARGET_LETTERS.split("").map((char, i) => ({
      char,
      originalIndex: i,
    }));
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const layout = generateScatteredLayout(arr.length);
    return {
      shuffledLetters: arr,
      positions: layout.positions,
      rotations: layout.rotations,
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (finished) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [finished]);

  // Handle timeout
  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      completedRef.current = true;
      setFinished(true);
      onComplete(false);
    }
  }, [timeLeft, onComplete]);

  // Handle letter click
  const handleLetterClick = useCallback(
    (originalIndex: number) => {
      if (finished || completedRef.current) return;

      const nextExpectedIndex = placedCount;
      const isCorrect = originalIndex === nextExpectedIndex;

      if (isCorrect) {
        const slotPos = getSlotPosition3D(placedCount, TARGET_LETTERS.length);
        setLetterStates((prev) => ({ ...prev, [originalIndex]: "correct" }));
        setSlotPositions((prev) => {
          const next = new Map(prev);
          next.set(originalIndex, slotPos);
          return next;
        });

        const newPlaced = placedCount + 1;
        setPlacedCount(newPlaced);

        // Check completion
        if (newPlaced === TARGET_LETTERS.length) {
          completedRef.current = true;
          setFinished(true);
          setTimeout(() => onComplete(true), 800);
        }
      } else {
        // Wrong letter — flash red
        setLetterStates((prev) => ({ ...prev, [originalIndex]: "wrong" }));
        setTimeout(() => {
          setLetterStates((prev) => ({ ...prev, [originalIndex]: "floating" }));
        }, 500);
      }
    },
    [finished, placedCount, onComplete]
  );

  // Build the answer bar display
  const answerBarSlots = useMemo(() => {
    const phraseChars = TARGET_PHRASE.split("");
    let letterIndex = 0;
    return phraseChars.map((char, i) => {
      if (char === " ") {
        return { char: " ", type: "space" as const, letterIdx: -1 };
      }
      const idx = letterIndex;
      letterIndex++;
      const isFilled = idx < placedCount;
      const isNext = idx === placedCount;
      return {
        char: isFilled ? TARGET_LETTERS[idx] : "",
        type: isFilled ? ("filled" as const) : isNext ? ("next" as const) : ("empty" as const),
        letterIdx: idx,
      };
    });
  }, [placedCount]);

  const isLow = timeLeft <= 10;
  const timerPercent = (timeLeft / timeLimit) * 100;

  return (
    <div className="space-y-4">
      {/* Timer bar */}
      <div className="w-full max-w-lg mx-auto">
        <div className="flex justify-between text-xs font-mono mb-1">
          <span className="text-mission-white/50">Time Remaining</span>
          <span
            className={
              isLow
                ? "text-mission-red-light animate-pulse font-bold"
                : "text-mission-white"
            }
          >
            {timeLeft}s
          </span>
        </div>
        <div className="h-1.5 bg-mission-grey-light overflow-hidden rounded-full">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isLow ? "bg-mission-red-light" : "bg-mission-red"
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* 3D Scene */}
      <div
        style={{ height: "55vh", width: "100%" }}
        className="rounded overflow-hidden border border-[#2A2A2A]"
      >
        <BonusSceneDynamic
          letters={shuffledLetters}
          letterStates={letterStates}
          letterPositions={positions}
          letterRotations={rotations}
          slotPositions={slotPositions}
          placedCount={placedCount}
          onLetterClick={handleLetterClick}
        />
      </div>

      {/* Answer bar */}
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono uppercase tracking-widest text-mission-white/40 mb-2 text-center">
          Target Phrase
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          {answerBarSlots.map((slot, i) => {
            if (slot.type === "space") {
              return <div key={`space-${i}`} className="w-3" />;
            }
            return (
              <div
                key={i}
                className={`w-7 h-9 sm:w-8 sm:h-10 flex items-center justify-center border font-mono text-sm sm:text-base font-bold transition-all duration-300 ${
                  slot.type === "filled"
                    ? "bg-mission-green/15 border-mission-green text-mission-green"
                    : slot.type === "next"
                    ? "bg-mission-red/10 border-mission-red animate-pulse text-mission-red-light"
                    : "bg-mission-grey border-mission-grey-light text-mission-white/20"
                }`}
              >
                {slot.char}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <p className="text-center text-xs font-mono text-mission-white/40">
        {placedCount}/{TARGET_LETTERS.length} letters placed
      </p>
    </div>
  );
}
