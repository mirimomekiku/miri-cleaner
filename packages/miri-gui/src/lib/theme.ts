/**
 * Theme and playful color scheme preferences, persisted in localStorage and
 * applied as `dark` class, `data-theme` attribute, and CSS custom variables
 * on the document root.
 */

export type ThemeMode = "light" | "dark" | "system";
export type ColorScheme = "strawberry" | "matcha" | "citrus" | "ocean" | "berry";

export interface ColorSchemeOption {
  id: ColorScheme;
  name: string;
  description: string;
  emoji: string;
  primaryHex: string;
  accentHex: string;
  shadowHex: string;
  ringHex: string;
  lightBg: string;
  darkBg: string;
  rgbShades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
  };
}

export const COLOR_SCHEMES: ColorSchemeOption[] = [
  {
    id: "strawberry",
    name: "Strawberry Milk",
    description: "Classic sweet coral & strawberry pink",
    emoji: "🍓",
    primaryHex: "#FF9D9D",
    accentHex: "#FF7B7B",
    shadowHex: "#E05B5B",
    ringHex: "rgba(255, 157, 157, 0.6)",
    lightBg: "#FFF9F8",
    darkBg: "#1e1b1d",
    rgbShades: {
      50: "255 245 245",
      100: "255 235 235",
      200: "255 214 214",
      300: "255 184 184",
      400: "255 157 157",
      500: "255 123 123",
      600: "240 82 82",
      700: "214 40 40",
    },
  },
  {
    id: "matcha",
    name: "Matcha Melon",
    description: "Fresh lime mint & energizing green",
    emoji: "🍈",
    primaryHex: "#58CC02",
    accentHex: "#61E002",
    shadowHex: "#3E9401",
    ringHex: "rgba(88, 204, 2, 0.6)",
    lightBg: "#F7FCF4",
    darkBg: "#131912",
    rgbShades: {
      50: "244 251 240",
      100: "231 247 223",
      200: "201 238 183",
      300: "156 224 114",
      400: "88 204 2",
      500: "76 179 2",
      600: "62 148 1",
      700: "47 114 1",
    },
  },
  {
    id: "citrus",
    name: "Sunny Citrus",
    description: "Warm golden honey & sparkling marigold",
    emoji: "🍋",
    primaryHex: "#FFC800",
    accentHex: "#FFD226",
    shadowHex: "#CC8500",
    ringHex: "rgba(255, 200, 0, 0.6)",
    lightBg: "#FFFDF5",
    darkBg: "#1a1811",
    rgbShades: {
      50: "255 253 240",
      100: "255 249 214",
      200: "255 240 163",
      300: "255 226 92",
      400: "255 200 0",
      500: "240 165 0",
      600: "204 133 0",
      700: "153 94 0",
    },
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    description: "Crisp electric cyan & sky blue",
    emoji: "🌊",
    primaryHex: "#1CB0F6",
    accentHex: "#38BDF8",
    shadowHex: "#0284C7",
    ringHex: "rgba(28, 176, 246, 0.6)",
    lightBg: "#F5FAFF",
    darkBg: "#101722",
    rgbShades: {
      50: "240 249 255",
      100: "224 242 254",
      200: "186 230 253",
      300: "125 211 252",
      400: "28 176 246",
      500: "2 132 199",
      600: "3 105 161",
      700: "7 89 133",
    },
  },
  {
    id: "berry",
    name: "Bubblegum Berry",
    description: "Dreamy lavender & playful grape lilac",
    emoji: "🍇",
    primaryHex: "#CE82FF",
    accentHex: "#D99BFF",
    shadowHex: "#9333EA",
    ringHex: "rgba(206, 130, 255, 0.6)",
    lightBg: "#FAF6FF",
    darkBg: "#17121f",
    rgbShades: {
      50: "250 245 255",
      100: "243 232 255",
      200: "233 213 255",
      300: "216 180 254",
      400: "206 130 255",
      500: "168 85 247",
      600: "147 51 234",
      700: "126 34 206",
    },
  },
];

const THEME_KEY = "miri-cleaner:theme";
const SCHEME_KEY = "miri-cleaner:color-scheme";

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

export function getStoredColorScheme(): ColorScheme {
  try {
    const raw = localStorage.getItem(SCHEME_KEY) as ColorScheme;
    return COLOR_SCHEMES.some((s) => s.id === raw) ? raw : "strawberry";
  } catch {
    return "strawberry";
  }
}

export function storeColorScheme(scheme: ColorScheme): void {
  try {
    localStorage.setItem(SCHEME_KEY, scheme);
  } catch {
    // ignore
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

export function applyTheme(mode: ThemeMode, scheme: ColorScheme = "strawberry"): void {
  if (typeof document === "undefined") return;
  const isDark = resolveIsDark(mode);
  const root = document.documentElement;

  // Toggle dark class for Tailwind darkMode: 'class'
  root.classList.toggle("dark", isDark);

  // Set data-theme attribute
  root.setAttribute("data-theme", scheme);

  // Find color scheme configuration
  const config = COLOR_SCHEMES.find((s) => s.id === scheme) || COLOR_SCHEMES[0];

  // Apply CSS custom variables
  root.style.setProperty("--miri-brand", config.primaryHex);
  root.style.setProperty("--miri-accent", config.accentHex);
  root.style.setProperty("--miri-shadow", config.shadowHex);
  root.style.setProperty("--miri-ring", config.ringHex);
  root.style.setProperty("--miri-bg", isDark ? config.darkBg : config.lightBg);

  // RGB components for Tailwind opacity utilities
  for (const [shade, rgb] of Object.entries(config.rgbShades)) {
    root.style.setProperty(`--miri-${shade}-rgb`, rgb);
  }
}

/** Backward-compatible helper that delegates to applyTheme */
export function applyThemeClass(mode: ThemeMode, scheme?: ColorScheme): void {
  applyTheme(mode, scheme || getStoredColorScheme());
}
