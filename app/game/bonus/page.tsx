"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGame } from "../layout";
import BonusPuzzle from "@/components/game/BonusPuzzle";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIME_LIMIT = 45;

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function BonusRoom() {
  const router = useRouter();
  const { addTokens } = useGame();
  const [result, setResult] = useState<"pending" | "success" | "timeout">("pending");
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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

  // Result animation
  useEffect(() => {
    if (result !== "pending" && resultRef.current) {
      gsap.fromTo(
        resultRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
      );
    }
  }, [result]);

  const handleComplete = useCallback(
    async (success: boolean) => {
      const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);

      if (success) {
        setResult("success");
        addTokens(1);

        try {
          await fetch("/api/game/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: "bonus",
              answer: "ARMAF ISLAND HEIST",
              timeSpentSec: timeSpent,
              skipped: false,
            }),
          });
        } catch {
          // Silent fail
        }
      } else {
        setResult("timeout");

        try {
          await fetch("/api/game/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: "bonus",
              answer: "timeout",
              timeSpentSec: timeSpent,
              skipped: false,
            }),
          });
        } catch {
          // Silent fail
        }
      }

      // Both paths navigate to /complete after 2s
      setTimeout(() => {
        router.push("/complete");
      }, 2000);
    },
    [roomStartTime, addTokens, router]
  );

  return (
    <div ref={containerRef} className="opacity-0">
      {/* Room Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red">
            Room 4 / 4 — Bonus Room
          </p>
          <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-mission-red/20 border border-mission-red text-mission-red-light rounded">
            Optional
          </span>
        </div>
        <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-widest text-mission-white mb-2">
          Floating Letters
        </h1>
        <p className="text-sm text-mission-white/50 font-mono max-w-md mx-auto">
          Click the floating letters in order to spell the secret phrase. Beat the clock!
        </p>
      </div>

      {/* Puzzle */}
      {result === "pending" && (
        <BonusPuzzle onComplete={handleComplete} timeLimit={TIME_LIMIT} />
      )}

      {/* Success state */}
      {result === "success" && (
        <div ref={resultRef} className="text-center space-y-4 opacity-0 mt-12">
          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-4">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest">
              Bonus Token Earned!
            </p>
          </div>
          <p className="font-mono text-mission-white text-lg tracking-widest">
            ARMAF ISLAND HEIST
          </p>
          <p className="text-xs text-mission-white/40 font-mono">
            Proceeding to mission debrief...
          </p>
        </div>
      )}

      {/* Timeout state */}
      {result === "timeout" && (
        <div ref={resultRef} className="text-center space-y-4 opacity-0 mt-12">
          <div className="inline-block bg-mission-red/10 border border-mission-red px-6 py-4">
            <p className="font-mono text-mission-red-light text-sm uppercase tracking-widest">
              Time Expired
            </p>
          </div>
          <p className="text-sm text-mission-white/50 font-mono">
            No penalty. Proceeding to mission debrief...
          </p>
        </div>
      )}
    </div>
  );
}
