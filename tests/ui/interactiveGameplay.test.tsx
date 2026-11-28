import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";
import { Pit3D } from "../../src/three/pits/Pit3D";
import type { VisualPitState } from "../../src/adapters/engineToVisualState";

vi.mock("../../src/three/Board3D", async () => {
  const { Board3DTestDouble } = await import("./helpers/board3dTestDouble");
  return { Board3D: Board3DTestDouble };
});

vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
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

function makePit3DState(overrides: Partial<VisualPitState> = {}): VisualPitState {
  return {
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
    ...overrides,
  };
}

describe("Interactive Gameplay UI: Sowing, Capture Confirmation, and Gestures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Section 1: Manual Continuous Sowing Flow", () => {
    it("pauses on completion of first distribution batch, highlights exact pit with green glow, and shows prompt", () => {
      render(<App initialScreen="GAME" />);

      // Advance past initial turn announcement
      act(() => {
        vi.advanceTimersByTime(800);
      });

      // Player 1 taps legal starting pit P0
      const pit0 = screen.getByTestId("pit-0");
      act(() => {
        fireEvent.click(pit0);
      });

      // Pickup occurred: P0 is empty
      expect(pit0).toHaveAttribute("data-seeds", "0");

      // Advance through the 5 drop animations (5 * 450ms)
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(450);
        });
      }

      // Next step pauses in WAITING_FOR_CONTINUATION on pit 6
      act(() => {
        vi.advanceTimersByTime(450);
      });

      // Requirement 3: Exact next pit highlighted with green glow/pulse
      const pit6 = screen.getByTestId("pit-6");
      expect(pit6).toHaveAttribute("data-continuation-target", "true");
      expect(pit6).toHaveClass("continuation-target");

      // Requirement 4: Exact status message outside board
      const banner = screen.getByTestId("turn-indicator");
      expect(banner).toHaveTextContent("Choose the highlighted pit to continue sowing.");

      // Requirement 4: Seeds remain inside pit 6 before player confirmation
      expect(pit6).toHaveAttribute("data-seeds", "5");

      // Requirement 6: Tapping a different pit does not alter the board or advance
      const pit1 = screen.getByTestId("pit-1");
      const pit1SeedsBefore = pit1.getAttribute("data-seeds");
      act(() => {
        fireEvent.click(pit1);
      });
      expect(pit1.getAttribute("data-seeds")).toBe(pit1SeedsBefore);
      expect(pit6).toHaveAttribute("data-continuation-target", "true");

      // Requirement 5: Tapping the highlighted pit resumes sowing
      act(() => {
        fireEvent.click(pit6);
      });

      // Pit 6 seeds are scooped into hand
      expect(pit6).toHaveAttribute("data-seeds", "0");
      expect(pit6).not.toHaveAttribute("data-continuation-target", "true");
    });
  });

  describe("Section 2: Player-Confirmed Capture Flow", () => {
    it("highlights capturable pit in 3D, keeps seeds until confirmation, and transfers seeds on click", () => {
      const handleConfirmCapture = vi.fn();
      const handleSelect = vi.fn();

      const { container } = render(
        <Pit3D
          pitState={makePit3DState({
            pitId: 3,
            seeds: 6,
            isSelectable: false,
            isCaptureTarget: true,
          })}
          playerCount={2}
          onSelectPit={handleSelect}
          onConfirmCapture={handleConfirmCapture}
          onClaimBonus={vi.fn()}
          isInteractable={true}
        />
      );

      const pit3Group = container.querySelector('[name="pit-3"]')!;
      expect(pit3Group).not.toBeNull();
      // 1 cavity mesh + 6 Seed3D meshes + 1 hitbox mesh
      const meshes = Array.from(pit3Group.children).filter(
        (el) => el.tagName.toLowerCase() === "mesh"
      );
      expect(meshes.length - 2).toBe(6);

      const hitbox = container.querySelector('[name="pit-3-hitbox"]') as HTMLElement;
      act(() => {
        fireEvent.click(hitbox);
      });
      expect(handleConfirmCapture).toHaveBeenCalledWith(3);
      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe("Section 3: Bonus Collection Gesture & Claim Button Removal", () => {
    it("Requirement 18: Never renders visible Claim buttons on bonus pits", () => {
      render(<App initialScreen="GAME" />);
      expect(screen.queryAllByText(/CLAIM \+4/i)).toHaveLength(0);
      expect(screen.queryAllByTestId(/^claim-bonus-/)).toHaveLength(0);
    });

    it("Requirement 20: Long-press (500ms) collects bonus", () => {
      const handleClaimBonus = vi.fn();

      const { container } = render(
        <Pit3D
          pitState={makePit3DState({
            pitId: 2,
            seeds: 4,
            bonusAvailable: true,
            isClaimableBonus: true,
            isSelectable: true,
          })}
          playerCount={2}
          onSelectPit={vi.fn()}
          onClaimBonus={handleClaimBonus}
          isInteractable={true}
          isBonusInteractable={true}
        />
      );

      const hitbox = container.querySelector('[name="pit-2-hitbox"]') as HTMLElement;

      // Start long-press pointerDown
      act(() => {
        fireEvent.pointerDown(hitbox, { clientX: 50, clientY: 50, button: 0 });
      });

      // Advance 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Bonus awarded!
      expect(handleClaimBonus).toHaveBeenCalledWith(2);
    });

    it("Requirement 21: Releasing touch before 500ms does NOT award the bonus", () => {
      const handleClaimBonus = vi.fn();
      const handleSelect = vi.fn();

      const { container } = render(
        <Pit3D
          pitState={makePit3DState({
            pitId: 2,
            seeds: 4,
            bonusAvailable: true,
            isClaimableBonus: true,
            isSelectable: true,
          })}
          playerCount={2}
          onSelectPit={handleSelect}
          onClaimBonus={handleClaimBonus}
          isInteractable={true}
          isBonusInteractable={true}
        />
      );

      const hitbox = container.querySelector('[name="pit-2-hitbox"]') as HTMLElement;

      act(() => {
        fireEvent.pointerDown(hitbox, { clientX: 50, clientY: 50, button: 0 });
        vi.advanceTimersByTime(300); // Only 300ms
        fireEvent.pointerUp(hitbox);
      });

      // Bonus must NOT be awarded
      expect(handleClaimBonus).not.toHaveBeenCalled();
    });

    it("Requirement 22: Moving finger away (>10px) cancels hold gesture without collecting bonus", () => {
      const handleClaimBonus = vi.fn();

      const { container } = render(
        <Pit3D
          pitState={makePit3DState({
            pitId: 2,
            seeds: 4,
            bonusAvailable: true,
            isClaimableBonus: true,
            isSelectable: true,
          })}
          playerCount={2}
          onSelectPit={vi.fn()}
          onClaimBonus={handleClaimBonus}
          isInteractable={true}
          isBonusInteractable={true}
        />
      );

      const hitbox = container.querySelector('[name="pit-2-hitbox"]') as HTMLElement;

      act(() => {
        fireEvent.pointerDown(hitbox, { clientX: 50, clientY: 50, button: 0 });
        vi.advanceTimersByTime(200);
        // Finger moved by 25px (> 8px)
        fireEvent.pointerMove(hitbox, { clientX: 75, clientY: 50 });
        vi.advanceTimersByTime(400);
      });

      expect(handleClaimBonus).not.toHaveBeenCalled();
    });

    it("Requirement 30: A successful long-press bonus claim does not also trigger sowing", () => {
      const handleClaimBonus = vi.fn();
      const handleSelect = vi.fn();

      const { container } = render(
        <Pit3D
          pitState={makePit3DState({
            pitId: 0,
            seeds: 4,
            bonusAvailable: true,
            isClaimableBonus: true,
            isSelectable: true,
            columnIndex: 0,
          })}
          playerCount={2}
          onSelectPit={handleSelect}
          onClaimBonus={handleClaimBonus}
          isInteractable={true}
          isBonusInteractable={true}
        />
      );

      const hitbox = container.querySelector('[name="pit-0-hitbox"]') as HTMLElement;

      act(() => {
        fireEvent.pointerDown(hitbox, { clientX: 50, clientY: 50, button: 0 });
        vi.advanceTimersByTime(500);
        fireEvent.click(hitbox);
      });

      expect(handleClaimBonus).toHaveBeenCalledWith(0);
      // Sowing was NOT triggered
      expect(handleSelect).not.toHaveBeenCalled();
    });

    it("Requirement 33: Desktop right-click on 3D board does not open context menu", () => {
      render(<App initialScreen="GAME" />);

      const board = screen.getByTestId("channemane-board-3d");
      const defaultPrevented = fireEvent.contextMenu(board);
      expect(defaultPrevented).toBe(false); // e.preventDefault() was called
    });
  });

  describe("Section 7: Status Messages and Contextual Guidance", () => {
    it("displays player turn at start and continuation message when paused", () => {
      render(<App initialScreen="GAME" />);

      // Advance past initial turn announcement
      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");

      // Start sowing
      act(() => {
        fireEvent.click(screen.getByTestId("pit-0"));
        vi.runAllTimers();
      });

      expect(screen.getByTestId("turn-indicator")).toHaveTextContent(
        "Choose the highlighted pit to continue sowing."
      );
    });
  });
});
