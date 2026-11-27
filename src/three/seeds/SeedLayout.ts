/**
 * 3D Seed Placement, Surface Seating & Deterministic Color Distribution
 * Preserves authoritative 2D packing compatibility for high counts while seating organic seeds
 * cleanly against carved walnut pit walls and storage dishes with subtle rotation, scale variation,
 * and deterministic light/dark wood tones.
 */

import * as THREE from "three";
import { BOARD_DIMENSIONS, PIT_COORDINATES } from "../config/boardVisualConfigs";
import { CARVED_BOARD_METRICS } from "../board/boardGeometryUtils";
import { SEED_DIMENSIONS } from "./SeedGeometry";
import type { SeedVariant } from "./SeedMaterials";

export interface Seed3DTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  variant: SeedVariant;
  toneIndex: number;
}

const UP_VEC = new THREE.Vector3(0, 1, 0);
const TMP_NORMAL = new THREE.Vector3();
const TMP_ALIGN = new THREE.Quaternion();
const TMP_YAW = new THREE.Quaternion();
const TMP_TILT = new THREE.Quaternion();
const TMP_AXIS = new THREE.Vector3();
const TMP_FINAL = new THREE.Quaternion();
const TMP_EULER = new THREE.Euler();

/**
 * Deterministic fast hash returning [0, 1).
 */
function seededFraction(a: number, b: number, salt = 0): number {
  let n = ((a + 1) * 73856093) ^ ((b + 1) * 19349663) ^ (salt * 83492791);
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

/**
 * Exact carved ellipsoidal bowl elevation Y at radial offset r inside any pit.
 */
function getCarvedPitBowlY(r: number): number {
  const { topY, pitLipRadius, pitInnerRadius, pitBowlSemiDepth } = CARVED_BOARD_METRICS;
  const clampedR = Math.min(Math.max(r, 0), pitInnerRadius * 0.96);
  const ratio = clampedR / pitInnerRadius;
  const lipTransitionY = topY - pitLipRadius;
  return lipTransitionY - pitBowlSemiDepth * Math.sqrt(Math.max(0, 1 - ratio * ratio));
}

/**
 * Exact inward-upward surface normal of the carved pit bowl at local offset (dx, dz).
 */
function getCarvedPitBowlNormal(dx: number, dz: number, out: THREE.Vector3): THREE.Vector3 {
  const r = Math.hypot(dx, dz);
  if (r < 1e-5) {
    return out.set(0, 1, 0);
  }
  const { pitInnerRadius, pitBowlSemiDepth } = CARVED_BOARD_METRICS;
  const clampedR = Math.min(r, pitInnerRadius * 0.92);
  const ratio = clampedR / pitInnerRadius;
  const denom = Math.sqrt(Math.max(1e-4, 1 - ratio * ratio));
  const dydr = (pitBowlSemiDepth * clampedR) / (pitInnerRadius * pitInnerRadius * denom);

  const rx = dx / r;
  const rz = dz / r;
  return out.set(-rx * dydr, 1, -rz * dydr).normalize();
}

/**
 * Deterministic light/dark seed appearance assignment for a pit slot.
 * Gives exact alternating 3L+2D / 2L+3D (35 light + 35 dark across initial 70 seeds)
 * with deterministic intra-pit shuffling and stable slots across count changes.
 */
function getPitSeedAppearance(
  pitId: number | undefined,
  slotIndex: number
): { variant: SeedVariant; toneIndex: number } {
  const id = pitId ?? 0;
  const coord = PIT_COORDINATES[id];
  const row = coord ? (coord.row === "top" ? 0 : 1) : Math.floor(id / 7);
  const col = coord ? coord.columnIndex : id % 7;

  // Within the first 5 slots, assign exact 3L+2D vs 2L+3D alternating checkerboard
  let isLight: boolean;
  if (slotIndex < 5) {
    const lightCount = (row + col) % 2 === 0 ? 3 : 2;
    const perm = [0, 1, 2, 3, 4];
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(seededFraction(id, i, 401) * (i + 1));
      const tmp = perm[i]!;
      perm[i] = perm[j]!;
      perm[j] = tmp;
    }
    const assignedOrder = perm.indexOf(slotIndex);
    isLight = assignedOrder < lightCount;
  } else {
    isLight = ((id + slotIndex) % 2 === 0) !== (seededFraction(id, slotIndex, 509) > 0.72);
  }

  const toneIndex = Math.floor(seededFraction(id, slotIndex, 773) * 3);
  return { variant: isLight ? "light" : "dark", toneIndex };
}

const PIT_STACK_LAYER_CAPACITIES = [9, 9, 8, 7, 6, 5] as const;

/**
 * Deterministic multi-layer physical stacking slot inside a carved circular pit.
 * Maintains constant physical seed dimensions across all counts (9..70+) by arranging
 * organic curved-floor rings and mounded upper layers inside pitInnerRadius.
 */
function computePitStackOffset(
  idx: number,
  effectivePitId: number,
  baseAngle: number
): { dx: number; dz: number; layerIndex: number; layerY: number } {
  let cursor = idx;
  let layerIndex = 0;

  while (true) {
    const cap =
      layerIndex < PIT_STACK_LAYER_CAPACITIES.length
        ? PIT_STACK_LAYER_CAPACITIES[layerIndex]!
        : 4;
    if (cursor < cap) {
      const slotInLayer = cursor;
      const layerTwist = baseAngle + layerIndex * 0.58;
      let r = 0;
      let angle = layerTwist;

      if (cap >= 7 && slotInLayer === 0) {
        // Slightly off-center floor or crown anchor seed
        r = 0.02 + seededFraction(effectivePitId, idx, 601) * 0.055;
        angle = layerTwist + seededFraction(effectivePitId, idx, 607) * Math.PI * 2;
      } else {
        const ringIndex = cap >= 7 ? slotInLayer - 1 : slotInLayer;
        const ringCount = cap >= 7 ? cap - 1 : cap;
        const baseRingRadius =
          layerIndex === 0
            ? 0.415
            : layerIndex === 1
              ? 0.395
              : layerIndex === 2
                ? 0.35
                : layerIndex === 3
                  ? 0.295
                  : layerIndex === 4
                    ? 0.235
                    : Math.max(0.11, 0.19 - (layerIndex - 5) * 0.03);

        const radialJitter =
          (seededFraction(effectivePitId, idx, 613) - 0.5) *
          (layerIndex <= 1 ? 0.085 : 0.065);
        const angleJitter =
          (seededFraction(effectivePitId, idx, 617) - 0.5) * 0.24;

        r = Math.max(0.03, Math.min(0.49, baseRingRadius + radialJitter));
        angle = layerTwist + (ringIndex / Math.max(1, ringCount)) * Math.PI * 2 + angleJitter;
      }

      // Layer elevation with gentle organic dome height variation
      const verticalJitter =
        layerIndex === 0 ? 0 : (seededFraction(effectivePitId, idx, 631) - 0.5) * 0.02;
      const layerY = layerIndex * 0.112 + verticalJitter;

      return {
        dx: Math.cos(angle) * r,
        dz: Math.sin(angle) * r,
        layerIndex,
        layerY,
      };
    }

    cursor -= cap;
    layerIndex += 1;
  }
}

/**
 * Computes deterministic, bowl-seated 3D coordinates and natural orientations for seeds inside a pit.
 * Maintains uniform physical seed dimensions for all counts (1..70+) and stacks high counts
 * organically across multiple layers within pit walls.
 */
export function getPitSeedPositions3D(
  seedCount: number,
  pitWorldPos: [number, number, number],
  pitId?: number
): Seed3DTransform[] {
  if (seedCount <= 0) return [];

  const [px, py, pz] = pitWorldPos;
  const effectivePitId = pitId ?? Math.round((px + 10) * 13 + (pz + 5) * 7);
  const baseAngle = ((effectivePitId * 1.17) % (Math.PI * 2)) + seededFraction(effectivePitId, 0, 19) * 0.8;

  const bellyRadius = SEED_DIMENSIONS.ry * SEED_DIMENSIONS.bellyFlattenFactor;
  const results: Seed3DTransform[] = [];

  for (let idx = 0; idx < seedCount; idx++) {
    let dx = 0;
    let dz = 0;
    let layer = 0;
    let layerIndex = 0;
    const baseScale = 1.0; // Unconditional constant seed size across all counts

    if (seedCount === 1) {
      dx = Math.cos(baseAngle) * 0.02;
      dz = Math.sin(baseAngle) * 0.02;
    } else if (seedCount === 2) {
      const a = baseAngle + idx * Math.PI + (seededFraction(effectivePitId, idx, 31) - 0.5) * 0.25;
      dx = Math.cos(a) * 0.19;
      dz = Math.sin(a) * 0.19;
    } else if (seedCount === 3) {
      const a = baseAngle + (idx * Math.PI * 2) / 3 + (seededFraction(effectivePitId, idx, 37) - 0.5) * 0.22;
      dx = Math.cos(a) * 0.23;
      dz = Math.sin(a) * 0.23;
    } else if (seedCount === 4) {
      // Crystal-clear four-seed arrangement for bonus readability
      const a = baseAngle + (idx * Math.PI) / 2 + (seededFraction(effectivePitId, idx, 43) - 0.5) * 0.18;
      dx = Math.cos(a) * 0.305;
      dz = Math.sin(a) * 0.305;
    } else if (seedCount === 5) {
      // Sample-inspired organic layout: 1 slightly offset center + 4 spaced along curved bowl wall
      if (idx === 0) {
        const r = 0.015 + seededFraction(effectivePitId, idx, 53) * 0.025;
        const a = baseAngle + seededFraction(effectivePitId, idx, 59) * Math.PI * 2;
        dx = Math.cos(a) * r;
        dz = Math.sin(a) * r;
      } else {
        const quadAngle =
          baseAngle + ((idx - 1) * Math.PI) / 2 + (seededFraction(effectivePitId, idx, 61) - 0.5) * 0.3;
        const r = 0.335 + seededFraction(effectivePitId, idx, 67) * 0.045;
        dx = Math.cos(quadAngle) * r;
        dz = Math.sin(quadAngle) * r;
      }
    } else if (seedCount <= 8) {
      // 6-8 seeds: full-size organic single layer with slight natural overlap
      if (idx === 0) {
        const r = 0.02 + seededFraction(effectivePitId, idx, 71) * 0.03;
        const a = baseAngle + seededFraction(effectivePitId, idx, 73) * Math.PI * 2;
        dx = Math.cos(a) * r;
        dz = Math.sin(a) * r;
      } else {
        const outerCount = seedCount - 1;
        const a =
          baseAngle +
          ((idx - 1) / outerCount) * Math.PI * 2 +
          (seededFraction(effectivePitId, idx, 79) - 0.5) * 0.18;
        const r = 0.39 + seededFraction(effectivePitId, idx, 83) * 0.045;
        dx = Math.cos(a) * r;
        dz = Math.sin(a) * r;
      }
    } else {
      // 9..70+ seeds: constant full-size multi-layer organic bowl stacking
      const slot = computePitStackOffset(idx, effectivePitId, baseAngle);
      dx = slot.dx;
      dz = slot.dz;
      layer = slot.layerY;
      layerIndex = slot.layerIndex;
    }

    const rDist = Math.hypot(dx, dz);
    const surfaceY =
      layerIndex === 0
        ? py + getCarvedPitBowlY(rDist)
        : py + getCarvedPitBowlY(rDist * 0.65);
    getCarvedPitBowlNormal(dx, dz, TMP_NORMAL);

    // Individual organic size variation (±4.5%), completely independent of seedCount
    const jitterX = 0.955 + seededFraction(effectivePitId, idx, 101) * 0.09;
    const jitterY = 0.955 + seededFraction(effectivePitId, idx, 103) * 0.09;
    const jitterZ = 0.955 + seededFraction(effectivePitId, idx, 107) * 0.09;
    const sx = baseScale * jitterX;
    const sy = baseScale * jitterY;
    const sz = baseScale * jitterZ;

    // Lift seed along local bowl surface normal so its flattened underside rests flush on wood or lower seed layer
    const normalOffset = bellyRadius * sy;
    const wx = px + dx + TMP_NORMAL.x * normalOffset;
    const wz = pz + dz + TMP_NORMAL.z * normalOffset;
    const wy = surfaceY + TMP_NORMAL.y * normalOffset + layer;

    // Align seed local +Y to curved bowl normal, rotate around normal with natural yaw + subtle tilt
    if (layerIndex > 0) {
      TMP_NORMAL.lerp(UP_VEC, 0.7).normalize();
    }
    TMP_ALIGN.setFromUnitVectors(UP_VEC, TMP_NORMAL);
    const yaw = seededFraction(effectivePitId, idx, 211) * Math.PI * 2;
    TMP_YAW.setFromAxisAngle(TMP_NORMAL, yaw);
    TMP_AXIS.set(
      seededFraction(effectivePitId, idx, 223) - 0.5,
      0,
      seededFraction(effectivePitId, idx, 227) - 0.5
    );
    if (TMP_AXIS.lengthSq() < 1e-5) TMP_AXIS.set(1, 0, 0);
    TMP_AXIS.normalize();
    const tiltAmp = layerIndex > 0 ? 0.34 : 0.16;
    TMP_TILT.setFromAxisAngle(
      TMP_AXIS,
      (seededFraction(effectivePitId, idx, 233) - 0.5) * tiltAmp
    );

    TMP_FINAL.multiplyQuaternions(TMP_YAW, TMP_ALIGN).multiply(TMP_TILT);
    TMP_EULER.setFromQuaternion(TMP_FINAL, "XYZ");

    const { variant, toneIndex } = getPitSeedAppearance(pitId, idx);

    results.push({
      position: [wx, wy, wz],
      rotation: [TMP_EULER.x, TMP_EULER.y, TMP_EULER.z],
      scale: [sx, sy, sz],
      variant,
      toneIndex,
    });
  }

  return results;
}

/**
 * Computes deterministic, dish-seated 3D coordinates for seeds inside a player storage bowl.
 * Supports both vertical flanking bowls (2P, 3P, 6P side) and horizontal wide bowls (4P, 5P, 6P top/bottom)
 * while maintaining consistent full physical seed size through organic multi-layer stacking.
 */
export function getStorageSeedPositions3D(
  seedCount: number,
  storageWorldPos: [number, number, number],
  dimensions?: { width: number; length: number }
): Seed3DTransform[] {
  if (seedCount <= 0) return [];

  const [sx, sy, sz] = storageWorldPos;
  const widthWorld = dimensions?.width ?? BOARD_DIMENSIONS.storageWidth;
  const lengthWorld = dimensions?.length ?? BOARD_DIMENSIONS.storageLength;
  const isHorizontal = widthWorld > lengthWorld;

  const playerSalt = Math.abs(Math.round(sx * 13 + sz * 31)) + (isHorizontal ? 7 : 3);
  const bellyRadius = SEED_DIMENSIONS.ry * SEED_DIMENSIONS.bellyFlattenFactor;

  // Inner usable floor spans inside carved rounded rectangle
  const spanX = Math.max(0.45, widthWorld - 0.52);
  const spanZ = Math.max(0.45, lengthWorld - 0.56);
  const storageFloorY = CARVED_BOARD_METRICS.storageFloorY;

  const cols = Math.max(2, Math.floor(spanX / 0.25));
  const rows = Math.max(2, Math.floor(spanZ / 0.24));
  const perLayer = Math.max(8, cols * rows);

  const results: Seed3DTransform[] = [];

  for (let idx = 0; idx < seedCount; idx++) {
    const layer = Math.floor(idx / perLayer);
    const slotInLayer = idx % perLayer;
    const col = slotInLayer % cols;
    const row = Math.floor(slotInLayer / cols);

    const uBase = cols > 1 ? (col / (cols - 1)) * 2 - 1 : 0;
    const vBase = rows > 1 ? (row / (rows - 1)) * 2 - 1 : 0;

    // Slight layer taper + deterministic organic jitter so storage pile stays nicely centered
    const layerShrink = Math.max(0.62, 1.0 - layer * 0.12);
    const jitterX = (seededFraction(playerSalt, idx, 313) - 0.5) * 0.12;
    const jitterZ = (seededFraction(playerSalt, idx, 317) - 0.5) * 0.12;

    const nx = Math.max(-spanX * 0.48, Math.min(spanX * 0.48, uBase * (spanX * 0.42) * layerShrink + jitterX));
    const nz = Math.max(-spanZ * 0.48, Math.min(spanZ * 0.48, vBase * (spanZ * 0.44) * layerShrink + jitterZ));

    const jScale = 0.955 + seededFraction(playerSalt, idx, 311) * 0.09;
    const verticalJitter = layer > 0 ? (seededFraction(playerSalt, idx, 323) - 0.5) * 0.018 : 0;
    const y = sy + storageFloorY + bellyRadius * jScale + layer * 0.112 + verticalJitter;

    const rotX = (seededFraction(playerSalt, idx, 331) - 0.5) * (layer > 0 ? 0.28 : 0.12);
    const rotY = seededFraction(playerSalt, idx, 337) * Math.PI * 2;
    const rotZ = (seededFraction(playerSalt, idx, 347) - 0.5) * (layer > 0 ? 0.28 : 0.12);

    const isLight =
      ((idx + (playerSalt % 2)) % 2 === 0) !==
      (seededFraction(playerSalt, idx, 353) > 0.78);
    const toneIndex = Math.floor(seededFraction(playerSalt, idx, 367) * 3);

    results.push({
      position: [sx + nx, y, sz + nz],
      rotation: [rotX, rotY, rotZ],
      scale: [jScale, jScale, jScale],
      variant: isLight ? "light" : "dark",
      toneIndex,
    });
  }

  return results;
}
