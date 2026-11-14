/**
 * Rules Modal Component — Player-Friendly Channemane Rules for All Game Modes
 *
 * Provides clear, everyday English explanations of Channemane for all 5 game modes
 * (2, 3, 4, 5, and 6 Players) without developer jargon or mathematical formulas.
 *
 * Contains nine authoritative player-facing sections:
 * 1. The Game Board
 * 2. How to Play Your Turn
 * 3. Continue Sowing
 * 4. Capturing Seeds
 * 5. The Special 4-Seed Bonus
 * 6. When Does a Round End?
 * 7. Opening Pits for the Next Round
 * 8. Player Elimination
 * 9. How to Win
 */

import React, { useState, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

export type RulesPlayerCount = 2 | 3 | 4 | 5 | 6;

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlayerCount?: RulesPlayerCount;
}

interface ModeConfig {
  name: string;
  players: number;
  pits: number;
  seedsPerPit: number;
  totalSeeds: number;
  storageCount: number;
  boardDescription: string;
  ownership: string[];
  reopening: string;
  elimination: string;
  winCondition: string;
}

const MODE_CONFIGS: Record<RulesPlayerCount, ModeConfig> = {
  2: {
    name: "2 Players",
    players: 2,
    pits: 14,
    seedsPerPit: 5,
    totalSeeds: 70,
    storageCount: 2,
    boardDescription:
      "The board features 14 circular pits arranged in two parallel rows of 7, with a storage bowl on each side.",
    ownership: [
      "Player 1 (Red) controls the entire top row of 7 pits.",
      "Player 2 (Blue) controls the entire bottom row of 7 pits.",
      "Player 1's storage bowl is on the left; Player 2's storage bowl is on the right.",
    ],
    reopening:
      "Pits reopen in opposite matching pairs (up to 7 pairs). Each reopened pit costs 5 seeds from storage. Both players must contribute 5 seeds for a pair to open. If either player cannot fund a pair, that pair and all later pairs remain locked.",
    elimination:
      "If a player finishes a round with fewer than 5 seeds in storage, they cannot open even a single pair of pits. That player is eliminated, and their opponent wins the match immediately.",
    winCondition:
      "The match ends when a player cannot open any pits (< 5 seeds in storage). The other player is crowned the Winner!",
  },
  3: {
    name: "3 Players",
    players: 3,
    pits: 15,
    seedsPerPit: 5,
    totalSeeds: 75,
    storageCount: 3,
    boardDescription:
      "The board features 15 circular pits arranged in three horizontal rows of 5 pits each, flanked by 3 player storage bowls.",
    ownership: [
      "Player 1 (Red) owns the top row of 5 pits.",
      "Player 2 (Blue) owns the middle row of 5 pits.",
      "Player 3 (Green) owns the bottom row of 5 pits.",
      "Each player has their own storage bowl positioned beside their row.",
    ],
    reopening:
      "Pits are reopened in 5 coordinated groups across all active players. Each group opens only if all active players have at least 5 seeds in storage. If any group cannot be funded, that group and all subsequent groups remain closed for the round.",
    elimination:
      "Any player with fewer than 5 seeds in storage at round settlement is eliminated. When the first player is eliminated, 25 seeds are removed and the 2 remaining players enter recovery mode with 50 seeds. When a second player is eliminated, the last surviving player wins.",
    winCondition:
      "1st Place goes to the last surviving player. 2nd Place goes to the player eliminated last. 3rd Place goes to the player eliminated first.",
  },
  4: {
    name: "4 Players",
    players: 4,
    pits: 16,
    seedsPerPit: 5,
    totalSeeds: 80,
    storageCount: 4,
    boardDescription:
      "The board features 16 circular pits arranged in a rectangular grid of two rows of 8 pits, divided into four quadrants of 4 pits each.",
    ownership: [
      "Player 1 (Red) and Player 2 (Blue) share the top row (4 pits each).",
      "Player 4 (Amber) and Player 3 (Green) share the bottom row (4 pits each).",
      "Each player has an individual storage bowl aligned directly with their 4 pits.",
    ],
    reopening:
      "Pits are reopened in 4 coordinated groups. A group opens only if every represented active player can contribute 5 seeds. If any group cannot be funded, that group and all later groups remain closed for the next round.",
    elimination:
      "Any active player with fewer than 5 storage seeds is eliminated permanently. Each elimination permanently removes 20 seeds (their 4 pits). Surviving players begin the next round with 20 seeds each (5 in each of their 4 pits). Play continues until one player remains.",
    winCondition:
      "1st Place is awarded to the sole surviving player. 2nd Place goes to the runner-up (eliminated last). 3rd Place and 4th Place are ranked by reverse elimination order.",
  },
  5: {
    name: "5 Players",
    players: 5,
    pits: 20,
    seedsPerPit: 5,
    totalSeeds: 100,
    storageCount: 5,
    boardDescription:
      "The board features 20 circular pits arranged in three horizontal rows, with 5 player storage bowls.",
    ownership: [
      "Player 1 (Red) and Player 2 (Blue) own 4 pits each on the top row.",
      "Player 3 (Green) owns 4 pits in the middle row, flanked by their storage bowl.",
      "Player 4 (Amber) and Player 5 (Purple) own 4 pits each on the bottom row.",
      "All 5 players have dedicated storage bowls positioned near their pits.",
    ],
    reopening:
      "Pits are reopened in 4 coordinated groups. Each group opens only if every represented active player can contribute 5 seeds. Any unfunded group and all subsequent groups stay locked for the entire next round.",
    elimination:
      "Any active player with fewer than 5 storage seeds is eliminated permanently. Each elimination permanently removes 20 seeds (100 → 80 → 60 → 40). Remaining active players receive 20 seeds each for the next round. Rounds continue until only one player survives.",
    winCondition:
      "1st Place is awarded to the last surviving player. 2nd Place goes to the player eliminated last. 3rd, 4th, and 5th Places follow reverse elimination order.",
  },
  6: {
    name: "6 Players",
    players: 6,
    pits: 24,
    seedsPerPit: 5,
    totalSeeds: 120,
    storageCount: 6,
    boardDescription:
      "The board features 24 circular pits arranged in three horizontal rows of 8 pits, with 6 individual storage bowls.",
    ownership: [
      "Player 1 (Red) and Player 2 (Blue) own 4 pits each on the top row.",
      "Player 4 (Amber) and Player 3 (Green) own 4 pits each in the middle row.",
      "Player 5 (Purple) and Player 6 (Teal) own 4 pits each on the bottom row.",
      "Storage bowls are placed at the top (Players 1 & 2), the left and right flanks (Players 4 & 3), and the bottom (Players 5 & 6).",
    ],
    reopening:
      "Pits are reopened in 4 coordinated groups across active players. A group opens only if all active represented players have at least 5 seeds in storage. If any group cannot be funded, that group and all following groups remain locked.",
    elimination:
      "Any active player with fewer than 5 storage seeds is eliminated permanently. Each elimination permanently removes 20 seeds (120 → 100 → 80 → 60 → 40). Remaining active players receive 20 seeds each to reopen their pits. Rounds continue until only one player survives.",
    winCondition:
      "1st Place: Sole surviving winner. 2nd Place: Player eliminated last. 3rd Place: Player eliminated 2nd-last. 4th, 5th, and 6th Places follow reverse elimination order.",
  },
};

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  activePlayerCount,
}) => {
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<RulesPlayerCount>(
    activePlayerCount ?? 2
  );

  useEffect(() => {
    if (isOpen && activePlayerCount) {
      setSelectedPlayerCount(activePlayerCount);
    }
  }, [isOpen, activePlayerCount]);

  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const currentConfig = MODE_CONFIGS[selectedPlayerCount];

  return (
    <div
      ref={modalRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-dialog-title"
      data-testid="rules-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-content rules-modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="rules-header-title-block">
            <h2 id="rules-dialog-title" className="modal-title">
              How to Play Channemane
            </h2>
            <span className="rules-header-badge" data-testid="rules-active-mode-badge">
              Viewing: {currentConfig.name}
            </span>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close rules dialog"
            data-testid="close-rules-btn"
          >
            ×
          </button>
        </div>

        {/* Player Count Selector Tabs (Section 8) */}
        <div
          className="rules-mode-tabs"
          role="tablist"
          aria-label="Select Player Count to View Specific Rules"
          data-testid="rules-mode-selector"
        >
          {([2, 3, 4, 5, 6] as const).map((count) => {
            const isSelected = selectedPlayerCount === count;
            return (
              <button
                key={count}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`rules-mode-tab ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedPlayerCount(count)}
                data-testid={`rules-mode-tab-${count}`}
              >
                {count} Players
              </button>
            );
          })}
        </div>

        {/* Scrollable Rules Body with 9 Sections */}
        <div className="modal-body rules-modal-body" data-testid="rules-modal-body">
          {/* Section 1: The Game Board */}
          <section className="rules-section" data-testid="rules-section-1">
            <h3 className="rules-section-title">1. The Game Board</h3>
            <p>
              Channemane is played on a traditional board carved with circular hollow cups called{" "}
              <strong>pits</strong> and larger reservoir basins called <strong>storage bowls</strong> where
              players store their captured seeds.
            </p>

            {/* Starting Configuration Card */}
            <div className="rules-visual-card" data-testid="rules-board-config-card">
              <div className="rules-config-grid">
                <div className="rules-config-item">
                  <span className="rules-config-label">Players</span>
                  <span className="rules-config-value" data-testid="rules-cfg-players">{currentConfig.players}</span>
                </div>
                <div className="rules-config-item">
                  <span className="rules-config-label">Total Pits</span>
                  <span className="rules-config-value" data-testid="rules-cfg-pits">{currentConfig.pits}</span>
                </div>
                <div className="rules-config-item">
                  <span className="rules-config-label">Seeds per Pit</span>
                  <span className="rules-config-value">{currentConfig.seedsPerPit}</span>
                </div>
                <div className="rules-config-item">
                  <span className="rules-config-label">Total Seeds</span>
                  <span className="rules-config-value" data-testid="rules-cfg-seeds">{currentConfig.totalSeeds}</span>
                </div>
                <div className="rules-config-item">
                  <span className="rules-config-label">Storage Bowls</span>
                  <span className="rules-config-value" data-testid="rules-cfg-storages">{currentConfig.storageCount}</span>
                </div>
              </div>
            </div>

            <p>{currentConfig.boardDescription}</p>

            <div className="rules-ownership-list">
              <strong>Pit Ownership for {currentConfig.name}:</strong>
              <ul>
                {currentConfig.ownership.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 2: How to Play Your Turn */}
          <section className="rules-section" data-testid="rules-section-2">
            <h3 className="rules-section-title">2. How to Play Your Turn</h3>
            <p>
              Players take turns one after another in order around the board. On your turn:
            </p>
            <ol className="rules-steps-list">
              <li>
                <strong>Choose an Open Pit:</strong> Select any open pit on your own side of the board that
                contains at least one seed.
              </li>
              <li>
                <strong>Pick Up All Seeds:</strong> Pick up all seeds from that chosen pit, leaving it empty.
              </li>
              <li>
                <strong>Sow One by One:</strong> Move in the indicated direction around the board and drop{" "}
                <strong>exactly one seed into each open pit</strong> you pass.
              </li>
              <li>
                <strong>Skip Closed Pits:</strong> Any pit that is closed or locked receives no seeds and is
                completely skipped.
              </li>
            </ol>

            <div className="rules-illustration-box">
              <div className="rules-step-flow">
                <span className="step-pill">1. Pick Up All Seeds</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill">2. Drop 1 Seed per Pit</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill">3. Check Landing Pit</span>
              </div>
            </div>
          </section>

          {/* Section 3: Continue Sowing */}
          <section className="rules-section" data-testid="rules-section-3">
            <h3 className="rules-section-title">3. Continue Sowing</h3>
            <p>
              Your turn does not end when your hand becomes empty if your last seed lands in a pit that already
              contains seeds!
            </p>
            <ul>
              <li>
                If you drop your final seed into an open pit that <strong>already has seeds</strong>, you
                immediately scoop up all seeds from that pit (including the one you just dropped).
              </li>
              <li>
                Continue sowing those seeds one by one in the same direction.
              </li>
              <li>
                You keep chaining continuous moves as long as your last seed lands in a pit containing seeds.
              </li>
            </ul>

            <div className="rules-illustration-box">
              <div className="rules-step-flow">
                <span className="step-pill highlight">Last seed lands in occupied pit</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill highlight">Scoop up all seeds</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill success">Keep Sowing!</span>
              </div>
            </div>
          </section>

          {/* Section 4: Capturing Seeds */}
          <section className="rules-section" data-testid="rules-section-4">
            <h3 className="rules-section-title">4. Capturing Seeds</h3>
            <p>
              Sowing stops when the last seed in your hand is dropped into an open pit and you cannot continue.
              When sowing stops, check for a capture:
            </p>
            <ul>
              <li>
                Look at the <strong>very next open pit</strong> immediately ahead of where your last seed
                landed.
              </li>
              <li>
                If that next open pit contains seeds, your turn ends with <strong>no capture</strong>.
              </li>
              <li>
                If that next open pit is <strong>empty</strong>, look at the <strong>following open pit</strong>{" "}
                (two open pits ahead of your landing pit):
                <ul>
                  <li>
                    If that second pit contains seeds: <strong>Capture!</strong> Pick up all seeds from that pit
                    and transfer them straight into your storage bowl.
                  </li>
                  <li>
                    If that second pit is also empty, no seeds are captured.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Key Capture Rules:</strong> Seeds can be captured from any player&apos;s pits. At most one pit
                can be captured per turn. Closed pits are completely skipped when counting the two steps.
              </li>
            </ul>

            <div className="rules-illustration-box">
              <div className="rules-step-flow">
                <span className="step-pill">Landing Pit</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill warning">Next Pit: Empty</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill success">Following Pit: Capture All Seeds! 🏆</span>
              </div>
            </div>
          </section>

          {/* Section 5: The Special 4-Seed Bonus */}
          <section className="rules-section" data-testid="rules-section-5">
            <h3 className="rules-section-title">5. The Special 4-Seed Bonus</h3>
            <p>
              A special bonus is triggered whenever dropping seeds causes any pit to reach{" "}
              <strong>exactly 4 seeds</strong> (changing from 3 seeds to 4).
            </p>
            <ul>
              <li>
                <strong>Pit Owner Claims:</strong> The bonus unconditionally belongs to the player who owns that
                pit, even if another player dropped the seed on their turn.
              </li>
              <li>
                <strong>Immediate Reward:</strong> The owner can click <strong>Claim Bonus</strong> to
                transfer all 4 seeds directly into their storage bowl.
              </li>
              <li>
                <strong>Time-Sensitive:</strong> If another seed is dropped into that pit before the bonus is
                claimed (raising the count to 5 seeds), the bonus opportunity is lost and the seeds remain in play.
              </li>
            </ul>

            <div className="rules-illustration-box">
              <div className="rules-step-flow">
                <span className="step-pill">Pit has 3 seeds</span>
                <span className="step-arrow">+1 seed ➔</span>
                <span className="step-pill highlight">Exactly 4 Seeds!</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill success">Owner Taps Claim (+4 Seeds) ✨</span>
              </div>
            </div>
          </section>

          {/* Section 6: When Does a Round End? */}
          <section className="rules-section" data-testid="rules-section-6">
            <h3 className="rules-section-title">6. When Does a Round End?</h3>
            <p>
              A round continues until there are no longer enough active seeds in circulation to continue meaningful play:
            </p>
            <ul>
              <li>When fewer than 4 total seeds remain across all open pits on the entire board.</li>
              <li>Or when an active player has no seeds on their side, and all other active players combined have fewer than 4 seeds.</li>
              <li>Or when no active player has a legal move remaining.</li>
            </ul>
            <p>
              When a round ends, the game automatically transitions to <strong>Round Settlement</strong>.
            </p>
          </section>

          {/* Section 7: Opening Pits for the Next Round */}
          <section className="rules-section" data-testid="rules-section-7">
            <h3 className="rules-section-title">7. Opening Pits for the Next Round</h3>
            <p>
              Round Settlement determines which pits will open for the upcoming round:
            </p>
            <ol className="rules-steps-list">
              <li>
                <strong>Sweep Remaining Seeds:</strong> Any seeds still resting in a player&apos;s open pits at the end of
                the round are swept directly into that player&apos;s storage bowl.
              </li>
              <li>
                <strong>Cost to Reopen:</strong> Every pit requires <strong>5 seeds from its owner&apos;s storage</strong>{" "}
                to reopen for the next round.
              </li>
              <li>
                <strong>Coordinated Group Opening:</strong> Pits are not opened individually. They reopen in strict,
                coordinated sets:
                <p className="rules-detail-note">{currentConfig.reopening}</p>
              </li>
              <li>
                <strong>All-or-Nothing by Group:</strong> If a group cannot be funded because one or more players
                do not have 5 seeds in storage, that group and <strong>every subsequent group remain closed</strong>{" "}
                for the entire next round.
              </li>
              <li>
                <strong>Leftover Storage:</strong> Any extra seeds that are not spent to reopen pits remain safely
                in your storage bowl as your bank.
              </li>
            </ol>

            <div className="rules-illustration-box">
              <div className="rules-step-flow">
                <span className="step-pill">1. Sweep Remaining Seeds</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill">2. Pay 5 Seeds per Pit</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill success">3. Open Matched Groups</span>
              </div>
            </div>
          </section>

          {/* Section 8: Player Elimination */}
          <section className="rules-section" data-testid="rules-section-8">
            <h3 className="rules-section-title">8. Player Elimination</h3>
            <p>
              Elimination is an essential part of tournament play across rounds:
            </p>
            <ul>
              <li>
                <strong>Elimination Rule:</strong> Any active player who has <strong>fewer than 5 seeds in storage</strong>{" "}
                during round settlement cannot fund even a single pit. That player is <strong>eliminated permanently</strong>.
              </li>
              <li>
                <strong>Permanent Closure:</strong> An eliminated player&apos;s pits and storage bowl remain locked and
                closed with 0 seeds for the remainder of the match.
              </li>
              <li>
                <strong>Next Round Progression:</strong>
                <p className="rules-detail-note">{currentConfig.elimination}</p>
              </li>
            </ul>

            <div className="rules-illustration-box">
              <div className="rules-step-flow">
                <span className="step-pill warning">Storage &lt; 5 Seeds</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill warning">Player Eliminated</span>
                <span className="step-arrow">➔</span>
                <span className="step-pill success">Remaining Players Continue</span>
              </div>
            </div>
          </section>

          {/* Section 9: How to Win */}
          <section className="rules-section" data-testid="rules-section-9">
            <h3 className="rules-section-title">9. How to Win</h3>
            <p>
              The ultimate goal is to outlast your opponents through strategic sowing, timely captures, and careful seed conservation.
            </p>
            <div className="rules-win-summary">
              <strong>Match Victory for {currentConfig.name}:</strong>
              <p>{currentConfig.winCondition}</p>
            </div>
            <ul>
              <li>
                <strong>First Place:</strong> The last remaining active player who cannot be eliminated.
              </li>
              <li>
                <strong>Rankings by Elimination:</strong> Non-winning players are ranked in reverse order of their
                elimination (the runner-up who was eliminated last receives 2nd Place; earlier eliminated players receive
                lower ranks).
              </li>
              <li>
                <strong>Fair Tie-Breaking:</strong> If multiple players run out of seeds in the exact same round, their
                placement is decided by storage totals at the moment of elimination.
              </li>
            </ul>

            <div className="rules-illustration-box">
              <div className="rules-rank-display">
                <span className="rank-badge gold">🥇 1st Place: Last Surviving Player</span>
                <span className="rank-badge silver">🥈 2nd Place: Runner-Up (Last Eliminated)</span>
                <span className="rank-badge bronze">🥉 3rd Place+: Earlier Eliminations</span>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer rules-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            data-testid="rules-back-btn"
          >
            ← Back to Menu
          </button>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            data-testid="rules-close-btn"
          >
            Got it, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
