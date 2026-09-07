import React, { useEffect, useState } from "react";
import { Mascot } from "../ui/Mascot";

interface SplashScreenProps {
  /** Called once the exit transition has fully finished. */
  onDone: () => void;
}

/**
 * A ~1s branded first-paint moment: Miri waddles in place, then the whole
 * overlay fades and scales away to reveal the app underneath (which has
 * already been mounted and scanning in the background the whole time).
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const holdTimer = setTimeout(() => setExiting(true), 1000);
    return () => clearTimeout(holdTimer);
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const exitTimer = setTimeout(onDone, 450);
    return () => clearTimeout(exitTimer);
  }, [exiting, onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-miri-bg select-none ${
        exiting ? "animate-splash-exit" : ""
      }`}
      role="status"
      aria-label="Miri Cleaner is starting up"
    >
      <div className="animate-mascot-waddle">
        <Mascot mood="happy" size="lg" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Miri Cleaner</h1>
        </div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-pixel">
          Zero-Trust Safe &amp; Playful System Optimizer
        </p>
      </div>
    </div>
  );
};
