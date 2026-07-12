import { describe, expect, it } from "vitest";
import type { MutationCtx } from "./_generated/server";
import { createNpcInternal, updateNpcInternal } from "./world";

describe("NPC patch mutation", () => {
  it("preserves omitted facts and deletes only an explicitly empty fact", async () => {
    const ctx = fakeMutationCtx({
      adventures: [row("adventure-1", { worldId: "world-1" })],
      actors: [
        row("actor-mira", {
          worldId: "world-1",
          adventureId: "adventure-1",
          roomId: "room-1",
          key: "mira",
          name: "Mira",
          description: "A watchful bell-keeper.",
          role: "npc",
        }),
      ],
      facts: [
        row("fact-background", {
          worldId: "world-1",
          adventureId: "adventure-1",
          subjectType: "actor",
          subjectId: "actor:mira",
          key: "background",
          value: "Mira has kept the bell for ten winters.",
          source: "seed",
        }),
        row("fact-mood", {
          worldId: "world-1",
          adventureId: "adventure-1",
          subjectType: "actor",
          subjectId: "actor:mira",
          key: "mood",
          value: "Wary",
          source: "seed",
        }),
        row("fact-status", {
          worldId: "world-1",
          adventureId: "adventure-1",
          subjectType: "actor",
          subjectId: "actor:mira",
          key: "status",
          value: "Listening near the altar",
          source: "seed",
        }),
      ],
    });

    const result = await updateNpcHandler(ctx, {
      adventureId: "adventure-1",
      actorId: "actor-mira",
      facts: { mood: "Calm", status: "" },
    });

    expect(result).toEqual({ ok: true, actorId: "actor-mira" });
    expect(ctx.rows.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "background", value: "Mira has kept the bell for ten winters." }),
        expect.objectContaining({ key: "mood", value: "Calm", source: "manual" }),
      ]),
    );
    expect(ctx.rows.facts).not.toContainEqual(expect.objectContaining({ key: "status" }));
  });

  it("rejects an unknown Adventure location without changing the actor", async () => {
    const actor = row("actor-mira", {
      worldId: "world-1",
      adventureId: "adventure-1",
      roomId: "room-1",
      key: "mira",
      name: "Mira",
      description: "A watchful bell-keeper.",
      role: "npc",
    });
    const ctx = fakeMutationCtx({ actors: [actor], rooms: [], facts: [] });

    const result = await updateNpcHandler(ctx, {
      adventureId: "adventure-1",
      actorId: "actor-mira",
      locationKey: "unknown-place",
    });

    expect(result).toEqual({
      ok: false,
      error: "NPC location could not be found in this Adventure.",
    });
    expect(ctx.rows.actors[0]).toMatchObject({ roomId: "room-1" });
  });

  it("rejects a patch with no changed fields", async () => {
    const ctx = fakeMutationCtx({
      actors: [
        row("actor-mira", {
          worldId: "world-1",
          adventureId: "adventure-1",
          roomId: "room-1",
          key: "mira",
          name: "Mira",
          description: "A watchful bell-keeper.",
          role: "npc",
        }),
      ],
      facts: [],
    });

    expect(
      await updateNpcHandler(ctx, {
        adventureId: "adventure-1",
        actorId: "actor-mira",
      }),
    ).toEqual({
      ok: false,
      error: "NPC update must include at least one changed field.",
    });
  });
});

describe("NPC creation mutation", () => {
  const facts = {
    background: "A newcomer.",
    persona: "Curious.",
    voice: "Direct.",
    mood: "neutral",
    status: "waiting",
    memory: "No shared memories.",
    knowledge: "No private knowledge.",
  };

  it("creates one canonical NPC in the explicitly selected Adventure location", async () => {
    const ctx = creationContext();

    const result = await createNpcHandler(ctx, {
      adventureId: "adventure-1",
      key: "new-npc",
      name: "New NPC",
      description: "A temporary playtest character.",
      locationKey: "vestry",
      facts,
    });

    expect(result).toEqual({ ok: true, actorId: "actors-1" });
    expect(ctx.rows.actors).toContainEqual(
      expect.objectContaining({ key: "new-npc", roomId: "room-vestry", adventureId: "adventure-1" }),
    );
    expect(ctx.rows.facts).toHaveLength(7);
  });

  it("rejects an unknown location without creating an actor", async () => {
    const ctx = creationContext();

    expect(
      await createNpcHandler(ctx, {
        adventureId: "adventure-1",
        key: "new-npc",
        name: "New NPC",
        description: "A temporary playtest character.",
        locationKey: "unknown",
        facts,
      }),
    ).toEqual({ ok: false, error: "NPC location could not be found in this Adventure." });
    expect(ctx.rows.actors).toHaveLength(0);
  });

  it("rejects a duplicate key or name without creating another actor", async () => {
    const ctx = creationContext([
      row("actor-existing", {
        worldId: "world-1",
        adventureId: "adventure-1",
        roomId: "room-vestry",
        key: "new-npc",
        name: "Existing NPC",
        description: "Already here.",
        role: "npc",
      }),
    ]);

    expect(
      await createNpcHandler(ctx, {
        adventureId: "adventure-1",
        key: "new-npc",
        name: "Another NPC",
        description: "Should not be created.",
        locationKey: "vestry",
        facts,
      }),
    ).toEqual({ ok: false, error: "An actor with that key or name already exists." });
    expect(ctx.rows.actors).toHaveLength(1);
  });
});

type NpcPatchArgs = {
  adventureId: string;
  actorId: string;
  name?: string;
  description?: string;
  locationKey?: string;
  facts?: Partial<Record<"background" | "persona" | "voice" | "mood" | "status" | "memory" | "knowledge", string>>;
};

type NpcPatchResult = { ok: boolean; error?: string; actorId?: string };

const updateNpcHandler = (
  updateNpcInternal as unknown as {
    _handler: (ctx: MutationCtx, args: NpcPatchArgs) => Promise<NpcPatchResult>;
  }
)._handler;

type NpcCreateArgs = {
  adventureId: string;
  key: string;
  name: string;
  description: string;
  locationKey: string;
  facts: Record<string, string>;
};

const createNpcHandler = (
  createNpcInternal as unknown as {
    _handler: (ctx: MutationCtx, args: NpcCreateArgs) => Promise<NpcPatchResult>;
  }
)._handler;

function creationContext(existingActors: Array<Record<string, unknown>> = []) {
  return fakeMutationCtx({
    adventures: [
      row("adventure-1", {
        worldId: "world-1",
        worldVersionId: "version-1",
      }),
    ],
    worldVersions: [
      row("version-1", {
        baseline: {
          world: { name: "Test", description: "Test world" },
          rooms: [],
          exits: [],
          player: { key: "player", name: "Player", description: "", roomKey: "vestry" },
          npcs: [],
          objects: [],
          initialEvent: "",
          initialNarration: "",
        },
      }),
    ],
    rooms: [
      row("room-vestry", {
        worldId: "world-1",
        adventureId: "adventure-1",
        key: "vestry",
        name: "Vestry",
        description: "A small vestry.",
      }),
    ],
    actors: existingActors,
    facts: [],
  });
}

function row(_id: string, values: Record<string, unknown>) {
  return { _id, _creationTime: 1, ...values };
}

function fakeMutationCtx(initialRows: Record<string, Array<Record<string, unknown>>>) {
  const rows = Object.fromEntries(
    Object.entries(initialRows).map(([table, records]) => [table, records.map((record) => ({ ...record }))]),
  );

  const ctx = {
    rows,
    db: {
      async get(id: string) {
        return Object.values(rows).flat().find((record) => record._id === id) ?? null;
      },
      async patch(id: string, patch: Record<string, unknown>) {
        const record = Object.values(rows).flat().find((candidate) => candidate._id === id);
        if (!record) throw new Error(`Missing row ${id}`);
        Object.assign(record, patch);
      },
      async delete(id: string) {
        for (const records of Object.values(rows)) {
          const index = records.findIndex((record) => record._id === id);
          if (index >= 0) {
            records.splice(index, 1);
            return;
          }
        }
      },
      async insert(table: string, value: Record<string, unknown>) {
        const records = rows[table] ?? (rows[table] = []);
        const id = `${table}-${records.length + 1}`;
        records.push(row(id, value));
        return id;
      },
      query(table: string) {
        let records = [...(rows[table] ?? [])];
        return {
          withIndex(_indexName: string, build?: (query: FakeIndexQuery) => FakeIndexQuery) {
            const filters = build?.(new FakeIndexQuery()).filters ?? [];
            records = records.filter((record) =>
              filters.every(({ field, value }) => record[field] === value),
            );
            return this;
          },
          async unique() {
            if (records.length > 1) throw new Error("Expected at most one row");
            return records[0] ?? null;
          },
          async take(limit: number) {
            return records.slice(0, limit);
          },
        };
      },
    },
  };

  return ctx as unknown as MutationCtx & { rows: typeof rows };
}

class FakeIndexQuery {
  filters: Array<{ field: string; value: unknown }> = [];

  eq(field: string, value: unknown) {
    this.filters.push({ field, value });
    return this;
  }
}
