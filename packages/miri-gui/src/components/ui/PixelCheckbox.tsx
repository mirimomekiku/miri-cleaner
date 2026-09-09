import React from "react";
import { Check } from "lucide-react";

interface PixelCheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
  presentational?: boolean;
}

export const PixelCheckbox: React.FC<PixelCheckboxProps> = ({
  checked,
  onChange,
  id,
  label,
  disabled = false,
  presentational = false,
}) => {
  const commonClasses = `relative before:content-[''] before:absolute before:-inset-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all select-none ${
    checked
      ? "bg-[#58CC02] border-[#46A302] text-white shadow-[0_2px_0_0_#3B8702]"
      : "bg-white dark:bg-slate-800 border-slate-300 hover:border-slate-400"
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  if (presentational) {
    return (
      <div aria-hidden="true" className={commonClasses}>
        {checked && <Check className="w-4 h-4 stroke-[3.5] animate-pop" />}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-label={label || "Toggle selection"}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onChange) {
          onChange(!checked);
        }
      }}
      className={`${commonClasses} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400 active:translate-y-[1px] active:shadow-none`}
    >
      {checked && <Check className="w-4 h-4 stroke-[3.5] animate-pop" />}
    </button>
  );
};
