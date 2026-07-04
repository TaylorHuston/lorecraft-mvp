type FactValue = string | number | boolean | null;
type BaselineFact = { key: string; value: FactValue };

export type AdventureBaseline = {
  world: { name: string; description: string };
  rooms: Array<{ key: string; name: string; description: string }>;
  exits: Array<{ fromRoomKey: string; toRoomKey: string; label: string; visible: boolean }>;
  player: { key: string; name: string; description: string; roomKey: string };
  npcs: Array<{
    key: string;
    name: string;
    description: string;
    roomKey: string;
    facts: BaselineFact[];
  }>;
  objects: Array<{
    key: string;
    name: string;
    description: string;
    roomKey: string;
    visible: boolean;
    facts: BaselineFact[];
  }>;
  initialEvent: string;
  initialNarration: string;
};

export const WORLD_SLUG = "stormbound-chapel-default";
export const DEFAULT_ADVENTURE_SLUG = "stormbound-chapel-default-adventure";
export const PLAYER_KEY = "taylor";
export const NPC_PROFILE_FACT_KEYS_FOR_WRITE = [
  "background",
  "persona",
  "voice",
  "mood",
  "status",
  "memory",
  "knowledge",
] as const;

const MIRA_KEY = "mira";
const MIRA_DESCRIPTION =
  "A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.";
const MIRA_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Mira grew up around Stormbound Chapel and learned its routines from older caretakers. She has seen villagers dismiss old warnings as superstition, and she still carries guilt from once ignoring a sign she should have reported.",
  },
  {
    key: "persona",
    value:
      "Cautious, observant, and slow to trust. Mira notices exits, strangers, and small changes before she speaks, and she tests whether someone is safe before sharing frightening truths.",
  },
  {
    key: "voice",
    value:
      "Plain-spoken and restrained. Mira uses short warnings, practical details, and chapel or weather imagery. She avoids grand claims unless fear breaks through.",
  },
  { key: "mood", value: "watchful" },
  {
    key: "status",
    value:
      "standing near the chapel aisle, tense from the storm and alert to movement around her",
  },
  { key: "memory", value: "Mira has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Mira knows the storm began after the chapel bell rang at midnight, but she is afraid to say that plainly.",
  },
] as const;
const LEGACY_MIRA_FACT_KEYS = ["knows_about_storm"] as const;
const PRIEST_KEY = "brother-alden";
const PRIEST_NAME = "Brother Alden";
const PRIEST_DESCRIPTION =
  "A small, middle-aged priest in a patched black cassock, with ink-stained fingers and a careful stoop.";
const PRIEST_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Brother Alden has tended Stormbound Chapel for years, keeping records, repairing small damage, and quietly helping villagers who come in from the rain.",
  },
  {
    key: "persona",
    value:
      "Gentle, nervous, and dutiful. Alden tries to calm frightened people before admitting how much he knows, and he dislikes open confrontation.",
  },
  {
    key: "voice",
    value:
      "Soft and formal, with small apologies and careful religious phrasing. He often answers indirectly before gathering courage.",
  },
  { key: "mood", value: "uneasy" },
  {
    key: "status",
    value: "standing near the altar with a damp ledger tucked under one arm",
  },
  { key: "memory", value: "Brother Alden has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Alden found a torn bell-rope fiber near the altar after midnight, but he has not told Mira because he fears accusing someone without proof.",
  },
] as const;
const TAVERNKEEP_KEY = "rowan";
const TAVERNKEEP_NAME = "Rowan";
const TAVERNKEEP_DESCRIPTION =
  "A broad-shouldered tavernkeeper with rolled sleeves, gray-shot hair, and a towel tucked through his belt.";
const TAVERNKEEP_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Rowan has kept the Lantern & Bell open through bad weather, bad harvests, and worse rumors. He knows which villagers drink quietly and which ones talk when the rain gets loud.",
  },
  {
    key: "persona",
    value:
      "Practical, watchful, and protective of his regulars. Rowan is friendly enough to paying guests, but he notices trouble before he names it.",
  },
  {
    key: "voice",
    value:
      "Dry and plainspoken, with tavern humor and short warnings. Rowan asks direct questions and rarely wastes words.",
  },
  { key: "mood", value: "wary but hospitable" },
  {
    key: "status",
    value: "working behind the tavern bar while keeping one eye on the door",
  },
  { key: "memory", value: "Rowan has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Rowan heard someone pass the tavern toward the chapel shortly before the midnight bell, but he did not see their face.",
  },
] as const;
const MINSTREL_KEY = "lena";
const MINSTREL_NAME = "Lena";
const MINSTREL_DESCRIPTION =
  "A wiry traveling minstrel in a weather-stained green cloak, with quick hands and sharper eyes than her songs suggest.";
const MINSTREL_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Lena arrived in Stormbound two nights ago with a cracked lute, three half-finished songs, and no clear explanation for why she chose this road.",
  },
  {
    key: "persona",
    value:
      "Curious, evasive, and amused by danger until it becomes personal. Lena collects rumors and tests strangers with jokes before offering truth.",
  },
  {
    key: "voice",
    value:
      "Lyrical but sly. Lena answers with teasing images, half-rhymes, and sudden blunt admissions when cornered.",
  },
  { key: "mood", value: "restless" },
  {
    key: "status",
    value: "sitting near the tavern hearth with her lute case under one boot",
  },
  { key: "memory", value: "Lena has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Lena noticed the chapel bell's sound had two tones at midnight, as if something cracked after the first strike.",
  },
] as const;

export const SEEDED_ROOMS = [
  {
    key: "chapel",
    name: "Chapel",
    description:
      "Rain taps against warped shutters. A cracked lantern hangs beside a stone altar, Mira waits near the aisle, and Brother Alden stands close to the altar with a ledger under one arm.",
  },
  {
    key: "vestry",
    name: "Vestry",
    description:
      "The vestry smells of old paper and damp wool. A narrow desk sits under shelves of hymnals.",
  },
  {
    key: "graveyard",
    name: "Graveyard",
    description: "Tilted stones vanish into the rain. The chapel door glows behind you.",
  },
  {
    key: "tavern",
    name: "Lantern & Bell Tavern",
    description:
      "Warm lamplight pools across scarred tables. Rain ticks against leaded windows, Rowan works behind the bar, and Lena sits near the hearth with a lute case under one boot.",
  },
] as const;

const SEEDED_EXITS = [
  { fromRoomKey: "chapel", toRoomKey: "vestry", label: "west", visible: true },
  { fromRoomKey: "vestry", toRoomKey: "chapel", label: "east", visible: true },
  { fromRoomKey: "chapel", toRoomKey: "graveyard", label: "north", visible: true },
  { fromRoomKey: "graveyard", toRoomKey: "chapel", label: "south", visible: true },
  { fromRoomKey: "chapel", toRoomKey: "tavern", label: "east", visible: true },
  { fromRoomKey: "tavern", toRoomKey: "chapel", label: "west", visible: true },
] as const;

const SEEDED_OBJECTS = [
  {
    key: "shutters",
    name: "Shutters",
    description: "Warped wooden shutters latched against the storm.",
    roomKey: "chapel",
    visible: true,
    facts: [{ key: "open", value: false }],
  },
  {
    key: "lantern",
    name: "Lantern",
    description: "A cracked lantern with a low, unsteady flame.",
    roomKey: "chapel",
    visible: true,
    facts: [{ key: "broken", value: false }],
  },
  {
    key: "altar",
    name: "Altar",
    description: "A stone altar scarred by old candle wax.",
    roomKey: "chapel",
    visible: true,
    facts: [{ key: "marked_with_chalk", value: false }],
  },
] as const;

export const SEEDED_NPCS = [
  {
    key: MIRA_KEY,
    name: "Mira",
    description: MIRA_DESCRIPTION,
    facts: MIRA_BASELINE_FACTS,
    roomKey: "chapel",
    legacyFactKeys: LEGACY_MIRA_FACT_KEYS,
  },
  {
    key: PRIEST_KEY,
    name: PRIEST_NAME,
    description: PRIEST_DESCRIPTION,
    facts: PRIEST_BASELINE_FACTS,
    roomKey: "chapel",
  },
  {
    key: TAVERNKEEP_KEY,
    name: TAVERNKEEP_NAME,
    description: TAVERNKEEP_DESCRIPTION,
    facts: TAVERNKEEP_BASELINE_FACTS,
    roomKey: "tavern",
  },
  {
    key: MINSTREL_KEY,
    name: MINSTREL_NAME,
    description: MINSTREL_DESCRIPTION,
    facts: MINSTREL_BASELINE_FACTS,
    roomKey: "tavern",
  },
] as const;

export function buildStormboundBaseline(): AdventureBaseline {
  return {
    world: {
      name: "Stormbound Chapel",
      description:
        "A small persistent-world test set around a chapel, a tavern, a vestry, and a rain-lashed graveyard.",
    },
    rooms: SEEDED_ROOMS.map((room) => ({ ...room })),
    exits: SEEDED_EXITS.map((exit) => ({ ...exit })),
    player: {
      key: PLAYER_KEY,
      name: "Taylor",
      description: "The playtester exploring whether the world remembers.",
      roomKey: "chapel",
    },
    npcs: SEEDED_NPCS.map((npc) => ({
      key: npc.key,
      name: npc.name,
      description: npc.description,
      roomKey: npc.roomKey,
      facts: npc.facts.map((fact) => ({ key: fact.key, value: fact.value })),
    })),
    objects: SEEDED_OBJECTS.map((object) => ({
      key: object.key,
      name: object.name,
      description: object.description,
      roomKey: object.roomKey,
      visible: object.visible,
      facts: object.facts.map((fact) => ({ key: fact.key, value: fact.value })),
    })),
    initialEvent: "The Stormbound Chapel Adventure was created from its source WorldVersion.",
    initialNarration: "You stand in the chapel while rain works at the shutters.",
  };
}
