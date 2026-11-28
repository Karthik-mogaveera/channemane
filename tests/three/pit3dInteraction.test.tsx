/**
 * 3D Pit Interaction & Rendering Tests (Migrated from legacy 2D Pit tests)
 * Verifies:
 * - Physical 3D seed mesh count without floating PitCount3D labels or Claim buttons.
 * - Stationary pit selection click vs non-selectable guard.
 * - Closed-pit carved walnut stopper rendering & interaction lock.
 * - 500ms long-press & right-click bonus claiming (including during active sowing).
 * - >8px drag cancellation & click suppression.
 * - Continuation & capture target confirmation and isInteractable lock.
 */

import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { Pit3D } from "../../src/three/pits/Pit3D";
import type { VisualPitState } from "../../src/adapters/engineToVisualState";

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

function makePitState(overrides: Partial<VisualPitState> = {}): VisualPitState {
  return {
    pitId: 3,
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
    columnIndex: 3,
    ...overrides,
  };
}

describe("Pit3D Interaction & Physical Seed Rendering Suite", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders physical 3D seed meshes matching seed count without floating count labels or Claim buttons", () => {
    for (const count of [0, 1, 4, 5, 10]) {
      const { container, unmount } = render(
        <Pit3D
          pitState={makePitState({ seeds: count, bonusAvailable: count === 4 })}
          playerCount={2}
          onSelectPit={vi.fn()}
          onClaimBonus={vi.fn()}
          isInteractable={true}
        />
      );

      expect(container.querySelector('[name="pit-3"]')).not.toBeNull();
      // No floating PitCount3D sprites or Claim buttons
      expect(container.querySelector("sprite")).toBeNull();
      expect(container.textContent).not.toMatch(/CLAIM \+4/i);

      // Seed3D renders 1 <mesh> per seed; pit-3 contains 1 cavity mesh + count Seed3D meshes + 1 hitbox mesh
      const pitGroup = container.querySelector('[name="pit-3"]')!;
      const directMeshes = Array.from(pitGroup.children).filter(
        (el) => el.tagName.toLowerCase() === "mesh"
      );
      expect(directMeshes.length - 2).toBe(count);
      unmount();
    }
  });

  it("triggers onSelectPit on stationary click when selectable and blocks when non-selectable", () => {
    const onSelect = vi.fn();
    const onClaim = vi.fn();

    const { container, rerender } = render(
      <Pit3D
        pitState={makePitState({ pitId: 0, isSelectable: true })}
        playerCount={2}
        onSelectPit={onSelect}
        onClaimBonus={onClaim}
        isInteractable={true}
      />
    );

    const hitbox = container.querySelector('[name="pit-0-hitbox"]') as HTMLElement;
    fireEvent.pointerDown(hitbox, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerUp(hitbox, { clientX: 50, clientY: 50 });
    fireEvent.click(hitbox, { clientX: 50, clientY: 50 });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(0);

    onSelect.mockClear();

    rerender(
      <Pit3D
        pitState={makePitState({ pitId: 7, owner: "PLAYER_2", isSelectable: false })}
        playerCount={2}
        onSelectPit={onSelect}
        onClaimBonus={onClaim}
        isInteractable={true}
      />
    );

    const nonSelectableHitbox = container.querySelector('[name="pit-7-hitbox"]') as HTMLElement;
    fireEvent.click(nonSelectableHitbox);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders carved walnut closed stopper and blocks selection, bonus, and clicks when CLOSED", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    const onClaim = vi.fn();

    const { container } = render(
      <Pit3D
        pitState={makePitState({
          pitId: 6,
          seeds: 0,
          status: "CLOSED",
          isSelectable: false,
          bonusAvailable: false,
          isClaimableBonus: false,
        })}
        playerCount={2}
        onSelectPit={onSelect}
        onClaimBonus={onClaim}
        isInteractable={true}
        isBonusInteractable={true}
      />
    );

    expect(container.querySelector('[name="pit-6-closed-stopper"]')).not.toBeNull();

    const hitbox = container.querySelector('[name="pit-6-hitbox"]') as HTMLElement;
    fireEvent.pointerDown(hitbox, { clientX: 10, clientY: 10, button: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.click(hitbox);
    fireEvent.contextMenu(hitbox);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClaim).not.toHaveBeenCalled();
  });

  it("claims 4-seed bonus via right-click and 500ms long-press, including while sowing locks isInteractable", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    const onClaim = vi.fn();

    const bonusPit = makePitState({
      pitId: 2,
      seeds: 4,
      bonusAvailable: true,
      isClaimableBonus: true,
      isSelectable: false,
    });

    const { container, rerender } = render(
      <Pit3D
        pitState={bonusPit}
        playerCount={2}
        onSelectPit={onSelect}
        onClaimBonus={onClaim}
        isInteractable={false}
        isBonusInteractable={true}
      />
    );

    const hitbox = container.querySelector('[name="pit-2-hitbox"]') as HTMLElement;

    // Right-click bonus claim works independently during sowing
    act(() => {
      fireEvent.contextMenu(hitbox);
    });
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(onClaim).toHaveBeenCalledWith(2);
    expect(onSelect).not.toHaveBeenCalled();

    // Reset bonus lock by cycling claimability then re-enabling
    onClaim.mockClear();
    rerender(
      <Pit3D
        pitState={makePitState({ pitId: 2, seeds: 4, bonusAvailable: false, isClaimableBonus: false })}
        playerCount={2}
        onSelectPit={onSelect}
        onClaimBonus={onClaim}
        isInteractable={false}
        isBonusInteractable={true}
      />
    );
    rerender(
      <Pit3D
        pitState={bonusPit}
        playerCount={2}
        onSelectPit={onSelect}
        onClaimBonus={onClaim}
        isInteractable={false}
        isBonusInteractable={true}
      />
    );

    // Early release (< 500ms) must not fire hold timer prematurely, and dragging > 8px cancels hold
    act(() => {
      fireEvent.pointerDown(hitbox, { clientX: 100, clientY: 100, button: 0 });
      vi.advanceTimersByTime(300);
      fireEvent.pointerMove(hitbox, { clientX: 120, clientY: 100 });
      vi.advanceTimersByTime(300);
    });
    expect(onClaim).not.toHaveBeenCalled();
    fireEvent.pointerUp(hitbox);

    // Complete 500ms stationary long-press fires bonus claim
    act(() => {
      fireEvent.pointerDown(hitbox, { clientX: 100, clientY: 100, button: 0 });
      vi.advanceTimersByTime(500);
    });
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(onClaim).toHaveBeenCalledWith(2);
    fireEvent.click(hitbox);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("handles continuation and capture targets and respects isInteractable animation lock", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    const onContinuation = vi.fn();
    const onCapture = vi.fn();
    const onClaim = vi.fn();

    const { container, rerender } = render(
      <Pit3D
        pitState={makePitState({
          pitId: 4,
          isSelectable: false,
          isContinuationTarget: true,
        })}
        playerCount={2}
        onSelectPit={onSelect}
        onConfirmContinuation={onContinuation}
        onConfirmCapture={onCapture}
        onClaimBonus={onClaim}
        isInteractable={true}
      />
    );

    const hitbox = container.querySelector('[name="pit-4-hitbox"]') as HTMLElement;
    fireEvent.click(hitbox);
    expect(onContinuation).toHaveBeenCalledWith(4);
    expect(onSelect).not.toHaveBeenCalled();

    // Advance past Pit3D 160ms double-trigger guard before next click
    vi.advanceTimersByTime(200);

    rerender(
      <Pit3D
        pitState={makePitState({
          pitId: 5,
          isSelectable: false,
          isCaptureTarget: true,
        })}
        playerCount={2}
        onSelectPit={onSelect}
        onConfirmContinuation={onContinuation}
        onConfirmCapture={onCapture}
        onClaimBonus={onClaim}
        isInteractable={true}
      />
    );

    const captureHitbox = container.querySelector('[name="pit-5-hitbox"]') as HTMLElement;
    fireEvent.click(captureHitbox);
    expect(onCapture).toHaveBeenCalledWith(5);

    // Animation lock (isInteractable=false) blocks selection, continuation, and capture
    onSelect.mockClear();
    onContinuation.mockClear();
    onCapture.mockClear();

    rerender(
      <Pit3D
        pitState={makePitState({
          pitId: 1,
          isSelectable: true,
          isContinuationTarget: true,
          isCaptureTarget: true,
        })}
        playerCount={2}
        onSelectPit={onSelect}
        onConfirmContinuation={onContinuation}
        onConfirmCapture={onCapture}
        onClaimBonus={onClaim}
        isInteractable={false}
      />
    );

    const lockedHitbox = container.querySelector('[name="pit-1-hitbox"]') as HTMLElement;
    fireEvent.click(lockedHitbox);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onContinuation).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });
});
