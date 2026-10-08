# Channemane Project — Working Development Plan

## 1. Project Overview
Channemane is a traditional Karnataka board game from the Mancala family.
The ultimate objective is a cross-platform (Web, Android, iOS) game supporting Pass & Play and Computer AI opponents.
Phase 1 established the validated development foundation and initial core.
Phase 2 transformed the foundation into the **complete, deterministic, framework-independent Channemane Game Engine and automated test suite**.

---

## 2. Confirmed Core Requirements Summary
- **Board Structure**: 14 pits (P0–P6 owned by Player 1, P7–P13 owned by Player 2), 5 seeds per pit initially, 70 seeds total.
- **Opposite Pairs**: `[[0, 13], [1, 12], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]`.
- **Direction**: Strict counter-clockwise traversal: `P0 -> P1 -> ... -> P13 -> P0`.
- **Sowing**: Counter-clockwise distribution into `OPEN` pits, skipping `CLOSED` pits.
- **Continuous Sowing**: Upon hand exhaustion, if the next `OPEN` pit has seeds, scoop and continue; if empty, evaluate capture.
- **Capture**: Strictly single positional capture. If next `OPEN` pit is empty and following `OPEN` pit has seeds, capture all into active player's storage and reset pit to 0. Works on either player's side.
- **Bonus System**: When a pit transitions `3 -> 4` during sowing, `bonusAvailable = true` for the pit's owner. Owner claims manually (+4 seeds to owner storage, pit resets to 0). Bonus expires if the pit reaches 5 seeds (`4 -> 5`).
- **Turn Pass**: If a player has 0 legal moves on their side and the round has not ended, their turn is automatically passed.
- **Turn vs. Round End**: Evaluated at full turn completion.
- **Round-Ending Conditions**:
  - Condition 1: Total seeds on the board $< 4$.
  - Condition 2: One player's side $= 0$ AND the opponent's side $< 4$.
  - Note: One side empty while opponent has $\ge 4$ seeds does *not* end the round.
- **Round Settlement**: Remaining board seeds transfer to their respective owners; pits reset to 0; winner is player with $> 35$ seeds; winner starts next round.
- **Round Setup**: Storage determines open pairs: $\min(\lfloor S_1 / 5 \rfloor, \lfloor S_2 / 5 \rfloor, 7)$. First $N$ pairs open with 5 seeds each; remaining pairs closed with 0 seeds.
- **Match End**: Checked after round settlement; if either player has $< 5$ storage ($\text{openPairs} = 0$), that player loses the match.
- **Seed Conservation Invariant**: At all valid states, $\sum \text{pits} + \text{seedsInHand} + \text{P1.storage} + \text{P2.storage} = 70$.

---

## 3. Development Phases
- **Phase 1**: Game Engine Development Foundation & Initial Prototype (**COMPLETE**)
- **Phase 2**: Complete, Deterministic Channemane Game Engine & QA Suite (**COMPLETE**)
- **Phase 3**: Web UI & Visual Board Component (**IN PROGRESS**)
- **Phase 4**: Sound, Animations & Pass & Play Polish (Planned)
- **Phase 5**: Mobile Deployment (Capacitor / Android / iOS) (Planned)
- **Phase 6**: AI Players (Easy, Medium, Hard) (Planned)
- **Phase 7**: Monetization & Advertisements (Planned)

---

## 4. Consensus Review for Phase 3 (Web UI Implementation)
Before implementation, the three-role consensus panel reviewed the architecture:
1. **Frontend Architecture Reviewer**:
   - Single source of truth in `ChannemaneGame` / `GameState`. Zero duplicated rules in React.
   - Reactive UI adapter hook (`useChannemaneGame`) handles state synchronization, sequential animation queues from `TurnResult.sowResult.steps`, and interaction locks during animation.
   - Clean component hierarchy (`App`, `Header`, `TurnBanner`, `GameBoard`, `Pit`, `StorageBowl`, `SettlementModal`, `MatchEndModal`, `RulesModal`).
2. **Game UX/UI Specialist**:
   - Karnataka traditional heritage wooden theme (rich teak/rosewood tones, brass inlays, golden accents, warm ivory beads).
   - High accessibility: large seed counts, distinct ownership colors (Crimson / Royal Indigo), radiant pulsing gold ring for 3->4 bonus claiming, distinct locked visual for closed pits.
   - Mobile-first responsiveness: adapt dynamically to mobile touch targets (min 48px), tablet, and desktop without browser zoom.
3. **QA & Interaction Specialist**:
   - Total interaction safety: disable pit clicks during `isAnimating` to prevent double-execution and desync.
   - Seed conservation invariant verified after every action ($S_1 + S_2 + \text{hand} + \sum \text{pits} = 70$).
   - Dual test tiers: Vitest + Testing Library for unit/component tests, Playwright Chromium for E2E positive/negative workflows.
**Consensus Result**: Unanimously approved (3 / 3).

---

## 5. Phase 3 Task Breakdown & Status Tracking

| Task ID | Issue Summary | Classification | Priority | Complexity | Dependencies | Status |
|---|---|---|---|---|---|---|
| **PH3-T01** | React Shell, Vite Setup & Project Architecture | `ui-foundation` | Critical | S | Phase 2 | **COMPLETED** |
| **PH3-T02** | Engine-UI Controller Adapter & State Management Hook (`useChannemaneGame`) | `ui-adapter` | Critical | M | PH3-T01 | **COMPLETED** |
| **PH3-T03** | Karnataka Heritage Design System & CSS (Wood/Brass theme, Responsive) | `styling` | High | M | PH3-T01 | **COMPLETED** |
| **PH3-T04** | Interactive Pit Component & Seed Clustering Visuals | `ui-component` | Critical | M | PH3-T02, T03 | **COMPLETED** |
| **PH3-T05** | 14-Pit Physical Board Layout & Player Storage Bowls | `ui-component` | Critical | M | PH3-T04 | **COMPLETED** |
| **PH3-T06** | Turn Indicator, Player Status Panels & In-Game Action Bar | `ui-component` | High | S | PH3-T02, T03 | **COMPLETED** |
| **PH3-T07** | Authoritative Sowing & Continuous Sowing Step Animation Engine | `animation` | Critical | L | PH3-T02, T05 | **COMPLETED** |
| **PH3-T08** | Bonus Opportunity Detection, Notification & Manual Claim UX | `ui-feature` | High | M | PH3-T04, T06 | **COMPLETED** |
| **PH3-T09** | Round Settlement Modal & Multi-Round Paired Pit Closure Visualization | `ui-feature` | Critical | M | PH3-T02, T05 | **COMPLETED** |
| **PH3-T10** | Match End Victor Screen & Replay/Restart Controls | `ui-feature` | High | S | PH3-T02, T09 | **COMPLETED** |
| **PH3-T11** | Rules & Cultural Heritage Guide Modal | `ui-feature` | Medium | S | PH3-T03 | **COMPLETED** |
| **PH3-T12** | Responsive Touch Optimization (Desktop, Tablet, Mobile) | `styling` | High | M | PH3-T05..T11 | **COMPLETED** |
| **PH3-T13** | Unit & Component Test Suite (Vitest + Testing Library) | `testing` | Critical | M | PH3-T02..T11 | **COMPLETED** |
| **PH3-T14** | Playwright End-to-End Browser Test Suite (Positive & Negative Flows) | `testing` | Critical | L | PH3-T05..T12 | **COMPLETED** |
| **PH3-T15** | Senior Architect Review, Regression Suite & Phase 3 Sign-Off | `review` | Critical | S | PH3-T13, T14 | **COMPLETED** |

---

## 6. Phase 3 Verification & Test Metrics
- **Phase 3 Status**: COMPLETE
- **Test Runner (Vitest)**: 24 test files passed (116 tests total: 100 engine tests, 16 React component/integration tests)
- **E2E Browser Runner (Playwright Chromium)**: 8 tests passed (Positive: initial load, valid turn selection, sowing animation, rules dialog, reset board; Negative: invalid opponent side, rapid double click, empty pit disabled)
- **TypeScript Compilation**: `tsc --noEmit` passed with 0 errors
- **Production Builds**:
  - Pure Engine Core Library: `tsc` generated declarations and JS in `dist/`
  - React Web Client: `vite build` generated production bundle in `dist-web/` (HTML: 0.98 kB, CSS: 11.51 kB, JS: 250.31 kB)
- **Rule Authority**: Single source of truth in engine; zero game rules duplicated in React components.
- **Accessibility & Design**: High contrast palette, semantic HTML, ARIA labels, focus states, responsive CSS for desktop, tablet, and mobile touch targets.

---

## 7. Phase 2 Task Breakdown & Historical Tracking (Preserved)

| Task ID | Issue Summary | Classification | Priority | Complexity | Dependencies | Status |
|---|---|---|---|---|---|---|
| **PH2-T01** | Core Domain Types & Seeds In Hand Support | `engine` | Critical | S | None | **COMPLETED** |
| **PH2-T02** | Board Initialization & Microscopic Invariant Support | `engine` | Critical | S | PH2-T01 | **COMPLETED** |
| **PH2-T03** | Authoritative Traversal & Opposite-Pit Mapping | `game-logic` | Critical | S | PH2-T01 | **COMPLETED** |
| **PH2-T04** | Pit Selection Validation & Negative Scenarios | `game-logic` | Critical | S | PH2-T01 | **COMPLETED** |
| **PH2-T05** | Seed Pickup & Hand Management Engine | `game-logic` | Critical | S | PH2-T04 | **COMPLETED** |
| **PH2-T06** | Automatic Sowing & Single-Seed Step Mechanics | `game-logic` | Critical | M | PH2-T05 | **COMPLETED** |
| **PH2-T07** | Continuous Sowing Chain Engine | `game-logic` | Critical | M | PH2-T06 | **COMPLETED** |
| **PH2-T08** | Positional Capture Rule Engine | `game-logic` | Critical | M | PH2-T07 | **COMPLETED** |
| **PH2-T09** | Bonus Detection Engine (3 -> 4) | `game-logic` | High | M | PH2-T06 | **COMPLETED** |
| **PH2-T10** | Bonus Collection & Expiration (4 -> 5) Engine | `game-logic` | High | M | PH2-T09 | **COMPLETED** |
| **PH2-T11** | Turn State Machine & Explicit Transition Validator | `engine` | Critical | M | PH2-T05..10 | **COMPLETED** |
| **PH2-T12** | Centralized Round-Ending Engine (Condition 1 & 2) | `game-logic` | Critical | M | PH2-T11 | **COMPLETED** |
| **PH2-T13** | Round Settlement & Invariant Transfer Engine | `game-logic` | Critical | S | PH2-T12 | **COMPLETED** |
| **PH2-T14** | Next Round Setup & Paired Closure Algorithm | `game-logic` | Critical | M | PH2-T13 | **COMPLETED** |
| **PH2-T15** | Match-End Engine & Elimination Logic | `game-logic` | High | S | PH2-T14 | **COMPLETED** |
| **PH2-T16** | Headless Controller & Deterministic Property Testing (Seeded PRNG) | `testing` | Critical | L | PH2-T01..15 | **COMPLETED** |
| **PH2-T17** | Senior Architect Code Review & Full Validation Suite | `review` | Critical | S | PH2-T16 | **COMPLETED** |
| **PH2-T18** | Phase 2 Final Report & Sign-Off | `management` | Critical | S | PH2-T17 | **COMPLETED** |

---

## 5. Phase 2 Verification & Test Metrics
- **Phase 2 Status**: COMPLETE
- **Test Runner**: Vitest v3.2.7
- **Test Files**: 19 passed (19 total)
- **Total Tests**: 100 passed (0 failed, 0 skipped)
- **TypeScript Compilation**: `tsc --noEmit` passed with 0 errors
- **Production Build**: `tsc` passed with 0 errors, full `.d.ts` and `.js` bundles generated in `dist/`
- **Total Seeds Invariant**: Maintained at exactly 70 continuously across board setup, sowing, continuous sowing, capture, bonus collection, round settlement, and 500-turn deterministic property simulations with PRNG seeds.
