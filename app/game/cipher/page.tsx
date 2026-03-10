"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGame } from "../layout";
import CipherPuzzle from "@/components/game/CipherPuzzle";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const TARGET_PHRASE = "INTENSITY EVOLVES";

/** Generate a substitution cipher: each unique letter maps to a different letter. */
function generateSubstitutionCipher() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const shuffled = [...alphabet];

  // Fisher-Yates shuffle ensuring no letter maps to itself
  for (let i = shuffled.length - 1; i > 0; i--) {
    let j: number;
    do {
      j = Math.floor(Math.random() * (i + 1));
    } while (shuffled[j] === alphabet[i] || shuffled[i] === alphabet[j]);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const fullKey: Record<string, string> = {};
  alphabet.forEach((letter, i) => {
    fullKey[letter] = shuffled[i];
  });

  return fullKey;
}

function encodeMessage(message: string, key: Record<string, string>): string {
  return message
    .split("")
    .map((ch) => {
      if (ch === " ") return " ";
      return key[ch] || ch;
    })
    .join("");
}

function buildPartialKey(
  encoded: string,
  fullKey: Record<string, string>,
  revealRatio: number
): Record<string, string> {
  // fullKey maps original -> encoded. We need reverseKey: encoded -> original
  const reverseKey: Record<string, string> = {};
  Object.entries(fullKey).forEach(([orig, enc]) => {
    reverseKey[enc] = orig;
  });

  // Get unique encoded letters in the message
  const uniqueEncoded = [...new Set(encoded.replace(/\s/g, "").split(""))];
  const revealCount = Math.ceil(uniqueEncoded.length * revealRatio);

  // Shuffle and pick
  const shuffled = [...uniqueEncoded].sort(() => Math.random() - 0.5);
  const partial: Record<string, string> = {};
  for (let i = 0; i < revealCount; i++) {
    partial[shuffled[i]] = reverseKey[shuffled[i]];
  }

  return partial;
}

export default function CipherRoom() {
  const router = useRouter();
  const { addTokens, advanceRoom, getElapsedSeconds } = useGame();
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState("");
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentPartialKey, setCurrentPartialKey] = useState<Record<string, string>>({});

  // Generate cipher once on mount
  const { encoded, partialKey, fullKey } = useMemo(() => {
    const fullKey = generateSubstitutionCipher();
    const enc = encodeMessage(TARGET_PHRASE, fullKey);
    const partial = buildPartialKey(enc, fullKey, 0.7);
    return { encoded: enc, partialKey: partial, fullKey };
  }, []);

  // Initialize current partial key
  useEffect(() => {
    setCurrentPartialKey(partialKey);
  }, [partialKey]);

  // Reveal one more letter as a hint
  const revealHint = useCallback(() => {
    const reverseKey: Record<string, string> = {};
    Object.entries(fullKey).forEach(([orig, enc]) => {
      reverseKey[enc] = orig;
    });

    const unrevealed = encoded
      .replace(/\s/g, "")
      .split("")
      .filter((ch, i, arr) => arr.indexOf(ch) === i && !currentPartialKey[ch]);

    if (unrevealed.length > 0) {
      const next = unrevealed[0];
      setCurrentPartialKey((prev) => ({ ...prev, [next]: reverseKey[next] }));
      setHintsUsed((h) => h + 1);
    }
  }, [encoded, fullKey, currentPartialKey]);

  // Entry animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
    }
  }, []);

  const handleComplete = useCallback(async () => {
    setSolved(true);
    const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);
    const hasTimeBonus = timeSpent < 90;
    const tokensEarned = hasTimeBonus ? 2 : 1;

    addTokens(tokensEarned);
    setHint("Legacy detected. The original was just the beginning.");

    // Success animation
    if (successRef.current) {
      gsap.fromTo(
        successRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
      );
    }

    // POST result
    try {
      await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "cipher",
          answer: TARGET_PHRASE,
          timeSpentSec: timeSpent,
          skipped: false,
        }),
      });
    } catch {
      // Silent fail for submission; game continues client-side
    }

    // Navigate after delay
    setTimeout(() => {
      advanceRoom();
      router.push("/game/lock");
    }, 3000);
  }, [roomStartTime, addTokens, advanceRoom, router]);

  const handleSkip = useCallback(async () => {
    setShowSkipModal(false);
    addTokens(-1);
    const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);

    try {
      await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "cipher",
          answer: null,
          timeSpentSec: timeSpent,
          skipped: true,
        }),
      });
    } catch {
      // Silent fail
    }

    advanceRoom();
    router.push("/game/lock");
  }, [addTokens, advanceRoom, roomStartTime, router]);

  return (
    <div ref={containerRef} className="opacity-0">
      {/* Room Header */}
      <div className="text-center mb-8">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-2">
          Room 1 / 4
        </p>
        <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-widest text-mission-white mb-2">
          Cipher Room
        </h1>
        <p className="text-sm text-mission-white/50 font-mono max-w-md mx-auto">
          A scrambled transmission has been intercepted. Each symbol stands for a letter.
          The key below shows which symbols map to which letters — fill in the remaining blanks.
        </p>
      </div>

      {/* How to play */}
      <div className="bg-mission-grey/30 border border-mission-grey-light px-4 py-3 mb-2 max-w-md mx-auto">
        <p className="text-xs font-mono text-mission-white/60 leading-relaxed">
          <span className="text-mission-red">HOW TO PLAY:</span> Look at the
          <span className="text-mission-red-light"> encoded letters</span> above each box.
          Use the <span className="text-mission-green">key table</span> to find what each one
          decodes to. Type the real letter in each empty box.
          Green letters are already solved for you.
        </p>
      </div>

      {/* Puzzle */}
      <CipherPuzzle
        encodedMessage={encoded}
        cipherKey={currentPartialKey}
        onComplete={handleComplete}
      />

      {/* Hint button */}
      {!solved && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={revealHint}
            disabled={hintsUsed >= 3}
          >
            {hintsUsed >= 3 ? "No hints left" : `Reveal a Letter (${3 - hintsUsed} left)`}
          </Button>
        </div>
      )}

      {/* Success overlay */}
      {solved && (
        <div ref={successRef} className="mt-8 text-center space-y-4 opacity-0">
          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-4">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest">
              Intel Token Earned
            </p>
          </div>
          <p className="text-sm text-mission-white/70 font-mono italic">
            {hint}
          </p>
          <p className="text-xs text-mission-white/40 font-mono">
            Proceeding to Lock Room...
          </p>
        </div>
      )}

      {/* Skip button */}
      {!solved && (
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkipModal(true)}
          >
            Skip (-1 Token)
          </Button>
        </div>
      )}

      {/* Skip confirmation modal */}
      <Modal open={showSkipModal} onClose={() => setShowSkipModal(false)}>
        <div className="text-center space-y-4">
          <p className="font-mono text-sm uppercase tracking-widest text-mission-red">
            Confirm Skip
          </p>
          <p className="text-sm text-mission-white/70">
            Skipping this room will cost you 1 Intel Token. Continue?
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" size="sm" onClick={() => setShowSkipModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSkip}>
              Skip Room
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
