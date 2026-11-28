import { test, expect, type Page } from "@playwright/test";
import * as THREE from "three";

type CameraMode = "SIDE" | "TOP" | "ORBIT";
type PlayerCount = 2 | 3;

const CAMERA_FOV_DEG = 38;
const SIDE_ELEVATION_RAD = Math.PI / 4.2;
const TOP_VIEW_Z_EPSILON = 0.001;

// Pit world XZ coordinates (mirroring src/three/config/boardVisualConfigs.ts)
// with y = 0.1 matching PitGeometry clickTargetGeometry cylinder center.
const PIT_COORDS_2P: Record<number, [number, number, number]> = {
  0: [-5.7, 0.1, -1.25],
  1: [-3.8, 0.1, -1.25],
  2: [-1.9, 0.1, -1.25],
  3: [0.0, 0.1, -1.25],
  4: [1.9, 0.1, -1.25],
  5: [3.8, 0.1, -1.25],
  6: [5.7, 0.1, -1.25],
  7: [5.7, 0.1, 1.25],
  8: [3.8, 0.1, 1.25],
  9: [1.9, 0.1, 1.25],
  10: [0.0, 0.1, 1.25],
  11: [-1.9, 0.1, 1.25],
  12: [-3.8, 0.1, 1.25],
  13: [-5.7, 0.1, 1.25],
};

const COLS_X_3P = [-4.65, -2.75, -0.85, 1.05, 2.95];
const PIT_COORDS_3P: Record<number, [number, number, number]> = {
  0: [COLS_X_3P[0]!, 0.1, -2.3],
  1: [COLS_X_3P[1]!, 0.1, -2.3],
  2: [COLS_X_3P[2]!, 0.1, -2.3],
  3: [COLS_X_3P[3]!, 0.1, -2.3],
  4: [COLS_X_3P[4]!, 0.1, -2.3],
  9: [COLS_X_3P[0]!, 0.1, 0.0],
  8: [COLS_X_3P[1]!, 0.1, 0.0],
  7: [COLS_X_3P[2]!, 0.1, 0.0],
  6: [COLS_X_3P[3]!, 0.1, 0.0],
  5: [COLS_X_3P[4]!, 0.1, 0.0],
  10: [COLS_X_3P[0]!, 0.1, 2.3],
  11: [COLS_X_3P[1]!, 0.1, 2.3],
  12: [COLS_X_3P[2]!, 0.1, 2.3],
  13: [COLS_X_3P[3]!, 0.1, 2.3],
  14: [COLS_X_3P[4]!, 0.1, 2.3],
};

function computeCameraPosition(
  mode: CameraMode,
  playerCount: PlayerCount,
  aspect: number
): [number, number, number] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.25 ? aspect : 16 / 9;
  const width = 18.2;
  const depth = playerCount === 3 ? 7.4 : 4.8;

  if (mode === "TOP") {
    const halfVFov = THREE.MathUtils.degToRad(CAMERA_FOV_DEG * 0.5);
    const tanV = Math.tan(halfVFov);
    const tanH = tanV * safeAspect;
    const margin = 1.14;
    const distance = Math.max((depth * 0.5 * margin) / tanV, (width * 0.5 * margin) / tanH);
    return [0, distance, TOP_VIEW_Z_EPSILON];
  }

  let distance: number;
  if (playerCount === 2) {
    distance = safeAspect < 1.7 ? 14.5 : safeAspect < 2.0 ? 13.0 : 12.0;
  } else {
    const widthScale = width / 18.2;
    const depthFactor = 1.24;
    const aspectBoost = safeAspect < 1.7 ? 1.2 : safeAspect < 2.0 ? 1.08 : 1.0;
    distance = 12.0 * Math.max(widthScale, depthFactor) * aspectBoost;
  }

  return [0, distance * Math.sin(SIDE_ELEVATION_RAD), distance * Math.cos(SIDE_ELEVATION_RAD)];
}

async function waitFor3DBoardReady(page: Page) {
  await expect(page.getByTestId("channemane-board-3d")).toBeVisible();
  await expect(page.getByTestId("channemane-board")).toHaveCount(0);
  await expect(page.getByTestId("view-toggle-btn")).toHaveCount(0);
  await expect(page.getByTestId("camera-mode-selector")).toBeVisible();

  const canvas = page.locator('[data-testid="board-3d-canvas-stage"] canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(200);
  expect(box!.height).toBeGreaterThan(200);
  // Allow first WebGL render pass & initial camera snap
  await page.waitForTimeout(250);
}

async function clickPit3D(
  page: Page,
  pitId: number,
  options: { mode?: CameraMode; playerCount?: PlayerCount } = {}
) {
  const mode = options.mode ?? "SIDE";
  const playerCount = options.playerCount ?? 2;
  const world = playerCount === 3 ? PIT_COORDS_3P[pitId] : PIT_COORDS_2P[pitId];
  if (!world) throw new Error(`No 3D coordinate defined for pit ${pitId} (${playerCount}P)`);

  const canvas = page.locator('[data-testid="board-3d-canvas-stage"] canvas');
  const box = await canvas.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error("3D canvas bounding box is missing or zero-sized");
  }

  const aspect = box.width / box.height;
  const camPos = computeCameraPosition(mode, playerCount, aspect);
  const cam = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, aspect, 0.1, 1000);
  cam.position.set(camPos[0], camPos[1], camPos[2]);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();

  const ndc = new THREE.Vector3(world[0], world[1], world[2]).project(cam);
  const screenX = box.x + (ndc.x * 0.5 + 0.5) * box.width;
  const screenY = box.y + (-ndc.y * 0.5 + 0.5) * box.height;

  await page.mouse.click(screenX, screenY);
}

test.describe("Channemane 3D-Only Board — Playwright E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const localBtn = page.getByTestId("menu-btn-local");
    await localBtn.waitFor({ state: "visible", timeout: 5000 });
    await localBtn.click();
    const p2Btn = page.getByTestId("player-count-btn-2");
    await p2Btn.waitFor({ state: "visible", timeout: 5000 });
    await p2Btn.click();

    await waitFor3DBoardReady(page);
    await page.evaluate(() => document.fonts.ready);

    // Wait for initial turn notification popup to clear so 3D pits are interactive
    await page.waitForTimeout(850);
  });

  test("Positive 1: Game loads directly into 3D board with WebGL canvas, camera controls, and zero 2D legacy elements", async ({
    page,
  }) => {
    await expect(page.getByRole("banner")).toContainText("CHANNEMANE");
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");
    await expect(page.getByTestId("round-indicator")).toContainText("Round 1");

    // 3D-only board guarantees: 3D container + WebGL canvas + camera selector; zero 2D board or toggle
    await expect(page.getByTestId("channemane-board-3d")).toBeVisible();
    await expect(page.getByTestId("channemane-board")).toHaveCount(0);
    await expect(page.getByTestId("view-toggle-btn")).toHaveCount(0);
    await expect(page.locator('[data-testid^="pit-count-"]')).toHaveCount(0);

    await expect(page.getByTestId("camera-mode-side")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("camera-mode-top")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("camera-mode-orbit")).toHaveAttribute("aria-pressed", "false");

    const p1Card = page.getByTestId("player-card-1");
    const p2Card = page.getByTestId("player-card-2");
    await expect(p1Card).toContainText("Round Wins:");
    await expect(p1Card).not.toContainText("Captured:");
    await expect(p2Card).toContainText("Round Wins:");
  });

  test("Positive 2: Camera modes switch cleanly (Side -> Top -> 360° Orbit -> Side) without resetting turn", async ({
    page,
  }) => {
    const canvas = page.locator('[data-testid="board-3d-canvas-stage"] canvas');

    await page.getByTestId("camera-mode-top").click();
    await expect(page.getByTestId("camera-mode-top")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("camera-mode-side")).toHaveAttribute("aria-pressed", "false");

    await page.getByTestId("camera-mode-orbit").click();
    await expect(page.getByTestId("camera-mode-orbit")).toHaveAttribute("aria-pressed", "true");

    // Perform an orbit drag gesture across canvas without breaking state
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.45, { steps: 6 });
    await page.mouse.up();

    await page.getByTestId("camera-mode-side").click();
    await expect(page.getByTestId("camera-mode-side")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");
    await expect(canvas).toBeVisible();
  });

  test("Positive 3: Clicking a 3D pit on WebGL canvas starts sowing, pauses for continuation, and resumes on confirmation", async ({
    page,
  }) => {
    // Enable Fast Mode for rapid animated stepping
    await page.getByTestId("toggle-animation-btn").click();
    await expect(page.getByTestId("toggle-animation-btn")).toContainText("Fast Mode");

    // Click P0 via 3D raycast projection in default SIDE view
    await clickPit3D(page, 0, { mode: "SIDE", playerCount: 2 });

    // Prompts for continuation on Pit 6
    const turnIndicator = page.getByTestId("turn-indicator");
    await expect(turnIndicator).toContainText(
      "Choose the highlighted pit to continue sowing.",
      { timeout: 10000 }
    );

    // Confirm continuation by clicking projected 3D Pit 6
    await clickPit3D(page, 6, { mode: "SIDE", playerCount: 2 });

    // Sowing resumes (moves past continuation wait to sowing / next prompt / Player 2 turn)
    await expect(turnIndicator).not.toHaveText("Choose the highlighted pit to continue sowing.", {
      timeout: 5000,
    });
  });

  test("Positive 4: Rules dialog opens, displays current Channemane rules, and closes cleanly", async ({
    page,
  }) => {
    await page.getByTestId("rules-btn").click();

    const rulesModal = page.getByTestId("rules-modal");
    await expect(rulesModal).toBeVisible();
    await expect(rulesModal).toContainText("How to Play Channemane");
    await expect(rulesModal).toContainText("1. The Game Board");
    await expect(rulesModal).toContainText("4. Capturing Seeds");
    await expect(rulesModal).toContainText("7. Opening Pits for the Next Round");

    await page.getByTestId("close-rules-btn").click();
    await expect(rulesModal).not.toBeVisible();
  });

  test("Positive 5: New Game button resets active 3D match back to Player 1 Round 1", async ({
    page,
  }) => {
    await page.getByTestId("toggle-animation-btn").click();
    await clickPit3D(page, 0, { mode: "SIDE", playerCount: 2 });
    await expect(page.getByTestId("turn-indicator")).toContainText(
      "Choose the highlighted pit to continue sowing.",
      { timeout: 10000 }
    );

    await page.getByTestId("restart-btn").click();

    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");
    await expect(page.getByTestId("round-indicator")).toContainText("Round 1");
    await expect(page.getByTestId("channemane-board-3d")).toBeVisible();
  });

  test("Negative 1 & 2: Clicking opponent pits during Player 1 turn has no effect and rapid double-clicks stay safe", async ({
    page,
  }) => {
    // Player 2 pit 10 should be ignored during Player 1 turn
    await clickPit3D(page, 10, { mode: "SIDE", playerCount: 2 });
    await page.waitForTimeout(300);
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");

    // Rapid repeated clicks on Pit 1 in TOP mode do not corrupt state
    await page.getByTestId("camera-mode-top").click();
    await page.waitForTimeout(700);
    await page.getByTestId("toggle-animation-btn").click();

    const box = (await page.locator('[data-testid="board-3d-canvas-stage"] canvas').boundingBox())!;
    const camPos = computeCameraPosition("TOP", 2, box.width / box.height);
    const cam = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, box.width / box.height, 0.1, 1000);
    cam.position.set(camPos[0], camPos[1], camPos[2]);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const p1 = PIT_COORDS_2P[1]!;
    const ndc = new THREE.Vector3(p1[0], p1[1], p1[2]).project(cam);
    await page.mouse.dblclick(
      box.x + (ndc.x * 0.5 + 0.5) * box.width,
      box.y + (-ndc.y * 0.5 + 0.5) * box.height
    );

    await expect(page.getByTestId("channemane-board-3d")).toBeVisible();
  });

  test("Header Audio & Speed toggles operate cleanly in the 3D UI", async ({ page }) => {
    const speedBtn = page.getByTestId("toggle-animation-btn");
    await expect(speedBtn).toContainText("Slow Mode");
    await speedBtn.click();
    await expect(speedBtn).toContainText("Fast Mode");
    await speedBtn.click();
    await expect(speedBtn).toContainText("Slow Mode");

    const audioBtn = page.getByTestId("audio-toggle-btn");
    await expect(audioBtn).toContainText("Sound");
    await audioBtn.click();
    await expect(audioBtn).toContainText("Muted");
    await audioBtn.click();
    await expect(audioBtn).toContainText("Sound");
  });

  test("Responsive layout: 3D board renders cleanly on mobile viewport without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("channemane-board-3d")).toBeVisible();
    await expect(page.getByTestId("camera-mode-selector")).toBeVisible();
    await expect(page.locator('[data-testid="board-3d-canvas-stage"] canvas')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});

test.describe("Main Menu, AI Modes, 2P-6P Multiplayer & Mode Switching E2E", () => {
  test("E2E Scenario 1: Initial visit displays Main Menu with no board open", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("main-menu")).toBeVisible();
    await expect(page.getByTestId("menu-btn-ai")).toBeVisible();
    await expect(page.getByTestId("menu-btn-local")).toBeVisible();
    await expect(page.getByTestId("menu-btn-rules")).toBeVisible();

    await expect(page.getByTestId("channemane-board-3d")).toHaveCount(0);
    await expect(page.getByTestId("channemane-board")).toHaveCount(0);
  });

  test("E2E Scenario 2 & 3: Play with AI Difficulty Selection and Master Mode launch into 3D", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-ai").click();
    await expect(page.getByTestId("difficulty-select")).toBeVisible();
    await expect(page.getByTestId("difficulty-btn-beginner")).toBeVisible();
    await expect(page.getByTestId("difficulty-btn-expert")).toBeVisible();
    await expect(page.getByTestId("difficulty-btn-master")).toBeVisible();

    await page.getByTestId("difficulty-btn-back").click();
    await expect(page.getByTestId("main-menu")).toBeVisible();

    await page.getByTestId("menu-btn-ai").click();
    await page.getByTestId("difficulty-btn-master").click();
    await expect(page.getByTestId("first-player-modal")).toBeVisible();
    await page.getByTestId("first-player-player-btn").click();

    await waitFor3DBoardReady(page);
    await expect(page.getByTestId("game-mode-tag")).toContainText("AI (MASTER)");
  });

  for (const count of [2, 3, 4, 5, 6] as const) {
    test(`E2E Scenario 4 (${count}P): Local Multiplayer ${count} Players launches directly into the 3D board`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByTestId("menu-btn-local").click();
      await expect(page.getByTestId("multiplayer-select")).toBeVisible();
      await page.getByTestId(`player-count-btn-${count}`).click();

      await waitFor3DBoardReady(page);
      await expect(page.getByTestId("game-mode-tag")).toContainText(`LOCAL ${count}P`);
      for (let p = 1; p <= count; p++) {
        await expect(page.getByTestId(`player-card-${p}`)).toBeVisible();
      }
    });
  }

  test("E2E Scenario 5 & 6: Rules from Main Menu and Menu return reset cleanly", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-rules").click();
    await expect(page.getByTestId("rules-modal")).toBeVisible();
    await page.getByTestId("rules-back-btn").click();
    await expect(page.getByTestId("main-menu")).toBeVisible();

    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-2").click();
    await waitFor3DBoardReady(page);

    await page.getByTestId("main-menu-btn").click();
    await expect(page.getByTestId("main-menu")).toBeVisible();
    await expect(page.getByTestId("channemane-board-3d")).toHaveCount(0);
  });

  test("E2E Scenario 7: Beginner AI responds automatically after human completes 3D turn", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto("/");

    await page.getByTestId("menu-btn-ai").click();
    await page.getByTestId("difficulty-btn-beginner").click();
    await page.getByTestId("first-player-player-btn").click();

    await waitFor3DBoardReady(page);
    await expect(page.getByTestId("game-mode-tag")).toContainText("AI (BEGINNER)");

    await page.getByTestId("toggle-animation-btn").click();
    const openPopup = page.getByTestId("turn-notification-popup");
    if (await openPopup.isVisible().catch(() => false)) {
      await openPopup.click({ force: true }).catch(() => {});
    }
    await expect(openPopup).toBeHidden({ timeout: 5000 });

    // Authoritative 2P Pit 0 decision sequence: Start(0) -> Cont(6) -> Cont(12) -> Cont(4) -> Cont(11) -> Capture(5)
    await clickPit3D(page, 0, { mode: "SIDE", playerCount: 2 });

    const continuationTargets = [6, 12, 4, 11];
    for (const targetPit of continuationTargets) {
      await expect(page.getByTestId("turn-indicator")).toContainText(
        "Choose the highlighted pit to continue sowing.",
        { timeout: 15000 }
      );
      await clickPit3D(page, targetPit, { mode: "SIDE", playerCount: 2 });
    }

    await expect(page.getByTestId("turn-indicator")).toContainText(
      "Tap the highlighted pit to collect its seeds.",
      { timeout: 15000 }
    );
    await clickPit3D(page, 5, { mode: "SIDE", playerCount: 2 });

    // AI automatically takes Player 2 turn and returns control to Player 1
    await expect(page.getByTestId("turn-banner")).toContainText("PLAYER 2", { timeout: 15000 });
    await expect(page.getByTestId("turn-banner")).toContainText("PLAYER 1'S TURN", {
      timeout: 90000,
    });
  });

  test("E2E Scenario 8: Mode Switching Cycle (3P -> AI -> 3P) isolates board configuration", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/");

    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();
    await waitFor3DBoardReady(page);
    await expect(page.getByTestId("player-card-3")).toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("LOCAL 3P");

    await page.getByTestId("main-menu-btn").click();
    await page.getByTestId("menu-btn-ai").click();
    await page.getByTestId("difficulty-btn-beginner").click();
    await page.getByTestId("first-player-player-btn").click();

    await waitFor3DBoardReady(page);
    await expect(page.getByTestId("player-card-3")).toHaveCount(0);
    await expect(page.getByTestId("game-mode-tag")).toContainText("AI (BEGINNER)");

    await page.getByTestId("main-menu-btn").click();
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();

    await waitFor3DBoardReady(page);
    await expect(page.getByTestId("player-card-3")).toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("LOCAL 3P");
  });

  test("E2E Scenario 9 & 10: Turn announcement popups appear in 2P & 3P and dismiss cleanly", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-2").click();

    const popup2P = page.getByTestId("turn-notification-popup");
    await expect(popup2P).toContainText("Player 1", { timeout: 5000 });
    if (await popup2P.isVisible().catch(() => false)) {
      await popup2P.click({ force: true, timeout: 1000 }).catch(() => {});
    }
    await expect(popup2P).toBeHidden({ timeout: 5000 });
    await waitFor3DBoardReady(page);

    await page.getByTestId("main-menu-btn").click();
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();

    const popup3P = page.getByTestId("turn-notification-popup");
    await expect(popup3P).toContainText("Player 1", { timeout: 5000 });
    if (await popup3P.isVisible().catch(() => false)) {
      await popup3P.click({ force: true, timeout: 1000 }).catch(() => {});
    }
    await expect(popup3P).toBeHidden({ timeout: 5000 });
    await waitFor3DBoardReady(page);
  });
});

test.describe("3-Player Lifecycle, Disqualification & Match End 3D E2E Suite", () => {
  test("3P-E2E-1: Launches 3-Player Local Multiplayer on 3D board with camera modes and 3 player cards", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();

    await waitFor3DBoardReady(page);
    await expect(page.getByTestId("game-mode-tag")).toContainText("LOCAL 3P");
    await expect(page.getByTestId("round-indicator")).toContainText("Round 1");
    await expect(page.getByTestId("player-card-1")).toBeVisible();
    await expect(page.getByTestId("player-card-2")).toBeVisible();
    await expect(page.getByTestId("player-card-3")).toBeVisible();
  });

  test("3P-E2E-2: Sequential turn cycling (Player 1 -> Player 2 -> Player 3 -> Player 1) via 3D canvas clicks", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.addInitScript(() => {
      const pits = [];
      for (let i = 0; i < 15; i++) {
        const owner = i < 5 ? "PLAYER_1" : i < 10 ? "PLAYER_2" : "PLAYER_3";
        let seeds = 0;
        if (i === 0 || i === 5 || i === 10) seeds = 1;
        else if (i === 4 || i === 9 || i === 14) seeds = 5;
        pits.push({ id: i, owner, seeds, status: "OPEN", bonusAvailable: false });
      }
      (window as unknown as Record<string, unknown>).__CHANNEMANE_INITIAL_PROPS__ = {
        initialScreen: "GAME",
        initialAnimationSettings: { enabled: false, speed: "FAST", stepDelayMs: 10 },
        initialGameState: {
          round: 1,
          phase: "PLAYING",
          turnPhase: "PLAYER_TURN",
          currentPlayer: "PLAYER_1",
          startingPlayer: "PLAYER_1",
          playerCount: 3,
          gameMode: "local",
          aiDifficulty: null,
          aiPlayer: "PLAYER_2",
          seedsInHand: 0,
          consecutiveTurnsWithoutCapture: 0,
          disqualifiedPlayers: [],
          roundWinner: null,
          winner: null,
          pits,
          players: {
            player1: { storage: 19, roundCaptured: 0, roundWins: 0 },
            player2: { storage: 19, roundCaptured: 0, roundWins: 0 },
            player3: { storage: 19, roundCaptured: 0, roundWins: 0 },
          },
        },
      };
    });

    await page.goto("/");
    await waitFor3DBoardReady(page);
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");

    const popup1 = page.getByTestId("turn-notification-popup");
    if (await popup1.isVisible().catch(() => false)) {
      await popup1.click({ force: true }).catch(() => {});
    }
    await expect(popup1).toBeHidden({ timeout: 5000 });

    await clickPit3D(page, 0, { mode: "SIDE", playerCount: 3 });

    const popup2 = page.getByTestId("turn-notification-popup");
    await expect(popup2).toContainText("Player 2", { timeout: 5000 });
    await expect(popup2).toBeHidden({ timeout: 5000 });

    await clickPit3D(page, 5, { mode: "SIDE", playerCount: 3 });

    const popup3 = page.getByTestId("turn-notification-popup");
    await expect(popup3).toContainText("Player 3", { timeout: 5000 });
    await expect(popup3).toBeHidden({ timeout: 5000 });

    await clickPit3D(page, 10, { mode: "SIDE", playerCount: 3 });

    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");
  });

  test("3P-E2E-3: Round settlement triggers disqualification modal and transitions cleanly to Round 2", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const pits = [];
      for (let i = 0; i < 15; i++) {
        const owner = i < 5 ? "PLAYER_1" : i < 10 ? "PLAYER_2" : "PLAYER_3";
        pits.push({ id: i, owner, seeds: 0, status: "OPEN", bonusAvailable: false });
      }
      (window as unknown as Record<string, unknown>).__CHANNEMANE_INITIAL_PROPS__ = {
        initialScreen: "GAME",
        initialAnimationSettings: { enabled: false, speed: "FAST", stepDelayMs: 10 },
        initialGameState: {
          round: 1,
          phase: "ROUND_SETTLEMENT",
          turnPhase: "TURN_END",
          currentPlayer: "PLAYER_1",
          startingPlayer: "PLAYER_1",
          playerCount: 3,
          gameMode: "local",
          aiDifficulty: null,
          aiPlayer: "PLAYER_2",
          seedsInHand: 0,
          consecutiveTurnsWithoutCapture: 0,
          disqualifiedPlayers: [],
          roundWinner: "PLAYER_1",
          winner: null,
          pits,
          players: {
            player1: { storage: 40, roundCaptured: 40, roundWins: 0 },
            player2: { storage: 35, roundCaptured: 35, roundWins: 0 },
            player3: { storage: 0, roundCaptured: 0, roundWins: 0 },
          },
        },
      };
    });

    await page.goto("/");

    const settlementModal = page.getByTestId("settlement-modal");
    await expect(settlementModal).toBeVisible();
    await expect(page.getByTestId("round-winner-banner")).toContainText("Player 1 Wins the Round!");
    await expect(page.getByTestId("settlement-p1-storage")).toHaveText("40");
    await expect(page.getByTestId("settlement-p2-storage")).toHaveText("35");
    await expect(page.getByTestId("settlement-p3-storage")).toHaveText("Disqualified");

    await page.getByTestId("start-next-round-btn").click();
    await expect(settlementModal).not.toBeVisible();

    await expect(page.getByTestId("round-indicator")).toContainText("Round 2");
    await expect(page.getByTestId("player-card-3")).toContainText("(Disqualified)");
    await expect(page.getByTestId("channemane-board-3d")).toBeVisible();
  });

  test("3P-E2E-4: Match End modal displays rankings and Home button returns cleanly", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const pits = [];
      for (let i = 0; i < 15; i++) {
        const owner = i < 5 ? "PLAYER_1" : i < 10 ? "PLAYER_2" : "PLAYER_3";
        pits.push({
          id: i,
          owner,
          seeds: 0,
          status: i >= 5 ? "CLOSED" : "OPEN",
          bonusAvailable: false,
        });
      }
      (window as unknown as Record<string, unknown>).__CHANNEMANE_INITIAL_PROPS__ = {
        initialScreen: "GAME",
        initialAnimationSettings: { enabled: false, speed: "FAST", stepDelayMs: 10 },
        initialGameState: {
          round: 2,
          phase: "MATCH_END",
          turnPhase: "TURN_END",
          currentPlayer: "PLAYER_1",
          startingPlayer: "PLAYER_1",
          playerCount: 3,
          gameMode: "local",
          aiDifficulty: null,
          aiPlayer: "PLAYER_2",
          seedsInHand: 0,
          consecutiveTurnsWithoutCapture: 0,
          disqualifiedPlayers: ["PLAYER_3", "PLAYER_2"],
          roundWinner: "PLAYER_1",
          winner: "PLAYER_1",
          pits,
          players: {
            player1: { storage: 45, roundCaptured: 45, roundWins: 2 },
            player2: { storage: 30, roundCaptured: 30, roundWins: 0 },
            player3: { storage: 0, roundCaptured: 0, roundWins: 0 },
          },
        },
      };
    });

    await page.goto("/");

    const matchModal = page.getByTestId("match-end-modal");
    await expect(matchModal).toBeVisible();
    await expect(page.getByTestId("match-winner-banner")).toContainText("Player 1 Wins the Match!");
    await expect(page.getByTestId("match-rankings")).toBeVisible();
    await expect(page.getByTestId("ranking-badge-player_1")).toHaveText("1st Place");
    await expect(page.getByTestId("ranking-storage-player_1")).toHaveText("45 seeds");
    await expect(page.getByTestId("ranking-badge-player_2")).toHaveText("2nd Place");
    await expect(page.getByTestId("ranking-storage-player_2")).toHaveText("30 seeds");
    await expect(page.getByTestId("ranking-badge-player_3")).toHaveText("Lost");
    await expect(page.getByTestId("ranking-storage-player_3")).toHaveText("0 seeds");

    await page.getByTestId("match-home-btn").click();
    await expect(page.getByTestId("main-menu")).toBeVisible();
    await expect(matchModal).not.toBeVisible();
  });

  test("3P-E2E-5: 3-Player 3D board layout fits mobile viewport without horizontal scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();
    await waitFor3DBoardReady(page);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);

    const canvasBox = await page
      .locator('[data-testid="board-3d-canvas-stage"] canvas')
      .boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.x).toBeGreaterThanOrEqual(0);
    expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(375 + 2);
  });
});
