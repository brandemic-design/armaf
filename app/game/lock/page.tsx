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
  const shuffled = indices.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}

export default function LockRoom() {
  const router = useRouter();
  const { addTokens, advanceRoom } = useGame();
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [phase, setPhase] = useState<"showing" | "hidden" | "result">("showing");
  const [coordinates, setCoordinates] = useState("");
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

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

    // Total showing time = pattern.length * 600ms + 800ms buffer
    const showDuration = pattern.length * 600 + 800;
    const timer = setTimeout(() => {
      setPhase("hidden");
    }, showDuration);

    return () => clearTimeout(timer);
  }, [phase, pattern.length]);

  const handleComplete = useCallback(
    async (success: boolean) => {
      setPhase("result");

      if (success) {
        setSolved(true);
        const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);
        const tokensEarned = timeSpent < 60 ? 2 : 1;

        addTokens(tokensEarned);
        setCoordinates("25.20\u00b0 N, 55.27\u00b0 E");

        // Success animation
        setTimeout(() => {
          if (successRef.current) {
            gsap.fromTo(
              successRef.current,
              { opacity: 0, scale: 0.8 },
              { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
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
          // Reset for next attempt after a brief delay
          setTimeout(() => {
            setPhase("showing");
          }, 1500);
        }
      }
    },
    [pattern, roomStartTime, addTokens, advanceRoom, router, attempts]
  );

  const handleRetry = useCallback(() => {
    setAttempts(0);
    setFailed(false);
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
          Room 2 / 4
        </p>
        <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-widest text-mission-white mb-2">
          Lock Room
        </h1>
        <p className="text-sm text-mission-white/50 font-mono max-w-md mx-auto">
          Watch the sequence. Repeat it to open the vault.
        </p>
      </div>

      {/* Attempts indicator */}
      <div className="flex justify-center items-center gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border transition-colors duration-300 ${
              i < attempts
                ? "bg-mission-red-light border-mission-red-light"
                : "bg-transparent border-mission-grey-light"
            }`}
          />
        ))}
        <span className="text-xs font-mono text-mission-white/40 ml-2">
          {3 - attempts} attempt{3 - attempts !== 1 ? "s" : ""} remaining
        </span>
      </div>

      {/* Phase indicator */}
      {!solved && !failed && (
        <div className="text-center mb-2">
          <p className="font-mono text-xs uppercase tracking-widest text-mission-white/40">
            {phase === "showing"
              ? "Memorize the sequence..."
              : phase === "hidden"
              ? "Your turn \u2014 click the buttons in order"
              : "Verifying..."}
          </p>
        </div>
      )}

      {/* 3D Vault Scene */}
      {!solved && !failed && (
        <LockGrid
          pattern={pattern}
          onComplete={handleComplete}
          attempts={attempts}
          phase={phase}
        />
      )}

      {/* Failure state */}
      {failed && !solved && (
        <div className="text-center space-y-6 mt-8">
          <div className="bg-mission-red/10 border border-mission-red p-6">
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
          <div className="relative inline-block">
            <div className="w-24 h-24 border-4 border-mission-green rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-mission-green"
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
          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-4">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest">
              Vault Opened — Intel Token Earned
            </p>
          </div>
          <p className="text-sm text-mission-white/50 font-mono">
            Partial coordinates recovered:{" "}
            <span className="text-mission-red-light">{coordinates}</span>
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
