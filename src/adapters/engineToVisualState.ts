/**
 * Engine-to-Visual State Adapter
 * Translates authoritative engine state into structured 3D visual board representation
 * across all supported 2–6 player modes. Computes NO game rules.
 */

import {
  getBoardVisualConfig,
  resolvePlayerCount,
  type SupportedPlayerCount,
} from "../three/config/boardVisualConfigs";
import type { GameState, Player, PitStatus, GamePhase, TurnPhase } from "../engine/types";
import type { InteractionState } from "../ui/hooks/useChannemaneGame";

export interface VisualPitState {
  pitId: number;
  owner: Player;
  seeds: number;
  status: PitStatus;
  bonusAvailable: boolean;
  isSelectable: boolean;
  isActiveDrop: boolean;
  isContinuationTarget: boolean;
  isCaptureTarget: boolean;
  isClaimableBonus: boolean;
  row: "top" | "middle" | "bottom";
  columnIndex: number;
}

export interface VisualStorageState {
  player: Player;
  seeds: number;
  isDisqualified: boolean;
}

export interface VisualBoardState {
  playerCount: SupportedPlayerCount;
  pits: VisualPitState[];
  storage: {
    player1: VisualStorageState;
    player2: VisualStorageState;
    player3?: VisualStorageState;
    player4?: VisualStorageState;
    player5?: VisualStorageState;
    player6?: VisualStorageState;
  };
  storageList: VisualStorageState[];
  currentPlayer: Player;
  phase: GamePhase;
  turnPhase: TurnPhase;
  selectedPit: number | null;
  interactionState: InteractionState;
  isAnimating: boolean;
  totalBoardSeeds: number;
  totalStorageSeeds: number;
  totalVisibleSeeds: number;
}

export interface VisualStateInput {
  gameState: GameState;
  selectablePits?: number[];
  claimableBonuses?: number[];
  activeDropPit?: number | null;
  highlightedContinuationPit?: number | null;
  highlightedCapturePit?: number | null;
  interactionState?: InteractionState;
  isAnimating?: boolean;
}

export const TOP_ROW_PITS = [0, 1, 2, 3, 4, 5, 6];
export const BOTTOM_ROW_PITS = [13, 12, 11, 10, 9, 8, 7];

function getStorageCount(state: GameState, player: Player): number {
  switch (player) {
    case "PLAYER_1":
      return state.players.player1?.storage ?? 0;
    case "PLAYER_2":
      return state.players.player2?.storage ?? 0;
    case "PLAYER_3":
      return state.players.player3?.storage ?? 0;
    case "PLAYER_4":
      return state.players.player4?.storage ?? 0;
    case "PLAYER_5":
      return state.players.player5?.storage ?? 0;
    case "PLAYER_6":
      return state.players.player6?.storage ?? 0;
  }
}

/**
 * Maps authoritative engine state to 3D visual presentation state across 2–6 players.
 */
export function mapEngineToVisualState(input: VisualStateInput): VisualBoardState {
  const {
    gameState,
    selectablePits = [],
    claimableBonuses = [],
    activeDropPit = null,
    highlightedContinuationPit = null,
    highlightedCapturePit = null,
    interactionState = "WAITING_FOR_START",
    isAnimating = false,
  } = input;

  const playerCount = resolvePlayerCount(gameState.playerCount, gameState.pits.length);
  const boardConfig = getBoardVisualConfig(playerCount);
  const selectableSet = new Set(selectablePits);
  const bonusSet = new Set(claimableBonuses);
  const disqualifiedSet = new Set(gameState.disqualifiedPlayers ?? []);

  const visualPits: VisualPitState[] = [];
  let totalBoardSeeds = 0;

  for (const pitId of boardConfig.pitIds) {
    const coord = boardConfig.pits[pitId]!;
    const enginePit = gameState.pits[pitId] ?? {
      id: pitId,
      owner: coord.owner,
      seeds: 0,
      status: "OPEN" as PitStatus,
      bonusAvailable: false,
    };

    totalBoardSeeds += enginePit.seeds;

    visualPits.push({
      pitId,
      owner: enginePit.owner,
      seeds: enginePit.seeds,
      status: enginePit.status,
      bonusAvailable: enginePit.bonusAvailable,
      isSelectable: selectableSet.has(pitId),
      isActiveDrop: activeDropPit === pitId,
      isContinuationTarget: highlightedContinuationPit === pitId,
      isCaptureTarget: highlightedCapturePit === pitId,
      isClaimableBonus: bonusSet.has(pitId),
      row: coord.row,
      columnIndex: coord.columnIndex,
    });
  }

  const allPlayers: Player[] = [
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
    "PLAYER_4",
    "PLAYER_5",
    "PLAYER_6",
  ].slice(0, playerCount) as Player[];

  const storageByPlayer: Partial<Record<Player, VisualStorageState>> = {};
  const storageList: VisualStorageState[] = [];
  let totalStorageSeeds = 0;

  for (const player of allPlayers) {
    const seeds = getStorageCount(gameState, player);
    totalStorageSeeds += seeds;
    const item: VisualStorageState = {
      player,
      seeds,
      isDisqualified: disqualifiedSet.has(player),
    };
    storageByPlayer[player] = item;
    storageList.push(item);
  }

  return {
    playerCount,
    pits: visualPits,
    storage: {
      player1: storageByPlayer.PLAYER_1!,
      player2: storageByPlayer.PLAYER_2!,
      ...(storageByPlayer.PLAYER_3 ? { player3: storageByPlayer.PLAYER_3 } : {}),
      ...(storageByPlayer.PLAYER_4 ? { player4: storageByPlayer.PLAYER_4 } : {}),
      ...(storageByPlayer.PLAYER_5 ? { player5: storageByPlayer.PLAYER_5 } : {}),
      ...(storageByPlayer.PLAYER_6 ? { player6: storageByPlayer.PLAYER_6 } : {}),
    },
    storageList,
    currentPlayer: gameState.currentPlayer,
    phase: gameState.phase,
    turnPhase: gameState.turnPhase,
    selectedPit: gameState.selectedPit,
    interactionState,
    isAnimating,
    totalBoardSeeds,
    totalStorageSeeds,
    totalVisibleSeeds: totalBoardSeeds + totalStorageSeeds + (gameState.seedsInHand ?? 0),
  };
}
