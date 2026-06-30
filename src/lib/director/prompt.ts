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
  playerInput: string,
  options: {
    generationSettings?: DirectorGenerationSettingsSummary;
    promptGuidance?: DirectorPromptGuidance;
    requiredSceneBeat?: RequiredSceneBeat;
    sceneBeatSource?: SceneBeatSource;
    sceneBeatReason?: string;
  } = {},
): DirectorRequest {
  const prompt = buildPromptComponents(context, playerInput, {
      promptGuidance: options.promptGuidance,
      requiredSceneBeat: options.requiredSceneBeat,
    });
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
      outputContract: "plain_prose",
      worldName: context.world.name,
      roomKey: context.room.key,
      playerInputLength: playerInput.length,
      recentFeedCount: prompt.recentFeed.length,
      actorKeys: context.actors.map((actor) => actor.key),
      npcFactKeys: NPC_FACT_KEYS.filter((key) =>
        context.actors.some((actor) => actor.facts.some((fact) => fact.key === key)),
      ),
      npcProfileKeys: prompt.npcProfiles.map((profile) => profile.key),
      ...(prompt.npcOverrideKeys.length > 0 ? { npcOverrideKeys: prompt.npcOverrideKeys } : {}),
      npcMutationMode: "read_only",
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

export function buildTranscriptDirectorRequest(
  context: TranscriptDirectorContext,
  playerInput: string,
  options: {
    generationSettings?: DirectorGenerationSettingsSummary;
    promptGuidance?: DirectorPromptGuidance;
  } = {},
): DirectorRequest {
  const transcript = sanitizeTranscript(context.transcript).slice(-RECENT_FEED_LIMIT);
  const immediateContext = transcript.slice(-IMMEDIATE_CONTEXT_LIMIT);
  const promptGuidance = normalizePromptGuidance(options.promptGuidance);
  const lastAction = {
    rawInput: playerInput,
    inferredMode: inferPlayerInputMode(playerInput),
    directive:
      "Resolve this player input now before advancing the scene. Treat it as intent, not already-canonical prose.",
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
      outputContract: "plain_prose",
      worldName: context.world.name,
      roomKey: "transcript",
      playerInputLength: playerInput.length,
      recentFeedCount: transcript.length,
      actorKeys: [],
      npcFactKeys: [],
      readOnlyKnowledgeKeys: [],
      requiredSceneBeat: {
        kind: "player_action",
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

function buildTranscriptSceneDirective(inferredMode: ReturnType<typeof inferPlayerInputMode>) {
  const base = [
    "Resolve Current Input in the scene established by Recent Story.",
    "Player input is intent for the Game Master to resolve, not already-canonical story prose.",
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
  playerInput: string,
  options: {
    promptGuidance?: DirectorPromptGuidance;
    requiredSceneBeat?: RequiredSceneBeat;
  },
) {
  const recentFeed = context.recentFeed.slice(-RECENT_FEED_LIMIT);
  const requiredSceneBeat = toReadOnlySceneBeat(
    options.requiredSceneBeat ?? deriveRequiredSceneBeat(context, playerInput),
  );
  const promptGuidance = normalizePromptGuidance(options.promptGuidance);
  const lastAction = {
    rawInput: playerInput,
    inferredMode: inferPlayerInputMode(playerInput),
    directive:
      "Resolve this player input now before advancing the scene. Treat it as intent, not already-canonical prose.",
  };
  const npcProfiles = context.npcProfiles ?? buildNpcProfiles(context.actors);
  const npcCards = npcProfiles.map(toNpcCard);
  const conversationFocus = buildConversationFocus(context.actors, recentFeed, requiredSceneBeat);
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
    npcCards,
    conversationFocus,
    recentFeed: recentFeed.map((entry) => ({
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
    recentFeed,
    requiredSceneBeat,
    promptGuidanceKeys: Object.keys(promptGuidance),
    npcProfiles,
    npcOverrideKeys: npcProfiles.flatMap((profile) =>
      profile.overriddenFields.map((field) => `${profile.key}.${field.replace(/^facts\./, "")}`),
    ),
    readOnlyKnowledgeKeys,
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
    "Write one complete short story beat, usually 1-3 paragraphs.",
    "Resolve Current Input before advancing; do not merely restate it.",
    "Stop after resolving the current input; do not continue into the player's next action.",
    "Treat NPC Cards as canonical story memory, including descriptions, personality, voice, current status, memory, and private knowledge.",
    "Keep fleeting gestures and reactions in narration. NPC state is read-only for this turn.",
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
  npcCards: PromptNpcCard[];
  recentFeed: PromptFeedEntry[];
  lastAction: { rawInput: string };
}) {
  return buildSectionedPrompt([
    ["AI Instructions", bulletList(components.aiInstructions)],
    ["World", formatPersistentScene(components.scene)],
    ["NPC Cards", formatNpcCards(components.npcCards)],
    ["Recent Story", formatRecentStory(components.recentFeed)],
    ["Current Input", `> ${components.lastAction.rawInput}`],
    ["Output", "Return player-facing story prose only."],
  ]);
}

function persistentPromptSectionKeys() {
  return ["aiInstructions", "world", "npcCards", "recentStory", "currentInput", "output"];
}

function buildTranscriptUserPrompt(components: {
  promptGuidance: DirectorPromptGuidance;
  worldSeed: {
    name: string;
    description: string;
    initialSeed: string;
  };
  transcript: PromptFeedEntry[];
  lastAction: { rawInput: string };
  sceneDirective: string;
}) {
  const instructions = [
    "Continue and advance the story like it never ended.",
    "Use present tense, second person, concrete sensory detail, and lifelike dialogue.",
    "Resolve Current Input before advancing; do not merely restate it.",
    "Use Recent Story as live continuity. The World Seed is only the opening premise.",
    components.sceneDirective,
    ...promptGuidanceLines(components.promptGuidance),
  ];

  return buildSectionedPrompt([
    ["AI Instructions", bulletList(instructions)],
    ["World Seed", formatWorldSeed(components.worldSeed)],
    ["Recent Story", formatRecentStory(components.transcript)],
    ["Current Input", `> ${components.lastAction.rawInput}`],
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

function formatNpcCards(npcCards: PromptNpcCard[]) {
  if (npcCards.length === 0) {
    return "No present NPC cards.";
  }

  return npcCards.map((npcCard) => npcCard.card).join("\n\n");
}

function formatRecentStory(feed: PromptFeedEntry[]) {
  if (feed.length === 0) {
    return "None yet.";
  }

  return feed.map(formatRecentStoryEntry).join("\n");
}

function formatRecentStoryEntry(entry: PromptFeedEntry) {
  if (entry.kind === "player") {
    return `> ${entry.text}`;
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

function toReadOnlySceneBeat(sceneBeat: RequiredSceneBeat): RequiredSceneBeat {
  return {
    ...sceneBeat,
    allowsNpcUpdates: false,
    instruction: `${sceneBeat.instruction} NPC profiles and facts are read-only in this mode; keep changes in narration. Durable mutation extraction is a separate future step.`,
  };
}

function buildPersistentSceneDirective(
  sceneBeat: RequiredSceneBeat,
  inferredMode: ReturnType<typeof inferPlayerInputMode>,
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
    task: "Resolve currentTurn.playerInput now before advancing the scene.",
    lastActionMode: inferredMode,
    targetActorKey: sceneBeat.targetActorKey,
    targetActorName: sceneBeat.targetActorName,
    mustUse,
    conflictPolicy:
      "currentTurn and sceneDirective override recentFeed. npcCards, npcProfiles, and visibleFacts are canonical current scene truth; when they conflict with recentFeed, use the canonical card/profile/fact context.",
    responseRequirement: sceneBeat.expectsNpcResponse
      ? "The target NPC must answer, refuse, deflect, warn, lie, ask back, act, or intentionally stay silent in this response. Do not stop after setup or repeat the player's question without resolution."
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
