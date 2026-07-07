import { describe, expect, it } from "vitest";
import {
  buildTurnSequenceById,
  directorUpdateItems,
  domId,
  latestDirectorRequestSummary,
  summaryList,
  summaryText,
  turnSummaryItems,
} from "./debug-formatters";

describe("play debug formatters", () => {
  it("normalizes DOM ids for debug controls", () => {
    expect(domId("Mira's Mood")).toBe("mira-s-mood");
    expect(domId("   ")).toBe("unknown");
  });

  it("summarizes the latest director request summary", () => {
    expect(
      latestDirectorRequestSummary([
        { requestSummary: { directorMode: "persistent", outputContract: "plain_prose" } },
      ]),
    ).toEqual({ directorMode: "persistent", outputContract: "plain_prose" });
    expect(latestDirectorRequestSummary([{ requestSummary: null }])).toBeNull();
  });

  it("formats summary values for compact debug display", () => {
    expect(summaryList(["style", "npcBehavior"])).toBe("style, npcBehavior");
    expect(summaryList([])).toBe("None");
    expect(summaryText({ responseFormat: "text" })).toBe('{"responseFormat":"text"}');
    expect(summaryText(null)).toBe("None");
  });

  it("formats NPC and actor-move updates from director calls", () => {
    expect(
      directorUpdateItems([
        {
          acceptedUpdates: [
            {
              actorName: "Mira",
              reason: "Taylor spoke directly to her.",
              changes: [{ key: "mood", value: "curious" }],
            },
            {
              type: "actorMove",
              actorName: "Brother Alden",
              toLocationName: "Vestry",
              reason: "He retrieves the ledger.",
            },
          ],
        },
      ]),
    ).toEqual([
      "Mira: mood -> curious. Reason: Taylor spoke directly to her.",
      "Brother Alden: moved to Vestry. Reason: He retrieves the ledger.",
    ]);
  });

  it("builds turn summaries and sequence lookup", () => {
    const turns = [
      {
        _id: "turn-1",
        sequenceNumber: 1,
        trigger: "act",
        status: "succeeded",
        playerInput: "I greet Mira.",
        narrationCount: 1,
        eventCount: 0,
        stateDiffCount: 1,
        directorCallStatus: "success",
      },
      {
        _id: "turn-2",
        sequenceNumber: 2,
        trigger: "pass",
        status: "failed",
        narrationCount: 0,
        eventCount: 0,
        stateDiffCount: 0,
      },
      {
        _id: "turn-3",
        sequenceNumber: 3,
        trigger: "guide",
        status: "succeeded",
        narrationCount: 1,
        eventCount: 0,
        stateDiffCount: 0,
        directorCallStatus: "success",
      },
    ];

    expect(buildTurnSequenceById(turns).get("turn-2")).toBe(2);
    expect(turnSummaryItems(turns)).toEqual([
      "Turn #1: Act succeeded - I greet Mira. (1 narration, 0 events, 1 diff; Game Master: success)",
      "Turn #2: Pass failed (0 narrations, 0 events, 0 diffs)",
      "Turn #3: Guide succeeded (1 narration, 0 events, 0 diffs; Game Master: success)",
    ]);
  });
});
