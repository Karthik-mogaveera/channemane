import { describe, it, expect } from "vitest";
import { checkAndHandleMatchEnd, isMatchOver } from "../src/engine/matchEnd";
import { createInitialGame } from "../src/engine/board";

describe("TASK-13: Match-End Detection (Sections 45, 54)", () => {
  it.each([
    { p1: 66, p2: 4, expectedEnd: true, winner: "PLAYER_1", loser: "PLAYER_2" },
    { p1: 67, p2: 3, expectedEnd: true, winner: "PLAYER_1", loser: "PLAYER_2" },
    { p1: 68, p2: 2, expectedEnd: true, winner: "PLAYER_1", loser: "PLAYER_2" },
    { p1: 69, p2: 1, expectedEnd: true, winner: "PLAYER_1", loser: "PLAYER_2" },
    { p1: 70, p2: 0, expectedEnd: true, winner: "PLAYER_1", loser: "PLAYER_2" },
    { p1: 4, p2: 66, expectedEnd: true, winner: "PLAYER_2", loser: "PLAYER_1" },
    { p1: 3, p2: 67, expectedEnd: true, winner: "PLAYER_2", loser: "PLAYER_1" },
    { p1: 35, p2: 35, expectedEnd: false, winner: null, loser: null },
    { p1: 34, p2: 36, expectedEnd: false, winner: null, loser: null },
    { p1: 36, p2: 34, expectedEnd: false, winner: null, loser: null },
  ])(
    "boundary case: P1=$p1, P2=$p2 -> expectedEnd=$expectedEnd, winner=$winner",
    ({ p1, p2, expectedEnd, winner, loser }) => {
      const game = createInitialGame();
      // In settled state, all board pits have 0 seeds
      for (const pit of game.pits) {
        pit.seeds = 0;
        pit.bonusAvailable = false;
      }
      game.players.player1.storage = p1;
      game.players.player2.storage = p2;
      game.phase = "ROUND_SETTLEMENT";

      // Verify 70-seed conservation invariant
      const totalSeeds =
        game.players.player1.storage +
        game.players.player2.storage +
        game.seedsInHand +
        game.pits.reduce((acc, pit) => acc + pit.seeds, 0);
      expect(totalSeeds).toBe(70);

      expect(isMatchOver(game)).toBe(expectedEnd);

      const result = checkAndHandleMatchEnd(game);
      expect(result.isMatchEnd).toBe(expectedEnd);
      expect(result.winner).toBe(winner);
      expect(result.loser).toBe(loser);

      if (expectedEnd) {
        expect(game.phase).toBe("MATCH_END");
        expect(game.winner).toBe(winner);
      } else {
        expect(game.phase).toBe("ROUND_SETTLEMENT");
        expect(game.winner).toBeNull();
      }
    }
  );
});
