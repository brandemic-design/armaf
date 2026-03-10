"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SoundManager } from "@/lib/sound";

interface MicroAnimationProps {
  type: "success" | "failure";
  onComplete: () => void;
}

export default function MicroAnimation({
  type,
  onComplete,
}: MicroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const icon = iconRef.current;
    if (!container || !icon) return;

    // Play sound
    if (type === "success") {
      SoundManager.success().play();
    } else {
      SoundManager.error().play();
    }

    const tl = gsap.timeline({ onComplete });

    // Flash in
    tl.fromTo(
      container,
      { opacity: 0 },
      { opacity: 1, duration: 0.1, ease: "none" }
    );

    // Scale the icon
    tl.fromTo(
      icon,
      { scale: 0, rotation: type === "failure" ? -15 : 0 },
      {
        scale: 1,
        rotation: 0,
        duration: 0.35,
        ease: "back.out(1.7)",
      },
      "-=0.05"
    );

    // Hold
    tl.to(container, { opacity: 1, duration: 0.5 });

    // Fade out
    tl.to(container, { opacity: 0, duration: 0.3, ease: "power2.in" });

    return () => {
      tl.kill();
    };
  }, [type, onComplete]);

  const isSuccess = type === "success";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none opacity-0"
    >
      {/* Flash background */}
      <div
        className={`absolute inset-0 ${
          isSuccess ? "bg-mission-green/10" : "bg-mission-red/10"
        }`}
      />

      {/* Icon */}
      <div
        ref={iconRef}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 ${
          isSuccess
            ? "border-mission-green success-glow"
            : "border-mission-red-light error-glow"
        }`}
      >
        {isSuccess ? (
          <svg
            className="h-10 w-10 text-mission-green"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            className="h-10 w-10 text-mission-red-light"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
    </div>
  );
}
