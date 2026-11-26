/**
 * Individual Seed 3D Component
 * Renders an organic wooden Channemane seed reusing shared geometry and light/dark materials.
 */

import React, { useMemo } from "react";
import { SeedGeometries } from "./SeedGeometry";
import { SeedMaterialsManager, type SeedVariant } from "./SeedMaterials";

export interface Seed3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  variant?: SeedVariant;
  toneIndex?: number;
  castShadow?: boolean;
}

export const Seed3D: React.FC<Seed3DProps> = React.memo(({
  position,
  rotation,
  scale,
  variant = "light",
  toneIndex = 0,
  castShadow = true,
}: Seed3DProps) => {
  const geometry = useMemo(() => SeedGeometries.getInstance().geometry, []);
  const material = useMemo(
    () => SeedMaterialsManager.getInstance().getMaterial(variant, toneIndex),
    [variant, toneIndex]
  );

  const rot: [number, number, number] = rotation ?? [0, 0, 0];
  const scl: [number, number, number] = scale ?? [1, 1, 1];

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={rot}
      scale={scl}
      castShadow={castShadow}
      receiveShadow
    />
  );
});
