"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";

interface GlitchOverlayProps {
  children: ReactNode;
  minInterval?: number;
  maxInterval?: number;
}

export default function GlitchOverlay({
  children,
  minInterval = 8000,
  maxInterval = 12000,
}: GlitchOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleGlitch = useCallback(() => {
    const delay =
      Math.random() * (maxInterval - minInterval) + minInterval;

    timeoutRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      el.classList.add("glitch-active");

      // Remove the class after the animation completes (300ms matches CSS)
      setTimeout(() => {
        el.classList.remove("glitch-active");
      }, 300);

      scheduleGlitch();
    }, delay);
  }, [minInterval, maxInterval]);

  useEffect(() => {
    scheduleGlitch();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scheduleGlitch]);

  return (
    <div ref={containerRef} className="relative">
      {children}
    </div>
  );
}
