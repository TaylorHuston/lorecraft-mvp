import { describe, expect, it } from "vitest";
import { roomInfoNpcList, selectedRoomNpc } from "./room-info-card";

describe("Room Info Card", () => {
  it("LC-001-S16/R2 lists NPCs present in the current room and excludes the player", () => {
    expect(
      roomInfoNpcList([
        { key: "taylor", name: "Taylor", description: "The player.", role: "player" },
        { key: "mira", name: "Mira", description: "A careful local.", role: "npc" },
        { key: "alden", name: "Brother Alden", description: "A priest.", role: "npc" },
      ]),
    ).toEqual([
      { key: "mira", name: "Mira", description: "A careful local.", role: "npc" },
      { key: "alden", name: "Brother Alden", description: "A priest.", role: "npc" },
    ]);
  });

  it("LC-001-S16/R2 returns an empty list when no NPC actors are present", () => {
    expect(
      roomInfoNpcList([
        { key: "taylor", name: "Taylor", description: "The player.", role: "player" },
      ]),
    ).toEqual([]);
  });

  it("LC-001-S16/R2-S4 clears an NPC selection when canonical room identity changes", () => {
    const mira = { key: "mira", name: "Mira", description: "A careful local.", role: "npc" };

    expect(selectedRoomNpc({ roomKey: "chapel", npcKey: "mira" }, "chapel", [mira])).toEqual(
      mira,
    );
    expect(selectedRoomNpc({ roomKey: "chapel", npcKey: "mira" }, "tavern", [mira])).toBeNull();
  });
});
