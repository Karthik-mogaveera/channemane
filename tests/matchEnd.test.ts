import { describe, it, expect } from "vitest";
import { checkAndHandleMatchEnd, isMatchOver } from "../src/engine/matchEnd";
import { createInitialGame } from "../src/engine/board";

describe("TASK-13: Match-End Detection (Sections 45, 54)", () => {
  it("Test 5 (Section 54): should end match when Player 2 has 4 seeds (66 / 4)", () => {
    const game = createInitialGame();
    game.phase = "ROUND_SETTLEMENT";
    game.players.player1.storage = 66;
    game.players.player2.storage = 4;

    expect(isMatchOver(game)).toBe(true);

    const result = checkAndHandleMatchEnd(game);
    expect(result.isMatchEnd).toBe(true);
    expect(result.winner).toBe("PLAYER_1");
    expect(result.loser).toBe("PLAYER_2");
    expect(game.phase).toBe("MATCH_END");
    expect(game.winner).toBe("PLAYER_1");
  });

  it("Test 6 (Section 54): should end match when Player 2 has 3 seeds (67 / 3)", () => {
    const game = createInitialGame();
    game.phase = "ROUND_SETTLEMENT";
    game.players.player1.storage = 67;
    game.players.player2.storage = 3;

    expect(isMatchOver(game)).toBe(true);

    const result = checkAndHandleMatchEnd(game);
    expect(result.isMatchEnd).toBe(true);
    expect(result.winner).toBe("PLAYER_1");
    expect(result.loser).toBe("PLAYER_2");
    expect(game.phase).toBe("MATCH_END");
    expect(game.winner).toBe("PLAYER_1");
  });

  it("should end match when Player 1 has fewer than 5 seeds (4 / 66)", () => {
    const game = createInitialGame();
    game.phase = "ROUND_SETTLEMENT";
    game.players.player1.storage = 4;
    game.players.player2.storage = 66;

    expect(isMatchOver(game)).toBe(true);

    const result = checkAndHandleMatchEnd(game);
    expect(result.isMatchEnd).toBe(true);
    expect(result.winner).toBe("PLAYER_2");
    expect(result.loser).toBe("PLAYER_1");
    expect(game.phase).toBe("MATCH_END");
    expect(game.winner).toBe("PLAYER_2");
  });

  it("should NOT end match when both players have at least 5 seeds in storage", () => {
    const game = createInitialGame();
    game.phase = "ROUND_SETTLEMENT";
    game.players.player1.storage = 35;
    game.players.player2.storage = 35;

    expect(isMatchOver(game)).toBe(false);

    const result = checkAndHandleMatchEnd(game);
    expect(result.isMatchEnd).toBe(false);
    expect(result.winner).toBeNull();
    expect(game.phase).toBe("ROUND_SETTLEMENT");
  });
});
