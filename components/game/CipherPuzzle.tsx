"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import gsap from "gsap";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CipherPuzzleProps {
  onComplete: () => void;
  onSound: (name: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TARGET_PHRASE = "INTENSITY EVOLVES";
const TARGET_LETTERS = TARGET_PHRASE.replace(/\s/g, "").split(""); // 16 letters

// Fixed substitution cipher (deterministic)
const CIPHER_MAP: Record<string, string> = {
  I: "K", N: "P", T: "G", E: "W", S: "Q",
  Y: "J", V: "X", O: "Z", L: "F",
};

// Reverse lookup: cipher letter -> real letter
const REVERSE_MAP: Record<string, string> = {};
Object.entries(CIPHER_MAP).forEach(([real, cipher]) => {
  REVERSE_MAP[cipher] = real;
});

// Encode the target phrase
const ENCODED_LETTERS = TARGET_LETTERS.map((ch) => CIPHER_MAP[ch] || ch);

// Positions where the player must type (indices into TARGET_LETTERS, 0-based, no spaces)
const BLANK_INDICES = [0, 4, 7, 10, 14]; // I(0), N(4), I(7), E(10), V(14)

// Unique cipher letters in the full mapping
const ALL_CIPHER_ENTRIES = Object.entries(CIPHER_MAP); // [real, cipher]

// ~70% pre-revealed, ~30% hidden in decoder grid
// Unique letters in phrase: I, N, T, E, S, Y, V, O, L  (9 unique)
// Hide ~30% => hide 3: I(K), N(P), V(X). Reveal 6: T(G), E(W), S(Q), Y(J), O(Z), L(F)
const HIDDEN_REAL_LETTERS = new Set(["I", "N", "V"]);

const MAX_HINTS = 3;

/* ------------------------------------------------------------------ */
/*  Helper: build display chars with space tracking                    */
/* ------------------------------------------------------------------ */

function buildDisplayChars() {
  const chars: { char: string; isSpace: boolean; letterIndex: number }[] = [];
  let letterIdx = 0;
  for (const ch of TARGET_PHRASE) {
    if (ch === " ") {
      chars.push({ char: " ", isSpace: true, letterIndex: -1 });
    } else {
      chars.push({ char: ch, isSpace: false, letterIndex: letterIdx });
      letterIdx++;
    }
  }
  return chars;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CipherPuzzle({ onComplete, onSound }: CipherPuzzleProps) {
  const displayChars = useMemo(buildDisplayChars, []);

  // Player inputs: pre-filled for ~70%, empty for blanks
  const initialInputs = useMemo(() => {
    return TARGET_LETTERS.map((letter, i) =>
      BLANK_INDICES.includes(i) ? "" : letter
    );
  }, []);

  const [inputs, setInputs] = useState<string[]>(initialInputs);
  const [completed, setCompleted] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedHidden, setRevealedHidden] = useState<Set<string>>(new Set());
  const [typedMessage, setTypedMessage] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const letterBoxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const decoderGridRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  // Decoder grid entries: all unique letters used in phrase
  const decoderEntries = useMemo(() => {
    return ALL_CIPHER_ENTRIES.map(([real, cipher]) => ({
      real,
      cipher,
      isHidden: HIDDEN_REAL_LETTERS.has(real),
    }));
  }, []);

  /* ---- Mount animation ---- */
  useEffect(() => {
    const boxes = letterBoxRefs.current.filter(Boolean);
    if (boxes.length > 0) {
      gsap.fromTo(
        boxes,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: "power2.out" }
      );
    }
    if (decoderGridRef.current) {
      gsap.fromTo(
        decoderGridRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 }
      );
    }
  }, []);

  /* ---- Completion sequence ---- */
  const runCompletionSequence = useCallback(() => {
    const boxes = letterBoxRefs.current.filter(Boolean);
    // Flash all boxes green in sequence
    gsap.to(boxes, {
      borderColor: "#22c55e",
      duration: 0.15,
      stagger: 0.05,
      ease: "power1.inOut",
      onComplete: () => {
        gsap.to(boxes, {
          scale: 1.05,
          duration: 0.2,
          stagger: 0.04,
          yoyo: true,
          repeat: 1,
          ease: "power1.inOut",
        });
      },
    });

    // Typewriter "TRANSMISSION DECODED"
    const msg = "TRANSMISSION DECODED";
    let idx = 0;
    const typeInterval = setInterval(() => {
      idx++;
      setTypedMessage(msg.slice(0, idx));
      if (idx >= msg.length) clearInterval(typeInterval);
    }, 50);

    onSound("success");
    onComplete();
  }, [onComplete, onSound]);

  /* ---- Check completion ---- */
  const checkCompletion = useCallback(
    (currentInputs: string[]) => {
      if (completedRef.current) return;
      const allFilled = currentInputs.every((v) => v.length > 0);
      const allCorrect = currentInputs.every(
        (val, i) => val.toUpperCase() === TARGET_LETTERS[i]
      );
      if (allFilled && allCorrect) {
        completedRef.current = true;
        setCompleted(true);
        runCompletionSequence();
      }
    },
    [runCompletionSequence]
  );

  /* ---- Animate correct / incorrect ---- */
  const animateCorrect = useCallback((index: number) => {
    const box = letterBoxRefs.current[index];
    if (box) {
      gsap.fromTo(box, { scale: 1.2 }, { scale: 1, duration: 0.3, ease: "back.out(2)" });
    }
  }, []);

  const animateIncorrect = useCallback((index: number) => {
    const box = letterBoxRefs.current[index];
    if (box) {
      gsap.fromTo(
        box,
        { x: -6 },
        { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" }
      );
    }
  }, []);

  /* ---- Manual typing ---- */
  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!BLANK_INDICES.includes(index) || completedRef.current) return;
      const char = value.slice(-1).toUpperCase();
      if (!char) return;

      const isCorrect = char === TARGET_LETTERS[index];

      setInputs((prev) => {
        const next = [...prev];
        next[index] = char;
        setTimeout(() => checkCompletion(next), 0);
        return next;
      });

      if (isCorrect) {
        onSound("click");
        animateCorrect(index);
        // Auto-advance to next blank
        const blankOrder = BLANK_INDICES.filter((bi) => bi > index);
        for (const bi of blankOrder) {
          if (!inputs[bi] || bi === index) {
            inputRefs.current[bi]?.focus();
            break;
          }
        }
      } else {
        onSound("error");
        animateIncorrect(index);
      }
    },
    [checkCompletion, inputs, onSound, animateCorrect, animateIncorrect]
  );

  /* ---- Keyboard navigation ---- */
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace") {
        if (!inputs[index]) {
          // Move to previous blank
          const prevBlanks = BLANK_INDICES.filter((bi) => bi < index).reverse();
          for (const bi of prevBlanks) {
            inputRefs.current[bi]?.focus();
            break;
          }
        } else if (BLANK_INDICES.includes(index)) {
          setInputs((prev) => {
            const next = [...prev];
            next[index] = "";
            return next;
          });
        }
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        for (let i = index - 1; i >= 0; i--) {
          if (BLANK_INDICES.includes(i)) {
            inputRefs.current[i]?.focus();
            break;
          }
        }
      } else if (e.key === "ArrowRight") {
        for (let i = index + 1; i < TARGET_LETTERS.length; i++) {
          if (BLANK_INDICES.includes(i)) {
            inputRefs.current[i]?.focus();
            break;
          }
        }
      }
    },
    [inputs]
  );

  /* ---- Hint system ---- */
  const handleHint = useCallback(() => {
    if (hintsUsed >= MAX_HINTS || completedRef.current) return;

    // Find a hidden letter that hasn't been revealed yet
    const hiddenArr = Array.from(HIDDEN_REAL_LETTERS).filter(
      (l) => !revealedHidden.has(l)
    );
    if (hiddenArr.length === 0) return;

    const letterToReveal = hiddenArr[0];
    const cipherLetter = CIPHER_MAP[letterToReveal];

    setRevealedHidden((prev) => new Set([...prev, letterToReveal]));
    setHintsUsed((prev) => prev + 1);
    onSound("click");

    // Flash animation on the grid cell
    const cell = document.getElementById(`decoder-cell-${cipherLetter}`);
    if (cell) {
      gsap.fromTo(
        cell,
        { backgroundColor: "rgba(239, 68, 68, 0.5)", scale: 1.2 },
        { backgroundColor: "rgba(34, 197, 94, 0.2)", scale: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, [hintsUsed, revealedHidden, onSound]);

  /* ---- Letter status ---- */
  const getLetterStatus = (index: number, value: string): "correct" | "incorrect" | "empty" | "prefilled" => {
    if (!BLANK_INDICES.includes(index)) return "prefilled";
    if (!value) return "empty";
    return value.toUpperCase() === TARGET_LETTERS[index] ? "correct" : "incorrect";
  };

  /* ---- Progress ---- */
  const filledCorrect = inputs.filter(
    (v, i) => v.length > 0 && v.toUpperCase() === TARGET_LETTERS[i]
  ).length;
  const totalCount = TARGET_LETTERS.length;
  const progressPct = (filledCorrect / totalCount) * 100;

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* ---- DECODER GRID ---- */}
      <div ref={decoderGridRef}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-mission-white/60">
            Decoder Grid
          </h3>
          <button
            onClick={handleHint}
            disabled={hintsUsed >= MAX_HINTS || completed}
            className={`font-mono text-xs uppercase tracking-wider px-3 py-1.5 border transition-all duration-200
              ${hintsUsed >= MAX_HINTS || completed
                ? "border-mission-grey-light text-mission-white/20 cursor-not-allowed"
                : "border-mission-red text-mission-red hover:bg-mission-red/10 pulse-cta cursor-pointer"
              }`}
          >
            Decrypt Assist ({MAX_HINTS - hintsUsed})
          </button>
        </div>

        <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
          {decoderEntries.map(({ real, cipher, isHidden }) => {
            const isRevealed = !isHidden || revealedHidden.has(real);

            return (
              <div
                key={cipher}
                id={`decoder-cell-${cipher}`}
                className={`flex flex-col items-center p-1.5 sm:p-2 border font-mono text-center transition-all duration-300
                  ${isRevealed
                    ? "border-mission-green/40 bg-mission-green/5"
                    : "border-mission-red/60 bg-mission-red/5 error-glow"
                  }`}
              >
                <span className="text-[10px] sm:text-xs text-mission-white/40 leading-none">
                  {cipher}
                </span>
                <span className="text-xs sm:text-sm font-bold mt-0.5 leading-none">
                  {isRevealed ? (
                    <span className="text-mission-green">{real}</span>
                  ) : (
                    <span className="text-mission-red">?</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- ENCODED PHRASE ---- */}
      <div className="text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-mission-white/40 mb-2">
          Intercepted Transmission
        </p>
        <p className="font-mono text-base sm:text-lg tracking-[0.2em] text-mission-red-light">
          {ENCODED_LETTERS.join("")}
        </p>
      </div>

      {/* ---- INPUT BOXES ---- */}
      <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
        {displayChars.map((dc, i) => {
          if (dc.isSpace) {
            return <div key={`space-${i}`} className="w-4 sm:w-6" />;
          }

          const idx = dc.letterIndex;
          const value = inputs[idx] || "";
          const status = getLetterStatus(idx, value);
          const isBlank = BLANK_INDICES.includes(idx);
          const encodedChar = ENCODED_LETTERS[idx];

          let borderClass = "border-mission-grey-light";
          let textClass = "text-mission-white";
          let bgExtra = "";

          if (status === "prefilled") {
            borderClass = "border-mission-green/40";
            textClass = "text-mission-green";
            bgExtra = "bg-mission-green/5";
          } else if (status === "correct") {
            borderClass = "border-mission-green success-glow";
            textClass = "text-mission-green";
          } else if (status === "incorrect") {
            borderClass = "border-mission-red-light error-glow";
            textClass = "text-mission-red-light";
          } else {
            borderClass = "border-mission-grey-light focus-within:border-mission-red";
          }

          return (
            <div
              key={`char-${i}`}
              ref={(el) => { letterBoxRefs.current[idx] = el as HTMLDivElement; }}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-[9px] font-mono text-mission-white/30">
                {encodedChar}
              </span>
              <input
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                maxLength={1}
                value={value}
                readOnly={!isBlank || completed}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-8 h-10 sm:w-10 sm:h-12 text-center font-mono text-sm sm:text-base uppercase
                  bg-mission-grey border-2 ${borderClass} ${textClass} ${bgExtra}
                  focus:outline-none transition-all duration-200
                  ${!isBlank ? "cursor-default" : "cursor-text"}
                  ${completed ? "border-mission-green" : ""}`}
              />
            </div>
          );
        })}
      </div>

      {/* ---- PROGRESS BAR ---- */}
      <div className="max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-mission-white/40">Decoded</span>
          <span className="text-[10px] font-mono text-mission-white/40">
            <span className="text-mission-green">{filledCorrect}</span> / {totalCount}
          </span>
        </div>
        <div className="h-1.5 bg-mission-grey border border-mission-grey-light overflow-hidden">
          <div
            className="h-full bg-mission-green transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ---- COMPLETION MESSAGE ---- */}
      {completed && typedMessage && (
        <div className="text-center">
          <p className="font-mono text-mission-green text-sm sm:text-base tracking-widest">
            {typedMessage}
            <span className="animate-pulse">_</span>
          </p>
        </div>
      )}
    </div>
  );
}
