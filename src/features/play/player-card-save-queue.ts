export type PlayerCardSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export class PlayerCardSaveQueue<T> {
  private queued: T | undefined;
  private running: Promise<boolean> | null = null;

  constructor(
    private readonly persist: (value: T) => Promise<boolean>,
    private readonly onStatusChange: (status: PlayerCardSaveStatus) => void,
  ) {}

  stage(value: T) {
    this.queued = value;
    this.onStatusChange("unsaved");
  }

  flush() {
    if (!this.running) {
      this.running = this.drain().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async drain() {
    while (this.queued !== undefined) {
      const next = this.queued;
      this.queued = undefined;
      this.onStatusChange("saving");

      const saved = await this.persist(next);
      if (!saved && this.queued === undefined) {
        this.queued = next;
        this.onStatusChange("error");
        return false;
      }
    }

    this.onStatusChange("saved");
    return true;
  }
}
