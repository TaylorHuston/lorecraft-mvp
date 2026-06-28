export const NPC_FACT_KEYS = ["mood", "status", "memory"] as const;

export type NpcFactKey = (typeof NPC_FACT_KEYS)[number];

export type FeedEntryKind = "player" | "director" | "event";

export type DirectorFeedEntry = {
  id: string;
  kind: FeedEntryKind;
  text: string;
  source: string;
  createdAt: number;
  turnId?: string;
  commandId?: string;
};

export type DirectorActor = {
  key: string;
  name: string;
  role: "player" | "npc";
  description: string;
  facts: Array<{
    key: string;
    value: string | number | boolean | null;
    source: string;
  }>;
};

export type DirectorContext = {
  world: {
    id: string;
    name: string;
    description: string;
  };
  player: {
    id: string;
    key: string;
    name: string;
  };
  room: {
    id: string;
    key: string;
    name: string;
    description: string;
  };
  exits: Array<{
    label: string;
    toRoomName: string;
  }>;
  actors: DirectorActor[];
  objects: Array<{
    key: string;
    name: string;
    description: string;
  }>;
  recentFeed: DirectorFeedEntry[];
};

export type DirectorMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type DirectorRequestSummary = {
  worldName: string;
  roomKey: string;
  playerInputLength: number;
  recentFeedCount: number;
  actorKeys: string[];
  npcFactKeys: string[];
  readOnlyKnowledgeKeys: string[];
  requiredSceneBeat: {
    kind: SceneBeatKind;
    targetActorKey?: string;
    expectsNpcResponse: boolean;
    allowsNpcUpdates: boolean;
  };
  promptComponentKeys: string[];
  generationSettings?: DirectorGenerationSettingsSummary;
};

export type DirectorRequest = {
  messages: DirectorMessage[];
  requestSummary: DirectorRequestSummary;
};

export type SceneBeatKind =
  | "direct_npc_question"
  | "direct_npc_address"
  | "scene_question"
  | "trivial_player_action"
  | "player_action";

export type RequiredSceneBeat = {
  kind: SceneBeatKind;
  targetActorKey?: string;
  targetActorName?: string;
  expectsNpcResponse: boolean;
  allowsNpcUpdates: boolean;
  instruction: string;
};

export type DirectorGenerationSettingsSummary = {
  temperature: number;
  maxTokens?: number;
  topP?: number;
  responseFormat: "json_object";
};

export type ParsedNpcUpdate = {
  actorKey: string;
  reason: string;
  changes: Record<string, unknown>;
};

export type ParsedDirectorOutput = {
  narration: string;
  npcUpdates: ParsedNpcUpdate[];
};

export type AcceptedNpcFactChange = {
  key: NpcFactKey;
  value: string;
};

export type AcceptedNpcUpdate = {
  actorKey: string;
  actorName: string;
  reason: string;
  changes: AcceptedNpcFactChange[];
};

export type IgnoredNpcUpdate = {
  actorKey?: string;
  field?: string;
  reason: string;
  valuePreview?: string;
};

export type ValidatedNpcUpdates = {
  acceptedUpdates: AcceptedNpcUpdate[];
  ignoredUpdates: IgnoredNpcUpdate[];
};
