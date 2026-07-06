import "server-only";

import type { Id } from "../../../convex/_generated/dataModel";
import type { DirectorPromptGuidance } from "@/lib/director/types";

export async function readDirectorUtilityBody(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return { ok: false as const, error: "Request body must be JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false as const, error: "Request body must be a JSON object." };
  }

  if (typeof parsed.adventureId !== "string" || parsed.adventureId.trim().length === 0) {
    return { ok: false as const, error: "An adventureId is required." };
  }

  if (typeof parsed.input !== "string" || parsed.input.trim().length === 0) {
    return { ok: false as const, error: "A slash command input is required." };
  }

  if (parsed.input.length > 1000) {
    return { ok: false as const, error: "Slash command input must be 1000 characters or less." };
  }

  const promptGuidance = readPromptGuidance(parsed.promptGuidance);
  if (!promptGuidance.ok) {
    return promptGuidance;
  }

  return {
    ok: true as const,
    body: {
      adventureId: parsed.adventureId as Id<"adventures">,
      input: parsed.input.trim(),
      promptGuidance: promptGuidance.value,
    },
  };
}

function readPromptGuidance(value: unknown): { ok: true; value?: DirectorPromptGuidance } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "promptGuidance must be an object when provided." };
  }

  const guidance: DirectorPromptGuidance = {};
  for (const key of ["style", "npcBehavior", "persistence"] as const) {
    const rawValue = value[key];
    if (rawValue === undefined) {
      continue;
    }
    if (typeof rawValue !== "string") {
      return { ok: false, error: `promptGuidance.${key} must be a string.` };
    }
    const trimmed = rawValue.trim();
    if (trimmed.length > 1200) {
      return { ok: false, error: `promptGuidance.${key} must be 1200 characters or less.` };
    }
    if (trimmed) {
      guidance[key] = trimmed;
    }
  }

  return { ok: true, value: guidance };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
