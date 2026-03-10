"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { SoundManager } from "@/lib/sound";
import GlitchOverlay from "@/components/layout/GlitchOverlay";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const hasInteracted = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const headline = headlineRef.current;
    const subtext = subtextRef.current;
    const cta = ctaRef.current;
    if (!headline || !subtext || !cta) return;

    // Split headline into characters for typewriter effect
    const fullText = "ARMAF // ISLAND HEIST // DECODE THE MISSION";
    headline.textContent = "";
    const chars = fullText.split("").map((char) => {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.opacity = "0";
      span.style.display = "inline-block";
      if (char === " ") span.style.width = "0.3em";
      headline.appendChild(span);
      return span;
    });

    // GSAP timeline
    const tl = gsap.timeline({ delay: 0.5 });

    // Typewriter reveal
    tl.to(chars, {
      opacity: 1,
      duration: 0.03,
      stagger: 0.04,
      ease: "none",
    });

    // Subtext fade in
    tl.fromTo(
      subtext,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
      "+=0.4"
    );

    // CTA fade in
    tl.fromTo(
      cta,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "+=0.3"
    );

    return () => {
      tl.kill();
    };
  }, [mounted]);

  // Play ambient sound on first interaction
  useEffect(() => {
    if (!mounted) return;

    const handleInteraction = () => {
      if (hasInteracted.current) return;
      hasInteracted.current = true;
      SoundManager.ambientHum().play();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("keydown", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [mounted]);

  return (
    <GlitchOverlay minInterval={8000} maxInterval={12000}>
      <div
        ref={containerRef}
        className="flex min-h-screen flex-col items-center justify-center bg-mission-black px-6"
      >
        <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
          <h1
            ref={headlineRef}
            className="font-mono text-2xl tracking-[0.25em] text-mission-white uppercase sm:text-3xl md:text-4xl leading-relaxed"
          >
            ARMAF // ISLAND HEIST // DECODE THE MISSION
          </h1>

          <p
            ref={subtextRef}
            className="text-sm tracking-wide text-mission-white/50 leading-relaxed max-w-md opacity-0"
          >
            Your mission begins. Only some will reach the vault.
          </p>

          <div ref={ctaRef} className="opacity-0 mt-4">
            <Link
              href="/register"
              className="inline-block px-8 py-3 border border-mission-red bg-mission-red/10 text-mission-white font-mono text-sm uppercase tracking-[0.2em] transition-all duration-300 hover:bg-mission-red/30 pulse-cta"
              onClick={() => SoundManager.click().play()}
            >
              Accept Mission
            </Link>
          </div>
        </div>
      </div>
    </GlitchOverlay>
  );
}
