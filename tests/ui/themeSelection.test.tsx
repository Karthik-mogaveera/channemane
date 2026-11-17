/**
 * Theme Selection & Nature Theme Integration Tests
 * Verifies theme persistence, immediate application across the app,
 * zero gameplay reset on switch, and support across all modes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";
import {
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  THEME_STORAGE_KEY,
  NATURE_PALETTE,
  ROYAL_PALETTE,
} from "../../src/ui/theme/theme";
import { ThemeSelectModal } from "../../src/ui/components/ThemeSelectModal";

describe("Theme Selection & Nature Theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    if (document.body) {
      document.body.removeAttribute("data-theme");
    }
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    if (document.body) {
      document.body.removeAttribute("data-theme");
    }
  });

  describe("Theme Storage and Palette Architecture", () => {
    it("defaults to Royal Theme when no theme is stored", () => {
      expect(getStoredTheme()).toBe("royal");
    });

    it("persists Nature Theme to localStorage and retrieves it", () => {
      setStoredTheme("nature");
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("nature");
      expect(getStoredTheme()).toBe("nature");
    });

    it("applies theme attribute to document root and body", () => {
      applyTheme("nature");
      expect(document.documentElement.getAttribute("data-theme")).toBe("nature");
      expect(document.body.getAttribute("data-theme")).toBe("nature");

      applyTheme("royal");
      expect(document.documentElement.getAttribute("data-theme")).toBe("royal");
      expect(document.body.getAttribute("data-theme")).toBe("royal");
    });

    it("exposes the official Nature and Royal color palettes", () => {
      expect(NATURE_PALETTE.warmSand).toBe("#F5EBDD");
      expect(NATURE_PALETTE.desertBeige).toBe("#E5D5B9");
      expect(NATURE_PALETTE.sageGreen).toBe("#C6D2B8");
      expect(NATURE_PALETTE.forestSage).toBe("#899B78");
      expect(NATURE_PALETTE.naturalWood).toBe("#9B7654");
      expect(NATURE_PALETTE.ivoryCream).toBe("#FFFCF5");

      expect(ROYAL_PALETTE.deepTeak).toBe("#160b06");
      expect(ROYAL_PALETTE.brassGold).toBe("#d4af37");
    });
  });

  describe("Theme Selection Modal Component", () => {
    it("renders Royal and Nature theme options with previews and active badge", () => {
      const onSelectTheme = vi.fn();
      const onClose = vi.fn();

      render(
        <ThemeSelectModal
          isOpen={true}
          onClose={onClose}
          currentTheme="royal"
          onSelectTheme={onSelectTheme}
        />
      );

      expect(screen.getByTestId("theme-select-modal")).toBeInTheDocument();
      expect(screen.getByTestId("theme-card-royal")).toBeInTheDocument();
      expect(screen.getByTestId("theme-card-nature")).toBeInTheDocument();
      expect(screen.getByTestId("theme-badge-royal")).toHaveTextContent("✓ Active");

      // Select Nature Theme
      fireEvent.click(screen.getByTestId("theme-card-nature"));
      expect(onSelectTheme).toHaveBeenCalledWith("nature");
      expect(onClose).toHaveBeenCalled();
    });

    it("closes when close button is clicked", () => {
      const onClose = vi.fn();
      render(
        <ThemeSelectModal
          isOpen={true}
          onClose={onClose}
          currentTheme="royal"
          onSelectTheme={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId("close-theme-modal-btn"));
      expect(onClose).toHaveBeenCalled();
    });

    it("closes when Escape key is pressed", () => {
      const onClose = vi.fn();
      render(
        <ThemeSelectModal
          isOpen={true}
          onClose={onClose}
          currentTheme="royal"
          onSelectTheme={vi.fn()}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Front Page & App Integration", () => {
    it("renders Themes button on the Main Menu and opens modal", () => {
      render(<App initialScreen="MAIN_MENU" />);

      const themesBtn = screen.getByTestId("menu-btn-themes");
      expect(themesBtn).toBeInTheDocument();
      expect(themesBtn).toHaveTextContent("Themes");

      // Modal initially closed
      expect(screen.queryByTestId("theme-select-modal")).not.toBeInTheDocument();

      // Click to open modal
      act(() => {
        fireEvent.click(themesBtn);
      });
      expect(screen.getByTestId("theme-select-modal")).toBeInTheDocument();
    });

    it("switches to Nature Theme immediately and applies data-theme across the app", () => {
      const { container } = render(<App initialScreen="MAIN_MENU" />);

      const appContainer = container.querySelector(".app-container");
      expect(appContainer).toHaveAttribute("data-theme", "royal");

      // Open themes modal
      act(() => {
        fireEvent.click(screen.getByTestId("menu-btn-themes"));
      });

      // Select Nature Theme
      act(() => {
        fireEvent.click(screen.getByTestId("theme-card-nature"));
      });

      // Modal closed and data-theme set to nature
      expect(screen.queryByTestId("theme-select-modal")).not.toBeInTheDocument();
      expect(appContainer).toHaveAttribute("data-theme", "nature");
      expect(document.documentElement.getAttribute("data-theme")).toBe("nature");
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("nature");

      // Switch back to Royal Theme
      act(() => {
        fireEvent.click(screen.getByTestId("menu-btn-themes"));
      });
      act(() => {
        fireEvent.click(screen.getByTestId("theme-card-royal"));
      });
      expect(appContainer).toHaveAttribute("data-theme", "royal");
      expect(document.documentElement.getAttribute("data-theme")).toBe("royal");
    });

    it("switches theme in-game via Header without resetting game state or seed counts", () => {
      vi.useFakeTimers();

      const { container } = render(<App initialScreen="GAME" />);

      // Advance past turn notification
      act(() => {
        vi.advanceTimersByTime(800);
      });

      const appContainer = container.querySelector(".app-container");
      expect(appContainer).toHaveAttribute("data-theme", "royal");

      // Verify Header themes button exists
      const headerThemeBtn = screen.getByTestId("header-themes-btn");
      expect(headerThemeBtn).toBeInTheDocument();

      // Make a move: Player 1 clicks Pit 0 (sowing seeds)
      act(() => {
        fireEvent.click(screen.getByTestId("pit-0"));
        vi.runAllTimers();
      });

      const seedsAfterMove = screen.getByTestId("pit-0").getAttribute("data-seeds");
      const turnAfterMove = screen.getByTestId("turn-indicator").textContent;

      // Now open theme modal and switch to Nature Theme
      act(() => {
        fireEvent.click(headerThemeBtn);
      });
      expect(screen.getByTestId("theme-select-modal")).toBeInTheDocument();

      act(() => {
        fireEvent.click(screen.getByTestId("theme-card-nature"));
      });

      // Verification: Theme updated to nature
      expect(appContainer).toHaveAttribute("data-theme", "nature");
      expect(document.documentElement.getAttribute("data-theme")).toBe("nature");

      // Verification: Gameplay state NOT reset
      expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", seedsAfterMove);
      expect(screen.getByTestId("turn-indicator")).toHaveTextContent(turnAfterMove || "");

      vi.useRealTimers();
    });

    it("applies Nature Theme in AI game mode", () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, "nature");

      const { container } = render(
        <App initialScreen="GAME" initialGameMode="ai" initialDifficulty="beginner" />
      );

      const appContainer = container.querySelector(".app-container");
      expect(appContainer).toHaveAttribute("data-theme", "nature");
      expect(screen.getByTestId("game-mode-tag")).toHaveTextContent("AI (BEGINNER)");
    });
  });
});

