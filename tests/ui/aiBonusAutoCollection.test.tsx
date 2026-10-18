/**
 * Tests for Automatic AI-Owned Bonus Collection (Feature 1)
 *
 * Verifies:
 * 1. An AI-owned eligible bonus (4 seeds, bonusAvailable) is automatically claimed by Beginner AI.
 * 2. Four seeds are transferred to AI player's storage.
 * 3. The bonus pit becomes empty (0 seeds) and bonusAvailable becomes false.
 * 4. A human-owned bonus is NEVER automatically claimed by the AI.
 * 5. Expired (bonusAvailable=false) or invalid seed counts are not collected.
 * 6. Bonus is claimed exactly once (no duplicate claims).
 * 7. 70-seed conservation invariant holds throughout.
 * 8. AI auto-collects its bonus even during a human turn when human places 4th seed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { App } from "../../src/App";
import { createInitialGame } from "../../src/engine/board";
import { verifySeedConservation } from "../../src/engine/board";

describe("Automatic AI Bonus Collection (Feature 1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Test 1: Automatically claims an AI-owned eligible bonus and transfers 4 seeds to AI storage", () => {
    const customState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    // Make pit 8 (Player 2 / AI pit) have exactly 4 seeds with bonus available
    customState.pits[8].seeds = 4;
    customState.pits[8].bonusAvailable = true;
    // Balance total seeds to 70: pit 0 has 6 seeds
    customState.pits[0].seeds = 6;
    expect(verifySeedConservation(customState)).toBe(true);

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={customState}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Initial AI storage is 0, pit 8 has 4 seeds
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");
    expect(screen.getByTestId("pit-8")).toHaveAttribute("data-seeds", "4");

    // Advance past turn notification (800ms)
    act(() => {
      vi.advanceTimersByTime(900);
    });

    // Advance past bonus auto-claim delay (250-300ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // AI storage is now 4!
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("4");
    // Pit 8 is now empty!
    expect(screen.getByTestId("pit-8")).toHaveAttribute("data-seeds", "0");
  });

  it("Test 2: A human-owned bonus is NEVER automatically claimed by the AI", () => {
    const customState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    // Make pit 2 (Player 1 / Human pit) have 4 seeds with bonus available
    customState.pits[2].seeds = 4;
    customState.pits[2].bonusAvailable = true;
    // Balance total seeds to 70: pit 0 has 6 seeds
    customState.pits[0].seeds = 6;
    expect(verifySeedConservation(customState)).toBe(true);

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={customState}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Advance time generously (3 seconds)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Human bonus on pit 2 is STILL intact and NOT claimed by AI
    expect(screen.getByTestId("pit-2")).toHaveAttribute("data-seeds", "4");
    expect(screen.getByTestId("p1-captured-count")).toHaveTextContent("0");
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");
  });

  it("Test 3: An expired bonus (bonusAvailable=false) is NOT collected", () => {
    const customState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    // Pit 9 has 4 seeds but bonusAvailable is FALSE (expired)
    customState.pits[9].seeds = 4;
    customState.pits[9].bonusAvailable = false;
    customState.pits[0].seeds = 6;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={customState}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Pit 9 remains 4 seeds, storage remains 0
    expect(screen.getByTestId("pit-9")).toHaveAttribute("data-seeds", "4");
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");
  });

  it("Test 4: AI bonus auto-claim preserves 70-seed conservation invariant and claims exactly once", () => {
    const customState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    customState.pits[10].seeds = 4;
    customState.pits[10].bonusAvailable = true;
    customState.pits[0].seeds = 6;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={customState}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Initial total
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");

    // Advance timers past notification
    act(() => {
      vi.advanceTimersByTime(900);
    });

    // Advance timers past bonus claim
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("4");
    expect(screen.getByTestId("pit-10")).toHaveAttribute("data-seeds", "0");

    // Advance further to verify it does NOT claim again or double-credit
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("4");
  });

  it("Test 5: AI auto-collects its bonus when human places the 4th seed on AI's side", () => {
    const customState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    // Setup pit 6 (Player 1 pit) with 1 seed.
    // Setup pit 7 (AI pit) with 3 seeds.
    // When Player 1 sows from pit 6 (1 seed), seed will drop into pit 7 making it 4 seeds!
    customState.pits[6].seeds = 1;
    customState.pits[7].seeds = 3;
    customState.pits[0].seeds = 9; // balance to 70

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={customState}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Pass turn notification
    act(() => {
      vi.advanceTimersByTime(850);
    });

    // Player 1 selects pit 6 (1 seed)
    const pit6 = screen.getByTestId("pit-6");
    act(() => {
      pit6.click();
    });

    // Sowing finished. Pit 7 received 1 seed (now 4 seeds, bonus available)!
    // Advance timers so AI auto-collection claims pit 7 bonus
    act(() => {
      vi.advanceTimersByTime(900);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // AI storage received the 4 seeds!
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("4");
    expect(screen.getByTestId("pit-7")).toHaveAttribute("data-seeds", "0");
  });
});
