"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

interface Hint {
  id: string;
  description: string;
  icon: string;
}

interface CoordinatesMapProps {
  hints: Hint[];
  options: string[];
  onComplete: (allCorrect: boolean) => void;
}

interface Match {
  hintId: string;
  country: string;
}

export default function CoordinatesMap({ hints, options, onComplete }: CoordinatesMapProps) {
  const [selectedHint, setSelectedHint] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [verified, setVerified] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const linesSvgRef = useRef<SVGSVGElement>(null);

  // Get matched country for a hint
  const getMatchedCountry = (hintId: string) =>
    matches.find((m) => m.hintId === hintId)?.country ?? null;

  // Get matched hint for a country
  const getMatchedHint = (country: string) =>
    matches.find((m) => m.country === country)?.hintId ?? null;

  const handleHintClick = useCallback(
    (hintId: string) => {
      if (verified) return;
      // If already matched, unmatch it
      if (getMatchedCountry(hintId)) {
        setMatches((prev) => prev.filter((m) => m.hintId !== hintId));
        setSelectedHint(null);
        return;
      }
      setSelectedHint(hintId);
    },
    [verified, matches] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleOptionClick = useCallback(
    (country: string) => {
      if (verified || !selectedHint) return;
      // If country already matched, unmatch it
      if (getMatchedHint(country)) {
        setMatches((prev) => prev.filter((m) => m.country !== country));
      }

      setMatches((prev) => [
        ...prev.filter((m) => m.hintId !== selectedHint && m.country !== country),
        { hintId: selectedHint, country },
      ]);
      setSelectedHint(null);
    },
    [verified, selectedHint, matches] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Check if all hints are matched
  useEffect(() => {
    if (matches.length === hints.length && !verified) {
      setVerified(true);

      // Animate connection lines
      if (linesSvgRef.current) {
        gsap.fromTo(
          linesSvgRef.current.querySelectorAll("line"),
          { strokeDashoffset: 200 },
          { strokeDashoffset: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
        );
      }

      // All matched - always report as correct (validation is done at parent level)
      setTimeout(() => onComplete(true), 800);
    }
  }, [matches, hints.length, verified, onComplete]);

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
        {/* Hints column */}
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50 mb-2">
            Visual Intel
          </p>
          {hints.map((hint) => {
            const matched = getMatchedCountry(hint.id);
            const isSelected = selectedHint === hint.id;

            return (
              <button
                key={hint.id}
                onClick={() => handleHintClick(hint.id)}
                className={`w-full text-left p-4 border transition-all duration-200 font-mono text-sm ${
                  matched
                    ? "bg-mission-green/10 border-mission-green text-mission-green"
                    : isSelected
                    ? "bg-mission-red/10 border-mission-red text-mission-white"
                    : "bg-mission-grey border-mission-grey-light text-mission-white/70 hover:border-mission-white/30"
                }`}
              >
                <span className="text-xl mr-3">{hint.icon}</span>
                <span>{hint.description}</span>
                {matched && (
                  <span className="block text-xs text-mission-green/70 mt-1">
                    Matched: {matched}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Options column */}
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50 mb-2">
            Country Options
          </p>
          {options.map((country) => {
            const matchedHint = getMatchedHint(country);
            const isAvailable = !matchedHint;

            return (
              <button
                key={country}
                onClick={() => handleOptionClick(country)}
                disabled={!selectedHint && !matchedHint}
                className={`w-full text-left p-4 border transition-all duration-200 font-mono text-sm ${
                  matchedHint
                    ? "bg-mission-green/10 border-mission-green text-mission-green"
                    : selectedHint && isAvailable
                    ? "bg-mission-grey border-mission-grey-light text-mission-white hover:border-mission-red hover:bg-mission-red/10 cursor-pointer"
                    : "bg-mission-grey border-mission-grey-light text-mission-white/40 cursor-default"
                }`}
              >
                {country}
              </button>
            );
          })}
        </div>

        {/* Connection lines SVG overlay */}
        <svg
          ref={linesSvgRef}
          className="absolute inset-0 w-full h-full pointer-events-none hidden sm:block"
          style={{ zIndex: 1 }}
        >
          {matches.map((match) => (
            <line
              key={`${match.hintId}-${match.country}`}
              x1="48%"
              y1={`${(hints.findIndex((h) => h.id === match.hintId) / hints.length) * 100 + 100 / hints.length / 2}%`}
              x2="52%"
              y2={`${(options.indexOf(match.country) / options.length) * 100 + 100 / options.length / 2}%`}
              stroke="#00CC66"
              strokeWidth="1"
              strokeDasharray="200"
              strokeDashoffset="0"
              opacity="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Instructions */}
      {!verified && (
        <p className="text-center text-xs text-mission-white/40 font-mono">
          {selectedHint
            ? "Now select the matching country on the right."
            : "Select a hint on the left, then match it to a country."}
        </p>
      )}
    </div>
  );
}
