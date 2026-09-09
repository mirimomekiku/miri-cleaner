import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Traps Tab/Shift+Tab focus cycling inside a container while `active`,
 * auto-focuses on open (a given element, or the container's first focusable
 * one), and calls `onEscape` on the Escape key. Shared by every modal/dialog
 * in the app so focus behavior doesn't drift between them. */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onEscape: () => void,
  autoFocusRef?: RefObject<HTMLElement | null>
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const timer = setTimeout(() => {
      const target =
        autoFocusRef?.current ?? containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      target?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
        return;
      }
      if (e.key !== "Tab" || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onEscape, autoFocusRef]);

  return containerRef;
}
