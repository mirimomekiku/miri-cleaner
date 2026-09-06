import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Animates a displayed number toward `target` whenever it changes, so a state
 * change (scan result landing, a clean completing) reads as something that
 * just happened rather than a value that was always there. Honors
 * prefers-reduced-motion by jumping straight to the target.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [displayed, setDisplayed] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      setDisplayed(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    if (from === target) return;

    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // cubic-out

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplayed(from + (target - from) * ease(progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return displayed;
}
