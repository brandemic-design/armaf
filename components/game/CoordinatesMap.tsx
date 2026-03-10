"use client";

import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from "react";
import gsap from "gsap";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Hint {
  id: string;
  description: string;
  icon: string;
  correctCountry: string;
}

interface CoordinatesMapProps {
  hints: Hint[];
  countries: string[];
  onComplete: () => void;
  onSound: (name: string) => void;
}

interface MatchPair {
  hintId: string;
  country: string;
}

/* ------------------------------------------------------------------ */
/*  Border colors per hint index                                       */
/* ------------------------------------------------------------------ */

const HINT_COLORS = ["#E53E3E", "#3B82F6", "#F59E0B", "#8B5CF6"];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CoordinatesMap({ hints, countries, onComplete, onSound }: CoordinatesMapProps) {
  const [selectedHint, setSelectedHint] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [mismatchFlash, setMismatchFlash] = useState(false);
  const [mismatchText, setMismatchText] = useState(false);
  const completedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hintRefs = useRef<(HTMLDivElement | null)[]>([]);
  const countryRefs = useRef<(HTMLDivElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number; hintId: string }[]>([]);

  // Slide cards in on mount
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.6 } });

    hintRefs.current.forEach((el, i) => {
      if (el) {
        gsap.set(el, { x: -120, opacity: 0 });
        tl.to(el, { x: 0, opacity: 1, duration: 0.5 }, i * 0.1);
      }
    });

    countryRefs.current.forEach((el, i) => {
      if (el) {
        gsap.set(el, { x: 120, opacity: 0 });
        tl.to(el, { x: 0, opacity: 1, duration: 0.5 }, i * 0.1);
      }
    });
  }, []);

  // Recalculate connector lines whenever matches change or on resize
  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: typeof lineCoords = [];

    matches.forEach((m) => {
      const hintIdx = hints.findIndex((h) => h.id === m.hintId);
      const countryIdx = countries.indexOf(m.country);
      const hintEl = hintRefs.current[hintIdx];
      const countryEl = countryRefs.current[countryIdx];
      if (!hintEl || !countryEl) return;

      const hintRect = hintEl.getBoundingClientRect();
      const countryRect = countryEl.getBoundingClientRect();

      newLines.push({
        x1: hintRect.right - containerRect.left,
        y1: hintRect.top + hintRect.height / 2 - containerRect.top,
        x2: countryRect.left - containerRect.left,
        y2: countryRect.top + countryRect.height / 2 - containerRect.top,
        hintId: m.hintId,
      });
    });

    setLineCoords(newLines);
  }, [matches, hints, countries]);

  useLayoutEffect(() => {
    updateLines();
  }, [matches, updateLines]);

  useEffect(() => {
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [updateLines]);

  // Check completion
  useEffect(() => {
    if (matches.length === hints.length && !completedRef.current) {
      completedRef.current = true;
      onSound("success");

      // Celebration: pulse cards green in sequence
      const allCards = [...hintRefs.current, ...countryRefs.current].filter(Boolean);
      const tl = gsap.timeline();
      allCards.forEach((el, i) => {
        tl.to(el, { scale: 1.05, duration: 0.15 }, i * 0.08);
        tl.to(el, { scale: 1, duration: 0.15 }, i * 0.08 + 0.15);
      });

      tl.call(() => {
        setTimeout(() => onComplete(), 600);
      });
    }
  }, [matches, hints.length, onComplete, onSound]);

  const isHintMatched = useCallback(
    (hintId: string) => matches.some((m) => m.hintId === hintId),
    [matches]
  );

  const isCountryMatched = useCallback(
    (country: string) => matches.some((m) => m.country === country),
    [matches]
  );

  const handleHintClick = useCallback(
    (hintId: string) => {
      if (completedRef.current) return;

      // If already matched, unmatch it
      if (isHintMatched(hintId)) {
        setMatches((prev) => prev.filter((m) => m.hintId !== hintId));
        completedRef.current = false;
        setSelectedHint(null);
        onSound("click");
        return;
      }

      // Toggle selection
      if (selectedHint === hintId) {
        setSelectedHint(null);
      } else {
        setSelectedHint(hintId);
        onSound("click");
      }
    },
    [selectedHint, isHintMatched, onSound]
  );

  const handleCountryClick = useCallback(
    (country: string) => {
      if (completedRef.current) return;

      // If matched, unmatch
      if (isCountryMatched(country)) {
        setMatches((prev) => prev.filter((m) => m.country !== country));
        completedRef.current = false;
        setSelectedHint(null);
        onSound("click");
        return;
      }

      if (!selectedHint) return;

      const hint = hints.find((h) => h.id === selectedHint);
      if (!hint) return;

      const isCorrect = hint.correctCountry === country;

      if (isCorrect) {
        setMatches((prev) => [
          ...prev.filter((m) => m.hintId !== selectedHint && m.country !== country),
          { hintId: selectedHint, country },
        ]);
        setSelectedHint(null);
        onSound("match");
      } else {
        // Wrong: flash + shake
        onSound("error");
        setMismatchFlash(true);
        setMismatchText(true);

        // Shake hint card
        const hintIdx = hints.findIndex((h) => h.id === selectedHint);
        const hintEl = hintRefs.current[hintIdx];
        const countryIdx = countries.indexOf(country);
        const countryEl = countryRefs.current[countryIdx];

        [hintEl, countryEl].forEach((el) => {
          if (el) {
            gsap.to(el, {
              x: -8,
              duration: 0.06,
              yoyo: true,
              repeat: 5,
              ease: "power2.inOut",
              onComplete: () => { gsap.set(el, { x: 0 }); },
            });
          }
        });

        setTimeout(() => {
          setMismatchFlash(false);
          setSelectedHint(null);
        }, 500);

        setTimeout(() => setMismatchText(false), 1200);
      }
    },
    [selectedHint, hints, countries, isCountryMatched, onSound]
  );

  const correctCount = matches.length;
  const allComplete = correctCount === hints.length && completedRef.current;

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative">
        {/* SVG connector lines */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: "visible" }}
        >
          {lineCoords.map((line) => (
            <line
              key={line.hintId}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#22C55E"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity={0.7}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-20"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          ))}
        </svg>

        {/* Split layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Left column: Hints */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-mission-white/40 mb-1">
              Hints
            </p>
            {hints.map((hint, i) => {
              const matched = isHintMatched(hint.id);
              const selected = selectedHint === hint.id;
              const shaking = mismatchFlash && selectedHint === hint.id;

              return (
                <div
                  key={hint.id}
                  ref={(el) => { hintRefs.current[i] = el; }}
                  onClick={() => handleHintClick(hint.id)}
                  className={`
                    relative flex items-center gap-3 p-4 border cursor-pointer
                    transition-all duration-200 select-none
                    ${matched
                      ? "bg-mission-green/10 border-mission-green"
                      : selected
                      ? "bg-mission-red/10 border-mission-red success-glow"
                      : "bg-mission-grey border-mission-grey-light hover:border-mission-white/30"
                    }
                    ${shaking ? "error-glow" : ""}
                  `}
                  style={{
                    borderLeftWidth: "4px",
                    borderLeftColor: matched ? "#22C55E" : HINT_COLORS[i],
                  }}
                >
                  <span className="text-2xl flex-shrink-0">{hint.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-sm ${matched ? "text-mission-green" : "text-mission-white"}`}>
                      {hint.description}
                    </p>
                    <p className={`text-[10px] font-mono uppercase tracking-widest mt-1 ${
                      matched ? "text-mission-green/70" : selected ? "text-mission-red-light" : "text-mission-white/30"
                    }`}>
                      {matched ? "MATCHED" : selected ? "SELECTED" : "Click to select"}
                    </p>
                  </div>
                  {matched && (
                    <span className="text-mission-green text-lg flex-shrink-0">&#10003;</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right column: Countries */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-mission-white/40 mb-1">
              Countries
            </p>
            {countries.map((country, i) => {
              const matched = isCountryMatched(country);
              const canClick = !!selectedHint || matched;
              const shaking = mismatchFlash && !matched && canClick;

              return (
                <div
                  key={country}
                  ref={(el) => { countryRefs.current[i] = el; }}
                  onClick={() => handleCountryClick(country)}
                  className={`
                    relative flex items-center justify-between p-4 border
                    transition-all duration-200 select-none
                    ${matched
                      ? "bg-mission-green/10 border-mission-green cursor-pointer"
                      : canClick
                      ? "bg-mission-grey border-mission-grey-light hover:border-mission-red cursor-pointer"
                      : "bg-mission-grey border-mission-grey-light opacity-60 cursor-default"
                    }
                    ${shaking ? "error-glow" : ""}
                  `}
                >
                  <p className={`font-mono text-sm ${matched ? "text-mission-green" : "text-mission-white"}`}>
                    {country}
                  </p>
                  {matched && (
                    <span className="text-mission-green text-lg flex-shrink-0">&#10003;</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mismatch text flash */}
      {mismatchText && (
        <div className="text-center">
          <span className="inline-block font-mono text-xs uppercase tracking-widest text-mission-red-light animate-pulse error-glow px-3 py-1 border border-mission-red/40">
            MISMATCH
          </span>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-mission-white/50">
          {allComplete
            ? ""
            : selectedHint
            ? "Now click the matching country."
            : "Click a hint to select it."}
        </span>
        <span className="text-mission-green">
          {correctCount}/{hints.length} matched
        </span>
      </div>

      {/* Completion banner */}
      {allComplete && (
        <div className="text-center">
          <div className="inline-block bg-mission-green/10 border border-mission-green px-6 py-3">
            <p className="font-mono text-mission-green text-sm uppercase tracking-widest success-glow">
              Coordinates Locked
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
