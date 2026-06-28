import {
  NPC_FACT_KEYS,
  type AcceptedNpcFactChange,
  type AcceptedNpcUpdate,
  type DirectorActor,
  type IgnoredNpcUpdate,
  type ParsedDirectorOutput,
  type ParsedNpcUpdate,
  type RequiredSceneBeat,
  type ValidatedNpcUpdates,
} from "./types";

const NPC_FACT_KEY_SET = new Set<string>(NPC_FACT_KEYS);
const MEMORY_LIMIT = 500;

export type DirectorParseResult =
  | { ok: true; output: ParsedDirectorOutput }
  | { ok: false; error: string };

export function parseDirectorOutput(rawOutput: string): DirectorParseResult {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return { ok: false, error: "Director returned an empty response." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Director response was not valid JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Director response must be a JSON object." };
  }

  const narration = parsed.narration;
  if (typeof narration !== "string" || narration.trim().length === 0) {
    return { ok: false, error: 'Director response must include non-empty "narration".' };
  }

  const rawUpdates = parsed.npcUpdates ?? [];
  if (!Array.isArray(rawUpdates)) {
    return { ok: false, error: '"npcUpdates" must be an array when provided.' };
  }

  return {
    ok: true,
    output: {
      narration: narration.trim(),
      npcUpdates: rawUpdates.map(normalizeNpcUpdate),
    },
  };
}

export function validateNpcUpdates(
  parsedUpdates: ParsedNpcUpdate[],
  currentSceneActors: DirectorActor[],
): ValidatedNpcUpdates {
  const currentSceneNpcs = new Map(
    currentSceneActors
      .filter((actor) => actor.role === "npc")
      .map((actor) => [actor.key, actor]),
  );
  const acceptedUpdates: AcceptedNpcUpdate[] = [];
  const ignoredUpdates: IgnoredNpcUpdate[] = [];

  for (const update of parsedUpdates) {
    if (typeof update.actorKey !== "string" || update.actorKey.trim().length === 0) {
      ignoredUpdates.push({ reason: "NPC update did not include a valid actorKey." });
      continue;
    }

    const actorKey = update.actorKey.trim();
    const actor = currentSceneNpcs.get(actorKey);
    if (!actor) {
      ignoredUpdates.push({
        actorKey,
        reason: "NPC update actor is unknown or not in the current scene.",
      });
      continue;
    }

    if (typeof update.reason !== "string" || update.reason.trim().length === 0) {
      ignoredUpdates.push({
        actorKey,
        reason: "NPC update did not include a human-readable reason.",
      });
      continue;
    }

    const changes: AcceptedNpcFactChange[] = [];
    for (const [field, value] of Object.entries(update.changes)) {
      if (!NPC_FACT_KEY_SET.has(field)) {
        ignoredUpdates.push({
          actorKey,
          field,
          reason: "NPC update field is not allowed.",
          valuePreview: previewValue(value),
        });
        continue;
      }

      if (typeof value !== "string" || value.trim().length === 0) {
        ignoredUpdates.push({
          actorKey,
          field,
          reason: "NPC update value must be non-empty text.",
          valuePreview: previewValue(value),
        });
        continue;
      }

      if (field === "memory" && value.length > MEMORY_LIMIT) {
        ignoredUpdates.push({
          actorKey,
          field,
          reason: "NPC memory exceeded 500 characters and was truncated.",
          valuePreview: previewValue(value),
        });
        changes.push({ key: field, value: value.slice(0, MEMORY_LIMIT) });
        continue;
      }

      changes.push({ key: field as AcceptedNpcFactChange["key"], value: value.trim() });
    }

    if (changes.length === 0) {
      ignoredUpdates.push({
        actorKey,
        reason: "NPC update did not include any valid fact changes.",
      });
      continue;
    }

    acceptedUpdates.push({
      actorKey,
      actorName: actor.name,
      reason: update.reason.trim(),
      changes,
    });
  }

  return { acceptedUpdates, ignoredUpdates };
}

export function applySceneBeatPersistenceBoundary(
  validatedUpdates: ValidatedNpcUpdates,
  sceneBeat: Pick<RequiredSceneBeat, "allowsNpcUpdates">,
): ValidatedNpcUpdates {
  if (sceneBeat.allowsNpcUpdates || validatedUpdates.acceptedUpdates.length === 0) {
    return validatedUpdates;
  }

  return {
    acceptedUpdates: [],
    ignoredUpdates: [
      ...validatedUpdates.ignoredUpdates,
      ...validatedUpdates.acceptedUpdates.flatMap((update) =>
        update.changes.map((change) => ({
          actorKey: update.actorKey,
          field: change.key,
          reason: "Required scene beat does not allow durable NPC updates for this action.",
          valuePreview: previewValue(change.value),
        })),
      ),
    ],
  };
}

function normalizeNpcUpdate(update: unknown): ParsedNpcUpdate {
  if (!isRecord(update)) {
    return { actorKey: "", reason: "", changes: {} };
  }

  return {
    actorKey: typeof update.actorKey === "string" ? update.actorKey : "",
    reason: typeof update.reason === "string" ? update.reason : "",
    changes: isRecord(update.changes) ? update.changes : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function previewValue(value: unknown) {
  const serialized =
    typeof value === "string" ? value : JSON.stringify(value, jsonValueReplacer) ?? String(value);
  return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized;
}

function jsonValueReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
