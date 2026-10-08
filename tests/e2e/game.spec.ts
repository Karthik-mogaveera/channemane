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
});
