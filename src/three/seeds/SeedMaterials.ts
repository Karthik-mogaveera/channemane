/**
 * Dedicated 3D Seed Material Manager
 * Synthesizes deterministic fine-grained organic wood/tamarind seed textures
 * and maintains reusable satin MeshPhysicalMaterial instances for light (#D6B58A)
 * and dark (#49372A) Channemane seeds with subtle natural tonal buckets.
 */

import * as THREE from "three";

export const SEED_PALETTE = {
  light: "#D6B58A",
  lightStreak: "#B89365",
  dark: "#49372A",
  darkStreak: "#312319",
} as const;

export type SeedVariant = "light" | "dark";

function hash2D(ix: number, iy: number, seed: number): number {
  let n = ix * 374761393 + iy * 668265263 + seed * 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  const v00 = hash2D(ix, iy, seed);
  const v10 = hash2D(ix + 1, iy, seed);
  const v01 = hash2D(ix, iy + 1, seed);
  const v11 = hash2D(ix + 1, iy + 1, seed);

  const vx0 = v00 + (v10 - v00) * fx;
  const vx1 = v01 + (v11 - v01) * fx;
  return vx0 + (vx1 - vx0) * fy;
}

function fbm2D(x: number, y: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq, seed + i * 31);
    norm += amp;
    freq *= 2.02;
    amp *= 0.5;
  }
  return sum / norm;
}

interface SeedTexturePair {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

/**
 * Generates fine-grained organic wood/seed surface textures deterministically.
 */
function createSeedTextureSet(
  baseHex: string,
  streakHex: string,
  seed: number
): SeedTexturePair | null {
  if (typeof document === "undefined") return null;

  const size = 256;
  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext("2d");

  if (!aCtx || !bCtx) return null;

  const aImg = aCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);

  const base = new THREE.Color(baseHex);
  const streak = new THREE.Color(streakHex);

  const toSrgbByte = (lin: number): number => {
    const clamped = Math.max(0, Math.min(1, lin));
    const s = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(s * 255);
  };

  for (let py = 0; py < size; py++) {
    const v = py / size;
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const n1 = fbm2D(u * 5.0, v * 16.0, seed, 3);
      const ring = 0.5 + 0.5 * Math.sin((v * 9.0 + n1 * 2.2) * Math.PI * 2);
      const fine = valueNoise2D(u * 28.0, v * 56.0, seed + 17);

      const t = Math.max(0, Math.min(1, ring * 0.38 + (fine - 0.5) * 0.14));
      const r = base.r * (1 - t) + streak.r * t;
      const g = base.g * (1 - t) + streak.g * t;
      const b = base.b * (1 - t) + streak.b * t;

      const idx = (py * size + px) * 4;
      aImg.data[idx] = toSrgbByte(r);
      aImg.data[idx + 1] = toSrgbByte(g);
      aImg.data[idx + 2] = toSrgbByte(b);
      aImg.data[idx + 3] = 255;

      const h = Math.round(Math.max(0, Math.min(1, 0.52 + (fine - 0.5) * 0.28 - ring * 0.12)) * 255);
      bImg.data[idx] = h;
      bImg.data[idx + 1] = h;
      bImg.data[idx + 2] = h;
      bImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = THREE.MirroredRepeatWrapping;
  albedo.wrapT = THREE.MirroredRepeatWrapping;
  albedo.anisotropy = 4;
  albedo.needsUpdate = true;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.MirroredRepeatWrapping;
  bump.wrapT = THREE.MirroredRepeatWrapping;
  bump.anisotropy = 4;
  bump.needsUpdate = true;

  return { albedo, bump };
}

export class SeedMaterialsManager {
  private static instance: SeedMaterialsManager | null = null;

  private readonly textures: THREE.CanvasTexture[] = [];
  public readonly lightMaterials: readonly THREE.MeshPhysicalMaterial[];
  public readonly darkMaterials: readonly THREE.MeshPhysicalMaterial[];

  constructor() {
    const lightMaps = createSeedTextureSet(SEED_PALETTE.light, SEED_PALETTE.lightStreak, 303);
    const darkMaps = createSeedTextureSet(SEED_PALETTE.dark, SEED_PALETTE.darkStreak, 509);

    if (lightMaps) {
      this.textures.push(lightMaps.albedo, lightMaps.bump);
    }
    if (darkMaps) {
      this.textures.push(darkMaps.albedo, darkMaps.bump);
    }

    // Subtle tonal multipliers preserved clearly within each seed class (reusing shared textures)
    const lightTints = ["#FFFFFF", "#F6ECDC", "#EAD8BE"];
    const darkTints = ["#FFFFFF", "#E8DFD5", "#D6CBBF"];

    this.lightMaterials = lightTints.map(
      (tint) =>
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(lightMaps ? tint : SEED_PALETTE.light),
          map: lightMaps?.albedo,
          bumpMap: lightMaps?.bump,
          bumpScale: 0.005,
          roughness: 0.42,
          metalness: 0.0,
          clearcoat: 0.22,
          clearcoatRoughness: 0.40,
          reflectivity: 0.42,
          envMapIntensity: 0.68,
        })
    );

    this.darkMaterials = darkTints.map(
      (tint) =>
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(darkMaps ? tint : SEED_PALETTE.dark),
          map: darkMaps?.albedo,
          bumpMap: darkMaps?.bump,
          bumpScale: 0.005,
          roughness: 0.40,
          metalness: 0.0,
          clearcoat: 0.28,
          clearcoatRoughness: 0.34,
          reflectivity: 0.46,
          envMapIntensity: 0.78,
        })
    );
  }

  public getMaterial(variant: SeedVariant = "light", toneIndex = 0): THREE.MeshPhysicalMaterial {
    const bucket = Math.abs(toneIndex) % 3;
    return variant === "dark" ? this.darkMaterials[bucket]! : this.lightMaterials[bucket]!;
  }

  public static getInstance(): SeedMaterialsManager {
    if (!SeedMaterialsManager.instance) {
      SeedMaterialsManager.instance = new SeedMaterialsManager();
    }
    return SeedMaterialsManager.instance;
  }

  public dispose(): void {
    for (const mat of this.lightMaterials) {
      mat.dispose();
    }
    for (const mat of this.darkMaterials) {
      mat.dispose();
    }
    for (const tex of this.textures) {
      tex.dispose();
    }
    this.textures.length = 0;
    SeedMaterialsManager.instance = null;
  }
}
