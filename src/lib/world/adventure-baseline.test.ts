import { describe, expect, it } from "vitest";
import {
  countDebugCreatedLocationKeys,
  countDebugCreatedNpcKeys,
  baselineNpcLegacyFactKeys,
  findBaselineNpc,
} from "./adventure-baseline";
import { buildStormboundBaseline, buildTutorialBaseline } from "./stormbound-baseline";

describe("Adventure baseline helpers", () => {
  it("finds seeded NPCs from the selected Adventure baseline", () => {
    const stormbound = buildStormboundBaseline();
    const tutorial = buildTutorialBaseline();

    expect(findBaselineNpc(stormbound, "mira")?.name).toBe("Mira");
    expect(findBaselineNpc(stormbound, "mira")?.legacyFactKeys).toContain("knows_about_storm");
    expect(findBaselineNpc(stormbound, "guide-serin")).toBeNull();
    expect(findBaselineNpc(tutorial, "guide-serin")?.name).toBe("Guide Serin");
  });

  it("preserves legacy fact cleanup for older stored Stormbound baselines", () => {
    const stormbound = buildStormboundBaseline();
    const oldStoredMira = {
      ...findBaselineNpc(stormbound, "mira")!,
      legacyFactKeys: undefined,
    };

    expect(baselineNpcLegacyFactKeys(oldStoredMira)).toContain("knows_about_storm");
  });

  it("counts debug-created locations against the selected Adventure baseline", () => {
    const stormbound = buildStormboundBaseline();
    const tutorial = buildTutorialBaseline();

    expect(countDebugCreatedLocationKeys(stormbound, ["chapel", "threshold", "custom-room"])).toBe(
      2,
    );
    expect(countDebugCreatedLocationKeys(tutorial, ["threshold", "common-room", "chapel"])).toBe(
      1,
    );
  });

  it("counts debug-created NPCs against the selected Adventure baseline", () => {
    const stormbound = buildStormboundBaseline();
    const tutorial = buildTutorialBaseline();

    expect(countDebugCreatedNpcKeys(stormbound, ["mira", "guide-serin", "custom-npc"])).toBe(2);
    expect(countDebugCreatedNpcKeys(tutorial, ["guide-serin", "mara", "orin", "mira"])).toBe(1);
  });
});
