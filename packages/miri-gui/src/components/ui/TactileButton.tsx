import React from "react";
import { clsx } from "clsx";

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "success" | "danger" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "font-extrabold rounded-2xl flex items-center justify-center gap-2 cursor-pointer select-none transition-all active:translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-miri-400/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:translate-y-0";

  const variants = {
    primary:
      "bg-miri-400 hover:bg-miri-500 text-slate-900 font-black shadow-[0_4px_0_0_#E05B5B] active:shadow-[0_1px_0_0_#E05B5B]",
    success:
      "bg-miri-mint hover:opacity-95 text-slate-950 font-black shadow-[0_4px_0_0_#047857] active:shadow-[0_1px_0_0_#047857]",
    danger:
      "bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_0_0_#B91C1C] active:shadow-[0_1px_0_0_#B91C1C]",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-[0_3px_0_0_#CBD5E1] active:shadow-[0_1px_0_0_#CBD5E1]",
    ghost:
      "bg-transparent hover:bg-miri-100 text-slate-700 border-none shadow-none active:translate-y-0",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 rounded-xl",
    md: "text-sm px-5 py-2.5",
    lg: "text-base px-8 py-3.5 text-lg",
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
