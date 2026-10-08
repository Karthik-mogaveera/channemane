# Channemane Core Game Engine

> **Traditional Karnataka Mancala Game Engine**  
> High-performance, strictly-typed, deterministic, headless game engine built in pure TypeScript with zero runtime dependencies.

---

## 1. Overview
Channemane is a traditional board game from Karnataka belonging to the Mancala family. This package provides the authoritative mathematical and logical foundation for the game, completely decoupled from any UI layer, rendering, audio, or network protocols.

It is designed to serve as the foundational game engine for:
- Web applications (React / Next.js / Canvas)
- Mobile applications (Capacitor / Android / iOS)
- AI Player Bots (Heuristic, Minimax, Monte Carlo Tree Search)
- Headless automated testing, simulations, and replay engines

---

## 2. Core Game Rules & Invariants

### Board Layout
- **Total Pits:** Exactly 14 pits.
- **Ownership:**
  - `PLAYER_1`: Pits `0` through `6`
  - `PLAYER_2`: Pits `7` through `13`
- **Total Seeds:** Exactly 70 seeds.
- **Initial Setup (Round 1):** All 14 pits are `OPEN` with 5 seeds each (70 seeds on board, 0 in player storages).

```text
                    PLAYER 1
        P0   P1   P2   P3   P4   P5   P6
        P13  P12  P11  P10  P9   P8   P7
                    PLAYER 2
```

### Opposite Pairs
Paired opposite layout used for paired closure during round setup:
- Pair 0: `[0, 13]`
- Pair 1: `[1, 12]`
- Pair 2: `[2, 11]`
- Pair 3: `[3, 10]`
- Pair 4: `[4, 9]`
- Pair 5: `[5, 8]`
- Pair 6: `[6, 7]`

### Traversal Order
A single authoritative counter-clockwise order:
`P0 → P1 → P2 → ... → P13 → P0`

### Sowing & Continuous Sowing
1. Player selects an `OPEN` pit with $\ge 1$ seeds on their own side.
2. Seeds are distributed one-by-one counter-clockwise into subsequent `OPEN` pits.
3. `CLOSED` pits are always skipped.
4. When the hand is exhausted:
   - If the next `OPEN` pit contains seeds ($\ge 1$): scoop and continue sowing (continuous sowing).
   - If the next `OPEN` pit is empty ($0$ seeds): continuous sowing halts; evaluate capture.

### Positional Capture
1. When continuous sowing ends, inspect the following `OPEN` pit (2 open steps ahead of the final destination).
2. If that following pit contains seeds ($\ge 1$):
   - All seeds in that pit are captured and transferred directly to current player's storage.
   - Positional rule: Can capture from **either player's side**.
   - Single capture rule: Strictly evaluated once per turn (no cascading).
3. If following pit is empty: 0 seeds captured; turn ends.

### Bonus System
1. **Trigger:** Whenever a pit transitions from exactly `3 → 4` seeds during sowing, `bonusAvailable = true`.
2. **Ownership:** Belongs to the **pit owner**, not the current sower.
3. **Manual Claim:** The owner claims the bonus (`seeds === 4 && bonusAvailable === true`), transferring 4 seeds to the owner's storage and setting the pit to 0.
4. **Expiration:** If a 5th seed falls into an unclaimed bonus pit (`4 → 5`), `bonusAvailable` resets to `false` and the bonus expires.

### Turn Passing & Turn vs Round Ending
- **Automatic Pass:** If a player has 0 movable seeds on their side, but the round does not end (opponent has $\ge 4$ seeds), the turn is automatically passed back to the active player.
- **Round-Ending Evaluation:** Evaluated at full turn completion.
  - **Condition 1:** Total seeds remaining on the board $< 4$.
  - **Condition 2:** One player's side $= 0$ AND opponent's side $< 4$.
  - Note: One side $= 0$ while opponent has $\ge 4$ does *not* end the round.

### Round Settlement & Paired Closure
1. Remaining board seeds transfer to their respective side owners.
2. Pits reset to 0 seeds.
3. Player with $> 35$ seeds wins the round (`roundWins++`) and starts the next round.
4. **Paired Closure:** $\text{openPairs} = \min(\lfloor S_1 / 5 \rfloor, \lfloor S_2 / 5 \rfloor, 7)$.
   - Pairs $0$ to $\text{openPairs} - 1$ open with 5 seeds each.
   - Remaining pairs are `CLOSED` with 0 seeds.
   - Closed pits remain closed for the entire round.

### Match Ending
Evaluated after round settlement: If either player has $< 5$ storage ($\text{openPairs} === 0$), that player loses the match.

### Seed Conservation Invariant
$$\sum_{i=0}^{13} \text{pit}[i]\text{.seeds} + \text{player1.storage} + \text{player2.storage} = 70$$
Maintained continuously across all state transitions.

---

## 3. Engine API Quick Start

```typescript
import {
  ChannemaneGame,
  createInitialGame,
  playTurn,
  claimBonus,
  setupNextRound,
  verifySeedConservation,
} from "channemane-engine";

// 1. High-level Controller API
const game = new ChannemaneGame("PLAYER_1");

// Select pit P0
const moveResult = game.selectPit(0);
if (moveResult.success) {
  console.log("Next Player:", game.getCurrentPlayer());
}

// Check state and invariants
const state = game.getState();
console.log("Valid 70 seeds?", verifySeedConservation(state)); // true

// 2. Pure Functional API
const gameState = createInitialGame("PLAYER_1");
const turnResult = playTurn(gameState, 2);
```

---

## 4. Test Suite & Verification
The engine and web UI are verified through a rigorous automated test suite:

```bash
# Typecheck
npm run typecheck

# Run engine & component test suite (116 tests)
npm test

# Run Playwright E2E browser tests (Chromium)
npm run test:e2e

# Run Vite local development server
npm run dev

# Build production engine library & web app
npm run build
```

---

## 5. Web UI Architecture (Phase 3)
The React web interface is built directly on top of the deterministic engine:
- **Single Source of Truth:** Game rules, sowing traversal, continuous loops, bonus conditions, and paired closures are managed exclusively by `src/engine/*`.
- **Decoupled UI Layer:** React components in `src/ui/` render the board, turn indicators, and modals from `ChannemaneGame` state snapshots.
- **Traditional Karnataka Aesthetic:** Rosewood/teak wood grain, brass inlay accents, ivory/tamarind seed clusters, and golden bonus pulsing rings.
- **Cross-Platform Responsive:** Mobile-first layout with min 48px touch targets, scaling seamlessly across mobile, tablet, and desktop viewports.

