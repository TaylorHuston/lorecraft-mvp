import { expect, test } from "@playwright/test";

test.describe("LC-001-S11 and LC-001-S12 End To End Playtest Verification", () => {
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
    await expect(page.locator("#debug-list-state-changes-items")).toContainText(
      "memory -> Mira told Taylor the storm began after the chapel bell rang at midnight.",
    );

    const failureText = "I trigger a fixture provider failure.";
    const failureInput = page.locator("#director-input");
    await failureInput.fill(failureText);
    await failureInput.press("Enter");
    await expect(page.locator("#turn-error-message")).toContainText(
      "LLM provider returned HTTP 503.",
      { timeout: 60_000 },
    );
    await expect(page.locator("#story-stream")).toContainText(playerText);

    await page.reload();
    await expect(page.locator("#story-stream")).toContainText(playerText);
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-turns-items")).toContainText(
      `Turn #2: failed - ${failureText}`,
    );
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "provider_error",
    );

    await page.locator("#debug-tab-npcs").click();
    await expect(page.locator("#npc-debug-panel")).toContainText("Mira");
    await expect(page.locator("#npc-debug-panel")).toContainText("Brother Alden");
    await page.locator("#npc-card-mira-collapse-toggle").click();
    await expect(page.locator("#npc-card-mira-collapse-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.locator("#npc-debug-mira-description").fill(
      "She has bright red hair and green eyes.",
    );
    await expect(page.locator("#npc-card-mira-save-status")).toContainText("Saved", {
      timeout: 10_000,
    });
    await page.locator("#npc-debug-mira-knowledge").fill("");
    await expect(page.locator("#npc-card-mira-save-status")).toContainText("Saved", {
      timeout: 10_000,
    });
    await page.locator("#add-debug-npc-button").click();
    await expect(page.locator("#npc-card-debug-npc-1")).toContainText("New NPC");
    await expect(page.locator("#npc-card-debug-npc-1-location")).toContainText("Chapel");

    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-hidden-facts-items")).not.toContainText(
      "actor:mira.knowledge",
    );

    const npcContextInput = page.locator("#director-input");
    await npcContextInput.fill("I look at Mira.");
    await npcContextInput.press("Enter");
    await expect(page.locator("#story-stream")).toContainText("I look at Mira.", {
      timeout: 60_000,
    });
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "She has bright red hair and green eyes.",
    );

    await page.locator("#debug-tab-locations").click();
    await expect(page.locator("#location-debug-panel")).toContainText("Chapel");
    await expect(page.locator("#location-debug-panel")).toContainText("Vestry");
    await expect(page.locator("#location-debug-panel")).toContainText("Lantern & Bell Tavern");
    await expect(page.locator("#location-card-chapel")).toContainText("Taylor (player)");
    await expect(page.locator("#location-card-tavern")).toContainText("Rowan (npc)");
    await expect(page.locator("#location-card-tavern")).toContainText("Lena (npc)");
    await page.locator("#location-card-vestry-collapse-toggle").click();
    await expect(page.locator("#location-card-vestry-collapse-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.locator("#location-card-vestry-description").fill(
      "The vestry smells of old paper, damp wool, and fresh sealing wax.",
    );
    await page.locator("#location-card-vestry-description").blur();
    await expect(page.locator("#location-card-vestry-save-status")).toContainText("Saved");
    await page.locator("#new-location-key").fill("bell-annex");
    await page.locator("#new-location-name").fill("Bell Annex");
    await page.locator("#new-location-description").fill(
      "A cramped annex below the bell rope, dry enough for old tools.",
    );
    await page.locator("#create-location-button").click();
    await expect(page.locator("#location-card-bell-annex")).toContainText("Bell Annex");

    const travelInput = page.locator("#director-input");
    await travelInput.fill("I go to the vestry.");
    await travelInput.press("Enter");
    await expect(page.locator("#story-stream")).toContainText("I go to the vestry.", {
      timeout: 60_000,
    });
    await expect(page.locator("#story-stream")).toContainText("enter the vestry");
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-scene-items")).toContainText(
      "Stormbound Chapel / Vestry",
    );
    await expect(page.locator("#debug-list-state-changes-items")).toContainText(
      "Taylor: moved to Vestry.",
    );
    await expect(page.locator("#debug-list-state-changes-items")).toContainText(
      "Mira: moved to Vestry.",
    );
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "The vestry smells of old paper, damp wool, and fresh sealing wax.",
    );
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "Bell Annex",
    );

    const annexInput = page.locator("#director-input");
    await annexInput.fill("I go to the bell annex.");
    await annexInput.press("Enter");
    await expect(page.locator("#story-stream")).toContainText("I go to the bell annex.", {
      timeout: 60_000,
    });
    await expect(page.locator("#story-stream")).toContainText("enter the Bell Annex");
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-scene-items")).toContainText(
      "Stormbound Chapel / Bell Annex",
    );
    await expect(page.locator("#debug-list-state-changes-items")).toContainText(
      "Taylor: moved to Bell Annex.",
    );

    const blockedTravelInput = page.locator("#director-input");
    await blockedTravelInput.fill("I go to the bell tower.");
    await blockedTravelInput.press("Enter");
    await expect(page.locator("#story-stream")).toContainText("I go to the bell tower.", {
      timeout: 60_000,
    });
    await expect(page.locator("#story-stream")).toContainText("destination remains out of reach");
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-scene-items")).toContainText(
      "Stormbound Chapel / Bell Annex",
    );
    await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
      "Actor move destination is unknown.",
    );
    await expectStoryStreamNearBottom(page);
    await page.locator("#debug-tab-locations").click();
    await expect(page.locator("#location-card-bell-tower")).toHaveCount(0);

    await page.locator("#rough-reset-button").click();
    await expect(page.locator("#director-input")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#story-stream")).not.toContainText(playerText);
    await expect(page.locator("#story-empty-state")).toBeVisible();
    await page.locator("#debug-tab-locations").click();
    await page.locator("#location-card-vestry-collapse-toggle").click();
    await expect(page.locator("#location-card-vestry-description")).toHaveValue(
      "The vestry smells of old paper and damp wool. A narrow desk sits under shelves of hymnals.",
    );
    await expect(page.locator("#location-card-bell-annex")).toHaveCount(0);
    await expect(page.locator("#location-card-chapel")).toContainText("Taylor (player)");
    await expect(page.locator("#location-card-chapel")).not.toContainText("New NPC");
    await page.locator("#debug-tab-npcs").click();
    await expect(page.locator("#npc-card-debug-npc-1")).toHaveCount(0);
    await page.locator("#npc-card-mira-collapse-toggle").click();
    await expect(page.locator("#npc-debug-mira-description")).toHaveValue(
      "A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.",
    );

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

async function expectStoryStreamNearBottom(page: import("@playwright/test").Page) {
  await expect
    .poll(async () =>
      page.locator("#story-stream").evaluate((element) =>
        Math.max(0, element.scrollHeight - element.scrollTop - element.clientHeight),
      ),
    )
    .toBeLessThanOrEqual(32);
}
