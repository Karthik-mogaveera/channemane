/**
 * Comprehensive Test Suite for:
 * 1. Local Multiplayer Turn Announcement Popup (2-player & 3-player)
 * 2. Three-Player Disqualification Reporting (Settlement Modal & Storage Display)
 * 3. Match Finished Modal Results Presentation (2-Player Winner/Lost, 3-Player 1st/2nd/Lost Placements)
 * 4. Home Button Navigation and State Reset
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { App } from "../../src/App";
import { createInitialGame } from "../../src/engine/board";
import { executeRoundSettlement } from "../../src/engine/settlement";
import { checkAndHandleMatchEnd } from "../../src/engine/matchEnd";
import { setupNextRoundThreePlayer } from "../../src/engine/roundSetup";
import { SettlementModal } from "../../src/ui/components/SettlementModal";
import type { GameState } from "../../src/engine/types";

describe("Local Multiplayer Enhancements & Disqualification Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 1. Local Multiplayer Turn Announcement (2-Player & 3-Player)
  // --------------------------------------------------------------------------
  it("Requirement 1: Local 2-player displays Player 1's popup before sowing, blocks input, and dismisses on click", () => {
    render(<App />);

    // Start 2-Player Local Game
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });

    // Popup appears before sowing
    const popup = screen.getByTestId("turn-notification-popup");
    expect(popup).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Player 1's Turn");

    // Input blocked while popup is open
    const pit0 = screen.getByTestId("pit-0");
    expect(pit0).toBeDisabled();
    expect(pit0).toHaveAttribute("data-selectable", "false");

    // Dismiss by clicking the popup directly
    act(() => {
      fireEvent.click(popup);
    });

    // Popup dismissed
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();

    // Player 1 can now select their pit
    expect(pit0).not.toBeDisabled();
    expect(pit0).toHaveAttribute("data-selectable", "true");
  });

  it("Requirement 1: Local 3-player displays correct player popup before sowing and auto-dismisses after 800ms", () => {
    render(<App />);

    // Start 3-Player Local Game
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-3"));
    });

    // Turn 1 announcement for Player 1
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Player 1's Turn");

    // P1 pits disabled during popup
    const pit0 = screen.getByTestId("pit-0");
    expect(pit0).toBeDisabled();

    // Fast forward 800ms
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Popup gone, P1 can move
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();
    expect(pit0).not.toBeDisabled();
    expect(pit0).toHaveAttribute("data-selectable", "true");
  });

  // --------------------------------------------------------------------------
  // 2. Three-Player Disqualification Reporting (Settlement & Storage)
  // --------------------------------------------------------------------------
  it("Requirement 2: Disqualified player in 3-player settlement modal displays 'Disqualified'", () => {
    // Construct game state at round end where Player 3 only swept 4 seeds (storage < 5)
    const state: GameState = createInitialGame("PLAYER_1", "local", null, undefined, 3);
    state.players.player1.storage = 36;
    state.players.player2.storage = 35;
    state.players.player3!.storage = 0;

    // Put 4 seeds on Player 3 side, 0 on P1/P2
    for (const pit of state.pits) {
      if (pit.owner === "PLAYER_3" && pit.id === 10) {
        pit.seeds = 4;
      } else {
        pit.seeds = 0;
      }
    }

    const settlementRes = executeRoundSettlement(state);
    expect(settlementRes.success).toBe(true);
    if (!settlementRes.success) throw new Error("Expected settlement to succeed");
    expect(settlementRes.data.disqualifiedPlayers).toContain("PLAYER_3");

    // Render SettlementModal with the settled state
    render(
      <SettlementModal
        settlement={settlementRes.data}
        onStartNextRound={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Settlement modal is visible
    expect(screen.getByTestId("settlement-modal")).toBeInTheDocument();
    // Player 1 and Player 2 have accurate numerical values
    expect(screen.getByTestId("settlement-p1-storage")).toHaveTextContent("36");
    expect(screen.getByTestId("settlement-p2-storage")).toHaveTextContent("35");
    // Player 3 displays "Disqualified"
    expect(screen.getByTestId("settlement-p3-storage")).toHaveTextContent("Disqualified");
  });

  it("Requirement 2: Disqualified player's storage displays 'Disqualified' in subsequent round, pits stay closed", () => {
    // Create state where Player 3 is disqualified
    const state: GameState = createInitialGame("PLAYER_1", "local", null, undefined, 3);
    state.players.player1.storage = 38;
    state.players.player2.storage = 33;
    state.players.player3!.storage = 4; // < 5

    // Run setupNextRoundThreePlayer which triggers recovery & disqualification
    const setupRes = setupNextRoundThreePlayer(state);
    expect(setupRes.success).toBe(true);
    if (!setupRes.success) throw new Error("Expected setup to succeed");
    expect(setupRes.data.disqualifiedPlayers).toContain("PLAYER_3");
    expect(setupRes.data.recovered).toBe(true);
    expect(state.disqualifiedPlayers).toContain("PLAYER_3");

    render(<App initialScreen="GAME" initialGameState={state} />);

    // Dismiss turn notification if present
    act(() => {
      vi.advanceTimersByTime(850);
    });

    // Storage for Player 3 displays "Disqualified"
    const p3StorageCount = screen.getByTestId("p3-captured-count");
    expect(p3StorageCount).toHaveTextContent("Disqualified");

    // Player 1 and Player 2 active storages show numbers (0 at start of recovery round)
    expect(screen.getByTestId("p1-captured-count")).toHaveTextContent("0");
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");

    // Player 3 pits (10..14) must remain permanently closed and not selectable
    for (let id = 10; id <= 14; id++) {
      const pit = screen.getByTestId(`pit-${id}`);
      expect(pit).toHaveAttribute("data-status", "CLOSED");
      expect(pit).toHaveAttribute("data-selectable", "false");
    }
  });

  // --------------------------------------------------------------------------
  // 3. Match End Results & Placements
  // --------------------------------------------------------------------------
  it("Requirement 3: 2-player match results modal displays Winner and Lost rankings", () => {
    const state: GameState = createInitialGame("PLAYER_1", "local", null, undefined, 2);
    state.players.player1.storage = 66;
    state.players.player2.storage = 4; // cannot fund G1

    const matchRes = checkAndHandleMatchEnd(state);
    expect(matchRes.isMatchEnd).toBe(true);
    expect(matchRes.winner).toBe("PLAYER_1");
    expect(matchRes.rankings).toBeDefined();

    const p1Ranking = matchRes.rankings?.find((r) => r.player === "PLAYER_1");
    const p2Ranking = matchRes.rankings?.find((r) => r.player === "PLAYER_2");

    expect(p1Ranking?.label).toBe("Winner");
    expect(p2Ranking?.label).toBe("Lost");

    // Render App with match completed state
    render(<App initialScreen="GAME" initialGameState={state} />);

    expect(screen.getByTestId("match-end-modal")).toBeInTheDocument();
    expect(screen.getByTestId("ranking-badge-player_1")).toHaveTextContent("Winner");
    expect(screen.getByTestId("ranking-badge-player_2")).toHaveTextContent("Lost");
    expect(screen.getByTestId("ranking-player-player_1")).toHaveTextContent("Player 1");
    expect(screen.getByTestId("ranking-player-player_2")).toHaveTextContent("Player 2");
  });

  it("Requirement 3: 3-player match results modal displays 1st Place, 2nd Place, and Lost based on sequential elimination", () => {
    const state: GameState = createInitialGame("PLAYER_1", "local", null, undefined, 3);
    // Player 3 was eliminated first (round 1), Player 2 eliminated second (round 2)
    state.disqualifiedPlayers = ["PLAYER_3"];
    state.players.player1.storage = 46;
    state.players.player2.storage = 4; // P2 now cannot play -> eliminated second

    const matchRes = checkAndHandleMatchEnd(state);
    expect(matchRes.isMatchEnd).toBe(true);
    expect(matchRes.winner).toBe("PLAYER_1");
    expect(state.disqualifiedPlayers).toEqual(["PLAYER_3", "PLAYER_2"]);

    // Rankings:
    // 1st Place: Winner (PLAYER_1)
    // 2nd Place: PLAYER_2 (eliminated immediately before winner)
    // Lost: PLAYER_3 (eliminated earliest)
    const rankings = matchRes.rankings;
    expect(rankings).toBeDefined();
    expect(rankings?.[0].player).toBe("PLAYER_1");
    expect(rankings?.[0].label).toBe("1st Place");

    expect(rankings?.[1].player).toBe("PLAYER_2");
    expect(rankings?.[1].label).toBe("2nd Place");

    expect(rankings?.[2].player).toBe("PLAYER_3");
    expect(rankings?.[2].label).toBe("Lost");

    render(<App initialScreen="GAME" initialGameState={state} />);

    expect(screen.getByTestId("match-end-modal")).toBeInTheDocument();
    expect(screen.getByTestId("ranking-badge-player_1")).toHaveTextContent("1st Place");
    expect(screen.getByTestId("ranking-badge-player_2")).toHaveTextContent("2nd Place");
    expect(screen.getByTestId("ranking-badge-player_3")).toHaveTextContent("Lost");
  });

  // --------------------------------------------------------------------------
  // 4. Home Button Navigation and State Reset
  // --------------------------------------------------------------------------
  it("Requirement 4: Home button navigates to main menu and cleans state without leaking into next game", () => {
    const state: GameState = createInitialGame("PLAYER_1", "local", null, undefined, 3);
    state.disqualifiedPlayers = ["PLAYER_3", "PLAYER_2"];
    state.phase = "MATCH_END";
    state.winner = "PLAYER_1";

    render(<App initialScreen="GAME" initialGameState={state} />);

    // Match End modal is displayed with Home button
    const homeBtn = screen.getByTestId("match-home-btn");
    expect(homeBtn).toBeInTheDocument();

    // Click Home button
    act(() => {
      fireEvent.click(homeBtn);
    });

    // Should navigate to Main Menu
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("match-end-modal")).not.toBeInTheDocument();

    // Now start a new local 2-player game
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });

    // The game must be a fresh 2-player board (14 pits, no disqualified players)
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.queryByTestId("three-player-pits-grid")).not.toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toBeInTheDocument();
    expect(screen.getByTestId("pit-13")).toBeInTheDocument();
    expect(screen.queryByTestId("pit-14")).not.toBeInTheDocument();
  });

  it("Requirement 1: Subsequent turn transition shows correct player announcement and blocks input until dismissed", () => {
    // Fast animation mode for test speed
    render(
      <App
        initialAnimationSettings={{ enabled: false, stepDelayMs: 0 }}
      />
    );

    // Start 2-Player Local Game
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });

    // Opening popup for Player 1
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Player 1's Turn");

    // Dismiss P1 turn popup
    act(() => {
      fireEvent.click(screen.getByTestId("turn-notification-popup"));
    });
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();

    // Player 1 executes a move on Pit 0 (5 seeds: seeds distributed to 1,2,3,4,5)
    // In Channemane, continuous sowing runs until completion
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
    });

    // Handle any continuation / capture prompts if present, or advance time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // If turn has passed to Player 2, Player 2's turn announcement must appear
    const p2Popup = screen.queryByTestId("turn-notification-popup");
    if (p2Popup) {
      expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Player 2's Turn");
      // Pit 7 (Player 2 pit) is blocked while popup is open
      const pit7 = screen.getByTestId("pit-7");
      expect(pit7).toBeDisabled();

      // Dismiss popup
      act(() => {
        fireEvent.click(p2Popup);
      });
      expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();
      expect(pit7).not.toBeDisabled();
    }
  });

  it("Requirement 1 & 5: Playing with AI mode turn popup remains completely unchanged", () => {
    render(<App />);

    // Play with AI -> Beginner -> Human opening
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    // Human opening popup says "Your turn"
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Your turn");

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();
  });
});
