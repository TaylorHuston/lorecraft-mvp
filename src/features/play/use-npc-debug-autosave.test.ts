import { describe, expect, it } from "vitest";
import { defaultNpcFacts, validateNewNpcDraft } from "./use-npc-debug-autosave";

const locations = [{ key: "chapel" }, { key: "vestry" }];

describe("NPC debug creation", () => {
  it("LC-001-S9/R3-S9 requires a valid key, name, description, and Adventure location", () => {
    expect(
      validateNewNpcDraft(
        { key: "new npc", name: "", description: "", locationKey: "unknown" },
        locations,
      ),
    ).toBe("NPC key must use lowercase letters, numbers, and hyphens.");

    expect(
      validateNewNpcDraft(
        { key: "new-npc", name: "New NPC", description: "", locationKey: "chapel" },
        locations,
      ),
    ).toBe("NPC name and description are required.");

    expect(
      validateNewNpcDraft(
        {
          key: "new-npc",
          name: "New NPC",
          description: "A temporary playtest character.",
          locationKey: "unknown",
        },
        locations,
      ),
    ).toBe("Select a valid location for this NPC.");

    expect(
      validateNewNpcDraft(
        {
          key: "new-npc",
          name: "New NPC",
          description: "A temporary playtest character.",
          locationKey: "vestry",
        },
        locations,
      ),
    ).toBeNull();
  });

  it("LC-001-S9/R3-S4 initializes every canonical NPC profile fact", () => {
    expect(Object.keys(defaultNpcFacts())).toEqual([
      "background",
      "persona",
      "voice",
      "mood",
      "status",
      "memory",
      "knowledge",
    ]);
  });
});
