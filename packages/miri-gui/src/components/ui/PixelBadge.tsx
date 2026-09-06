import React from "react";

interface PixelBadgeProps {
  label: string;
  variant?: "pink" | "green" | "yellow" | "blue" | "gray";
  icon?: string;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({
  label,
  variant = "pink",
  icon,
}) => {
  const styles = {
    pink: "bg-miri-100 text-miri-700 border-miri-300",
    green: "bg-emerald-50 text-emerald-800 border-emerald-300",
    yellow: "bg-amber-50 text-amber-800 border-amber-300",
    blue: "bg-sky-50 text-sky-800 border-sky-300",
    gray: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-pixel text-[9px] tracking-wider uppercase px-2 py-0.5 rounded border ${styles[variant]} shadow-pixel-sm`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
};
