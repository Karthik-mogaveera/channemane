/**
 * Reusable Carved Pit, Stopper & Click Target Geometries
 * Generates C1-continuous router-carved rounded walnut pit contours with ambient-occlusion
 * vertex shading, seamless world-space UVs, and handcrafted closed-pit stoppers.
 */

import * as THREE from "three";
import {
  BOARD_DIMENSIONS,
  getBoardVisualConfig,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";
import { CARVED_BOARD_METRICS, computeBoardPlanarUV } from "../board/boardGeometryUtils";

interface PitProfilePoint {
  r: number;
  y: number;
  nr: number;
  ny: number;
  aoTint: THREE.Color;
}

function buildPitProfile(): PitProfilePoint[] {
  const { topY, pitInnerRadius, pitLipRadius, pitRimRadius, pitBowlSemiDepth } =
    CARVED_BOARD_METRICS;
  const lipCenterR = pitRimRadius;
  const lipCenterY = topY - pitLipRadius;

  // Transition seamlessly from outer deck walnut (1,1,1) into darker carved interior + floor AO
  const rimColor = new THREE.Color(1.0, 1.0, 1.0);
  const midBowlColor = new THREE.Color(0.74, 0.69, 0.66);
  const deepBowlColor = new THREE.Color(0.52, 0.47, 0.44);

  const pts: PitProfilePoint[] = [];

  // 1. Rounded router lip fillet: PI/2 (flat deck join) -> PI (bowl wall entry)
  const lipSegs = 8;
  for (let i = 0; i <= lipSegs; i++) {
    const t = i / lipSegs;
    const angle = Math.PI / 2 + t * (Math.PI / 2);
    const r = lipCenterR + pitLipRadius * Math.cos(angle);
    const y = lipCenterY + pitLipRadius * Math.sin(angle);
    const nr = Math.cos(angle);
    const ny = Math.sin(angle);
    const aoTint = rimColor.clone().lerp(midBowlColor, Math.pow(t, 1.25) * 0.72);
    pts.push({ r, y, nr, ny, aoTint });
  }

  // 2. Concave ellipsoidal bowl curving smoothly down to center floor
  const bowlSegs = 16;
  const a = pitInnerRadius;
  const b = pitBowlSemiDepth;

  for (let i = 1; i <= bowlSegs; i++) {
    const t = i / bowlSegs;
    const phi = t * (Math.PI / 2);
    const r = a * Math.cos(phi);
    const y = lipCenterY - b * Math.sin(phi);

    const rawNr = -b * Math.cos(phi);
    const rawNy = a * Math.sin(phi);
    const len = Math.hypot(rawNr, rawNy) || 1;
    const nr = rawNr / len;
    const ny = rawNy / len;

    const depthFactor = Math.sin(phi);
    const aoTint = rimColor
      .clone()
      .lerp(midBowlColor, 0.72 + depthFactor * 0.28)
      .lerp(deepBowlColor, Math.pow(depthFactor, 1.5) * 0.62);

    pts.push({ r, y, nr, ny, aoTint });
  }

  return pts;
}

function createPitCavityGeometryForPosition(
  profile: PitProfilePoint[],
  worldX: number,
  worldZ: number,
  boardWidth: number,
  boardDepth: number
): THREE.BufferGeometry {
  const radialSegs = CARVED_BOARD_METRICS.pitRadialSegments;
  const ringCount = profile.length - 1;
  const vertsPerPit = ringCount * radialSegs + 1;

  const positions = new Float32Array(vertsPerPit * 3);
  const normals = new Float32Array(vertsPerPit * 3);
  const uvs = new Float32Array(vertsPerPit * 2);
  const colors = new Float32Array(vertsPerPit * 3);
  const indices: number[] = [];

  for (let ring = 0; ring < ringCount; ring++) {
    const prof = profile[ring];
    for (let s = 0; s < radialSegs; s++) {
      const angle = (s / radialSegs) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const lx = cosA * prof.r;
      const lz = sinA * prof.r;
      const vIdx = ring * radialSegs + s;

      positions[vIdx * 3] = lx;
      positions[vIdx * 3 + 1] = prof.y;
      positions[vIdx * 3 + 2] = lz;

      normals[vIdx * 3] = cosA * prof.nr;
      normals[vIdx * 3 + 1] = prof.ny;
      normals[vIdx * 3 + 2] = sinA * prof.nr;

      const [u, v] = computeBoardPlanarUV(worldX + lx, worldZ + lz, boardWidth, boardDepth);
      uvs[vIdx * 2] = u;
      uvs[vIdx * 2 + 1] = v;

      colors[vIdx * 3] = prof.aoTint.r;
      colors[vIdx * 3 + 1] = prof.aoTint.g;
      colors[vIdx * 3 + 2] = prof.aoTint.b;
    }
  }

  const centerProf = profile[profile.length - 1];
  const centerIdx = ringCount * radialSegs;
  positions[centerIdx * 3] = 0;
  positions[centerIdx * 3 + 1] = centerProf.y;
  positions[centerIdx * 3 + 2] = 0;
  normals[centerIdx * 3] = 0;
  normals[centerIdx * 3 + 1] = 1;
  normals[centerIdx * 3 + 2] = 0;
  const [cu, cv] = computeBoardPlanarUV(worldX, worldZ, boardWidth, boardDepth);
  uvs[centerIdx * 2] = cu;
  uvs[centerIdx * 2 + 1] = cv;
  colors[centerIdx * 3] = centerProf.aoTint.r;
  colors[centerIdx * 3 + 1] = centerProf.aoTint.g;
  colors[centerIdx * 3 + 2] = centerProf.aoTint.b;

  for (let ring = 0; ring < ringCount - 1; ring++) {
    for (let s = 0; s < radialSegs; s++) {
      const sNext = (s + 1) % radialSegs;
      const a = ring * radialSegs + s;
      const b = ring * radialSegs + sNext;
      const c = (ring + 1) * radialSegs + s;
      const d = (ring + 1) * radialSegs + sNext;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const lastRingStart = (ringCount - 1) * radialSegs;
  for (let s = 0; s < radialSegs; s++) {
    const sNext = (s + 1) % radialSegs;
    indices.push(lastRingStart + s, centerIdx, lastRingStart + sNext);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export class PitGeometries {
  private static instance: PitGeometries | null = null;

  public readonly cavityGeometry: THREE.BufferGeometry;
  public readonly rimGeometry: THREE.TorusGeometry;
  public readonly clickTargetGeometry: THREE.CylinderGeometry;

  public readonly closedPlugBodyGeometry: THREE.CylinderGeometry;
  public readonly closedPlugCollarGeometry: THREE.TorusGeometry;
  public readonly closedPlugKnobGeometry: THREE.SphereGeometry;

  private readonly profile: PitProfilePoint[];
  private readonly perPitCavityCache = new Map<string, THREE.BufferGeometry>();

  constructor() {
    this.profile = buildPitProfile();
    const R = BOARD_DIMENSIONS.pitRadius;
    const innerR = CARVED_BOARD_METRICS.pitInnerRadius;

    // Default centered cavity geometry preserved for backwards API compatibility
    this.cavityGeometry = createPitCavityGeometryForPosition(
      this.profile,
      0,
      0,
      BOARD_DIMENSIONS.width,
      BOARD_DIMENSIONS.depth
    );

    // Subtle thin bevelled collar ring geometry (reusable)
    this.rimGeometry = new THREE.TorusGeometry(R + 0.015, 0.014, 12, 36);
    this.rimGeometry.rotateX(Math.PI / 2);

    // Unchanged click target geometry for reliable pointer/touch raycasting
    this.clickTargetGeometry = new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.5, 24);
    this.clickTargetGeometry.translate(0, 0.1, 0);

    // Handcrafted carved walnut stopper geometries for CLOSED pits
    this.closedPlugBodyGeometry = new THREE.CylinderGeometry(
      innerR * 0.99,
      innerR * 0.88,
      0.12,
      40
    );
    this.closedPlugCollarGeometry = new THREE.TorusGeometry(innerR * 0.96, 0.032, 12, 44);
    this.closedPlugCollarGeometry.rotateX(Math.PI / 2);

    this.closedPlugKnobGeometry = new THREE.SphereGeometry(0.085, 16, 12);
    this.closedPlugKnobGeometry.scale(1, 0.65, 1);
  }

  public getCavityGeometry(
    pitId: number,
    playerCount: SupportedPlayerCount = 2
  ): THREE.BufferGeometry {
    const key = `${playerCount}:${pitId}`;
    const cached = this.perPitCavityCache.get(key);
    if (cached) return cached;

    const cfg = getBoardVisualConfig(playerCount);
    const coord = cfg.pits[pitId];
    if (!coord) return this.cavityGeometry;

    const geo = createPitCavityGeometryForPosition(
      this.profile,
      coord.position[0],
      coord.position[2],
      cfg.width,
      cfg.depth
    );
    this.perPitCavityCache.set(key, geo);
    return geo;
  }

  public static getInstance(): PitGeometries {
    if (!PitGeometries.instance) {
      PitGeometries.instance = new PitGeometries();
    }
    return PitGeometries.instance;
  }

  public dispose(): void {
    this.cavityGeometry.dispose();
    for (const geo of this.perPitCavityCache.values()) {
      geo.dispose();
    }
    this.perPitCavityCache.clear();
    this.rimGeometry.dispose();
    this.clickTargetGeometry.dispose();
    this.closedPlugBodyGeometry.dispose();
    this.closedPlugCollarGeometry.dispose();
    this.closedPlugKnobGeometry.dispose();
    PitGeometries.instance = null;
  }
}
