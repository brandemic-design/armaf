"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import gsap from "gsap";

interface LockGridProps {
  pattern: number[];
  onComplete: (success: boolean) => void;
  attempts: number;
  phase: "showing" | "hidden" | "result";
  onCellClick: (index: number) => void;
  playerSequence: number[];
  onSound?: (sound: "click" | "success" | "error" | "lock-open") => void;
}

type CellState = "idle" | "active" | "correct" | "wrong" | "clicked";

export default function LockGrid({
  pattern,
  onComplete,
  attempts,
  phase,
  onCellClick,
  playerSequence,
  onSound,
}: LockGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [cellStates, setCellStates] = useState<Record<number, CellState>>({});
  const [showingIndex, setShowingIndex] = useState(-1);
  const [accessDenied, setAccessDenied] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const completedRef = useRef(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clean up timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Reset on new attempt
  useEffect(() => {
    clearAllTimeouts();
    setCellStates({});
    setShowingIndex(-1);
    setAccessDenied(false);
    setUnlocked(false);
    completedRef.current = false;
  }, [attempts, clearAllTimeouts]);

  // Showing phase animation
  useEffect(() => {
    if (phase !== "showing") return;

    setCellStates({});
    setShowingIndex(-1);
    clearAllTimeouts();

    pattern.forEach((cellIndex, i) => {
      const showTimer = setTimeout(() => {
        setShowingIndex(i);
        setCellStates((prev) => ({ ...prev, [cellIndex]: "active" }));

        // Animate the cell
        const el = cellRefs.current[cellIndex];
        if (el) {
          gsap.fromTo(
            el,
            { scale: 1 },
            {
              scale: 1.1,
              duration: 0.15,
              ease: "power2.out",
              yoyo: true,
              repeat: 1,
            }
          );
        }
      }, i * 600);

      const hideTimer = setTimeout(() => {
        setCellStates((prev) => {
          const next = { ...prev };
          if (next[cellIndex] === "active") delete next[cellIndex];
          return next;
        });
        if (i === pattern.length - 1) setShowingIndex(-1);
      }, i * 600 + 450);

      timeoutsRef.current.push(showTimer, hideTimer);
    });

    return clearAllTimeouts;
  }, [phase, pattern, attempts, clearAllTimeouts]);

  // Reset cell states when entering hidden phase
  useEffect(() => {
    if (phase === "hidden") {
      setCellStates({});
    }
  }, [phase]);

  // Handle player sequence updates (correct / wrong detection)
  useEffect(() => {
    if (phase !== "hidden" || playerSequence.length === 0) return;

    const lastIndex = playerSequence.length - 1;
    const clickedCell = playerSequence[lastIndex];
    const expectedCell = pattern[lastIndex];

    if (clickedCell === expectedCell) {
      // Correct step
      setCellStates((prev) => ({ ...prev, [clickedCell]: "correct" }));
      onSound?.("success");

      const el = cellRefs.current[clickedCell];
      if (el) {
        gsap.fromTo(
          el,
          { scale: 1 },
          { scale: 1.08, duration: 0.12, ease: "power2.out", yoyo: true, repeat: 1 }
        );
      }

      if (playerSequence.length === pattern.length && !completedRef.current) {
        // Full sequence correct — UNLOCKED
        completedRef.current = true;
        setUnlocked(true);
        onSound?.("lock-open");

        // Wave flash all cells green
        cellRefs.current.forEach((el, i) => {
          if (el) {
            gsap.to(el, {
              boxShadow: "0 0 20px rgba(34,197,94,0.6), inset 0 0 12px rgba(34,197,94,0.3)",
              delay: i * 0.05,
              duration: 0.3,
              yoyo: true,
              repeat: 1,
            });
          }
        });

        // Animate grid border to green
        if (gridRef.current) {
          gsap.to(gridRef.current, {
            borderColor: "rgba(34,197,94,0.8)",
            duration: 0.6,
            ease: "power2.out",
          });
        }

        setTimeout(() => onComplete(true), 1800);
      }
    } else {
      // Wrong step
      completedRef.current = true;
      setCellStates((prev) => ({ ...prev, [clickedCell]: "wrong" }));
      onSound?.("error");
      setAccessDenied(true);

      // Shake the wrong cell
      const el = cellRefs.current[clickedCell];
      if (el) {
        gsap.to(el, {
          keyframes: [
            { x: -6, duration: 0.05 },
            { x: 6, duration: 0.05 },
            { x: -4, duration: 0.05 },
            { x: 4, duration: 0.05 },
            { x: -2, duration: 0.05 },
            { x: 2, duration: 0.05 },
            { x: 0, duration: 0.05 },
          ],
          ease: "power2.out",
        });
      }

      // Shake entire grid
      if (gridRef.current) {
        gsap.to(gridRef.current, {
          keyframes: [
            { x: -8, duration: 0.06 },
            { x: 8, duration: 0.06 },
            { x: -6, duration: 0.06 },
            { x: 6, duration: 0.06 },
            { x: -3, duration: 0.06 },
            { x: 3, duration: 0.06 },
            { x: 0, duration: 0.06 },
          ],
          ease: "power2.out",
        });
      }

      setTimeout(() => {
        setAccessDenied(false);
        onComplete(false);
      }, 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerSequence]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (phase !== "hidden" || completedRef.current) return;
      onSound?.("click");
      onCellClick(index);
    },
    [phase, onCellClick, onSound]
  );

  const getCellClasses = (index: number): string => {
    const state = cellStates[index];
    const wasClicked = playerSequence.includes(index) && phase === "hidden";

    const base =
      "relative flex items-center justify-center rounded-md border-2 font-mono text-xs transition-all duration-200 select-none outline-none focus:outline-none";

    const sizing = "min-h-[60px] min-w-[60px] aspect-square";

    // Disabled during showing phase
    const cursor =
      phase === "hidden" && !completedRef.current
        ? "cursor-pointer hover:border-mission-white/60 hover:bg-mission-white/5 active:scale-95"
        : "cursor-default";

    let visual = "bg-mission-grey border-mission-grey-light text-mission-white/30";

    if (state === "active") {
      visual =
        "bg-green-500/20 border-green-400 text-green-300 shadow-[0_0_16px_rgba(34,197,94,0.5),inset_0_0_8px_rgba(34,197,94,0.2)]";
    } else if (state === "correct") {
      visual =
        "bg-green-500/15 border-green-500 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.4)]";
    } else if (state === "wrong") {
      visual =
        "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] error-glow";
    } else if (wasClicked) {
      visual = "bg-mission-grey border-mission-grey-light/60 text-mission-white/20";
    }

    return `${base} ${sizing} ${cursor} ${visual}`;
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Phase status */}
      {phase === "showing" && (
        <div className="flex items-center gap-2 text-mission-white/60 font-mono text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>
            Showing: {showingIndex >= 0 ? showingIndex + 1 : 0}/{pattern.length}
          </span>
        </div>
      )}

      {phase === "hidden" && !completedRef.current && (
        <div className="flex items-center gap-2 text-mission-white/60 font-mono text-sm">
          <span className="animate-pulse">|</span>
          <span>Reproduce the sequence</span>
          <span className="ml-2 text-mission-white/40">
            Step {playerSequence.length}/{pattern.length}
          </span>
        </div>
      )}

      {/* ACCESS DENIED flash */}
      {accessDenied && (
        <div className="text-mission-red font-mono text-lg uppercase tracking-widest animate-pulse error-glow">
          Access Denied
        </div>
      )}

      {/* UNLOCKED text */}
      {unlocked && (
        <div className="font-mono text-2xl sm:text-3xl uppercase tracking-[0.3em] text-green-400 success-glow animate-bounce">
          Unlocked
        </div>
      )}

      {/* Grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-4 gap-2 sm:gap-3 p-4 sm:p-6 border-2 border-mission-grey-light rounded-lg bg-mission-black/60 backdrop-blur-sm transition-colors duration-500 w-full max-w-[340px] sm:max-w-[400px]"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <button
            key={i}
            ref={(el) => {
              cellRefs.current[i] = el;
            }}
            onClick={() => handleCellClick(i)}
            disabled={phase !== "hidden" || completedRef.current}
            className={getCellClasses(i)}
            aria-label={`Cell ${i + 1}`}
          >
            {/* Number label */}
            <span className="absolute top-1 left-1.5 text-[10px] opacity-30 leading-none">
              {i + 1}
            </span>

            {/* LED indicator */}
            <span
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                cellStates[i] === "active"
                  ? "bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                  : cellStates[i] === "correct"
                  ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                  : cellStates[i] === "wrong"
                  ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                  : "bg-mission-grey-light/40"
              }`}
            />

            {/* Correct checkmark */}
            {cellStates[i] === "correct" && (
              <span className="absolute bottom-1 right-1.5 text-green-400 text-[10px] leading-none">
                &#10003;
              </span>
            )}

            {/* Wrong X */}
            {cellStates[i] === "wrong" && (
              <span className="absolute bottom-1 right-1.5 text-red-400 text-[10px] leading-none">
                &#10007;
              </span>
            )}

            {/* Clicked dot marker */}
            {playerSequence.includes(i) &&
              phase === "hidden" &&
              cellStates[i] !== "correct" &&
              cellStates[i] !== "wrong" && (
                <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-mission-white/20" />
              )}
          </button>
        ))}
      </div>
    </div>
  );
}
