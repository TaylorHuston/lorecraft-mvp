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
  id?: string;
  key: string;
  name: string;
  role: "player" | "npc";
  description: string;
  locationKey?: string;
  facts: Array<{
    key: string;
    value: string | number | boolean | null;
    source: string;
  }>;
};

export type DirectorNpcProfile = {
  key: string;
  name: string;
  description: string;
  attributes: Array<{
    key: string;
    value: string | number | boolean | null;
    source: string;
    overridden?: boolean;
  }>;
  overriddenFields: string[];
};

export type NpcDebugOverride = {
  name?: string;
  description?: string;
  facts?: Record<string, string>;
};

export type DirectorLocationCard = {
  id: string;
  key: string;
  name: string;
  description: string;
  facts: Array<{
    key: string;
    value: string | number | boolean | null;
    source: string;
  }>;
  visibleObjects: Array<{
    key: string;
    name: string;
    description: string;
  }>;
  visibleExits: Array<{
    label: string;
    toLocationKey: string;
    toLocationName: string;
  }>;
  presentActors: Array<{
    key: string;
    name: string;
    role: "player" | "npc";
  }>;
};

export type DirectorKnownLocation = {
  id: string;
  key: string;
  name: string;
  description: string;
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
  npcProfiles?: DirectorNpcProfile[];
  objects: Array<{
    key: string;
    name: string;
    description: string;
  }>;
  locationCard?: DirectorLocationCard;
  knownLocations?: DirectorKnownLocation[];
  recentFeed: DirectorFeedEntry[];
};

export type TranscriptDirectorContext = {
  world: {
    id: string;
    name: string;
    description: string;
  };
  initialSeed: string;
  transcript: DirectorFeedEntry[];
};

export type DirectorMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type DirectorMode = "persistent" | "transcript";
export type DirectorOutputContract = "json_npc_updates" | "plain_prose";
export type DirectorCallRole = "story_generation" | "npc_state_extraction";
export type SceneBeatSource = "engine" | "llm" | "fallback";

export type DirectorRequestSummary = {
  directorMode: DirectorMode;
  callRole?: DirectorCallRole;
  outputContract: DirectorOutputContract;
  worldName: string;
  roomKey: string;
  playerInputLength: number;
  recentFeedCount: number;
  actorKeys: string[];
  npcFactKeys: string[];
  npcProfileKeys?: string[];
  npcOverrideKeys?: string[];
  npcMutationMode?: "read_only" | "bounded_updates";
  locationKeys?: string[];
  movementMode?: "read_only" | "bounded_existing_locations";
  readOnlyKnowledgeKeys: string[];
  requiredSceneBeat: {
    kind: SceneBeatKind;
    targetActorKey?: string;
    expectsNpcResponse: boolean;
    allowsNpcUpdates: boolean;
  };
  sceneBeatSource?: SceneBeatSource;
  sceneBeatReason?: string;
  promptComponentKeys: string[];
  promptGuidanceKeys?: string[];
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
  responseFormat: "json_object" | "text";
  reasoningEffort?: "none" | "low" | "medium" | "high" | "max";
};

export type DirectorPromptGuidance = {
  style?: string;
  npcBehavior?: string;
  persistence?: string;
};

export type ParsedNpcUpdate = {
  actorKey: string;
  reason: string;
  changes: Record<string, unknown>;
};

export type ParsedActorMove = {
  actorKey: string;
  toLocationKey: string;
  reason: string;
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

export type AcceptedActorMove = {
  actorKey: string;
  actorName: string;
  toLocationKey: string;
  toLocationName: string;
  reason: string;
};

export type IgnoredActorMove = {
  actorKey?: string;
  toLocationKey?: string;
  reason: string;
  valuePreview?: string;
};

export type ValidatedActorMoves = {
  acceptedMoves: AcceptedActorMove[];
  ignoredMoves: IgnoredActorMove[];
};
