/**
 * Channemane Main Application Component
 * Coordinates Main Menu, Difficulty Selection, and Game Board screens.
 */

import React, { useState } from "react";
import { useChannemaneGame } from "./ui/hooks/useChannemaneGame";
import { useOrientation } from "./ui/hooks/useOrientation";
import { Header } from "./ui/components/Header";
import { TurnBanner } from "./ui/components/TurnBanner";
import { PlayerPanels } from "./ui/components/PlayerPanels";
import { GameBoard } from "./ui/components/GameBoard";
import { SettlementModal } from "./ui/components/SettlementModal";
import { MatchEndModal } from "./ui/components/MatchEndModal";
import { RulesModal } from "./ui/components/RulesModal";
import { OrientationPrompt } from "./ui/components/OrientationPrompt";
import { MainMenu } from "./ui/components/MainMenu";
import { DifficultySelect } from "./ui/components/DifficultySelect";
import type { GameMode, AIDifficulty } from "./engine/types";

export type AppScreen = "MAIN_MENU" | "DIFFICULTY_SELECT" | "GAME";

export interface AppProps {
  initialScreen?: AppScreen;
  initialGameMode?: GameMode;
  initialDifficulty?: AIDifficulty | null;
  initialGameState?: import("./engine/types").GameState;
  initialAnimationSettings?: Partial<import("./ui/hooks/useChannemaneGame").AnimationSettings>;
}

export const App: React.FC<AppProps> = ({
  initialScreen = "MAIN_MENU",
  initialGameMode = "local",
  initialDifficulty = null,
  initialGameState,
  initialAnimationSettings,
}) => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(initialScreen);
  const { isPortraitBlocked } = useOrientation();

  const {
    gameState,
    authoritativeGameState,
    gameMode,
    aiDifficulty,
    setGameMode,
    selectablePits,
    claimableBonuses,
    interactionState,
    highlightedContinuationPit,
    highlightedCapturePit,
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
    confirmContinuation,
    confirmCapture,
    claimBonus,
    startNextRound,
    restartMatch,
    clearError,
    dismissSettlementModal,
    reopenSettlementModal,
    dismissMatchModal,
    toggleAnimationSpeed,
  } = useChannemaneGame(
    "PLAYER_1",
    initialAnimationSettings,
    initialGameState,
    initialGameMode,
    initialDifficulty
  );

  const isRoundSettled =
    (authoritativeGameState.phase === "ROUND_SETTLEMENT" ||
      gameState.phase === "ROUND_SETTLEMENT") &&
    authoritativeGameState.phase !== "MATCH_END" &&
    gameState.phase !== "MATCH_END" &&
    !matchSummary;

  // Navigation handlers
  const handlePlayAI = () => {
    setCurrentScreen("DIFFICULTY_SELECT");
  };

  const handleSelectDifficulty = (difficulty: AIDifficulty) => {
    setGameMode("ai", difficulty);
    restartMatch("PLAYER_1", "ai", difficulty);
    setCurrentScreen("GAME");
  };

  const handlePlayLocal = () => {
    setGameMode("local", null);
    restartMatch("PLAYER_1", "local", null);
    setCurrentScreen("GAME");
  };

  const handleReturnToMenu = () => {
    restartMatch("PLAYER_1");
    setCurrentScreen("MAIN_MENU");
  };

  return (
    <div className="app-container">
      {/* Mobile Portrait Blocking Screen (Requirement 2) */}
      {isPortraitBlocked && <OrientationPrompt />}

      {/* Screen 1: Main Menu */}
      {currentScreen === "MAIN_MENU" && (
        <MainMenu
          onPlayAI={handlePlayAI}
          onPlayLocal={handlePlayLocal}
          onOpenRules={() => setIsRulesOpen(true)}
        />
      )}

      {/* Screen 2: AI Difficulty Selection */}
      {currentScreen === "DIFFICULTY_SELECT" && (
        <DifficultySelect
          onSelectDifficulty={handleSelectDifficulty}
          onBack={handleReturnToMenu}
        />
      )}

      {/* Screen 3: Existing Game Board & Controls */}
      {currentScreen === "GAME" && (
        <>
          {/* Top Header with Return to Menu & Mode Badge */}
          <Header
            onRestart={() => restartMatch("PLAYER_1", gameMode, aiDifficulty)}
            onOpenRules={() => setIsRulesOpen(true)}
            animationSettings={animationSettings}
            onToggleAnimation={toggleAnimationSpeed}
            onReturnToMenu={handleReturnToMenu}
            gameMode={gameMode}
            aiDifficulty={aiDifficulty}
          />

          {/* Turn & Status Indicator */}
          <TurnBanner
            currentPlayer={gameState.currentPlayer}
            gamePhase={isRoundSettled ? "ROUND_SETTLEMENT" : gameState.phase}
            turnPhase={gameState.turnPhase}
            round={gameState.round}
            isAnimating={isAnimating}
            visualHandSeeds={visualHandSeeds}
            interactionState={interactionState}
            hasClaimableBonus={claimableBonuses.length > 0}
          />

          {/* Round Review Action Bar (Issue 8) */}
          {isRoundSettled && (
            <div
              className="round-settlement-action-bar"
              data-testid="settlement-review-bar"
              role="region"
              aria-label="Round settlement review controls"
            >
              <div className="settlement-bar-info">
                <span>
                  🏁 <strong>Round {gameState.round} Settled!</strong> Reviewing board state.
                </span>
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
              highlightedContinuationPit={highlightedContinuationPit}
              highlightedCapturePit={highlightedCapturePit}
              onSelectPit={selectPit}
              onConfirmContinuation={confirmContinuation}
              onConfirmCapture={confirmCapture}
              onClaimBonus={claimBonus}
            />
          </main>

          {/* Settlement Modal (End of Round) */}
          {settlementSummary && !matchSummary && (
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
              onNewMatch={() => restartMatch("PLAYER_1", gameMode, aiDifficulty)}
              onClose={dismissMatchModal}
            />
          )}
        </>
      )}

      {/* Rules Modal (Shared across Main Menu, Difficulty Select, and Game) */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
};

export default App;
