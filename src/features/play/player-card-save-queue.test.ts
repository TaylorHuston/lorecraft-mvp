import { describe, expect, it } from "vitest";
import { PlayerCardSaveQueue, type PlayerCardSaveStatus } from "./player-card-save-queue";

describe("PlayerCardSaveQueue", () => {
  it("serializes saves and persists the latest draft staged during an active request", async () => {
    const persisted: string[] = [];
    const statuses: PlayerCardSaveStatus[] = [];
    let releaseFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    const queue = new PlayerCardSaveQueue<string>(async (value) => {
      persisted.push(value);
      if (value === "first") {
        await firstSave;
      }
      return true;
    }, (status) => statuses.push(status));

    queue.stage("first");
    const flush = queue.flush();
    await Promise.resolve();
    queue.stage("second");
    queue.stage("latest");
    releaseFirstSave?.();
    await flush;

    expect(persisted).toEqual(["first", "latest"]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("does not report saved after a failed final write", async () => {
    const statuses: PlayerCardSaveStatus[] = [];
    const queue = new PlayerCardSaveQueue<string>(async () => false, (status) => statuses.push(status));

    queue.stage("draft");
    const saved = await queue.flush();

    expect(saved).toBe(false);
    expect(statuses).toEqual(["unsaved", "saving", "error"]);
  });

  it("retries the latest draft after a failed write", async () => {
    let attempts = 0;
    const queue = new PlayerCardSaveQueue<string>(async () => {
      attempts += 1;
      return attempts > 1;
    }, () => undefined);

    queue.stage("draft");
    expect(await queue.flush()).toBe(false);
    expect(await queue.flush()).toBe(true);
    expect(attempts).toBe(2);
  });
});
