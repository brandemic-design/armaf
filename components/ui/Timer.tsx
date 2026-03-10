"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  startTime: number;
  maxSeconds?: number;
  onTimeUp?: () => void;
}

export default function Timer({ startTime, maxSeconds = 600, onTimeUp }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(secs);
      if (secs >= maxSeconds) {
        onTimeUp?.();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, maxSeconds, onTimeUp]);

  const remaining = Math.max(0, maxSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining < 60;

  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="text-xs uppercase tracking-widest text-mission-white/60">
        Time
      </span>
      <span
        className={`text-lg font-bold tabular-nums ${
          isLow ? "text-mission-red-light animate-pulse" : "text-mission-white"
        }`}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
