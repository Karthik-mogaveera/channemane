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

---

## 22. AI Bonus Auto-Collection, First-Turn Selection, and Turn Notifications

### 22.1 Feature 1 — Automatically Collect AI-Owned Bonuses
- **Authoritative Engine Grounding**:
  - Automatically claims bonuses belonging strictly to the AI player (`pit.owner === aiPlayer && pit.seeds === 4 && pit.bonusAvailable === true && !pit.isClosed`).
  - Utilizes existing authoritative `claimBonus(pitId)` engine action; never directly mutates pit seeds or storage numbers outside the engine.
  - Credits 4 seeds directly to AI storage and zeroes the bonus pit with `bonusAvailable = false`.
- **Strict Ownership Preservation**:
  - Human-owned bonuses are NEVER auto-claimed on the human's behalf.
  - Sowing into an opponent's pit does not re-assign bonus ownership; bonuses belong to the pit's permanent owner.
  - Expired, unavailable, or already claimed bonuses are rejected.
  - 70-seed conservation invariant verified throughout.
- **Turn & Animation Coordination**:
  - Auto-claim triggers in `useChannemaneGame.ts` whenever `!isAnimating`, `turnNotification === null`, and game is in active playable state.
  - Runs during both AI turns and human turns (e.g., when a human sows the 4th seed into an AI pit, AI auto-claims without requiring human clicks).
  - Protected by a 250ms debounce and active state checks to prevent duplicate claims across multiple React render cycles.

### 22.2 Feature 2 — "Who will Play first" Dialog
- **Modal Component (`src/ui/components/FirstPlayerModal.tsx`)**:
  - Displays when the player selects **Beginner**, **Expert**, or **Master** from Play with AI.
  - Title: **"Who will Play first"** with two clear options:
    - **Player** (`data-testid="first-player-player-btn"`)
    - **AI** (`data-testid="first-player-ai-btn"`)
  - Includes a Back button returning to difficulty selection.
- **Starting Player Flow**:
  - When **Player** is chosen: game starts with Player 1 taking turn 1, displaying "Your turn" notification.
  - When **AI** is chosen: game starts with Player 2 (AI) taking turn 1, displaying "AI turn" notification.
  - Authoritative starting player is passed to `createInitialGame` and preserved on match restart (`onRestart` / `onNewMatch`).
- **Expert & Master Safeguard (`src/ui/components/ComingSoonModal.tsx`)**:
  - Expert and Master options open the first-player dialog as required, but upon selection display a clear, friendly "Coming Soon" modal.
  - Prevents accidentally launching unfinished AI logic or silently substituting Beginner AI.
  - Provides direct actions: "Play Beginner AI", "Change Difficulty", and "Back to Menu".
- **Local Multiplayer Isolation**:
  - Local Multiplayer mode opens directly without showing the first-player dialog.

### 22.3 Feature 3 — Turn-Start Notifications
- **Notification Component (`src/ui/components/TurnNotification.tsx`)**:
  - Displays a short, elegant modal pill before each turn begins:
    - Human turn: **"Your turn"** (`data-testid="turn-notification-popup"`)
    - AI turn: **"AI turn"** (`data-testid="turn-notification-popup"`)
  - Styled to match the royal Channemane Karnataka heritage theme (gold borders, dark wooden glow, responsive mobile landscape layout).
- **Display Triggers & Lifecycle**:
  - Appears on initial game start matching the selected starting player.
  - Appears on turn handover after each completed turn.
  - Appears on next-round start after round settlement.
  - Display duration: exactly 800ms.
  - Input prevention: during the 800ms display, human pit selection is disabled (`selectablePits` is empty).
  - AI thinking coordination: AI decision-making is paused until `turnNotification === null`.
  - Suppressed during active sowing, continuous sowing confirmation, capture confirmation, round settlement, and match completion.
  - Canceled on restart, menu navigation, or unmount to avoid memory leaks or stale state updates.

### 22.4 Automated Test Verification
- **New Test Suites**:
  - `tests/ui/firstPlayerDialog.test.tsx`: 9 unit/integration tests verifying modal visibility, Player selection, AI selection, Expert/Master safeguards, and Local Multiplayer exclusion.
  - `tests/ui/turnNotification.test.tsx`: 4 integration tests verifying popup text, 800ms duration, input lockout, and clean cancellation on restart.
  - `tests/ui/aiBonusAutoCollection.test.tsx`: 5 integration tests verifying AI bonus auto-collection, 4 seeds credited to AI storage, human bonus exclusion, seed conservation, and auto-collection during human moves.
- **Regression & Integration Tests**:
  - `tests/ui/aiIntegration.test.tsx`: 6 tests verifying AI turn orchestration with notification coordination and bonus auto-collection.
  - `tests/ui/menuNavigation.test.tsx`: 8 tests updated to handle FirstPlayerModal and ComingSoonModal flows.
  - `tests/e2e/game.spec.ts`: 22 Playwright browser tests updated and passing (100% pass rate).
- **Full Test Suite Results**:
  - `npm run typecheck`: Passed with 0 errors.
  - `npx vitest run`: All 45 test files passed (299 tests, 0 failures).
  - `npx playwright test`: All 22 E2E browser tests passed.
  - `npm run build`: Production bundle compiled cleanly in 3.14s.

## 23. Next-Round Input and AI Turn Failure Permanent Fix

### 23.1 Observed Failure & Symptoms
- After a round ended and was settled, starting the next round intermittently caused either:
  1. The human player being unable to click or tap any eligible open pit to begin sowing (all pits disabled or clicks silently dropped).
  2. The AI player being unable to start sowing in the next round when assigned to move first (game permanently paused at WAITING_FOR_START).

### 23.2 Root Cause Analysis
Code inspection revealed the exact failure mechanisms:
1. **Lingering Incomplete `turnContext` in `ChannemaneGame`**:
   - In `ChannemaneGame.startNextRound()`, `this.turnContext` was never reset to `null`.
   - When a round ended via a bonus claim (e.g. board seeds dropping below 4 mid-turn) or if a turn was settled before normal completion, `turnContext.isComplete` remained `false`.
   - Consequently, `game.isTurnInProgress()` evaluated to `true` at the start of the next round.
   - For the human player, `useChannemaneGame`'s `selectPit` checks `if (gameRef.current.isTurnInProgress()) return null;`, causing clicks to be dropped.
   - For the AI player, the orchestration effect checks `if (!gameRef.current.isTurnInProgress()) { selectPit(chosenPit); }`, preventing the AI from taking its turn.
2. **Phase check order in `ChannemaneGame.startNextRound()`**:
   - `startNextRound()` evaluated `if (this.state.phase === "MATCH_END" || isMatchOver(this.state))` before checking `if (this.state.phase !== "ROUND_SETTLEMENT")`.
   - Because `isMatchOver()` checks whether storage is under 5 (which is normal during `PLAYING` phase after seeds have been placed on pits), calling or double-invoking next round falsely triggered match termination errors.
3. **Transient `seedsInHand` not reset in settlement and setup**:
   - Neither `executeRoundSettlement` nor `setupNextRound` explicitly reset `state.seedsInHand = 0`, allowing transient hand seeds to survive across round boundaries.
4. **Animation and Settlement Synchronization in UI**:
   - In `claimBonus()`, if a claim ended the round, pending sowing animation timeouts were not cleared, allowing orphaned step callbacks to run during settlement review.
   - In `handleGameplayCompletion()`, if `roundSettlement` summary was not immediately attached, `interactionState` was incorrectly falling through to `"WAITING_FOR_START"` while `state.phase` remained `"ROUND_SETTLEMENT"`.
5. **AI Move Evaluation Synchronization**:
   - Inside the 500ms AI thinking timer, the AI now re-verifies legal moves against the current authoritative state rather than using potentially stale closure state.

### 23.3 Files Changed
- `src/engine/simulation.ts`:
  - Reset `this.turnContext = null` in `startNextRound()`.
  - Added public `resetTurnContext()` helper.
  - In `claimBonus()`, mark `this.turnContext.isComplete = true` when bonus collection ends the round.
  - In `stepTurn()`, return `roundSettlement` if the turn completed due to round settlement.
  - Evaluated phase check order in `startNextRound()` before `isMatchOver()`.
- `src/engine/roundSetup.ts`:
  - Explicitly reset `state.seedsInHand = 0` during `setupNextRound()`.
- `src/engine/settlement.ts`:
  - Explicitly reset `state.seedsInHand = 0` during `executeRoundSettlement()`.
- `src/ui/hooks/useChannemaneGame.ts`:
  - In `claimBonus()`, immediately clear pending animation timeouts and reset visual hand/drop states when bonus ends the round.
  - In `handleGameplayCompletion()`, preserve and fall back to cached settlement summary, ensuring `interactionState` stays in `"ROUND_SETTLEMENT"` during settlement.
  - In AI turn orchestration effect, re-evaluate legal moves from the authoritative state when the thinking delay finishes.

### 23.4 Regression Tests Added
- `tests/ui/nextRoundTransitionBug.test.tsx`:
  - **Scenario A**: Human starts next round -> verifies playable phase, pit selectable, click invokes sowing.
  - **Scenario B**: AI starts next round -> verifies AI turn scheduled, legally selects pit, executes without lockup.
  - **Scenario C**: Repeated consecutive round transitions (Round 1 -> 2 -> 3) with alternating winners remain fully playable.
  - **Scenario D**: Mid-turn bonus claim ending round cleanly cancels animation and clears `turnContext`.
  - **Scenario E**: Duplicate invocation of `startNextRound` is safely rejected and preserves game state idempotently.
  - **Scenario F**: Match termination (66/4 and 4/66) takes precedence and blocks next round.
  - **Scenario G**: Verifies 70-seed conservation, correct pit ownership, and round-win counts across transitions.

### 23.5 Verification Results
- **TypeScript Typecheck (`npm run typecheck`)**: Passed with 0 errors.
- **Unit & Integration Suite (`npx vitest run`)**: All 46 test files passed (306/306 tests, 0 failures).
- **Production Build (`npm run build`)**: Compiled successfully with Vite in 3.14s.

---

## 24. Expert AI Difficulty Implementation (Section 24)

### 24.1 Architecture & Design
The Expert AI difficulty is engineered as an authoritative, high-performance decision module for Channemane:
1. **Search Algorithm**:
   - Alpha-Beta Minimax search with move ordering.
   - Iterative Deepening from depth 1 up to `maxDepth` (default 6).
   - Incomplete iteration safety: If a search iteration is interrupted due to budget expiration, the search strictly returns the best move from the deepest *fully completed* iteration.
   - Transposition Table (TT) caching: Stores exact, lower-bound, and upper-bound scores with best move suggestions. Keys are comprehensive (`r:round|p:phase|tp:turnPhase|c:player|s:p1_p2|pits...`) incorporating pit seeds, open/closed status, and bonus availability.
   - Limited tactical extensions: 1-ply search extension on horizon nodes with unstable tactical conditions (< 3 selectable pits or <= 14 board seeds).
   - Rare tie variation: Configurable threshold (`tieThreshold = 15`) and variation probability (default 10%) among near-tied top moves with injectable RNG for deterministic test reproducibility.
2. **5-Tier Position Evaluator**:
   - **Priority 1: Match Outcome**: Strongly prefers proven forced match wins (`+1,000,000 - depth`) and avoids forced losses (`-1,000,000 + depth`) evaluated accurately upon round settlement when storage is terminal (< 5 seeds).
   - **Priority 2: Round Outcome**: Evaluates round settlement consequences, round wins (`+20,000`), open pit pairs for the next round (`calculateOpenPairs`), and seed reserves.
   - **Priority 3: Storage Advantage**: Strongly weights secured storage difference (`storageWeight = 100`) and friendly vs opponent board seeds (`boardSeedWeight = 15`).
   - **Priority 4: Tactical Opportunities**: Rewards claimable bonuses (`+120`), heavily penalizes opponent bonus opportunities (`-140`), rewards 3-seed bonus setup opportunities (`+35`), and penalizes opponent 3-seed bonus threats (`-40`).
   - **Priority 5: Positional Quality**: Evaluates legal candidate mobility (`+25` per move) and pit defense (`+20`).
3. **Execution & Web Worker**:
   - Dedicated Web Worker `src/engine/ai/expertWorker.ts` for off-thread browser search execution.
   - Client coordinator `src/engine/ai/expertClient.ts` with request ID tracking, automatic cancellation of superseded searches, and automatic synchronous fallback for Node/Vitest test environments.

### 24.2 Files Changed & Created
- `src/engine/ai/types.ts`:
  - Defined `ExpertEvaluationWeights`, `ExpertSearchConfig`, `ExpertSearchDiagnostics`, `ExpertIterationInfo`, `TTEntry`, and `TTNodeType`.
- `src/engine/ai/expert.ts`:
  - Implemented `DEFAULT_EXPERT_WEIGHTS`, `getGameStateKey`, `evaluatePosition`, `getOrderedCandidateMoves`, `minimax`, and `selectExpertMove`.
- `src/engine/ai/expertWorker.ts`:
  - Created Web Worker script handling isolated message events for background search execution.
- `src/engine/ai/expertClient.ts`:
  - Created client wrapper with Worker instantiation, cancellation token management, and synchronous fallback.
- `src/engine/ai/index.ts`:
  - Re-exported all Expert AI types, evaluation, search, and client symbols.
- `src/App.tsx`:
  - Updated `handleSelectFirstPlayer` to launch game with `gameMode = "ai"`, `aiDifficulty = "expert"`, while keeping Master difficulty protected with the Coming Soon notice.
- `src/ui/hooks/useChannemaneGame.ts`:
  - Integrated Expert AI turn selection in the AI turn orchestration effect.
  - Added clean search cancellation on restart, menu navigation, and unmount.
- `tests/ai/expert.test.ts`:
  - 15 unit tests covering evaluation priorities, state serialization, TT caching, move ordering, forced win/loss handling, iterative deepening budget safety, and tie variation.
- `tests/ui/expertIntegration.test.tsx`:
  - 6 integration tests verifying difficulty selection, first-player dialog, human-first, AI-first, auto-bonus collection, and cancellation on menu exit.
- `tests/ai/tournament.test.ts`:
  - Repeatable benchmark suite covering simple, full-branching, tactical, bonus-rich, near-round-ending, and near-match-ending positions.
  - Seeded 8-game tournament simulation against Beginner AI.

### 24.3 Performance & Tournament Results
1. **Benchmark Suite**:
   - Simple Position (1-2 moves): Solved in < 15ms at depth >= 2.
   - Full Branching Opening (7 moves): Completed depth >= 2 with 15+ nodes evaluated in < 10ms.
   - Tactical Capture: Immediate 6-seed capture identified in < 5ms.
   - Bonus-Rich & Endgame: Completed depth >= 3 within 10ms.
2. **Tournament (Expert vs Beginner)**:
   - Games Played: 8 (alternating starting player: Expert as P1 & P2).
   - Expert Wins: 8 (100.0% win rate).
   - Beginner Wins: 0 (0.0%).
   - Draws: 0.
   - Average Thinking Latency: 0.54 - 2.22 ms/turn.

### 24.4 Verification Results
- **TypeScript Typecheck (`npm run typecheck`)**: Passed with 0 errors.
- **Unit & Integration Suite (`npx vitest run`)**: All 49 test files passed (334/334 tests, 0 failures).
- **Production Build (`npm run build`)**: Compiled successfully with Vite in 2.33s including Web Worker bundle (`expertWorker-*.js`).

---

## 25. Master AI Difficulty Implementation (Section 25)

### 25.1 Architecture & Design
The Master difficulty is engineered as an elite-level AI opponent for Channemane:
1. **Shared AI Search Architecture**:
   - Reuses authoritative game engine (`playTurn`, `cloneGameState`, `isMatchOver`, `calculateOpenPairs`) without duplicating rule mechanics.
   - Distinct Master profile with deep iterative deepening (depth up to 8), adaptive search budget (up to 500ms), and 2-ply selective tactical search extensions.
   - Transposition table (TT) caching with complete state serialization keys (`r:round|p:phase|tp:turnPhase|c:player|s:p1_p2|pits...`).
   - Move ordering prioritizing TT suggested moves, capture consequences, and bonus creation/denial.
   - Deterministic, elite move selection (`variationProbability = 0.0` by default).

2. **Calibrated Master Position Evaluator (`evaluateMasterPosition`)**:
   - **Tier 1: Terminal Match Outcome**: Guaranteed match wins evaluated at `+1,000,000 - depth`; forced losses evaluated at `-1,000,000 + depth`. Includes foresight during the `PLAYING` phase that detects when an opponent's storage plus all remaining board seeds is $< 5$ (mathematically guaranteeing match elimination).
   - **Tier 2: Round Outcome**: Values round victory (`+25,000`), future open pit pairs after settlement (`+1,200` per pair difference), and seed reserves.
   - **Tier 3: Storage & Seed Balance**: Weights storage difference (`storageWeight = 120`), friendly board seeds (`boardSeedWeight = 20`), and endgame seed differential (`endgameSeedAdvantage = 50`).
   - **Tier 4: Tactical Control & Aggressive Opponent Denial**: Evaluates claimable bonuses (`+150` plus 4 seeds in storage), heavily penalizes opponent bonus opportunities (`-180`), rewards 3-seed bonus setup opportunities (`+45`), penalizes opponent 3-seed bonus threats (`-60`), and evaluates pit vulnerability/defense (`+30`).
   - **Tier 5: Positional Quality**: Evaluates legal candidate mobility (`+35` per move) and defense against opponent scooping.

3. **Hybrid Exact Endgame Solver (`src/engine/ai/endgameSolver.ts`)**:
   - **Tractability Detection (`isEndgameTractable`)**: Dynamically evaluates total board seeds, number of active pits, and branch complexity (e.g. $\le 4$ board seeds, or $\le 6$ seeds with $\le 3$ active pits).
   - **Exact Minimax Search**: Explores the state space using the authoritative `playTurn` engine, with cycle detection via ancestor path tracking and memoization.
   - **Strict Resource Bounds**: Hard node limit (12,000 nodes), time limit (250ms), and depth horizon limits.
   - **Graceful Fallback**: If the solver cannot prove an exact result within its resource limits, it safely returns `null` so Master falls back to bounded iterative deepening search (never claiming exactness on an incomplete solve).

4. **Web Worker & Client Coordination**:
   - Web Worker (`src/engine/ai/expertWorker.ts`) handles both `EVALUATE_EXPERT_MOVE` and `EVALUATE_MASTER_MOVE` off the UI thread.
   - Client (`src/engine/ai/expertClient.ts`) coordinates requests via `requestMasterDecision` with cancellation token tracking and synchronous fallback for Node/Vitest test environments.

### 25.2 UI & Gameplay Integration
- **Menu & Difficulty Flow**:
  - In `src/App.tsx`, selecting "Play with AI" -> "Master" displays the "Who will Play first" dialog and launches the game directly with `gameMode = "ai"`, `aiDifficulty = "master"`.
  - Removed the "Coming Soon" modal for Master difficulty.
- **Turn Orchestration**:
  - In `src/ui/hooks/useChannemaneGame.ts`, integrated Master AI turn execution into the AI turn orchestration effect.
  - Automatically claims AI-owned bonuses with standard delay without human intervention.
  - Cancels pending search requests cleanly on match restart, navigation back to main menu, or component unmount.
- **Regression Isolation**:
  - Beginner, Expert, and Local Multiplayer modes remain 100% isolated and unchanged.

### 25.3 Files Changed & Created
- **Created**:
  - `src/engine/ai/master.ts`: Master evaluation, minimax search, and move selection.
  - `src/engine/ai/endgameSolver.ts`: Hybrid exact endgame solver.
  - `tests/ai/master.test.ts`: Comprehensive Master AI search, tactical, endgame, and regression test suite (20 tests).
  - `tests/ui/masterIntegration.test.tsx`: UI integration and turn orchestration test suite (4 tests).
- **Modified**:
  - `src/engine/ai/types.ts`: Added Master evaluation weights, search configuration, diagnostics, and endgame solver types.
  - `src/engine/ai/expertWorker.ts`: Added support for `EVALUATE_MASTER_MOVE` and `MASTER_MOVE_RESULT`.
  - `src/engine/ai/expertClient.ts`: Added `requestMasterDecision` and Master response handling.
  - `src/engine/ai/index.ts`: Exported Master and Endgame Solver symbols.
  - `src/App.tsx`: Enabled Master difficulty launch in `handleSelectFirstPlayer`.
  - `src/ui/hooks/useChannemaneGame.ts`: Added Master AI turn selection and difficulty gating.
  - `tests/ai/tournament.test.ts`: Added Master vs Expert tournament simulation with alternating player seats.
  - `tests/ui/firstPlayerDialog.test.tsx`: Updated Test 7 to assert Master launches game.
  - `tests/ui/menuNavigation.test.tsx`: Updated Scenario 7 to assert Master launches board.
  - `tests/ui/expertIntegration.test.tsx`: Updated Master test to assert game launch.

### 25.4 Benchmark & Tournament Verification Results
1. **Master AI vs Expert AI Tournament (8 matches, alternating seats)**:
   - Games Played: 8
   - Master Wins: 8 (100.0% win rate)
   - Expert Wins: 0 (0.0%)
   - Draws: 0
   - Exact Endgame Solves: 18 solves
   - Average Decision Latency: 1.15 - 2.17 ms/turn
   - Zero invalid moves or state invariant violations.
2. **Full Project Test Suite**:
   - `npm test`: 51 test files passed, 359/359 tests passed (100% pass rate).
3. **TypeScript Static Analysis**:
   - `npm run typecheck`: Passed with 0 errors.
4. **Production Build**:
   - `npm run build`: Compiled production bundle in 3.37s with Vite and TypeScript.

---

## 26. Local Multiplayer Player Count Selection Implementation

### 26.1 Architectural Overview
When the user clicks **"Local Multiplayer"** on the Main Menu, the application navigates to a dedicated player-count selection screen (`MULTIPLAYER_SELECT`) presenting exactly five choices:
1. **2 Players**: Fully playable; routes directly into the authoritative 2-player local multiplayer game engine without unnecessary state mutation.
2. **3 Players**: Displays a non-intrusive "Work in Progress" modal with exact user-facing notice: *"Multiplayer for this player count is currently under development. Stay tuned for future updates!"*.
3. **4 Players**: Displays the same "Work in Progress" modal.
4. **5 Players**: Displays the same "Work in Progress" modal.
5. **6 Players**: Displays the same "Work in Progress" modal.

### 26.2 Key Components & Responsive Layout
- **`MultiplayerSelect` Component (`src/ui/components/MultiplayerSelect.tsx`)**:
  - Displays cultural emblem 👥, title *"Local Multiplayer"*, and subtitle *"Choose the number of players"*.
  - Renders 5 interactive option buttons with tailored illustrations/emojis, badges (`Play Now` for 2 Players, `Coming Soon` for 3–6 Players), and descriptions.
  - Includes a Back button returning cleanly to the Main Menu.
  - Respects the Karnataka Royal Heritage theme and maintains consistent typography, borders, and hover states.
- **`WorkInProgressModal` Component (`src/ui/components/WorkInProgressModal.tsx`)**:
  - Accessible dialog (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="wip-title"`).
  - Exact Title: *"Work in Progress"*.
  - Exact Message: *"Multiplayer for this player count is currently under development. Stay tuned for future updates!"*.
  - Includes an explicit *"Got it"* action button.
  - Dismissible via button click, backdrop click, or Escape key.
  - Event propagation is stopped on the modal content to prevent unwanted clicks through to options underneath.
- **Mobile Landscape Optimization**:
  - In landscape viewports (height $\le$ 540px), adapts into a 2-column layout: left column contains the header and back button; right column arranges the 5 options with 2 Players spanning the top and 3–6 Players in a 2x2 grid. Fits within short mobile landscape screens without vertical scrolling.

### 26.3 Files Created & Modified
- **Created**:
  - `src/ui/components/MultiplayerSelect.tsx`: 5-option selection screen component.
  - `src/ui/components/WorkInProgressModal.tsx`: Accessible Work in Progress dialog component.
  - `tests/ui/multiplayerSelect.test.tsx`: Comprehensive integration test suite covering navigation, 2P game launching, 3–6P WIP dialog triggers, dismissals, non-mutation, and regression checks.
- **Modified**:
  - `src/App.tsx`: Added `"MULTIPLAYER_SELECT"` screen to `AppScreen`, wired up handlers (`handleOpenMultiplayerSelect`, `handleSelectPlayerCount`), and integrated the WIP modal.
  - `src/ui/styles/index.css`: Added styles for multiplayer selection card, badges, WIP dialog, and mobile-landscape grid layouts.
  - `tests/ui/menuNavigation.test.tsx`: Updated Scenarios 8 & 10 to navigate through 2 Players option.
  - `tests/ui/firstPlayerDialog.test.tsx`: Updated Test 8 to select 2 Players in Local Multiplayer.
  - `tests/e2e/game.spec.ts`: Updated E2E Scenarios 4 & 6 for the 2 Players selection flow.

### 26.4 Verification Results
1. **Full Project Test Suite**:
   - `npm test`: 52 test files passed, 365/365 tests passed (100% pass rate).
2. **TypeScript Static Analysis**:
   - `npm run typecheck`: Passed with 0 errors.
3. **Production Build**:
   - `npm run build`: Compiled production bundle in 3.44s with Vite and TypeScript.

---

## 27. 3-Player Local Multiplayer Mode Implementation

### 27.1 Architecture & Physical Layout
1. **Board Layout & Pit Ownership**:
   - 15 total pits arranged in three rows of five:
     - **Player 1 Side**: P0, P1, P2, P3, P4 (Row 1: rendered left-to-right 0, 1, 2, 3, 4).
     - **Player 2 Side**: P5, P6, P7, P8, P9 (Row 2: rendered right-to-left 9, 8, 7, 6, 5).
     - **Player 3 Side**: P10, P11, P12, P13, P14 (Row 3: rendered left-to-right 10, 11, 12, 13, 14).
   - Three dedicated storage bowls:
     - Player 1 (top-left) & Player 3 (bottom-left) on the left storage column.
     - Player 2 on the right storage column.
   - Initial State: 5 seeds per pit = 75 total seeds on board, 0 in each player's storage.
   - Strict Seed Conservation Invariant: `sum(all 15 pit seeds) + storage P1 + storage P2 + storage P3 = 75` (normal 3-player match) or `50` (2-player recovery match after disqualification).

2. **Counter-Clockwise Traversal & Sowing**:
   - S-curve serpentine traversal: Row 1 left-to-right (0..4) -> Row 2 right-to-left (5..9) -> Row 3 left-to-right (10..14) -> wraps to Row 1 (0).
   - Numerical ascending order with wrapping modulo 15 naturally reflects counter-clockwise physical traversal.
   - Pits marked `status: "CLOSED"` are completely skipped during sowing, continuous sowing continuation inspections, and capture checks.
   - Continuous sowing across player boundaries without artificial chain limits.
   - Capture transferred to the sowing player's storage regardless of who owns the captured pit.
   - Bonus claimed when a pit reaches 4 seeds; awarded exclusively to the pit's owner.

3. **Pair-Wise Pit Groups (G1–G5)**:
   - Authored centrally in pure configuration functions (`src/engine/constants.ts`):
     - **All 3 active**: G1: [0, 9, 10], G2: [1, 8, 11], G3: [2, 7, 12], G4: [3, 6, 13], G5: [4, 5, 14]
     - **P1 disqualified**: G1: [9, 10], G2: [8, 11], G3: [7, 12], G4: [6, 13], G5: [5, 14] (P0–P4 permanently closed)
     - **P2 disqualified**: G1: [0, 10], G2: [1, 11], G3: [2, 12], G4: [3, 13], G5: [4, 14] (P5–P9 permanently closed)
     - **P3 disqualified**: G1: [0, 9], G2: [1, 8], G3: [2, 7], G4: [3, 6], G5: [4, 5] (P10–P14 permanently closed)

4. **Round Restart, Group Opening, and Disqualification Flow**:
   - Pits are swept at settlement: P0–P4 to P1, P5–P9 to P2, P10–P14 to P3.
   - Groups G1..G5 open in order atomically. Each open group deducts 5 seeds from each represented active player's storage.
   - If any active player cannot afford 5 seeds for group $k$: group $k$ and all subsequent groups are closed; unspent seeds stay in storage.
   - **G1 Failure (Disqualification Recovery)**:
     - If G1 cannot open because an active player has $< 5$ seeds: that player is permanently disqualified.
     - Disqualified player's pits are permanently closed.
     - Exactly 25 seeds belonging to that player are removed from the game (elimination rule).
     - The match restarts with the 2 remaining players using their pairwise groups.
     - Recovery board initializes with 50 active seeds: 5 seeds in each of their 10 active pits, and 0 in both storages.
   - **Final Match End**:
     - If during 2-player recovery G1 cannot open because one remaining player has $< 5$ seeds: that player is disqualified and the sole remaining player wins the match (`phase = "MATCH_END"`).

### 27.2 Files Modified and Created
- **Engine Rules & Types**:
  - `src/engine/types.ts`: Added `"PLAYER_3"` to `Player`, `player3?: PlayerState`, `playerCount?: 2 | 3`, `disqualifiedPlayers?: Player[]`.
  - `src/engine/constants.ts`: Added `THREE_PLAYER_TOTAL_PITS`, `THREE_PLAYER_TOTAL_SEEDS`, `THREE_PLAYER_RECOVERY_SEEDS`, `THREE_PLAYER_P1/P2/P3_PITS`, `THREE_PLAYER_GROUPS_*`, `getThreePlayerGroups`, `getThreePlayerPitOwner`. Preserved 2-player defaults for `isValidPitId` and `getPitOwner`.
  - `src/engine/traversal.ts`: Dynamic pit length support for counter-clockwise traversal skipping closed pits.
  - `src/engine/selection.ts`: Dynamic pit bounds validation.
  - `src/engine/board.ts`: Initial 15-pit/75-seed board creation, active player detection, `getNextActivePlayer`, 75/50 seed conservation invariants, cloning.
  - `src/engine/capture.ts`: Captured seeds attribution to Player 3.
  - `src/engine/bonus.ts`: Bonus attribution to Player 3, dynamic bounds.
  - `src/engine/roundEnd.ts`: Round-end detection (`boardSeeds < 4`).
  - `src/engine/settlement.ts`: 3-player sweeping (P0–P4 to P1, P5–P9 to P2, P10–P14 to P3), `player3RemainingTransferred`, `player3FinalStorage`, `roundWinner`.
  - `src/engine/roundSetup.ts`: `setupNextRoundThreePlayer` with atomic G1..G5 group opening, G1 failure disqualification, 25-seed elimination, 50-seed 2-player restart, and final victory detection.
  - `src/engine/matchEnd.ts`: 3-player match end evaluation and remaining-player victory detection.
  - `src/engine/game.ts` & `src/engine/simulation.ts`: Turn rotation `P1 -> P2 -> P3 -> P1` skipping disqualified players, auto-passing, constructor support.
- **UI Components & Hooks**:
  - `src/ui/hooks/useChannemaneGame.ts`: Added `initialPlayerCount` and `restartMatch(..., newPlayerCount)`.
  - `src/ui/components/MultiplayerSelect.tsx`: Updated 3 Players button to active "Play Now".
  - `src/App.tsx`: Wired 3 Players to launch 3-player board, pass Player 3 and disqualified state to `PlayerPanels`.
  - `src/ui/components/GameBoard.tsx`: 3-row layout (`Row 1: [0..4]`, `Row 2: [9..5]`, `Row 3: [10..14]`) with 3 storage bowls.
  - `src/ui/components/Pit.tsx`: Added Player 3 owner, class, and external count styling.
  - `src/ui/components/StorageBowl.tsx`: Added Player 3 storage bowl support.
  - `src/ui/components/PlayerPanels.tsx`: Added Player 3 card with `(Disqualified)` tag.
  - `src/ui/components/TurnBanner.tsx`: Added Player 3 turn status and dot color.
  - `src/ui/components/SettlementModal.tsx`: Render Player 3 score box and 3-player group preview.
  - `src/ui/components/MatchEndModal.tsx`: Support Player 3 victory banner.
  - `src/ui/styles/index.css`: Added `--p3-emerald` palette, `.three-player-board`, `.three-player-row`, `.board-storage-col`, `.player-card.p3`, `.disqualified-tag`, and `.pit-external-count.p3-count`.
- **Tests**:
  - `tests/engine/threePlayerRules.test.ts`: Complete test suite with 26 tests including all 16 mandatory regression cases (T01–T16), seed conservation, circular traversal, continuous sowing, capture, and bonus.
  - `tests/ui/multiplayerSelect.test.tsx`: Updated for 3-player active launch and 4–6 player WIP handling.
  - `tests/e2e/game.spec.ts`: Added E2E Scenario 4b for 3-player local multiplayer launch.

### 27.3 Verification & Test Results
1. **Numerical Regression Tests (T01–T16)**:
   - T01 (22, 28, 25): G1–G4 open, G5 closed, storage (2, 8, 5) -> PASSED
   - T02 (35, 23, 17): G1–G3 open, G4–G5 closed, storage (20, 8, 2) -> PASSED
   - T03 (54, 6, 15): G1 open, G2–G5 closed, storage (49, 1, 10) -> PASSED
   - T04 (2, 29, 44): P1 disqualified, P2/P3 restarted with 25 seeds each (50 total, 0 storage) -> PASSED
   - T05 (39, 4, 32): P2 disqualified, P1/P3 restarted with 25 seeds each (50 total, 0 storage) -> PASSED
   - T06 (2, 29, 44): P1 disqualified, recovery restart verified -> PASSED
   - T07 (0, 32, 43): P1 disqualified, recovery restart verified -> PASSED
   - T08 (4, 21, 50): P1 disqualified, recovery restart verified -> PASSED
   - T09 (24, 26, P3 Disq): G1–G4 open, G5 closed -> PASSED
   - T10 (44, 6, P3 Disq): G1 open, G2–G5 closed -> PASSED
   - T11 (49, 1, P3 Disq): P2 disqualified, P1 wins match -> PASSED
   - T12 (9, 41, P2 Disq): G1 open, G2–G5 closed -> PASSED
   - T13 (43, 7, P2 Disq): G1 open, G2–G5 closed -> PASSED
   - T14 (16, 34, P2 Disq): G1–G3 open, G4–G5 closed -> PASSED
   - T15 (4, 46, P2 Disq): P1 disqualified, P3 wins match -> PASSED
   - T16 (42, 8, P1 Disq): G1 open, G2–G5 closed -> PASSED
2. **Full Project Unit & Integration Tests (Vitest)**:
   - 53 test files passed, 392/392 tests passed (100% pass rate, 0 failed, 0 skipped).
3. **Playwright Browser E2E Tests**:
   - 23 browser tests passed across Chromium (100% pass rate, 0 failed, 0 skipped, 43.4s runtime).
4. **TypeScript & Static Analysis**:
   - `npm run typecheck` (`tsc --noEmit`): Passed with 0 errors.
5. **Production Build**:
   - `npm run build`: Compiled production bundle cleanly in 3.74s (`dist/index.html` generated).

---

## 28. GAME MODE STATE ISOLATION, PERFECT BOARD ALIGNMENT & REFERENCE 3-PLAYER REPRESENTATION

### 28.1 Root Causes Found

1. **Issue 1 (State Leakage into AI Mode)**:
   - In `src/ui/hooks/useChannemaneGame.ts`, `restartMatch` defaulted `chosenPlayerCount` to `playerCount` state from the previous match whenever `newPlayerCount` was not passed. Switching to AI mode from 3-player local mode thus retained `playerCount = 3`.
   - In `src/engine/board.ts` (`createInitialGame`) and `src/engine/simulation.ts` (`ChannemaneGame`), the engine lacked an unconditional invariant enforcing `effectivePlayerCount = 2` whenever `gameMode === "ai"`.
   - In `src/App.tsx`, `handleSelectFirstPlayer`, `handleReturnToMenu`, and `handleBackToMenuFromComingSoon` did not specify explicit `playerCount = 2`.

2. **Issue 2 (Pit Spacing Asymmetry)**:
   - `Pit.tsx` rendered Player 1 external seed counts *above* the pit button, but Player 2 and 3 counts *below* the pit button. This shifted Row 1's pit center vertically relative to Rows 2 and 3.
   - `GameBoard.tsx` inserted non-grid `<div className="row-label">` elements between Row 1, Row 2, and Row 3, breaking vertical CSS Grid alignment.
   - Pit widths previously relied on `clamp()` values with flex shrink inside separate row containers rather than fixed shared CSS variables on a single unified CSS Grid.

3. **Issue 3 (Reference 3-Player Board Representation)**:
   - The previous board placed Player 1 & 3 in a stacked column on the left and Player 2 on the right.
   - The user reference diagram required:
     ```text
     -----                    -----   -----
     |      | O O O O O |      |  |      |
     |      | O O O O O |      |  |      |
     |      | O O O O O |      |  |      |
     -----                    -----   -----
     P1S                      P2S    P3S
     ```
     Left: Player 1 Storage (`P1S`), Center: 3x5 Pits Grid, Right: Player 2 Storage (`P2S`) and Player 3 Storage (`P3S`) side-by-side.

### 28.2 Fixes Implemented

1. **Engine-Level & Hook-Level Game Mode Isolation**:
   - `src/engine/board.ts`: In `createInitialGame`, enforced `const effectivePlayerCount: 2 | 3 = gameMode === "ai" ? 2 : playerCount;`.
   - `src/engine/simulation.ts`: In `ChannemaneGame` constructor and `setGameMode`, enforced `playerCount = 2` whenever `gameMode === "ai"`.
   - `src/ui/hooks/useChannemaneGame.ts`:
     - In `setGameMode("ai")`: explicitly called `setPlayerCount(2)`.
     - In `restartMatch`: enforced `const chosenPlayerCount: 2 | 3 = chosenMode === "ai" ? 2 : (newPlayerCount ?? (mode ? 2 : playerCount));`.
     - In unmount cleanup: added `expertAIClient.cancelPendingSearch()` to terminate any in-flight Web Worker or search task.
   - `src/App.tsx`: Explicitly passed `playerCount = 2` to `restartMatch` on AI mode launch and main menu returns. Passed `playerCount={gameState.playerCount ?? 2}` to `<Header>`.
   - `src/ui/components/Header.tsx`: Added `playerCount?: 2 | 3` prop, displaying `👥 LOCAL 3P` when `playerCount === 3` and `👥 LOCAL 2P` when `playerCount === 2`.

2. **Mathematically Uniform Grid & Spacing**:
   - `src/ui/components/Pit.tsx`: Added optional `countPosition?: "above" | "below"` prop.
   - In 3-player mode, all 15 pits specify `countPosition="below"`, ensuring every cell has the pit button first and external count below, yielding identical relative vertical centers across all rows.
   - In `src/ui/styles/index.css`: Defined unified CSS variables:
     ```css
     --p3-pit-size: 72px;
     --p3-pit-cell-width: 72px;
     --p3-pit-cell-height: 100px;
     --p3-col-gap: 16px;
     --p3-row-gap: 16px;
     --p3-storage-width: 96px;
     --p3-storage-height: 332px;
     ```
     - Horizontal center-to-center distance: $72\text{px} + 16\text{px} = 88\text{px}$ identically across all 5 columns ($0.0\text{px}$ deviation).
     - Vertical center-to-center distance: $100\text{px} + 16\text{px} = 116\text{px}$ identically across all 3 rows ($0.0\text{px}$ deviation).
     - Pits remain perfectly circular (`aspect-ratio: 1 / 1; border-radius: 50%`).
     - Responsive breakpoints proportionally scale CSS variables at `900px` and `680px` without distorting grid uniformity.

3. **Specified 3-Player Board Representation**:
   - `src/ui/components/GameBoard.tsx`:
     - Left container (`.three-player-storage-left`): Contains `StorageBowl` for Player 1 (`P1S`).
     - Center container (`.three-player-pits-grid`): A unified 3x5 CSS Grid containing all 15 pits in order (`Row 1: [0..4]`, `Row 2: [9..5]`, `Row 3: [10..14]`).
     - Right container (`.three-player-storage-right`): A horizontal flex row containing `StorageBowl` for Player 2 (`P2S`) and Player 3 (`P3S`) side-by-side with `gap: 12px`.
   - Preserved all logical pit ownerships (P0–P4: Player 1, P5–P9: Player 2, P10–P14: Player 3), pair-wise groups G1–G5, clockwise continuous sowing, captures, bonuses, settlement, and disqualification mechanics.

### 28.3 Regression & Acceptance Test Results

1. **Automated Unit & Integration Mode Switching Suite** (`tests/ui/gameModeSwitching.test.tsx`):
   - **Test A**: Start 3P -> 15 pits & 3 storages verified -> return to menu -> start AI mode -> standard 2-player board (14 pits, 2 storages, 2 participants) verified. -> PASSED
   - **Test B**: Start AI mode first -> standard 2-player board verified -> exit to menu -> start 3P mode -> 15-pit board & 3 storages verified. -> PASSED
   - **Test C**: Repeated cycling (3P -> Menu -> AI -> Menu -> 3P) verified clean state preservation. -> PASSED
   - **Test D**: In-flight turn and animations cleanly cleared on mode switch; no stale state in newly started game. -> PASSED

2. **Playwright Browser E2E Bounding-Box Measurements** (`tests/e2e/game.spec.ts`):
   - **Scenario 8**:
     - Rendered pit dimensions: every pit has $W = H \pm 1\text{px}$ (circular).
     - Dimension uniformity: all 15 pits have identical width and height within $\le 1\text{px}$.
     - Horizontal center-to-center distances: $X_{c+1} - X_c$ is uniform within $\le 1\text{px}$.
     - Column vertical alignment: $X_{center}$ aligns across rows within $\le 1\text{px}$.
     - Vertical row-to-row distances: $Y_{r+1} - Y_r$ is uniform within $\le 1\text{px}$.
     - Storage layout: P1S is to the left of the grid, P2S and P3S are to the right side-by-side ($X_{P3S} > X_{P2S} > X_{Pit4}$). -> PASSED
   - **Scenario 9**: Mode switching cycle in real browser verified without state leakage. -> PASSED

3. **Full Suite Execution**:
   - `npx vitest run`: 54 test files passed, 396/396 tests passed (100% pass rate).
   - `npx playwright test`: 25/25 browser tests passed across Chromium (100% pass rate).
   - `npm run typecheck`: 0 TypeScript errors.
   - `npm run build`: Production bundle compiled cleanly in 3.41s.


## 29. 3-Player Board UI Polish & 2-Player Reference Parity

### 29.1 Root Causes of Previous Visual Inconsistencies
1. **Pit Dimensions Discrepancy**: The 3-player board artificially clamped pits to a fixed 72px diameter, while the authoritative 2-player board pits rendered at `clamp(54px, 7.2vw, 92px)` (~92px on desktop).
2. **Column Gaps Discrepancy**: The 3-player grid used `column-gap: 16px`, whereas the 2-player board spacing system strictly uses `12px`.
3. **Storage Bowl Distortion**: The 3-player board overrode `.storage-bowl` height to `332px` and reservoir to `80px × 180px`, distorting the natural proportions compared to the 2-player storage (`104px × 230px`, reservoir `90px × 140px`, border radius `36px`).
4. **Outer Board Padding & Gaps**: The 3-player board used `padding: 24px; gap: 20px;`, differing from the 2-player board's `padding: 16px 20px; gap: 16px;`.

### 29.2 Unified Design Tokens & Implementation
1. **Root Design Tokens (`src/ui/styles/index.css`)**:
   ```css
   --pit-size: clamp(54px, 7.2vw, 92px);
   --pit-col-gap: 12px;
   --pit-row-gap: 16px;
   --pit-cell-height: calc(var(--pit-size) + 28px);
   --storage-width: 104px;
   --storage-height: 230px;
   ```
2. **Standardized 3-Player Grid & Pit Rules**:
   - Both 2-player and 3-player pits now reference `--pit-size` directly.
   - Horizontal column gap unified to `12px` (`--pit-col-gap`).
   - Vertical row gap unified to `16px` (`--pit-row-gap`).
   - Outer board padding standardized to `16px 20px` and gap to `16px`.
3. **Storage Proportions & Symmetry**:
   - Removed artificial 332px height and 80px/180px reservoir overrides on `.three-player-board .storage-bowl`.
   - All 3 storage bowls (Player 1 on Left, Player 2 & 3 on Right) inherit the exact canonical 2-player storage bowl styling (`104px × 230px`, reservoir `90px × 140px`, border radius `36px`, padding `10px 6px`).
   - Vertically centered alongside the 3x5 pit grid.
4. **Responsive Scaling System**:
   - `max-width: 900px`: Proportionally scales pit size to `clamp(48px, 6vw, 70px)`, gap to `10px`, and storage bowl to `88px × 195px` (maintaining ~0.45 aspect ratio).
   - `max-width: 680px`: Scales pit size to `clamp(38px, 5.5vw, 48px)`, gap to `6px`, and storage bowl to `68px × 160px`.
   - Mobile landscape (`max-height: 600px`): Scales pit size to `clamp(40px, 6.5vw, 68px)`, gap to `8px`, and storage bowl to `88px × 180px`, identically to 2-player board.

### 29.3 Verification & Quality Assurance
1. **Playwright Browser E2E Bounding-Box Measurements**:
   - All 15 pits circular ($|W - H| \le 1\text{px}$).
   - Equal pit dimensions across all 15 pits ($\le 1\text{px}$).
   - Equal horizontal center-to-center distances across rows ($\le 1\text{px}$).
   - Column vertical center alignment across rows ($\le 1\text{px}$).
   - Vertical row-to-row distances uniform ($\le 1\text{px}$).
   - 25/25 Playwright tests passed.
2. **Vitest Unit & Integration Suite**:
   - 54 test files passed, 396/396 tests passed.
3. **TypeScript Typecheck & Build**:
   - `tsc --noEmit`: 0 errors.
   - `vite build`: Production bundle compiled cleanly in 2.38s.










