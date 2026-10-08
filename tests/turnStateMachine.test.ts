import { describe, it, expect } from "vitest";
import {
  canTransitionTurnPhase,
  transitionTurnPhase,
} from "../src/engine/turnStateMachine";
import { createInitialGame } from "../src/engine/board";

describe("PH2-T11: Turn State Machine & Explicit Transition Validator", () => {
  it("should permit legal forward turn phase progression", () => {
    const game = createInitialGame("PLAYER_1");
    expect(game.turnPhase).toBe("PLAYER_TURN");

    // PLAYER_TURN -> PIT_SELECTED
    expect(canTransitionTurnPhase("PLAYER_TURN", "PIT_SELECTED")).toBe(true);
    let res = transitionTurnPhase(game, "PIT_SELECTED");
    expect(res.success).toBe(true);
    expect(game.turnPhase).toBe("PIT_SELECTED");

    // PIT_SELECTED -> SOWING
    expect(canTransitionTurnPhase("PIT_SELECTED", "SOWING")).toBe(true);
    res = transitionTurnPhase(game, "SOWING");
    expect(res.success).toBe(true);
    expect(game.turnPhase).toBe("SOWING");

    // SOWING -> CONTINUOUS_SOWING
    expect(canTransitionTurnPhase("SOWING", "CONTINUOUS_SOWING")).toBe(true);
    res = transitionTurnPhase(game, "CONTINUOUS_SOWING");
    expect(res.success).toBe(true);
    expect(game.turnPhase).toBe("CONTINUOUS_SOWING");

    // CONTINUOUS_SOWING -> CAPTURE_CHECK
    expect(canTransitionTurnPhase("CONTINUOUS_SOWING", "CAPTURE_CHECK")).toBe(true);
    res = transitionTurnPhase(game, "CAPTURE_CHECK");
    expect(res.success).toBe(true);
    expect(game.turnPhase).toBe("CAPTURE_CHECK");

    // CAPTURE_CHECK -> TURN_END
    expect(canTransitionTurnPhase("CAPTURE_CHECK", "TURN_END")).toBe(true);
    res = transitionTurnPhase(game, "TURN_END");
    expect(res.success).toBe(true);
    expect(game.turnPhase).toBe("TURN_END");

    // TURN_END -> PLAYER_TURN
    expect(canTransitionTurnPhase("TURN_END", "PLAYER_TURN")).toBe(true);
    res = transitionTurnPhase(game, "PLAYER_TURN");
    expect(res.success).toBe(true);
    expect(game.turnPhase).toBe("PLAYER_TURN");
  });

  it("should reject illegal out-of-order turn phase transitions", () => {
    const game = createInitialGame("PLAYER_1");
    expect(game.turnPhase).toBe("PLAYER_TURN");

    // Cannot jump from PLAYER_TURN directly to SOWING or CAPTURE_CHECK
    expect(canTransitionTurnPhase("PLAYER_TURN", "SOWING")).toBe(false);
    expect(canTransitionTurnPhase("PLAYER_TURN", "CAPTURE_CHECK")).toBe(false);

    const badRes = transitionTurnPhase(game, "CAPTURE_CHECK");
    expect(badRes.success).toBe(false);
    expect(game.turnPhase).toBe("PLAYER_TURN"); // State unchanged
  });

  it("should permit direct transition from SOWING to CAPTURE_CHECK if no continuous scoop occurred", () => {
    expect(canTransitionTurnPhase("SOWING", "CAPTURE_CHECK")).toBe(true);
  });
});
