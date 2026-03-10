"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGame } from "../layout";
import CipherPuzzle from "@/components/game/CipherPuzzle";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const TARGET_PHRASE = "INTENSITY EVOLVES";

export default function CipherRoom() {
  const router = useRouter();
  const { addTokens, advanceRoom, playSound } = useGame();
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState("");
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Entry animation
  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current;
      gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
      // Stagger-animate child sections
      const sections = el.querySelectorAll("[data-animate]");
      if (sections.length > 0) {
        gsap.fromTo(
          sections,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.15, delay: 0.3, ease: "power2.out" }
        );
      }
    }
  }, []);

  const handleSound = useCallback(
    (name: string) => {
      playSound(name);
    },
    [playSound]
  );

  const handleComplete = useCallback(async () => {
    setSolved(true);
    const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);
    const hasTimeBonus = timeSpent < 90;
    const tokensEarned = hasTimeBonus ? 2 : 1;

    addTokens(tokensEarned);
    setHint(
      hasTimeBonus
        ? `Speed bonus earned (+${tokensEarned} tokens). Legacy detected. The original was just the beginning.`
        : "Legacy detected. The original was just the beginning."
    );

    // Success overlay animation
    requestAnimationFrame(() => {
      if (successRef.current) {
        gsap.fromTo(
          successRef.current,
          { opacity: 0, scale: 0.85 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
        );
      }
    });

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
    playSound("click");
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
  }, [addTokens, advanceRoom, roomStartTime, router, playSound]);

  return (
    <div
      ref={containerRef}
      className="opacity-0 flex flex-col gap-6"
      style={{ minHeight: "calc(100vh - 6rem)" }}
    >
      {/* Room Header */}
      <div data-animate className="text-center py-4 flex-shrink-0">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-2">
          Room 1 / 4 &mdash; Cipher Room
        </p>
        <p className="text-[11px] text-mission-white/50 font-mono max-w-lg mx-auto leading-relaxed px-4">
          Each letter has been substituted. Use the decoder grid to crack the transmission.
        </p>
      </div>

      {/* Scanline overlay for atmosphere */}
      <div className="scanline-overlay pointer-events-none fixed inset-0 z-10" />

      {/* Puzzle Area */}
      <div data-animate className="flex-1 min-h-0 px-2 sm:px-0">
        <CipherPuzzle onComplete={handleComplete} onSound={handleSound} />
      </div>

      {/* Success overlay */}
      {solved && (
        <div
          ref={successRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-mission-black/85 backdrop-blur-sm opacity-0"
        >
          <div className="text-center space-y-4 p-8">
            <div className="inline-block bg-mission-green/10 border border-mission-green px-8 py-5 success-glow">
              <p className="font-mono text-mission-green text-lg uppercase tracking-widest">
                Transmission Decoded
              </p>
              <p className="font-mono text-mission-green/70 text-sm mt-1">
                Intel Token Earned
              </p>
            </div>
            <p className="text-sm text-mission-white/70 font-mono italic max-w-sm mx-auto">
              {hint}
            </p>
            <p className="text-xs text-mission-white/40 font-mono animate-pulse">
              Proceeding to Lock Room...
            </p>
          </div>
        </div>
      )}

      {/* Skip button */}
      {!solved && (
        <div data-animate className="flex-shrink-0 text-center py-3">
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
