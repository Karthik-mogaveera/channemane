/**
 * Capture Animation Module
 * Animates captured seed beads lifting from the captured pit and flowing into player storage.
 */

import gsap from "gsap";
import type { Player } from "../../engine/types";
import {
  getPitWorldPosition,
  getStorageWorldPosition,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";

export class CaptureAnimation {
  public static animateCaptureToStorage(
    sourcePitId: number,
    targetPlayer: Player,
    seedsCount: number,
    durationSec: number,
    onProgress: (positions: Array<[number, number, number]>, arrivedRatio?: number) => void,
    onComplete: () => void,
    playerCount: SupportedPlayerCount = 2
  ): gsap.core.Timeline {
    const [fromX, fromY, fromZ] = getPitWorldPosition(sourcePitId, playerCount);
    const [toX, toY, toZ] = getStorageWorldPosition(targetPlayer, playerCount);
    const visibleSeeds = Math.max(1, Math.min(seedsCount, 10));

    const tl = gsap.timeline({ onComplete });
    const animObj = { t: 0 };

    tl.to(animObj, {
      t: 1,
      duration: Math.max(0.08, durationSec),
      ease: "power2.inOut",
      onUpdate: () => {
        const t = animObj.t;
        const positions: Array<[number, number, number]> = [];
        let landed = 0;

        for (let i = 0; i < visibleSeeds; i++) {
          const stagger = i * 0.04;
          const span = Math.max(0.25, 1 - stagger);
          const localT = Math.max(0, Math.min(1, (t - stagger) / span));
          if (localT >= 0.995) {
            landed += 1;
            continue;
          }

          const spreadX = ((i % 3) - 1) * 0.14 * Math.sin(localT * Math.PI);
          const spreadZ = (Math.floor(i / 3) - 1) * 0.12 * Math.sin(localT * Math.PI);
          const x = fromX + (toX - fromX) * localT + spreadX;
          const z = fromZ + (toZ - fromZ) * localT + spreadZ;
          const arc = Math.sin(localT * Math.PI) * 1.65;
          const y = (fromY - 0.18) + (toY - 0.28 - (fromY - 0.18)) * localT + arc;

          positions.push([x, y, z]);
        }

        onProgress(positions, landed / visibleSeeds);
      },
    });

    return tl;
  }
}
