"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface CipherPuzzleProps {
  encodedMessage: string;
  cipherKey: Record<string, string>; // partial mapping: encoded char -> decoded char
  onComplete: () => void;
}

const TARGET = "INTENSITY EVOLVES";

export default function CipherPuzzle({ encodedMessage, cipherKey, onComplete }: CipherPuzzleProps) {
  const targetLetters = TARGET.replace(/\s/g, "").split("");
  const [inputs, setInputs] = useState<string[]>(targetLetters.map(() => ""));
  const [completed, setCompleted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Build display structure: array of { encoded, isSpace, index (into targetLetters) }
  const displayChars: { encoded: string; isSpace: boolean; letterIndex: number }[] = [];
  let letterIdx = 0;
  for (let i = 0; i < encodedMessage.length; i++) {
    if (encodedMessage[i] === " ") {
      displayChars.push({ encoded: " ", isSpace: true, letterIndex: -1 });
    } else {
      displayChars.push({ encoded: encodedMessage[i], isSpace: false, letterIndex: letterIdx });
      letterIdx++;
    }
  }

  // Prefill known letters from partial cipher key
  useEffect(() => {
    const prefilled = targetLetters.map(() => "");
    let idx = 0;
    for (let i = 0; i < encodedMessage.length; i++) {
      if (encodedMessage[i] === " ") continue;
      const encodedChar = encodedMessage[i];
      if (cipherKey[encodedChar]) {
        prefilled[idx] = cipherKey[encodedChar];
      }
      idx++;
    }
    setInputs(prefilled);
  }, [encodedMessage, cipherKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkCompletion = useCallback(
    (currentInputs: string[]) => {
      const allCorrect = currentInputs.every(
        (val, i) => val.toUpperCase() === targetLetters[i]
      );
      if (allCorrect && currentInputs.every((v) => v.length > 0)) {
        setCompleted(true);
        onComplete();
      }
    },
    [targetLetters, onComplete]
  );

  const handleChange = useCallback(
    (index: number, value: string) => {
      const char = value.slice(-1).toUpperCase();
      setInputs((prev) => {
        const next = [...prev];
        next[index] = char;
        // Check after state update
        setTimeout(() => checkCompletion(next), 0);
        return next;
      });

      // Auto-advance to next empty input
      if (char) {
        for (let i = index + 1; i < targetLetters.length; i++) {
          // Skip pre-filled inputs
          const encodedIdx = findEncodedIndex(i);
          if (encodedIdx !== -1 && cipherKey[encodedMessage[encodedIdx]]) continue;
          inputRefs.current[i]?.focus();
          break;
        }
      }
    },
    [checkCompletion, targetLetters.length, cipherKey, encodedMessage]
  );

  // Find the position in encodedMessage (non-space chars) for a given letter index
  function findEncodedIndex(letterIndex: number): number {
    let count = 0;
    for (let i = 0; i < encodedMessage.length; i++) {
      if (encodedMessage[i] !== " ") {
        if (count === letterIndex) return i;
        count++;
      }
    }
    return -1;
  }

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !inputs[index]) {
        // Move to previous editable input
        for (let i = index - 1; i >= 0; i--) {
          const encodedIdx = findEncodedIndex(i);
          if (encodedIdx !== -1 && cipherKey[encodedMessage[encodedIdx]]) continue;
          inputRefs.current[i]?.focus();
          break;
        }
      } else if (e.key === "ArrowLeft") {
        for (let i = index - 1; i >= 0; i--) {
          inputRefs.current[i]?.focus();
          break;
        }
      } else if (e.key === "ArrowRight") {
        for (let i = index + 1; i < targetLetters.length; i++) {
          inputRefs.current[i]?.focus();
          break;
        }
      }
    },
    [inputs, cipherKey, encodedMessage, targetLetters.length] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const getLetterStatus = (index: number, value: string): "correct" | "incorrect" | "empty" => {
    if (!value) return "empty";
    return value.toUpperCase() === targetLetters[index] ? "correct" : "incorrect";
  };

  return (
    <div className="space-y-8">
      {/* Encoded message display */}
      <div className="text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50 mb-3">
          Encoded Transmission
        </p>
        <p className="font-mono text-2xl sm:text-3xl tracking-[0.2em] text-mission-red-light break-all">
          {encodedMessage}
        </p>
        <p className="text-xs font-mono text-mission-white/40 mt-3">
          Decoded so far:{" "}
          <span className="text-mission-green tracking-widest">
            {TARGET.split("").map((ch, i) => {
              if (ch === " ") return "  ";
              const letterIdx = TARGET.substring(0, i).replace(/\s/g, "").length;
              const val = inputs[letterIdx];
              return val ? val.toUpperCase() : "_ ";
            }).join("")}
          </span>
        </p>
      </div>

      {/* Partial cipher key reference */}
      <div className="bg-mission-grey/50 border border-mission-grey-light p-4">
        <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50 mb-3">
          Partial Key (Intel Recovered)
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {Object.entries(cipherKey).map(([from, to]) => (
            <span key={from} className="font-mono text-sm">
              <span className="text-mission-red">{from}</span>
              <span className="text-mission-white/40 mx-1">&rarr;</span>
              <span className="text-mission-green">{to}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Input grid */}
      <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
        {displayChars.map((char, i) => {
          if (char.isSpace) {
            return <div key={`space-${i}`} className="w-4 sm:w-6" />;
          }

          const idx = char.letterIndex;
          const value = inputs[idx] || "";
          const status = getLetterStatus(idx, value);
          const isPreFilled = !!cipherKey[char.encoded];

          const borderColor =
            status === "correct"
              ? "border-mission-green success-glow"
              : status === "incorrect"
              ? "border-mission-red-light error-glow"
              : "border-mission-grey-light focus:border-mission-red";

          return (
            <div key={`char-${i}`} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-mission-white/40">
                {char.encoded}
              </span>
              <input
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                maxLength={1}
                value={value}
                readOnly={isPreFilled}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-8 h-10 sm:w-10 sm:h-12 text-center font-mono text-lg uppercase bg-mission-grey border-2 ${borderColor} text-mission-white focus:outline-none transition-all duration-200 ${
                  isPreFilled ? "bg-mission-grey-light/50 text-mission-green cursor-default" : ""
                } ${completed ? "success-glow border-mission-green" : ""}`}
              />
            </div>
          );
        })}
      </div>

      {completed && (
        <div className="text-center animate-pulse">
          <p className="font-mono text-mission-green text-lg tracking-widest">
            TRANSMISSION DECODED
          </p>
        </div>
      )}
    </div>
  );
}
