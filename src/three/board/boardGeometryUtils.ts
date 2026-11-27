/**
 * Shared 3D Board Geometry & UV Utilities
 * Provides consistent world-space planar UV projection and shared loop sampling
 * so procedural walnut wood grain flows uninterrupted across the top deck,
 * outer bevels, all 14 carved pit bowls, and both player storage trays.
 */

import { BOARD_DIMENSIONS } from "../config/boardVisualConfigs";

/**
 * Carved geometry parameters anchored directly to authoritative BOARD_DIMENSIONS
 * without altering logical board width/depth or pit/storage center coordinates.
 */
export const CARVED_BOARD_METRICS = {
  // Slab outer silhouette & bevels (top flat deck sits at Y = 0)
  topY: 0.0,
  slabBottomY: -0.71,
  plinthBottomY: -BOARD_DIMENSIONS.height, // -0.85
  plinthInset: 0.36,
  topBevelRadius: 0.14,
  bottomChamfer: 0.07,

  // Circular Pits (inner bowl >= floor seed span, lip meets top deck cleanly, ~13.75% deeper floor)
  pitInnerRadius: 0.71,
  pitLipRadius: 0.09,
  pitRimRadius: 0.80, // Exact cutout hole radius in top deck
  pitBowlSemiDepth: 0.365, // Total carved floor at Y = -0.09 - 0.365 = -0.455
  pitRadialSegments: 48,

  // 2 Symmetrical Player Storage Trays (world centers at ±7.85, 0)
  storageHalfW: 0.80,
  storageHalfL: 1.74,
  storageCornerRadius: 0.74,
  storageLipRadius: 0.07,
  storageWallInset: 0.04,
  storageBottomCoveRadius: 0.11,
  storageFloorY: -0.39,
  storageCornerSegments: 14,
} as const;

export interface Point2D {
  x: number;
  y: number;
}

export interface PerimeterSample {
  x: number;
  z: number;
  nx: number;
  nz: number;
  arcLen: number;
}

/**
 * Maps world (x, z) coordinates onto normalized [0..1] planar texture UVs.
 * Keeps all top surfaces within [0.03..0.97] so continuous horizontal walnut plank
 * grain runs uninterrupted without tiling seams across any 2-6 player slab.
 */
export function computeBoardPlanarUV(
  x: number,
  z: number,
  boardWidth = BOARD_DIMENSIONS.width,
  boardDepth = BOARD_DIMENSIONS.depth
): [number, number] {
  const u = ((x + boardWidth / 2) / boardWidth) * 0.94 + 0.03;
  const v = ((z + boardDepth / 2) / boardDepth) * 0.86 + 0.07;
  return [u, v];
}

/**
 * Samples a circle perimeter loop in 2D shape coordinates (x, y).
 */
export function sampleCircleLoop(
  cx: number,
  cy: number,
  radius: number,
  segments = CARVED_BOARD_METRICS.pitRadialSegments,
  clockwise = false
): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const angle = clockwise ? -t * Math.PI * 2 : t * Math.PI * 2;
    pts.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
  return pts;
}

/**
 * Samples a rounded-rectangle perimeter loop centered at (cx, cy).
 */
export function sampleRoundedRectLoop(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  cornerR: number,
  cornerSegments = 14,
  clockwise = false
): Point2D[] {
  const r = Math.min(cornerR, halfW - 0.002, halfH - 0.002);
  const ix = halfW - r;
  const iy = halfH - r;

  const corners = [
    { x: cx + ix, y: cy + iy, start: 0, end: Math.PI / 2 },
    { x: cx - ix, y: cy + iy, start: Math.PI / 2, end: Math.PI },
    { x: cx - ix, y: cy - iy, start: Math.PI, end: (Math.PI * 3) / 2 },
    { x: cx + ix, y: cy - iy, start: (Math.PI * 3) / 2, end: Math.PI * 2 },
  ];

  const pts: Point2D[] = [];
  for (let c = 0; c < 4; c++) {
    const corner = corners[c];
    for (let s = 0; s <= cornerSegments; s++) {
      if (s === 0 && pts.length > 0) {
        const ax = corner.x + Math.cos(corner.start) * r;
        const ay = corner.y + Math.sin(corner.start) * r;
        const prev = pts[pts.length - 1];
        if (Math.hypot(ax - prev.x, ay - prev.y) < 1e-5) continue;
      }
      const angle = corner.start + (s / cornerSegments) * (corner.end - corner.start);
      pts.push({
        x: corner.x + Math.cos(angle) * r,
        y: corner.y + Math.sin(angle) * r,
      });
    }
  }

  if (pts.length > 2) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-5) {
      pts.pop();
    }
  }

  if (clockwise) {
    pts.reverse();
  }
  return pts;
}

/**
 * Samples a rounded rectangle in world XZ plane in clockwise order (from +Y)
 * together with analytical outward normals for smooth bevel lofting.
 */
export function sampleOuterPerimeterWithNormals(
  halfW: number,
  halfD: number,
  cornerR: number,
  cornerSegments = 16
): PerimeterSample[] {
  const r = Math.min(cornerR, halfW - 0.002, halfD - 0.002);
  const ix = halfW - r;
  const iz = halfD - r;

  const corners = [
    { cx: ix, cz: -iz, a0: -Math.PI / 2, a1: 0 },
    { cx: ix, cz: iz, a0: 0, a1: Math.PI / 2 },
    { cx: -ix, cz: iz, a0: Math.PI / 2, a1: Math.PI },
    { cx: -ix, cz: -iz, a0: Math.PI, a1: (Math.PI * 3) / 2 },
  ];

  const raw: Array<{ x: number; z: number; nx: number; nz: number }> = [];
  for (let c = 0; c < 4; c++) {
    const corner = corners[c];
    for (let s = 0; s <= cornerSegments; s++) {
      const angle = corner.a0 + (s / cornerSegments) * (corner.a1 - corner.a0);
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      const x = corner.cx + nx * r;
      const z = corner.cz + nz * r;
      if (raw.length > 0) {
        const prev = raw[raw.length - 1];
        if (Math.hypot(x - prev.x, z - prev.z) < 1e-5) continue;
      }
      raw.push({ x, z, nx, nz });
    }
  }

  if (raw.length > 2) {
    const first = raw[0];
    const last = raw[raw.length - 1];
    if (Math.hypot(first.x - last.x, first.z - last.z) < 1e-5) {
      raw.pop();
    }
  }

  let totalLen = 0;
  const samples: PerimeterSample[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) {
      totalLen += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].z - raw[i - 1].z);
    }
    samples.push({ ...raw[i], arcLen: totalLen });
  }

  return samples;
}
