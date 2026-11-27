/**
 * Three-Mode Interactive Board Camera
 * Supports SIDE (default ~43° angled perspective), TOP (direct overhead fit),
 * and ORBIT (unrestricted 360° horizontal orbit + constrained vertical elevation),
 * with smooth GSAP spherical transitions and zero-drift OrbitControls coordination.
 */

import React, { useLayoutEffect, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  getBoardVisualConfig,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";

export type BoardCameraMode = "SIDE" | "TOP" | "ORBIT";

export const CAMERA_FOV_DEG = 38;
export const SIDE_ELEVATION_RAD = Math.PI / 4.2; // ~43 degrees elevation
export const TOP_VIEW_Z_EPSILON = 0.001;
export const CAMERA_TRANSITION_DURATION_SEC = 0.65;
export const ORBIT_MIN_POLAR_ANGLE = 0.12;
export const ORBIT_MAX_POLAR_ANGLE = Math.PI / 2 - 0.28;

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
}

export interface CameraControlConfig {
  enableRotate: boolean;
  enablePan: boolean;
  enableZoom: boolean;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  minDistance: number;
  maxDistance: number;
}

/**
 * Computes responsive camera distance for the requested mode, player count, and viewport aspect.
 */
export function computeCameraTargetDistance(
  mode: BoardCameraMode,
  playerCount: SupportedPlayerCount,
  aspect: number,
  fovDeg: number = CAMERA_FOV_DEG
): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.25 ? aspect : 16 / 9;
  const cfg = getBoardVisualConfig(playerCount);

  if (mode === "TOP") {
    const halfVFovRad = THREE.MathUtils.degToRad(fovDeg * 0.5);
    const tanHalfV = Math.tan(halfVFovRad);
    const tanHalfH = tanHalfV * safeAspect;
    // Breathing room keeps outer bevels, rim edges, and all storage bowls unclipped
    const marginFactor = playerCount >= 5 ? 1.12 : 1.14;
    const distV = (cfg.depth * 0.5 * marginFactor) / tanHalfV;
    const distH = (cfg.width * 0.5 * marginFactor) / tanHalfH;
    return Math.max(distV, distH);
  }

  // SIDE and starting ORBIT preserve original responsive framing
  if (playerCount === 2) {
    if (safeAspect < 1.7) return 14.5;
    if (safeAspect < 2.0) return 13.0;
    return 12.0;
  }

  const widthScale = cfg.width / 18.2;
  const depthFactor = playerCount >= 5 ? 1.54 : playerCount === 4 ? 1.32 : 1.24;
  const aspectBoost = safeAspect < 1.7 ? 1.2 : safeAspect < 2.0 ? 1.08 : 1.0;
  return 12.0 * Math.max(widthScale, depthFactor) * aspectBoost;
}

/**
 * Computes the destination camera coordinates and board-center target for a camera mode.
 */
export function getCameraPoseForMode(
  mode: BoardCameraMode,
  playerCount: SupportedPlayerCount,
  aspect: number,
  fovDeg: number = CAMERA_FOV_DEG
): CameraPose {
  const distance = computeCameraTargetDistance(mode, playerCount, aspect, fovDeg);

  if (mode === "TOP") {
    return {
      position: [0, distance, TOP_VIEW_Z_EPSILON],
      target: [0, 0, 0],
      distance,
    };
  }

  const y = distance * Math.sin(SIDE_ELEVATION_RAD);
  const z = distance * Math.cos(SIDE_ELEVATION_RAD);

  return {
    position: [0, y, z],
    target: [0, 0, 0],
    distance,
  };
}

/**
 * Derives OrbitControls permission flags and safe spherical limits per camera mode.
 */
export function getCameraControlConfig(
  mode: BoardCameraMode,
  playerCount: SupportedPlayerCount,
  targetDistance: number
): CameraControlConfig {
  const cfg = getBoardVisualConfig(playerCount);
  const baseMaxDist = playerCount >= 5 ? 27.0 : playerCount >= 3 ? 22.0 : 18.0;
  const maxDistance = Math.max(baseMaxDist, Math.ceil(targetDistance * 1.35));

  if (mode === "ORBIT") {
    return {
      enableRotate: true,
      enablePan: false,
      enableZoom: true,
      minPolarAngle: ORBIT_MIN_POLAR_ANGLE,
      maxPolarAngle: ORBIT_MAX_POLAR_ANGLE,
      minAzimuthAngle: -Infinity,
      maxAzimuthAngle: Infinity,
      // Keep minimum distance cleanly outside walnut slab width at low orbit elevations
      minDistance: Math.max(8.5, cfg.width * 0.56),
      maxDistance,
    };
  }

  // SIDE and TOP disallow rotation & panning; wide polar span [0..PI] prevents vertical tilt when zooming overhead
  return {
    enableRotate: false,
    enablePan: false,
    enableZoom: true,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    minDistance: 7.5,
    maxDistance,
  };
}

/**
 * Smoothly interpolates camera position and look-at target along the shortest spherical arc
 * so orbiting 180° back to SIDE/TOP glides around the board without zoom dips or gimbal snaps.
 */
export function interpolateCameraSpherical(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  startTarget: THREE.Vector3,
  endTarget: THREE.Vector3,
  t: number,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3
): void {
  const clampedT = Math.min(1, Math.max(0, t));
  outTarget.lerpVectors(startTarget, endTarget, clampedT);

  if (clampedT <= 0) {
    outPos.copy(startPos);
    return;
  }
  if (clampedT >= 1) {
    outPos.copy(endPos);
    return;
  }

  const startOffset = new THREE.Vector3().subVectors(startPos, startTarget);
  const endOffset = new THREE.Vector3().subVectors(endPos, endTarget);
  const startSph = new THREE.Spherical().setFromVector3(startOffset);
  const endSph = new THREE.Spherical().setFromVector3(endOffset);

  const deltaTheta = Math.atan2(
    Math.sin(endSph.theta - startSph.theta),
    Math.cos(endSph.theta - startSph.theta)
  );

  const radius = THREE.MathUtils.lerp(startSph.radius, endSph.radius, clampedT);
  const phi = Math.max(0.00005, THREE.MathUtils.lerp(startSph.phi, endSph.phi, clampedT));
  const theta = startSph.theta + deltaTheta * clampedT;

  const offset = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
  outPos.copy(outTarget).add(offset);
}

export interface BoardCameraProps {
  mode?: BoardCameraMode;
  playerCount?: SupportedPlayerCount;
}

export const BoardCamera: React.FC<BoardCameraProps> = ({
  mode = "SIDE",
  playerCount = 2,
}) => {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const prevModeRef = useRef<BoardCameraMode | null>(null);
  const prevPlayerCountRef = useRef<SupportedPlayerCount | null>(null);
  const transitionTweenRef = useRef<gsap.core.Tween | null>(null);

  const aspect = size.width / Math.max(1, size.height);
  const targetPose = getCameraPoseForMode(mode, playerCount, aspect, CAMERA_FOV_DEG);
  const controlConfig = getCameraControlConfig(mode, playerCount, targetPose.distance);

  useLayoutEffect(() => {
    const controls = controlsRef.current;

    if (transitionTweenRef.current) {
      transitionTweenRef.current.kill();
      transitionTweenRef.current = null;
    }

    const prevMode = prevModeRef.current;
    const prevCount = prevPlayerCountRef.current;
    prevModeRef.current = mode;
    prevPlayerCountRef.current = playerCount;

    const endPos = new THREE.Vector3(...targetPose.position);
    const endTarget = new THREE.Vector3(...targetPose.target);

    const applyExactPose = () => {
      camera.position.copy(endPos);
      camera.lookAt(endTarget);
      camera.updateProjectionMatrix();

      if (controls) {
        controls.enableDamping = false;
        controls.target.copy(endTarget);
        controls.update();
        // Second sync ensures flushed sphericalDelta leaves camera at exact destination
        camera.position.copy(endPos);
        camera.lookAt(endTarget);
        controls.update();
        controls.enableDamping = mode === "ORBIT";
        controls.enabled = true;
      }
    };

    // Initial mount: snap directly with no opening jump
    if (prevMode === null) {
      applyExactPose();
      return;
    }

    // Resize / layout change while staying in ORBIT preserves user's inspection azimuth & polar
    if (prevMode === mode && prevCount === playerCount && mode === "ORBIT") {
      if (controls) {
        controls.update();
      }
      return;
    }

    // Mode change (or board player count change): smooth spherical transition
    if (prevMode !== mode) {
      const startPos = camera.position.clone();
      const startTarget = controls ? controls.target.clone() : new THREE.Vector3(0, 0, 0);

      // If switching SIDE <-> ORBIT when camera is already at destination, avoid empty tween delay
      if (startPos.distanceToSquared(endPos) < 1e-4 && startTarget.distanceToSquared(endTarget) < 1e-4) {
        applyExactPose();
        return;
      }

      if (controls) {
        controls.enabled = false;
        controls.enableDamping = false;
      }

      const tweenProxy = { progress: 0 };
      const tempPos = new THREE.Vector3();
      const tempTarget = new THREE.Vector3();

      transitionTweenRef.current = gsap.to(tweenProxy, {
        progress: 1,
        duration: CAMERA_TRANSITION_DURATION_SEC,
        ease: "power2.inOut",
        onUpdate: () => {
          interpolateCameraSpherical(
            startPos,
            endPos,
            startTarget,
            endTarget,
            tweenProxy.progress,
            tempPos,
            tempTarget
          );
          camera.position.copy(tempPos);
          camera.lookAt(tempTarget);
          if (controls) {
            controls.target.copy(tempTarget);
          }
        },
        onComplete: () => {
          transitionTweenRef.current = null;
          applyExactPose();
        },
      });
    } else {
      // Viewport resize in SIDE / TOP mode (or player count change): re-frame immediately
      applyExactPose();
    }

    return () => {
      if (transitionTweenRef.current) {
        transitionTweenRef.current.kill();
        transitionTweenRef.current = null;
      }
    };
  }, [
    camera,
    mode,
    playerCount,
    targetPose.position[0],
    targetPose.position[1],
    targetPose.position[2],
  ]);

  // Safety cleanup on component unmount
  useEffect(() => {
    return () => {
      if (transitionTweenRef.current) {
        transitionTweenRef.current.kill();
        transitionTweenRef.current = null;
      }
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={controlConfig.enableRotate}
      enablePan={controlConfig.enablePan}
      enableZoom={controlConfig.enableZoom}
      enableDamping={mode === "ORBIT"}
      dampingFactor={0.08}
      minDistance={controlConfig.minDistance}
      maxDistance={controlConfig.maxDistance}
      minPolarAngle={controlConfig.minPolarAngle}
      maxPolarAngle={controlConfig.maxPolarAngle}
      minAzimuthAngle={controlConfig.minAzimuthAngle}
      maxAzimuthAngle={controlConfig.maxAzimuthAngle}
    />
  );
};
