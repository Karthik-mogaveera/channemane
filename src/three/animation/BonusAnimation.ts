/**
 * Bonus Claim Animation Module
 * Animates 4 bonus seeds transferring from the bonus pit to the pit owner's storage.
 */

import gsap from "gsap";
import type { Player } from "../../engine/types";
import {
  getPitWorldPosition,
  getStorageWorldPosition,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";

export class BonusAnimation {
  public static animateBonusClaim(
    sourcePitId: number,
    owner: Player,
    durationSec: number,
    onProgress: (positions: Array<[number, number, number]>, arrivedCount?: number) => void,
    onComplete: () => void,
    playerCount: SupportedPlayerCount = 2
  ): gsap.core.Timeline {
    const [fromX, fromY, fromZ] = getPitWorldPosition(sourcePitId, playerCount);
    const [toX, toY, toZ] = getStorageWorldPosition(owner, playerCount);

    const tl = gsap.timeline({ onComplete });
    const animObj = { t: 0 };

    tl.to(animObj, {
      t: 1,
      duration: Math.max(0.08, durationSec),
      ease: "power2.out",
      onUpdate: () => {
        const t = animObj.t;
        const positions: Array<[number, number, number]> = [];
        let landed = 0;

        for (let i = 0; i < 4; i++) {
          const stagger = i * 0.055;
          const span = Math.max(0.3, 1 - stagger);
          const localT = Math.max(0, Math.min(1, (t - stagger) / span));
          if (localT >= 0.995) {
            landed += 1;
            continue;
          }

          const angle = (i / 4) * Math.PI * 2;
          const spreadR = 0.22 * Math.sin(localT * Math.PI);
          const x = fromX + (toX - fromX) * localT + Math.cos(angle) * spreadR;
          const z = fromZ + (toZ - fromZ) * localT + Math.sin(angle) * spreadR;
          const arc = Math.sin(localT * Math.PI) * 1.55;
          const y = (fromY - 0.18) + (toY - 0.26 - (fromY - 0.18)) * localT + arc;

          positions.push([x, y, z]);
        }

        onProgress(positions, landed);
      },
    });

    return tl;
  }
}
