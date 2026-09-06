import React, { useMemo } from "react";

interface ConfettiBurstProps {
  /** Scales piece count and spread to the size of what was accomplished. */
  tier: "modest" | "solid" | "major";
  className?: string;
}

const PALETTE = ["#FF9D9D", "#58CC02", "#FFC800", "#1CB0F6", "#FF7B7B"];

const TIER_COUNT: Record<ConfettiBurstProps["tier"], number> = {
  modest: 5,
  solid: 10,
  major: 16,
};

/**
 * A one-shot pixel-dust burst behind the celebrating mascot. Piece count and
 * travel distance scale with `tier` so a small tidy-up and a multi-gigabyte
 * prune don't get the same celebration. Purely decorative: absent under
 * prefers-reduced-motion via the .animate-confetti-piece rule in index.css.
 */
export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ tier, className }) => {
  const count = TIER_COUNT[tier];
  const spread = tier === "major" ? 1 : tier === "solid" ? 0.75 : 0.5;

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0.3 : -0.2);
        const distance = (60 + (i % 3) * 24) * spread;
        return {
          id: i,
          color: PALETTE[i % PALETTE.length],
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance - 20,
          rotate: 120 + i * 37,
          delay: (i % 5) * 30,
          size: i % 3 === 0 ? 7 : 5,
        };
      }),
    [count, spread]
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-visible ${className ?? ""}`}
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti-piece absolute left-1/2 top-1/2 rounded-[1px]"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            // @ts-expect-error custom properties consumed by the keyframe
            "--confetti-tx": `${p.tx}px`,
            "--confetti-ty": `${p.ty}px`,
            "--confetti-rotate": `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
};
