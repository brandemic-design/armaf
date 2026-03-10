"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import gsap from "gsap";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BonusPuzzleProps {
  onComplete: (success: boolean) => void;
  timeLimit: number;
  onSound: (name: string) => void;
}

const TARGET_PHRASE = "ARMAF ISLAND HEIST";
const TARGET_LETTERS = TARGET_PHRASE.replace(/ /g, "");

/* ------------------------------------------------------------------ */
/*  Deterministic scramble (same order every time)                     */
/* ------------------------------------------------------------------ */

function deterministicShuffle(arr: { char: string; originalIndex: number }[]) {
  const copy = [...arr];
  // Seed-based swap pattern for deterministic scramble
  const swaps = [14, 3, 11, 7, 0, 9, 5, 12, 2, 15, 8, 1, 13, 6, 10, 4];
  for (let i = 0; i < copy.length; i++) {
    const j = swaps[i % swaps.length] % copy.length;
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ------------------------------------------------------------------ */
/*  Phrase structure: groups for display                                */
/* ------------------------------------------------------------------ */

function getPhraseGroups(): { char: string; letterIndex: number }[][] {
  const words = TARGET_PHRASE.split(" ");
  const groups: { char: string; letterIndex: number }[][] = [];
  let letterIdx = 0;
  for (const word of words) {
    const group: { char: string; letterIndex: number }[] = [];
    for (const ch of word) {
      group.push({ char: ch, letterIndex: letterIdx });
      letterIdx++;
    }
    groups.push(group);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function BonusPuzzle({ onComplete, timeLimit, onSound }: BonusPuzzleProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [placedLetters, setPlacedLetters] = useState<Map<number, number>>(new Map()); // slotIndex -> scrambledTileIndex
  const [nextSlot, setNextSlot] = useState(0);
  const [finished, setFinished] = useState(false);
  const completedRef = useRef(false);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const phraseGroups = useMemo(() => getPhraseGroups(), []);

  // Scrambled tiles
  const scrambledTiles = useMemo(() => {
    const letters = TARGET_LETTERS.split("").map((char, i) => ({ char, originalIndex: i }));
    return deterministicShuffle(letters);
  }, []);

  // Track which tiles are used (placed correctly)
  const [usedTileIndices, setUsedTileIndices] = useState<Set<number>>(new Set());
  // Track tiles currently animating wrong
  const [wrongTileIdx, setWrongTileIdx] = useState<number | null>(null);

  // Mount animation: scatter tiles in
  useEffect(() => {
    tileRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.fromTo(
        el,
        {
          opacity: 0,
          scale: 0,
          rotation: (Math.random() - 0.5) * 60,
        },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 0.4,
          delay: i * 0.04,
          ease: "back.out(1.7)",
        }
      );
    });
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
      onSound("timeout");

      // Fade out all tiles
      tileRefs.current.forEach((el) => {
        if (el) gsap.to(el, { opacity: 0.3, duration: 0.5 });
      });

      onComplete(false);
    }
  }, [timeLeft, onComplete, onSound]);

  // Handle tile click
  const handleTileClick = useCallback(
    (scrambledIdx: number) => {
      if (finished || completedRef.current) return;

      const tile = scrambledTiles[scrambledIdx];
      const expectedOriginalIndex = nextSlot;
      const isCorrect = tile.originalIndex === expectedOriginalIndex;

      if (isCorrect) {
        onSound("match");

        // Animate tile flying to slot
        const tileEl = tileRefs.current[scrambledIdx];
        const slotEl = slotRefs.current[nextSlot];

        if (tileEl && slotEl) {
          const tileRect = tileEl.getBoundingClientRect();
          const slotRect = slotEl.getBoundingClientRect();
          const dx = slotRect.left - tileRect.left;
          const dy = slotRect.top - tileRect.top;

          gsap.to(tileEl, {
            x: dx,
            y: dy,
            scale: 0.9,
            opacity: 0,
            duration: 0.35,
            ease: "power2.in",
          });
        }

        setPlacedLetters((prev) => {
          const next = new Map(prev);
          next.set(nextSlot, scrambledIdx);
          return next;
        });
        setUsedTileIndices((prev) => new Set(prev).add(scrambledIdx));

        const newNextSlot = nextSlot + 1;
        setNextSlot(newNextSlot);

        // Check completion
        if (newNextSlot === TARGET_LETTERS.length) {
          completedRef.current = true;
          setFinished(true);
          onSound("success");

          // Gold/green wave on all slots
          slotRefs.current.forEach((el, i) => {
            if (el) {
              gsap.to(el, {
                backgroundColor: "#166534",
                borderColor: "#22C55E",
                duration: 0.2,
                delay: i * 0.05,
                yoyo: true,
                repeat: 1,
              });
            }
          });

          setTimeout(() => onComplete(true), 800);
        }
      } else {
        // Wrong: flash red + bounce back
        onSound("error");
        setWrongTileIdx(scrambledIdx);

        const tileEl = tileRefs.current[scrambledIdx];
        const slotEl = slotRefs.current[nextSlot];

        if (slotEl) {
          gsap.to(slotEl, {
            borderColor: "#DC2626",
            backgroundColor: "rgba(220, 38, 38, 0.15)",
            duration: 0.15,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              gsap.set(slotEl, { borderColor: "", backgroundColor: "" });
            },
          });
        }

        if (tileEl) {
          gsap.to(tileEl, {
            x: -6,
            duration: 0.05,
            yoyo: true,
            repeat: 5,
            ease: "power2.inOut",
            onComplete: () => {
              gsap.set(tileEl, { x: 0 });
              setWrongTileIdx(null);
            },
          });
        }

        setTimeout(() => setWrongTileIdx(null), 400);
      }
    },
    [finished, scrambledTiles, nextSlot, onComplete, onSound]
  );

  // Handle clicking a filled answer slot to send tile back
  const handleSlotClick = useCallback(
    (slotIndex: number) => {
      if (finished || completedRef.current) return;

      // Can only remove the last placed letter
      if (slotIndex !== nextSlot - 1) return;

      const scrambledIdx = placedLetters.get(slotIndex);
      if (scrambledIdx === undefined) return;

      onSound("click");

      // Restore tile
      const tileEl = tileRefs.current[scrambledIdx];
      if (tileEl) {
        gsap.to(tileEl, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
      }

      setPlacedLetters((prev) => {
        const next = new Map(prev);
        next.delete(slotIndex);
        return next;
      });
      setUsedTileIndices((prev) => {
        const next = new Set(prev);
        next.delete(scrambledIdx);
        return next;
      });
      setNextSlot(slotIndex);
    },
    [finished, nextSlot, placedLetters, onSound]
  );

  // Timer bar calculations
  const timerPercent = (timeLeft / timeLimit) * 100;
  const timerColor =
    timeLeft <= 5
      ? "bg-mission-red-light"
      : timeLeft <= 15
      ? "bg-yellow-500"
      : "bg-mission-green";
  const timerPulse = timeLeft <= 5;

  return (
    <div className="space-y-5">
      {/* Timer bar */}
      <div className="w-full">
        <div className={`h-2 bg-mission-grey-light overflow-hidden rounded-full ${timerPulse ? "animate-pulse" : ""}`}>
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${timerColor}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Scrambled letter tiles */}
      <div ref={containerRef}>
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-mission-white/40 mb-3 text-center">
          Available Letters
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {scrambledTiles.map((tile, i) => {
            const isUsed = usedTileIndices.has(i);
            const isWrong = wrongTileIdx === i;

            return (
              <div
                key={`tile-${i}`}
                ref={(el) => { tileRefs.current[i] = el; }}
                onClick={() => !isUsed && handleTileClick(i)}
                className={`
                  w-10 h-12 sm:w-11 sm:h-13 flex items-center justify-center
                  font-mono text-base sm:text-lg font-bold
                  border-2 rounded select-none
                  transition-colors duration-150
                  ${isUsed
                    ? "opacity-0 pointer-events-none"
                    : isWrong
                    ? "bg-mission-red/20 border-mission-red text-mission-red-light error-glow cursor-pointer"
                    : "bg-mission-grey border-mission-grey-light text-mission-white hover:border-mission-red hover:bg-mission-red/10 cursor-pointer"
                  }
                `}
                style={{
                  boxShadow: isUsed
                    ? "none"
                    : "inset 0 -2px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.4)",
                }}
              >
                {tile.char}
              </div>
            );
          })}
        </div>
      </div>

      {/* Answer slots */}
      <div className="max-w-2xl mx-auto">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-mission-white/40 mb-3 text-center">
          Target Phrase
        </p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {phraseGroups.map((group, gi) => (
            <div key={`group-${gi}`} className="flex gap-1">
              {group.map((slot) => {
                const isFilled = placedLetters.has(slot.letterIndex);
                const isNext = slot.letterIndex === nextSlot && !finished;
                const filledChar = isFilled ? TARGET_LETTERS[slot.letterIndex] : "";

                return (
                  <div
                    key={`slot-${slot.letterIndex}`}
                    ref={(el) => { slotRefs.current[slot.letterIndex] = el; }}
                    onClick={() => isFilled && handleSlotClick(slot.letterIndex)}
                    className={`
                      w-8 h-10 sm:w-9 sm:h-11 flex items-center justify-center
                      border font-mono text-sm sm:text-base font-bold
                      transition-all duration-200 rounded-sm
                      ${isFilled
                        ? "bg-mission-green/15 border-mission-green text-mission-green cursor-pointer"
                        : isNext
                        ? "bg-mission-red/10 border-mission-red animate-pulse"
                        : "bg-mission-grey border-mission-grey-light text-mission-white/20"
                      }
                    `}
                  >
                    {filledChar || (
                      <span className="text-mission-white/15">_</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <p className="text-center text-xs font-mono text-mission-white/40">
        {nextSlot}/{TARGET_LETTERS.length} letters placed
      </p>

      {/* Success overlay */}
      {finished && completedRef.current && nextSlot === TARGET_LETTERS.length && (
        <div className="text-center mt-4">
          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-3 success-glow">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest">
              Bonus Unlocked
            </p>
          </div>
        </div>
      )}

      {/* Timeout overlay */}
      {finished && timeLeft === 0 && (
        <div className="text-center mt-4">
          <div className="inline-block bg-mission-red/10 border border-mission-red px-6 py-3">
            <p className="font-mono text-mission-red-light text-sm uppercase tracking-widest">
              Time&apos;s Up
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
