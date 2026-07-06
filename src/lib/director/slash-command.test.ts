import { describe, expect, it } from "vitest";
import { parseSlashCommand } from "./slash-command";

describe("parseSlashCommand", () => {
  it("parses help and look commands", () => {
    expect(parseSlashCommand("/help")).toEqual({
      ok: true,
      command: "help",
      rawInput: "/help",
    });
    expect(parseSlashCommand(" /LOOK   Mira ")).toEqual({
      ok: true,
      command: "look",
      rawInput: "/LOOK   Mira",
      target: "Mira",
    });
    expect(parseSlashCommand("/look")).toEqual({
      ok: true,
      command: "look",
      rawInput: "/look",
    });
  });

  it("rejects unsupported or empty slash commands", () => {
    expect(parseSlashCommand("/")).toEqual({
      ok: false,
      rawInput: "/",
      error: "Enter a slash command such as `/help` or `/look`.",
    });
    expect(parseSlashCommand("/dance")).toEqual({
      ok: false,
      rawInput: "/dance",
      command: "dance",
      error: "/dance is not supported yet. Try /help or /look.",
    });
  });
});
