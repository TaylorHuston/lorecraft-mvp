import { describe, expect, it } from "vitest";
import { NpcSaveQueue, type NpcPatch } from "./npc-save-queue";

describe("NpcSaveQueue", () => {
  it("LC-001-S9/R3-S7 serializes saves and merges patches staged during an active save", async () => {
    const persisted: NpcPatch[] = [];
    let releaseFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    const queue = new NpcSaveQueue(async (patch) => {
      persisted.push(patch);
      if (persisted.length === 1) {
        await firstSave;
      }
      return true;
    });

    queue.stage({ name: "Mira" });
    const flush = queue.flush();
    await Promise.resolve();
    queue.stage({ description: "A careful local." });
    queue.stage({ facts: { mood: "wary" } });

    expect(persisted).toEqual([{ name: "Mira" }]);
    releaseFirstSave?.();
    expect(await flush).toBe(true);
    expect(persisted).toEqual([
      { name: "Mira" },
      { description: "A careful local.", facts: { mood: "wary" } },
    ]);
  });

  it("LC-001-S9/R3-S8 drops queued patches and waits for the active save before reset", async () => {
    const events: string[] = [];
    let releaseActiveSave: (() => void) | undefined;
    const activeSave = new Promise<void>((resolve) => {
      releaseActiveSave = resolve;
    });
    const queue = new NpcSaveQueue(async (patch) => {
      events.push(`save:${patch.name ?? patch.description}`);
      await activeSave;
      events.push("save:done");
      return true;
    });

    queue.stage({ name: "stale name" });
    const flush = queue.flush();
    await Promise.resolve();
    queue.stage({ description: "queued stale description" });
    const reset = queue.reset(async () => {
      events.push("reset");
    });

    expect(events).toEqual(["save:stale name"]);
    releaseActiveSave?.();
    await Promise.all([flush, reset]);
    expect(events).toEqual(["save:stale name", "save:done", "reset"]);
  });
});
