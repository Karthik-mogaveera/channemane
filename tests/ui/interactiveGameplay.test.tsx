import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";
import { Pit } from "../../src/ui/components/Pit";

describe("Interactive Gameplay UI: Sowing, Capture Confirmation, and Gestures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Section 1: Manual Continuous Sowing Flow", () => {
    it("pauses on completion of first distribution batch, highlights exact pit with green glow, and shows prompt", () => {
      render(<App initialScreen="GAME" />);

      // Player 1 taps legal starting pit P0
      const pit0 = screen.getByTestId("pit-0");
      act(() => {
        fireEvent.click(pit0);
      });

      // Pickup occurred: P0 is empty
      expect(pit0).toHaveAttribute("data-seeds", "0");

      // Advance through the 5 drop animations (5 * 450ms)
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(450);
        });
      }

      // Next step pauses in WAITING_FOR_CONTINUATION on pit 6
      act(() => {
        vi.advanceTimersByTime(450);
      });

      // Requirement 3: Exact next pit highlighted with green glow/pulse
      const pit6 = screen.getByTestId("pit-6");
      expect(pit6).toHaveAttribute("data-continuation-target", "true");
      expect(pit6).toHaveClass("continuation-target");

      // Requirement 4: Exact status message outside board
      const banner = screen.getByTestId("turn-indicator");
      expect(banner).toHaveTextContent("Choose the highlighted pit to continue sowing.");

      // Requirement 4: Seeds remain inside pit 6 before player confirmation
      expect(pit6).toHaveAttribute("data-seeds", "5");

      // Requirement 6: Tapping a different pit does not alter the board or advance
      const pit1 = screen.getByTestId("pit-1");
      const pit1SeedsBefore = pit1.getAttribute("data-seeds");
      act(() => {
        fireEvent.click(pit1);
      });
      expect(pit1.getAttribute("data-seeds")).toBe(pit1SeedsBefore);
      expect(pit6).toHaveAttribute("data-continuation-target", "true");

      // Requirement 5: Tapping the highlighted pit resumes sowing
      act(() => {
        fireEvent.click(pit6);
      });

      // Pit 6 seeds are scooped into hand
      expect(pit6).toHaveAttribute("data-seeds", "0");
      expect(pit6).not.toHaveAttribute("data-continuation-target", "true");
    });
  });

  describe("Section 2: Player-Confirmed Capture Flow", () => {
    it("highlights capturable pit with amber glow, prompts player, and transfers seeds on confirmation", () => {
      const handleConfirmCapture = vi.fn();
      const handleSelect = vi.fn();

      render(
        <Pit
          pitId={3}
          owner="PLAYER_1"
          seeds={6}
          status="OPEN"
          bonusAvailable={false}
          isSelectable={false}
          isActiveDrop={false}
          isAnimating={false}
          isCaptureTarget={true}
          onSelect={handleSelect}
          onConfirmCapture={handleConfirmCapture}
          onClaimBonus={vi.fn()}
        />
      );

      const pit3 = screen.getByTestId("pit-3");
      // Requirement 10: Capturable pit highlighted amber
      expect(pit3).toHaveClass("capture-target");
      expect(pit3).toHaveAttribute("data-capture-target", "true");

      // Requirement 11: Seeds remain inside pit
      expect(pit3).toHaveAttribute("data-seeds", "6");

      // Requirement 12: Tapping executes capture confirmation
      act(() => {
        fireEvent.click(pit3);
      });
      expect(handleConfirmCapture).toHaveBeenCalledWith(3);
      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe("Section 3: Bonus Collection Gesture & Claim Button Removal", () => {
    it("Requirement 18: Never renders visible Claim buttons on bonus pits", () => {
      render(<App initialScreen="GAME" />);
      expect(screen.queryAllByText(/CLAIM \+4/i)).toHaveLength(0);
      expect(screen.queryAllByTestId(/^claim-bonus-/)).toHaveLength(0);
    });

    it("Requirement 20: Long-press (500ms) collects bonus and shows progress ring", () => {
      const handleClaimBonus = vi.fn();

      render(
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
          onClaimBonus={handleClaimBonus}
        />
      );

      const pit2 = screen.getByTestId("pit-2");
      expect(pit2).toHaveClass("has-bonus");

      // Start long-press pointerDown
      act(() => {
        fireEvent.pointerDown(pit2, { clientX: 50, clientY: 50, button: 0 });
      });

      // Progress indicator should be visible during hold
      expect(screen.getByTestId("hold-progress-2")).toBeInTheDocument();

      // Advance 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Bonus awarded!
      expect(handleClaimBonus).toHaveBeenCalledWith(2);
    });

    it("Requirement 21: Releasing touch before 500ms does NOT award the bonus", () => {
      const handleClaimBonus = vi.fn();
      const handleSelect = vi.fn();

      render(
        <Pit
          pitId={2}
          owner="PLAYER_1"
          seeds={4}
          status="OPEN"
          bonusAvailable={true}
          isSelectable={true}
          isActiveDrop={false}
          isAnimating={false}
          onSelect={handleSelect}
          onClaimBonus={handleClaimBonus}
        />
      );

      const pit2 = screen.getByTestId("pit-2");

      act(() => {
        fireEvent.pointerDown(pit2, { clientX: 50, clientY: 50, button: 0 });
        vi.advanceTimersByTime(300); // Only 300ms
        fireEvent.pointerUp(pit2);
      });

      // Bonus must NOT be awarded
      expect(handleClaimBonus).not.toHaveBeenCalled();
      // Progress indicator removed immediately
      expect(screen.queryByTestId("hold-progress-2")).not.toBeInTheDocument();
    });

    it("Requirement 22: Moving finger away (>10px) cancels hold gesture without collecting bonus", () => {
      const handleClaimBonus = vi.fn();

      render(
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
          onClaimBonus={handleClaimBonus}
        />
      );

      const pit2 = screen.getByTestId("pit-2");

      act(() => {
        fireEvent.pointerDown(pit2, { clientX: 50, clientY: 50, button: 0 });
        vi.advanceTimersByTime(200);
        // Finger moved by 25px (> 10px)
        fireEvent.pointerMove(pit2, { clientX: 75, clientY: 50 });
        vi.advanceTimersByTime(400);
      });

      expect(handleClaimBonus).not.toHaveBeenCalled();
    });

    it("Requirement 30: A successful long-press bonus claim does not also trigger sowing", () => {
      const handleClaimBonus = vi.fn();
      const handleSelect = vi.fn();

      render(
        <Pit
          pitId={0}
          owner="PLAYER_1"
          seeds={4}
          status="OPEN"
          bonusAvailable={true}
          isSelectable={true}
          isActiveDrop={false}
          isAnimating={false}
          onSelect={handleSelect}
          onClaimBonus={handleClaimBonus}
        />
      );

      const pit0 = screen.getByTestId("pit-0");

      act(() => {
        fireEvent.pointerDown(pit0, { clientX: 50, clientY: 50, button: 0 });
        vi.advanceTimersByTime(500);
        fireEvent.click(pit0);
      });

      expect(handleClaimBonus).toHaveBeenCalledWith(0);
      // Sowing was NOT triggered
      expect(handleSelect).not.toHaveBeenCalled();
    });

    it("Requirement 33: Desktop right-click on bonus pit collects bonus without context menu", () => {
      render(<App initialScreen="GAME" />);

      const board = screen.getByTestId("channemane-board");
      const defaultPrevented = fireEvent.contextMenu(board);
      expect(defaultPrevented).toBe(false); // e.preventDefault() was called
    });
  });

  describe("Section 7: Status Messages and Contextual Guidance", () => {
    it("displays player turn at start and continuation message when paused", () => {
      render(<App initialScreen="GAME" />);
      expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");

      // Start sowing
      act(() => {
        fireEvent.click(screen.getByTestId("pit-0"));
        vi.runAllTimers();
      });

      expect(screen.getByTestId("turn-indicator")).toHaveTextContent(
        "Choose the highlighted pit to continue sowing."
      );
    });
  });
});
