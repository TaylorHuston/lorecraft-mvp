import { expect, test } from "@playwright/test";

test.describe("LC-001-S11, LC-001-S12, and LC-002 End To End Playtest Verification", () => {
  test("records Story setup and hidden Guide steering without leaking Guide text", async ({ page }) => {
    const temporaryAdventureIds: string[] = [];

    try {
      await page.goto("/");
      await ensureSeedWorlds(page);
      await clickCreateAdventureForWorld(page, "Stormbound Chapel");
      const adventureId = await readAdventureIdFromUrl(page);
      temporaryAdventureIds.push(adventureId);
      await expect(page.locator("#act-turn-button")).toBeVisible({ timeout: 30_000 });

      const storyText = "The altar candle burns blue before anyone touches it.";
      await submitStory(page, storyText);
      await expect(page.locator("#story-feed [data-story-kind='story']")).toContainText(storyText);
      await expect(page.locator("#story-feed [data-story-kind='story']")).toContainText("Story");
      await openDebugPanel(page);
      await page.locator("#debug-tab-state").click();
      await expect(page.locator("#debug-list-turns-items")).toContainText("None yet.");
      await page.locator("#debug-panel-close").click();

      const guideText = "Privately steer Mira to mention the midnight bell.";
      await submitGuide(page, guideText);
      await expect(page.locator("#turn-pending-placeholder")).toBeVisible();
      await expect(page.locator("#act-turn-button")).toBeVisible({ timeout: 60_000 });
      await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");
      await expect(page.locator("#story-stream")).not.toContainText(guideText);
      await openDebugPanel(page);
      await page.locator("#debug-tab-state").click();
      await expect(page.locator("#debug-list-turns-items")).toContainText("Turn #1: Guide succeeded");
      await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(storyText);
      await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
        "[Hidden Guide]",
      );
      await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(guideText);
      await page.locator("#debug-panel-close").click();

      await page.reload();
      await expect(page.locator("#story-feed [data-story-kind='story']")).toContainText(storyText);
      await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");
      await expect(page.locator("#story-stream")).not.toContainText(guideText);

      await deleteTemporaryAdventure(page, adventureId);
      temporaryAdventureIds.splice(temporaryAdventureIds.indexOf(adventureId), 1);
    } finally {
      for (const adventureId of temporaryAdventureIds) {
        await deleteTemporaryAdventure(page, adventureId).catch(() => {});
      }
    }
  });

  test("runs a deterministic seeded-Adventure browser playtest", async ({ page }) => {
    const temporaryAdventureIds: string[] = [];

    try {
      await page.goto("/");
      await expect(page.locator("#lorecraft-app")).toBeVisible();

      await seedFreshWorld(page);
      await expect(page.locator("#player-card")).toBeVisible();
      await expect(page.locator("#player-card-name")).toContainText("Taylor");
      await expect(page.locator("#room-info-card")).toBeVisible();
      await expect(page.locator("#room-info-card-title")).toContainText("Chapel");
      await expect(page.locator("#room-info-description")).toContainText("Rain taps against warped shutters");
      await expect(page.locator("#room-info-npc-list")).toContainText("Mira");
      await expect(page.locator("#room-info-npc-list")).toContainText("Brother Alden");
      await expect(page.locator("#room-info-npc-list")).not.toContainText("Taylor");
      await page.locator("#room-info-npc-mira").click();
      await expect(page.locator("#room-info-card-title")).toContainText("Mira");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText(
        "A careful local",
      );
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Background");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Persona");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Voice");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Mood");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Status");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Memory");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Knowledge");
      await expect(page.locator("#room-info-npc-profile-mira")).toContainText("Chapel");
      await expect(page.locator("#room-info-npc-list")).not.toBeVisible();
      await page.locator("#room-info-npc-back-button").click();
      await expect(page.locator("#room-info-card-title")).toContainText("Chapel");
      await expect(page.locator("#room-info-npc-list")).toBeVisible();
      await expect(page.locator("#debug-panel")).not.toHaveAttribute("open", "");
      await expect(page.locator("#help-dialog")).not.toHaveAttribute("open", "");
      await page.locator("#help-dialog-toggle").click();
      await expect(page.locator("#help-dialog")).toHaveAttribute("open", "");
      await expect(page.locator("#help-dialog-content")).toContainText("Act");
      await expect(page.locator("#help-dialog-content")).toContainText("Story");
      await expect(page.locator("#help-dialog-content")).toContainText("Guide");
      await expect(page.locator("#help-dialog-content")).toContainText("Pass");
      await expect(page.locator("#help-dialog-content")).toContainText("/help");
      await expect(page.locator("#help-dialog-content")).toContainText("/look <target>");
      await expect(page.locator("#help-dialog-content")).toHaveCSS("overflow-y", "auto");
      await page.locator("#help-dialog-close").press("Escape");
      await expect(page.locator("#help-dialog")).not.toHaveAttribute("open", "");
      await expect(page.locator("#help-dialog-toggle")).toBeFocused();
      await page.locator("#help-dialog-toggle").click();
      await page.locator("#help-dialog-close").click();
      await expect(page.locator("#help-dialog-toggle")).toBeFocused();
      await page.locator("#help-dialog-toggle").click();
      await page.mouse.click(5, 5);
      await expect(page.locator("#help-dialog")).not.toHaveAttribute("open", "");
      await expect(page.locator("#help-dialog-toggle")).toBeFocused();

      const desktopPaneLayout = await page.evaluate(() => {
        const player = document.querySelector<HTMLElement>("#player-card");
        const story = document.querySelector<HTMLElement>("#story-workspace");
        const room = document.querySelector<HTMLElement>("#room-info-card");
        if (!player || !story || !room) {
          return null;
        }
        return {
          player: player.getBoundingClientRect().toJSON(),
          story: story.getBoundingClientRect().toJSON(),
          room: room.getBoundingClientRect().toJSON(),
          playerOverflowY: getComputedStyle(player).overflowY,
          storyStreamOverflowY: getComputedStyle(
            document.querySelector<HTMLElement>("#story-stream")!,
          ).overflowY,
          roomOverflowY: getComputedStyle(room).overflowY,
          documentScrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
        };
      });
      expect(desktopPaneLayout).not.toBeNull();
      expect(desktopPaneLayout!.story.width).toBeGreaterThan(desktopPaneLayout!.player.width);
      expect(desktopPaneLayout!.story.width).toBeGreaterThan(desktopPaneLayout!.room.width);
      expect(desktopPaneLayout!.player.height).toBe(desktopPaneLayout!.story.height);
      expect(desktopPaneLayout!.room.height).toBe(desktopPaneLayout!.story.height);
      expect(desktopPaneLayout!.playerOverflowY).toBe("auto");
      expect(desktopPaneLayout!.storyStreamOverflowY).toBe("auto");
      expect(desktopPaneLayout!.roomOverflowY).toBe("auto");
      expect(desktopPaneLayout!.documentScrollHeight).toBe(desktopPaneLayout!.viewportHeight);
      await expect(
        page.locator("#mobile-player-pane[role='tabpanel'], #story-workspace[role='tabpanel'], #mobile-room-pane[role='tabpanel']"),
      ).toHaveCount(0);

      const contextToggleGeometry = await page.evaluate(() => {
        const playerPane = document.querySelector<HTMLElement>("#player-card")!.getBoundingClientRect();
        const playerToggle = document
          .querySelector<HTMLElement>("#player-card-collapse-toggle")!
          .getBoundingClientRect();
        const roomPane = document.querySelector<HTMLElement>("#room-info-card")!.getBoundingClientRect();
        const roomToggle = document
          .querySelector<HTMLElement>("#room-info-collapse-toggle")!
          .getBoundingClientRect();
        const playerToggleVisual = document
          .querySelector<HTMLElement>("#player-card-collapse-toggle > [aria-hidden='true']")!
          .getBoundingClientRect();
        const roomToggleVisual = document
          .querySelector<HTMLElement>("#room-info-collapse-toggle > [aria-hidden='true']")!
          .getBoundingClientRect();
        return {
          playerInset: playerToggle.x - playerPane.x,
          roomInset: roomPane.right - roomToggle.right,
          playerHitTarget: { width: playerToggle.width, height: playerToggle.height },
          roomHitTarget: { width: roomToggle.width, height: roomToggle.height },
          playerVisual: { width: playerToggleVisual.width, height: playerToggleVisual.height },
          roomVisual: { width: roomToggleVisual.width, height: roomToggleVisual.height },
        };
      });
      expect(contextToggleGeometry.playerInset).toBeLessThanOrEqual(20);
      expect(contextToggleGeometry.roomInset).toBeLessThanOrEqual(20);
      expect(contextToggleGeometry.playerHitTarget).toEqual({ width: 44, height: 44 });
      expect(contextToggleGeometry.roomHitTarget).toEqual({ width: 44, height: 44 });
      expect(contextToggleGeometry.playerVisual).toEqual({ width: 28, height: 28 });
      expect(contextToggleGeometry.roomVisual).toEqual({ width: 28, height: 28 });

      const storyBeforeContextCollapse = await page.locator("#story-workspace").boundingBox();
      expect(storyBeforeContextCollapse).not.toBeNull();
      await page.locator("#player-card-collapse-toggle").click();
      await expect(page.locator("#player-card-collapse-toggle")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect(page.locator("#player-card-fields")).toBeHidden();
      const storyAfterPlayerCollapse = await page.locator("#story-workspace").boundingBox();
      expect(storyAfterPlayerCollapse?.x).toBe(storyBeforeContextCollapse?.x);
      expect(storyAfterPlayerCollapse?.width).toBe(storyBeforeContextCollapse?.width);
      await page.locator("#player-card-collapse-toggle").click();

      await page.locator("#room-info-collapse-toggle").click();
      await expect(page.locator("#room-info-collapse-toggle")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect(page.locator("#room-info-card-body")).toBeHidden();
      const storyAfterRoomCollapse = await page.locator("#story-workspace").boundingBox();
      expect(storyAfterRoomCollapse?.x).toBe(storyBeforeContextCollapse?.x);
      expect(storyAfterRoomCollapse?.width).toBe(storyBeforeContextCollapse?.width);
      await page.locator("#room-info-collapse-toggle").click();

      await page.locator("#skip-to-story-link").focus();
      await expect(page.locator("#skip-to-story-link")).toBeVisible();
      await page.locator("#skip-to-story-link").press("Enter");
      await expect(page.locator("#story-stream")).toBeFocused();

      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.locator("#mobile-story-tab")).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#story-workspace")).toBeVisible();
      await expect(page.locator("#player-card")).toBeHidden();
      await expect(page.locator("#room-info-card")).toBeHidden();
      await page.locator("#mobile-story-tab").press("ArrowRight");
      await expect(page.locator("#mobile-room-tab")).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#mobile-room-tab")).toBeFocused();
      await page.locator("#mobile-room-tab").press("Home");
      await expect(page.locator("#mobile-player-tab")).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#mobile-player-tab")).toBeFocused();
      await page.locator("#mobile-player-tab").press("End");
      await expect(page.locator("#mobile-room-tab")).toHaveAttribute("aria-selected", "true");
      await page.locator("#mobile-room-tab").press("ArrowLeft");
      await expect(page.locator("#mobile-story-tab")).toHaveAttribute("aria-selected", "true");
      await page.locator("#mobile-player-tab").click();
      await expect(page.locator("#player-card")).toBeVisible();
      await expect(page.locator("#story-workspace")).toBeHidden();
      await page.locator("#mobile-room-tab").click();
      await expect(page.locator("#room-info-card")).toBeVisible();
      await expect(page.locator("#player-card")).toBeHidden();
      await page.locator("#mobile-story-tab").click();
      await expect(page.locator("#story-workspace")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
      await page.setViewportSize({ width: 1440, height: 900 });

      const directorInput = page.locator("#director-input");
      await expect(directorInput).toBeVisible();
      await directorInput.fill("/");
      await expect(page.locator("#slash-command-autocomplete")).toContainText("/help");
      await expect(page.locator("#slash-command-autocomplete")).toContainText("/look");
      await directorInput.press("ArrowDown");
      await directorInput.press("ArrowUp");
      await directorInput.fill("/l");
      await directorInput.press("Enter");
      await expect(directorInput).toHaveValue("/look ");
      await directorInput.fill("/look Mi");
      await expect(page.locator("#slash-command-autocomplete")).toContainText("Mira");
      await directorInput.press("Tab");
      await expect(directorInput).toHaveValue("/look Mira");
      await directorInput.press("Enter");
      await expect(page.locator("#story-feed [data-story-kind='utility']")).toContainText("Mira", {
        timeout: 60_000,
      });
      await expect(directorInput).toBeVisible({ timeout: 60_000 });
      await expect(directorInput).toHaveValue("");

      await submitSlashCommand(page, "/help");
      await expect(page.locator("#story-feed [data-story-kind='utility']").last()).toContainText(
        "Available commands:",
      );
      await submitSlashCommand(page, "/look moonblade");
      await expect(page.locator("#story-feed [data-story-kind='utility']").last()).toContainText(
        'You do not see "moonblade" here to inspect.',
      );
      const playerText = "Mira, what do you know about the storm?";
      await submitAct(page, playerText);

      await expect(page.locator("#turn-pending-placeholder")).toBeVisible();
      await expect(page.locator("#director-input")).toBeDisabled();
      await expect(page.locator("#act-turn-button")).toBeEnabled({ timeout: 60_000 });
      await expect(page.locator("#story-stream")).toContainText(playerText);
      await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");
      await expect(page).toHaveURL(/\/adventures\/[^/]+$/);

      await page.reload();
      const reloadedUtilityEntries = page.locator("#story-feed [data-story-kind='utility']");
      await expect(reloadedUtilityEntries.filter({ hasText: "Mira" })).toBeVisible();
      await expect(reloadedUtilityEntries.filter({ hasText: "Available commands:" })).toBeVisible();
      await expect(
        reloadedUtilityEntries.filter({ hasText: 'You do not see "moonblade" here to inspect.' }),
      ).toBeVisible();
      await expect(page.locator("#story-stream")).toContainText(playerText);
      await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");
      await openDebugPanel(page);

      const debugPanel = page.locator("#debug-panel");
      const debugToggle = page.locator("#debug-panel-toggle");
      await expect(debugPanel).toHaveAttribute("open", "");
      await expect(debugPanel).toHaveAttribute("aria-modal", "true");
      await expect(page.locator("#debug-panel-content")).toHaveCSS("overflow-y", "auto");
      await page.locator("#debug-panel-close").press("Escape");
      await expect(debugPanel).not.toHaveAttribute("open", "");
      await expect(debugToggle).toBeFocused();
      await openDebugPanel(page);
      await expect(debugPanel).toHaveAttribute("open", "");
      await page.locator("#debug-panel-close").click();
      await expect(debugToggle).toBeFocused();
      await openDebugPanel(page);
      await page.mouse.click(5, 5);
      await expect(debugPanel).not.toHaveAttribute("open", "");
      await expect(debugToggle).toBeFocused();
      await openDebugPanel(page);

      await page.locator("#debug-tab-state").click();
      await expect(page.locator("#debug-list-scene-items")).toContainText("Adventure:");
      await expect(page.locator("#debug-list-scene-items")).toContainText("Source WorldVersion: v1");
      await expect(page.locator("#debug-list-turns-items")).toContainText("Turn #1: Act succeeded");
      await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
        "lorecraft-fixture-model",
      );
      await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
        "story_generation",
      );
      await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
        "worldVersionId",
      );
      await expect(page.locator("#debug-json-game-master-calls-content")).toContainText(
        "npc_state_extraction",
      );
      await expect(page.locator("#debug-list-state-changes-items")).toContainText(
        "memory -> Mira told Taylor the storm began after the chapel bell rang at midnight.",
      );

      await page.locator("#debug-panel-close").click();
      await expect(page.locator("#debug-panel")).not.toHaveAttribute("open", "");
      const passDraft = "I am still deciding what to do.";
      await page.locator("#director-input").fill(passDraft);
      await page.locator("#pass-turn-button").click();
      await expect(page.locator("#turn-pending-placeholder")).toBeVisible();
      await expect(page.locator("#act-turn-button")).toBeVisible({ timeout: 60_000 });
      await expect(page.locator("#story-stream")).toContainText(
        "rain presses harder against the chapel roof",
      );
      await expect(page.locator("#story-feed [data-story-kind='player']")).not.toContainText("Pass");
      await expect(page.locator("#director-input")).toHaveValue(passDraft);
      await openDebugPanel(page);
      await page.locator("#debug-tab-state").click();
      await expect(page.locator("#debug-list-turns-items")).toContainText("Turn #2: Pass succeeded");
      await page.locator("#debug-panel-close").click();
      await expect(page.locator("#debug-panel")).not.toHaveAttribute("open", "");

      const failureText = "I trigger a fixture provider failure.";
      await submitAct(page, failureText);
      await expect(page.locator("#turn-error-message")).toContainText(
        "LLM provider returned HTTP 503.",
        { timeout: 60_000 },
      );
      await expect(page.locator("#director-input")).toHaveValue(failureText);
      await expect(page.locator("#story-stream")).toContainText(playerText);

      await page.reload();
      await expect(page.locator("#story-stream")).toContainText(playerText);
      await openDebugPanel(page);
      await page.locator("#debug-tab-state").click();
      await expect(page.locator("#debug-list-turns-items")).toContainText(
        `Turn #3: Act failed - ${failureText}`,
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
      await page.locator("#new-npc-key").fill("invalid npc key");
      await expect(page.locator("#npc-create-error")).toContainText(
        "NPC key must use lowercase letters, numbers, and hyphens.",
      );
      await expect(page.locator("#create-npc-button")).toBeDisabled();
      await page.locator("#new-npc-key").fill("new-npc");
      await page.locator("#new-npc-name").fill("New NPC");
      await page.locator("#new-npc-description").fill("A temporary NPC for playtesting.");
      await page.locator("#new-npc-location").selectOption("vestry");
      await page.locator("#create-npc-button").click({ clickCount: 2 });
      await expect(page.locator("#npc-card-new-npc")).toContainText("New NPC");
      await expect(page.locator("#npc-card-new-npc")).toHaveCount(1);
      await expect(page.locator("#npc-card-new-npc-location")).toContainText("Vestry");
      await expect(page.locator("#new-npc-key")).toHaveValue("");
      await expect(page.locator("#npc-card-new-npc-collapse-toggle")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      await page.locator("#npc-debug-new-npc-location").selectOption("chapel");
      await expect(page.locator("#npc-card-new-npc-save-status")).toContainText("Saved", {
        timeout: 10_000,
      });
      await expect(page.locator("#npc-card-new-npc-location")).toContainText("Chapel");

      await page.locator("#debug-tab-state").click();
      await expect(page.locator("#debug-list-hidden-facts-items")).not.toContainText(
        "actor:mira.knowledge",
      );

      await submitAct(page, "I look at Mira.");
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

    await submitAct(page, "I go to the vestry.");
    await expect(page.locator("#story-stream")).toContainText("I go to the vestry.", {
      timeout: 60_000,
    });
    await expect(page.locator("#story-stream")).toContainText("enter the vestry");
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-scene-items")).toContainText(
      "Stormbound Chapel / Vestry",
    );
    await expect(page.locator("#room-info-card-title")).toContainText("Vestry");
    await expect(page.locator("#room-info-description")).toContainText(
      "The vestry smells of old paper, damp wool, and fresh sealing wax.",
    );
    await expect(page.locator("#room-info-npc-list")).toContainText("Mira");
    await expect(page.locator("#room-info-npc-list")).not.toContainText("Taylor");
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

    await submitAct(page, "I go to the bell annex.");
    await expect(page.locator("#story-stream")).toContainText("I go to the bell annex.", {
      timeout: 60_000,
    });
    await expect(page.locator("#story-stream")).toContainText("enter the Bell Annex");
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-scene-items")).toContainText(
      "Stormbound Chapel / Bell Annex",
    );
    await expect(page.locator("#room-info-card-title")).toContainText("Bell Annex");
    await expect(page.locator("#room-info-npc-empty")).toContainText("No one else is here.");
    await expect(page.locator("#debug-list-state-changes-items")).toContainText(
      "Taylor: moved to Bell Annex.",
    );

    await submitAct(page, "I go to the bell tower.");
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
    await expect(page.locator("#act-turn-button")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#story-stream")).not.toContainText(playerText);
    await expect(page.locator("#story-stream")).toContainText("You stand in the chapel");
    await page.locator("#debug-tab-state").click();
    await expect(page.locator("#debug-list-scene-items")).toContainText("Source WorldVersion: v1");
    await expect(page.locator("#room-info-card-title")).toContainText("Chapel");
    await expect(page.locator("#room-info-npc-list")).toContainText("Mira");
    await expect(page.locator("#room-info-npc-list")).toContainText("Brother Alden");
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

    await submitAct(page, "I listen to the rain.");
    await expect(page.locator("#story-stream")).toContainText("I listen to the rain.", {
      timeout: 60_000,
    });
    await expect(page.locator("#story-stream")).toContainText("chapel bell rang at midnight");

    await page.locator("#back-to-adventures-button").click();
    await expect(page).toHaveURL("/");
    await page.locator("#adventure-landing").waitFor({ timeout: 30_000 });
    await expect(page.locator("#world-container-list")).toContainText("Tutorial");
      await cancelCreateAdventureForWorld(page, "Stormbound Chapel");
      await clickCreateAdventureForWorld(page, "Stormbound Chapel", "Edda");
      const temporaryStormboundAdventureId = await readAdventureIdFromUrl(page);
      temporaryAdventureIds.push(temporaryStormboundAdventureId);
      await expect(page.locator("#act-turn-button")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("#player-card-name")).toContainText("Edda");
      await expect(page.locator("#player-card-edit-physical-description")).toBeVisible();
      await expect(page.locator("#player-card-edit-physical-description")).toHaveValue("");
      await expect(page.locator("#player-card-edit-backstory")).toHaveValue("");
      await expect(page.locator("#player-card-edit-status")).toHaveValue("");
      await page.locator("#player-card-edit-physical-description").fill(
        "A short traveler with a weathered green cloak.",
      );
      await page.locator("#player-card-edit-backstory").fill(
        "Edda came to the chapel after hearing the bell in a dream.",
      );
      await page.locator("#player-card-edit-status").fill("trying to stay calm in the storm");
      await page.locator("#back-to-adventures-button").click();
      await expect(page).toHaveURL("/");
      await page.locator(`#continue-adventure-${temporaryStormboundAdventureId}`).click();
      await expect(page).toHaveURL(`/adventures/${temporaryStormboundAdventureId}`);
      await expect(page.locator("#player-card-save-status")).toContainText("Current");
      await expect(page.locator("#player-card-edit-physical-description")).toHaveValue(
        /weathered green cloak/,
      );
      await page.locator("#player-card-collapse-toggle").click();
      await expect(page.locator("#player-card-collapse-toggle")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect(page.locator("#player-card-fields")).toBeHidden();
      await page.locator("#player-card-collapse-toggle").click();
      await expect(page.locator("#player-card-collapse-toggle")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      await page.reload();
      await expect(page.locator("#player-card-name")).toContainText("Edda");
      await expect(page.locator("#player-card-edit-backstory")).toHaveValue(/hearing the bell/);
      await expect(page.locator("#player-card-edit-status")).toHaveValue(/trying to stay calm/);
      await deleteTemporaryAdventure(page, temporaryStormboundAdventureId);
      temporaryAdventureIds.splice(temporaryAdventureIds.indexOf(temporaryStormboundAdventureId), 1);
      await expect(page.locator("#adventure-landing-notice")).toContainText("Deleted");

      await clickCreateAdventureForWorld(page, "Tutorial", "Tutorial Player");
      const temporaryTutorialAdventureId = await readAdventureIdFromUrl(page);
      temporaryAdventureIds.push(temporaryTutorialAdventureId);
      await expect(page.locator("#story-stream")).toContainText("Guide Serin", {
        timeout: 30_000,
      });
      await expect(page.locator("#story-stream")).toContainText("look around");
      await deleteTemporaryAdventure(page, temporaryTutorialAdventureId);
      temporaryAdventureIds.splice(temporaryAdventureIds.indexOf(temporaryTutorialAdventureId), 1);
      await expect(page.locator("#adventure-landing-notice")).toContainText("Deleted");
    } finally {
      for (const adventureId of temporaryAdventureIds) {
        await deleteTemporaryAdventure(page, adventureId).catch(() => {});
      }
    }
  });
});

async function ensureSeedWorlds(page: import("@playwright/test").Page) {
  await page.locator("#adventure-landing, #seed-world-button").first().waitFor({ timeout: 30_000 });
  if (await page.locator("#seed-world-button").isVisible()) {
    await page.locator("#seed-world-button").click();
    await expect(page).toHaveURL(/\/adventures\/[^/]+$/);
    await page.locator("#back-to-adventures-button").click();
  }
  await expect(page).toHaveURL("/");
  await page.locator("#adventure-landing").waitFor({ timeout: 30_000 });
  await expect(page.locator("#adventure-list-loading-state")).toHaveCount(0, {
    timeout: 30_000,
  });
}

async function seedFreshWorld(page: import("@playwright/test").Page) {
  await page.waitForFunction(() =>
    Boolean(
      document.querySelector("#director-input") ??
        document.querySelector("#act-turn-button") ??
        document.querySelector("#adventure-landing") ??
        document.querySelector("#seed-world-button"),
    ),
  );

  if (await page.locator("#adventure-landing").isVisible()) {
    await expect(page.locator("#adventure-list-loading-state")).toHaveCount(0, {
      timeout: 30_000,
    });
    if (await page.locator("#seed-world-button").isVisible()) {
      await page.locator("#seed-world-button").click();
      await expect(page).toHaveURL(/\/adventures\/[^/]+$/);
    }
    const stormboundContainer = page.locator("section[id^='world-container-']").filter({
      hasText: "Stormbound Chapel",
    });
    if (await stormboundContainer.locator("button[id^='continue-adventure-']").first().isVisible()) {
      await stormboundContainer.locator("button[id^='continue-adventure-']").first().click();
      await expect(page).toHaveURL(/\/adventures\/[^/]+$/);
      await expect(page.locator("#act-turn-button")).toBeVisible({ timeout: 30_000 });
      await openDebugPanel(page);
      await page.locator("#fresh-seed-button").click();
      await expect(page).toHaveURL(/\/adventures\/[^/]+$/);
    } else if (await stormboundContainer.locator("button[id^='create-adventure-']").isVisible()) {
      await clickCreateAdventureForWorld(page, "Stormbound Chapel");
      await expect(page).toHaveURL(/\/adventures\/[^/]+$/);
    }
  } else if (await page.locator("#seed-world-button").isVisible()) {
    await page.locator("#seed-world-button").click();
    await expect(page).toHaveURL(/\/adventures\/[^/]+$/);
  }

  await expect(page.locator("#act-turn-button")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#act-turn-button")).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator("#director-input")).toBeVisible();
  await expect(page.locator("#story-stream")).toContainText("You stand in the chapel", {
    timeout: 30_000,
  });
}

async function cancelCreateAdventureForWorld(page: import("@playwright/test").Page, worldName: string) {
  const worldContainer = page.locator("section[id^='world-container-']").filter({
    hasText: worldName,
  });

  await expect(worldContainer.locator("button[id^='create-adventure-']")).toBeVisible();
  await worldContainer.locator("button[id^='create-adventure-']").click();
  await expect(worldContainer.locator("input[id^='create-adventure-player-name-']")).toBeVisible();
  await worldContainer.locator("input[id^='create-adventure-player-name-']").fill("Canceled");
  await worldContainer.locator("button[id^='cancel-create-adventure-']").click();
  await expect(worldContainer.locator("input[id^='create-adventure-player-name-']")).toHaveCount(0);
}

async function clickCreateAdventureForWorld(
  page: import("@playwright/test").Page,
  worldName: string,
  playerName = worldName === "Tutorial" ? "Tutorial Player" : "Taylor",
) {
  const worldContainer = page.locator("section[id^='world-container-']").filter({
    hasText: worldName,
  });
  const createButton = worldContainer.locator("button[id^='create-adventure-']");

  await expect(worldContainer).toBeVisible();
  await expect(createButton).toBeVisible();
  await createButton.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await createButton.click();
  const nameInput = worldContainer.locator("input[id^='create-adventure-player-name-']");
  await expect(nameInput).toBeVisible();
  await nameInput.fill(playerName);
  await worldContainer.locator("button[id^='confirm-create-adventure-']").click();
}

async function readAdventureIdFromUrl(page: import("@playwright/test").Page) {
  await page.waitForURL(/\/adventures\/[^/]+$/);
  const adventureId = new URL(page.url()).pathname.split("/").pop();
  if (!adventureId) {
    throw new Error("Expected created Adventure URL to include an Adventure id.");
  }
  return adventureId;
}

async function deleteTemporaryAdventure(page: import("@playwright/test").Page, adventureId: string) {
  if (page.url() !== new URL("/", page.url()).href) {
    const backToAdventuresButton = page.locator("#back-to-adventures-button");
    if (await backToAdventuresButton.isVisible()) {
      await backToAdventuresButton.click();
    } else {
      await page.goto("/");
    }
  }

  await expect(page).toHaveURL("/");
  await page.locator("#adventure-landing").waitFor({ timeout: 30_000 });

  const temporaryAdventureCard = page.locator(`#adventure-card-${adventureId}`);
  if (!(await temporaryAdventureCard.isVisible())) {
    return;
  }

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Delete");
    await dialog.accept();
  });
  await page.locator(`#delete-adventure-${adventureId}`).click();
  await expect(temporaryAdventureCard).toHaveCount(0);
}

async function submitAct(page: import("@playwright/test").Page, input: string) {
  const directorInput = page.locator("#director-input");
  await expect(directorInput).toBeVisible();
  await directorInput.fill(input);
  await directorInput.press("Enter");
}

async function submitSlashCommand(page: import("@playwright/test").Page, input: string) {
  const directorInput = page.locator("#director-input");
  await expect(directorInput).toBeVisible();
  await directorInput.fill(input);
  await directorInput.press("Enter");
  await expect(directorInput).toBeVisible({ timeout: 60_000 });
  await expect(directorInput).toHaveValue("");
}

async function submitStory(page: import("@playwright/test").Page, input: string) {
  const storyInput = page.locator("#director-input");
  await expect(storyInput).toBeVisible();
  await storyInput.fill(input);
  await page.locator("#story-turn-button").click();
  await expect(storyInput).toHaveValue("", { timeout: 30_000 });
}

async function submitGuide(page: import("@playwright/test").Page, input: string) {
  const guideInput = page.locator("#director-input");
  await expect(guideInput).toBeVisible();
  await guideInput.fill(input);
  await page.locator("#guide-turn-button").click();
}

async function openDebugPanel(page: import("@playwright/test").Page) {
  const debugPanel = page.locator("#debug-panel");
  await expect(debugPanel).not.toHaveAttribute("open", "");
  await page.locator("#debug-panel-toggle").click();
  await expect(debugPanel).toHaveAttribute("open", "");
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
