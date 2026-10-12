import { describe, it, expect } from "vitest";
import { ChannemaneGame } from "../src/engine/simulation";
import { cloneGameState, createInitialGame } from "../src/engine/board";
import { playTurn } from "../src/engine/game";
import type { GameState } from "../src/engine/types";
import { getSelectablePits } from "../src/engine/selection";

describe("Investigation: Maximum Reachable Seed Capacity in a Single Pit", () => {
  it("runs Monte Carlo and heuristic search to find highest reachable seed count in a legal game", () => {
    let maxObservedSeeds = 0;
    let maxPitId = -1;
    let maxSequence: number[] = [];
    let maxGameState: GameState | null = null;
    let maxRound = 1;

    // 1. Monte Carlo Random Simulations across 500 complete matches
    for (let match = 0; match < 300; match++) {
      const game = new ChannemaneGame();
      const currentSeq: number[] = [];

      while (!game.isGameOver()) {
        if (game.isRoundOver()) {
          const res = game.startNextRound();
          if (!res.success) break;
        }

        const state = game.getState();
        for (const pit of state.pits) {
          if (pit.seeds > maxObservedSeeds) {
            maxObservedSeeds = pit.seeds;
            maxPitId = pit.id;
            maxSequence = [...currentSeq];
            maxGameState = cloneGameState(state);
            maxRound = state.round;
          }
        }

        // Check if bonuses available - sometimes claim, sometimes don't (to let seeds accumulate)
        const bonuses = game.getClaimableBonuses();
        if (bonuses.length > 0 && Math.random() < 0.3) {
          game.claimBonus(bonuses[0]);
          continue;
        }

        const selectable = game.getSelectablePits();
        if (selectable.length === 0) break;

        const move = selectable[Math.floor(Math.random() * selectable.length)];
        currentSeq.push(move);
        const turnRes = game.selectPit(move);
        if (!turnRes || !turnRes.success) break;
      }
    }

    console.log(`[Monte Carlo] Max seeds observed: ${maxObservedSeeds} in pit ${maxPitId} (Round ${maxRound})`);

    // 2. Targeted Greedy/Beam Search to maximize a specific pit's seed count
    // Strategy: Search moves that maximize the maximum pit seed count on the board
    interface SearchNode {
      state: GameState;
      moves: number[];
      maxSeeds: number;
    }

    let beam: SearchNode[] = [{
      state: createInitialGame("PLAYER_1"),
      moves: [],
      maxSeeds: 5,
    }];

    const BEAM_WIDTH = 30;
    const DEPTH = 35;

    for (let depth = 0; depth < DEPTH; depth++) {
      const nextCandidates: SearchNode[] = [];

      for (const node of beam) {
        if (node.state.phase !== "PLAYING") continue;

        const validMoves = getSelectablePits(node.state);
        for (const move of validMoves) {
          const nextState = cloneGameState(node.state);
          const turnRes = playTurn(nextState, move);
          if (!turnRes.success) continue;

          // Don't claim bonuses so seeds can grow beyond 4!
          let currentMaxInPits = 0;
          for (const pit of nextState.pits) {
            if (pit.seeds > currentMaxInPits) {
              currentMaxInPits = pit.seeds;
            }
          }

          if (currentMaxInPits > maxObservedSeeds) {
            maxObservedSeeds = currentMaxInPits;
            maxPitId = nextState.pits.find(p => p.seeds === currentMaxInPits)?.id ?? -1;
            maxSequence = [...node.moves, move];
            maxGameState = cloneGameState(nextState);
            maxRound = nextState.round;
          }

          nextCandidates.push({
            state: nextState,
            moves: [...node.moves, move],
            maxSeeds: currentMaxInPits,
          });
        }
      }

      if (nextCandidates.length === 0) break;

      // Sort candidates by maxSeeds descending and pick top BEAM_WIDTH
      nextCandidates.sort((a, b) => b.maxSeeds - a.maxSeeds);
      beam = nextCandidates.slice(0, BEAM_WIDTH);
    }

    console.log(`[Targeted Beam Search] Max seeds observed: ${maxObservedSeeds} in pit ${maxPitId}`);
    console.log(`[Targeted Beam Search] Move sequence: ${JSON.stringify(maxSequence)}`);

    // 3. Multi-round simulation with closed pits
    // In later rounds, with closed pits skipped, can seeds concentrate even higher?
    for (let p2OpenPits = 1; p2OpenPits <= 3; p2OpenPits++) {
      const customRoundState = createInitialGame("PLAYER_1");
      customRoundState.round = 2;
      // Player 2 only has p2OpenPits open pits, rest closed
      for (let i = 7; i < 14; i++) {
        if (i < 7 + p2OpenPits) {
          customRoundState.pits[i].status = "OPEN";
          customRoundState.pits[i].seeds = 5;
        } else {
          customRoundState.pits[i].status = "CLOSED";
          customRoundState.pits[i].seeds = 0;
        }
      }
      // Player 1 has all 7 open pits = 35 seeds
      for (let i = 0; i < 7; i++) {
        customRoundState.pits[i].status = "OPEN";
        customRoundState.pits[i].seeds = 5;
      }
      customRoundState.players.player2.storage = 0;
      customRoundState.players.player1.storage = 70 - (35 + p2OpenPits * 5);

      // Explore sequences from here
      let testBeam: SearchNode[] = [{
        state: customRoundState,
        moves: [],
        maxSeeds: 5,
      }];

      for (let d = 0; d < 25; d++) {
        const nextList: SearchNode[] = [];
        for (const item of testBeam) {
          if (item.state.phase !== "PLAYING") continue;
          const moves = getSelectablePits(item.state);
          for (const m of moves) {
            const st = cloneGameState(item.state);
            const res = playTurn(st, m);
            if (!res.success) continue;

            const curMax = Math.max(...st.pits.map(p => p.seeds));
            if (curMax > maxObservedSeeds) {
              maxObservedSeeds = curMax;
              maxPitId = st.pits.find(p => p.seeds === curMax)?.id ?? -1;
              maxSequence = [...item.moves, m];
              maxGameState = cloneGameState(st);
              maxRound = st.round;
            }

            nextList.push({
              state: st,
              moves: [...item.moves, m],
              maxSeeds: curMax,
            });
          }
        }
        if (nextList.length === 0) break;
        nextList.sort((a, b) => b.maxSeeds - a.maxSeeds);
        testBeam = nextList.slice(0, 20);
      }
    }

    console.log(`[Final Observed Maximum] ${maxObservedSeeds} seeds in pit ${maxPitId}`);
    expect(maxGameState).not.toBeNull();
    expect(maxObservedSeeds).toBeGreaterThanOrEqual(10);
    expect(maxObservedSeeds).toBeLessThanOrEqual(70);
  });
});
