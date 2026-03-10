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
  const { addTokens, advanceRoom } = useGame();
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState("");
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Entry animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
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
    setHint(
      hasTimeBonus
        ? "Speed bonus earned. Legacy detected. The original was just the beginning."
        : "Legacy detected. The original was just the beginning."
    );

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
    <div ref={containerRef} className="opacity-0 flex flex-col" style={{ minHeight: "calc(100vh - 6rem)" }}>
      {/* Room Header */}
      <div className="text-center py-3 flex-shrink-0">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-1">
          Room 1 / 4 &mdash; Cipher Room
        </p>
        <p className="text-[11px] text-mission-white/50 font-mono max-w-lg mx-auto leading-relaxed px-4">
          Look around the room to find letter clues. Click a clue or type the
          letters to decode the message.
        </p>
      </div>

      {/* 3D Puzzle Area */}
      <div className="flex-1 min-h-0">
        <CipherPuzzle onComplete={handleComplete} />
      </div>

      {/* Success overlay */}
      {solved && (
        <div
          ref={successRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-mission-black/80 backdrop-blur-sm opacity-0"
        >
          <div className="text-center space-y-4 p-8">
            <div className="inline-block bg-mission-green/10 border border-mission-green px-8 py-5">
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
            <p className="text-xs text-mission-white/40 font-mono">
              Proceeding to Lock Room...
            </p>
          </div>
        </div>
      )}

      {/* Skip button */}
      {!solved && (
        <div className="flex-shrink-0 text-center py-3">
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
