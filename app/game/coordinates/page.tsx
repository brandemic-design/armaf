"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGame } from "../layout";
import CoordinatesMap from "@/components/game/CoordinatesMap";
import Button from "@/components/ui/Button";

const HINTS = [
  {
    id: "hint-1",
    description: "Towering spire in the desert, glass and steel reach the sky",
    icon: "\u{1F3D7}\u{FE0F}",
    answer: "United Arab Emirates",
  },
  {
    id: "hint-2",
    description: "Ancient monument of white marble, a testament to love",
    icon: "\u{1F54C}",
    answer: "India",
  },
  {
    id: "hint-3",
    description: "Statue with a torch, guardian of the harbor",
    icon: "\u{1F5FD}",
    answer: "United States",
  },
  {
    id: "hint-4",
    description: "Iron lattice tower, city of lights below",
    icon: "\u{1F5FC}",
    answer: "France",
  },
];

const CORRECT_MAP: Record<string, string> = {};
HINTS.forEach((h) => {
  CORRECT_MAP[h.id] = h.answer;
});

const OPTIONS = ["France", "United States", "India", "United Arab Emirates"];
// Shuffle options for display
const SHUFFLED_OPTIONS = [...OPTIONS].sort(() => Math.random() - 0.5);

export default function CoordinatesRoom() {
  const router = useRouter();
  const { addTokens, advanceRoom, getElapsedSeconds, startTime } = useGame();
  const [solved, setSolved] = useState(false);
  const [mapCoords, setMapCoords] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [roomStartTime] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

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

  const handleComplete = useCallback(
    async (allCorrect: boolean) => {
      if (!allCorrect) return;

      setSolved(true);
      const timeSpent = Math.floor((Date.now() - roomStartTime) / 1000);
      const tokensEarned = timeSpent < 120 ? 2 : 1;

      addTokens(tokensEarned);
      setMapCoords("25.2048\u00b0 N, 55.2708\u00b0 E");
      setTargetCountry("United Arab Emirates");

      // Map animation
      if (successRef.current) {
        gsap.fromTo(
          successRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
        );
      }

      // Pulsing dot
      if (dotRef.current) {
        gsap.to(dotRef.current, {
          scale: 1.5,
          opacity: 0.5,
          repeat: -1,
          yoyo: true,
          duration: 0.8,
          ease: "sine.inOut",
        });
      }

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

      // Check time remaining to decide route
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
    },
    [roomStartTime, addTokens, advanceRoom, getElapsedSeconds, router]
  );

  return (
    <div ref={containerRef} className="opacity-0">
      {/* Room Header */}
      <div className="text-center mb-8">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-2">
          Room 3 / 4
        </p>
        <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-widest text-mission-white mb-2">
          Coordinates Room
        </h1>
        <p className="text-sm text-mission-white/50 font-mono max-w-md mx-auto">
          Match each visual intel to its country of origin to unlock the final coordinates.
        </p>
      </div>

      {/* Puzzle */}
      {!solved && (
        <CoordinatesMap
          hints={HINTS.map(({ id, description, icon }) => ({ id, description, icon }))}
          options={SHUFFLED_OPTIONS}
          onComplete={handleComplete}
        />
      )}

      {/* Success overlay */}
      {solved && (
        <div ref={successRef} className="text-center space-y-6 opacity-0">
          {/* Map visualization */}
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
                <div
                  ref={dotRef}
                  className="w-4 h-4 bg-mission-red rounded-full"
                />
                <div className="absolute w-8 h-8 border border-mission-red/40 rounded-full animate-ping" />
              </div>

              {/* Coordinate label */}
              <div className="absolute bottom-2 left-2 bg-mission-black/80 px-3 py-1">
                <p className="font-mono text-xs text-mission-red-light">
                  {mapCoords}
                </p>
              </div>
            </div>
          </div>

          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-4">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest">
              Coordinates Locked - Intel Token Earned
            </p>
          </div>

          <p className="text-sm text-mission-white/70 font-mono">
            Your coordinates are locked. The mission comes to{" "}
            <span className="text-mission-red-light font-bold">{targetCountry}</span>.
          </p>

          <p className="text-xs text-mission-white/40 font-mono">
            Proceeding...
          </p>
        </div>
      )}
    </div>
  );
}
