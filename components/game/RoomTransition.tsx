"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface RoomTransitionProps {
  roomName: string;
  onComplete: () => void;
}

export default function RoomTransition({
  roomName,
  onComplete,
}: RoomTransitionProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const text = textRef.current;
    if (!overlay || !text) return;

    const tl = gsap.timeline({
      onComplete,
    });

    // Start fully opaque black
    tl.set(overlay, { opacity: 1 });
    tl.set(text, { opacity: 0, scale: 1.05 });

    // Glitch the room name in with rapid opacity flickers
    tl.to(text, {
      opacity: 1,
      duration: 0.1,
      ease: "none",
      delay: 0.3,
    });
    tl.to(text, { opacity: 0, duration: 0.05, ease: "none" });
    tl.to(text, { opacity: 1, duration: 0.05, ease: "none" });
    tl.to(text, { opacity: 0.3, duration: 0.04, ease: "none" });
    tl.to(text, {
      opacity: 1,
      scale: 1,
      duration: 0.15,
      ease: "power2.out",
    });

    // Hold visible
    tl.to(text, { opacity: 1, duration: 0.8 });

    // Fade everything out
    tl.to(text, { opacity: 0, duration: 0.3, ease: "power2.in" });
    tl.to(overlay, { opacity: 0, duration: 0.5, ease: "power2.in" }, "-=0.1");

    return () => {
      tl.kill();
    };
  }, [roomName, onComplete]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-mission-black"
    >
      <h2
        ref={textRef}
        className="font-mono text-xl uppercase tracking-[0.4em] text-mission-white opacity-0 sm:text-2xl md:text-3xl"
      >
        {roomName}
      </h2>
    </div>
  );
}
