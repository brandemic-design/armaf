"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import gsap from "gsap";

interface LockGridProps {
  pattern: number[]; // array of cell indices (0-15) that form the pattern
  onComplete: (success: boolean) => void;
  attempts: number;
}

type GridState = "showing" | "hidden" | "attempt";

export default function LockGrid({ pattern, onComplete, attempts }: LockGridProps) {
  const [gridState, setGridState] = useState<GridState>("showing");
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [cellStatuses, setCellStatuses] = useState<Record<number, "correct" | "incorrect">>({});
  const [showingResult, setShowingResult] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Show pattern for 4 seconds, then hide
  useEffect(() => {
    setGridState("showing");
    setSelectedCells([]);
    setCellStatuses({});

    const timer = setTimeout(() => {
      setGridState("hidden");
    }, 4000);

    return () => clearTimeout(timer);
  }, [attempts]);

  // Entry animation
  useEffect(() => {
    if (gridRef.current) {
      gsap.fromTo(
        gridRef.current.children,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, stagger: 0.03, ease: "back.out(1.7)" }
      );
    }
  }, []);

  const handleCellClick = useCallback(
    (cellIndex: number) => {
      if (gridState !== "hidden" || showingResult) return;
      if (selectedCells.includes(cellIndex)) return;

      const newSelected = [...selectedCells, cellIndex];
      setSelectedCells(newSelected);

      // Check if we have selected enough cells
      if (newSelected.length === pattern.length) {
        setShowingResult(true);

        // Evaluate: check if selected cells match the pattern (order matters)
        const statuses: Record<number, "correct" | "incorrect"> = {};
        let allCorrect = true;

        newSelected.forEach((cell, i) => {
          if (cell === pattern[i]) {
            statuses[cell] = "correct";
          } else {
            statuses[cell] = "incorrect";
            allCorrect = false;
          }
        });

        setCellStatuses(statuses);

        // Animate result
        setTimeout(() => {
          setShowingResult(false);
          onComplete(allCorrect);
        }, 1500);
      }
    },
    [gridState, showingResult, selectedCells, pattern, onComplete]
  );

  const isInPattern = (index: number) => pattern.includes(index);
  const isSelected = (index: number) => selectedCells.includes(index);
  const selectionOrder = (index: number) => selectedCells.indexOf(index);

  const getCellClass = (index: number): string => {
    const base =
      "w-full aspect-square border-2 transition-all duration-300 cursor-pointer flex items-center justify-center font-mono text-sm";

    if (gridState === "showing") {
      if (isInPattern(index)) {
        const order = pattern.indexOf(index);
        return `${base} bg-mission-red/30 border-mission-red shadow-[0_0_12px_rgba(139,0,0,0.5)]`;
      }
      return `${base} bg-mission-grey border-mission-grey-light`;
    }

    if (showingResult && isSelected(index)) {
      const status = cellStatuses[index];
      if (status === "correct") {
        return `${base} bg-mission-green/30 border-mission-green success-glow`;
      }
      if (status === "incorrect") {
        return `${base} bg-mission-red-light/30 border-mission-red-light error-glow`;
      }
    }

    if (isSelected(index)) {
      return `${base} bg-mission-red/20 border-mission-red`;
    }

    return `${base} bg-mission-grey border-mission-grey-light hover:border-mission-white/30 hover:bg-mission-grey-light/50`;
  };

  return (
    <div className="space-y-6">
      {/* Status indicator */}
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-mission-white/50">
          {gridState === "showing"
            ? "Memorize the sequence..."
            : showingResult
            ? "Verifying..."
            : `Select cells in order (${selectedCells.length}/${pattern.length})`}
        </p>
      </div>

      {/* Grid */}
      <div ref={gridRef} className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
        {Array.from({ length: 16 }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={gridState === "showing" || showingResult}
            className={getCellClass(i)}
          >
            {/* Show order number during showing phase */}
            {gridState === "showing" && isInPattern(i) && (
              <span className="text-mission-red font-bold">
                {pattern.indexOf(i) + 1}
              </span>
            )}

            {/* Show selection order during hidden/attempt phase */}
            {gridState === "hidden" && isSelected(i) && (
              <span className="text-mission-white/80 font-bold">
                {selectionOrder(i) + 1}
              </span>
            )}

            {/* LED indicator dot */}
            {showingResult && isSelected(i) && (
              <div
                className={`w-3 h-3 rounded-full ${
                  cellStatuses[i] === "correct" ? "bg-mission-green" : "bg-mission-red-light"
                }`}
              />
            )}
          </button>
        ))}
      </div>

      {/* Selected count indicator */}
      {gridState === "hidden" && !showingResult && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: pattern.length }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < selectedCells.length ? "bg-mission-red" : "bg-mission-grey-light"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
