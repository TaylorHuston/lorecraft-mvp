import { expect, test } from "@playwright/test";

test.describe("LC-001-S11 End To End Playtest Verification", () => {
  test("runs a deterministic seeded-world browser playtest", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#lorecraft-app")).toBeVisible();

    await seedFreshWorld(page);

    const input = page.locator("#director-input");
    const playerText = "Mira, what do you know about the storm?";
    await expect(input).toBeVisible();
    await input.fill(playerText);
    await input.press("Enter");

    await expect(page.locator("#turn-pending-placeholder")).toBeVisible();
    await expect(input).toBeHidden();
    await expect(page.locator("#director-input")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#director-input")).toHaveValue("");
    await expect(page.locator("#story-stream")).toContainText(playerText);
    await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");

    await page.reload();
    await expect(page.locator("#story-stream")).toContainText(playerText);
    await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");

    const debugPanel = page.locator("#debug-panel");
    const debugToggle = page.locator("#debug-panel-toggle");
    await debugToggle.click();
    await expect(debugPanel).toHaveAttribute("aria-hidden", "true");
    await expect(debugPanel).toHaveJSProperty("inert", true);
    await debugToggle.click();
    await expect(debugPanel).toHaveAttribute("aria-hidden", "false");

    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-turns-items")).toContainText("Turn #1: succeeded");
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "lorecraft-fixture-model",
    );
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "story_generation",
    );
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "npc_state_extraction",
    );
    await expect(page.locator("#debug-list-npc-state-changes-items")).toContainText(
      "memory -> Mira told Taylor the storm began after the chapel bell rang at midnight.",
    );

    await page.locator("#rough-reset-button").click();
    await expect(page.locator("#director-input")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#story-stream")).not.toContainText(playerText);

    const followupInput = page.locator("#director-input");
    await followupInput.fill("I listen to the rain.");
    await followupInput.press("Enter");
    await expect(page.locator("#story-stream")).toContainText("I listen to the rain.", {
      timeout: 60_000,
    });
    await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");
  });
});

async function seedFreshWorld(page: import("@playwright/test").Page) {
  await page.waitForFunction(() =>
    Boolean(
      document.querySelector("#director-input") ??
        document.querySelector("#seed-world-button") ??
        document.querySelector("#fresh-seed-button"),
    ),
  );

  const emptySeedButton = page.locator("#seed-world-button");
  if (await emptySeedButton.isVisible()) {
    await emptySeedButton.click();
  } else {
    await page.locator("#fresh-seed-button").click();
  }

  await expect(page.locator("#director-input")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#story-stream")).toContainText("You stand in the chapel", {
    timeout: 30_000,
  });
}
