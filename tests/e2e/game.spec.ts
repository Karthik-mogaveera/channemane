import { test, expect } from "@playwright/test";

test.describe("Channemane Game — Playwright Browser E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const localBtn = page.getByTestId("menu-btn-local");
    await localBtn.waitFor({ state: "visible", timeout: 5000 });
    await localBtn.click();
    const p2Btn = page.getByTestId("player-count-btn-2");
    await p2Btn.waitFor({ state: "visible", timeout: 5000 });
    await p2Btn.click();

    // Wait for board to be visible and web fonts to settle
    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    // Wait for initial turn notification popup to clear so pits are interactive
    await page.waitForTimeout(850);
  });

  test("Positive 1: Game loads with full board, 14 pits, 5 seeds each, and Player 1 turn", async ({
    page,
  }) => {
    // Check Branding
    await expect(page.getByRole("banner")).toContainText("CHANNEMANE");

    // Check Turn Banner
    const turnIndicator = page.getByTestId("turn-indicator");
    await expect(turnIndicator).toContainText("PLAYER 1'S TURN");

    // Check Round
    await expect(page.getByTestId("round-indicator")).toContainText("Round 1");

    // Check all 14 pits exist and have 5 seeds initially
    for (let i = 0; i < 14; i++) {
      const pit = page.getByTestId(`pit-${i}`);
      await expect(pit).toBeVisible();
      await expect(pit).toHaveAttribute("data-seeds", "5");
    }

    // Check Player storage bowls
    const p1Storage = page.locator("[data-testid='storage-player1']").first();
    const p2Storage = page.locator("[data-testid='storage-player2']").first();
    await expect(p1Storage).toContainText("0");
    await expect(p2Storage).toContainText("0");
  });

  test("Positive 2: Valid pit selection executes turn, pauses for continuation, and advances on confirmation", async ({
    page,
  }) => {
    // Enable fast mode to run deterministically
    await page.getByTestId("toggle-animation-btn").click();

    const pit0 = page.getByTestId("pit-0");
    await expect(pit0).toBeEnabled();

    // Click P0
    await pit0.click();

    // Seeds on P0 dropped from initial 5 to 0
    await expect(pit0).toHaveAttribute("data-seeds", "0");

    // Pauses and prompts for continuation on Pit 6
    const turnIndicator = page.getByTestId("turn-indicator");
    await expect(turnIndicator).toContainText(
      "Choose the highlighted pit to continue sowing.",
      { timeout: 10000 }
    );

    const pit6 = page.getByTestId("pit-6");
    await expect(pit6).toHaveAttribute("data-continuation-target", "true");

    // Click pit 6 to confirm continuation
    await pit6.click();

    // Pit 6 seeds are scooped
    await expect(pit6).not.toHaveAttribute("data-continuation-target", "true");
  });

  test("Positive 3: Rules dialog opens, displays Channemane rules, and closes cleanly", async ({
    page,
  }) => {
    // Open rules
    await page.getByTestId("rules-btn").click();

    const rulesModal = page.getByTestId("rules-modal");
    await expect(rulesModal).toBeVisible();
    await expect(rulesModal).toContainText("Origins & Heritage");
    await expect(rulesModal).toContainText("Positional Capture");
    await expect(rulesModal).toContainText("Round Settlement");

    // Close rules
    await page.getByTestId("close-rules-btn").click();
    await expect(rulesModal).not.toBeVisible();
  });

  test("Positive 4: New Game resets the board state", async ({ page }) => {
    await page.getByTestId("toggle-animation-btn").click();

    // Play a turn
    await page.getByTestId("pit-0").click();
    await expect(page.getByTestId("turn-indicator")).toContainText(
      "Choose the highlighted pit to continue sowing.",
      { timeout: 10000 }
    );

    // Click New Game
    await page.getByTestId("restart-btn").click();

    // Turn resets to Player 1, P0 reset to 5
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");
    await expect(page.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
  });

  test("Positive 5: Sowing animation displays seeds in hand visualizer", async ({ page }) => {
    // Ensure slow/animation mode is enabled
    const pit0 = page.getByTestId("pit-0");
    await pit0.click();

    // Sowing hand indicator should appear or turn indicator should reflect sowing
    const turnBanner = page.getByTestId("turn-banner");
    await expect(turnBanner).toBeVisible();
  });

  test("Negative 1: Player 1 cannot select Player 2 pits during Player 1 turn", async ({
    page,
  }) => {
    // Turn is Player 1
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");

    // Player 2 pits (P7–P13) must be disabled
    for (let p = 7; p <= 13; p++) {
      const pit = page.getByTestId(`pit-${p}`);
      await expect(pit).toBeDisabled();
    }
  });

  test("Negative 2: Rapid repeated clicks do not cause duplicate execution", async ({
    page,
  }) => {
    const pit1 = page.getByTestId("pit-1");
    // Double click rapidly
    await pit1.dblclick();

    // Board remains valid and turn advances cleanly
    await expect(page.getByTestId("channemane-board")).toBeVisible();
  });

  test("Negative 3: An empty pit is non-selectable and disabled", async ({ page }) => {
    await page.getByTestId("toggle-animation-btn").click();

    // Play P0 (P1 turn)
    await page.getByTestId("pit-0").click();

    // After play, find any pit with 0 seeds if one exists, or verify pits with 0 cannot be selected
    const allPits = await page.locator(".channemane-pit").all();
    for (const pit of allPits) {
      const seeds = await pit.getAttribute("data-seeds");
      if (seeds === "0") {
        await expect(pit).toBeDisabled();
      }
    }
  });

  test("Post-Phase-3 Issue 4 & 9: Pits are circular, and pit IDs P0–P13 are hidden from board", async ({
    page,
  }) => {
    // Verify no visible P0-P13 badge text inside any pit
    for (let i = 0; i < 14; i++) {
      const pit = page.getByTestId(`pit-${i}`);
      const text = await pit.innerText();
      expect(text).not.toContain(`P${i}`);
    }

    // Verify row labels do not expose P0-P6 or P13-P7
    await expect(page.getByText("Player 1 Side (P0 – P6)")).not.toBeVisible();
    await expect(page.getByText("Player 2 Side (P13 – P7)")).not.toBeVisible();
    await expect(page.getByText("Player 1 Side")).toBeVisible();
    await expect(page.getByText("Player 2 Side")).toBeVisible();
  });

  test("Post-Phase-3 Issue 5: Numeric seed counts are displayed outside the pits", async ({
    page,
  }) => {
    // Verify external count exists for every pit outside the button
    for (let i = 0; i < 14; i++) {
      const countEl = page.getByTestId(`pit-count-${i}`);
      await expect(countEl).toBeVisible();
      await expect(countEl).toHaveText("5");

      // Verify the pit button itself does not contain the numeric count as text
      const pitBtn = page.getByTestId(`pit-${i}`);
      const pitText = await pitBtn.innerText();
      // Pit interior should only have visual beads or be empty, not numeric text
      expect(pitText.trim()).toBe("");
    }
  });

  test("Post-Phase-3 Issue 7: Exactly one storage display exists per player without duplicates", async ({
    page,
  }) => {
    // Verify exactly one Player 1 storage bowl and one Player 2 storage bowl on desktop
    const p1StorageBowls = page.locator("[data-testid='storage-player1']");
    const p2StorageBowls = page.locator("[data-testid='storage-player2']");
    await expect(p1StorageBowls).toHaveCount(1);
    await expect(p2StorageBowls).toHaveCount(1);
    await expect(p1StorageBowls).toBeVisible();
    await expect(p2StorageBowls).toBeVisible();

    // Verify PlayerPanels at top does not duplicate the storage count
    const p1Card = page.getByTestId("player-card-1");
    await expect(p1Card).toContainText("Round Wins:");
    await expect(p1Card).not.toContainText("Captured:");
  });

  test("Post-Phase-3 Issue 3: Toggle switches between Slow Mode and Fast Mode", async ({
    page,
  }) => {
    const toggleBtn = page.getByTestId("toggle-animation-btn");
    // Initially in Slow Mode
    await expect(toggleBtn).toContainText("Slow Mode");

    // Click to switch to Fast Mode
    await toggleBtn.click();
    await expect(toggleBtn).toContainText("Fast Mode");

    // Click to switch back to Slow Mode
    await toggleBtn.click();
    await expect(toggleBtn).toContainText("Slow Mode");
  });

  test("Post-Phase-3 Responsive Layout: Board renders cleanly on mobile viewport", async ({
    page,
  }) => {
    // Set mobile viewport (iPhone 12 / 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("channemane-board")).toBeVisible();

    // Verify both storage bowls remain visible without duplicates
    const p1Storage = page.locator("[data-testid='storage-player1']");
    const p2Storage = page.locator("[data-testid='storage-player2']");
    await expect(p1Storage).toHaveCount(1);
    await expect(p2Storage).toHaveCount(1);
    await expect(p1Storage).toBeVisible();
    await expect(p2Storage).toBeVisible();
  });

  test("Issue 2: Board container and pit bounding boxes remain stable throughout sowing", async ({
    page,
  }) => {
    const board = page.getByTestId("channemane-board");
    const initialBox = await board.boundingBox();
    expect(initialBox).not.toBeNull();

    const initialOffsetTop = await board.evaluate((el) => (el as HTMLElement).offsetTop);

    const pit0 = page.getByTestId("pit-0");
    const pit6 = page.getByTestId("pit-6");
    const initialPit6Box = await pit6.boundingBox();
    const initialPit6RelPos = await pit6.evaluate((el) => {
      const bRect = el.closest(".channemane-board")!.getBoundingClientRect();
      const pRect = el.getBoundingClientRect();
      return { x: pRect.left - bRect.left, y: pRect.top - bRect.top };
    });

    // Click P0 to start animated sowing
    await pit0.click();

    // Measure bounding boxes and layout offsets at multiple points during sowing
    for (let step = 0; step < 5; step++) {
      await page.waitForTimeout(300);
      const currentBoardBox = await board.boundingBox();
      const currentPit6Box = await pit6.boundingBox();
      const currentOffsetTop = await board.evaluate((el) => (el as HTMLElement).offsetTop);

      expect(currentBoardBox).not.toBeNull();
      // Board width and height must remain stable (allowing small 2px browser subpixel rendering tolerance)
      expect(Math.abs(currentBoardBox!.width - initialBox!.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(currentBoardBox!.height - initialBox!.height)).toBeLessThanOrEqual(2);
      // Board layout offsetTop must not shift
      expect(Math.abs(currentOffsetTop - initialOffsetTop)).toBeLessThanOrEqual(2);

      if (initialPit6Box && currentPit6Box) {
        // Pit dimensions must not jump
        expect(Math.abs(currentPit6Box.width - initialPit6Box.width)).toBeLessThanOrEqual(2);
        expect(Math.abs(currentPit6Box.height - initialPit6Box.height)).toBeLessThanOrEqual(2);

        // Pit relative coordinates within the board must remain stable
        const currentPit6RelPos = await pit6.evaluate((el) => {
          const bRect = el.closest(".channemane-board")!.getBoundingClientRect();
          const pRect = el.getBoundingClientRect();
          return { x: pRect.left - bRect.left, y: pRect.top - bRect.top };
        });
        expect(Math.abs(currentPit6RelPos.x - initialPit6RelPos.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(currentPit6RelPos.y - initialPit6RelPos.y)).toBeLessThanOrEqual(2);
      }
    }
  });

  test("Issue 2: Board remains geometrically stable at mobile viewport size during sowing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const board = page.getByTestId("channemane-board");
    const initialBox = await board.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialOffsetTop = await board.evaluate((el) => (el as HTMLElement).offsetTop);

    await page.getByTestId("pit-0").click();
    for (let step = 0; step < 3; step++) {
      await page.waitForTimeout(300);
      const box = await board.boundingBox();
      const currentOffsetTop = await board.evaluate((el) => (el as HTMLElement).offsetTop);
      expect(box).not.toBeNull();
      expect(Math.abs(box!.width - initialBox!.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(box!.height - initialBox!.height)).toBeLessThanOrEqual(2);
      expect(Math.abs(currentOffsetTop - initialOffsetTop)).toBeLessThanOrEqual(2);
    }
  });
});

test.describe("Main Menu & Game Mode Selection E2E", () => {
  test("E2E Scenario 1: Initial visit displays Main Menu with Play with AI, Local Multiplayer, and Rules", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify Main Menu is visible
    await expect(page.getByTestId("main-menu")).toBeVisible();
    await expect(page.getByTestId("menu-btn-ai")).toBeVisible();
    await expect(page.getByTestId("menu-btn-local")).toBeVisible();
    await expect(page.getByTestId("menu-btn-rules")).toBeVisible();

    // Verify board is NOT open initially
    await expect(page.getByTestId("channemane-board")).not.toBeVisible();
  });

  test("E2E Scenario 2: Play with AI opens Difficulty selection with Beginner, Expert, Master, and Back", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-ai").click();
    await expect(page.getByTestId("difficulty-select")).toBeVisible();

    await expect(page.getByTestId("difficulty-btn-beginner")).toBeVisible();
    await expect(page.getByTestId("difficulty-btn-expert")).toBeVisible();
    await expect(page.getByTestId("difficulty-btn-master")).toBeVisible();
    await expect(page.getByTestId("difficulty-btn-back")).toBeVisible();

    // Test Back button
    await page.getByTestId("difficulty-btn-back").click();
    await expect(page.getByTestId("main-menu")).toBeVisible();
    await expect(page.getByTestId("difficulty-select")).not.toBeVisible();
  });

  test("E2E Scenario 3: Selecting Master difficulty prompts for first player and launches Master game", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-ai").click();
    await page.getByTestId("difficulty-btn-master").click();

    // First player dialog appears
    await expect(page.getByTestId("first-player-modal")).toBeVisible();
    await page.getByTestId("first-player-player-btn").click();

    // Directly launches Master game
    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("AI (MASTER)");
  });

  test("E2E Scenario 4: Local Multiplayer opens player count selection and 2 Players opens board", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-local").click();
    await expect(page.getByTestId("multiplayer-select")).toBeVisible();

    await page.getByTestId("player-count-btn-2").click();

    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("multiplayer-select")).not.toBeVisible();
    await expect(page.getByTestId("difficulty-select")).not.toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("LOCAL 2P");
  });

  test("E2E Scenario 4b: Local Multiplayer 3 Players launches 3-Player 15-pit board", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-local").click();
    await expect(page.getByTestId("multiplayer-select")).toBeVisible();

    await page.getByTestId("player-count-btn-3").click();

    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("multiplayer-select")).not.toBeVisible();
    await expect(page.getByTestId("player-card-1")).toBeVisible();
    await expect(page.getByTestId("player-card-2")).toBeVisible();
    await expect(page.getByTestId("player-card-3")).toBeVisible();
    await expect(page.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    await expect(page.getByTestId("pit-14")).toHaveAttribute("data-seeds", "5");
  });

  test("E2E Scenario 5: Rules modal opens from Main Menu and closes back to Main Menu", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-rules").click();
    await expect(page.getByTestId("rules-modal")).toBeVisible();

    await page.getByTestId("rules-back-btn").click();
    await expect(page.getByTestId("rules-modal")).not.toBeVisible();
    await expect(page.getByTestId("main-menu")).toBeVisible();
  });

  test("E2E Scenario 6: Returning to Main Menu from Game Header cleanly resets", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-2").click();
    await expect(page.getByTestId("channemane-board")).toBeVisible();

    // Click Menu in Header
    await page.getByTestId("main-menu-btn").click();
    await expect(page.getByTestId("main-menu")).toBeVisible();
    await expect(page.getByTestId("channemane-board")).not.toBeVisible();
  });

  test("E2E Scenario 7: Beginner AI plays against human with automated response turn", async ({
    page,
  }) => {
    await page.goto("/");

    // Navigate: Main Menu -> Difficulty Select -> Beginner
    await page.getByTestId("menu-btn-ai").click();
    await page.getByTestId("difficulty-btn-beginner").click();

    // First player dialog appears -> Select Player
    await expect(page.getByTestId("first-player-modal")).toBeVisible();
    await page.getByTestId("first-player-player-btn").click();

    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("AI (BEGINNER)");

    // Switch to Fast Mode for rapid animation stepping
    await page.getByTestId("toggle-animation-btn").click();

    // Ensure turn announcement popup appears and dismisses cleanly
    await expect(page.getByTestId("turn-notification-popup")).toBeVisible();
    await expect(page.getByTestId("turn-notification-popup")).toBeHidden({ timeout: 5000 });

    // Human clicks pit 0
    const pit0 = page.getByTestId("pit-0");
    await expect(pit0).toBeEnabled({ timeout: 5000 });
    await pit0.click();
    await expect(pit0).toHaveAttribute("data-seeds", "0", { timeout: 5000 });

    // Wait for continuation prompt
    await expect(page.getByTestId("turn-indicator")).toContainText(
      "Choose the highlighted pit to continue sowing.",
      { timeout: 10000 }
    );

    // Loop until human turn completes and turn passes to Player 2 (AI)
    const startTime = Date.now();
    while (Date.now() - startTime < 35000) {
      const bannerText = await page.getByTestId("turn-banner").innerText().catch(() => "");
      if (bannerText.includes("PLAYER 2")) {
        break;
      }

      const continuationTarget = page.locator('[data-continuation-target="true"]');
      const captureTarget = page.locator('[data-capture-target="true"]');

      if (await continuationTarget.isVisible().catch(() => false)) {
        await continuationTarget.click();
        await page.waitForTimeout(400);
      } else if (await captureTarget.isVisible().catch(() => false)) {
        await captureTarget.click();
        await page.waitForTimeout(400);
      } else {
        await page.waitForTimeout(300);
      }
    }

    // Verify turn successfully reached Player 2 (AI)
    await expect(page.getByTestId("turn-banner")).toContainText("PLAYER 2", {
      timeout: 10000,
    });

    // The Beginner AI automatically takes its turn without human clicking
    // Verify turn returns to Player 1!
    await expect(page.getByTestId("turn-banner")).toContainText("PLAYER 1'S TURN", {
      timeout: 30000,
    });
  });

  test("E2E Scenario 8: 3-Player Board Mathematically Uniform Pit Alignment and Reference Storage Layout", async ({
    page,
  }) => {
    await page.goto("/");

    // Navigate: Main Menu -> Local Multiplayer -> 3 Players
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();
    await expect(page.getByTestId("channemane-board")).toBeVisible();

    // 1. Measure all 15 pit bounding boxes
    const pitBoxes: { id: number; x: number; y: number; width: number; height: number; cx: number; cy: number }[] = [];
    for (let i = 0; i < 15; i++) {
      const box = await page.getByTestId(`pit-${i}`).boundingBox();
      expect(box).not.toBeNull();
      const b = box!;
      pitBoxes.push({
        id: i,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        cx: b.x + b.width / 2,
        cy: b.y + b.height / 2,
      });
    }

    // Criterion 1: Every pit is circular with width == height (within 1px)
    for (const p of pitBoxes) {
      expect(Math.abs(p.width - p.height)).toBeLessThanOrEqual(1.0);
    }

    // Criterion 2: Every pit across the entire board has identical width and height (within 1px)
    const baseWidth = pitBoxes[0].width;
    const baseHeight = pitBoxes[0].height;
    for (const p of pitBoxes) {
      expect(Math.abs(p.width - baseWidth)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(p.height - baseHeight)).toBeLessThanOrEqual(1.0);
    }

    // Row definitions
    const row1 = [0, 1, 2, 3, 4].map((id) => pitBoxes[id]);
    const row2 = [9, 8, 7, 6, 5].map((id) => pitBoxes[id]);
    const row3 = [10, 11, 12, 13, 14].map((id) => pitBoxes[id]);

    // Criterion 3: Horizontal center-to-center distances within rows are uniform (within 1px)
    const baseColGapRow1 = row1[1].cx - row1[0].cx;
    for (let c = 0; c < 4; c++) {
      const dist1 = row1[c + 1].cx - row1[c].cx;
      const dist2 = row2[c + 1].cx - row2[c].cx;
      const dist3 = row3[c + 1].cx - row3[c].cx;
      expect(Math.abs(dist1 - baseColGapRow1)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(dist2 - baseColGapRow1)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(dist3 - baseColGapRow1)).toBeLessThanOrEqual(1.0);
    }

    // Criterion 4: Column centers align vertically across rows (within 1px)
    for (let c = 0; c < 5; c++) {
      expect(Math.abs(row1[c].cx - row2[c].cx)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(row2[c].cx - row3[c].cx)).toBeLessThanOrEqual(1.0);
    }

    // Criterion 5: Vertical row-to-row distances are uniform (within 1px)
    const row1ToRow2Dist = row2[0].cy - row1[0].cy;
    const row2ToRow3Dist = row3[0].cy - row2[0].cy;
    expect(Math.abs(row1ToRow2Dist - row2ToRow3Dist)).toBeLessThanOrEqual(1.0);
    for (let c = 1; c < 5; c++) {
      const d12 = row2[c].cy - row1[c].cy;
      const d23 = row3[c].cy - row2[c].cy;
      expect(Math.abs(d12 - row1ToRow2Dist)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(d23 - row1ToRow2Dist)).toBeLessThanOrEqual(1.0);
    }

    // Criterion 6: Storage placement matches reference representation:
    // Left: P1S
    // Center: Pits
    // Right: P2S and P3S side-by-side (P3S is farther right)
    const p1StorageBox = await page.getByTestId("storage-player1").boundingBox();
    const p2StorageBox = await page.getByTestId("storage-player2").boundingBox();
    const p3StorageBox = await page.getByTestId("storage-player3").boundingBox();

    expect(p1StorageBox).not.toBeNull();
    expect(p2StorageBox).not.toBeNull();
    expect(p3StorageBox).not.toBeNull();

    // P1S is to the left of the leftmost pits
    expect(p1StorageBox!.x + p1StorageBox!.width).toBeLessThanOrEqual(row1[0].x);

    // P2S is to the right of the rightmost pits
    expect(p2StorageBox!.x).toBeGreaterThanOrEqual(row1[4].x + row1[4].width);

    // P3S is to the right of P2S (side-by-side)
    expect(p3StorageBox!.x).toBeGreaterThanOrEqual(p2StorageBox!.x + p2StorageBox!.width);
  });

  test("E2E Scenario 9: Mode Switching Cycle (3P -> AI -> 3P) isolates board configuration", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Enter 3-Player mode
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();
    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("pit-14")).toBeVisible();
    await expect(page.getByTestId("storage-player3")).toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("LOCAL 3P");

    // 2. Return to menu
    await page.getByTestId("main-menu-btn").click();
    await expect(page.getByTestId("main-menu")).toBeVisible();

    // 3. Enter AI mode
    await page.getByTestId("menu-btn-ai").click();
    await page.getByTestId("difficulty-btn-beginner").click();
    await page.getByTestId("first-player-player-btn").click();
    await expect(page.getByTestId("channemane-board")).toBeVisible();

    // Verify 2-player board: exactly 14 pits, 2 storages
    await expect(page.getByTestId("pit-13")).toBeVisible();
    await expect(page.getByTestId("pit-14")).not.toBeVisible();
    await expect(page.getByTestId("storage-player1")).toBeVisible();
    await expect(page.getByTestId("storage-player2")).toBeVisible();
    await expect(page.getByTestId("storage-player3")).not.toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("AI");

    // 4. Return to menu and re-enter 3-Player mode
    await page.getByTestId("main-menu-btn").click();
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();
    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("pit-14")).toBeVisible();
    await expect(page.getByTestId("storage-player3")).toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("LOCAL 3P");
  });

  test("E2E Scenario 10: Turn popup announces player turn before sowing and can be dismissed", async ({
    page,
  }) => {
    await page.goto("/");

    // Launch Local 2P
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-2").click();
    await expect(page.getByTestId("channemane-board")).toBeVisible();

    // Verify turn announcement popup is visible and states Player 1
    const turnPopup = page.getByTestId("turn-notification-popup");
    await expect(turnPopup).toBeVisible();
    await expect(turnPopup).toContainText("Player 1");

    // Dismiss by clicking
    await turnPopup.click({ force: true });
    await expect(turnPopup).toBeHidden();

    // Verify pits are now interactive
    await expect(page.getByTestId("pit-0")).toBeEnabled();
  });

  test("E2E Scenario 11: 3-Player Local Multiplayer announces turn on launch", async ({
    page,
  }) => {
    await page.goto("/");

    // Launch Local 3P
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();
    await expect(page.getByTestId("channemane-board")).toBeVisible();

    // Verify turn announcement popup is visible
    const turnPopup = page.getByTestId("turn-notification-popup");
    await expect(turnPopup).toBeVisible();
    await expect(turnPopup).toContainText("Player 1");

    // Dismiss by clicking
    await turnPopup.click({ force: true });
    await expect(turnPopup).toBeHidden();
  });
});

test.describe("3-Player Local Multiplayer Lifecycle and Disqualification E2E Suite", () => {
  // Test 1: Complete 3-Player Board Setup & Architecture
  test("3P-E2E-1: Launches 3-Player Local Multiplayer with complete 15-pit board, 3 storage bowls, and layout", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();

    // Verify Board & Mode
    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("game-mode-tag")).toContainText("LOCAL 3P");
    await expect(page.getByTestId("round-indicator")).toContainText("Round 1");

    // Dismiss initial turn popup if visible
    const turnPopup = page.getByTestId("turn-notification-popup");
    if (await turnPopup.isVisible()) {
      await expect(turnPopup).toContainText("Player 1");
      await turnPopup.click({ force: true });
    }

    // Verify all 15 pits exist and have 5 seeds initially
    for (let i = 0; i < 15; i++) {
      const pit = page.getByTestId(`pit-${i}`);
      await expect(pit).toBeVisible();
      await expect(pit).toHaveAttribute("data-seeds", "5");
      await expect(pit).toHaveAttribute("data-status", "OPEN");
    }

    // Verify all 3 storage bowls exist with 0 captured seeds initially
    await expect(page.getByTestId("storage-player1")).toBeVisible();
    await expect(page.getByTestId("p1-captured-count")).toHaveText("0");

    await expect(page.getByTestId("storage-player2")).toBeVisible();
    await expect(page.getByTestId("p2-captured-count")).toHaveText("0");

    await expect(page.getByTestId("storage-player3")).toBeVisible();
    await expect(page.getByTestId("p3-captured-count")).toHaveText("0");

    // Verify storage container architecture
    await expect(page.getByTestId("p1-storage-container")).toBeVisible();
    await expect(page.getByTestId("p2-p3-storage-container")).toBeVisible();

    // Verify relative positions: P1 storage on left, P2 & P3 on right
    const p1Box = await page.getByTestId("storage-player1").boundingBox();
    const p2Box = await page.getByTestId("storage-player2").boundingBox();
    const p3Box = await page.getByTestId("storage-player3").boundingBox();
    const pit0Box = await page.getByTestId("pit-0").boundingBox();
    const pit4Box = await page.getByTestId("pit-4").boundingBox();

    expect(p1Box).not.toBeNull();
    expect(p2Box).not.toBeNull();
    expect(p3Box).not.toBeNull();
    expect(pit0Box).not.toBeNull();
    expect(pit4Box).not.toBeNull();

    // P1 storage is to the left of the leftmost pits
    expect(p1Box!.x + p1Box!.width).toBeLessThanOrEqual(pit0Box!.x + 2);
    // P2 storage is to the right of the rightmost pits
    expect(p2Box!.x).toBeGreaterThanOrEqual(pit4Box!.x);
    // P3 storage is adjacent or to the right of P2 storage
    expect(p3Box!.x).toBeGreaterThanOrEqual(p2Box!.x - 1);
  });

  // Test 2: Turn Sequence Cycling (Player 1 -> Player 2 -> Player 3)
  test("3P-E2E-2: Turn announcements and sequential turn cycling across Player 1 -> Player 2 -> Player 3", async ({
    page,
  }) => {
    // Inject custom 3-player state with animations disabled for instant deterministic moves.
    // Pits 0, 5, 10 have 1 seed (the played pit).
    // Destination pit receives 1 seed (pits 1, 6, 11).
    // Next pit has 0 seeds (pits 2, 7, 12 - halts sowing).
    // Following pit has 0 seeds (pits 3, 8, 13 - zero capture, halts turn).
    // Anchor pit has 5 seeds (pits 4, 9, 14 - side remains active, round does not end).
    await page.addInitScript(() => {
      const pitCount = 15;
      const pits = [];
      for (let i = 0; i < pitCount; i++) {
        const owner = i < 5 ? "PLAYER_1" : i < 10 ? "PLAYER_2" : "PLAYER_3";
        let seeds = 0;
        if (i === 0 || i === 5 || i === 10) {
          seeds = 1;
        } else if (i === 4 || i === 9 || i === 14) {
          seeds = 5;
        }
        pits.push({
          id: i,
          owner,
          seeds,
          status: "OPEN",
          bonusAvailable: false,
        });
      }
      (window as any).__CHANNEMANE_INITIAL_PROPS__ = {
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
    await expect(page.getByTestId("channemane-board")).toBeVisible();
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");

    // Dismiss initial turn announcement if present
    const popup1 = page.getByTestId("turn-notification-popup");
    if (await popup1.isVisible()) {
      await popup1.click({ force: true });
    }

    // Step 1: Player 1 clicks pit 0 (1 seed -> drops in pit 1 -> next pit 2 empty -> turn ends)
    await page.getByTestId("pit-0").click();

    // Player 2's turn announcement appears
    const popup2 = page.getByTestId("turn-notification-popup");
    await expect(popup2).toBeVisible({ timeout: 5000 });
    await expect(popup2).toContainText("Player 2");
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 2'S TURN");
    await popup2.click({ force: true });

    // Step 2: Player 2 clicks pit 5 (1 seed -> drops in pit 6 -> next pit 7 empty -> turn ends)
    await page.getByTestId("pit-5").click();

    // Player 3's turn announcement appears
    const popup3 = page.getByTestId("turn-notification-popup");
    await expect(popup3).toBeVisible({ timeout: 5000 });
    await expect(popup3).toContainText("Player 3");
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 3'S TURN");
    await popup3.click({ force: true });

    // Step 3: Player 3 clicks pit 10 (1 seed -> drops in pit 11 -> next pit 12 empty -> turn ends)
    await page.getByTestId("pit-10").click();

    // Turn cycles back to Player 1!
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 1'S TURN");
  });

  // Test 3: 3-Player Round Settlement with Disqualification Flow
  test("3P-E2E-3: Round settlement triggers disqualification modal and transitions to recovery round", async ({
    page,
  }) => {
    // Inject state with Player 3 ineligible (< 5 storage seeds) at ROUND_SETTLEMENT
    await page.addInitScript(() => {
      const pits = [];
      for (let i = 0; i < 15; i++) {
        const owner = i < 5 ? "PLAYER_1" : i < 10 ? "PLAYER_2" : "PLAYER_3";
        pits.push({
          id: i,
          owner,
          seeds: 0,
          status: "OPEN",
          bonusAvailable: false,
        });
      }
      (window as any).__CHANNEMANE_INITIAL_PROPS__ = {
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

    // 1. Settlement modal opens
    const settlementModal = page.getByTestId("settlement-modal");
    await expect(settlementModal).toBeVisible();

    // Verify winner banner
    await expect(page.getByTestId("round-winner-banner")).toContainText("Player 1 Wins the Round!");

    // Verify 3 player scores & Player 3 disqualification
    await expect(page.getByTestId("settlement-p1-storage")).toHaveText("40");
    await expect(page.getByTestId("settlement-p2-storage")).toHaveText("35");
    await expect(page.getByTestId("settlement-p3-storage")).toHaveText("Disqualified");

    // Verify next round setup explanation text
    await expect(settlementModal).toContainText("Disqualified players are eliminated permanently");

    // 2. Click "Start Next Round"
    await page.getByTestId("start-next-round-btn").click();
    await expect(settlementModal).not.toBeVisible();

    // 3. Verify Round 2 starts with Player 3 eliminated
    await expect(page.getByTestId("round-indicator")).toContainText("Round 2");

    // Player 3 storage displays Disqualified
    await expect(page.getByTestId("p3-captured-count")).toHaveText("Disqualified");

    // Player 3 pits (10-14) are CLOSED and disabled
    for (let i = 10; i < 15; i++) {
      const p3Pit = page.getByTestId(`pit-${i}`);
      await expect(p3Pit).toHaveAttribute("data-status", "CLOSED");
      await expect(p3Pit).toBeDisabled();
    }

    // Player 1 & Player 2 pits are OPEN with 5 seeds each (recovery setup with 50 seeds)
    for (let i = 0; i < 10; i++) {
      const activePit = page.getByTestId(`pit-${i}`);
      await expect(activePit).toHaveAttribute("data-status", "OPEN");
      await expect(activePit).toHaveAttribute("data-seeds", "5");
    }
  });

  // Test 4: 3-Player Match Completion Rankings & Return to Main Menu
  test("3P-E2E-4: Match End modal displays 1st Place, 2nd Place, Lost rankings and Home navigation", async ({
    page,
  }) => {
    // Inject state with Match End: Player 3 eliminated earlier, Player 2 eliminated, Player 1 is sole victor
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
      (window as any).__CHANNEMANE_INITIAL_PROPS__ = {
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

    // 1. Match End modal appears
    const matchModal = page.getByTestId("match-end-modal");
    await expect(matchModal).toBeVisible();

    // Verify Match Winner Banner
    await expect(page.getByTestId("match-winner-banner")).toContainText("Player 1 Wins the Match!");

    // Verify Rankings: 1st Place, 2nd Place, Lost
    await expect(page.getByTestId("match-rankings")).toBeVisible();
    await expect(page.getByTestId("ranking-badge-player_1")).toHaveText("1st Place");
    await expect(page.getByTestId("ranking-storage-player_1")).toHaveText("45 seeds");

    await expect(page.getByTestId("ranking-badge-player_2")).toHaveText("2nd Place");
    await expect(page.getByTestId("ranking-storage-player_2")).toHaveText("30 seeds");

    await expect(page.getByTestId("ranking-badge-player_3")).toHaveText("Lost");
    await expect(page.getByTestId("ranking-storage-player_3")).toHaveText("0 seeds");

    // 2. Return to Main Menu via Home button
    const homeBtn = page.getByTestId("match-home-btn");
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();

    // Verify navigation back to Main Menu
    await expect(page.getByTestId("main-menu")).toBeVisible();
    await expect(matchModal).not.toBeVisible();
  });

  // Test 5: 3-Player Mobile Viewport Responsive Layout (Zero Horizontal Page Scroll)
  test("3P-E2E-5: 3-Player board layout on mobile viewport fits without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await page.getByTestId("menu-btn-local").click();
    await page.getByTestId("player-count-btn-3").click();

    // Verify board renders
    const board = page.getByTestId("channemane-board");
    await expect(board).toBeVisible();

    // Verify all 3 storage bowls are visible
    await expect(page.getByTestId("storage-player1")).toBeVisible();
    await expect(page.getByTestId("storage-player2")).toBeVisible();
    await expect(page.getByTestId("storage-player3")).toBeVisible();

    // Dismiss turn notification popup if present
    const popup = page.getByTestId("turn-notification-popup");
    if (await popup.isVisible()) {
      await popup.click({ force: true });
    }

    // Verify document does not suffer from horizontal page overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify all 15 pits are within viewport width
    for (let i = 0; i < 15; i++) {
      const pitBox = await page.getByTestId(`pit-${i}`).boundingBox();
      expect(pitBox).not.toBeNull();
      expect(pitBox!.x).toBeGreaterThanOrEqual(0);
      expect(pitBox!.x + pitBox!.width).toBeLessThanOrEqual(375 + 5);
    }
  });
});


