"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGame } from "../layout";
import LockGrid from "@/components/game/LockGrid";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

/** Generate a random pattern of 6 unique cell indices (0-15). */
function generatePattern(): number[] {
  const indices = Array.from({ length: 16 }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, 6);
}

export default function LockRoom() {
  const router = useRouter();
  const { addTokens, advanceRoom, playSound } = useGame();

  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [phase, setPhase] = useState<"showing" | "hidden" | "result">("showing");
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [roomStartTime] = useState(Date.now());

  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const unlockedTextRef = useRef<HTMLDivElement>(null);

  const pattern = useMemo(() => generatePattern(), []);

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

  // Phase management: showing -> hidden after the sequence plays out
  useEffect(() => {
    if (phase !== "showing") return;

    const showDuration = pattern.length * 600 + 800;
    const timer = setTimeout(() => {
      setPhase("hidden");
      setPlayerSequence([]);
    }, showDuration);

    return () => clearTimeout(timer);
  }, [phase, pattern.length]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (phase !== "hidden") return;
      setPlayerSequence((prev) => [...prev, index]);
    },
    [phase]
  );

  const handleSound = useCallback(
    (sound: "click" | "success" | "error" | "lock-open") => {
      playSound(sound);
    },
    [playSound]
  );

  const handleComplete = useCallback(
    async (success: boolean) => {
      setPhase("result");

      if (success) {
        setSolved(true);
        const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);
        const tokensEarned = timeSpent < 60 ? 2 : 1;

        addTokens(tokensEarned);

        // Success overlay animation
        setTimeout(() => {
          if (successRef.current) {
            gsap.fromTo(
              successRef.current,
              { opacity: 0, scale: 0.8 },
              { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
            );
          }
          if (unlockedTextRef.current) {
            gsap.fromTo(
              unlockedTextRef.current,
              { opacity: 0, scale: 0.5 },
              { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(2)" }
            );
          }
        }, 100);

        try {
          await fetch("/api/game/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: "lock",
              answer: pattern.map(String),
              timeSpentSec: timeSpent,
              skipped: false,
            }),
          });
        } catch {
          // Silent fail
        }

        setTimeout(() => {
          advanceRoom();
          router.push("/game/coordinates");
        }, 3000);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 3) {
          setFailed(true);
        } else {
          // Replay showing phase after brief delay
          setTimeout(() => {
            setPlayerSequence([]);
            setPhase("showing");
          }, 1000);
        }
      }
    },
    [pattern, roomStartTime, addTokens, advanceRoom, router, attempts]
  );

  const handleRetry = useCallback(() => {
    setAttempts(0);
    setFailed(false);
    setPlayerSequence([]);
    setPhase("showing");
  }, []);

  const handleSkip = useCallback(async () => {
    setShowSkipModal(false);
    addTokens(-1);
    const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);

    try {
      await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "lock",
          answer: null,
          timeSpentSec: timeSpent,
          skipped: true,
        }),
      });
    } catch {
      // Silent fail
    }

    advanceRoom();
    router.push("/game/coordinates");
  }, [addTokens, advanceRoom, roomStartTime, router]);

  return (
    <div ref={containerRef} className="opacity-0">
      {/* Room Header */}
      <div className="text-center mb-6">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-2">
          Room 2 / 4 &mdash; Lock Room
        </p>
        <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-widest text-mission-white mb-2">
          Lock Room
        </h1>
        <p className="text-sm text-mission-white/50 font-mono max-w-md mx-auto">
          Watch the sequence. Repeat it to open the vault.
        </p>
      </div>

      {/* Attempts indicator — 3 lock icons */}
      <div className="flex justify-center items-center gap-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-colors duration-300 ${
                i < attempts ? "text-mission-red-light" : "text-mission-grey-light"
              }`}
            >
              {i < attempts ? (
                <>
                  {/* Open lock (used attempt) */}
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </>
              ) : (
                <>
                  {/* Closed lock (remaining attempt) */}
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              )}
            </svg>
          </div>
        ))}
        <span className="text-xs font-mono text-mission-white/40 ml-2">
          {3 - attempts} attempt{3 - attempts !== 1 ? "s" : ""} left
        </span>
      </div>

      {/* Phase indicator */}
      {!solved && !failed && (
        <div className="text-center mb-4">
          <p className="font-mono text-xs uppercase tracking-widest text-mission-white/40">
            {phase === "showing"
              ? "Memorize the sequence..."
              : phase === "hidden"
              ? "Your turn — click the cells in order"
              : "Verifying..."}
          </p>
        </div>
      )}

      {/* Lock Grid */}
      {!solved && !failed && (
        <LockGrid
          pattern={pattern}
          onComplete={handleComplete}
          attempts={attempts}
          phase={phase}
          onCellClick={handleCellClick}
          playerSequence={playerSequence}
          onSound={handleSound}
        />
      )}

      {/* Failure state */}
      {failed && !solved && (
        <div className="text-center space-y-6 mt-8">
          <div className="bg-mission-red/10 border border-mission-red p-6 rounded-lg error-glow">
            <p className="font-mono text-mission-red-light text-sm uppercase tracking-widest mb-2">
              Access Denied
            </p>
            <p className="text-sm text-mission-white/60">
              3 failed attempts. You may retry for free or skip this room.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              Retry (Free)
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSkipModal(true)}>
              Skip (-1 Token)
            </Button>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {solved && (
        <div ref={successRef} className="text-center space-y-4 mt-8 opacity-0">
          {/* Animated UNLOCKED text */}
          <div ref={unlockedTextRef} className="opacity-0">
            <p className="font-mono text-3xl sm:text-4xl uppercase tracking-[0.3em] text-green-400 success-glow mb-4">
              Unlocked
            </p>
          </div>

          <div className="relative inline-block">
            <div className="w-24 h-24 border-4 border-green-500 rounded-full flex items-center justify-center mx-auto mb-4 success-glow">
              <svg
                className="w-12 h-12 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <div className="inline-block bg-green-500/10 border border-green-500 px-6 py-4 rounded-lg">
            <p className="font-mono text-green-400 text-sm uppercase tracking-widest">
              Vault Opened &mdash; Intel Token Earned
            </p>
          </div>

          <p className="text-sm text-mission-white/50 font-mono">
            Partial coordinates recovered:{" "}
            <span className="text-mission-red-light">25.20&deg; N, 55.27&deg; E</span>
          </p>
          <p className="text-xs text-mission-white/40 font-mono">
            Proceeding to Coordinates Room...
          </p>
        </div>
      )}

      {/* Skip modal */}
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
