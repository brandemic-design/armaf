"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Button from "@/components/ui/Button";
import { SoundManager } from "@/lib/sound";

const BRIEFING_TEXT =
  "Agent, you have been selected for a classified ARMAF operation. " +
  "Your mission: infiltrate four secure rooms, decode hidden intelligence, " +
  "and earn Intel Tokens to unlock the vault. Each room tests a different skill. " +
  "Speed and accuracy will be rewarded. Failure is not an option. " +
  "The clock starts when you accept the mission. Good luck, operative.";

const ROOMS = [
  { id: "cipher", label: "CIPHER", emoji: "🔐", optional: false },
  { id: "lock", label: "LOCK", emoji: "🔒", optional: false },
  { id: "coordinates", label: "COORDINATES", emoji: "📍", optional: false },
  { id: "bonus", label: "BONUS", emoji: "⭐", optional: true },
] as const;

export default function BriefingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [starting, setStarting] = useState(false);

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= BRIEFING_TEXT.length) {
        setDisplayedText(BRIEFING_TEXT.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 28);
    return () => clearInterval(interval);
  }, []);

  // GSAP timeline for document reveal
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.3 });

    tl.fromTo(
      headerRef.current,
      { opacity: 0, y: -30, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
    );

    tl.fromTo(
      textRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4 },
      "+=0.2"
    );

    if (cardsRef.current) {
      const cards = cardsRef.current.children;
      tl.fromTo(
        cards,
        { opacity: 0, y: 30, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.15,
          ease: "power2.out",
        },
        "+=0.3"
      );
    }

    tl.fromTo(
      ctaRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      "+=0.2"
    );

    return () => {
      tl.kill();
    };
  }, []);

  // Play classified stamp sound on mount
  useEffect(() => {
    SoundManager.classified().play();
  }, []);

  async function handleBeginMission() {
    setStarting(true);
    try {
      const res = await fetch("/api/game/start", { method: "POST" });
      if (res.ok) {
        router.push("/game/cipher");
      } else {
        setStarting(false);
      }
    } catch {
      setStarting(false);
    }
  }

  return (
    <main
      ref={containerRef}
      className="min-h-screen flex flex-col items-center px-4 py-12 md:py-20"
    >
      {/* Classified header */}
      <h1
        ref={headerRef}
        className="text-3xl md:text-4xl font-mono uppercase tracking-[0.3em] text-mission-red text-center mb-8 opacity-0"
      >
        Classified Briefing
      </h1>

      {/* Typewriter briefing text */}
      <div className="w-full max-w-2xl mb-12">
        <div className="border border-mission-grey-light bg-mission-grey/50 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-mission-red rounded-full animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-mission-white/40">
              Decrypted Transmission
            </span>
          </div>
          <p
            ref={textRef}
            className="font-mono text-sm md:text-base leading-relaxed text-mission-white/80 opacity-0"
          >
            {displayedText}
            <span className="inline-block w-2 h-4 bg-mission-red ml-0.5 animate-pulse" />
          </p>
        </div>
      </div>

      {/* Room milestone cards */}
      <div
        ref={cardsRef}
        className="w-full max-w-3xl mb-12 flex gap-4 overflow-x-auto pb-4 md:overflow-visible md:pb-0 md:justify-center snap-x snap-mandatory"
      >
        {ROOMS.map((room) => (
          <div
            key={room.id}
            className="relative flex-shrink-0 w-40 md:w-44 snap-center"
          >
            <div className="relative border border-mission-grey-light bg-mission-grey/30 p-5 flex flex-col items-center gap-3 overflow-hidden">
              {/* Locked grey overlay with static/noise effect */}
              <div className="absolute inset-0 bg-mission-grey/70 z-10 flex items-center justify-center">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
                    backgroundSize: "cover",
                  }}
                />
                <span className="text-xs font-mono uppercase tracking-widest text-mission-white/40 z-20">
                  Locked
                </span>
              </div>

              <span className="text-3xl">{room.emoji}</span>
              <span className="font-mono text-xs uppercase tracking-widest text-mission-white">
                {room.label}
              </span>
              {room.optional && (
                <span className="text-[10px] font-mono uppercase text-mission-white/40">
                  Optional
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Begin Mission CTA */}
      <div ref={ctaRef} className="opacity-0">
        <Button
          size="lg"
          pulse
          disabled={starting}
          onClick={handleBeginMission}
        >
          {starting ? "Initiating..." : "Begin Mission"}
        </Button>
      </div>
    </main>
  );
}
