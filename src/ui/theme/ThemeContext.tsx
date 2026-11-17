/**
 * Theme Context and Provider for Channemane
 * Provides theme state, switcher, and reactive updates across all components.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { type AppTheme, getStoredTheme, setStoredTheme, applyTheme } from "./theme";

export interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "royal",
  setTheme: () => {},
  toggleTheme: () => {},
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: AppTheme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialTheme }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => initialTheme ?? getStoredTheme());

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "royal" ? "nature" : "royal";
    setTheme(next);
  }, [theme, setTheme]);

  // Ensure DOM is synced whenever theme changes or on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme,
  }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

