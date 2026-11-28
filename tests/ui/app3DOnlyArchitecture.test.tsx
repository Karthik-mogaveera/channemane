/**
 * 3D-Only Architecture UI Integration Tests
 * Verifies:
 * - App mounts Board3D directly when entering GAME screen across 2P-6P (zero 2D GameBoard).
 * - Header contains no 2D/3D switcher button.
 * - CameraModeSelector renders and switches SIDE / TOP / ORBIT without resetting game state.
 * - WebGL unavailable displays explicit 3D fallback without silently reverting to any 2D board.
 */

import React from "react";
import * as THREE from "three";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { App } from "../../src/App";
import { Header } from "../../src/ui/components/Header";
import { createInitialGame } from "../../src/engine/board";

const mockCamera = new THREE.PerspectiveCamera(38, 2.4, 0.1, 1000);
const mockCanvas = document.createElement("canvas");

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-r3f-canvas">{children}</div>
  ),
  useThree: () => ({
    camera: mockCamera,
    size: { width: 1200, height: 500 },
    gl: {
      domElement: mockCanvas,
      getContext: () => ({ getExtension: () => null, getParameter: () => "MockGL", RENDERER: 0 }),
      capabilities: { getMaxAnisotropy: () => 4 },
    },
    scene: { environment: null },
  }),
  useFrame: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: React.forwardRef((_props: Record<string, unknown>, _ref) => null),
}));

vi.mock("../../src/three/scene/SceneEnvironment", () => ({
  SceneEnvironment: () => null,
}));

vi.mock("../../src/three/scene/Lighting", () => ({
  Lighting: () => null,
}));

vi.mock("../../src/three/board/BoardMaterials", () => {
  const dummyMat = { dispose: vi.fn() };
  return {
    BoardMaterialsManager: {
      getInstance: () => ({
        cavityMaterial: dummyMat,
        closedPitMaterial: dummyMat,
        brassMaterial: dummyMat,
        walnutMaterial: dummyMat,
        plinthMaterial: dummyMat,
        inlayIvoryMaterial: dummyMat,
        inlaySandstoneMaterial: dummyMat,
        inlaySageMaterial: dummyMat,
        getSeedMaterial: () => dummyMat,
        applyMaxAnisotropy: vi.fn(),
      }),
    },
  };
});

vi.mock("../../src/three/seeds/SeedMaterials", () => {
  const dummyMat = { dispose: vi.fn() };
  return {
    SeedMaterialsManager: {
      getInstance: () => ({
        getMaterial: () => dummyMat,
        dispose: vi.fn(),
      }),
    },
  };
});

describe("3D-Only Board Architecture Suite", () => {
  let originalWebGL: unknown;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let webglAvailable = true;

  beforeEach(() => {
    localStorage.clear();
    webglAvailable = true;
    originalWebGL = (window as unknown as Record<string, unknown>).WebGLRenderingContext;
    originalGetContext = HTMLCanvasElement.prototype.getContext;

    (window as unknown as Record<string, unknown>).WebGLRenderingContext = function WebGLMock() {};
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
      if (webglAvailable && (contextId === "webgl" || contextId === "experimental-webgl")) {
        return {} as RenderingContext;
      }
      return null;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).WebGLRenderingContext = originalWebGL;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("mounts only the 3D board when entering gameplay and never renders a 2D board or view toggle", () => {
    const initialState = createInitialGame("PLAYER_1", "local");
    initialState.pits[0]!.seeds = 0;
    initialState.pits[1]!.seeds = 6;
    initialState.players.player1.roundWins = 2;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="local"
        initialGameState={initialState}
      />
    );

    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.getByTestId("camera-mode-selector")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
    expect(screen.queryByTestId("view-toggle-btn")).not.toBeInTheDocument();
    expect(screen.getByTestId("p1-wins-count")).toHaveTextContent("2");
  });

  it("renders Header action controls without any 2D/3D view switcher button", () => {
    render(
      <Header
        onRestart={vi.fn()}
        onOpenRules={vi.fn()}
        animationSettings={{ enabled: true, speed: "SLOW", stepDelayMs: 450 }}
        onToggleAnimation={vi.fn()}
        onReturnToMenu={vi.fn()}
        gameMode="local"
        playerCount={2}
        isMuted={false}
        onToggleAudio={vi.fn()}
      />
    );

    expect(screen.getByTestId("main-menu-btn")).toBeInTheDocument();
    expect(screen.getByTestId("audio-toggle-btn")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-animation-btn")).toBeInTheDocument();
    expect(screen.getByTestId("rules-btn")).toBeInTheDocument();
    expect(screen.getByTestId("restart-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("view-toggle-btn")).not.toBeInTheDocument();
  });

  it("supports camera modes cleanly across 4-player and 6-player 3D boards without altering state", () => {
    for (const count of [4, 6] as const) {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", count);
      const { unmount } = render(
        <App
          initialScreen="GAME"
          initialGameMode="local"
          initialGameState={state}
        />
      );

      expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
      expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("camera-mode-top"));
      expect(screen.getByTestId("camera-mode-top")).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(screen.getByTestId("camera-mode-orbit"));
      expect(screen.getByTestId("camera-mode-orbit")).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(screen.getByTestId("camera-mode-side"));
      expect(screen.getByTestId("camera-mode-side")).toHaveAttribute("aria-pressed", "true");

      expect(screen.getByTestId(`player-card-${count}`)).toBeInTheDocument();
      unmount();
    }
  });

  it("renders explicit WebGL-unavailable message without falling back to a 2D board", () => {
    webglAvailable = false;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="local"
      />
    );

    const fallback = screen.getByTestId("webgl-fallback");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent("3D Acceleration Unavailable");
    expect(fallback.textContent).not.toMatch(/2D View|2D board/i);
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
  });
});
