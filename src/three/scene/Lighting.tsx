/**
 * Studio Lighting Configuration
 * Balanced studio product-photography rig adapted to the Channemane slab:
 * warm key directional light with tight soft shadow frustum, hemisphere sky/wood bounce,
 * cool-ivory edge rim light, gentle opposite fill, and overhead satin-sheen softbox.
 */

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { DEFAULT_GRAPHICS_SETTINGS } from "../config/graphicsSettings";
import {
  getBoardVisualConfig,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";

function isSoftwareRenderer(gl: THREE.WebGLRenderer): boolean {
  try {
    const context = gl.getContext();
    const ext = context.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : context.RENDERER;
    const rendererStr = String(context.getParameter(param) ?? "");
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return false;
  }
}

export interface LightingProps {
  playerCount?: SupportedPlayerCount;
}

export const Lighting: React.FC<LightingProps> = ({ playerCount = 2 }) => {
  const { gl } = useThree();
  const isSoftwareGl = useMemo(() => isSoftwareRenderer(gl), [gl]);
  const cfg = useMemo(() => getBoardVisualConfig(playerCount), [playerCount]);

  const softboxLight = useMemo(() => {
    if (isSoftwareGl) return null;
    RectAreaLightUniformsLib.init();
    const light = new THREE.RectAreaLight(
      "#FFF9F0",
      0.95,
      cfg.width * 0.77,
      Math.max(4.4, cfg.depth * 0.78)
    );
    light.position.set(0.6, 8.8, 1.4);
    light.lookAt(0, 0, 0);
    return light;
  }, [isSoftwareGl, cfg.width, cfg.depth]);

  useEffect(() => {
    return () => {
      softboxLight?.dispose();
    };
  }, [softboxLight]);

  const mapSize = DEFAULT_GRAPHICS_SETTINGS.shadowMapSize;
  const shadowSpanX = Math.max(11.2, cfg.width * 0.62);
  const shadowSpanZ = Math.max(5.0, cfg.depth * 0.96);

  return (
    <group name="scene-lighting">
      {/* Warm Key Studio Light with Soft Shadow Map */}
      <directionalLight
        color="#FFF4E4"
        intensity={1.38}
        position={[6.5, 11.5, 7.5]}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        shadow-camera-near={2}
        shadow-camera-far={30}
        shadow-camera-left={-shadowSpanX}
        shadow-camera-right={shadowSpanX}
        shadow-camera-top={shadowSpanZ}
        shadow-camera-bottom={-shadowSpanZ}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={3.5}
      />

      {/* Cool Sky / Warm Walnut Bounce Fill */}
      <hemisphereLight args={["#EDEFF2", "#9A7E63", 0.62]} position={[0, 12, 0]} />

      {/* Subtle Cool-Ivory Rim / Backlight to Reveal Bevels and Pit Lips */}
      <directionalLight
        color="#EBF1FA"
        intensity={0.58}
        position={[-7.5, 6.5, -8.5]}
      />

      {/* Gentle Front-Left Fill to Keep Carved Bowls and Grain Readable */}
      <directionalLight
        color="#FFF2DF"
        intensity={0.32}
        position={[-8.5, 5.2, 6.5]}
      />

      {/* Overhead Studio Softbox for Natural Satin Wood Highlights */}
      {softboxLight && <primitive object={softboxLight} />}
    </group>
  );
};
