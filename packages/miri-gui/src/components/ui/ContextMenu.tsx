import React, { useEffect, useRef, useState } from "react";

export interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** A small right-click menu, positioned at the cursor and clamped to stay
 * inside the viewport. Closes on an outside click, Escape, or scroll --
 * whichever fires first. */
export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    setPos({ left: Math.min(x, maxLeft), top: Math.min(y, maxTop) });
  }, [x, y]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 100 }}
      className="min-w-[200px] bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700/60 shadow-duo py-1.5 animate-pop"
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            item.onClick();
          }}
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-left transition-colors ${
            item.danger ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="shrink-0">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
};
