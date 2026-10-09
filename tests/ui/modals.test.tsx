import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettlementModal } from "../../src/ui/components/SettlementModal";
import { MatchEndModal } from "../../src/ui/components/MatchEndModal";
import { RulesModal } from "../../src/ui/components/RulesModal";

describe("Game Modals", () => {
  it("renders SettlementModal with scores and starts next round", () => {
    const handleNext = vi.fn();
    const handleClose = vi.fn();

    render(
      <SettlementModal
        settlement={{
          player1RemainingTransferred: 4,
          player2RemainingTransferred: 2,
          player1FinalStorage: 42,
          player2FinalStorage: 28,
          roundWinner: "PLAYER_1",
        }}
        onStartNextRound={handleNext}
        onClose={handleClose}
      />
    );

    expect(screen.getByTestId("settlement-modal")).toBeInTheDocument();
    expect(screen.getByTestId("round-winner-banner")).toHaveTextContent(
      "Player 1 Wins the Round!"
    );
    expect(screen.getByTestId("settlement-p1-storage")).toHaveTextContent("42");
    expect(screen.getByTestId("settlement-p2-storage")).toHaveTextContent("28");

    fireEvent.click(screen.getByTestId("start-next-round-btn"));
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when Review Board button is clicked (Issue 8)", () => {
    const handleNext = vi.fn();
    const handleClose = vi.fn();

    render(
      <SettlementModal
        settlement={{
          player1RemainingTransferred: 0,
          player2RemainingTransferred: 0,
          player1FinalStorage: 35,
          player2FinalStorage: 35,
          roundWinner: null,
        }}
        onStartNextRound={handleNext}
        onClose={handleClose}
      />
    );

    const reviewBtn = screen.getByTestId("review-board-btn");
    expect(reviewBtn).toBeInTheDocument();
    fireEvent.click(reviewBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleNext).not.toHaveBeenCalled();
  });

  it("renders MatchEndModal with final winner and restart button", () => {
    const handleNewMatch = vi.fn();
    const handleClose = vi.fn();

    render(
      <MatchEndModal
        matchResult={{
          isMatchEnd: true,
          winner: "PLAYER_2",
          loser: "PLAYER_1",
          reason: "Player 1 has fewer than 5 seeds and cannot open any pits",
        }}
        onNewMatch={handleNewMatch}
        onClose={handleClose}
      />
    );

    expect(screen.getByTestId("match-end-modal")).toBeInTheDocument();
    expect(screen.getByTestId("match-winner-banner")).toHaveTextContent(
      "Player 2 Wins the Match!"
    );

    fireEvent.click(screen.getByTestId("new-match-btn"));
    expect(handleNewMatch).toHaveBeenCalledTimes(1);
  });

  it("renders RulesModal with authentic Channemane rules", () => {
    const handleClose = vi.fn();

    render(<RulesModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByTestId("rules-modal")).toBeInTheDocument();
    expect(screen.getByText("Origins & Heritage")).toBeInTheDocument();
    expect(screen.getByText(/3 → 4/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-rules-btn"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
