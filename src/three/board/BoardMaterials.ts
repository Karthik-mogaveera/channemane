/**
 * Board Materials & Procedural Natural Walnut Texture System
 * Generates deterministic multi-octave walnut albedo, satin roughness, and fine pore bump maps
 * with zero external image assets and reusable material instances.
 */

import * as THREE from "three";

export const BOARD_PALETTE = {
  walnutBase: "#76543A",
  walnutDark: "#4B3322",
  walnutDeep: "#3C291B",
  walnutLight: "#936E4C",
  walnutCavity: "#38261B",
  walnutPlinth: "#543B29",

  ivory: "#F6F2E9",
  sandstone: "#E7D9C2",
  sage: "#A7B69A",

  antiqueBrass: "#A88A55",
  brassHighlight: "#BA9A60",
} as const;

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

function fbm2D(x: number, y: number, seed: number, octaves = 4): number {
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

interface ProceduralWalnutMaps {
  albedo: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

/**
 * Synthesizes deterministic horizontal natural walnut albedo, roughness, and fine pore bump maps.
 * Uses 1024x512 resolution matching the wide Channemane slab aspect ratio for crisp longitudinal fibers
 * with fast single-pass startup time.
 */
function createWalnutTextureSet(): ProceduralWalnutMaps | null {
  if (typeof document === "undefined") return null;

  const texWidth = 1024;
  const texHeight = 512;

  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = texWidth;
  albedoCanvas.height = texHeight;
  const albedoCtx = albedoCanvas.getContext("2d");

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = texWidth;
  roughCanvas.height = texHeight;
  const roughCtx = roughCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = texWidth;
  bumpCanvas.height = texHeight;
  const bumpCtx = bumpCanvas.getContext("2d");

  if (!albedoCtx || !roughCtx || !bumpCtx) return null;

  const albedoImg = albedoCtx.createImageData(texWidth, texHeight);
  const roughImg = roughCtx.createImageData(texWidth, texHeight);
  const bumpImg = bumpCtx.createImageData(texWidth, texHeight);

  const aData = albedoImg.data;
  const rData = roughImg.data;
  const bData = bumpImg.data;

  const baseColor = new THREE.Color(BOARD_PALETTE.walnutBase);
  const darkColor = new THREE.Color(BOARD_PALETTE.walnutDark);
  const lightColor = new THREE.Color(BOARD_PALETTE.walnutLight);

  const cR = baseColor.r;
  const cG = baseColor.g;
  const cB = baseColor.b;
  const dR = darkColor.r;
  const dG = darkColor.g;
  const dB = darkColor.b;
  const lR = lightColor.r;
  const lG = lightColor.g;
  const lB = lightColor.b;

  const seed = 108;
  const baseRough = 0.44;

  // Precompute linear->sRGB byte lookup table (4096 steps) to accelerate canvas synthesis
  const LUT_SIZE = 4096;
  const srgbLut = new Uint8Array(LUT_SIZE + 1);
  for (let i = 0; i <= LUT_SIZE; i++) {
    const lin = i / LUT_SIZE;
    const s = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
    srgbLut[i] = Math.round(Math.max(0, Math.min(1, s)) * 255);
  }
  const toSrgbByte = (lin: number): number => {
    const idx = Math.max(0, Math.min(LUT_SIZE, Math.round(lin * LUT_SIZE)));
    return srgbLut[idx];
  };

  for (let py = 0; py < texHeight; py++) {
    const v = py / texHeight;
    for (let px = 0; px < texWidth; px++) {
      const u = px / texWidth;

      // Natural walnut growth rings flowing horizontally along U (board length X)
      const warp1 = fbm2D(u * 2.4, v * 4.8, seed, 4);
      const warp2 = fbm2D(u * 6.5 + 3.1, v * 13.5 + 1.7, seed + 19, 3);

      const ringCoord = (v * 10.5 + warp1 * 3.0 + warp2 * 0.52) * Math.PI * 2;
      const ringWave = 0.5 + 0.5 * Math.sin(ringCoord + Math.sin(u * Math.PI * 2 + warp1 * 2.3) * 1.15);
      const latewood = Math.pow(ringWave, 2.2);

      // Broad organic heartwood tonal flow across plank length
      const heartwood = fbm2D(u * 1.8 + 5.2, v * 3.2 + 2.8, seed + 71, 3);

      // Fine elongated wood vessel pores & fibers along U
      const fiberStreak = valueNoise2D(u * 16.0, v * 180.0, seed + 107);
      const poreNoise = valueNoise2D(u * 48.0, v * 300.0, seed + 149);
      const pore = poreNoise > 0.78 ? (poreNoise - 0.78) / 0.22 : 0;
      const rayMicro = valueNoise2D(u * 68.0, v * 26.0, seed + 211) * 0.04;

      // Blend base, deeper latewood walnut bands, and warm honey heartwood streaks
      let mixR = cR * (1 - latewood * 0.45) + dR * (latewood * 0.45);
      let mixG = cG * (1 - latewood * 0.45) + dG * (latewood * 0.45);
      let mixB = cB * (1 - latewood * 0.45) + dB * (latewood * 0.45);

      const lightAmt = Math.max(0, heartwood - 0.46) * 0.74;
      mixR = mixR * (1 - lightAmt) + lR * lightAmt;
      mixG = mixG * (1 - lightAmt) + lG * lightAmt;
      mixB = mixB * (1 - lightAmt) + lB * lightAmt;

      const fiberDelta = (fiberStreak - 0.5) * 0.065 + rayMicro - pore * 0.22;
      mixR = Math.max(0, mixR + fiberDelta * 0.42);
      mixG = Math.max(0, mixG + fiberDelta * 0.30);
      mixB = Math.max(0, mixB + fiberDelta * 0.20);

      const idx = (py * texWidth + px) * 4;
      aData[idx] = toSrgbByte(mixR);
      aData[idx + 1] = toSrgbByte(mixG);
      aData[idx + 2] = toSrgbByte(mixB);
      aData[idx + 3] = 255;

      // Satin wood roughness: open pores matte, finished heartwood smooth satin
      const roughVal = Math.max(
        0.2,
        Math.min(0.88, baseRough + pore * 0.28 + (latewood - 0.5) * 0.09 + (fiberStreak - 0.5) * 0.06)
      );
      const roughByte = Math.round(roughVal * 255);
      rData[idx] = roughByte;
      rData[idx + 1] = roughByte;
      rData[idx + 2] = roughByte;
      rData[idx + 3] = 255;

      // Bump height: pores recessed, subtle grain relief
      const heightVal = Math.max(
        0,
        Math.min(1, 0.58 - pore * 0.46 + (fiberStreak - 0.5) * 0.14 - latewood * 0.08)
      );
      const bumpByte = Math.round(heightVal * 255);
      bData[idx] = bumpByte;
      bData[idx + 1] = bumpByte;
      bData[idx + 2] = bumpByte;
      bData[idx + 3] = 255;
    }
  }

  albedoCtx.putImageData(albedoImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);

  const configureTexture = (canvas: HTMLCanvasElement, isColor: boolean): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.MirroredRepeatWrapping;
    tex.wrapT = THREE.MirroredRepeatWrapping;
    tex.anisotropy = 4;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.needsUpdate = true;
    return tex;
  };

  return {
    albedo: configureTexture(albedoCanvas, true),
    roughness: configureTexture(roughCanvas, false),
    bump: configureTexture(bumpCanvas, false),
  };
}

export class BoardMaterialsManager {
  private static instance: BoardMaterialsManager | null = null;

  public readonly woodTexture: THREE.CanvasTexture | null;
  public readonly roughnessTexture: THREE.CanvasTexture | null;
  public readonly bumpTexture: THREE.CanvasTexture | null;

  public readonly boardMaterial: THREE.MeshPhysicalMaterial;
  public readonly cavityMaterial: THREE.MeshPhysicalMaterial;
  public readonly plinthMaterial: THREE.MeshStandardMaterial;
  public readonly seedMaterial: THREE.MeshStandardMaterial;
  public readonly brassMaterial: THREE.MeshStandardMaterial;
  public readonly ivoryMaterial: THREE.MeshPhysicalMaterial;
  public readonly sandstoneMaterial: THREE.MeshStandardMaterial;
  public readonly sageMaterial: THREE.MeshPhysicalMaterial;
  public readonly closedPitMaterial: THREE.MeshStandardMaterial;

  constructor() {
    const maps = createWalnutTextureSet();
    this.woodTexture = maps?.albedo ?? null;
    this.roughnessTexture = maps?.roughness ?? null;
    this.bumpTexture = maps?.bump ?? null;

    // 1. Main Natural Walnut Slab (Satin oiled finish, warm visible grain)
    this.boardMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FFFFFF"),
      map: this.woodTexture || undefined,
      roughnessMap: this.roughnessTexture || undefined,
      bumpMap: this.bumpTexture || undefined,
      bumpScale: 0.015,
      roughness: 0.94, // Multiplies with roughnessMap (~0.42 effective)
      metalness: 0.0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.44,
      reflectivity: 0.36,
      envMapIntensity: 0.52,
    });

    // 2. Carved Walnut Pit & Storage Interior (Vertex-color AO darkens rim into recessed cavity)
    this.cavityMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FFFFFF"),
      map: this.woodTexture || undefined,
      roughnessMap: this.roughnessTexture || undefined,
      bumpMap: this.bumpTexture || undefined,
      bumpScale: 0.012,
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.48,
      reflectivity: 0.30,
      envMapIntensity: 0.48,
    });

    // 3. Deeper Walnut Side / Plinth Material
    this.plinthMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(BOARD_PALETTE.walnutPlinth),
      map: this.woodTexture || undefined,
      roughnessMap: this.roughnessTexture || undefined,
      bumpMap: this.bumpTexture || undefined,
      bumpScale: 0.01,
      roughness: 0.96,
      metalness: 0.0,
      envMapIntensity: 0.42,
    });

    // 4. Existing Seed Material (Preserved unchanged for Stage 2 scope)
    this.seedMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#dfc8a7"),
      roughness: 0.35,
      metalness: 0.04,
    });

    // 5. Muted Antique Brass (Restrained furniture metalwork, non-garish finish)
    this.brassMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(BOARD_PALETTE.brassHighlight),
      roughness: 0.38,
      metalness: 0.74,
      envMapIntensity: 0.78,
    });

    // 6. Warm Ivory Decorative Inlay
    this.ivoryMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(BOARD_PALETTE.ivory),
      roughness: 0.36,
      metalness: 0.0,
      clearcoat: 0.18,
      clearcoatRoughness: 0.34,
      envMapIntensity: 0.48,
    });

    // 7. Matte Sandstone Marquetry Inlay
    this.sandstoneMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(BOARD_PALETTE.sandstone),
      roughness: 0.58,
      metalness: 0.0,
      envMapIntensity: 0.38,
    });

    // 8. Muted Sage Wood Inlay
    this.sageMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(BOARD_PALETTE.sage),
      roughness: 0.40,
      metalness: 0.0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.36,
      envMapIntensity: 0.45,
    });

    // 9. Closed Pit Smoked Walnut Stopper / Recessed Interior (Never pure black)
    this.closedPitMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#6A4E3C"),
      map: this.woodTexture || undefined,
      roughnessMap: this.roughnessTexture || undefined,
      bumpMap: this.bumpTexture || undefined,
      bumpScale: 0.008,
      roughness: 0.80,
      metalness: 0.02,
      envMapIntensity: 0.38,
    });
  }

  /**
   * Aligns procedural texture anisotropy with the active WebGL context limits.
   */
  public applyMaxAnisotropy(maxSupportedAnisotropy: number): void {
    const aniso = Math.max(1, Math.min(8, maxSupportedAnisotropy));
    for (const tex of [this.woodTexture, this.roughnessTexture, this.bumpTexture]) {
      if (tex && tex.anisotropy !== aniso) {
        tex.anisotropy = aniso;
        tex.needsUpdate = true;
      }
    }
  }

  public static getInstance(): BoardMaterialsManager {
    if (!BoardMaterialsManager.instance) {
      BoardMaterialsManager.instance = new BoardMaterialsManager();
    }
    return BoardMaterialsManager.instance;
  }

  public dispose(): void {
    this.boardMaterial.dispose();
    this.cavityMaterial.dispose();
    this.plinthMaterial.dispose();
    this.seedMaterial.dispose();
    this.brassMaterial.dispose();
    this.ivoryMaterial.dispose();
    this.sandstoneMaterial.dispose();
    this.sageMaterial.dispose();
    this.closedPitMaterial.dispose();
    if (this.woodTexture) this.woodTexture.dispose();
    if (this.roughnessTexture) this.roughnessTexture.dispose();
    if (this.bumpTexture) this.bumpTexture.dispose();
    BoardMaterialsManager.instance = null;
  }
}
