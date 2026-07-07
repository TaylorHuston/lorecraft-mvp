import {
  NPC_FACT_KEYS,
  type AcceptedActorMove,
  type AcceptedNpcFactChange,
  type AcceptedNpcUpdate,
  type DirectorActor,
  type DirectorKnownLocation,
  type IgnoredActorMove,
  type IgnoredNpcUpdate,
  type ParsedActorMove,
  type ParsedDirectorOutput,
  type ParsedNpcUpdate,
  type RequiredSceneBeat,
  type ValidatedActorMoves,
  type ValidatedNpcUpdates,
} from "./types";

const NPC_FACT_KEY_SET = new Set<string>(NPC_FACT_KEYS);
const MEMORY_LIMIT = 500;

export type DirectorParseResult =
  | { ok: true; output: ParsedDirectorOutput }
  | { ok: false; error: string };

export type NpcStateExtractionParseResult =
  | { ok: true; npcUpdates: ParsedNpcUpdate[] }
  | { ok: false; error: string };

export type StateExtractionParseResult =
  | { ok: true; npcUpdates: ParsedNpcUpdate[]; actorMoves: ParsedActorMove[] }
  | { ok: false; error: string };

export function parseDirectorOutput(rawOutput: string): DirectorParseResult {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return { ok: false, error: "Game Master returned an empty response." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Game Master response was not valid JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Game Master response must be a JSON object." };
  }

  const narration = parsed.narration;
  if (typeof narration !== "string" || narration.trim().length === 0) {
    return { ok: false, error: 'Game Master response must include non-empty "narration".' };
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

export function parsePlainProseDirectorOutput(rawOutput: string): DirectorParseResult {
  const narration = trimIncompleteTrailingSentence(rawOutput);
  if (!narration) {
    return { ok: false, error: "Game Master returned an empty response." };
  }

  return {
    ok: true,
    output: {
      narration,
      npcUpdates: [],
    },
  };
}

function trimIncompleteTrailingSentence(rawOutput: string) {
  const trimmed = rawOutput.trim();
  if (trimmed.length === 0 || hasCompleteSentenceEnding(trimmed)) {
    return trimmed;
  }

  const sentenceEnd = findLastSentenceEnd(trimmed);
  if (sentenceEnd === -1) {
    return trimmed;
  }

  const candidate = trimmed.slice(0, sentenceEnd).trim();
  const minimumUsefulLength = Math.min(80, Math.floor(trimmed.length * 0.6));
  return candidate.length >= minimumUsefulLength ? candidate : trimmed;
}

function hasCompleteSentenceEnding(text: string) {
  return /[.!?]["')\]]?$/.test(text);
}

function findLastSentenceEnd(text: string) {
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (!".!?".includes(text[index])) {
      continue;
    }

    let end = index + 1;
    while (end < text.length && `"')]} `.includes(text[end])) {
      end += 1;
    }
    return end;
  }

  return -1;
}

export function parseNpcStateExtractionOutput(rawOutput: string): NpcStateExtractionParseResult {
  const result = parseStateExtractionOutput(rawOutput);
  if (!result.ok) {
    return result;
  }
  return { ok: true, npcUpdates: result.npcUpdates };
}

export function parseStateExtractionOutput(rawOutput: string): StateExtractionParseResult {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return { ok: false, error: "NPC state extractor returned an empty response." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "NPC state extractor response was not valid JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "NPC state extractor response must be a JSON object." };
  }

  const rawUpdates = parsed.npcUpdates ?? [];
  if (!Array.isArray(rawUpdates)) {
    return { ok: false, error: '"npcUpdates" must be an array when provided.' };
  }
  const rawMoves = parsed.actorMoves ?? [];
  if (!Array.isArray(rawMoves)) {
    return { ok: false, error: '"actorMoves" must be an array when provided.' };
  }

  return {
    ok: true,
    npcUpdates: rawUpdates.map(normalizeNpcUpdate),
    actorMoves: rawMoves.map(normalizeActorMove),
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

export function applyNarrationSupportBoundary(
  validatedUpdates: ValidatedNpcUpdates,
  narration: string,
): ValidatedNpcUpdates {
  if (validatedUpdates.acceptedUpdates.length === 0) {
    return validatedUpdates;
  }

  const acceptedUpdates: AcceptedNpcUpdate[] = [];
  const ignoredUpdates: IgnoredNpcUpdate[] = [...validatedUpdates.ignoredUpdates];

  for (const update of validatedUpdates.acceptedUpdates) {
    const supportedChanges: AcceptedNpcFactChange[] = [];

    for (const change of update.changes) {
      const rejectionReason = npcFactNarrationRejectionReason(change, narration);
      if (rejectionReason) {
        ignoredUpdates.push({
          actorKey: update.actorKey,
          field: change.key,
          reason: rejectionReason,
          valuePreview: previewValue(change.value),
        });
        continue;
      }

      supportedChanges.push(change);
    }

    if (supportedChanges.length > 0) {
      acceptedUpdates.push({ ...update, changes: supportedChanges });
    }
  }

  return { acceptedUpdates, ignoredUpdates };
}

export function validateActorMoves(
  parsedMoves: ParsedActorMove[],
  currentSceneActors: DirectorActor[],
  knownLocations: DirectorKnownLocation[],
  playerInput: string,
  narration: string,
): ValidatedActorMoves {
  const actorsByKey = new Map(currentSceneActors.map((actor) => [actor.key, actor]));
  const locationsByKey = new Map(knownLocations.map((location) => [location.key, location]));
  const acceptedMoves: AcceptedActorMove[] = [];
  const ignoredMoves: IgnoredActorMove[] = [];

  for (const move of parsedMoves) {
    const actorKey = move.actorKey.trim();
    const toLocationKey = move.toLocationKey.trim();

    if (!actorKey) {
      ignoredMoves.push({ reason: "Actor move did not include a valid actorKey." });
      continue;
    }

    const actor = actorsByKey.get(actorKey);
    if (!actor) {
      ignoredMoves.push({
        actorKey,
        toLocationKey: toLocationKey || undefined,
        reason: "Actor move actor is unknown or not in the current scene.",
      });
      continue;
    }

    if (actor.role !== "player" && actor.role !== "npc") {
      ignoredMoves.push({
        actorKey,
        toLocationKey: toLocationKey || undefined,
        reason: "Actor move actor role is not allowed.",
      });
      continue;
    }

    const location = locationsByKey.get(toLocationKey);
    if (!location) {
      ignoredMoves.push({
        actorKey,
        toLocationKey: toLocationKey || undefined,
        reason: "Actor move destination is unknown.",
      });
      continue;
    }

    if (typeof move.reason !== "string" || move.reason.trim().length === 0) {
      ignoredMoves.push({
        actorKey,
        toLocationKey,
        reason: "Actor move did not include a human-readable reason.",
      });
      continue;
    }

    if (!inputClearlyAttemptsTravel(playerInput, location)) {
      ignoredMoves.push({
        actorKey,
        toLocationKey,
        reason: "Player input did not clearly attempt travel to this location.",
      });
      continue;
    }

    if (!narrationConfirmsArrival(narration, location)) {
      ignoredMoves.push({
        actorKey,
        toLocationKey,
        reason: "Game Master narration did not confirm arrival at this location.",
      });
      continue;
    }

    if (actor.role === "npc" && !narrationConfirmsNpcMovement(narration, actor)) {
      ignoredMoves.push({
        actorKey,
        toLocationKey,
        reason: "Game Master narration did not explicitly confirm this NPC moved.",
      });
      continue;
    }

    acceptedMoves.push({
      actorKey,
      actorName: actor.name,
      toLocationKey,
      toLocationName: location.name,
      reason: move.reason.trim(),
    });
  }

  return { acceptedMoves, ignoredMoves };
}

function npcFactNarrationRejectionReason(change: AcceptedNpcFactChange, narration: string) {
  if (change.key === "status" && looksLikeMomentaryStatus(change.value)) {
    return "NPC status update describes a momentary beat, not a durable condition.";
  }

  if (change.key === "mood" && looksLikePhysicalIncapacity(change.value)) {
    return "NPC mood update encodes physical incapacity instead of an affective state.";
  }

  if (change.key === "status" && intensifiesLedgerSlip(change.value, narration)) {
    return "NPC status update intensifies the completed narration beyond textual support.";
  }

  return null;
}

function looksLikeMomentaryStatus(value: string) {
  return /\b(?:flinches?|flinching|gasps?|gasping|glances?|glancing|looks?|looking|recoils?|recoiling|stares?|staring|stumbles?|stumbling|slips?|slipping|drops?|dropping|freezes?|frozen)\b/i.test(
    value,
  );
}

function looksLikePhysicalIncapacity(value: string) {
  return /\b(?:paraly[sz]ed|unable to move|cannot move|can't move)\b/i.test(value);
}

function intensifiesLedgerSlip(value: string, narration: string) {
  return /\b(?:drops?|dropping)\b/i.test(value) &&
    /\bledger\b/i.test(value) &&
    /\bledger\b/i.test(narration) &&
    /\bslipp(?:ing|ed|s)\b/i.test(narration) &&
    !/\bdropp(?:ing|ed|s)\b/i.test(narration);
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

function normalizeActorMove(move: unknown): ParsedActorMove {
  if (!isRecord(move)) {
    return { actorKey: "", toLocationKey: "", reason: "" };
  }

  return {
    actorKey: typeof move.actorKey === "string" ? move.actorKey : "",
    toLocationKey: typeof move.toLocationKey === "string" ? move.toLocationKey : "",
    reason: typeof move.reason === "string" ? move.reason : "",
  };
}

function inputClearlyAttemptsTravel(playerInput: string, location: DirectorKnownLocation) {
  const input = normalizeForMatching(playerInput);
  const travelVerb = /\b(go|walk|run|travel|head|enter|leave|return|move|step|cross|follow)\b/.test(input);
  if (!travelVerb) {
    return false;
  }

  return locationMentioned(input, location);
}

function narrationConfirmsArrival(narration: string, location: DirectorKnownLocation) {
  const normalizedNarration = normalizeForMatching(narration);
  if (!locationMentioned(normalizedNarration, location)) {
    return false;
  }

  return /\b(reach|reaches|reached|arrive|arrives|arrived|enter|enters|entered|inside|into|step|steps|stepped|cross|crosses|crossed)\b/.test(
    normalizedNarration,
  );
}

function narrationConfirmsNpcMovement(narration: string, actor: DirectorActor) {
  const normalizedNarration = normalizeForMatching(narration);
  const actorMentioned = [actor.key, actor.name].some((label) =>
    wordAppears(normalizedNarration, normalizeForMatching(label)),
  );
  if (!actorMentioned) {
    return false;
  }

  return /\b(follow|follows|followed|accompany|accompanies|accompanied|come with|comes with|came with|joins|joined|leave|leaves|left|goes|went|walks|walked|steps|stepped|enters|entered|moves|moved|travels|traveled)\b/.test(
    normalizedNarration,
  );
}

function locationMentioned(text: string, location: DirectorKnownLocation) {
  return [location.key, location.name].some((label) => wordAppears(text, normalizeForMatching(label)));
}

function normalizeForMatching(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function wordAppears(text: string, word: string) {
  if (!word) {
    return false;
  }
  return new RegExp(`(^|\\s)${escapeRegExp(word)}($|\\s)`).test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
