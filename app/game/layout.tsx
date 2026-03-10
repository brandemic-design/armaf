"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import Timer from "@/components/ui/Timer";
import TokenCounter from "@/components/ui/TokenCounter";
import ProgressBar from "@/components/ui/ProgressBar";

interface GameState {
  startTime: number;
  tokens: number;
  currentRoom: number;
  soundEnabled: boolean;
  addTokens: (amount: number) => void;
  advanceRoom: () => void;
  getElapsedSeconds: () => number;
  toggleSound: () => void;
  playSound: (name: string) => void;
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

// Simple sound player using Audio API (no dependency on Howler for missing files)
const audioCache: Record<string, HTMLAudioElement> = {};

function playSoundFile(name: string, volume = 0.5) {
  if (typeof window === "undefined") return;
  try {
    if (!audioCache[name]) {
      audioCache[name] = new Audio(`/sounds/${name}.mp3`);
    }
    const audio = audioCache[name];
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Sound file missing — silent fail
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

export default function GameLayout({ children }: { children: ReactNode }) {
  const [startTime, setStartTime] = useState<number>(0);
  const [tokens, setTokens] = useState(0);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("mission-start-time");
    const storedTokens = sessionStorage.getItem("mission-tokens");
    const storedSound = sessionStorage.getItem("mission-sound");

    if (stored) {
      setStartTime(Number(stored));
    } else {
      const now = Date.now();
      sessionStorage.setItem("mission-start-time", String(now));
      setStartTime(now);
    }

    if (storedTokens) setTokens(Number(storedTokens));
    if (storedSound !== null) setSoundEnabled(storedSound === "true");

    setCurrentRoom(detectCurrentRoom());
    setMounted(true);

    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const addTokens = useCallback((amount: number) => {
    setTokens((prev) => {
      const next = Math.max(0, prev + amount);
      sessionStorage.setItem("mission-tokens", String(next));
      return next;
    });
  }, []);

  const advanceRoom = useCallback(() => {
    setCurrentRoom((prev) => Math.min(prev + 1, TOTAL_ROOMS - 1));
  }, []);

  const getElapsedSeconds = useCallback(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  }, [startTime]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sessionStorage.setItem("mission-sound", String(next));
      return next;
    });
  }, []);

  const playSound = useCallback(
    (name: string) => {
      if (soundEnabled) playSoundFile(name);
    },
    [soundEnabled]
  );

  if (!mounted || !startTime) return null;

  return (
    <GameContext.Provider
      value={{ startTime, tokens, currentRoom, soundEnabled, addTokens, advanceRoom, getElapsedSeconds, toggleSound, playSound }}
    >
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

            <div className="flex items-center gap-3">
              <TokenCounter count={tokens} />

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-2 text-mission-white/50 hover:text-mission-white transition-colors cursor-pointer"
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {soundEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                )}
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-mission-white/50 hover:text-mission-white transition-colors cursor-pointer"
                title={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
              >
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                )}
              </button>
            </div>
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
