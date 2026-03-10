"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";

const LockScene = dynamic(() => import("./LockScene"), { ssr: false });

interface LockGridProps {
  pattern: number[];
  onComplete: (success: boolean) => void;
  attempts: number;
  phase: "showing" | "hidden" | "result";
}

export default function LockGrid({ pattern, onComplete, attempts, phase }: LockGridProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playerClicks, setPlayerClicks] = useState<number[]>([]);
  const [buttonStates, setButtonStates] = useState<Record<number, "idle" | "active" | "correct" | "wrong">>({});
  const [vaultOpen, setVaultOpen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const completedRef = useRef(false);

  // Reset on new attempt
  useEffect(() => {
    setPlayerClicks([]);
    setButtonStates({});
    setActiveIndex(-1);
    setVaultOpen(false);
    setShaking(false);
    completedRef.current = false;
  }, [attempts]);

  // Showing phase: light up buttons one by one
  useEffect(() => {
    if (phase !== "showing") return;

    setButtonStates({});
    setActiveIndex(-1);

    const timers: NodeJS.Timeout[] = [];

    pattern.forEach((cellIndex, i) => {
      const showTimer = setTimeout(() => {
        setActiveIndex(cellIndex);
        setButtonStates((prev) => ({ ...prev, [cellIndex]: "active" }));
      }, i * 600);

      const hideTimer = setTimeout(() => {
        setButtonStates((prev) => {
          const next = { ...prev };
          if (next[cellIndex] === "active") next[cellIndex] = "idle";
          return next;
        });
        if (i === pattern.length - 1) setActiveIndex(-1);
      }, i * 600 + 450);

      timers.push(showTimer, hideTimer);
    });

    return () => timers.forEach(clearTimeout);
  }, [phase, pattern, attempts]);

  // Reset button states when entering hidden phase
  useEffect(() => {
    if (phase === "hidden") {
      setButtonStates({});
      setPlayerClicks([]);
    }
  }, [phase]);

  const handleButtonClick = useCallback(
    (index: number) => {
      if (phase !== "hidden" || completedRef.current) return;

      const nextClicks = [...playerClicks, index];
      setPlayerClicks(nextClicks);

      const stepIndex = nextClicks.length - 1;
      const expectedCell = pattern[stepIndex];

      if (index === expectedCell) {
        // Correct click
        setButtonStates((prev) => ({ ...prev, [index]: "correct" }));

        if (nextClicks.length === pattern.length) {
          // Full sequence correct
          completedRef.current = true;
          setVaultOpen(true);
          setTimeout(() => onComplete(true), 1800);
        }
      } else {
        // Wrong click
        completedRef.current = true;
        setButtonStates((prev) => ({ ...prev, [index]: "wrong" }));
        setShaking(true);
        setTimeout(() => {
          setShaking(false);
          onComplete(false);
        }, 1200);
      }
    },
    [phase, playerClicks, pattern, onComplete]
  );

  return (
    <div className="w-full" style={{ height: "60vh" }}>
      <LockScene
        pattern={pattern}
        buttonStates={buttonStates}
        activeIndex={activeIndex}
        onButtonClick={handleButtonClick}
        vaultOpen={vaultOpen}
        shaking={shaking}
        phase={phase}
        playerClicks={playerClicks}
      />
    </div>
  );
}
