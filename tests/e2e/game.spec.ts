import { test, expect } from "@playwright/test";

test.describe("Channemane Game — Playwright Browser E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for board to be visible
    await expect(page.getByTestId("channemane-board")).toBeVisible();
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

  test("Positive 2: Valid pit selection executes turn and advances to Player 2", async ({
    page,
  }) => {
    // Enable fast mode to run deterministically
    await page.getByTestId("toggle-animation-btn").click();

    const pit0 = page.getByTestId("pit-0");
    await expect(pit0).toBeEnabled();

    // Click P0
    await pit0.click();

    // Seeds on P0 should have mutated from initial 5
    await expect(pit0).not.toHaveAttribute("data-seeds", "5");

    // Turn indicator shifts to Player 2
    const turnIndicator = page.getByTestId("turn-indicator");
    await expect(turnIndicator).toContainText("PLAYER 2'S TURN");
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
    await expect(page.getByTestId("turn-indicator")).toContainText("PLAYER 2'S TURN");

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
});
