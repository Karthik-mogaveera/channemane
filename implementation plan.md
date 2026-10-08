# Channemane Game Engine — Implementation Plan

## 1. Executive Summary & Architecture
The Channemane game engine is designed as a standalone, deterministic, headless, framework-agnostic TypeScript core.
It has **zero runtime dependencies** and strictly decouples game rules from any user interface, audio, animations, or networking.

### Target Platforms (Future Phases)
- Web (React/Vite)
- Mobile (Capacitor / Android / iOS)
- Standalone Headless / AI Bot simulations

---

## 2. Directory Layout
```text
CHANNEMANE/
├── development plan.md
├── implementation plan.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   └── engine/
│       ├── constants.ts        (Board size, opposite pairs, seed counts)
│       ├── types.ts            (Player, Pit, GameState, TurnPhase, GamePhase)
│       ├── traversal.ts        (getNextOpenPit, active counter-clockwise traversal)
│       ├── invariants.ts       (getTotalSeeds, 70-seed conservation validator)
│       ├── board.ts            (createInitialGame, round setup, paired closure)
│       ├── selection.ts        (Legal pit selection validator)
│       ├── sowing.ts           (Sowing, continuous sowing hand exhaustion)
│       ├── capture.ts          (Capture evaluation, storage transfer)
│       ├── bonus.ts            (3->4 bonus detection, claim, 4->5 expiration)
│       ├── roundEnd.ts         (shouldEndRound, Condition 1 & 2 detection)
│       ├── settlement.ts       (Round settlement, remaining seed transfers)
│       ├── match.ts            (Match end eligibility, winner evaluation)
│       ├── game.ts             (Full state machine transitions, turn pass)
│       └── index.ts            (Public API exports)
└── tests/
    ├── setup.test.ts           (Environment verification)
    ├── board.test.ts           (Board structure, 14 pits, ownership, pairs)
    ├── traversal.test.ts       (Counter-clockwise and closed-pit skipping)
    ├── selection.test.ts       (Valid/invalid pit selection negative tests)
    ├── sowing.test.ts          (Distribution and continuous sowing)
    ├── capture.test.ts         (Single positional capture on either side)
    ├── bonus.test.ts           (Bonus triggers, manual collection, expiration)
    ├── roundEnd.test.ts        (Condition 1 [<4 seeds] and Condition 2)
    ├── roundSetup.test.ts      (32/38, 41/29, 58/12, 61/9 paired closure)
    ├── matchEnd.test.ts        (66/4, 67/3 match termination)
    ├── invariants.test.ts      (70-seed conservation across state transitions)
    └── simulation.test.ts      (Deterministic headless play-throughs)
```

---

## 3. Technology Stack
- **Language**: TypeScript (v5.x) with strict mode enabled.
- **Test Runner**: Vitest (fast, native ESM and TS support).
- **Runtime**: Node.js v22+ (No browser/DOM dependencies required for core engine).
- **Dependencies**: DevDependencies only (`typescript`, `vitest`).

---

## 4. Phase 1 Implementation Order
1. **Task 1**: Environment setup (TypeScript, Vitest, npm scripts, development plans).
2. **Task 2**: Game constants and opposite pairs mapping.
3. **Task 3**: Core game types and state models.
4. **Task 4**: Board initialization and seed conservation invariant helper.
5. **Task 5**: Traversal helper (`getNextOpenPit`) with closed pit skipping.
6. **Task 6**: Pit selection validation and negative test suite.
7. **Task 7**: Sowing & continuous sowing mechanics.
8. **Task 8**: Positional capture resolution logic.
9. **Task 9**: Bonus detection (`3 -> 4`), manual claim, and expiration (`4 -> 5`).
10. **Task 10**: Centralized round-ending evaluation (Conditions 1 & 2).
11. **Task 11**: Round settlement and board clearing.
12. **Task 12**: Round setup and paired closure algorithm.
13. **Task 13**: Match-end evaluation and player elimination.
14. **Task 14**: Turn flow, state transitions, and automatic turn passing.
15. **Task 15**: Headless game runner / simulation API.
16. **Task 16–18**: Full test suite, edge-case coverage, invariant checks, regression tests.
17. **Task 19–20**: Code review, static typecheck, documentation, and Phase 1 completion report.
