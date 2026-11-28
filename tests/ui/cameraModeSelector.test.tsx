/**
 * 3D Camera Mode Selector & Drag-vs-Click Interaction UI Tests
 * Verifies:
 * - Segmented [ Side ] [ Top ] [ 360° ] controls render in Channemane theme.
 * - Selected mode stays highlighted with accurate aria-pressed state.
 * - Mode switching never resets game state or cancels active sowing animations.
 * - Camera selector renders immediately in the 3D-only board with zero 2D toggle.
 * - Dragging >8px over Pit3D suppresses accidental pit click while stationary tap selects normally.
 */

import React from "react";
import * as THREE from "three";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CameraModeSelector } from "../../src/ui/components/CameraModeSelector";
import { Pit3D } from "../../src/three/pits/Pit3D";
import { App } from "../../src/App";
import { createInitialGame } from "../../src/engine/board";
import type { VisualPitState } from "../../src/adapters/engineToVisualState";

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

describe("3D Camera Mode Selector & Interaction Suite", () => {
  let originalWebGL: unknown;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    localStorage.clear();
    originalWebGL = (window as unknown as Record<string, unknown>).WebGLRenderingContext;
    originalGetContext = HTMLCanvasElement.prototype.getContext;

    (window as unknown as Record<string, unknown>).WebGLRenderingContext = function WebGLMock() {};
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
      if (contextId === "webgl" || contextId === "experimental-webgl") {
        return {} as RenderingContext;
      }
      return null;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).WebGLRenderingContext = originalWebGL;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("renders Side, Top, and 360° buttons with active highlighting and invokes onChange", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CameraModeSelector value="SIDE" onChange={onChange} />
    );

    const sideBtn = screen.getByTestId("camera-mode-side");
    const topBtn = screen.getByTestId("camera-mode-top");
    const orbitBtn = screen.getByTestId("camera-mode-orbit");

    expect(sideBtn).toHaveTextContent("Side");
    expect(topBtn).toHaveTextContent("Top");
    expect(orbitBtn).toHaveTextContent("360°");

    expect(sideBtn).toHaveAttribute("aria-pressed", "true");
    expect(topBtn).toHaveAttribute("aria-pressed", "false");
    expect(orbitBtn).toHaveAttribute("aria-pressed", "false");

    // Clicking already-selected Side does not fire redundant callback
    fireEvent.click(sideBtn);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(topBtn);
    expect(onChange).toHaveBeenCalledWith("TOP");

    rerender(<CameraModeSelector value="TOP" onChange={onChange} />);
    expect(topBtn).toHaveAttribute("aria-pressed", "true");
    expect(sideBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(orbitBtn);
    expect(onChange).toHaveBeenCalledWith("ORBIT");
  });

  it("renders camera selector immediately in the 3D-only board with zero 2D toggle and preserves state across mode switches", () => {
    const initialState = createInitialGame("PLAYER_1", "local");
    initialState.pits[0]!.seeds = 0;
    initialState.pits[1]!.seeds = 6;
    initialState.players.player1.storage = 4;
    initialState.players.player1.roundWins = 1;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="local"
        initialGameState={initialState}
      />
    );

    // 3D board & camera selector render immediately with zero 2D board or view toggle
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
    expect(screen.queryByTestId("view-toggle-btn")).not.toBeInTheDocument();

    expect(screen.getByTestId("camera-mode-selector")).toBeInTheDocument();
    expect(screen.getByTestId("camera-mode-side")).toHaveAttribute("aria-pressed", "true");

    // Switch camera modes Top -> 360° -> Side cleanly
    fireEvent.click(screen.getByTestId("camera-mode-top"));
    expect(screen.getByTestId("camera-mode-top")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByTestId("camera-mode-orbit"));
    expect(screen.getByTestId("camera-mode-orbit")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByTestId("camera-mode-side"));
    expect(screen.getByTestId("camera-mode-side")).toHaveAttribute("aria-pressed", "true");

    // Game state remains untouched across camera mode transitions
    expect(screen.getByTestId("turn-status-text")).toHaveTextContent("PLAYER 1'S TURN");
    expect(screen.getByTestId("p1-wins-count")).toHaveTextContent("1");
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
  });

  it("blocks Pit3D click when pointer dragged past 8px threshold while allowing stationary tap", () => {
    const pitState: VisualPitState = {
      pitId: 2,
      owner: "PLAYER_1",
      seeds: 5,
      status: "OPEN",
      bonusAvailable: false,
      isSelectable: true,
      isActiveDrop: false,
      isContinuationTarget: false,
      isCaptureTarget: false,
      isClaimableBonus: false,
      row: "top",
      columnIndex: 2,
    };

    const onSelectPit = vi.fn();
    const onClaimBonus = vi.fn();

    const { container } = render(
      <Pit3D
        pitState={pitState}
        playerCount={2}
        onSelectPit={onSelectPit}
        onClaimBonus={onClaimBonus}
        isInteractable={true}
      />
    );

    // Verify no PitCount3D sprite label exists inside Pit3D
    expect(container.querySelector("sprite")).toBeNull();

    const hitbox = container.querySelector('[name="pit-2-hitbox"]') as HTMLElement;
    expect(hitbox).not.toBeNull();

    // Drag gesture (>8px) must NOT select pit on click
    fireEvent.pointerDown(hitbox, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(hitbox, { clientX: 124, clientY: 102 });
    fireEvent.pointerUp(hitbox, { clientX: 124, clientY: 102 });
    fireEvent.click(hitbox, { clientX: 124, clientY: 102 });
    expect(onSelectPit).not.toHaveBeenCalled();

    // Clean stationary tap MUST select pit
    fireEvent.pointerDown(hitbox, { clientX: 140, clientY: 140, button: 0 });
    fireEvent.pointerMove(hitbox, { clientX: 142, clientY: 141 });
    fireEvent.pointerUp(hitbox, { clientX: 142, clientY: 141 });
    fireEvent.click(hitbox, { clientX: 142, clientY: 141 });
    expect(onSelectPit).toHaveBeenCalledTimes(1);
    expect(onSelectPit).toHaveBeenCalledWith(2);
  });
});
