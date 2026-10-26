import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettlementModal } from "../../src/ui/components/SettlementModal";
import { MatchEndModal } from "../../src/ui/components/MatchEndModal";
import { RulesModal } from "../../src/ui/components/RulesModal";
import { NoticeModal } from "../../src/ui/components/NoticeModal";
import { FirstPlayerModal } from "../../src/ui/components/FirstPlayerModal";

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

    // Requirement 1: Verify Close (X) icon is completely removed from SettlementModal
    expect(screen.queryByTestId("close-settlement-btn")).toBeNull();
    const buttons = screen.getAllByRole("button");
    const hasCloseX = buttons.some((btn) => btn.textContent?.trim() === "×");
    expect(hasCloseX).toBe(false);
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

  it("renders MatchEndModal with final winner and restart button without Close (X) icon", () => {
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

    // Requirement 1: Verify Close (X) icon is completely removed from MatchEndModal
    expect(screen.queryByTestId("close-match-btn")).toBeNull();
    const buttons = screen.getAllByRole("button");
    const hasCloseX = buttons.some((btn) => btn.textContent?.trim() === "×");
    expect(hasCloseX).toBe(false);

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

  it("RulesModal dismisses when Escape key is pressed or backdrop is clicked", () => {
    const handleClose = vi.fn();
    render(<RulesModal isOpen={true} onClose={handleClose} />);

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Click backdrop
    const modalOverlay = screen.getByTestId("rules-modal");
    fireEvent.click(modalOverlay);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("SettlementModal triggers onClose (Review Board) when Escape key is pressed", () => {
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
        onStartNextRound={vi.fn()}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("NoticeModal renders title, message, and closes on Escape key, backdrop click, or action button", () => {
    const handleClose = vi.fn();
    render(
      <NoticeModal
        title="Coming Soon!"
        subtitle="Expert AI difficulty is currently under development."
        message="Currently, Beginner AI and Local Multiplayer are fully playable."
        onClose={handleClose}
        testId="coming-soon-modal"
        cardTestId="coming-soon-notice"
        titleId="coming-soon-title"
      />
    );

    expect(screen.getByText("Coming Soon!")).toBeInTheDocument();
    expect(screen.getByText("Expert AI difficulty is currently under development.")).toBeInTheDocument();
    expect(screen.getByText("Currently, Beginner AI and Local Multiplayer are fully playable.")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const overlay = screen.getByTestId("coming-soon-modal");
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(2);

    const okBtn = screen.getByTestId("notice-modal-ok-btn");
    fireEvent.click(okBtn);
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  it("FirstPlayerModal triggers onBack on Escape key or backdrop click", () => {
    const handleBack = vi.fn();
    render(
      <FirstPlayerModal
        difficulty="expert"
        onSelectFirstPlayer={vi.fn()}
        onBack={handleBack}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleBack).toHaveBeenCalledTimes(1);

    const overlay = screen.getByTestId("first-player-modal");
    fireEvent.click(overlay);
    expect(handleBack).toHaveBeenCalledTimes(2);
  });
});
