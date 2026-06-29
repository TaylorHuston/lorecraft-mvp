export type NarrativeInputValidationResult =
  | { ok: true; input: string }
  | { ok: false; error: string };

export function validateNarrativeInput(value: unknown): NarrativeInputValidationResult {
  if (typeof value !== "string") {
    return { ok: false, error: "Narrative input is required." };
  }

  const input = value.trim();
  if (!input) {
    return { ok: false, error: "Narrative input is required." };
  }

  if (!/[A-Za-z0-9]/.test(input)) {
    return { ok: false, error: "Narrative input must include words or numbers." };
  }

  return { ok: true, input };
}
