export type NpcPatch = {
  name?: string;
  description?: string;
  locationKey?: string;
  facts?: Record<string, string>;
};

export class NpcSaveQueue {
  private queued: NpcPatch | null = null;
  private running: Promise<boolean> | null = null;
  private generation = 0;

  constructor(private readonly persist: (patch: NpcPatch) => Promise<boolean>) {}

  stage(patch: NpcPatch) {
    this.queued = mergeNpcPatches(this.queued, patch);
  }

  flush() {
    if (!this.running) {
      const generation = this.generation;
      this.running = this.drain(generation).finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  async cancelAndWait() {
    this.generation += 1;
    this.queued = null;
    await this.running;
  }

  async reset<T>(reset: () => Promise<T>) {
    await this.cancelAndWait();
    return reset();
  }

  private async drain(generation: number) {
    while (this.queued && generation === this.generation) {
      const patch = this.queued;
      this.queued = null;
      const saved = await this.persist(patch);

      if (generation !== this.generation) {
        return saved;
      }
      if (!saved) {
        this.queued = this.queued ? mergeNpcPatches(patch, this.queued) : patch;
        return false;
      }
    }

    return true;
  }
}

export function mergeNpcPatches(current: NpcPatch | null, next: NpcPatch): NpcPatch {
  return {
    ...(current ?? {}),
    ...next,
    facts:
      current?.facts || next.facts
        ? {
            ...(current?.facts ?? {}),
            ...(next.facts ?? {}),
          }
        : undefined,
  };
}
