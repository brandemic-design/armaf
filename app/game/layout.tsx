"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import Timer from "@/components/ui/Timer";
import TokenCounter from "@/components/ui/TokenCounter";
import ProgressBar from "@/components/ui/ProgressBar";

interface GameState {
  startTime: number;
  tokens: number;
  currentRoom: number;
  addTokens: (amount: number) => void;
  advanceRoom: () => void;
  getElapsedSeconds: () => number;
}

const GameContext = createContext<GameState | null>(null);

export function useGame(): GameState {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameLayout");
  return ctx;
}

const TOTAL_ROOMS = 4;
const MAX_GAME_SECONDS = 600;

const ROOM_INDEX_MAP: Record<string, number> = {
  cipher: 0,
  lock: 1,
  coordinates: 2,
  bonus: 3,
};

function detectCurrentRoom(): number {
  if (typeof window === "undefined") return 0;
  const path = window.location.pathname;
  for (const [key, idx] of Object.entries(ROOM_INDEX_MAP)) {
    if (path.includes(key)) return idx;
  }
  return 0;
}

export default function GameLayout({ children }: { children: ReactNode }) {
  const [startTime, setStartTime] = useState<number>(0);
  const [tokens, setTokens] = useState(0);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("mission-start-time");
    const storedTokens = sessionStorage.getItem("mission-tokens");

    if (stored) {
      setStartTime(Number(stored));
    } else {
      const now = Date.now();
      sessionStorage.setItem("mission-start-time", String(now));
      setStartTime(now);
    }

    if (storedTokens) {
      setTokens(Number(storedTokens));
    }

    setCurrentRoom(detectCurrentRoom());
    setMounted(true);
  }, []);

  const addTokens = useCallback((amount: number) => {
    setTokens((prev) => {
      const next = Math.max(0, prev + amount);
      sessionStorage.setItem("mission-tokens", String(next));
      return next;
    });
  }, []);

  const advanceRoom = useCallback(() => {
    setCurrentRoom((prev) => {
      const next = Math.min(prev + 1, TOTAL_ROOMS - 1);
      return next;
    });
  }, []);

  const getElapsedSeconds = useCallback(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  }, [startTime]);

  if (!mounted || !startTime) return null;

  return (
    <GameContext.Provider value={{ startTime, tokens, currentRoom, addTokens, advanceRoom, getElapsedSeconds }}>
      <div className="flex flex-col min-h-screen bg-mission-black">
        {/* Top Bar */}
        <header className="fixed top-0 left-0 right-0 z-30 bg-mission-black/95 backdrop-blur border-b border-mission-grey-light">
          <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-mission-white/80">
                ARMAF
              </span>
              <Timer startTime={startTime} maxSeconds={MAX_GAME_SECONDS} />
            </div>

            <div className="hidden sm:block flex-1 mx-6">
              <ProgressBar current={currentRoom} total={TOTAL_ROOMS} />
            </div>

            <TokenCounter count={tokens} />
          </div>

          {/* Mobile progress bar */}
          <div className="sm:hidden px-4 pb-2">
            <ProgressBar current={currentRoom} total={TOTAL_ROOMS} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-24 sm:pt-20 pb-8 px-4">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </GameContext.Provider>
  );
}
