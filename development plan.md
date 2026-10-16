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

## 8. Phase 2 Verification & Test Metrics (Preserved)
- **Phase 2 Status**: COMPLETE
- **Test Runner**: Vitest v3.2.7
- **Test Files**: 19 passed (19 total)
- **Total Tests**: 100 passed (0 failed, 0 skipped)
- **TypeScript Compilation**: `tsc --noEmit` passed with 0 errors
- **Production Build**: `tsc` passed with 0 errors, full `.d.ts` and `.js` bundles generated in `dist/`
- **Total Seeds Invariant**: Maintained at exactly 70 continuously across board setup, sowing, continuous sowing, capture, bonus collection, round settlement, and 500-turn deterministic property simulations with PRNG seeds.

---

## 9. Post-Phase-3 Bug Fixes & Gameplay/UI Improvements Tracking

| Issue ID | Summary | Root Cause | Engine / UI Fix | Status |
|---|---|---|---|---|
| **ISSUE-01** | Check round-ending conditions after bonus collection | `claimBonus` in `bonus.ts` previously only updated pit/storage/bonusAvailable without evaluating `shouldEndRound(state)`. When claiming bonuses emptied the board or left < 4 seeds, game stayed in `TURN_DECISION` without settling. | Added `shouldEndRound` evaluation, atomic `executeRoundSettlement(state)`, and `checkAndHandleMatchEnd(state)` to `claimBonus`. | **COMPLETED & VALIDATED** |
| **ISSUE-02** | Allow bonus claiming during and after sowing by pit owner | `ChannemaneGame.getClaimableBonuses` and UI checks defaulted claiming player to `state.currentPlayer`, preventing the non-turn player from claiming their own pit bonus. | Disconnected claiming player from `state.currentPlayer`. Owner of the pit is now the sole authority to claim their bonus anytime it is available. | **COMPLETED & VALIDATED** |
| **ISSUE-03** | Make Slow mode genuinely slower | Sowing step timing was hard-coded or too fast (~220ms). Slow mode was running at the speed Fast mode should use. | Centralized `ANIMATION_SPEED_CONFIG` with `SLOW: 450ms/step` and `FAST: 140ms/step`. Added Speed Toggle button in Header. | **COMPLETED & VALIDATED** |
| **ISSUE-04** | Make pits circular and increase size by ~1.7× | Pit CSS lacked explicit aspect ratio constraints (`1/1`) and equal width/height, allowing stretching. Size was 36-48px. | Styled pits with `aspect-ratio: 1/1; border-radius: 50%` and dimensions `clamp(48px, 6.6vw, 82px)` (~1.7× original diameter without doubling). | **COMPLETED & VALIDATED** |
| **ISSUE-05** | Display seed counts outside the pits | Numeric count badge was centered inside the pit button alongside seed beads. | Moved count badge outside the pit button to the owner-facing side (above pit for Player 1, below pit for Player 2), leaving only beads inside the pit. | **COMPLETED & VALIDATED** |
| **ISSUE-06** | Real-time seed-by-seed sowing animation and counts | Turn result was applied in batch after animation, so pit counts did not increment at the moment seeds landed. | Emitted deterministic `TurnAnimationEvent`s (`PICKUP`, `DROP`, `SCOOP`, `CAPTURE`) from engine. Visual pit states and numeric counts update on each seed landing and scoop. | **COMPLETED & VALIDATED** |
| **ISSUE-07** | Remove duplicate player storage displays | Player storage was rendered in both `PlayerPanels` and board storage bowls, plus an extra `.storage-bowls-mobile` container rendered unconstrained on desktop. | Removed duplicate storage counts from `PlayerPanels` and removed redundant mobile storage container, keeping storage exclusively in board bowls. | **COMPLETED & VALIDATED** |
| **ISSUE-08** | Fix Review Board navigation to next round | SettlementModal "Review Board" button called `onClose` which dismissed the modal, leaving user in `ROUND_SETTLEMENT` phase without controls to start the next round. | Added persistent `.round-settlement-action-bar` during board review with "Start Next Round →" and "View Summary" buttons. | **COMPLETED & VALIDATED** |
| **ISSUE-09** | Hide pit IDs P0–P13 from player-facing board | Visible badge `<span className="pit-id">P{pitId}</span>` and row labels `(P0–P6)` / `(P13–P7)` were displayed. | Removed visible pit ID badges and row labels. Retained `data-testid` and `aria-label` for automated testing and screen reader accessibility. | **COMPLETED & VALIDATED** |

---

## 10. Post-Phase-3 Verification & Test Metrics
- **Post-Phase-3 Status**: COMPLETE
- **Unit & Integration Tests (Vitest)**: 24 test suites, 122 tests passed (0 failed, 0 skipped)
- **E2E Browser Tests (Playwright Chromium)**: 13 tests passed (0 failed, 0 skipped, runtime 24.2s)
- **TypeScript Typecheck**: `tsc --noEmit` passed with 0 errors
- **Production Build**: `tsc && vite build` built clean in 2.14s (Output: `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`)
- **Seed Conservation Invariant**: 70 seeds strictly conserved across all states, bonus claims, real-time animation visual states, and round settlements.
- **Visual & Layout Quality**: Truly circular pits, ~1.7× enlarged diameter, exterior owner-facing counts, single desktop/mobile storage bowls, and zero visible technical pit IDs.

---

## 11. Critical Bonus Ownership Correction & Verification

### Root Cause
Prior implementation attempted to validate `claimingPlayer` against `pit.owner` or assume physical user authentication in `canClaimBonus` and `claimBonus`. Because a shared touchscreen or Pass & Play setup cannot reliably identify which physical player touches the screen, attempting to validate the UI actor caused incorrect rejections or potential routing mismatches.

### Authoritative Correction
1. **Unconditional Ownership Routing**: A bonus strictly belongs to `pit.owner`. Regardless of whose turn is active or which physical person touches the Claim button, the 4 seeds are credited to `pit.owner` and the other player's storage is untouched.
2. **Eligibility Criteria**: Unchanged: `pit.seeds === 4 && pit.bonusAvailable === true`. No physical authentication required.
3. **State Mutation**: On claim, `pit.seeds = 0`, `pit.bonusAvailable = false`, `pit.owner.storage += 4`, and round-ending / settlement conditions are evaluated immediately.
4. **Immediate UI Feedback**: `useChannemaneGame` updates both `gameState` and active `visualPlayers` immediately on bonus claim.

---

## 12. Bonus Claiming in Every Scenario (During and After Sowing)

### Root Cause
Previously, `ChannemaneGame.selectPit` executed the entire sowing sequence synchronously to completion in a single function call, while the UI played back animation steps via pre-scheduled timeouts using a local snapshot. As a result:
1. Mid-sowing bonus claims in the UI were rejected by the engine because the engine was already at the post-turn state where the pit might have received a 5th seed (bonus expired), was scooped, or captured.
2. Even if claimed, subsequent animation timeouts overwrote the claimed pit state with the pre-recorded snapshot.

### Architectural Solution
1. **Engine-Driven Discrete Turn Stepping**:
   - Implemented `startTurn(pitId)` and `stepTurn()` directly in `ChannemaneGame` in `src/engine/simulation.ts`.
   - Each discrete step (pickup, single-seed drop, continuous scoop, capture, turn completion) mutates the authoritative `GameState` in place.
   - Sowing does not end prematurely while `seedsInHand > 0` (`shouldEndRound` guarded).
2. **Real-Time Interactive Bonus Claims**:
   - At the exact step when a pit reaches 4 seeds, `bonusAvailable = true` in the live engine state.
   - If the player clicks "CLAIM +4" during sowing or after sowing, `game.claimBonus(pitId)` executes against the live state:
     - 4 seeds transferred to `pit.owner` storage immediately.
     - Pit seeds reset to 0; `bonusAvailable` reset to false.
     - React `gameState` re-rendered immediately.
     - Sowing continues from the mutated state without desynchronization.
3. **Seven-Scenario Test Matrix**:
   - Tests 1a & 1b: Player 1 is sowing; Player 1 pit / Player 2 pit reaches 4 seeds; Claim clicked immediately -> +4 to owner.
   - Tests 2a & 2b: Player 2 is sowing; Player 2 pit / Player 1 pit reaches 4 seeds; Claim clicked immediately -> +4 to owner.
   - Test 3: Sowing has finished; Claim clicked on eligible pit -> +4 to owner.
   - Tests 4 & 5: Player 1's turn; Player 2 / Player 1 bonus pit Claim button clicked -> +4 to pit owner.
   - Tests 6 & 7: Player 2's turn; Player 1 / Player 2 bonus pit Claim button clicked -> +4 to pit owner.

### Verified Test Results
- **Vitest**: 26 test suites, 134 tests passed (0 failed, 0 skipped) in 16.17s
- **Playwright**: 13 browser E2E tests passed (0 failed, 0 skipped) in 28.8s
- **TypeScript**: `tsc --noEmit` passed with 0 errors
- **Production Build**: `tsc && vite build` built cleanly in 2.05s (dist generated)

---

## 13. Authoritative Round-End Condition (`totalBoardSeeds < 4`)

### Authoritative Rule Definition
The round must end whenever the total number of seeds remaining on the board is strictly less than 4:
1. **Player 1 side**: sum of seeds in pits P0–P6 (`getPlayerSideSeeds(state, "PLAYER_1")`).
2. **Player 2 side**: sum of seeds in pits P7–P13 (`getPlayerSideSeeds(state, "PLAYER_2")`).
3. **Total board seeds**: Player 1 side total + Player 2 side total (`totalBoardSeeds = p1SideSeeds + p2SideSeeds`).
4. **Authoritative Condition**: `totalBoardSeeds < 4` (using strict `< 4` comparison, never `<= 4`).
5. **Key Invariants**:
   - The condition depends strictly and exclusively on `totalBoardSeeds < 4`.
   - Neither player's side is required to be empty.
   - Pits can hold any distribution of seeds.
   - Evaluator does not depend on `currentPlayer` or any individual pit count.
   - Mid-sowing hands are guarded (`seedsInHand > 0` returns `false` so in-progress seed dropping is not interrupted mid-hand).
   - Once triggered, existing settlement (`executeRoundSettlement`) transfers remaining P0–P6 seeds to Player 1, P7–P13 seeds to Player 2, empties all pits, and verifies the 70-seed conservation invariant.

### Mandatory 10-Scenario Test Matrix & Boundary Tests
Implemented in [`tests/roundEndCondition.test.ts`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/tests/roundEndCondition.test.ts):
- **Test 1**: P1 = 0, P2 = 3, Total = 3 -> Round ends (PASSED)
- **Test 2**: P1 = 1, P2 = 2, Total = 3 -> Round ends (PASSED)
- **Test 3**: P1 = 2, P2 = 1, Total = 3 -> Round ends (PASSED)
- **Test 4**: P1 = 3, P2 = 0, Total = 3 -> Round ends (PASSED)
- **Test 5**: P1 = 0, P2 = 2, Total = 2 -> Round ends (PASSED)
- **Test 6**: P1 = 1, P2 = 1, Total = 2 -> Round ends (PASSED)
- **Test 7**: P1 = 2, P2 = 0, Total = 2 -> Round ends (PASSED)
- **Test 8**: P1 = 1, P2 = 0, Total = 1 -> Round ends (PASSED)
- **Test 9**: P1 = 0, P2 = 1, Total = 1 -> Round ends (PASSED)
- **Test 10**: P1 = 0, P2 = 0, Total = 0 -> Round ends (PASSED)
- **Boundary Tests**:
  - Total = 4 (distributions: 2+2, 4+0, 0+4, 1+3, 3+1): round does NOT end (PASSED)
  - Total = 5 (distributions: 3+2, 5+0, 0+5): round does NOT end (PASSED)
- **Invariant & Integration Tests**:
  - Current player independence (Player 1 vs Player 2 turn) verified (PASSED)
  - Pit distribution independence (concentrated vs dispersed) verified (PASSED)
  - Seeds-in-hand safety guard verified (PASSED)
  - 70-seed conservation across settlement verified (PASSED)
  - `playTurn` and `ChannemaneGame` round-ending trigger and settlement verified (PASSED)

### Validation Summary
- **Vitest**: 27 test files, 158 tests passed (0 failed, 0 skipped)
- **Playwright E2E**: 13 tests passed (0 failed, 0 skipped)
- **TypeScript**: `tsc --noEmit` passed with 0 errors
- **Production Build**: `tsc && vite build` succeeded in 3.64s

---

## 14. Review Board Pre-Settlement State Restoration & Board Geometric Stabilization During Sowing

### 14.1 Root Cause Analysis

#### Issue 1: Review Board State Restoration
- **Root Cause**: In `executeRoundSettlement(state)`, the engine cleared all pits to zero and transferred all remaining board seeds to players' storage immediately upon round conclusion. When the player clicked "Review Board", the UI was viewing the post-settlement state where all pits contained 0 seeds and storage already included the transferred seeds.
- **Solution**:
  1. Captured a deep immutable snapshot via `cloneGameState(state)` with `phase: "ROUND_SETTLEMENT"` *prior* to modifying pit counts and storage in `executeRoundSettlement`.
  2. Extended `RoundSettlementResult` with `preSettlementState?: GameState`.
  3. Stored and propagated `preSettlementState` through `ChannemaneGame` controller (`simulation.ts`) across all turn execution methods (`selectPit`, `stepTurn`, `claimBonus`), accessible via `getPreSettlementState()`.
  4. Updated `useChannemaneGame.ts` to manage `isReviewingBoard` and `reviewBoardState`. In review mode, `effectiveGameState` returns `reviewBoardState`, displaying exact pre-settlement pit seed counts and storage without mutating live engine state.
  5. Disabled moves, sowing, continuous sowing, and bonus claiming while reviewing.
  6. Advancing to the next round or restarting the match exits review mode and resets snapshots cleanly.

#### Issue 2: Board Shaking & Geometric Shifts During Sowing
- **Root Cause**:
  1. CSS transforms (`transform: scale(1.08)`) on `.channemane-pit.active-drop` caused pit elements to scale during every seed drop, altering subpixel bounding geometry and triggering visual vibration.
  2. Hover transform `transform: translateY(-3px) scale(1.04)` on selectable pits created jitter.
  3. Dynamic insertion of `.hand-status-indicator` into unconstrained `.turn-banner` caused height to expand from 56px to 58px during sowing, pushing the entire board down by 2px on desktop and mobile.
  4. Dynamic toggling of vertical scrollbar changed viewport width, triggering responsive recalculations.
- **Solution**:
  1. Replaced all scale/translate transforms on active and hover pits with stable box-shadow and border glows that preserve exact layout geometry.
  2. Fixed `.turn-banner` to a strict, non-shifting 56px height with stable padding and compact `.hand-status-indicator`.
  3. Added `html { scrollbar-gutter: stable; overflow-y: scroll; }` to eliminate scrollbar-induced viewport shifts.
  4. Positioned seed beads absolutely inside pits (`.seed-cluster`) and reserved fixed height (`24px`) on external seed counts (`.pit-external-count`) so counts change without moving neighboring elements.

### 14.2 Test Verification
- **New Test Suites**:
  - `tests/reviewBoard.test.ts`: 6 tests verifying pre-settlement snapshot capture across distributions (0/3, 1/2, 2/1, 3/0, 2, 1, 0 seeds), storage isolation, simulation persistence, and bonus-triggered round settlement.
  - `tests/ui/reviewBoardUI.test.tsx`: 2 tests verifying full React UI review lifecycle, historical board display, action disabling, summary reopening, next-round setup, and restart reset.
  - `tests/ui/boardStability.test.tsx`: 5 tests verifying React element key stability during sowing, non-scaling active-drop highlights, progressive seed increments, timer cancellation on reset, and bonus claiming.
  - `tests/e2e/game.spec.ts`: Added bounding box and layout `offsetTop` measurement tests verifying geometric stability during animated sowing on desktop and mobile viewports.
- **Validation Results**:
  - **Vitest**: 30 test files, 171 passed (0 failed, 0 skipped).
  - **Playwright E2E**: 15 tests passed (0 failed, 0 skipped).
  - **TypeScript**: `tsc --noEmit` passed with 0 errors.
  - **Production Build**: `tsc && vite build` succeeded in 2.01s.

---

## 15. Maximum Seed Capacity Investigation and Perfectly Organized Pit Rendering

### 15.1 Maximum Seed Capacity Investigation
1. **Engine Source of Truth & Rules Inspected**:
   - Total Board Seeds: 70 seeds across 14 pits (5 seeds per pit initially).
   - Continuous sowing allows a player's hand to repeatedly pick up seeds from non-empty pits and distribute them counter-clockwise across both sides of the board.
   - Pits skipped when closed in later rounds concentrate distributed seeds across fewer pits.
   - 4-seed bonus claims can be captured or left unclaimed.
   - Round termination: `totalBoardSeeds < 4`.
2. **Investigation Methodology**:
   - Constructed [`tests/seedCapacityAnalysis.test.ts`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/tests/seedCapacityAnalysis.test.ts) combining:
     - Monte Carlo random simulation across 300 complete matches with varying bonus claim behaviors.
     - Adversarial targeted beam search (depth 25, beam width 20) with heuristic objective maximizing peak seed count in any pit.
     - Exhaustive theoretical upper bound analysis.
3. **Findings**:
   - **Highest Observed in Simulation**: **42 seeds** in pit 11 during Round 1 via move sequence `[4, 13, 6, 7, 4, 12, 6, 7, 5, 10, 2, 8, 3, 10, 6, 13, 4, 7, 6, 7, 0, 8]`.
   - **Theoretical Upper Bound**: **70 seeds** (strict board seed conservation).
   - **Engineering Decision**: The rendering and seed packing system is built to support up to the full theoretical maximum of **70 seeds** in a single pit without overlap or clipping.

### 15.2 Fixed Pit Size and Deterministic Concentric Seed Packing
1. **Circular Geometry & Coordinate Space**:
   - Pits have fixed, enlarged circular dimensions: `aspect-ratio: 1 / 1`, `width: clamp(54px, 7.2vw, 92px)`, `height: clamp(54px, 7.2vw, 92px)`, with fixed min dimensions of `48px`.
   - Dimensions are strictly constant regardless of whether a pit contains 0, 5, 20, 42, or 70 seeds.
   - Seed rendering uses an SVG coordinate space with `viewBox="-50 -50 100 100"`:
     - Outer Pit Radius: 50.0
     - Usable Inner Radius: 44.0 (reserving 6.0 units for pit border rim and padding)
2. **Packing Algorithm (`calculateSeedPositions(seedCount, pitGeometry)`)**:
   - Implemented in [`src/ui/utils/seedPacking.ts`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/src/ui/utils/seedPacking.ts).
   - Compact concentric ring architecture:
     - 1 seed: Centered at `(0, 0)`.
     - 2–7 seeds: 1 ring of radius $R_1 \approx 20.0$.
     - 8–19 seeds: 1 central seed + 1 ring.
     - 20–37 seeds: 2 concentric rings + central seed.
     - 38–70 seeds: 3 concentric rings (capacities 1, 8, 18, 28) + central seed.
   - For every count $N \in [0..70]$:
     - Adaptive seed radius $r \in [2.65, 8.5]$ based on ring capacity.
     - Guaranteed positive visual gap $\ge 0.75$ SVG units: $\text{distance}(A, B) > r_A + r_B$.
     - Furthest seed edge from center $\le 42.4 < 44.0$, guaranteeing seeds never clip pit rim or depend on `overflow: hidden`.
     - Deterministic placement: Identical count produces identical positions, eliminating React re-render visual jitter.
     - Zero seeds renders an empty pit cleanly without phantom seeds or SVG rendering.

### 15.3 Live Game State & Animation Integration
- Integrated in [`src/ui/components/Pit.tsx`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/src/ui/components/Pit.tsx) using memoized SVG geometry with radial gradients and glossy specular highlights.
- External tabular seed numbers remain stable and readable.
- Preserved sowing animations, active-drop glows, bonus badges, and Review Board historical states.

### 15.4 Test Verification
- **New Test Suites**:
  - `tests/seedCapacityAnalysis.test.ts`: Automated simulation & adversarial beam search verifying legal game states reaching 42 seeds and theoretical upper bound 70 seeds.
  - `tests/seedPacking.test.ts`: 14 geometric tests validating non-overlap, positive gap, boundary containment, determinism, and empty pit handling across `[0, 1, 5, 10, 20, 30, 40, 42, 50, 60, 70]` and the entire range `0..70`.
  - `tests/ui/pitSeedRendering.test.tsx`: 13 UI & DOM tests validating rendered SVG elements, test IDs, attributes, fixed dimensions, and geometric containment.
- **Validation Results**:
  - **Vitest**: 33 test files, 199 passed (0 failed, 0 skipped).
  - **TypeScript**: `tsc --noEmit` passed with 0 errors.
  - **Production Build**: `tsc && vite build` succeeded in 3.13s (dist generated cleanly).

---

## 16. Organized Captured-Seed Storage and Landscape-Only Mobile Gameplay

### 16.1 Organized Captured-Seed Storage Layout & Capacity
1. **Engine Source of Truth & Invariants**:
   - Total board seeds: Exactly 70 seeds conserved at all times (`pits total + player1.storage + player2.storage == 70`).
   - Theoretical maximum storage capacity for a single player: **70 seeds** (e.g. at match victory when opponent is wiped out or across round settlement).
   - Numeric counters and visual seeds are strictly bound to the engine's authoritative state without any duplicate or UI-only counters.
2. **Storage Seed Packing Algorithm (`calculateStorageSeedPositions`)**:
   - Implemented in [`src/ui/utils/storageSeedPacking.ts`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/src/ui/utils/storageSeedPacking.ts).
   - Arranges seeds in a clean, compact multi-row grid centered within a fixed $90 \times 180$ coordinate space.
   - For all counts $N \in [0..70]$:
     - Non-overlap: $\text{distance}(A, B) \ge r_A + r_B + \text{gap}$ with guaranteed positive gap $\ge 0.05$.
     - Strict boundary containment: $x - r \ge 0, x + r \le 90, y - r \ge 0, y + r \le 180$.
     - Deterministic and balanced: Same count always produces the same positions across both Player 1 and Player 2.
     - Zero seeds renders an empty reservoir without phantom beads.
3. **StorageBowl Component & Styles**:
   - Implemented in [`src/ui/components/StorageBowl.tsx`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/src/ui/components/StorageBowl.tsx) and [`src/ui/styles/index.css`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/src/ui/styles/index.css).
   - Fixed dimensions: `width: 104px; height: 230px` (or `88px x 180px` in compact landscape mobile).
   - Contains a fixed-size seed reservoir (`.storage-seeds-reservoir`) with SVG rendering, drop shadows, radial ivory-tamarind gradient, stroke outline, and specular gloss.
   - Storage dimensions remain strictly fixed regardless of whether a player has 0, 5, 20, 40, 60, or 70 seeds, completely preventing board shifting or layout distortion.

### 16.2 Landscape-Only Mobile Orientation Enforcement
1. **Detection Hook (`useOrientation`)**:
   - Implemented in [`src/ui/hooks/useOrientation.ts`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/src/ui/hooks/useOrientation.ts).
   - Uses `matchMedia("(orientation: portrait)")` combined with touch device heuristics (`(pointer: coarse)` and screen dimension $\le 1024\text{px}$).
   - Never blocks desktop/laptop screens even if the browser window is resized tall or narrow.
   - Safely requests native `screen.orientation.lock("landscape")` where supported by mobile browser/PWA runtimes without unhandled promise rejections.
2. **Blocking Screen (`OrientationPrompt`)**:
   - Implemented in [`src/ui/components/OrientationPrompt.tsx`](file:///c:/Users/karth/OneDrive/Documents/Desktop/CHANNEMANE/src/ui/components/OrientationPrompt.tsx).
   - Renders a modal overlay (`.orientation-prompt-overlay`) with royal Karnataka gold aesthetics, rotating phone animation, heading "Rotate Your Device", and instructional text.
   - Blocks pointer events and touch interaction with the board underneath without resetting game state.
   - Rotating back to landscape immediately restores access to the in-progress board with all seeds, turn progress, Review Board state, and timers intact.

### 16.3 Test Verification
- **New Test Suites**:
  - `tests/storagePacking.test.ts`: 11 tests verifying containment, non-overlap, positive gap, and determinism across `0, 1, 5, 10, 20, 30, 40, 50, 60, 70`.
  - `tests/ui/storageBowl.test.tsx`: 8 UI tests verifying exact SVG seed element counts, test IDs, and Player 1 / Player 2 symmetry.
  - `tests/ui/orientation.test.tsx`: 4 tests validating mobile portrait blocking, mobile landscape gameplay, desktop bypass, and zero state corruption across rotation.
## 17. Interactive Sowing, Manual Capture Confirmation, and Gesture-Based Bonus Collection

### 17.1 Interaction Flow & State Machine Architecture
1. **Explicit Interaction State Model**:
   - `WAITING_FOR_START`: Normal idle state; current player's legal, open, non-empty pits are selectable.
   - `SOWING_ANIMATION`: Active distribution batch dropping seeds one-by-one into pits at configured animation delay (Slow 450ms / Fast 140ms). Interaction locked during drop steps.
   - `WAITING_FOR_CONTINUATION`: Traversal batch finishes with hand reaching 0 seeds and the next open pit containing seeds. Sowing pauses cleanly.
   - `WAITING_FOR_CAPTURE`: Sowing batch concludes with an empty pit stopping condition and the following open pit containing seeds. Traversal pauses before transferring captured seeds.
   - `TURN_COMPLETION`: Final turn-end checks, round-end validation, and player alternation.
   - `ROUND_SETTLEMENT`: Round ended ($\text{total board seeds} < 4$); pre-settlement review snapshot preserved.
   - `MATCH_COMPLETE`: Match concludes when either player has $< 5$ storage seeds after round settlement.

2. **Manual Continuous Sowing**:
   - The authoritative game engine calculates the exact next pit via `getNextOpenPit(lastDestinationPit, pits)`.
   - The next pit is highlighted with a gentle green glow/pulse (`.continuation-target`, `data-continuation-target="true"`).
   - Status prompt displayed outside the board: **"Choose the highlighted pit to continue sowing."**
   - No seeds are scooped from the pit into hand prior to confirmation.
   - Tapping the highlighted pit confirms continuation via `confirmContinuation(pitId)`, picking up seeds and launching the next batch.
   - Invalid pit clicks (other pits, empty pits, closed pits) are rejected without altering seed counts, storage, or turn ownership.

3. **Player-Confirmed Capture**:
   - Authoritative capture detection implemented via `getCapturablePit(state, destinationPit)`.
   - Exact capturable pit highlighted with a distinct amber/orange glow/pulse (`.capture-target`, `data-capture-target="true"`).
   - Status prompt displayed outside the board: **"Tap the highlighted pit to collect its seeds."**
   - Captured seeds remain visibly inside the pit before confirmation.
   - Tapping the highlighted pit calls `confirmCapture(pitId)`, transferring seeds to the capturing player's storage and completing the turn.
   - Duplicate clicks or taps on other pits are rejected.

### 17.2 Gesture-Based Bonus Collection
1. **Removal of Visible Claim Badges**:
   - Completely removed visible `<button className="bonus-claim-badge">` from all pits per Requirement 18.
   - Eligible pits (`seeds === 4 && bonusAvailable && !isClosed`) display a subtle gold outline and glow (`.has-bonus`).
2. **Mobile / Touch Long-Press Interaction**:
   - Unified pointer event handler (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onPointerLeave`).
   - Touch hold lasting $\ge 500\text{ms}$ awards the bonus via `onClaimBonus(pitId)`.
   - Dynamic SVG progress ring (`.hold-progress-svg` and `.hold-progress-circle`) fills smoothly over 500ms.
   - Moving pointer $> 10\text{px}$ or releasing before 500ms cancels the gesture immediately without awarding seeds.
   - A successful long-press suppresses the subsequent click event to prevent accidental sowing selection.
3. **Desktop Right-Click Interaction**:
   - `onContextMenu` handler on pit button prevents the browser context menu and awards bonus if eligible.
   - Game board container suppresses context menu globally across the board surface.
4. **Ownership & Rule Integrity**:
   - Bonus is unconditionally credited to `pit.owner` regardless of current turn player or who triggered the gesture.
   - Pit seeds reset to 0, `bonusAvailable` set to false, duplicate claims rejected.
   - Bonus claiming remains functional both during active sowing batches and after sowing pauses.
   - Round-ending condition ($\text{board seeds} < 4$) is re-evaluated immediately upon claim.

### 17.3 Visual Stability & Accessibility
- Fixed pit dimensions (`aspect-ratio: 1/1; width: clamp(...)`) maintained without transform scaling, board shaking, or layout shifts.
- Outline and box-shadow pulses used for green (continuation) and amber (capture) indicators.
- Reduced-motion accessibility supported via `@media (prefers-reduced-motion: reduce)`.
- Full keyboard support: focused bonus pits allow pressing 'B' to claim bonus.

### 17.4 Test Verification
- **Unit & Integration Tests**:
  - `tests/engine/interactiveEngine.test.ts`: 4 tests verifying pause on continuation, seed retention prior to confirmation, capture confirmation, bonus ownership, and strict 70-seed conservation invariant.
  - `tests/ui/interactiveGameplay.test.tsx`: 9 tests verifying UI states, green continuation highlight, amber capture highlight, 500ms long-press, move/release cancellation, right-click, and status prompts.
  - `tests/ui/pit.test.tsx`: 6 tests verifying absence of Claim badge, long-press, and context menu.
  - `tests/ui/bonusClaiming.test.tsx`: 2 tests verifying mid-sowing and post-sowing bonus gesture claiming.
  - `tests/ui/boardStability.test.tsx`: 5 tests verifying geometric stability during manual continuation batches.
- **E2E Tests (`tests/e2e/game.spec.ts`)**:
  - 15 Playwright browser tests passed (34.3s).
- **TypeScript & Build**:
  - `npm run typecheck` passed with 0 errors.
  - `npm run build` produced production bundle cleanly in 3.30s (`dist/index.html` generated).

---

## 18. Main Menu and Game Mode Selection

### 18.1 Implementation Summary
1. **Initial Main Menu (`src/ui/components/MainMenu.tsx`)**:
   - Created ornate landing screen adhering strictly to the Karnataka Royal Heritage theme (deep teak/rosewood gradients, brass inlay borders, gold glow effects, and Kannada cultural branding "ಪಾರಂಪರಿಕ ಚನ್ನೆಮಣೆ ಆಟ").
   - Three clearly visible, mobile touch-friendly primary options:
     - **Play with AI** (`data-testid="menu-btn-ai"`)
     - **Local Multiplayer** (`data-testid="menu-btn-local"`)
     - **Rules** (`data-testid="menu-btn-rules"`)
   - Initial application state defaults to `currentScreen = "MAIN_MENU"`; the game board is never opened automatically upon initial load.
   - Designed with generous touch targets (min-height $\ge 68\text{px}$ on desktop, $60\text{px}$ on mobile) with distinct icons, titles, and descriptive subtitles.

2. **Play with AI Flow (`src/ui/components/DifficultySelect.tsx`)**:
   - Displays a dedicated difficulty selection screen with exactly three options:
     - **Beginner** (`data-testid="difficulty-btn-beginner"`)
     - **Expert** (`data-testid="difficulty-btn-expert"`)
     - **Master** (`data-testid="difficulty-btn-master"`)
   - Includes **⬅️ Back to Main Menu** (`data-testid="difficulty-btn-back"`) to return seamlessly to `MAIN_MENU`.
   - Selecting any difficulty initializes the game board, setting `gameMode: "ai"` and `aiDifficulty: "beginner" | "expert" | "master"` in the authoritative game state and UI state.
   - Preserves all existing board rendering, interaction states, and sowing mechanics without altering AI algorithms (deferred to future AI implementation phase).

3. **Local Multiplayer Flow**:
   - Clicking **Local Multiplayer** launches the existing board directly without asking for an AI difficulty.
   - Stores `gameMode: "local"` and `aiDifficulty: null` in state.

4. **Rules Flow (`src/ui/components/RulesModal.tsx`)**:
   - Reuses the existing `RulesModal` component without duplicating rules.
   - Added a dedicated **← Back to Menu** button (`data-testid="rules-back-btn"`) alongside the close button to provide clear return navigation whether launched from the Main Menu or the in-game Header.

5. **In-Game Navigation & State Management**:
   - Header (`src/ui/components/Header.tsx`) enhanced with a **🏠 Menu** button (`data-testid="main-menu-btn"`), allowing users to return to the Main Menu cleanly at any time.
   - Returning to the menu resets any in-progress game state cleanly, ensuring no stale timeouts or corrupted state remain.
   - Header includes a dynamic mode badge (`data-testid="game-mode-tag"`), indicating `🤖 AI (BEGINNER|EXPERT|MASTER)` or `👥 LOCAL 2P`.
   - Engine models updated in `src/engine/types.ts`, `src/engine/board.ts`, `src/engine/simulation.ts`, and `src/ui/hooks/useChannemaneGame.ts`.

### 18.2 Test Verification
- **Unit & Navigation Tests (`tests/ui/menuNavigation.test.tsx`)**:
  - 8 automated tests passed verifying all 10 user requirements:
    1. Main menu with 3 buttons rendered initially.
    2. Board not opened automatically on initial load.
    3. Play with AI displays Beginner, Expert, Master, and Back.
    4. Back button returns to Main Menu.
    5. Beginner selection launches board and records `gameMode: "ai"`, `aiDifficulty: "beginner"`.
    6. Expert selection launches board and records `gameMode: "ai"`, `aiDifficulty: "expert"`.
    7. Master selection launches board and records `gameMode: "ai"`, `aiDifficulty: "master"`.
    8. Local Multiplayer launches board directly without difficulty prompt and records `gameMode: "local"`.
    9. Rules opens existing modal from main menu and returns cleanly.
    10. In-game menu button returns to main menu and resets game state.
- **Full Vitest Test Suite**:
  - 27 test files, 185 tests passed (100% pass rate).
- **Playwright Browser E2E Suite (`tests/e2e/game.spec.ts`)**:
  - 21 browser E2E tests passed (51.5s), including 6 dedicated end-to-end scenarios covering menu navigation, difficulty selection, local multiplayer, rules modal, and in-game return to menu.
- **Typecheck & Production Build**:
  - `npm run typecheck` passed (0 errors).
  - `npm run build` produced clean production bundle in 2.98s (`dist/index.html` generated).

---

## 19. Modal, Theme Colors, and Animation Performance Fixes

### 19.1 Issue 1: Removal of Close (X) Icon from End-Game Modals
- **Target Components**:
  - `src/ui/components/SettlementModal.tsx` (Round end and multi-round settlement dialog).
  - `src/ui/components/MatchEndModal.tsx` (Match end victor dialog).
- **Changes**:
  - Removed the `modal-close-btn` ("✕") button element and its click listener from both modals.
  - Eliminated any leftover empty clickable areas in the header.
  - Preserved all required state transitions and action buttons:
    - `SettlementModal`: "Review Board" (`data-testid="settlement-review-btn"`) and "Start Next Round →" (`data-testid="settlement-next-round-btn"`).
    - `MatchEndModal`: "Play Again 🔄" (`data-testid="match-end-play-again-btn"`).
  - Made `onClose` optional in `MatchEndModalProps` to ensure TypeScript safety without orphaned handlers.
  - Retained the close button on `RulesModal` where dismissal without state alteration is intentional.

### 19.2 Issue 2: Mobile Landscape Modal Fit Without Scrolling
- **Viewport Constraints**:
  - Standardized all modal overlays and cards (`.modal-content`, `.main-menu-card`, `.difficulty-select-card`) with:
    - `box-sizing: border-box;`
    - `max-height: calc(100vh - 16px);`
    - `max-height: calc(100dvh - 16px);` (modern dynamic viewport height with fallback).
- **Responsive Landscape Layouts (`@media (orientation: landscape) and (max-height: 540px)`)**:
  - **Main Menu**: Transformed from a tall vertical stack into a compact 2-column side-by-side grid (`grid-template-areas: "header options"`). Header on left, 3 menu buttons on right. Overall card height reduced to $< 200\text{px}$, fitting inside 320px–380px landscape phone screens with zero vertical scrolling.
  - **Difficulty Selection**: Transformed into a 2-column grid with header on left, difficulty options & back button in a 2x2 grid on right. Card height $< 200\text{px}$ without vertical scrolling.
  - **Rules Modal**: Grid layout with rules in 2 side-by-side columns; max height set to $92\text{dvh}$ with compact padding.
  - **Settlement & Match-End Modals**: Compact score card layout with reduced margins, 12px padding, and inline action buttons to guarantee all content fits without scrolling on any mobile landscape screen.

### 19.3 Issue 3: Theme-Compatible Gameplay Indicator Palette
- **Centralized Design Tokens in `:root`**:
  - `--indicator-selected: #fff2cc;` (warm ivory pearl glow for active pit selection).
  - `--indicator-continuation: #f59e0b;` (warm amber/muted gold, replacing neon green `#22c55e`).
  - `--indicator-capture: #c2410c;` (deep burnished terracotta bronze for capture confirmation).
  - `--indicator-bonus: #d4af37;` (radiant royal brass gold aura for bonus-eligible pits).
- **Accessibility & Distinct Treatment**:
  - Beyond color differences, distinct border styles are applied for color-vision accessibility:
    - Continuation target: `3px dashed #fcd34d` outline with amber glow pulse.
    - Capture target: `3px double #fb923c` outline with terracotta glow pulse.
    - Bonus pit: Continuous pulsing gold ring aura (`#d4af37`).
  - Updated `TurnBanner.tsx` and interactive prompt badges (`.continuation-prompt`, `.capture-prompt`) to consume the centralized CSS variables.

### 19.4 Issue 4: Animation Smoothness & Rendering Optimization
- **Eliminated Redundant Component Re-renders**:
  - Wrapped `Pit.tsx`, `StorageBowl.tsx`, `PlayerPanels.tsx`, and `GameBoard.tsx` in `React.memo`.
  - During sowing steps, pits whose seed count or highlight state do not change are skipped by React's reconciliation engine, preventing 14 full SVG re-layouts per animation step.
- **Stabilized Callback References**:
  - Refactored `src/App.tsx` to pass stable callbacks (`selectPit`, `confirmContinuation`, `confirmCapture`, `claimBonus`) directly to `GameBoard`, eliminating inline arrow functions that broke child memoization on every render.
- **Timer and Callback Cleanup**:
  - In `src/ui/hooks/useChannemaneGame.ts`, added automatic filtering to `animationTimeoutsRef.current` upon timer completion to prevent unbounded array growth during extended gameplay.
  - Ensured all active timeouts are cleared before starting new sowing sequences or resetting the game.
- **Eliminated Board Layout Shift**:
  - Stabilized `.game-header` with `min-height: 80px; box-sizing: border-box;` and `.brand-title` with `line-height: 1.2;`, preventing 3px vertical layout shifts when web fonts finish loading asynchronously.

### 19.5 Automated Test Verification
- **TypeScript Static Analysis**:
  - `npm run typecheck` passed with 0 errors.
- **Unit & Component Tests (`npx vitest run`)**:
  - 39 test files passed (245 tests total, 0 failures).
  - Includes modal tests asserting absence of Close (X) button on end-game modals and presence on Rules modal.
  - Includes turn banner indicator tests asserting theme color variables.
  - Includes bonus scenario drain helpers resolving interactive continuation/capture pauses.
- **Playwright End-to-End Browser Tests (`npx playwright test`)**:
  - 21 tests passed (36.8s, 100% pass rate).
  - Verified board geometry stability throughout sowing at desktop and mobile landscape viewports without shaking or shifting.
- **Production Build (`npm run build`)**:
  - Built successfully in 3.12s (`dist/index.html` 0.98 kB, `dist/assets/index-*.js` 282.97 kB).

---

## 20. Intermittent Match-End Detection and UI Handling Fixes

### 20.1 Root Cause Analysis
- **Inverted Evaluation Priority in UI Hook**: In `src/ui/hooks/useChannemaneGame.ts`, multiple completion sites evaluated `if (result.roundEnded && result.roundSettlement)` before `else if (result.matchEnded && result.matchResult)`. When a round ended and its settlement caused either player to have fewer than 5 seeds in storage (e.g., the reported 66 / 4 case), both `roundEnded` and `matchEnded` were true on the result. The `else if` branch was bypassed, populating `settlementSummary` instead of `matchSummary`.
- **Modals and Review Controls Conflict**: `SettlementModal` was displayed with an actionable "Start Next Round →" button despite the match being finished. When clicked, the engine rejected the next-round transition because the authoritative phase was already `MATCH_END`, leaving the player stuck on a broken state with no way to progress or view the victory screen.
- **Fragmented Completion Logic**: Turn completion logic was duplicated across six separate code paths (animated turn finish, step completion, immediate sowing, immediate continuation, capture confirmation, and manual bonus claiming).

### 20.2 Changes Implemented
1. **Centralized Completion Handler (`handleGameplayCompletion`)**:
   - Consolidated completion logic into a single authoritative handler in `src/ui/hooks/useChannemaneGame.ts`.
   - **Enforced Priority Order**:
     1. Evaluates match end first: checks `outcome.matchEnded`, `outcome.matchResult?.isMatchEnd`, `currentState.phase === "MATCH_END"`, or settled storage $< 5$ via `isMatchOver(currentState)`.
     2. If match is completed, sets `matchSummary` from the authoritative result, transitions `interactionState` to `"MATCH_COMPLETE"`, sets `currentState.phase = "MATCH_END"`, and clears/suppresses `settlementSummary` so the two modals never compete.
     3. If match is not completed and the round has settled, sets `settlementSummary`, preserves the pre-settlement board snapshot for Review Board, and transitions to `"ROUND_SETTLEMENT"`.
     4. Otherwise returns to normal `"WAITING_FOR_START"`.
   - Applied `handleGameplayCompletion` across all six turn-completion paths.

2. **Guarded Next-Round Transitions (`startNextRound`)**:
   - In `ChannemaneGame.startNextRound()` (`src/engine/simulation.ts`): Rejects immediately if `this.state.phase === "MATCH_END"` or `isMatchOver(this.state)`. Ensures `preSettlementState` is not cleared unless round setup succeeds.
   - In `useChannemaneGame.ts`: Rejects immediately if `gameState.phase === "MATCH_END"`, `currentState.phase === "MATCH_END"`, `isMatchOver(currentState)`, or `matchSummary !== null`. Prevents clearing settlement state or modal summaries on rejected calls.
   - In `SettlementModal.tsx`: Hides the "Start Next Round →" button if `openPairs === 0`.
   - In `App.tsx`: Guards `isRoundSettled` so it evaluates to `false` when `phase === "MATCH_END"` or `matchSummary !== null`, hiding the settlement review bar and preventing modal collisions (`settlementSummary && !matchSummary`).

3. **Phase-Scoped Match Eligibility Evaluation**:
   - Ensured `isMatchOver` is only checked during or after round settlement (`ROUND_SETTLEMENT` / `MATCH_END`), preventing false positive match completions during the `PLAYING` phase when players' storage is legitimately 0 after opening pits.

### 20.3 Test Verification
- **Authoritative Boundary Test Cases (`tests/matchEnd.test.ts`)**:
  - Tested all required storage totals: 66/4, 67/3, 68/2, 69/1, 70/0, 4/66, 3/67, 35/35, 34/36, 36/34.
  - Verified 70-seed conservation invariant and winner declaration for each case.
- **Dedicated Integration Test Suite (`tests/ui/matchEndIntegration.test.tsx`)**:
  - Verified the exact reported 66 / 4 scenario: MatchEndModal displays with Player 1 victory, SettlementModal is suppressed, and no Start Next Round button is visible.
  - Verified reversed 4 / 66 scenario: Player 2 victory displayed cleanly.
  - Verified normal round settlements (42 / 28) correctly display SettlementModal and allow starting the next round.
  - Verified that calling `startNextRound()` when match has ended returns an error without clearing match summary or dismissing the modal.
  - Verified match completion via animated sowing queue and immediate / non-animated sowing.
  - Verified restart match resets state cleanly to initial game.
- **Full Test Suite Results**:
  - `npm run typecheck`: Passed with 0 errors.
  - `npx vitest run`: All 40 test files passed (260 tests, 0 failures).
  - `npx playwright test`: All 21 E2E browser tests passed (58.4s).
  - `npm run build`: Production bundle compiled cleanly in 4.91s (`dist/index.html` 0.98 kB).

---

## 21. Beginner AI Difficulty Implementation

### 21.1 Architecture & Separation of Concerns
Following the project's strict architecture, the AI implementation was constructed in a dedicated, isolated engine module (`src/engine/ai/`):
- **Single Source of Truth**: The existing game engine (`src/engine/`) remains authoritative for all rules, transitions, and state management. The AI never bypasses engine checks or invents rules.
- **Move Generation**: Uses existing engine helper `getSelectablePits(state)` strictly filtered for the AI player (`state.aiPlayer || "PLAYER_2"`). Empty pits, closed pits, and human-owned pits are strictly excluded.
- **Candidate Evaluation (`src/engine/ai/beginner.ts`)**:
  - Clones game state in complete isolation (`JSON.parse(JSON.stringify(gameState))`).
  - Simulates the entire move execution via engine's `playTurn(simState, pitId)`.
  - Calculates immediate outcome metrics:
    - Net seeds captured (`simState.players[aiPlayer].storage - currentState.players[aiPlayer].storage`).
    - Eligible bonus opportunities: detects newly formed 4-seed pits owned by AI (`pit.seeds === 4 && pit.owner === aiPlayer`).
    - Opponent bonus risk: penalizes candidate moves that leave an opponent pit at 4 seeds (`pit.seeds === 4 && pit.owner !== aiPlayer`).
    - Match victory (`simState.phase === "MATCH_END"` where AI is the winner).
    - Round victory (`simState.phase === "ROUND_SETTLEMENT"` where AI holds majority storage).
  - Verifies zero mutation to live state.
- **Evaluation Scoring**:
  - Configurable weight structure (`AIEvaluationWeights`):
    - `captureWeight: 10.0`
    - `bonusOpportunityWeight: 8.0`
    - `opponentBonusPenaltyWeight: 4.0`
    - `roundWinWeight: 25.0`
    - `matchWinWeight: 100.0`
- **Balanced Capture Strategy & Controlled Randomness**:
  - Default selection probability: $P_{\text{best}} = 0.75$ (75% probability to pick highest scoring move, 25% to pick another legal move).
  - Unconditional single-move guarantee: If only 1 legal starting pit exists, selects it immediately with zero random override.
  - Injectable RNG parameter (`rng?: () => number`) for deterministic unit and integration testing.

### 21.2 Asynchronous Gameplay & Animation Coordination
Integrated seamlessly into `src/ui/hooks/useChannemaneGame.ts`:
- **AI Turn Guarding**: AI execution triggers only when `gameMode === "ai"`, `aiDifficulty === "beginner"`, `gameState.phase === "PLAYING"`, `gameState.currentPlayer === aiPlayer`, and `!isAnimating`.
- **Natural Thinking Pause**: 500ms presentation delay before selecting starting pit, cancelable on unmount, match restart, menu navigation, or phase change.
- **Automated Continuation & Capture**:
  - While human players retain full manual continuation clicking and capture confirmation, AI turns automatically proceed after a brief delay (350ms) to ensure animations complete smoothly.
  - Automatically invokes `confirmContinuation()` and `confirmCapture()`.
- **Bonus Handling**:
  - AI auto-claims its own eligible bonuses (`pit.owner === aiPlayer && pit.seeds === 4`).
  - Never auto-claims human-owned bonuses; human bonus ownership and manual gesture claiming remain fully preserved.
- **Local Multiplayer Protection**:
  - Local multiplayer mode remains 100% human-controlled with no AI state leaks.

### 21.3 Test Verification
- **Unit Tests (`tests/ai/beginner.test.ts`)**: 15 tests covering legal move generation, candidate simulation without mutation, capture weighting, bonus opportunities, round/match win scoring, deterministic RNG selection, and statistical 75/25 distribution over 1,000 trials.
- **UI Integration Tests (`tests/ui/aiIntegration.test.tsx`)**: 6 integration tests verifying Local Multiplayer isolation, human manual continuation in AI mode, automatic AI turn execution, automated continuation & capture confirmation, selective bonus claiming, and timer cancellation on menu navigation.
- **E2E Playwright Suite (`tests/e2e/game.spec.ts`)**: Added Scenario 7 verifying full browser interaction against Beginner AI with automated response turns.
- **Full Test Suite Results**:
  - `npm run typecheck`: Passed with 0 errors.
  - `npx vitest run`: All 42 test files passed (281 tests, 0 failures).
  - `npx playwright test`: All 22 E2E browser tests passed.
  - `npm run build`: Production bundle compiled cleanly with 0 errors.




