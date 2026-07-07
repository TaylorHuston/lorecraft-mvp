export function latestDirectorRequestSummary(directorCalls: unknown[]) {
  const latest = directorCalls.find(isRecord);
  return isRecord(latest?.requestSummary) ? latest.requestSummary : null;
}

export function summaryList(value: unknown) {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "None";
}

export function summaryText(value: unknown) {
  if (value === undefined || value === null) {
    return "None";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

export function directorUpdateItems(directorCalls: unknown[]) {
  return directorCalls.flatMap((call) => {
    if (!isRecord(call) || !Array.isArray(call.acceptedUpdates)) {
      return [];
    }

    return call.acceptedUpdates.flatMap((update) => {
      if (!isRecord(update) || !Array.isArray(update.changes)) {
        if (update.type === "actorMove") {
          const actorName =
            typeof update.actorName === "string"
              ? update.actorName
              : typeof update.actorKey === "string"
                ? update.actorKey
                : "Unknown actor";
          const locationName =
            typeof update.toLocationName === "string"
              ? update.toLocationName
              : typeof update.toLocationKey === "string"
                ? update.toLocationKey
                : "Unknown location";
          const reason = typeof update.reason === "string" ? ` Reason: ${update.reason}` : "";
          return [`${actorName}: moved to ${locationName}.${reason}`];
        }
        return [];
      }

      const actorName =
        typeof update.actorName === "string"
          ? update.actorName
          : typeof update.actorKey === "string"
            ? update.actorKey
            : "Unknown actor";
      const reason = typeof update.reason === "string" ? ` Reason: ${update.reason}` : "";
      const changes = update.changes
        .filter(isRecord)
        .map((change) => {
          const key = typeof change.key === "string" ? change.key : "unknown";
          const value = typeof change.value === "string" ? change.value : JSON.stringify(change.value);
          return `${key} -> ${value}`;
        })
        .join("; ");

      return changes ? [`${actorName}: ${changes}.${reason}`] : [];
    });
  });
}

export function turnSummaryItems(turns: unknown[]) {
  return turns.flatMap((turn) => {
    if (!isRecord(turn)) {
      return [];
    }

    const sequenceNumber =
      typeof turn.sequenceNumber === "number" ? `#${turn.sequenceNumber}` : "Unsequenced";
    const status = typeof turn.status === "string" ? turn.status : "unknown";
    const trigger = turn.trigger === "pass" ? "Pass" : turn.trigger === "guide" ? "Guide" : "Act";
    const input = typeof turn.playerInput === "string" ? ` - ${turn.playerInput}` : "";
    const counts = [
      countLabel(turn.narrationCount, "narration"),
      countLabel(turn.eventCount, "event"),
      countLabel(turn.stateDiffCount, "diff"),
    ].join(", ");
    const directorStatus =
      typeof turn.directorCallStatus === "string" ? `; Game Master: ${turn.directorCallStatus}` : "";

    return [`Turn ${sequenceNumber}: ${trigger} ${status}${input} (${counts}${directorStatus})`];
  });
}

export function buildTurnSequenceById(turns: unknown[]) {
  const sequenceById = new Map<string, number>();

  for (const turn of turns) {
    if (!isRecord(turn) || typeof turn._id !== "string" || typeof turn.sequenceNumber !== "number") {
      continue;
    }

    sequenceById.set(turn._id, turn.sequenceNumber);
  }

  return sequenceById;
}

export function domId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown";
}

export function formatAdventureTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}

function countLabel(value: unknown, label: string) {
  const count = typeof value === "number" ? value : 0;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
