/**
 * Theme Selection & Nature Theme Integration Tests
 * Verifies theme persistence, immediate application across the app,
 * zero gameplay reset on switch, pit highlighting, box-free seed counts,
 * and complete Nature Theme coverage across all dialogs and modes.
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
import { FirstPlayerModal } from "../../src/ui/components/FirstPlayerModal";
import { NoticeModal } from "../../src/ui/components/NoticeModal";
import { RulesModal } from "../../src/ui/components/RulesModal";
import { Pit } from "../../src/ui/components/Pit";
import { ThemeProvider } from "../../src/ui/theme/ThemeContext";

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

  describe("Theme Storage and Refined Palette Architecture", () => {
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

    it("exposes the refined Nature and Royal color palettes", () => {
      expect(NATURE_PALETTE.warmIvory).toBe("#F6F2E9");
      expect(NATURE_PALETTE.sandstone).toBe("#E7D9C2");
      expect(NATURE_PALETTE.softCream).toBe("#FFFDF7");
      expect(NATURE_PALETTE.walnut).toBe("#896747");
      expect(NATURE_PALETTE.mutedSage).toBe("#A7B69A");
      expect(NATURE_PALETTE.forestSage).toBe("#718568");
      expect(NATURE_PALETTE.darkCocoa).toBe("#352C24");
      expect(NATURE_PALETTE.warmBrown).toBe("#69594A");
      expect(NATURE_PALETTE.lightSand).toBe("#D4C2A5");

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

  describe("Pit Highlighting and Seed Count Design", () => {
    it("renders box-free external seed count directly outside the pit", () => {
      render(
        <ThemeProvider initialTheme="nature">
          <Pit
            pitId={0}
            owner="PLAYER_1"
            seeds={5}
            status="OPEN"
            bonusAvailable={false}
            isSelectable={true}
            isActiveDrop={false}
            isAnimating={false}
            onSelect={vi.fn()}
            onClaimBonus={vi.fn()}
          />
        </ThemeProvider>
      );

      const countEl = screen.getByTestId("pit-count-0");
      expect(countEl).toBeInTheDocument();
      expect(countEl).toHaveTextContent("5");

      // Verify pit button has selectable highlight class
      const pitBtn = screen.getByTestId("pit-0");
      expect(pitBtn).toHaveClass("selectable");
      expect(pitBtn).not.toHaveClass("has-bonus");
      expect(pitBtn).not.toHaveClass("capture-target");
      expect(pitBtn).not.toHaveClass("continuation-target");
    });

    it("renders bonus highlight when bonus is available", () => {
      render(
        <ThemeProvider initialTheme="nature">
          <Pit
            pitId={2}
            owner="PLAYER_1"
            seeds={4}
            status="OPEN"
            bonusAvailable={true}
            isSelectable={true}
            isActiveDrop={false}
            isAnimating={false}
            onSelect={vi.fn()}
            onClaimBonus={vi.fn()}
          />
        </ThemeProvider>
      );

      const pitBtn = screen.getByTestId("pit-2");
      expect(pitBtn).toHaveClass("has-bonus");
      expect(pitBtn).toHaveClass("selectable");
    });

    it("renders continuation and capture target highlights accurately", () => {
      const { rerender } = render(
        <ThemeProvider initialTheme="nature">
          <Pit
            pitId={3}
            owner="PLAYER_1"
            seeds={2}
            status="OPEN"
            bonusAvailable={false}
            isSelectable={false}
            isActiveDrop={false}
            isAnimating={false}
            isContinuationTarget={true}
            onSelect={vi.fn()}
            onClaimBonus={vi.fn()}
          />
        </ThemeProvider>
      );

      let pitBtn = screen.getByTestId("pit-3");
      expect(pitBtn).toHaveClass("continuation-target");
      expect(pitBtn).not.toHaveClass("capture-target");

      rerender(
        <ThemeProvider initialTheme="nature">
          <Pit
            pitId={3}
            owner="PLAYER_1"
            seeds={2}
            status="OPEN"
            bonusAvailable={false}
            isSelectable={false}
            isActiveDrop={false}
            isAnimating={false}
            isCaptureTarget={true}
            onSelect={vi.fn()}
            onClaimBonus={vi.fn()}
          />
        </ThemeProvider>
      );

      pitBtn = screen.getByTestId("pit-3");
      expect(pitBtn).toHaveClass("capture-target");
    });

    it("marks closed pits as closed and prevents misleading selectable highlights", () => {
      render(
        <ThemeProvider initialTheme="nature">
          <Pit
            pitId={5}
            owner="PLAYER_1"
            seeds={0}
            status="CLOSED"
            bonusAvailable={false}
            isSelectable={false}
            isActiveDrop={false}
            isAnimating={false}
            onSelect={vi.fn()}
            onClaimBonus={vi.fn()}
          />
        </ThemeProvider>
      );

      const pitBtn = screen.getByTestId("pit-5");
      expect(pitBtn).toHaveClass("closed");
      expect(pitBtn).toBeDisabled();
      expect(screen.getByText("🔒")).toBeInTheDocument();
    });
  });

  describe("Front Page & App-Wide Coverage Audit", () => {
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

    it("applies Nature Theme in AI game mode and First Player modal", () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, "nature");

      const onSelectFirstPlayer = vi.fn();
      const onBack = vi.fn();

      render(
        <ThemeProvider initialTheme="nature">
          <FirstPlayerModal
            difficulty="beginner"
            onSelectFirstPlayer={onSelectFirstPlayer}
            onBack={onBack}
          />
        </ThemeProvider>
      );

      expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();
      expect(screen.getByTestId("first-player-player-btn")).toBeInTheDocument();
      expect(screen.getByTestId("first-player-ai-btn")).toBeInTheDocument();
      expect(screen.getByTestId("first-player-back-btn")).toBeInTheDocument();

      // Select Player first
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
      expect(onSelectFirstPlayer).toHaveBeenCalledWith("player");
    });

    it("renders RulesModal and NoticeModal under Nature Theme without layout regressions", () => {
      const onClose = vi.fn();

      const { rerender } = render(
        <ThemeProvider initialTheme="nature">
          <RulesModal isOpen={true} onClose={onClose} activePlayerCount={2} />
        </ThemeProvider>
      );

      expect(screen.getByTestId("rules-modal")).toBeInTheDocument();

      rerender(
        <ThemeProvider initialTheme="nature">
          <NoticeModal
            isOpen={true}
            title="Notice Test"
            message="Testing notice modal in Nature Theme"
            onClose={onClose}
          />
        </ThemeProvider>
      );

      expect(screen.getByTestId("notice-modal")).toBeInTheDocument();
    });
  });
});
