import {
  NPC_FACT_KEYS,
  type DirectorActor,
  type DirectorFeedEntry,
  type DirectorContext,
  type DirectorGenerationSettingsSummary,
  type DirectorPromptGuidance,
  type DirectorRequest,
  type RequiredSceneBeat,
  type SceneBeatSource,
  type TranscriptDirectorContext,
  type TurnTrigger,
} from "./types";
import { validateNarrativeInput } from "./input";
import { buildNpcProfiles } from "./npc-profiles";

export const RECENT_FEED_LIMIT = 12;
export const IMMEDIATE_CONTEXT_LIMIT = 6;

const HIDDEN_NPC_KNOWLEDGE_KEYS = new Set(["knowledge"]);

const DIRECTOR_INSTRUCTIONS = [
  "You are Lorecraft's Game Master for a narrative-first persistent-world MVP.",
  "Continue the scene in present tense, second person, with concrete story prose.",
  "Resolve the current player input first. Treat it as intent for you to adjudicate, not canonical prose to copy.",
  "The Player Card is canonical protagonist context, but it is not permission to invent new player intent.",
  "NPC cards are canonical. Recent story is continuity, but cards win when they conflict.",
  "When the player directly engages a present NPC, include that NPC's answer, refusal, action, lie, warning, counter-question, or meaningful silence.",
  "Use private NPC knowledge only when the scene gives that NPC a reason to reveal, hide, imply, or refuse it.",
  "Do not decide new player actions, thoughts, feelings, or dialogue beyond the submitted input.",
  "Return only player-facing story prose. Do not return JSON, Markdown, headings, bullets, schemas, state diffs, or mutation proposals.",
];

const SYSTEM_PROMPT = DIRECTOR_INSTRUCTIONS.join("\n");

const TRANSCRIPT_DIRECTOR_INSTRUCTIONS = [
  "You are Lorecraft's Game Master for a transcript-only story playtest.",
  "Continue from the transcript in present tense, second person, with active story prose.",
  "Resolve the current player input first. Treat it as intent for you to adjudicate, not canonical prose to copy.",
  "The world seed is only the premise. Recent story is the live continuity.",
  "If the player engages a nearby established character, include that character's answer, refusal, action, or meaningful silence.",
  "Respond with plain prose only.",
  "Do not return JSON, Markdown, headings, bullets, schemas, state diffs, or machine-readable mutation proposals.",
].join("\n");

export function buildDirectorRequest(
  context: DirectorContext,
  playerInput: string | null,
  options: {
    generationSettings?: DirectorGenerationSettingsSummary;
    promptGuidance?: DirectorPromptGuidance;
    requiredSceneBeat?: RequiredSceneBeat;
    sceneBeatSource?: SceneBeatSource;
    sceneBeatReason?: string;
    turnTrigger?: TurnTrigger;
    guideGuidance?: string;
  } = {},
): DirectorRequest {
  const prompt = buildPromptComponents(context, playerInput, {
    promptGuidance: options.promptGuidance,
    requiredSceneBeat: options.requiredSceneBeat,
    turnTrigger: options.turnTrigger,
    guideGuidance: options.guideGuidance,
  });
  const guideGuidanceLength =
    options.turnTrigger === "guide" ? (options.guideGuidance?.trim().length ?? 0) : 0;
  const generationSettings = options.generationSettings
    ? { ...options.generationSettings, responseFormat: "text" as const }
    : undefined;

  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt.userPrompt },
    ],
    requestSummary: {
      directorMode: "persistent",
      callRole: "story_generation",
      outputContract: "plain_prose",
      adventureId: context.adventure.id,
      worldId: context.world.id,
      worldVersionId: context.sourceWorldVersion.id,
      worldName: context.world.name,
      roomKey: context.room.key,
      turnTrigger: prompt.turnTrigger,
      playerInputLength: playerInput?.length ?? 0,
      ...(guideGuidanceLength > 0 ? { guideGuidanceLength } : {}),
      recentFeedCount: prompt.recentFeed.length,
      actorKeys: context.actors.map((actor) => actor.key),
      npcFactKeys: NPC_FACT_KEYS.filter((key) =>
        context.actors.some((actor) => actor.facts.some((fact) => fact.key === key)),
      ),
      npcProfileKeys: prompt.npcProfiles.map((profile) => profile.key),
      npcMutationMode: "bounded_updates",
      locationKeys: prompt.knownLocations.map((location) => location.key),
      movementMode: "bounded_existing_locations",
      readOnlyKnowledgeKeys: prompt.readOnlyKnowledgeKeys,
      requiredSceneBeat: {
        kind: prompt.requiredSceneBeat.kind,
        ...(prompt.requiredSceneBeat.targetActorKey
          ? { targetActorKey: prompt.requiredSceneBeat.targetActorKey }
          : {}),
        expectsNpcResponse: prompt.requiredSceneBeat.expectsNpcResponse,
        allowsNpcUpdates: prompt.requiredSceneBeat.allowsNpcUpdates,
      },
      sceneBeatSource: options.sceneBeatSource ?? "engine",
      ...(options.sceneBeatReason ? { sceneBeatReason: options.sceneBeatReason } : {}),
      promptComponentKeys: prompt.promptSectionKeys,
      ...(prompt.promptGuidanceKeys.length > 0 ? { promptGuidanceKeys: prompt.promptGuidanceKeys } : {}),
      ...(generationSettings ? { generationSettings } : {}),
    },
  };
}

export function buildNpcStateExtractionRequest(
  context: DirectorContext,
  playerInput: string | null,
  narration: string,
  options: {
    generationSettings?: DirectorGenerationSettingsSummary;
    promptGuidance?: DirectorPromptGuidance;
    requiredSceneBeat?: RequiredSceneBeat;
    sceneBeatSource?: SceneBeatSource;
    sceneBeatReason?: string;
    turnTrigger?: TurnTrigger;
  } = {},
): DirectorRequest {
  const prompt = buildPromptComponents(context, playerInput, {
    promptGuidance: options.promptGuidance,
    requiredSceneBeat: options.requiredSceneBeat,
    turnTrigger: options.turnTrigger,
  });
  const generationSettings = options.generationSettings
    ? { ...options.generationSettings, responseFormat: "json_object" as const }
    : undefined;
  const userPrompt = buildNpcStateExtractionUserPrompt({
    locationCard: prompt.components.locationCard,
    knownLocations: prompt.components.knownLocations,
    npcCards: prompt.components.npcCards,
    recentFeed: prompt.components.recentFeed,
    playerInput,
    turnTrigger: prompt.turnTrigger,
    narration,
    requiredSceneBeat: prompt.requiredSceneBeat,
  });

  return {
    messages: [
      {
        role: "system",
        content: [
          "You extract bounded NPC state updates from a completed Lorecraft story beat.",
          "Return only a JSON object. Do not write story prose.",
          "Only propose durable changes for present NPCs and only when the current input and narration clearly changed durable state.",
        ].join("\n"),
      },
      { role: "user", content: userPrompt },
    ],
    requestSummary: {
      directorMode: "persistent",
      callRole: "npc_state_extraction",
      outputContract: "json_npc_updates",
      adventureId: context.adventure.id,
      worldId: context.world.id,
      worldVersionId: context.sourceWorldVersion.id,
      worldName: context.world.name,
      roomKey: context.room.key,
      turnTrigger: prompt.turnTrigger,
      playerInputLength: playerInput?.length ?? 0,
      recentFeedCount: prompt.recentFeed.length,
      actorKeys: context.actors.map((actor) => actor.key),
      npcFactKeys: NPC_FACT_KEYS.filter((key) =>
        context.actors.some((actor) => actor.facts.some((fact) => fact.key === key)),
      ),
      npcProfileKeys: prompt.npcProfiles.map((profile) => profile.key),
      npcMutationMode: "bounded_updates",
      locationKeys: prompt.knownLocations.map((location) => location.key),
      movementMode: "bounded_existing_locations",
      readOnlyKnowledgeKeys: prompt.readOnlyKnowledgeKeys,
      requiredSceneBeat: {
        kind: prompt.requiredSceneBeat.kind,
        ...(prompt.requiredSceneBeat.targetActorKey
          ? { targetActorKey: prompt.requiredSceneBeat.targetActorKey }
          : {}),
        expectsNpcResponse: prompt.requiredSceneBeat.expectsNpcResponse,
        allowsNpcUpdates: prompt.requiredSceneBeat.allowsNpcUpdates,
      },
      sceneBeatSource: options.sceneBeatSource ?? "engine",
      ...(options.sceneBeatReason ? { sceneBeatReason: options.sceneBeatReason } : {}),
      promptComponentKeys: [
        "extractionInstructions",
        "locationCard",
        "knownLocations",
        "npcCards",
        "recentStory",
        "currentInput",
        "gameMasterNarration",
        "output",
      ],
      ...(prompt.promptGuidanceKeys.length > 0 ? { promptGuidanceKeys: prompt.promptGuidanceKeys } : {}),
      ...(generationSettings ? { generationSettings } : {}),
    },
  };
}

export function buildTranscriptDirectorRequest(
  context: TranscriptDirectorContext,
  playerInput: string | null,
  options: {
    generationSettings?: DirectorGenerationSettingsSummary;
    promptGuidance?: DirectorPromptGuidance;
    turnTrigger?: TurnTrigger;
  } = {},
): DirectorRequest {
  const turnTrigger = options.turnTrigger ?? "act";
  const actionInput = playerInput ?? "";
  const transcript = sanitizeTranscript(context.transcript).slice(-RECENT_FEED_LIMIT);
  const immediateContext = transcript.slice(-IMMEDIATE_CONTEXT_LIMIT);
  const promptGuidance = normalizePromptGuidance(options.promptGuidance);
  const lastAction = {
    trigger: turnTrigger,
    rawInput: actionInput,
    inferredMode: turnTrigger === "pass" ? ("pass" as const) : inferPlayerInputMode(actionInput),
    directive:
      turnTrigger === "pass"
        ? "The player passes. Continue the scene from the transcript without inventing a new player action."
        : "Resolve this player input now before advancing the scene. Treat it as intent, not already-canonical prose.",
  };
  const sceneDirective = buildTranscriptSceneDirective(lastAction.inferredMode);
  const components = {
    promptGuidance,
    worldSeed: {
      name: context.world.name,
      description: context.world.description,
      initialSeed: context.initialSeed,
    },
    transcript: transcript.map(toTranscriptPromptEntry),
    immediateContext: immediateContext.map(toTranscriptPromptEntry),
    lastAction,
    sceneDirective,
  };
  const userPrompt = buildTranscriptUserPrompt(components);

  return {
    messages: [
      { role: "system", content: TRANSCRIPT_DIRECTOR_INSTRUCTIONS },
      { role: "user", content: userPrompt },
    ],
    requestSummary: {
      directorMode: "transcript",
      callRole: "story_generation",
      outputContract: "plain_prose",
      adventureId: context.adventure.id,
      worldId: context.world.id,
      worldVersionId: context.sourceWorldVersion.id,
      worldName: context.world.name,
      roomKey: "transcript",
      turnTrigger,
      playerInputLength: playerInput?.length ?? 0,
      recentFeedCount: transcript.length,
      actorKeys: [],
      npcFactKeys: [],
      readOnlyKnowledgeKeys: [],
      requiredSceneBeat: {
        kind: turnTrigger === "pass" ? "pass" : "player_action",
        expectsNpcResponse: false,
        allowsNpcUpdates: false,
      },
      promptComponentKeys: transcriptPromptSectionKeys(components),
      ...(Object.keys(promptGuidance).length > 0
        ? { promptGuidanceKeys: Object.keys(promptGuidance) }
        : {}),
      ...(options.generationSettings ? { generationSettings: options.generationSettings } : {}),
    },
  };
}

function inferPlayerInputMode(input: string) {
  const trimmed = input.trim();
  const quotedOnly = /^"[^"]+"$/.test(trimmed) || /^'[^']+'$/.test(trimmed);
  if (quotedOnly) {
    return "speech" as const;
  }

  if (/[?]$/.test(trimmed) || /\b(ask|tell|say|reply|answer|whisper|shout)\b/i.test(trimmed)) {
    return "speech_or_address" as const;
  }

  if (/^\s*(you|i)\s+/i.test(trimmed)) {
    return "action" as const;
  }

  return "storylike" as const;
}

function buildTranscriptSceneDirective(inferredMode: ReturnType<typeof inferPlayerInputMode> | "pass") {
  const base = [
    inferredMode === "pass"
      ? "Resolve Current Input as a Pass in the scene established by Recent Story."
      : "Resolve Current Input in the scene established by Recent Story.",
    inferredMode === "pass"
      ? "The player has not added a new action; advance the scene without inventing one."
      : "Player input is intent for the Game Master to resolve, not already-canonical story prose.",
    "Do not copy Current Input verbatim as the next story paragraph unless it is quoted dialogue.",
    "Keep the response concise and avoid replaying earlier setup.",
    "Do not decide new player actions, thoughts, feelings, or dialogue beyond the submitted input.",
  ];

  if (inferredMode === "speech" || inferredMode === "speech_or_address") {
    base.push(
      "Treat Current Input as something the player says or addresses to the most plausible nearby character from Recent Story.",
      "If a nearby character has been directly engaged, include that character's response, refusal, action, or meaningful silence now.",
    );
  }

  if (inferredMode === "action") {
    base.push("Treat Current Input as the player's attempted action and narrate the immediate consequence.");
  }

  return base.join(" ");
}

function sanitizeTranscript(transcript: DirectorFeedEntry[]) {
  const invalidTurnKeys = new Set<string>();
  const invalidEntryIds = new Set<string>();

  for (const entry of transcript) {
    if (entry.kind !== "player") {
      continue;
    }

    if (validateNarrativeInput(entry.text).ok) {
      continue;
    }

    const turnKey = entry.turnId ?? entry.commandId;
    if (turnKey) {
      invalidTurnKeys.add(turnKey);
    } else {
      invalidEntryIds.add(entry.id);
    }
  }

  if (invalidTurnKeys.size === 0 && invalidEntryIds.size === 0) {
    return transcript;
  }

  return transcript.filter((entry) => {
    const turnKey = entry.turnId ?? entry.commandId;
    return !(turnKey && invalidTurnKeys.has(turnKey)) && !invalidEntryIds.has(entry.id);
  });
}

function toTranscriptPromptEntry(entry: DirectorFeedEntry) {
  return {
    kind: entry.kind,
    text: entry.text,
    source: entry.source,
  };
}

function buildPromptComponents(
  context: DirectorContext,
  playerInput: string | null,
  options: {
    promptGuidance?: DirectorPromptGuidance;
    requiredSceneBeat?: RequiredSceneBeat;
    turnTrigger?: TurnTrigger;
    guideGuidance?: string;
  },
) {
  const turnTrigger = options.turnTrigger ?? "act";
  const actionInput = playerInput ?? "";
  const guideGuidance = options.guideGuidance?.trim() ?? "";
  const storyVisibleHistory = (
    context.storyVisibleHistory ??
    context.recentFeed.filter((entry) => entry.kind === "director" || entry.kind === "story")
  ).slice(-RECENT_FEED_LIMIT);
  const requiredSceneBeat =
    options.requiredSceneBeat ??
    (turnTrigger === "pass"
      ? passSceneBeat()
      : turnTrigger === "guide"
        ? guideSceneBeat()
        : deriveRequiredSceneBeat(context, actionInput));
  const promptGuidance = normalizePromptGuidance(options.promptGuidance);
  const lastAction = {
    trigger: turnTrigger,
    rawInput: turnTrigger === "guide" ? guideGuidance : actionInput,
    inferredMode:
      turnTrigger === "pass"
        ? ("pass" as const)
        : turnTrigger === "guide"
          ? ("guide" as const)
          : inferPlayerInputMode(actionInput),
    directive:
      turnTrigger === "pass"
        ? "The player passes. Continue the scene from accepted narration and canonical state without inventing a new player action."
        : turnTrigger === "guide"
          ? "Follow this hidden Guide steering for the next Game Master narration. Treat it as private direction, not as canonical player prose, action, dialogue, or transcript."
        : "Resolve this player input now before advancing the scene. Treat it as intent, not already-canonical prose.",
  };
  const npcProfiles = context.npcProfiles ?? buildNpcProfiles(context.actors);
  const npcCards = npcProfiles.map(toNpcCard);
  const locationCard = context.locationCard ?? fallbackLocationCard(context);
  const knownLocations =
    context.knownLocations ??
    [
      {
        id: context.room.id,
        key: context.room.key,
        name: context.room.name,
        description: context.room.description,
      },
    ];
  const conversationFocus = buildConversationFocus(context.actors, context.recentFeed, requiredSceneBeat);
  const readOnlyKnowledgeKeys = npcProfiles.flatMap((profile) =>
    profile.attributes
      .filter((attribute) => HIDDEN_NPC_KNOWLEDGE_KEYS.has(attribute.key))
      .map((attribute) => `${profile.key}.${attribute.key}`),
  );
  const sceneDirective = buildPersistentSceneDirective(
    requiredSceneBeat,
    lastAction.inferredMode,
    npcProfiles,
  );
  const components = {
    aiInstructions: buildPersistentAiInstructions({
      promptGuidance,
      requiredSceneBeat,
      conversationFocus,
    }),
    promptGuidance,
    scene: {
      world: {
        name: context.world.name,
        description: context.world.description,
      },
      room: {
        key: context.room.key,
        name: context.room.name,
        description: context.room.description,
      },
      visibleExits: context.exits,
      visibleObjects: context.objects,
      player: {
        name: context.player.name,
        key: context.player.key,
      },
    },
    locationCard,
    knownLocations,
    playerCard: context.player,
    npcCards,
    conversationFocus,
    recentFeed: storyVisibleHistory.map((entry) => ({
      kind: entry.kind,
      text: entry.text,
      source: entry.source,
    })),
    lastAction,
    sceneDirective,
  };
  const userPrompt = buildPersistentUserPrompt(components);
  const promptSectionKeys = persistentPromptSectionKeys();

  return {
    components,
    userPrompt,
    promptSectionKeys,
    recentFeed: storyVisibleHistory,
    requiredSceneBeat,
    turnTrigger,
    promptGuidanceKeys: Object.keys(promptGuidance),
    npcProfiles,
    knownLocations,
    readOnlyKnowledgeKeys,
    guideGuidanceLength: guideGuidance.length,
  };
}

function toNpcCard(profile: ReturnType<typeof buildNpcProfiles>[number]) {
  const attributes = new Map(profile.attributes.map((attribute) => [attribute.key, attribute]));
  const lines = [
    `NPC CARD: ${profile.name} (${profile.key})`,
    `Description: ${profile.description}`,
  ];
  appendCardLine(lines, "Background", attributes.get("background")?.value);
  appendCardLine(lines, "Personality", attributes.get("persona")?.value);
  appendCardLine(lines, "Voice", attributes.get("voice")?.value);
  appendCardLine(lines, "Mood", attributes.get("mood")?.value);
  appendCardLine(lines, "Current status", attributes.get("status")?.value);
  appendCardLine(lines, "Memory with player", attributes.get("memory")?.value);
  appendCardLine(lines, "Private knowledge", attributes.get("knowledge")?.value);

  for (const attribute of profile.attributes) {
    if (
      ["background", "persona", "voice", "mood", "status", "memory", "knowledge"].includes(
        attribute.key,
      )
    ) {
      continue;
    }
    appendCardLine(lines, attribute.key, attribute.value);
  }

  return {
    key: profile.key,
    name: profile.name,
    card: lines.join("\n"),
  };
}

function appendCardLine(lines: string[], label: string, value: unknown) {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    return;
  }
  lines.push(`${label}: ${String(value)}`);
}

type PromptFeedEntry = Pick<DirectorFeedEntry, "kind" | "text" | "source">;
type PromptNpcCard = ReturnType<typeof toNpcCard>;
type ConversationFocus = ReturnType<typeof buildConversationFocus>;

type PersistentPromptScene = {
  world: {
    name: string;
    description: string;
  };
  room: {
    key: string;
    name: string;
    description: string;
  };
  visibleExits: DirectorContext["exits"];
  visibleObjects: DirectorContext["objects"];
  player: {
    key: string;
    name: string;
  };
};

function buildPersistentAiInstructions({
  promptGuidance,
  requiredSceneBeat,
  conversationFocus,
}: {
  promptGuidance: DirectorPromptGuidance;
  requiredSceneBeat: RequiredSceneBeat;
  conversationFocus: ConversationFocus;
}) {
  const lines = [
    "Continue and advance the story like it never ended.",
    "Use present tense, second person, concrete sensory detail, and lifelike dialogue.",
    "Write one complete short story beat, usually 1-2 paragraphs.",
    "Prefer complete sentences and a clean stopping point over extra detail.",
    requiredSceneBeat.kind === "pass"
      ? "The player has passed. Advance the scene without inventing a new player action."
      : requiredSceneBeat.kind === "guide"
        ? "The player has provided hidden Guide steering. Follow it for this response, but do not treat it as already-canonical story prose or player action."
      : "Resolve Current Input before advancing; do not merely restate it.",
    "Stop after resolving the current input; do not continue into the player's next action.",
    "Treat player-authored Story entries in Recent Story as accepted canonical scene content.",
    "Treat the Player Card as canonical protagonist context for appearance, backstory, current status, and location.",
    "Use the Player Card to ground perception and consequences, not to choose new player intent.",
    "Treat Location Cards as canonical scene truth. Known Locations are the only valid movement destinations; do not invent new locations.",
    "Treat NPC Cards as canonical story memory, including descriptions, personality, voice, current status, memory, and private knowledge.",
    "Keep fleeting gestures and reactions in narration. Durable NPC state is evaluated separately after this prose.",
  ];

  for (const line of promptGuidanceLines(promptGuidance)) {
    lines.push(line);
  }

  if (requiredSceneBeat.expectsNpcResponse) {
    const targetName = requiredSceneBeat.targetActorName ?? "the addressed NPC";
    lines.push(
      `${targetName} is being directly engaged. Include their answer, refusal, action, lie, warning, counter-question, or meaningful silence now.`,
    );
  } else if (requiredSceneBeat.targetActorName) {
    lines.push(`Use ${requiredSceneBeat.targetActorName}'s NPC Card when describing or resolving this beat.`);
  } else if (conversationFocus.lastAddressedNpcName) {
    lines.push(
      `For ambiguous follow-up dialogue, the likely addressed NPC is ${conversationFocus.lastAddressedNpcName}; explicit names still win.`,
    );
  }

  if (!requiredSceneBeat.expectsNpcResponse) {
    lines.push("Do not force NPC dialogue unless the current input naturally calls for it.");
  }

  lines.push("Do not choose new player actions, thoughts, feelings, or dialogue.");

  return lines;
}

function buildPersistentUserPrompt(components: {
  aiInstructions: string[];
  scene: PersistentPromptScene;
  locationCard: NonNullable<DirectorContext["locationCard"]>;
  knownLocations: NonNullable<DirectorContext["knownLocations"]>;
  playerCard: DirectorContext["player"];
  npcCards: PromptNpcCard[];
  recentFeed: PromptFeedEntry[];
  lastAction: { trigger: TurnTrigger; rawInput: string; directive: string };
}) {
  return buildSectionedPrompt([
    ["AI Instructions", bulletList(components.aiInstructions)],
    ["World", formatPersistentScene(components.scene)],
    ["Player Card", formatPlayerCard(components.playerCard)],
    ["Location Card", formatLocationCard(components.locationCard)],
    ["Known Locations", formatKnownLocations(components.knownLocations)],
    ["NPC Cards", formatNpcCards(components.npcCards)],
    ["Recent Story", formatRecentStory(components.recentFeed)],
    ["Current Input", formatCurrentInput(components.lastAction)],
    ["Output", "Return player-facing story prose only."],
  ]);
}

function buildNpcStateExtractionUserPrompt(components: {
  locationCard: NonNullable<DirectorContext["locationCard"]>;
  knownLocations: NonNullable<DirectorContext["knownLocations"]>;
  npcCards: PromptNpcCard[];
  recentFeed: PromptFeedEntry[];
  playerInput: string | null;
  turnTrigger: TurnTrigger;
  narration: string;
  requiredSceneBeat: RequiredSceneBeat;
}) {
  const instructions = [
    `Allowed update fields: ${NPC_FACT_KEYS.join(", ")}.`,
    "Use mood for the NPC's current emotional posture.",
    "Use status for durable current condition or situation that should affect later narration.",
    "Use memory for a compact rolling summary of meaningful direct interactions with the player.",
    "Only update a field when the completed Game Master Narration directly supports that exact durable condition.",
    "Do not intensify narration into stronger facts. For example, 'ledger slipping slightly' does not support 'dropping his ledger'.",
    "Do not update description, background, persona, voice, knowledge, location, inventory, health, or rules-like stats.",
    "Do not update for momentary gestures, incidental movement, eye contact, posture, tone, startles, flinches, gasps, brief freezing, or obvious reactions that the recent story already covers.",
    "Before proposing an update, ask whether the fact should still matter three turns from now. If not, leave it in narration.",
    "Do not invent hidden consequences. If no durable NPC state changed, return an empty npcUpdates array.",
    "Actor movement is separate from NPC facts. Propose actorMoves only when Current Input clearly attempts travel and the completed narration confirms the actor reached or entered an existing Known Location.",
    "Allowed actorMoves actors: the player and NPCs present in the Location Card.",
    "Allowed actorMoves destinations: Known Locations only. Never create a location.",
    "If the turn trigger is Guide, treat hidden guidance as private steering, not player prose; durable changes must be justified by the completed Game Master Narration.",
  ];

  if (!components.requiredSceneBeat.allowsNpcUpdates) {
    instructions.push(
      "The required scene beat is not eligible for durable NPC updates; return an empty npcUpdates array unless the narration shows an unavoidable durable consequence.",
    );
  }

  return buildSectionedPrompt([
    ["Extraction Instructions", bulletList(instructions)],
    ["Location Card", formatLocationCard(components.locationCard)],
    ["Known Locations", formatKnownLocations(components.knownLocations)],
    ["NPC Cards", formatNpcCards(components.npcCards)],
    ["Recent Story", formatRecentStory(components.recentFeed)],
    [
      "Current Input",
      formatCurrentInput({
        trigger: components.turnTrigger,
        rawInput: components.playerInput ?? "",
        directive:
          components.turnTrigger === "pass"
            ? "The player passed this turn."
            : "The player acted this turn.",
      }),
    ],
    ["Game Master Narration", components.narration],
    [
      "Output",
      'Return exactly one JSON object shaped like {"npcUpdates":[{"actorKey":"mira","reason":"brief human-readable reason","changes":{"mood":"new mood","status":"new status","memory":"updated compact memory"}}],"actorMoves":[{"actorKey":"taylor","toLocationKey":"vestry","reason":"brief human-readable reason"}]}. Use {"npcUpdates":[],"actorMoves":[]} when nothing durable changed.',
    ],
  ]);
}

function persistentPromptSectionKeys() {
  return [
    "aiInstructions",
    "world",
    "playerCard",
    "locationCard",
    "knownLocations",
    "npcCards",
    "recentStory",
    "currentInput",
    "output",
  ];
}

function buildTranscriptUserPrompt(components: {
  promptGuidance: DirectorPromptGuidance;
  worldSeed: {
    name: string;
    description: string;
    initialSeed: string;
  };
  transcript: PromptFeedEntry[];
  lastAction: { trigger: TurnTrigger; rawInput: string; directive: string };
  sceneDirective: string;
}) {
  const instructions = [
    "Continue and advance the story like it never ended.",
    "Use present tense, second person, concrete sensory detail, and lifelike dialogue.",
    "Write one complete short story beat, usually 1-2 paragraphs.",
    "Prefer complete sentences and a clean stopping point over extra detail.",
    "Resolve Current Input before advancing; do not merely restate it.",
    "Use Recent Story as live continuity. The World Seed is only the opening premise.",
    components.sceneDirective,
  ];
  const promptGuidance = promptGuidanceLines(components.promptGuidance);

  return buildSectionedPrompt([
    ["AI Instructions", bulletList(instructions)],
    ...(promptGuidance.length > 0
      ? ([["Prompt Guidance", bulletList(promptGuidance)]] as Array<[string, string]>)
      : []),
    ["World Seed", formatWorldSeed(components.worldSeed)],
    ["Recent Story", formatRecentStory(components.transcript)],
    ["Current Input", formatCurrentInput(components.lastAction)],
  ]);
}

function transcriptPromptSectionKeys(components: {
  promptGuidance: DirectorPromptGuidance;
}) {
  return Object.keys(components.promptGuidance).length > 0
    ? ["aiInstructions", "promptGuidance", "worldSeed", "recentStory", "currentInput"]
    : ["aiInstructions", "worldSeed", "recentStory", "currentInput"];
}

function buildSectionedPrompt(sections: Array<[string, string]>) {
  return sections.map(([heading, body]) => `${heading}:\n${body.trim()}`).join("\n\n");
}

function bulletList(lines: string[]) {
  return lines.map((line) => `- ${line}`).join("\n");
}

function promptGuidanceLines(promptGuidance: DirectorPromptGuidance) {
  return [
    promptGuidance.style ? `Style guidance: ${promptGuidance.style}` : "",
    promptGuidance.npcBehavior ? `NPC behavior guidance: ${promptGuidance.npcBehavior}` : "",
    promptGuidance.persistence ? `Persistence guidance: ${promptGuidance.persistence}` : "",
  ].filter(Boolean);
}

function formatPersistentScene(scene: PersistentPromptScene) {
  const lines = [
    `${scene.world.name}: ${scene.world.description}`,
    `Current scene: ${scene.room.name} (${scene.room.key}) - ${scene.room.description}`,
    `Player: ${scene.player.name} (${scene.player.key})`,
  ];

  if (scene.visibleExits.length > 0) {
    lines.push(
      `Visible exits: ${scene.visibleExits
        .map((exit) => `${exit.label} to ${exit.toRoomName}`)
        .join("; ")}`,
    );
  }

  if (scene.visibleObjects.length > 0) {
    lines.push(
      `Visible objects: ${scene.visibleObjects
        .map((object) => `${object.name} - ${object.description}`)
        .join("; ")}`,
    );
  }

  return lines.join("\n");
}

function formatPlayerCard(player: DirectorContext["player"]) {
  const lines = [
    `PLAYER CARD: ${player.name} (${player.key})`,
    `Current location: ${player.locationName} (${player.locationKey})`,
  ];

  appendCardLine(lines, "Physical description", player.profile.physicalDescription);
  appendCardLine(lines, "Backstory", player.profile.backstory);
  appendCardLine(lines, "Current status", player.profile.status);
  lines.push(
    "Agency boundary: use this card for continuity, perception, and consequences; do not invent new player actions, thoughts, feelings, speech, goals, or intent.",
  );

  return lines.join("\n");
}

function formatNpcCards(npcCards: PromptNpcCard[]) {
  if (npcCards.length === 0) {
    return "No present NPC cards.";
  }

  return npcCards.map((npcCard) => npcCard.card).join("\n\n");
}

function formatLocationCard(location: NonNullable<DirectorContext["locationCard"]>) {
  const lines = [
    `LOCATION CARD: ${location.name} (${location.key})`,
    `Description: ${location.description}`,
  ];

  if (location.facts.length > 0) {
    lines.push(
      `Facts: ${location.facts
        .map((fact) => `${fact.key}=${String(fact.value)} (${fact.source})`)
        .join("; ")}`,
    );
  }

  if (location.presentActors.length > 0) {
    lines.push(
      `Present actors: ${location.presentActors
        .map((actor) => `${actor.name} (${actor.key}, ${actor.role})`)
        .join("; ")}`,
    );
  }

  if (location.visibleObjects.length > 0) {
    lines.push(
      `Visible objects: ${location.visibleObjects
        .map((object) => `${object.name} (${object.key}) - ${object.description}`)
        .join("; ")}`,
    );
  }

  if (location.visibleExits.length > 0) {
    lines.push(
      `Visible exits: ${location.visibleExits
        .map((exit) => `${exit.label} to ${exit.toLocationName} (${exit.toLocationKey})`)
        .join("; ")}`,
    );
  }

  return lines.join("\n");
}

function formatKnownLocations(locations: NonNullable<DirectorContext["knownLocations"]>) {
  if (locations.length === 0) {
    return "No known movement destinations.";
  }

  return locations
    .map((location) => `- ${location.name} (${location.key}): ${location.description}`)
    .join("\n");
}

function fallbackLocationCard(context: DirectorContext): NonNullable<DirectorContext["locationCard"]> {
  return {
    id: context.room.id,
    key: context.room.key,
    name: context.room.name,
    description: context.room.description,
    facts: [],
    visibleObjects: context.objects,
    visibleExits: context.exits.map((exit) => ({
      label: exit.label,
      toLocationKey: normalizeForMatching(exit.toRoomName).replace(/\s+/g, "-"),
      toLocationName: exit.toRoomName,
    })),
    presentActors: context.actors.map((actor) => ({
      key: actor.key,
      name: actor.name,
      role: actor.role,
    })),
  };
}

function formatRecentStory(feed: PromptFeedEntry[]) {
  if (feed.length === 0) {
    return "None yet.";
  }

  return feed.map(formatRecentStoryEntry).join("\n");
}

function formatCurrentInput(currentTurn: {
  trigger: TurnTrigger;
  rawInput: string;
  directive: string;
}) {
  if (currentTurn.trigger === "pass") {
    return [
      "Turn trigger: Pass.",
      currentTurn.directive,
      "Continue from Recent Story and canonical cards. Do not invent a new player action, thought, feeling, or dialogue.",
    ].join("\n");
  }

  if (currentTurn.trigger === "guide") {
    return [
      "Turn trigger: Guide.",
      currentTurn.rawInput ? `[Hidden Guide]\n> ${currentTurn.rawInput}` : "[Hidden Guide omitted from this request.]",
      currentTurn.directive,
      "The hidden Guide text is current-turn steering only. It is not a player action, dialogue, or accepted story paragraph.",
    ].join("\n");
  }

  return [`Turn trigger: Act.`, `> ${currentTurn.rawInput}`, currentTurn.directive].join("\n");
}

function formatRecentStoryEntry(entry: PromptFeedEntry) {
  if (entry.kind === "player") {
    return `> ${entry.text}`;
  }
  if (entry.kind === "story") {
    return `[Player-authored Story] ${entry.text}`;
  }
  if (entry.kind === "event") {
    return `[Event] ${entry.text}`;
  }
  return entry.text;
}

function formatWorldSeed(worldSeed: {
  name: string;
  description: string;
  initialSeed: string;
}) {
  return `${worldSeed.name}: ${worldSeed.description}\n${worldSeed.initialSeed}`;
}

function buildConversationFocus(
  actors: DirectorActor[],
  recentFeed: DirectorFeedEntry[],
  sceneBeat: RequiredSceneBeat,
) {
  const npcs = actors.filter((actor) => actor.role === "npc");
  const directTarget = sceneBeat.targetActorKey
    ? npcs.find((npc) => npc.key === sceneBeat.targetActorKey)
    : undefined;
  const recentTarget = directTarget ?? findRecentAddressedNpc(npcs, recentFeed);

  if (!recentTarget) {
    return {
      lastAddressedNpcKey: null,
      lastAddressedNpcName: null,
      source: "recentFeed",
      instruction:
        "No recent addressed NPC was derived. Use explicit names in currentTurn before inferring a target.",
    };
  }

  return {
    lastAddressedNpcKey: recentTarget.key,
    lastAddressedNpcName: recentTarget.name,
    source: directTarget ? "currentTurn" : "recentFeed",
    instruction:
      "Use this only for ambiguous follow-up dialogue. Explicit names in currentTurn always win.",
  };
}

function buildPersistentSceneDirective(
  sceneBeat: RequiredSceneBeat,
  inferredMode: ReturnType<typeof inferPlayerInputMode> | "pass" | "guide",
  npcProfiles: ReturnType<typeof buildNpcProfiles>,
) {
  const targetProfile = sceneBeat.targetActorKey
    ? npcProfiles.find((profile) => profile.key === sceneBeat.targetActorKey)
    : undefined;
  const mustUse = targetProfile
    ? [
        `npcCards.${targetProfile.key}`,
        `npcProfiles.${targetProfile.key}.description`,
        ...targetProfile.attributes.map((attribute) => `npcProfiles.${targetProfile.key}.${attribute.key}`),
      ]
    : ["npcCards/npcProfiles when an NPC is looked at, addressed, or asked about"];

  return {
    priority: "highest",
    task:
      inferredMode === "pass"
        ? "Resolve currentTurn.pass by continuing the scene from accepted narration and canonical state."
        : inferredMode === "guide"
          ? "Resolve currentTurn.guide by following hidden current-turn steering while preserving canonical scene truth."
        : "Resolve currentTurn.playerInput now before advancing the scene.",
    lastActionMode: inferredMode,
    targetActorKey: sceneBeat.targetActorKey,
    targetActorName: sceneBeat.targetActorName,
    mustUse,
    conflictPolicy:
      "currentTurn and sceneDirective override Recent Story. playerCard, npcCards, npcProfiles, and visibleFacts are canonical current scene truth; when they conflict with Recent Story, use the canonical card/profile/fact context without overriding player agency.",
    responseRequirement: sceneBeat.expectsNpcResponse
      ? "The target NPC must answer, refuse, deflect, warn, lie, ask back, act, or intentionally stay silent in this response. Do not stop after setup or repeat the player's question without resolution."
      : inferredMode === "pass"
        ? "Advance the scene one short beat from existing tension, NPC agenda, environment, or consequences. Do not invent a new player action."
        : inferredMode === "guide"
          ? "Follow the hidden Guide steering for one short story beat. Do not reveal or quote the Guide text as player prose."
        : "Resolve the player's intent directly. Do not replay setup or copy player input as the whole response.",
    npcAttributePolicy:
      "If the player asks about an NPC's appearance, identity, background, personality, voice, mood, status, memory, or knowledge, answer from npcCards/npcProfiles instead of inventing conflicting details.",
    playerAgency:
      "Do not decide new player actions, thoughts, feelings, or dialogue beyond the submitted input.",
    outputReminder: "Return player-facing story prose only.",
  };
}

export function normalizePromptGuidance(guidance: DirectorPromptGuidance | undefined) {
  return Object.fromEntries(
    Object.entries(guidance ?? {})
      .map(([key, value]) => [key, typeof value === "string" ? value.trim().slice(0, 1200) : ""])
      .filter(([, value]) => value.length > 0),
  ) as DirectorPromptGuidance;
}

export function deriveRequiredSceneBeat(
  context: Pick<DirectorContext, "actors"> & Partial<Pick<DirectorContext, "recentFeed">>,
  playerInput: string,
): RequiredSceneBeat {
  const normalizedInput = normalizeForMatching(playerInput);
  const presentNpcs = context.actors.filter((actor) => actor.role === "npc");
  const explicitTarget = findDirectNpcTarget(presentNpcs, normalizedInput, playerInput);
  const recentTarget = findRecentAddressedNpc(presentNpcs, context.recentFeed ?? []);
  const target =
    explicitTarget ??
    (isFollowUpToRecentNpc(normalizedInput, playerInput) ? recentTarget : undefined);
  const questionLike = isQuestionLike(normalizedInput);

  if (target && questionLike) {
    return {
      kind: "direct_npc_question",
      targetActorKey: target.key,
      targetActorName: target.name,
      expectsNpcResponse: true,
      allowsNpcUpdates: true,
      instruction: `${target.name} is directly addressed with a question. The narration must include a completed meaningful response or choice from ${target.name}: quoted or clearly attributed speech, an answer, refusal, deflection, warning, lie, counter-question, action, or visibly intentional silence. Do not stop at setup like '${target.name} pauses before speaking.' Facial expression alone does not satisfy this beat.`,
    };
  }

  if (target) {
    const expectsNpcResponse = isSpeechLikeDirectAddress(normalizedInput, playerInput);
    return {
      kind: "direct_npc_address",
      targetActorKey: target.key,
      targetActorName: target.name,
      expectsNpcResponse,
      allowsNpcUpdates: true,
      instruction: expectsNpcResponse
        ? `${target.name} is directly addressed. The narration should include a brief completed response or choice from ${target.name}: speech, action, refusal, deflection, or meaningful silence.`
        : `${target.name} is directly referenced. Use ${target.name}'s NPC card if relevant, but do not force a spoken line if the action does not call for one.`,
    };
  }

  if (questionLike) {
    return {
      kind: "scene_question",
      expectsNpcResponse: false,
      allowsNpcUpdates: true,
      instruction:
        "The player asks a question, but no present NPC is clearly addressed. Answer through scene narration unless an NPC response naturally follows from context.",
    };
  }

  if (isTrivialPhysicalAction(normalizedInput)) {
    return {
      kind: "trivial_player_action",
      expectsNpcResponse: false,
      allowsNpcUpdates: false,
      instruction: "The player performs a trivial physical action. Narrate the immediate beat and observable reactions.",
    };
  }

  return {
    kind: "player_action",
    expectsNpcResponse: false,
    allowsNpcUpdates: true,
    instruction:
      "The player performs or describes the current action. Narrate this action's immediate consequences and observable reactions, but do not continue a previous dialogue beat, force NPC speech, or create durable fact changes for trivial physical actions.",
  };
}

function passSceneBeat(): RequiredSceneBeat {
  return {
    kind: "pass",
    expectsNpcResponse: false,
    allowsNpcUpdates: true,
    instruction:
      "The player passes. Continue the scene one short beat from accepted narration and canonical state without inventing a new player action.",
  };
}

function guideSceneBeat(): RequiredSceneBeat {
  return {
    kind: "guide",
    expectsNpcResponse: false,
    allowsNpcUpdates: true,
    instruction:
      "The player provides hidden Guide steering. Use it as private current-turn direction for the next story beat, not as canonical player prose, action, or dialogue.",
  };
}

function findRecentAddressedNpc(npcs: DirectorActor[], recentFeed: DirectorFeedEntry[]) {
  for (const entry of [...recentFeed].reverse()) {
    if (entry.kind !== "player") {
      continue;
    }
    const normalizedText = normalizeForMatching(entry.text);
    const target = npcs.find((actor) =>
      [actor.key, actor.name].some((label) => wordAppears(normalizedText, normalizeForMatching(label))),
    );
    if (target) {
      return target;
    }
  }

  return undefined;
}

function isFollowUpToRecentNpc(normalizedInput: string, rawInput: string) {
  return isQuestionLike(normalizedInput) && hasSecondPersonReference(normalizedInput, rawInput);
}

function hasSecondPersonReference(normalizedInput: string, rawInput: string) {
  return /\b(you|your|yours|we|us|our)\b/.test(normalizedInput) || /^["']/.test(rawInput.trim());
}

function isSpeechLikeDirectAddress(normalizedInput: string, rawInput: string) {
  const trimmed = rawInput.trim();
  return (
    /^["']/.test(trimmed) ||
    /[!]$/.test(trimmed) ||
    /\b(ask|tell|say|reply|answer|whisper|shout|greet|call)\b/.test(normalizedInput)
  );
}

function findDirectNpcTarget(npcs: DirectorActor[], normalizedInput: string, rawInput: string) {
  const namedTarget = npcs.find((actor) =>
    [actor.key, actor.name].some((label) => wordAppears(normalizedInput, normalizeForMatching(label))),
  );
  if (namedTarget) {
    return namedTarget;
  }

  if (npcs.length !== 1) {
    return undefined;
  }

  const soleNpc = npcs[0];
  const quotedQuestion =
    isQuestionLike(normalizedInput) && /^["'][\s\S]*[?][\s\S]*["']?$/.test(rawInput.trim());
  if (quotedQuestion) {
    return soleNpc;
  }

  const directPronounPatterns = [
    /\bask (her|him|them)\b/,
    /\btell (her|him|them)\b/,
    /\btalk to (her|him|them)\b/,
    /\bspeak to (her|him|them)\b/,
    /\bwhat do you\b/,
    /\bwhat are you\b/,
    /\bwhat did you\b/,
    /\bwhy do you\b/,
    /\bwhy are you\b/,
    /\bhow do you\b/,
    /\bwhere do you\b/,
    /\bwhere are you\b/,
    /\bwhen do you\b/,
    /\bwhen did you\b/,
    /\bwhen were you\b/,
    /\bwhen was\b.*\b(we|you)\b/,
    /\bwho are you\b/,
    /\bwho did you\b/,
    /\bwhich do you\b/,
    /\bare you\b/,
    /\bis your\b/,
    /\bdo you\b/,
    /\bdid you\b/,
    /\bcan you\b/,
    /\bwill you\b/,
    /\byour\b/,
  ];
  return directPronounPatterns.some((pattern) => pattern.test(normalizedInput)) ? soleNpc : undefined;
}

function isQuestionLike(normalizedInput: string) {
  return (
    normalizedInput.includes("?") ||
    /\b(ask|question|what|why|how|where|when|who|which|do you|did you|can you|will you|are you|is there|tell me)\b/.test(
      normalizedInput,
    )
  );
}

function isTrivialPhysicalAction(normalizedInput: string) {
  return /^(i )?(jump|smile|nod|shrug|wave|laugh|clap|look around|glance around|stretch|sit|stand)\.?$/.test(
    normalizedInput,
  );
}

function wordAppears(normalizedInput: string, normalizedWord: string) {
  if (!normalizedWord) {
    return false;
  }
  return new RegExp(`\\b${escapeRegExp(normalizedWord)}\\b`).test(normalizedInput);
}

function normalizeForMatching(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
