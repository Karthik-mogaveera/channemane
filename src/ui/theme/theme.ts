/**
 * Theme Management System for Channemane
 * Manages active application theme (Royal Heritage vs. Earth & Nature).
 */

export type AppTheme = "royal" | "nature";

export const THEME_STORAGE_KEY = "channemane_theme";
export const LEGACY_THEME_STORAGE_KEY = "channemane_board_theme";

export const NATURE_PALETTE = {
  warmIvory: "#F6F2E9",      // Board surrounding area
  sandstone: "#E7D9C2",      // Main board surface
  softCream: "#FFFDF7",      // Pit interior, cards and light surfaces
  walnut: "#896747",         // Pit border, board rim, outlines and wood details
  mutedSage: "#A7B69A",      // Secondary decoration
  forestSage: "#718568",     // Main interaction colour, active states, highlights
  darkCocoa: "#352C24",      // Primary text, seed counts
  warmBrown: "#69594A",      // Secondary text and subtitles
  lightSand: "#D4C2A5",      // Subtle dividers and borders

  // Backward-compatible aliases:
  warmSand: "#F6F2E9",
  desertBeige: "#E7D9C2",
  sageGreen: "#A7B69A",
  naturalWood: "#896747",
  ivoryCream: "#FFFDF7",
} as const;

export const ROYAL_PALETTE = {
  deepTeak: "#160b06",
  rosewood: "#24130b",
  woodRim: "#452415",
  brassGold: "#d4af37",
  goldLight: "#f3e5ab",
  ivory: "#faf3e0",
} as const;

/**
 * Retrieve stored theme from localStorage.
 * Defaults to "royal" if no preference has been saved.
 */
export function getStoredTheme(): AppTheme {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return "royal";
    }
    const saved =
      window.localStorage.getItem(THEME_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (saved === "nature" || saved === "royal") {
      return saved;
    }
  } catch {
    // Fallback for sandboxed or storage-disabled environments
  }
  return "royal";
}

/**
 * Persist chosen theme to localStorage.
 */
export function setStoredTheme(theme: AppTheme): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      window.localStorage.setItem(LEGACY_THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Ignore storage quota/permission errors
  }
}

/**
 * Apply the theme data attribute to document root and body.
 */
export function applyTheme(theme: AppTheme): void {
  try {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      if (document.body) {
        document.body.setAttribute("data-theme", theme);
      }
    }
  } catch {
    // Ignore DOM access issues in test setups
  }
}

// Initial application of stored theme upon module evaluation
if (typeof window !== "undefined") {
  applyTheme(getStoredTheme());
}

