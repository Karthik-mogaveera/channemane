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
import { FirstPlayerModal } from "./ui/components/FirstPlayerModal";
import { ComingSoonModal } from "./ui/components/ComingSoonModal";
import { TurnNotification } from "./ui/components/TurnNotification";
import type { GameMode, AIDifficulty, Player } from "./engine/types";

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
  const [selectedDifficultyForFirstPlayer, setSelectedDifficultyForFirstPlayer] =
    useState<AIDifficulty | null>(null);
  const [comingSoonNotice, setComingSoonNotice] = useState<{
    difficulty: AIDifficulty;
    selectedFirstPlayer: "player" | "ai";
  } | null>(null);
  const [chosenStartingPlayer, setChosenStartingPlayer] =
    useState<Player>("PLAYER_1");
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
    turnNotification,
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
    setSelectedDifficultyForFirstPlayer(null);
    setComingSoonNotice(null);
    setCurrentScreen("DIFFICULTY_SELECT");
  };

  const handleSelectDifficulty = (difficulty: AIDifficulty) => {
    setSelectedDifficultyForFirstPlayer(difficulty);
  };

  const handleSelectFirstPlayer = (firstPlayer: "player" | "ai") => {
    const startingPlayer: Player = firstPlayer === "player" ? "PLAYER_1" : "PLAYER_2";
    setChosenStartingPlayer(startingPlayer);

    if (
      selectedDifficultyForFirstPlayer === "beginner" ||
      selectedDifficultyForFirstPlayer === "expert"
    ) {
      setGameMode("ai", selectedDifficultyForFirstPlayer, "PLAYER_2");
      restartMatch(startingPlayer, "ai", selectedDifficultyForFirstPlayer, "PLAYER_2");
      setSelectedDifficultyForFirstPlayer(null);
      setCurrentScreen("GAME");
    } else if (selectedDifficultyForFirstPlayer) {
      setComingSoonNotice({
        difficulty: selectedDifficultyForFirstPlayer,
        selectedFirstPlayer: firstPlayer,
      });
      setSelectedDifficultyForFirstPlayer(null);
    }
  };

  const handlePlayBeginnerFromComingSoon = () => {
    const startingPlayer: Player =
      comingSoonNotice?.selectedFirstPlayer === "player" ? "PLAYER_1" : "PLAYER_2";
    setChosenStartingPlayer(startingPlayer);
    setGameMode("ai", "beginner", "PLAYER_2");
    restartMatch(startingPlayer, "ai", "beginner", "PLAYER_2");
    setComingSoonNotice(null);
    setCurrentScreen("GAME");
  };

  const handleBackToMenuFromComingSoon = () => {
    setComingSoonNotice(null);
    setSelectedDifficultyForFirstPlayer(null);
    restartMatch("PLAYER_1");
    setCurrentScreen("MAIN_MENU");
  };

  const handleChangeDifficultyFromComingSoon = () => {
    setComingSoonNotice(null);
    setSelectedDifficultyForFirstPlayer(null);
    setCurrentScreen("DIFFICULTY_SELECT");
  };

  const handlePlayLocal = () => {
    setChosenStartingPlayer("PLAYER_1");
    setSelectedDifficultyForFirstPlayer(null);
    setComingSoonNotice(null);
    setGameMode("local", null);
    restartMatch("PLAYER_1", "local", null);
    setCurrentScreen("GAME");
  };

  const handleReturnToMenu = () => {
    setSelectedDifficultyForFirstPlayer(null);
    setComingSoonNotice(null);
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
        <>
          <DifficultySelect
            onSelectDifficulty={handleSelectDifficulty}
            onBack={handleReturnToMenu}
          />

          {/* "Who will Play first" Dialog (Feature 2) */}
          {selectedDifficultyForFirstPlayer && (
            <FirstPlayerModal
              difficulty={selectedDifficultyForFirstPlayer}
              onSelectFirstPlayer={handleSelectFirstPlayer}
              onBack={() => setSelectedDifficultyForFirstPlayer(null)}
            />
          )}

          {/* Expert & Master Safeguard "Coming Soon" Modal */}
          {comingSoonNotice && (
            <ComingSoonModal
              difficulty={comingSoonNotice.difficulty}
              selectedFirstPlayer={comingSoonNotice.selectedFirstPlayer}
              onPlayBeginner={handlePlayBeginnerFromComingSoon}
              onBackToMenu={handleBackToMenuFromComingSoon}
              onChangeDifficulty={handleChangeDifficultyFromComingSoon}
            />
          )}
        </>
      )}

      {/* Screen 3: Existing Game Board & Controls */}
      {currentScreen === "GAME" && (
        <>
          {/* Turn-Start Notification Popup (Feature 3) */}
          <TurnNotification notification={turnNotification} />

          {/* Top Header with Return to Menu & Mode Badge */}
          <Header
            onRestart={() => restartMatch(chosenStartingPlayer, gameMode, aiDifficulty)}
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
              onNewMatch={() => restartMatch(chosenStartingPlayer, gameMode, aiDifficulty)}
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
