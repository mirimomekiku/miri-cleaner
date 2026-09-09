import React, { useEffect, useRef, useState } from "react";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import { Search, ShieldCheck, RotateCcw, X } from "lucide-react";

const ONBOARDING_KEY = "miri-cleaner:onboarding-completed";

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    // Storage can throw in locked-down webviews; treat as "not seen" rather
    // than crash the app over a cosmetic first-run flourish.
    return true;
  }
}

function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // Nothing to persist to; the flow will just show again next launch.
  }
}

interface Step {
  mood: "happy" | "scanning" | "cleaning" | "celebrate";
  badge: string;
  badgeVariant: "pink" | "green" | "blue" | "yellow";
  icon: React.ReactNode;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    mood: "happy",
    badge: "Welcome",
    badgeVariant: "pink",
    icon: <ShieldCheck className="w-5 h-5 text-miri-500" />,
    title: "Hi, I'm Miri!",
    body: "I'll help you free up space and speed up your system -- carefully. Everything here follows one rule: never surprise you with a deletion.",
  },
  {
    mood: "scanning",
    badge: "Step 1",
    badgeVariant: "blue",
    icon: <Search className="w-5 h-5 text-sky-500" />,
    title: "Scanning never deletes anything",
    body: "A “Scan” is a dry-run inspection: I look at what's taking up space and estimate what's reclaimable. Nothing is touched until you review the list and choose to prune.",
  },
  {
    mood: "cleaning",
    badge: "Step 2",
    badgeVariant: "green",
    icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    title: "Every real clean is backed by a snapshot",
    body: "Before I remove anything for real, I register a safety checkpoint (Btrfs/Snapper on Linux, System Restore on Windows) -- so what I clean can be put back.",
  },
  {
    mood: "celebrate",
    badge: "Step 3",
    badgeVariant: "yellow",
    icon: <RotateCcw className="w-5 h-5 text-indigo-500" />,
    title: "Changed your mind? One-tap undo",
    body: "Every cleanup is logged. Open “Safety & Vitals” anytime to see what happened and roll it back -- no terminal required.",
  },
];

interface OnboardingFlowProps {
  onDone: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onDone }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const finish = () => {
    markOnboardingCompleted();
    onDone();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finish();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-7 shadow-2xl border-4 border-miri-300 relative animate-pop"
      >
        {/* Skip is available from step one, per onboarding practice: never
            hide or bury the escape hatch for users who'd rather explore. */}
        <button
          onClick={finish}
          aria-label="Skip introduction"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <Mascot mood={step.mood} size="lg" />

          <div className="flex items-center gap-2">
            <PixelBadge label={step.badge} variant={step.badgeVariant} />
          </div>

          <div>
            <h3 id="onboarding-title" className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              {step.icon}
              <span>{step.title}</span>
            </h3>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {step.body}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? "w-6 bg-miri-400" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mt-6">
          <button
            onClick={finish}
            className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400 rounded"
          >
            Skip
          </button>
          <TactileButton
            variant="primary"
            onClick={() => (isLastStep ? finish() : setStepIndex((i) => i + 1))}
          >
            {isLastStep ? "Get Started" : "Next"}
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
