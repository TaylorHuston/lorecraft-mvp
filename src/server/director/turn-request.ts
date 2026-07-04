import "server-only";

import type { Id } from "../../../convex/_generated/dataModel";
import { validateNarrativeInput } from "@/lib/director/input";
import type { TurnTrigger } from "@/lib/director/types";

export function isLocalDirectorRequest(request: Request) {
  if (process.env.LORECRAFT_ALLOW_REMOTE_DIRECTOR === "1") {
    return true;
  }

  const requestHost = request.headers.get("host") ?? hostFromUrl(request.url);
  if (!isLocalHost(requestHost)) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin && !isLocalUrl(origin)) {
    return false;
  }

  const referer = request.headers.get("referer");
  if (!origin && referer && !isLocalUrl(referer)) {
    return false;
  }

  return true;
}

export async function readDirectorTurnBody(request: Request) {
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

  const turnTrigger = readTurnTrigger(parsed.trigger);
  if (!turnTrigger.ok) {
    return turnTrigger;
  }

  let input: string | null = null;
  if (turnTrigger.value === "act") {
    const inputResult = validateNarrativeInput(parsed.input);
    if (!inputResult.ok) {
      return inputResult;
    }
    input = inputResult.input;
  }

  const promptGuidance = readPromptGuidance(parsed.promptGuidance);
  if (!promptGuidance.ok) {
    return promptGuidance;
  }

  return {
    ok: true as const,
    body: {
      adventureId: parsed.adventureId as Id<"adventures">,
      input,
      turnTrigger: turnTrigger.value,
      promptGuidance: promptGuidance.value,
    },
  };
}

export function isLocalUrl(value: string) {
  try {
    return isLocalHost(new URL(value).host);
  } catch {
    return false;
  }
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function isLocalHost(value: string) {
  const hostname = value.trim().replace(/:\d+$/, "").replace(/^\[(.*)\]$/, "$1").toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function readTurnTrigger(value: unknown): { ok: true; value: TurnTrigger } | { ok: false; error: string } {
  if (value === undefined || value === "act") {
    return { ok: true, value: "act" };
  }
  if (value === "pass") {
    return { ok: true, value: "pass" };
  }
  return { ok: false, error: 'trigger must be "act" or "pass" when provided.' };
}

function readPromptGuidance(value: unknown) {
  if (value === undefined) {
    return { ok: true as const, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false as const, error: "promptGuidance must be an object when provided." };
  }

  const guidance: Record<string, string> = {};
  for (const key of ["style", "npcBehavior", "persistence"]) {
    const rawValue = value[key];
    if (rawValue === undefined) {
      continue;
    }
    if (typeof rawValue !== "string") {
      return { ok: false as const, error: `promptGuidance.${key} must be a string.` };
    }

    const trimmed = rawValue.trim();
    if (trimmed.length > 1200) {
      return { ok: false as const, error: `promptGuidance.${key} must be 1200 characters or less.` };
    }
    if (trimmed.length > 0) {
      guidance[key] = trimmed;
    }
  }

  return { ok: true as const, value: guidance };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
