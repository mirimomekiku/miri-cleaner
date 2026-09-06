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
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Safe
        </span>
      );
    case "moderate":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Moderate
        </span>
      );
    case "aggressive":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
          <Flame className="w-3.5 h-3.5 text-orange-600" />
          Aggressive
        </span>
      );
    case "dangerous":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          Danger
        </span>
      );
  }
};
