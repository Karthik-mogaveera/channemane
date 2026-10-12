import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "../../src/App";

describe("Mobile Landscape-Only Orientation Enforcement", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function mockViewport(isPortrait: boolean, isCoarseTouch: boolean, width: number, height: number) {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
    Object.defineProperty(navigator, "maxTouchPoints", { writable: true, configurable: true, value: isCoarseTouch ? 5 : 0 });

    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query === "(orientation: portrait)") {
        return {
          matches: isPortrait,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }
      if (query === "(pointer: coarse)") {
        return {
          matches: isCoarseTouch,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });
  }

  it("Test 1: Shows orientation prompt in mobile portrait mode and blocks interaction", () => {
    // Phone in portrait: 390x844
    mockViewport(true, true, 390, 844);

    render(<App />);

    const overlay = screen.getByTestId("orientation-prompt-overlay");
    expect(overlay).toBeInTheDocument();
    expect(screen.getByText("Rotate Your Device")).toBeInTheDocument();
    expect(
      screen.getByText(/Channemane is best played in landscape mode/i)
    ).toBeInTheDocument();
  });

  it("Test 2: Does not show orientation prompt in mobile landscape mode (844x390)", () => {
    // Phone in landscape: 844x390
    mockViewport(false, true, 844, 390);

    render(<App />);

    expect(
      screen.queryByTestId("orientation-prompt-overlay")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
  });

  it("Test 3: Does not block desktop gameplay even when window is narrow/tall without touch", () => {
    // Desktop window resized narrow: 600x900, but NO touch (coarse=false, maxTouchPoints=0)
    mockViewport(true, false, 600, 900);

    render(<App />);

    expect(
      screen.queryByTestId("orientation-prompt-overlay")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
  });

  it("Test 4: Preserves complete game state across simulated orientation changes", () => {
    // Start in mobile landscape: play a move on P0
    mockViewport(false, true, 844, 390);
    render(<App />);

    const pit0 = screen.getByTestId("pit-0");
    fireEvent.click(pit0);

    // Verify turn state changed
    const p0SeedsAfterMove = pit0.getAttribute("data-seeds");
    expect(p0SeedsAfterMove).not.toBe("5");

    // Rotate to portrait (390x844) and trigger orientationchange / resize
    mockViewport(true, true, 390, 844);
    fireEvent(window, new Event("resize"));
    fireEvent(window, new Event("orientationchange"));

    // Blocking overlay should appear
    expect(screen.getByTestId("orientation-prompt-overlay")).toBeInTheDocument();

    // Rotate back to landscape (844x390) and trigger orientationchange / resize
    mockViewport(false, true, 844, 390);
    fireEvent(window, new Event("resize"));
    fireEvent(window, new Event("orientationchange"));

    // Blocking overlay disappears and previous game state remains preserved
    expect(
      screen.queryByTestId("orientation-prompt-overlay")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute(
      "data-seeds",
      p0SeedsAfterMove
    );
  });
});
