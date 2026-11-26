/**
 * Sowing Animation Module
 * Uses GSAP to animate seed beads travelling along a 3D parabolic arc from source to destination.
 */

import gsap from "gsap";
import {
  getPitWorldPosition,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";

export interface FlyingSeed {
  id: string;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  currentPos: [number, number, number];
  progress: number;
}

export class SowingAnimation {
  /**
   * Animates a seed along a natural 3D parabolic arc between explicit world coordinates or pit IDs.
   */
  public static animateSeedArc(
    fromPos: [number, number, number],
    toPos: [number, number, number],
    durationSec: number,
    arcHeight: number,
    onProgress: (pos: [number, number, number], rot: [number, number, number]) => void,
    onComplete: () => void,
    ease = "power1.out"
  ): gsap.core.Tween {
    const [fromX, fromY, fromZ] = fromPos;
    const [toX, toY, toZ] = toPos;
    const animObj = { t: 0 };

    return gsap.to(animObj, {
      t: 1,
      duration: Math.max(0.05, durationSec),
      ease,
      onUpdate: () => {
        const t = animObj.t;
        const x = fromX + (toX - fromX) * t;
        const z = fromZ + (toZ - fromZ) * t;
        const baseY = fromY + (toY - fromY) * t;
        const arc = Math.sin(t * Math.PI) * arcHeight;
        const y = baseY + arc;

        const rotX = t * Math.PI * 1.6;
        const rotY = t * Math.PI * 1.25;
        const rotZ = Math.sin(t * Math.PI) * 0.42;

        onProgress([x, y, z], [rotX, rotY, rotZ]);
      },
      onComplete,
    });
  }

  /**
   * Animates a sowing seed drop between two pits (preserves original API with multi-player support).
   */
  public static animateSeedDrop(
    fromPitId: number,
    toPitId: number,
    durationSec: number,
    arcHeight: number,
    onProgress: (pos: [number, number, number], rot: [number, number, number]) => void,
    onComplete: () => void,
    playerCount: SupportedPlayerCount = 2
  ): gsap.core.Tween {
    const fromPos = getPitWorldPosition(fromPitId, playerCount);
    const toPos = getPitWorldPosition(toPitId, playerCount);
    return SowingAnimation.animateSeedArc(
      fromPos,
      toPos,
      durationSec,
      arcHeight,
      onProgress,
      onComplete
    );
  }
}
