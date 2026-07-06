import { describe, expect, it } from "vitest";
import { getSlashCommandAutocomplete } from "./slash-command-autocomplete";

const targets = [
  { kind: "actor" as const, label: "Guide Serin" },
  { kind: "actor" as const, label: "Mira" },
  { kind: "object" as const, label: "Lantern" },
  { kind: "location" as const, label: "Threshold Room" },
];

describe("getSlashCommandAutocomplete", () => {
  it("suggests supported slash commands by prefix", () => {
    expect(getSlashCommandAutocomplete("/", targets).map((suggestion) => suggestion.value)).toEqual([
      "/help",
      "/look",
    ]);
    expect(getSlashCommandAutocomplete("/l", targets).map((suggestion) => suggestion.value)).toEqual([
      "/look",
    ]);
  });

  it("does not suggest an exact command that should submit normally", () => {
    expect(getSlashCommandAutocomplete("/help", targets)).toEqual([]);
    expect(getSlashCommandAutocomplete("/look", targets)).toEqual([]);
  });

  it("suggests visible look targets", () => {
    expect(getSlashCommandAutocomplete("/look ", targets).map((suggestion) => suggestion.value)).toEqual([
      "/look Guide Serin",
      "/look Mira",
      "/look Lantern",
      "/look Threshold Room",
    ]);
    expect(getSlashCommandAutocomplete("/look ser", targets)).toEqual([
      {
        value: "/look Guide Serin",
        label: "Guide Serin",
        detail: "Inspect a visible character.",
      },
    ]);
  });

  it("does not suggest an exact look target that should submit normally", () => {
    expect(getSlashCommandAutocomplete("/look Guide Serin", targets)).toEqual([]);
  });

  it("ignores non-command input", () => {
    expect(getSlashCommandAutocomplete("I look around", targets)).toEqual([]);
  });
});
