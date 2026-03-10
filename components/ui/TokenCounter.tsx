"use client";

import { useEffect, useRef, useState } from "react";

interface TokenCounterProps {
  count: number;
}

export default function TokenCounter({ count }: TokenCounterProps) {
  const [displayCount, setDisplayCount] = useState(count);
  const [animating, setAnimating] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplayCount(count);
        prevCount.current = count;
      }, 150);
      const animTimer = setTimeout(() => setAnimating(false), 600);
      return () => {
        clearTimeout(timer);
        clearTimeout(animTimer);
      };
    }
  }, [count]);

  return (
    <div className="flex items-center gap-2 font-mono">
      <div className="w-3 h-3 bg-mission-red rounded-full" />
      <span className="text-xs uppercase tracking-widest text-mission-white/60">
        Intel
      </span>
      <span
        className={`text-lg font-bold transition-transform duration-300 ${
          animating ? "scale-125 token-shimmer" : "text-mission-red"
        }`}
      >
        {displayCount}
      </span>
    </div>
  );
}
