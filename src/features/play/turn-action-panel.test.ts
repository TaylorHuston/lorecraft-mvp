import { describe, expect, it } from "vitest";
import {
  resetDirectorInputHeight,
  resizeDirectorInput,
  restoreSubmittedInput,
} from "./turn-action-panel";

describe("TurnActionPanel textarea sizing", () => {
  it("LC-001-S1/R4-S5 caps growth and restores the default inline height after success", () => {
    const textarea = {
      scrollHeight: 640,
      style: { height: "", overflowY: "hidden" },
    };

    resizeDirectorInput(textarea);
    expect(textarea.style).toEqual({ height: "240px", overflowY: "auto" });

    resetDirectorInputHeight(textarea);
    expect(textarea.style).toEqual({ height: "", overflowY: "hidden" });
  });

  it("LC-001-S1/R4-S5 restores failed text without overwriting a newer draft", () => {
    expect(restoreSubmittedInput("", "I ask Mira about the bell.")).toBe(
      "I ask Mira about the bell.",
    );
    expect(restoreSubmittedInput("A newer draft", "The failed draft")).toBe("A newer draft");
  });
});
