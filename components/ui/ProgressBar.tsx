"use client";

interface ProgressBarProps {
  current: number;
  total: number;
}

const ROOM_LABELS = ["CIPHER", "LOCK", "COORDINATES", "BONUS"];

export default function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-1 w-full max-w-md">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`h-1 w-full transition-colors duration-500 ${
              i < current
                ? "bg-mission-green"
                : i === current
                ? "bg-mission-red"
                : "bg-mission-grey-light"
            }`}
          />
          <span
            className={`text-[9px] font-mono tracking-wider ${
              i <= current ? "text-mission-white/80" : "text-mission-white/30"
            }`}
          >
            {ROOM_LABELS[i] ?? `R${i + 1}`}
          </span>
        </div>
      ))}
    </div>
  );
}
