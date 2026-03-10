"use client";

import TokenCounter from "@/components/ui/TokenCounter";

interface NavbarProps {
  tokenCount: number;
}

export default function Navbar({ tokenCount }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3 bg-mission-black/90 backdrop-blur">
      <span className="font-mono text-sm uppercase tracking-[0.3em] text-mission-white">
        ARMAF
      </span>
      <TokenCounter count={tokenCount} />
    </nav>
  );
}
