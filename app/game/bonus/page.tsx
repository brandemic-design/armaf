"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGame } from "../layout";
import Button from "@/components/ui/Button";

const SCRAMBLED = "ARMAF ISLAND HEIST";
const ANSWER = "ARMAF ISLAND HEIST";
const SCRAMBLED_DISPLAY = "FMARA DINLAS TISEH";

export default function BonusRoom() {
  const router = useRouter();
  const { addTokens } = useGame();
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(45);
  const [solved, setSolved] = useState(false);
  const [expired, setExpired] = useState(false);
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const timerBarRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Entry animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
    }

    // Animate timer bar shrinking
    if (timerBarRef.current) {
      gsap.to(timerBarRef.current, {
        width: "0%",
        duration: 45,
        ease: "linear",
      });
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (solved || expired) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [solved, expired]);

  // Handle timeout
  useEffect(() => {
    if (expired && !solved) {
      const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);

      fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "bonus",
          answer: input,
          timeSpentSec: timeSpent,
          skipped: false,
        }),
      }).catch(() => {});

      setTimeout(() => {
        router.push("/complete");
      }, 2500);
    }
  }, [expired, solved, input, roomStartTime, router]);

  const handleSubmit = useCallback(async () => {
    const normalized = input.trim().toUpperCase();
    if (normalized === ANSWER) {
      setSolved(true);
      addTokens(1);

      const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);

      if (successRef.current) {
        gsap.fromTo(
          successRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
        );
      }

      try {
        await fetch("/api/game/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: "bonus",
            answer: normalized,
            timeSpentSec: timeSpent,
            skipped: false,
          }),
        });
      } catch {
        // Silent fail
      }

      setTimeout(() => {
        router.push("/complete");
      }, 2500);
    }
  }, [input, addTokens, roomStartTime, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isLow = timeLeft <= 10;

  return (
    <div ref={containerRef} className="opacity-0">
      {/* Room Header */}
      <div className="text-center mb-8">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-2">
          Bonus Room
        </p>
        <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-widest text-mission-white mb-2">
          Anagram Challenge
        </h1>
        <p className="text-sm text-mission-white/50 font-mono max-w-md mx-auto">
          Unscramble the letters before time runs out. Bonus intel awaits.
        </p>
      </div>

      {/* Timer bar */}
      <div className="w-full max-w-md mx-auto mb-8">
        <div className="flex justify-between text-xs font-mono mb-1">
          <span className="text-mission-white/50">Time Remaining</span>
          <span className={isLow ? "text-mission-red-light animate-pulse font-bold" : "text-mission-white"}>
            {timeLeft}s
          </span>
        </div>
        <div className="h-1 bg-mission-grey-light overflow-hidden">
          <div
            ref={timerBarRef}
            className={`h-full transition-colors ${isLow ? "bg-mission-red-light" : "bg-mission-red"}`}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {!solved && !expired && (
        <div className="max-w-md mx-auto space-y-6">
          {/* Scrambled word display */}
          <div className="text-center bg-mission-grey border border-mission-grey-light p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50 mb-3">
              Scrambled Phrase
            </p>
            <p className="font-mono text-2xl sm:text-3xl tracking-[0.15em] text-mission-red-light">
              {SCRAMBLED_DISPLAY}
            </p>
          </div>

          {/* Input */}
          <div className="space-y-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              autoFocus
              className="w-full bg-mission-grey border border-mission-grey-light px-4 py-3 text-sm text-mission-white font-mono placeholder:text-mission-white/30 focus:outline-none focus:border-mission-red transition-colors text-center uppercase tracking-widest"
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              className="w-full"
            >
              Submit Answer
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
      {solved && (
        <div ref={successRef} className="text-center space-y-4 opacity-0">
          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-4">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest">
              Bonus Token Earned!
            </p>
          </div>
          <p className="font-mono text-mission-white text-lg tracking-widest">
            {ANSWER}
          </p>
          <p className="text-xs text-mission-white/40 font-mono">
            Proceeding to mission debrief...
          </p>
        </div>
      )}

      {/* Timeout state */}
      {expired && !solved && (
        <div className="text-center space-y-4">
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
