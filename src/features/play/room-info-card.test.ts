import { describe, expect, it } from "vitest";
import { roomInfoNpcList } from "./room-info-card";

describe("Room Info Card", () => {
  it("LC-001-S16/R2 lists NPCs present in the current room and excludes the player", () => {
    expect(
      roomInfoNpcList([
        { name: "Taylor", role: "player" },
        { name: "Mira", role: "npc" },
        { name: "Brother Alden", role: "npc" },
      ]),
    ).toEqual(["Mira", "Brother Alden"]);
  });

  it("LC-001-S16/R2 returns an empty list when no NPC actors are present", () => {
    expect(roomInfoNpcList([{ name: "Taylor", role: "player" }])).toEqual([]);
  });
});
