import { MIN_STORAGE_FOR_MATCH_ELIGIBILITY } from "./constants";
import { getActivePlayers } from "./board";
import type { GameState, Player } from "./types";

export interface PlayerMatchRanking {
  player: Player;
  rank: 1 | 2 | 3;
  label: "Winner" | "1st Place" | "2nd Place" | "Lost";
  storage: number;
}

export interface MatchEndResult {
  isMatchEnd: boolean;
  winner: Player | null;
  loser: Player | null;
  reason: string | null;
  rankings?: PlayerMatchRanking[];
}

function getPlayerStorage(state: GameState, player: Player): number {
  if (player === "PLAYER_1") return state.players.player1.storage;
  if (player === "PLAYER_2") return state.players.player2.storage;
  return state.players.player3?.storage ?? 0;
}

/**
 * Computes authoritative player rankings for 2-player and 3-player match ends.
 */
export function computeMatchRankings(
  state: GameState,
  winner: Player | null,
  loser: Player | null
): PlayerMatchRanking[] {
  if (state.playerCount === 3) {
    const dis = state.disqualifiedPlayers ?? [];
    const allPlayers: Player[] = ["PLAYER_1", "PLAYER_2", "PLAYER_3"];

    if (winner) {
      const nonWinners = allPlayers.filter((p) => p !== winner);
      let secondPlace: Player;
      let lastPlace: Player;

      if (dis.length >= 2) {
        // Earlier eliminated player is last place; player eliminated immediately before winner is 2nd place
        lastPlace = dis[0];
        secondPlace = dis.find((p) => p !== winner && p !== lastPlace) ?? dis[1];
      } else if (dis.length === 1) {
        lastPlace = dis[0];
        secondPlace = nonWinners.find((p) => p !== lastPlace) ?? nonWinners[0];
      } else {
        // Ranked by storage among non-winners
        const s0 = getPlayerStorage(state, nonWinners[0]);
        const s1 = getPlayerStorage(state, nonWinners[1]);
        if (s0 >= s1) {
          secondPlace = nonWinners[0];
          lastPlace = nonWinners[1];
        } else {
          secondPlace = nonWinners[1];
          lastPlace = nonWinners[0];
        }
      }

      return [
        {
          player: winner,
          rank: 1,
          label: "1st Place",
          storage: getPlayerStorage(state, winner),
        },
        {
          player: secondPlace,
          rank: 2,
          label: "2nd Place",
          storage: getPlayerStorage(state, secondPlace),
        },
        {
          player: lastPlace,
          rank: 3,
          label: "Lost",
          storage: getPlayerStorage(state, lastPlace),
        },
      ];
    } else {
      // Tie or mutual disqualification
      const sorted = [...allPlayers].sort(
        (a, b) => getPlayerStorage(state, b) - getPlayerStorage(state, a)
      );
      return [
        {
          player: sorted[0],
          rank: 1,
          label: "1st Place",
          storage: getPlayerStorage(state, sorted[0]),
        },
        {
          player: sorted[1],
          rank: 2,
          label: "2nd Place",
          storage: getPlayerStorage(state, sorted[1]),
        },
        {
          player: sorted[2],
          rank: 3,
          label: "Lost",
          storage: getPlayerStorage(state, sorted[2]),
        },
      ];
    }
  }

  // 2-player match
  if (winner) {
    const otherPlayer: Player = loser ?? (winner === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1");
    return [
      {
        player: winner,
        rank: 1,
        label: "Winner",
        storage: getPlayerStorage(state, winner),
      },
      {
        player: otherPlayer,
        rank: 2,
        label: "Lost",
        storage: getPlayerStorage(state, otherPlayer),
      },
    ];
  } else {
    return [
      {
        player: "PLAYER_1",
        rank: 1,
        label: "Winner",
        storage: getPlayerStorage(state, "PLAYER_1"),
      },
      {
        player: "PLAYER_2",
        rank: 2,
        label: "Lost",
        storage: getPlayerStorage(state, "PLAYER_2"),
      },
    ];
  }
}

/**
 * Checks if the match has reached terminal state after round settlement.
 * - 2-player: storage < 5 ends match.
 * - 3-player: if 2 players remain and either has < 5, match ends. If 3 active players, match continues (recovery occurs).
 */
export function isMatchOver(state: GameState): boolean {
  if (state.playerCount === 3) {
    const active = getActivePlayers(state);
    if (active.length <= 1) return true;
    if (active.length === 2) {
      return (
        getPlayerStorage(state, active[0]) < MIN_STORAGE_FOR_MATCH_ELIGIBILITY ||
        getPlayerStorage(state, active[1]) < MIN_STORAGE_FOR_MATCH_ELIGIBILITY
      );
    }
    return false;
  }

  return (
    state.players.player1.storage < MIN_STORAGE_FOR_MATCH_ELIGIBILITY ||
    state.players.player2.storage < MIN_STORAGE_FOR_MATCH_ELIGIBILITY
  );
}

/**
 * Evaluates and transitions the game state if match-end condition is met.
 */
export function checkAndHandleMatchEnd(state: GameState): MatchEndResult {
  if (state.playerCount === 3) {
    const active = getActivePlayers(state);
    if (active.length <= 1) {
      state.phase = "MATCH_END";
      state.winner = active[0] ?? null;
      const winner = active[0] ?? null;
      return {
        isMatchEnd: true,
        winner,
        loser: null,
        reason: `${active[0]} is the sole remaining active player`,
        rankings: computeMatchRankings(state, winner, null),
      };
    }
    if (active.length === 2) {
      const pA = active[0];
      const pB = active[1];
      const sA = getPlayerStorage(state, pA);
      const sB = getPlayerStorage(state, pB);
      const canA = sA >= MIN_STORAGE_FOR_MATCH_ELIGIBILITY;
      const canB = sB >= MIN_STORAGE_FOR_MATCH_ELIGIBILITY;

      if (!canA && !canB) {
        state.phase = "MATCH_END";
        state.winner = null;
        return {
          isMatchEnd: true,
          winner: null,
          loser: null,
          reason: "Both remaining players have fewer than 5 seeds in storage",
          rankings: computeMatchRankings(state, null, null),
        };
      }
      if (!canA) {
        state.disqualifiedPlayers = [
          ...(state.disqualifiedPlayers ?? []),
          pA,
        ];
        state.phase = "MATCH_END";
        state.winner = pB;
        return {
          isMatchEnd: true,
          winner: pB,
          loser: pA,
          reason: `${pA} has only ${sA} seeds (fewer than 5) and cannot fund G1`,
          rankings: computeMatchRankings(state, pB, pA),
        };
      }
      if (!canB) {
        state.disqualifiedPlayers = [
          ...(state.disqualifiedPlayers ?? []),
          pB,
        ];
        state.phase = "MATCH_END";
        state.winner = pA;
        return {
          isMatchEnd: true,
          winner: pA,
          loser: pB,
          reason: `${pB} has only ${sB} seeds (fewer than 5) and cannot fund G1`,
          rankings: computeMatchRankings(state, pA, pB),
        };
      }
      return {
        isMatchEnd: false,
        winner: null,
        loser: null,
        reason: null,
      };
    }

    return {
      isMatchEnd: false,
      winner: null,
      loser: null,
      reason: null,
    };
  }

  const p1Storage = state.players.player1.storage;
  const p2Storage = state.players.player2.storage;

  const p1CanPlay = p1Storage >= MIN_STORAGE_FOR_MATCH_ELIGIBILITY;
  const p2CanPlay = p2Storage >= MIN_STORAGE_FOR_MATCH_ELIGIBILITY;

  if (!p1CanPlay && !p2CanPlay) {
    state.phase = "MATCH_END";
    state.winner = null;
    return {
      isMatchEnd: true,
      winner: null,
      loser: null,
      reason: "Both players have fewer than 5 seeds in storage",
      rankings: computeMatchRankings(state, null, null),
    };
  }

  if (!p2CanPlay) {
    state.phase = "MATCH_END";
    state.winner = "PLAYER_1";
    return {
      isMatchEnd: true,
      winner: "PLAYER_1",
      loser: "PLAYER_2",
      reason: `PLAYER_2 has only ${p2Storage} seeds (fewer than 5) and cannot open any pits`,
      rankings: computeMatchRankings(state, "PLAYER_1", "PLAYER_2"),
    };
  }

  if (!p1CanPlay) {
    state.phase = "MATCH_END";
    state.winner = "PLAYER_2";
    return {
      isMatchEnd: true,
      winner: "PLAYER_2",
      loser: "PLAYER_1",
      reason: `PLAYER_1 has only ${p1Storage} seeds (fewer than 5) and cannot open any pits`,
      rankings: computeMatchRankings(state, "PLAYER_2", "PLAYER_1"),
    };
  }

  return {
    isMatchEnd: false,
    winner: null,
    loser: null,
    reason: null,
  };
}
