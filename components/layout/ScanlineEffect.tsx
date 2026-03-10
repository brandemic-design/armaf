interface ScanlineEffectProps {
  intensity?: number;
}

export default function ScanlineEffect({ intensity = 1 }: ScanlineEffectProps) {
  return (
    <div
      className="scanline-overlay"
      style={{ opacity: Math.min(Math.max(intensity, 0), 1) }}
    />
  );
}
