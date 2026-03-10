"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGame } from "../layout";
import CoordinatesMap from "@/components/game/CoordinatesMap";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

/* ------------------------------------------------------------------ */
/*  Hint Data                                                          */
/* ------------------------------------------------------------------ */

const HINTS = [
  {
    id: "hint-1",
    description: "Towering statue of freedom",
    icon: "\u{1F5FD}",
    correctCountry: "United States",
  },
  {
    id: "hint-2",
    description: "Desert towers of gold",
    icon: "\u{1F54C}",
    correctCountry: "UAE",
  },
  {
    id: "hint-3",
    description: "Iron lattice reaching the sky",
    icon: "\u{1F5FC}",
    correctCountry: "France",
  },
  {
    id: "hint-4",
    description: "Ancient colosseum of warriors",
    icon: "\u{1F3AD}",
    correctCountry: "Italy",
  },
];

const COUNTRY_OPTIONS = ["United States", "UAE", "France", "Italy"];

/* ------------------------------------------------------------------ */
/*  Coordinates lookup by country code                                 */
/* ------------------------------------------------------------------ */

const COORDS_MAP: Record<string, { coords: string; country: string }> = {
  US: { coords: "40.6892\u00b0 N, 74.0445\u00b0 W", country: "United States" },
  AE: { coords: "25.2048\u00b0 N, 55.2708\u00b0 E", country: "United Arab Emirates" },
  FR: { coords: "48.8584\u00b0 N, 2.2945\u00b0 E", country: "France" },
  IT: { coords: "41.8902\u00b0 N, 12.4922\u00b0 E", country: "Italy" },
};

const DEFAULT_COORDS = { coords: "25.2048\u00b0 N, 55.2708\u00b0 E", country: "United Arab Emirates" };

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CoordinatesRoom() {
  const router = useRouter();
  const { addTokens, advanceRoom, getElapsedSeconds, playSound } = useGame();
  const [solved, setSolved] = useState(false);
  const [mapCoords, setMapCoords] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Shuffle countries once on mount
  const shuffledCountries = useMemo(
    () => [...COUNTRY_OPTIONS].sort(() => Math.random() - 0.5),
    []
  );

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
    if (solved) return;
    setSolved(true);

    const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);
    const tokensEarned = timeSpent < 120 ? 2 : 1;

    addTokens(tokensEarned);
    playSound("success");

    // Resolve coordinates from user's registered country (fallback to AE)
    const userCountryCode = "AE";
    const resolved = COORDS_MAP[userCountryCode] ?? DEFAULT_COORDS;
    setMapCoords(resolved.coords);
    setTargetCountry(resolved.country);

    // Success animation
    setTimeout(() => {
      if (successRef.current) {
        gsap.fromTo(
          successRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
        );
      }
    }, 100);

    // POST result
    try {
      await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "coordinates",
          answer: "coordinates-matched",
          timeSpentSec: timeSpent,
          skipped: false,
        }),
      });
    } catch {
      // Silent fail
    }

    // Navigate based on remaining time
    const totalElapsed = getElapsedSeconds();
    const remaining = 600 - totalElapsed;

    setTimeout(() => {
      advanceRoom();
      if (remaining > 60) {
        router.push("/game/bonus");
      } else {
        router.push("/complete");
      }
    }, 3500);
  }, [solved, roomStartTime, addTokens, advanceRoom, getElapsedSeconds, router, playSound]);

  const handleSkip = useCallback(async () => {
    setSkipModalOpen(false);
    addTokens(-1);
    playSound("click");

    const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);

    try {
      await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "coordinates",
          answer: "skipped",
          timeSpentSec: timeSpent,
          skipped: true,
        }),
      });
    } catch {
      // Silent fail
    }

    advanceRoom();
    const totalElapsed = getElapsedSeconds();
    const remaining = 600 - totalElapsed;

    if (remaining > 60) {
      router.push("/game/bonus");
    } else {
      router.push("/complete");
    }
  }, [addTokens, roomStartTime, advanceRoom, getElapsedSeconds, router, playSound]);

  const handleSound = useCallback(
    (name: string) => {
      playSound(name);
    },
    [playSound]
  );

  return (
    <div ref={containerRef} className="opacity-0">
      {/* Room Header */}
      <div className="text-center mb-6">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-2">
          Room 3 / 4 — Coordinates Room
        </p>
        <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-widest text-mission-white mb-2">
          Coordinates Room
        </h1>
        <p className="text-sm text-mission-white/50 font-mono max-w-md mx-auto">
          Match each landmark to its country.
        </p>
      </div>

      {/* Puzzle */}
      {!solved && (
        <>
          <CoordinatesMap
            hints={HINTS}
            countries={shuffledCountries}
            onComplete={handleComplete}
            onSound={handleSound}
          />

          {/* Skip option */}
          <div className="text-center mt-6">
            <button
              onClick={() => setSkipModalOpen(true)}
              className="text-xs font-mono text-mission-white/30 hover:text-mission-red-light transition-colors uppercase tracking-widest cursor-pointer"
            >
              Skip Room (-1 Token)
            </button>
          </div>
        </>
      )}

      {/* Skip confirmation modal */}
      <Modal open={skipModalOpen} onClose={() => setSkipModalOpen(false)}>
        <div className="text-center space-y-4">
          <p className="font-mono text-mission-white text-sm uppercase tracking-widest">
            Skip this room?
          </p>
          <p className="text-xs text-mission-white/50 font-mono">
            You will lose 1 intel token.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" size="sm" onClick={() => setSkipModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success overlay */}
      {solved && (
        <div ref={successRef} className="text-center space-y-6 opacity-0">
          {/* Coordinate reveal */}
          <div className="relative bg-mission-grey border border-mission-grey-light p-8 max-w-md mx-auto">
            <div className="aspect-video relative overflow-hidden">
              {/* Grid lines for map effect */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border border-mission-grey-light/20" />
                ))}
              </div>

              {/* Pulsing coordinate dot */}
              <div className="absolute top-[35%] left-[65%] flex items-center justify-center">
                <div className="w-4 h-4 bg-mission-red rounded-full animate-pulse" />
                <div className="absolute w-8 h-8 border border-mission-red/40 rounded-full animate-ping" />
              </div>

              {/* Coordinate label */}
              <div className="absolute bottom-2 left-2 bg-mission-black/80 px-3 py-1">
                <p className="font-mono text-xs text-mission-red-light">{mapCoords}</p>
              </div>
            </div>
          </div>

          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-4">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest">
              Coordinates Locked — Intel Token Earned
            </p>
          </div>

          <p className="text-sm text-mission-white/70 font-mono">
            Your coordinates are locked. The mission comes to{" "}
            <span className="text-mission-red-light font-bold">{targetCountry}</span>.
          </p>

          <p className="text-xs text-mission-white/40 font-mono">Proceeding...</p>
        </div>
      )}
    </div>
  );
}
