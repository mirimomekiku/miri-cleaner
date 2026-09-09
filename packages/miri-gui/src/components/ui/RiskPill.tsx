import React from "react";
import { RiskLevel } from "../../types";
import { ShieldCheck, AlertTriangle, Flame, ShieldAlert } from "lucide-react";

interface RiskPillProps {
  level: RiskLevel;
}

export const RiskPill: React.FC<RiskPillProps> = ({ level }) => {
  switch (level) {
    case "safe":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Safe
        </span>
      );
    case "moderate":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Moderate
        </span>
      );
    case "aggressive":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
          <Flame className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          Aggressive
        </span>
      );
    case "dangerous":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          Danger
        </span>
      );
  }
};
