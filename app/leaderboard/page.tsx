"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

interface LeaderboardRow {
  position: number;
  nickname: string;
  country: string;
  totalTokens: number;
  rank: string;
  isFirst500: boolean;
}

const RANK_LABELS: Record<string, string> = {
  elite: "Elite Agent",
  operative: "Operative",
  rookie: "Rookie",
};

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}",
  GB: "\u{1F1EC}\u{1F1E7}",
  AE: "\u{1F1E6}\u{1F1EA}",
  IN: "\u{1F1EE}\u{1F1F3}",
  SA: "\u{1F1F8}\u{1F1E6}",
  BR: "\u{1F1E7}\u{1F1F7}",
  MX: "\u{1F1F2}\u{1F1FD}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
  NG: "\u{1F1F3}\u{1F1EC}",
};

const COUNTRY_OPTIONS = [
  { code: "", label: "All Countries" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "AE", label: "UAE" },
  { code: "IN", label: "India" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NG", label: "Nigeria" },
];

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);

  const fetchLeaderboard = useCallback(async (countryFilter: string) => {
    try {
      const params = new URLSearchParams();
      if (countryFilter) params.set("country", countryFilter);
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.entries ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + filter changes
  useEffect(() => {
    setLoading(true);
    animatedRef.current = false;
    fetchLeaderboard(country);
  }, [country, fetchLeaderboard]);

  // Animate rows sliding in
  useEffect(() => {
    if (!loading && rows.length > 0 && tableRef.current && !animatedRef.current) {
      animatedRef.current = true;
      const rowEls = tableRef.current.querySelectorAll("[data-row]");
      gsap.fromTo(
        rowEls,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.03, ease: "power2.out" }
      );
    }
  }, [loading, rows]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard(country);
    }, 30000);
    return () => clearInterval(interval);
  }, [country, fetchLeaderboard]);

  const getPositionClass = (pos: number): string => {
    if (pos === 1) return "text-mission-red-light font-bold text-lg";
    if (pos === 2) return "text-mission-red font-bold";
    if (pos === 3) return "text-mission-red/80 font-bold";
    return "text-mission-white/50";
  };

  const getRowBorder = (pos: number): string => {
    if (pos <= 3) return "border-l-2 border-l-mission-red";
    return "border-l-2 border-l-transparent";
  };

  return (
    <div className="min-h-screen bg-mission-black px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-mission-red mb-2">
            Intelligence Network
          </p>
          <h1 className="font-mono text-3xl sm:text-4xl uppercase tracking-widest text-mission-white mb-2">
            Global Leaderboard
          </h1>
          <p className="text-sm text-mission-white/50 font-mono">
            Top agents ranked by Intel Tokens
          </p>
        </div>

        {/* Country filter */}
        <div className="flex justify-end mb-6">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-mission-grey border border-mission-grey-light px-4 py-2 text-sm text-mission-white font-mono focus:outline-none focus:border-mission-red transition-colors cursor-pointer"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16">
            <p className="font-mono text-mission-white/50 animate-pulse">Loading intel...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-mono text-mission-white/40">No entries yet. Be the first agent.</p>
          </div>
        ) : (
          <div ref={tableRef} className="space-y-1">
            {/* Table header */}
            <div className="grid grid-cols-[3rem_1fr_5rem_5rem_5rem] sm:grid-cols-[3rem_1fr_6rem_6rem_6rem] gap-2 px-3 py-2 text-xs font-mono uppercase tracking-widest text-mission-white/40 border-b border-mission-grey-light">
              <span>#</span>
              <span>Agent</span>
              <span className="text-center">Country</span>
              <span className="text-center">Tokens</span>
              <span className="text-center">Rank</span>
            </div>

            {/* Rows */}
            {rows.map((row) => (
              <div
                key={`${row.position}-${row.nickname}`}
                data-row
                className={`grid grid-cols-[3rem_1fr_5rem_5rem_5rem] sm:grid-cols-[3rem_1fr_6rem_6rem_6rem] gap-2 px-3 py-3 bg-mission-grey/30 hover:bg-mission-grey/60 transition-colors ${getRowBorder(row.position)} opacity-0`}
              >
                {/* Position */}
                <span className={`font-mono tabular-nums ${getPositionClass(row.position)}`}>
                  {row.position}
                </span>

                {/* Name + badges */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm text-mission-white truncate">
                    {row.nickname}
                  </span>
                  {row.isFirst500 && (
                    <span className="flex-shrink-0 text-[10px] font-mono uppercase tracking-wider bg-mission-red/20 text-mission-red-light border border-mission-red/30 px-1.5 py-0.5">
                      First 500
                    </span>
                  )}
                </div>

                {/* Country */}
                <span className="text-center text-sm">
                  {COUNTRY_FLAGS[row.country] || row.country}
                </span>

                {/* Tokens */}
                <span className="text-center font-mono text-sm font-bold text-mission-red tabular-nums">
                  {row.totalTokens}
                </span>

                {/* Rank */}
                <span
                  className={`text-center text-[10px] font-mono uppercase tracking-wider ${
                    row.rank === "elite"
                      ? "text-mission-green"
                      : row.rank === "operative"
                      ? "text-mission-red-light"
                      : "text-mission-white/50"
                  }`}
                >
                  {RANK_LABELS[row.rank] || row.rank}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
