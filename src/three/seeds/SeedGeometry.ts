/**
 * Reusable Organic 3D Seed Geometry
 * Sculpted almond/tamarind oval geometry with subtle X-axis taper,
 * gently flattened resting belly, soft organic bend, and smooth vertex normals.
 * Shared as a single BufferGeometry instance across all pits, storage trays, and flying seeds.
 */

import * as THREE from "three";

/**
 * Physical semi-axes of a single Channemane wooden seed tuned to the main board's
 * pit inner radius (0.71) so 1-5 seeds sit comfortably separated and up to 70 pack cleanly.
 */
export const SEED_DIMENSIONS = {
  rx: 0.145,
  ry: 0.09,
  rz: 0.112,
  bellyFlattenFactor: 0.84,
} as const;

function createOrganicSeedGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 18, 14);
  const pos = geo.attributes.position;
  const { rx, ry, rz, bellyFlattenFactor } = SEED_DIMENSIONS;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Subtle natural almond/tamarind taper along +X end
    const taper = 1.0 - 0.14 * x + 0.04 * x * x;

    // Gently flattened underside so seeds rest naturally on wood surfaces
    const bellyFlatten = y < 0 ? bellyFlattenFactor : 1.0;

    // Restrained organic curvature and surface wave irregularity
    const bendZ = 0.06 * (x * x - 0.35);
    const organicWave =
      1.0 +
      0.032 * Math.sin(x * 3.8 + z * 2.4) * Math.cos(y * 3.1) +
      0.018 * Math.sin(z * 5.2 - x * 2.1);

    x = x * rx * organicWave;
    y = y * ry * bellyFlatten * taper * organicWave;
    z = (z * taper + bendZ) * rz * organicWave;

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export class SeedGeometries {
  private static instance: SeedGeometries | null = null;
  public readonly geometry: THREE.BufferGeometry;

  constructor() {
    this.geometry = createOrganicSeedGeometry();
  }

  public static getInstance(): SeedGeometries {
    if (!SeedGeometries.instance) {
      SeedGeometries.instance = new SeedGeometries();
    }
    return SeedGeometries.instance;
  }

  public dispose(): void {
    this.geometry.dispose();
    SeedGeometries.instance = null;
  }
}
