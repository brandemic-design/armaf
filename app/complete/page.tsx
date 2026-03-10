"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Button from "@/components/ui/Button";

interface CompletionData {
  rank: string;
  totalTokens: number;
  coordinates: string;
  rewardHint: string;
  country: string;
}

const RANK_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  rookie: { label: "Rookie", color: "text-mission-white/70", badge: "\u{1F396}\u{FE0F}" },
  operative: { label: "Operative", color: "text-mission-red-light", badge: "\u{1F3AF}" },
  elite: { label: "Elite Agent", color: "text-mission-green", badge: "\u{1F451}" },
};

function getRankFromTokens(tokens: number): string {
  if (tokens >= 4) return "elite";
  if (tokens >= 3) return "operative";
  return "rookie";
}

function getLaunchCountdown(): { days: number; hours: number; minutes: number } | null {
  const launchDate = process.env.NEXT_PUBLIC_LAUNCH_DATE;
  if (!launchDate) return null;

  const target = new Date(launchDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  };
}

export default function CompletePage() {
  const router = useRouter();
  const [data, setData] = useState<CompletionData | null>(null);
  const [displayTokens, setDisplayTokens] = useState(0);
  const [countdown, setCountdown] = useState(getLaunchCountdown());
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLSpanElement>(null);
  const rankRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Post completion and get results
  useEffect(() => {
    setMounted(true);

    async function complete() {
      try {
        const res = await fetch("/api/game/complete", { method: "POST" });
        if (res.ok) {
          const result: CompletionData = await res.json();
          setData(result);
        } else {
          // Fallback: read from sessionStorage
          const tokens = Number(sessionStorage.getItem("mission-tokens") || "0");
          const rank = getRankFromTokens(tokens);
          setData({
            rank,
            totalTokens: tokens,
            coordinates: "Classified",
            rewardHint: "Your coordinates are locked. Stay tuned for the drop.",
            country: "Unknown",
          });
        }
      } catch {
        const tokens = Number(sessionStorage.getItem("mission-tokens") || "0");
        const rank = getRankFromTokens(tokens);
        setData({
          rank,
          totalTokens: tokens,
          coordinates: "Classified",
          rewardHint: "Your coordinates are locked. Stay tuned for the drop.",
          country: "Unknown",
        });
      }
    }

    complete();
  }, []);

  // Animate reveals once data is ready
  useEffect(() => {
    if (!data || !mounted) return;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // Container fade in
    if (containerRef.current) {
      tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 });
    }

    // Token counter animation
    const targetTokens = data.totalTokens;
    tl.to(
      {},
      {
        duration: 1.5,
        onUpdate: function () {
          const progress = this.progress();
          setDisplayTokens(Math.round(progress * targetTokens));
        },
      },
      "+=0.3"
    );

    // Rank badge reveal
    if (rankRef.current) {
      tl.fromTo(
        rankRef.current,
        { opacity: 0, scale: 0.5, rotateY: 90 },
        { opacity: 1, scale: 1, rotateY: 0, duration: 0.8, ease: "back.out(1.7)" },
        "-=0.5"
      );
    }

    // Coordinates reveal
    if (coordsRef.current) {
      tl.fromTo(
        coordsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.2"
      );
    }

    // Pulsing dot
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        scale: 1.8,
        opacity: 0.3,
        repeat: -1,
        yoyo: true,
        duration: 1,
        ease: "sine.inOut",
        delay: 2.5,
      });
    }

    // CTA buttons
    if (ctaRef.current) {
      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        "-=0.1"
      );
    }
  }, [data, mounted]);

  // Launch countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getLaunchCountdown());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = useCallback(() => {
    if (!data) return;
    const rankInfo = RANK_CONFIG[data.rank] || RANK_CONFIG.rookie;
    const text = `I completed the ARMAF mission as ${rankInfo.label} with ${data.totalTokens} Intel Tokens! Can you beat my score?`;

    if (navigator.share) {
      navigator.share({ title: "ARMAF - Decode the Mission", text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(text + " " + window.location.origin);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-mission-white/50 animate-pulse">Compiling mission report...</p>
      </div>
    );
  }

  const rankInfo = RANK_CONFIG[data.rank] || RANK_CONFIG.rookie;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div ref={containerRef} className="max-w-lg w-full space-y-10 text-center opacity-0">
        {/* Mission Complete header */}
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-3">
            Mission Debrief
          </p>
          <h1 className="font-mono text-3xl sm:text-4xl uppercase tracking-widest text-mission-white">
            Mission Complete
          </h1>
        </div>

        {/* Token Counter */}
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50">
            Intel Tokens Earned
          </p>
          <span
            ref={tokenRef}
            className="block font-mono text-6xl font-bold text-mission-red tabular-nums"
          >
            {displayTokens}
          </span>
        </div>

        {/* Rank Badge */}
        <div ref={rankRef} className="opacity-0">
          <div className="inline-block bg-mission-grey border border-mission-grey-light px-8 py-6">
            <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50 mb-2">
              Agent Rank
            </p>
            <p className="text-3xl mb-2">{rankInfo.badge}</p>
            <p className={`font-mono text-xl uppercase tracking-widest font-bold ${rankInfo.color}`}>
              {rankInfo.label}
            </p>
          </div>
        </div>

        {/* Coordinates Reveal */}
        <div ref={coordsRef} className="opacity-0 space-y-3">
          <div className="relative bg-mission-grey border border-mission-grey-light p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-mission-white/50 mb-3">
              Target Coordinates
            </p>
            <div className="flex items-center justify-center gap-3">
              <div ref={dotRef} className="w-3 h-3 bg-mission-red rounded-full flex-shrink-0" />
              <p className="font-mono text-lg text-mission-red-light tracking-wider">
                {data.coordinates}
              </p>
            </div>
            <p className="mt-3 text-sm text-mission-white/60 font-mono italic">
              {data.rewardHint}
            </p>
            {data.country !== "Unknown" && (
              <p className="mt-2 text-xs text-mission-white/40 font-mono">
                Destination: <span className="text-mission-white/60">{data.country}</span>
              </p>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div ref={ctaRef} className="opacity-0 space-y-4">
          <Button variant="primary" size="lg" pulse onClick={handleShare} className="w-full">
            Share Your Mission
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push("/leaderboard")}
            className="w-full"
          >
            View Global Leaderboard
          </Button>
        </div>

        {/* Launch Countdown */}
        {countdown && (
          <div className="border-t border-mission-grey-light pt-6">
            <p className="text-xs font-mono uppercase tracking-widest text-mission-white/40 mb-3">
              Next Drop
            </p>
            <div className="flex justify-center gap-4">
              {[
                { label: "Days", value: countdown.days },
                { label: "Hours", value: countdown.hours },
                { label: "Min", value: countdown.minutes },
              ].map((unit) => (
                <div key={unit.label} className="text-center">
                  <p className="font-mono text-2xl font-bold text-mission-white tabular-nums">
                    {String(unit.value).padStart(2, "0")}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-mission-white/40">
                    {unit.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
