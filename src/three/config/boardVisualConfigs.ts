/**
 * 3D Board Visual Configurations & Coordinate Mapping (2–6 Players)
 * Preserves exact 2-player 14-pit coordinates while supporting authoritative
 * 3-player (15 pits), 4-player (16 pits), 5-player (20 pits), and 6-player (24 pits) layouts
 * matching GameBoard.tsx and src/engine/constants.ts.
 */

import { getPitOwner } from "../../engine/constants";
import type { Player } from "../../engine/types";

export type SupportedPlayerCount = 2 | 3 | 4 | 5 | 6;

export interface PitCoordinate {
  pitId: number;
  position: [number, number, number];
  owner: Player;
  row: "top" | "middle" | "bottom";
  columnIndex: number;
}

export interface StorageCoordinate {
  player: Player;
  position: [number, number, number];
  width: number;
  length: number;
  cornerRadius: number;
  orientation: "vertical" | "horizontal";
}

export interface BoardVisualConfig {
  playerCount: SupportedPlayerCount;
  width: number;
  depth: number;
  height: number;
  cornerRadius: number;
  pitRadius: number;
  cavityDepth: number;
  pits: Record<number, PitCoordinate>;
  pitIds: number[];
  storages: Record<Player, StorageCoordinate | undefined>;
  storageList: StorageCoordinate[];
}

// 7 columns of pits, spacing dx = 1.9 (Authoritative 2-Player Geometry)
export const COL_SPACING = 1.9;
const ROW_Z_OFFSET = 1.25;
const PIT_Y_SURFACE = 0.0;
const CAVITY_DEPTH = 0.38;

export const TOP_ROW_PIT_IDS = [0, 1, 2, 3, 4, 5, 6] as const;
export const BOTTOM_ROW_PIT_IDS = [13, 12, 11, 10, 9, 8, 7] as const;

export const BOARD_DIMENSIONS = {
  width: 18.2,
  depth: 4.8,
  height: 0.85,
  cornerRadius: 0.9,
  pitRadius: 0.74,
  cavityDepth: CAVITY_DEPTH,
  storageWidth: 1.5,
  storageLength: 3.4,
};

export const PIT_COORDINATES: Record<number, PitCoordinate> = {
  // Player 1 (Top Row, left to right: P0 -> P6)
  0: { pitId: 0, position: [-5.7, PIT_Y_SURFACE, -ROW_Z_OFFSET], owner: "PLAYER_1", row: "top", columnIndex: 0 },
  1: { pitId: 1, position: [-3.8, PIT_Y_SURFACE, -ROW_Z_OFFSET], owner: "PLAYER_1", row: "top", columnIndex: 1 },
  2: { pitId: 2, position: [-1.9, PIT_Y_SURFACE, -ROW_Z_OFFSET], owner: "PLAYER_1", row: "top", columnIndex: 2 },
  3: { pitId: 3, position: [0.0, PIT_Y_SURFACE, -ROW_Z_OFFSET], owner: "PLAYER_1", row: "top", columnIndex: 3 },
  4: { pitId: 4, position: [1.9, PIT_Y_SURFACE, -ROW_Z_OFFSET], owner: "PLAYER_1", row: "top", columnIndex: 4 },
  5: { pitId: 5, position: [3.8, PIT_Y_SURFACE, -ROW_Z_OFFSET], owner: "PLAYER_1", row: "top", columnIndex: 5 },
  6: { pitId: 6, position: [5.7, PIT_Y_SURFACE, -ROW_Z_OFFSET], owner: "PLAYER_1", row: "top", columnIndex: 6 },

  // Player 2 (Bottom Row, left to right: P13 -> P7)
  13: { pitId: 13, position: [-5.7, PIT_Y_SURFACE, ROW_Z_OFFSET], owner: "PLAYER_2", row: "bottom", columnIndex: 0 },
  12: { pitId: 12, position: [-3.8, PIT_Y_SURFACE, ROW_Z_OFFSET], owner: "PLAYER_2", row: "bottom", columnIndex: 1 },
  11: { pitId: 11, position: [-1.9, PIT_Y_SURFACE, ROW_Z_OFFSET], owner: "PLAYER_2", row: "bottom", columnIndex: 2 },
  10: { pitId: 10, position: [0.0, PIT_Y_SURFACE, ROW_Z_OFFSET], owner: "PLAYER_2", row: "bottom", columnIndex: 3 },
  9: { pitId: 9, position: [1.9, PIT_Y_SURFACE, ROW_Z_OFFSET], owner: "PLAYER_2", row: "bottom", columnIndex: 4 },
  8: { pitId: 8, position: [3.8, PIT_Y_SURFACE, ROW_Z_OFFSET], owner: "PLAYER_2", row: "bottom", columnIndex: 5 },
  7: { pitId: 7, position: [5.7, PIT_Y_SURFACE, ROW_Z_OFFSET], owner: "PLAYER_2", row: "bottom", columnIndex: 6 },
};

export const STORAGE_COORDINATES: Record<Player, [number, number, number]> = {
  PLAYER_1: [-7.85, PIT_Y_SURFACE, 0],
  PLAYER_2: [7.85, PIT_Y_SURFACE, 0],
  PLAYER_3: [0, 0, 0],
  PLAYER_4: [0, 0, 0],
  PLAYER_5: [0, 0, 0],
  PLAYER_6: [0, 0, 0],
};

function makePitsRecord(
  entries: Array<{ pitId: number; x: number; z: number; row: "top" | "middle" | "bottom"; col: number }>,
  totalPits: number
): Record<number, PitCoordinate> {
  const rec: Record<number, PitCoordinate> = {};
  for (const e of entries) {
    const owner = getPitOwner(e.pitId, totalPits) ?? "PLAYER_1";
    rec[e.pitId] = {
      pitId: e.pitId,
      position: [e.x, PIT_Y_SURFACE, e.z],
      owner,
      row: e.row,
      columnIndex: e.col,
    };
  }
  return rec;
}

function makeStoragesRecord(list: StorageCoordinate[]): Record<Player, StorageCoordinate | undefined> {
  const rec: Record<Player, StorageCoordinate | undefined> = {
    PLAYER_1: undefined,
    PLAYER_2: undefined,
    PLAYER_3: undefined,
    PLAYER_4: undefined,
    PLAYER_5: undefined,
    PLAYER_6: undefined,
  };
  for (const s of list) {
    rec[s.player] = s;
  }
  return rec;
}

function createTwoPlayerConfig(): BoardVisualConfig {
  const storageList: StorageCoordinate[] = [
    {
      player: "PLAYER_1",
      position: STORAGE_COORDINATES.PLAYER_1,
      width: BOARD_DIMENSIONS.storageWidth,
      length: BOARD_DIMENSIONS.storageLength,
      cornerRadius: 0.74,
      orientation: "vertical",
    },
    {
      player: "PLAYER_2",
      position: STORAGE_COORDINATES.PLAYER_2,
      width: BOARD_DIMENSIONS.storageWidth,
      length: BOARD_DIMENSIONS.storageLength,
      cornerRadius: 0.74,
      orientation: "vertical",
    },
  ];
  return {
    playerCount: 2,
    width: BOARD_DIMENSIONS.width,
    depth: BOARD_DIMENSIONS.depth,
    height: BOARD_DIMENSIONS.height,
    cornerRadius: BOARD_DIMENSIONS.cornerRadius,
    pitRadius: BOARD_DIMENSIONS.pitRadius,
    cavityDepth: BOARD_DIMENSIONS.cavityDepth,
    pits: PIT_COORDINATES,
    pitIds: Array.from({ length: 14 }, (_, i) => i),
    storages: makeStoragesRecord(storageList),
    storageList,
  };
}

function createThreePlayerConfig(): BoardVisualConfig {
  const colsX = [-4.65, -2.75, -0.85, 1.05, 2.95];
  const entries = [
    ...[0, 1, 2, 3, 4].map((id, col) => ({ pitId: id, x: colsX[col]!, z: -2.3, row: "top" as const, col })),
    ...[9, 8, 7, 6, 5].map((id, col) => ({ pitId: id, x: colsX[col]!, z: 0.0, row: "middle" as const, col })),
    ...[10, 11, 12, 13, 14].map((id, col) => ({ pitId: id, x: colsX[col]!, z: 2.3, row: "bottom" as const, col })),
  ];
  const storageList: StorageCoordinate[] = [
    { player: "PLAYER_1", position: [-7.05, 0, 0], width: 1.45, length: 4.8, cornerRadius: 0.68, orientation: "vertical" },
    { player: "PLAYER_2", position: [5.15, 0, 0], width: 1.45, length: 4.8, cornerRadius: 0.68, orientation: "vertical" },
    { player: "PLAYER_3", position: [7.05, 0, 0], width: 1.45, length: 4.8, cornerRadius: 0.68, orientation: "vertical" },
  ];
  return {
    playerCount: 3,
    width: 18.2,
    depth: 7.4,
    height: BOARD_DIMENSIONS.height,
    cornerRadius: 0.9,
    pitRadius: BOARD_DIMENSIONS.pitRadius,
    cavityDepth: CAVITY_DEPTH,
    pits: makePitsRecord(entries, 15),
    pitIds: Array.from({ length: 15 }, (_, i) => i),
    storages: makeStoragesRecord(storageList),
    storageList,
  };
}

function createFourPlayerConfig(): BoardVisualConfig {
  const leftCols = [-7.15, -5.25, -3.35, -1.45];
  const rightCols = [1.45, 3.35, 5.25, 7.15];
  const entries = [
    ...[0, 1, 2, 3].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: -1.2, row: "top" as const, col })),
    ...[4, 5, 6, 7].map((id, idx) => ({ pitId: id, x: rightCols[idx]!, z: -1.2, row: "top" as const, col: idx + 4 })),
    ...[15, 14, 13, 12].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: 1.2, row: "bottom" as const, col })),
    ...[11, 10, 9, 8].map((id, idx) => ({ pitId: id, x: rightCols[idx]!, z: 1.2, row: "bottom" as const, col: idx + 4 })),
  ];
  const storageList: StorageCoordinate[] = [
    { player: "PLAYER_1", position: [-4.3, 0, -2.95], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_2", position: [4.3, 0, -2.95], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_4", position: [-4.3, 0, 2.95], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_3", position: [4.3, 0, 2.95], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
  ];
  return {
    playerCount: 4,
    width: 18.4,
    depth: 8.2,
    height: BOARD_DIMENSIONS.height,
    cornerRadius: 0.9,
    pitRadius: BOARD_DIMENSIONS.pitRadius,
    cavityDepth: CAVITY_DEPTH,
    pits: makePitsRecord(entries, 16),
    pitIds: Array.from({ length: 16 }, (_, i) => i),
    storages: makeStoragesRecord(storageList),
    storageList,
  };
}

function createFivePlayerConfig(): BoardVisualConfig {
  const leftCols = [-7.15, -5.25, -3.35, -1.45];
  const rightCols = [1.45, 3.35, 5.25, 7.15];
  const entries = [
    ...[0, 1, 2, 3].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: -2.25, row: "top" as const, col })),
    ...[4, 5, 6, 7].map((id, idx) => ({ pitId: id, x: rightCols[idx]!, z: -2.25, row: "top" as const, col: idx + 4 })),
    ...[11, 10, 9, 8].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: 0.0, row: "middle" as const, col })),
    ...[12, 13, 14, 15].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: 2.25, row: "bottom" as const, col })),
    ...[16, 17, 18, 19].map((id, idx) => ({ pitId: id, x: rightCols[idx]!, z: 2.25, row: "bottom" as const, col: idx + 4 })),
  ];
  const storageList: StorageCoordinate[] = [
    { player: "PLAYER_1", position: [-4.3, 0, -4.05], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_2", position: [4.3, 0, -4.05], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_3", position: [4.3, 0, 0.0], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_4", position: [-4.3, 0, 4.05], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_5", position: [4.3, 0, 4.05], width: 5.8, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
  ];
  return {
    playerCount: 5,
    width: 18.4,
    depth: 10.6,
    height: BOARD_DIMENSIONS.height,
    cornerRadius: 0.9,
    pitRadius: BOARD_DIMENSIONS.pitRadius,
    cavityDepth: CAVITY_DEPTH,
    pits: makePitsRecord(entries, 20),
    pitIds: Array.from({ length: 20 }, (_, i) => i),
    storages: makeStoragesRecord(storageList),
    storageList,
  };
}

function createSixPlayerConfig(): BoardVisualConfig {
  const leftCols = [-6.85, -4.98, -3.11, -1.24];
  const rightCols = [1.24, 3.11, 4.98, 6.85];
  const entries = [
    ...[0, 1, 2, 3].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: -2.25, row: "top" as const, col })),
    ...[4, 5, 6, 7].map((id, idx) => ({ pitId: id, x: rightCols[idx]!, z: -2.25, row: "top" as const, col: idx + 4 })),
    ...[15, 14, 13, 12].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: 0.0, row: "middle" as const, col })),
    ...[11, 10, 9, 8].map((id, idx) => ({ pitId: id, x: rightCols[idx]!, z: 0.0, row: "middle" as const, col: idx + 4 })),
    ...[16, 17, 18, 19].map((id, col) => ({ pitId: id, x: leftCols[col]!, z: 2.25, row: "bottom" as const, col })),
    ...[20, 21, 22, 23].map((id, idx) => ({ pitId: id, x: rightCols[idx]!, z: 2.25, row: "bottom" as const, col: idx + 4 })),
  ];
  const storageList: StorageCoordinate[] = [
    { player: "PLAYER_1", position: [-4.05, 0, -4.05], width: 5.6, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_2", position: [4.05, 0, -4.05], width: 5.6, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_4", position: [-8.95, 0, 0.0], width: 1.35, length: 4.6, cornerRadius: 0.62, orientation: "vertical" },
    { player: "PLAYER_3", position: [8.95, 0, 0.0], width: 1.35, length: 4.6, cornerRadius: 0.62, orientation: "vertical" },
    { player: "PLAYER_5", position: [-4.05, 0, 4.05], width: 5.6, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
    { player: "PLAYER_6", position: [4.05, 0, 4.05], width: 5.6, length: 1.3, cornerRadius: 0.58, orientation: "horizontal" },
  ];
  return {
    playerCount: 6,
    width: 20.8,
    depth: 10.6,
    height: BOARD_DIMENSIONS.height,
    cornerRadius: 0.9,
    pitRadius: BOARD_DIMENSIONS.pitRadius,
    cavityDepth: CAVITY_DEPTH,
    pits: makePitsRecord(entries, 24),
    pitIds: Array.from({ length: 24 }, (_, i) => i),
    storages: makeStoragesRecord(storageList),
    storageList,
  };
}

const BOARD_CONFIG_CACHE: Record<SupportedPlayerCount, BoardVisualConfig> = {
  2: createTwoPlayerConfig(),
  3: createThreePlayerConfig(),
  4: createFourPlayerConfig(),
  5: createFivePlayerConfig(),
  6: createSixPlayerConfig(),
};

export function resolvePlayerCount(
  playerCount?: number,
  pitLength?: number
): SupportedPlayerCount {
  if (playerCount === 6 || pitLength === 24) return 6;
  if (playerCount === 5 || pitLength === 20) return 5;
  if (playerCount === 4 || pitLength === 16) return 4;
  if (playerCount === 3 || pitLength === 15) return 3;
  return 2;
}

export function getBoardVisualConfig(playerCount: SupportedPlayerCount = 2): BoardVisualConfig {
  return BOARD_CONFIG_CACHE[playerCount] ?? BOARD_CONFIG_CACHE[2];
}

export function getPitWorldPosition(
  pitId: number,
  playerCount: SupportedPlayerCount = 2
): [number, number, number] {
  const cfg = getBoardVisualConfig(playerCount);
  const coord = cfg.pits[pitId];
  if (!coord) return [0, 0, 0];
  return coord.position;
}

export function getStorageWorldPosition(
  player: Player,
  playerCount: SupportedPlayerCount = 2
): [number, number, number] {
  const cfg = getBoardVisualConfig(playerCount);
  return cfg.storages[player]?.position ?? STORAGE_COORDINATES[player] ?? [0, 0, 0];
}
