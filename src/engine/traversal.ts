/**
 * Authoritative Board Traversal Logic
 * Strictly follows Phase 1 Specification (Sections 14, 20, 21, 26)
 */

import { TOTAL_PITS, isValidPitId } from "./constants";
import type { Pit } from "./types";

/**
 * Finds the next OPEN pit in counter-clockwise order (Section 21).
 *
 * Rules:
 * 1. Moves counter-clockwise: (currentPitId + 1) % 14.
 * 2. Wraps around from P13 -> P0.
 * 3. Skips any pits where status === "CLOSED".
 * 4. Returns the next pit ID where status === "OPEN".
 * 5. Avoids infinite loops if no pits are open (returns null).
 *
 * @param currentPitId The starting pit ID.
 * @param pits The current pit list.
 * @returns The next open pit ID or null if none found.
 */
export function getNextOpenPit(
  currentPitId: number,
  pits: readonly Pit[]
): number | null {
  if (!isValidPitId(currentPitId) || pits.length !== TOTAL_PITS) {
    return null;
  }

  // Iterate up to TOTAL_PITS steps ahead to find the next open pit
  for (let offset = 1; offset <= TOTAL_PITS; offset++) {
    const candidateId = (currentPitId + offset) % TOTAL_PITS;
    const pit = pits[candidateId];
    if (pit && pit.status === "OPEN") {
      return candidateId;
    }
  }

  // No open pits exist
  return null;
}

/**
 * Finds the OPEN pit that follows the next open pit (2 open steps ahead).
 * Essential for Section 26 capture inspection:
 * "Find the next OPEN pit. If it is empty: Inspect the following OPEN pit."
 *
 * @param currentPitId The destination pit ID where sowing ended.
 * @param pits The current pit list.
 * @returns The following open pit ID, or null if traversal cannot resolve 2 steps.
 */
export function getFollowingOpenPit(
  currentPitId: number,
  pits: readonly Pit[]
): number | null {
  const nextOpen = getNextOpenPit(currentPitId, pits);
  if (nextOpen === null) {
    return null;
  }
  return getNextOpenPit(nextOpen, pits);
}
