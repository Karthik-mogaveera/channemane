import { describe, it, expect } from "vitest";
import type {
  Player,
  PitStatus,
  GamePhase,
  TurnPhase,
  Pit,
  PlayerState,
  GameState,
  ActionResult,
} from "../src/engine/types";
import {
  isPlayer,
  isPitStatus,
  isGamePhase,
  isTurnPhase,
} from "../src/engine/types";

describe("PH2-T01: Game Types and State Interfaces", () => {
  describe("Type Discriminators and Validators", () => {
    it("should correctly validate Player union values", () => {
      expect(isPlayer("PLAYER_1")).toBe(true);
      expect(isPlayer("PLAYER_2")).toBe(true);
      expect(isPlayer("PLAYER_3")).toBe(false);
      expect(isPlayer("")).toBe(false);
      expect(isPlayer(null)).toBe(false);
    });

    it("should correctly validate PitStatus union values", () => {
      expect(isPitStatus("OPEN")).toBe(true);
      expect(isPitStatus("CLOSED")).toBe(true);
      expect(isPitStatus("SEALED")).toBe(false);
      expect(isPitStatus(123)).toBe(false);
    });

    it("should correctly validate GamePhase union values", () => {
      const phases: GamePhase[] = [
        "GAME_START",
        "ROUND_SETUP",
        "PLAYING",
        "ROUND_SETTLEMENT",
        "MATCH_END",
      ];
      for (const phase of phases) {
        expect(isGamePhase(phase)).toBe(true);
      }
      expect(isGamePhase("GAME_OVER")).toBe(false);
    });

    it("should correctly validate TurnPhase union values", () => {
      const phases: TurnPhase[] = [
        "PLAYER_TURN",
        "PIT_SELECTED",
        "SOWING",
        "CONTINUOUS_SOWING",
        "CAPTURE_CHECK",
        "TURN_END",
      ];
      for (const phase of phases) {
        expect(isTurnPhase(phase)).toBe(true);
      }
      expect(isTurnPhase("IDLE")).toBe(false);
    });
  });

  describe("Interface Conformance", () => {
    it("should conform to Pit structure defined in Section 15", () => {
      const samplePit: Pit = {
        id: 0,
        owner: "PLAYER_1",
        seeds: 5,
        status: "OPEN",
        bonusAvailable: false,
      };

      expect(samplePit.id).toBe(0);
      expect(samplePit.owner).toBe("PLAYER_1");
      expect(samplePit.seeds).toBe(5);
      expect(samplePit.status).toBe("OPEN");
      expect(samplePit.bonusAvailable).toBe(false);
    });

    it("should conform to PlayerState structure defined in Section 15", () => {
      const samplePlayerState: PlayerState = {
        storage: 10,
        roundCaptured: 4,
        roundWins: 1,
      };

      expect(samplePlayerState.storage).toBe(10);
      expect(samplePlayerState.roundCaptured).toBe(4);
      expect(samplePlayerState.roundWins).toBe(1);
    });

    it("should conform to full GameState structure with seedsInHand support", () => {
      const pits: Pit[] = Array.from({ length: 14 }, (_, i) => ({
        id: i,
        owner: (i < 7 ? "PLAYER_1" : "PLAYER_2") as Player,
        seeds: 5,
        status: "OPEN" as PitStatus,
        bonusAvailable: false,
      }));

      const gameState: GameState = {
        round: 1,
        phase: "PLAYING",
        turnPhase: "PLAYER_TURN",
        currentPlayer: "PLAYER_1",
        startingPlayer: "PLAYER_1",
        pits,
        players: {
          player1: { storage: 0, roundCaptured: 0, roundWins: 0 },
          player2: { storage: 0, roundCaptured: 0, roundWins: 0 },
        },
        seedsInHand: 0,
        selectedPit: null,
        lastPit: null,
        winner: null,
        roundWinner: null,
      };

      expect(gameState.round).toBe(1);
      expect(gameState.phase).toBe("PLAYING");
      expect(gameState.turnPhase).toBe("PLAYER_TURN");
      expect(gameState.currentPlayer).toBe("PLAYER_1");
      expect(gameState.startingPlayer).toBe("PLAYER_1");
      expect(gameState.seedsInHand).toBe(0);
      expect(gameState.pits.length).toBe(14);
      expect(gameState.players.player1.storage).toBe(0);
      expect(gameState.players.player2.storage).toBe(0);
      expect(gameState.selectedPit).toBeNull();
      expect(gameState.lastPit).toBeNull();
      expect(gameState.winner).toBeNull();
      expect(gameState.roundWinner).toBeNull();
    });

    it("should support typed ActionResult for immutable state transitions", () => {
      const successResult: ActionResult<string> = {
        success: true,
        data: "Move completed",
      };
      const failureResult: ActionResult<string> = {
        success: false,
        error: "Invalid pit selected",
      };

      expect(successResult.success).toBe(true);
      expect(failureResult.success).toBe(false);
      if (!failureResult.success) {
        expect(failureResult.error).toBe("Invalid pit selected");
      }
    });
  });
});
