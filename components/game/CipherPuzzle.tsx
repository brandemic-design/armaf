"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CipherPuzzleProps {
  onComplete: () => void;
}

interface CluePanel {
  id: number;
  from: string;       // cipher letter (what appears in the encoded message)
  to: string;         // real letter (what the player needs)
  position: [number, number, number];
  rotation: [number, number, number];
  isNeeded: boolean;   // true = required for an answer blank, false = decoy
  floatSpeed: number;
  floatIntensity: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TARGET_PHRASE = "INTENSITY EVOLVES";
const TARGET_LETTERS = TARGET_PHRASE.replace(/\s/g, "").split(""); // 16 letters

// Fixed substitution cipher (deterministic so the 3D panels are stable)
const CIPHER_MAP: Record<string, string> = {
  I: "K", N: "P", T: "G", E: "W", S: "Q",
  Y: "J", V: "X", O: "Z", L: "F", A: "U",
};
// Reverse: K→I, P→N, G→T, W→E, Q→S, J→Y, X→V, Z→O, F→L, U→A
const REVERSE_MAP: Record<string, string> = {};
Object.entries(CIPHER_MAP).forEach(([real, cipher]) => {
  REVERSE_MAP[cipher] = real;
});

// Encode the target phrase
const ENCODED_PHRASE = TARGET_PHRASE
  .split("")
  .map((ch) => (ch === " " ? " " : CIPHER_MAP[ch] || ch))
  .join("");

// Decide which positions are pre-filled (~70%) and which are blanks (~30%)
// We pick specific indices to leave blank — these are the ones the player must find
const BLANK_INDICES = [0, 4, 7, 10, 14]; // I(0), N(4), I(7), E(10), V(14)
// letters at those positions: I, N, I, E, V → cipher letters: K, Q, K, W, X

// Unique cipher letters needed for the blanks
const NEEDED_CIPHER_LETTERS = [...new Set(BLANK_INDICES.map((i) => {
  const realLetter = TARGET_LETTERS[i];
  return CIPHER_MAP[realLetter];
}))]; // K, Q, W, X

// Decoy cipher mappings (not needed for the answer)
const DECOY_MAPPINGS: [string, string][] = [
  ["R", "D"], ["H", "B"], ["C", "A"], ["M", "Y"],
];

/* ------------------------------------------------------------------ */
/*  3D Scene (loaded dynamically — no SSR)                             */
/* ------------------------------------------------------------------ */

const CipherScene = dynamic(() => import("./CipherScene"), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CipherPuzzle({ onComplete }: CipherPuzzleProps) {
  // Build the answer state: pre-filled for ~70%, empty for blanks
  const initialInputs = useMemo(() => {
    return TARGET_LETTERS.map((letter, i) =>
      BLANK_INDICES.includes(i) ? "" : letter
    );
  }, []);

  const [inputs, setInputs] = useState<string[]>(initialInputs);
  const [completed, setCompleted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Build clue panels for the 3D scene
  const panels: CluePanel[] = useMemo(() => {
    const result: CluePanel[] = [];
    let id = 0;

    // Panels for needed letters
    const neededPositions: [number, number, number][] = [
      [-5, 3, -4],
      [6, 1, -6],
      [-3, -1, -7],
      [4, 4, -3],
    ];
    const neededRotations: [number, number, number][] = [
      [0, 0.3, 0.1],
      [0.1, -0.2, 0],
      [0, 0.5, -0.1],
      [-0.1, -0.4, 0.1],
    ];

    NEEDED_CIPHER_LETTERS.forEach((cipher, i) => {
      result.push({
        id: id++,
        from: cipher,
        to: REVERSE_MAP[cipher],
        position: neededPositions[i % neededPositions.length],
        rotation: neededRotations[i % neededRotations.length],
        isNeeded: true,
        floatSpeed: 1.5 + Math.random(),
        floatIntensity: 0.4 + Math.random() * 0.3,
      });
    });

    // Decoy panels
    const decoyPositions: [number, number, number][] = [
      [2, -2, -5],
      [-7, 2, -2],
      [0, 4.5, -8],
      [7, -1, -4],
      [-1, -2.5, -6],
      [5, 3, -7],
    ];
    const decoyRotations: [number, number, number][] = [
      [0, -0.6, 0],
      [0.2, 0.1, 0],
      [0, 0.4, 0.2],
      [-0.1, -0.3, 0],
      [0.1, 0.2, -0.1],
      [0, -0.5, 0.1],
    ];

    DECOY_MAPPINGS.forEach(([from, to], i) => {
      result.push({
        id: id++,
        from,
        to,
        position: decoyPositions[i % decoyPositions.length],
        rotation: decoyRotations[i % decoyRotations.length],
        isNeeded: false,
        floatSpeed: 1 + Math.random(),
        floatIntensity: 0.3 + Math.random() * 0.2,
      });
    });

    return result;
  }, []);

  // Check completion
  const checkCompletion = useCallback(
    (currentInputs: string[]) => {
      const allCorrect = currentInputs.every(
        (val, i) => val.toUpperCase() === TARGET_LETTERS[i]
      );
      if (allCorrect && currentInputs.every((v) => v.length > 0)) {
        setCompleted(true);
        onComplete();
      }
    },
    [onComplete]
  );

  // When a 3D panel is clicked, auto-fill corresponding blanks
  const handlePanelClick = useCallback(
    (cipherLetter: string, realLetter: string) => {
      setInputs((prev) => {
        const next = [...prev];
        BLANK_INDICES.forEach((bi) => {
          const targetReal = TARGET_LETTERS[bi];
          if (targetReal === realLetter && !next[bi]) {
            next[bi] = realLetter;
          }
        });
        setTimeout(() => checkCompletion(next), 0);
        return next;
      });
    },
    [checkCompletion]
  );

  // Manual typing
  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!BLANK_INDICES.includes(index)) return; // can't edit pre-filled
      const char = value.slice(-1).toUpperCase();
      setInputs((prev) => {
        const next = [...prev];
        next[index] = char;
        setTimeout(() => checkCompletion(next), 0);
        return next;
      });

      // Auto-advance to next blank
      if (char) {
        for (let i = index + 1; i < TARGET_LETTERS.length; i++) {
          if (BLANK_INDICES.includes(i) && !inputs[i]) {
            inputRefs.current[i]?.focus();
            break;
          }
        }
      }
    },
    [checkCompletion, inputs]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !inputs[index]) {
        for (let i = index - 1; i >= 0; i--) {
          if (BLANK_INDICES.includes(i)) {
            inputRefs.current[i]?.focus();
            break;
          }
        }
      } else if (e.key === "ArrowLeft") {
        for (let i = index - 1; i >= 0; i--) {
          inputRefs.current[i]?.focus();
          break;
        }
      } else if (e.key === "ArrowRight") {
        for (let i = index + 1; i < TARGET_LETTERS.length; i++) {
          inputRefs.current[i]?.focus();
          break;
        }
      }
    },
    [inputs]
  );

  const getLetterStatus = (index: number, value: string): "correct" | "incorrect" | "empty" | "prefilled" => {
    if (!BLANK_INDICES.includes(index)) return "prefilled";
    if (!value) return "empty";
    return value.toUpperCase() === TARGET_LETTERS[index] ? "correct" : "incorrect";
  };

  // Progress
  const filledCount = inputs.filter((v) => v.length > 0).length;
  const totalCount = TARGET_LETTERS.length;

  // Build display chars with space handling
  const displayChars: { char: string; isSpace: boolean; letterIndex: number }[] = [];
  let letterIdx = 0;
  for (const ch of TARGET_PHRASE) {
    if (ch === " ") {
      displayChars.push({ char: " ", isSpace: true, letterIndex: -1 });
    } else {
      displayChars.push({ char: ch, isSpace: false, letterIndex: letterIdx });
      letterIdx++;
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 3D Canvas Area */}
      <div className="relative flex-shrink-0" style={{ height: "50vh" }}>
        <CipherScene panels={panels} onPanelClick={handlePanelClick} />

        {/* Subtle vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,10,10,0.7) 100%)",
          }}
        />
      </div>

      {/* Answer Panel (2D overlay at bottom) */}
      <div className="flex-1 bg-mission-black/95 backdrop-blur border-t border-mission-grey-light px-4 py-4 overflow-auto">
        {/* Encoded reference */}
        <div className="text-center mb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-mission-white/40 mb-1">
            Encoded Transmission
          </p>
          <p className="font-mono text-base sm:text-lg tracking-[0.15em] text-mission-red-light">
            {ENCODED_PHRASE}
          </p>
        </div>

        {/* Letter boxes */}
        <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 mb-3">
          {displayChars.map((dc, i) => {
            if (dc.isSpace) {
              return <div key={`space-${i}`} className="w-3 sm:w-5" />;
            }

            const idx = dc.letterIndex;
            const value = inputs[idx] || "";
            const status = getLetterStatus(idx, value);
            const isBlank = BLANK_INDICES.includes(idx);
            const encodedChar = ENCODED_PHRASE.replace(/\s/g, "")[idx];

            let borderClass = "border-mission-grey-light";
            let textClass = "text-mission-white";

            if (status === "prefilled") {
              borderClass = "border-mission-green/40";
              textClass = "text-mission-green";
            } else if (status === "correct") {
              borderClass = "border-mission-green";
              textClass = "text-mission-green";
            } else if (status === "incorrect") {
              borderClass = "border-mission-red-light";
              textClass = "text-mission-red-light";
            } else {
              borderClass = "border-mission-grey-light focus-within:border-mission-red";
            }

            return (
              <div key={`char-${i}`} className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-mono text-mission-white/30">
                  {encodedChar}
                </span>
                <input
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={value}
                  readOnly={!isBlank}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-7 h-9 sm:w-9 sm:h-11 text-center font-mono text-sm sm:text-base uppercase
                    bg-mission-grey border-2 ${borderClass} ${textClass}
                    focus:outline-none transition-all duration-200
                    ${!isBlank ? "bg-mission-grey-light/30 cursor-default" : ""}
                    ${completed ? "border-mission-green" : ""}`}
                />
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="text-center">
          <p className="text-[10px] font-mono text-mission-white/40">
            Decoded: <span className="text-mission-green">{filledCount}</span> / {totalCount}
          </p>
        </div>

        {completed && (
          <div className="text-center mt-2 animate-pulse">
            <p className="font-mono text-mission-green text-sm tracking-widest">
              TRANSMISSION DECODED
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
