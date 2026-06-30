import {
  clearNpcDebugOverride,
  clearNpcDebugOverrides,
  getNpcDebugOverrides,
  setNpcDebugOverride,
} from "../../../../lib/director/npc-debug-overrides";
import type { NpcDebugOverride } from "../../../../lib/director/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OverrideResponse =
  | { ok: true; overrides: Record<string, NpcDebugOverride> }
  | { ok: false; error: string };

export async function GET(request: Request) {
  const accessDenied = denyProductionDebugAccess();
  if (accessDenied) {
    return accessDenied;
  }

  const worldIdResult = readWorldId(request);
  if (!worldIdResult.ok) {
    return json<OverrideResponse>({ ok: false, error: worldIdResult.error }, 400);
  }

  return json<OverrideResponse>({
    ok: true,
    overrides: getNpcDebugOverrides(worldIdResult.worldId),
  });
}

export async function POST(request: Request) {
  const accessDenied = denyProductionDebugAccess();
  if (accessDenied) {
    return accessDenied;
  }

  const bodyResult = await readBody(request);
  if (!bodyResult.ok) {
    return json<OverrideResponse>({ ok: false, error: bodyResult.error }, 400);
  }

  const overrides = setNpcDebugOverride(
    bodyResult.body.worldId,
    bodyResult.body.actorKey,
    bodyResult.body.override,
  );

  return json<OverrideResponse>({ ok: true, overrides });
}

export async function DELETE(request: Request) {
  const accessDenied = denyProductionDebugAccess();
  if (accessDenied) {
    return accessDenied;
  }

  const worldIdResult = readWorldId(request);
  if (!worldIdResult.ok) {
    return json<OverrideResponse>({ ok: false, error: worldIdResult.error }, 400);
  }

  const actorKey = new URL(request.url).searchParams.get("actorKey")?.trim();
  const overrides = actorKey
    ? clearNpcDebugOverride(worldIdResult.worldId, actorKey)
    : clearNpcDebugOverrides(worldIdResult.worldId);

  return json<OverrideResponse>({ ok: true, overrides });
}

function json<T>(body: T, status = 200) {
  return Response.json(body, { status });
}

function denyProductionDebugAccess() {
  if (process.env.NODE_ENV !== "production" || process.env.LORECRAFT_ENABLE_DEBUG_ROUTES === "1") {
    return null;
  }

  return json<OverrideResponse>({ ok: false, error: "Debug NPC overrides are disabled." }, 404);
}

function readWorldId(request: Request) {
  const worldId = new URL(request.url).searchParams.get("worldId")?.trim();
  if (!worldId) {
    return { ok: false as const, error: "worldId is required." };
  }

  return { ok: true as const, worldId };
}

async function readBody(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return { ok: false as const, error: "Request body must be JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false as const, error: "Request body must be a JSON object." };
  }

  if (typeof parsed.worldId !== "string" || !parsed.worldId.trim()) {
    return { ok: false as const, error: "worldId is required." };
  }
  if (typeof parsed.actorKey !== "string" || !parsed.actorKey.trim()) {
    return { ok: false as const, error: "actorKey is required." };
  }
  if (!isRecord(parsed.override)) {
    return { ok: false as const, error: "override must be an object." };
  }

  const override = readOverride(parsed.override);
  if (!override.ok) {
    return override;
  }

  return {
    ok: true as const,
    body: {
      worldId: parsed.worldId.trim(),
      actorKey: parsed.actorKey.trim(),
      override: override.value,
    },
  };
}

function readOverride(value: Record<string, unknown>) {
  const factsValue = value.facts;
  const facts: Record<string, string> = {};
  if (factsValue !== undefined) {
    if (!isRecord(factsValue)) {
      return { ok: false as const, error: "override.facts must be an object when provided." };
    }
    for (const [key, factValue] of Object.entries(factsValue)) {
      if (factValue === undefined || factValue === null || String(factValue).trim().length === 0) {
        continue;
      }
      facts[key] = String(factValue);
    }
  }

  return {
    ok: true as const,
    value: {
      ...(typeof value.name === "string" ? { name: value.name } : {}),
      ...(typeof value.description === "string" ? { description: value.description } : {}),
      ...(Object.keys(facts).length > 0 ? { facts } : {}),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
