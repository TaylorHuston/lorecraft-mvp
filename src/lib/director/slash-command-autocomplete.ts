export type SlashCommandAutocompleteTarget = {
  kind: "actor" | "object" | "location";
  label: string;
};

export type SlashCommandAutocompleteSuggestion = {
  value: string;
  label: string;
  detail: string;
};

const COMMAND_SUGGESTIONS: SlashCommandAutocompleteSuggestion[] = [
  {
    value: "/help",
    label: "/help",
    detail: "Show available commands.",
  },
  {
    value: "/look",
    label: "/look",
    detail: "Inspect what you can currently observe.",
  },
];

const TARGET_DETAIL_BY_KIND: Record<SlashCommandAutocompleteTarget["kind"], string> = {
  actor: "Inspect a visible character.",
  object: "Inspect a visible object.",
  location: "Inspect a visible place.",
};

export function getSlashCommandAutocomplete(
  input: string,
  targets: SlashCommandAutocompleteTarget[],
): SlashCommandAutocompleteSuggestion[] {
  const trimmedStart = input.trimStart();
  if (!trimmedStart.startsWith("/")) {
    return [];
  }

  const lookMatch = trimmedStart.match(/^\/look\s+(.*)$/i);
  if (lookMatch) {
    return getLookTargetSuggestions(lookMatch[1] ?? "", targets);
  }

  if (trimmedStart.includes(" ")) {
    return [];
  }

  const commandQuery = normalizeSuggestionText(trimmedStart.slice(1));
  if (
    COMMAND_SUGGESTIONS.some(
      (suggestion) => normalizeSuggestionText(suggestion.label.slice(1)) === commandQuery,
    )
  ) {
    return [];
  }

  return COMMAND_SUGGESTIONS.filter((suggestion) =>
    normalizeSuggestionText(suggestion.label.slice(1)).startsWith(commandQuery),
  );
}

function getLookTargetSuggestions(
  query: string,
  targets: SlashCommandAutocompleteTarget[],
) {
  const normalizedQuery = normalizeSuggestionText(query);
  return dedupeTargets(targets)
    .filter((target) => {
      if (!normalizedQuery) {
        return true;
      }
      const normalizedLabel = normalizeSuggestionText(target.label);
      return normalizedLabel !== normalizedQuery && normalizedLabel.includes(normalizedQuery);
    })
    .slice(0, 8)
    .map((target) => ({
      value: `/look ${target.label}`,
      label: target.label,
      detail: TARGET_DETAIL_BY_KIND[target.kind],
    }));
}

function dedupeTargets(targets: SlashCommandAutocompleteTarget[]) {
  const seen = new Set<string>();
  const deduped: SlashCommandAutocompleteTarget[] = [];

  for (const target of targets) {
    const key = `${target.kind}:${normalizeSuggestionText(target.label)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(target);
  }

  return deduped;
}

function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
