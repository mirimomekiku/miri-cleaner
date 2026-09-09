/**
 * Theme preference: light / dark / system, persisted in localStorage and
 * applied as a `dark` class on the document root (Tailwind's `darkMode:
 * 'class'` strategy). "system" tracks the OS `prefers-color-scheme` media
 * query live, so switching OS theme while the app is open updates it too.
 */

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "miri-cleaner:theme";

export function getStoredThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
  } catch {
    return "system";
  }
}

export function storeThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Nothing to persist to; the preference just won't survive a reload.
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemPrefersDark();
}

export function applyThemeClass(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveIsDark(mode));
}
