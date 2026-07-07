export type ParsedSlashCommand =
  | { ok: true; command: "help"; rawInput: string; target?: undefined }
  | { ok: true; command: "look"; rawInput: string; target?: string }
  | { ok: false; rawInput: string; command?: string; error: string };

const SUPPORTED_COMMANDS = new Set(["help", "look"]);

export function parseSlashCommand(input: unknown): ParsedSlashCommand {
  if (typeof input !== "string") {
    return { ok: false, rawInput: "", error: "Utility input must be text." };
  }

  const rawInput = input.trim();
  if (!rawInput) {
    return { ok: false, rawInput, error: "Enter a slash command." };
  }
  if (!rawInput.startsWith("/")) {
    return { ok: false, rawInput, error: "Slash commands must start with `/`." };
  }

  const withoutSlash = rawInput.slice(1).trim();
  if (!withoutSlash) {
    return { ok: false, rawInput, error: "Enter a slash command such as `/help` or `/look`." };
  }

  const [rawCommand = "", ...targetParts] = withoutSlash.split(/\s+/);
  const command = rawCommand.toLowerCase();
  if (!SUPPORTED_COMMANDS.has(command)) {
    return {
      ok: false,
      rawInput,
      command,
      error: `/${command} is not supported yet. Try /help or /look.`,
    };
  }

  if (command === "help") {
    return { ok: true, command: "help", rawInput };
  }

  const target = targetParts.join(" ").trim();
  return {
    ok: true,
    command: "look",
    rawInput,
    ...(target ? { target } : {}),
  };
}

export function helpText() {
  return [
    "Available commands:",
    "/help - Show supported slash commands.",
    "/look - Inspect what you can currently observe.",
    "/look <target> - Inspect a visible person, place, or object.",
  ].join("\n");
}
