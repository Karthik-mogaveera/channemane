/**
 * Channemane Main Application Component
 * Coordinates the game board, turn indicators, player panels, and modals.
 */

import React from "react";
import { useChannemaneGame } from "./ui/hooks/useChannemaneGame";
import { Header } from "./ui/components/Header";
import { TurnBanner } from "./ui/components/TurnBanner";
import { PlayerPanels } from "./ui/components/PlayerPanels";
import { GameBoard } from "./ui/components/GameBoard";
import { SettlementModal } from "./ui/components/SettlementModal";
import { MatchEndModal } from "./ui/components/MatchEndModal";
import { RulesModal } from "./ui/components/RulesModal";

export const App: React.FC = () => {
  const {
    gameState,
    selectablePits,
    isAnimating,
    activeDropPit,
    visualHandSeeds,
    lastActionError,
    settlementSummary,
    matchSummary,
    isRulesOpen,
    setIsRulesOpen,
    animationSettings,
    selectPit,
    claimBonus,
    startNextRound,
    restartMatch,
    clearError,
    dismissSettlementModal,
    reopenSettlementModal,
    dismissMatchModal,
    toggleAnimationSpeed,
  } = useChannemaneGame();

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        onRestart={() => restartMatch("PLAYER_1")}
        onOpenRules={() => setIsRulesOpen(true)}
        animationSettings={animationSettings}
        onToggleAnimation={toggleAnimationSpeed}
      />

      {/* Turn & Status Indicator */}
      <TurnBanner
        currentPlayer={gameState.currentPlayer}
        gamePhase={gameState.phase}
        turnPhase={gameState.turnPhase}
        round={gameState.round}
        isAnimating={isAnimating}
        visualHandSeeds={visualHandSeeds}
      />

      {/* Round Review Action Bar (Issue 8) */}
      {gameState.phase === "ROUND_SETTLEMENT" && (
        <div
          className="round-settlement-action-bar"
          data-testid="settlement-review-bar"
          role="region"
          aria-label="Round settlement review controls"
        >
          <div className="settlement-bar-info">
            <span>🏁 <strong>Round {gameState.round} Settled!</strong> Reviewing board state.</span>
          </div>
          <div className="settlement-bar-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={reopenSettlementModal}
              data-testid="reopen-settlement-btn"
            >
              📊 View Summary
            </button>
            <button
              type="button"
              className="btn"
              onClick={startNextRound}
              data-testid="advance-next-round-btn"
            >
              Start Next Round →
            </button>
          </div>
        </div>
      )}

      {/* Invalid Action Error Alert */}
      {lastActionError && (
        <div className="error-alert" role="alert" data-testid="error-alert">
          <span>⚠️ {lastActionError}</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "2px 8px", minHeight: "28px" }}
            onClick={clearError}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Player Score & Wins Bar */}
      <PlayerPanels
        currentPlayer={gameState.currentPlayer}
        player1={gameState.players.player1}
        player2={gameState.players.player2}
      />

      {/* 14-Pit Physical Board & Storage Bowls */}
      <main>
        <GameBoard
          gameState={gameState}
          selectablePits={selectablePits}
          activeDropPit={activeDropPit}
          isAnimating={isAnimating}
          onSelectPit={(pitId) => selectPit(pitId)}
          onClaimBonus={(pitId) => claimBonus(pitId)}
        />
      </main>

      {/* Settlement Modal (End of Round) */}
      {settlementSummary && (
        <SettlementModal
          settlement={settlementSummary}
          onStartNextRound={startNextRound}
          onClose={dismissSettlementModal}
        />
      )}

      {/* Match End Modal (Victory) */}
      {matchSummary && (
        <MatchEndModal
          matchResult={matchSummary}
          onNewMatch={() => restartMatch("PLAYER_1")}
          onClose={dismissMatchModal}
        />
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
};

export default App;
