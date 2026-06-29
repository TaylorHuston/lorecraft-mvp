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

export const RECENT_FEED_LIMIT = 12;
export const IMMEDIATE_CONTEXT_LIMIT = 6;

const MUTABLE_NPC_FACT_KEYS = new Set<string>(NPC_FACT_KEYS);

const DIRECTOR_INSTRUCTIONS = [
  "You are Lorecraft's Director for a narrative-first persistent-world MVP.",
  "Your job is to write an unfolding story scene, not to passively summarize state.",
  "The current playerInput is the only new action for this turn. Recent feed is context only; do not answer or continue a previous feed entry unless the current playerInput asks for it.",
  "When the player directly engages a present NPC, that NPC should make a concrete choice: answer, refuse, deflect, warn, lie, ask back, act, or make intentionally meaningful silence visible.",
  "When the required scene beat says a meaningful NPC response is expected, include that response in the narration. Facial expressions or posture alone are not enough for a directly asked question.",
  "For a direct NPC question, never end with setup such as 'she pauses before speaking' without including what she says or clearly chooses. Valid direct-question responses include lines like: Mira says, 'I know enough to be afraid,' or Mira deliberately says nothing and turns away.",
  "When the required scene beat does not expect an NPC response, do not force dialogue. For trivial physical actions, usually narrate the immediate beat and return npcUpdates as an empty array.",
  "NPC dialogue is allowed inside narration as quoted or clearly attributed speech.",
  "Avoid merely saying an NPC is watchful, thoughtful, hesitant, or unchanged unless that silence itself matters in the scene.",
  "Respond only with strict JSON. Do not wrap the JSON in Markdown.",
  'The JSON object must include a non-empty string field named "narration".',
  'It may include "npcUpdates", an array of updates for current-scene NPCs only. Use an empty array when no NPC state changes.',
  'Return exactly this top-level shape: {"narration":"player-facing narration","npcUpdates":[]}.',
  'Never include playerInput, promptComponents, sourceOwnership, sceneState, visibleFacts, hiddenNpcKnowledge, recentFeed, requiredSceneBeat, or outputShape in your response.',
  'Each NPC update must use actorKey, reason, and changes. Only mood, status, and memory may appear inside changes.',
  "The memory field is a compact rolling summary and must be 500 characters or less.",
  "The status field is stable ongoing circumstance, not moment-to-moment physical action.",
  "Do not put emotions or attitudes such as concerned, watchful, angry, or relieved in status; use mood only when that attitude is durable enough to persist.",
  "Do not update status just because an immediate beat happened, such as being pushed, stumbling, flinching, glancing, or briefly moving; narrate those beats instead.",
  "Only update status when the condition remains important after the moment resolves and should still matter after recent feed context falls away.",
  "Use hidden NPC knowledge as private guidance for what NPCs know, hide, imply, or refuse to say. Do not mechanically expose fact keys or tell the player hidden information without an in-scene reason.",
  "Rooms, exits, actor location, inventory, combat, HP, and rules are out of scope. Narrate movement attempts without changing location state.",
];

const SYSTEM_PROMPT = DIRECTOR_INSTRUCTIONS.join("\n");

const TRANSCRIPT_DIRECTOR_INSTRUCTIONS = [
  "You are Lorecraft's Director for a transcript-only story playtest.",
  "Write active, player-facing story prose that continues from the actual transcript.",
  "The prompt is ordered by priority: worldSeed sets the premise, transcript provides older continuity, immediateContext shows the current exchange, lastAction is the player action to resolve now, and sceneDirective is near-output guidance.",
  "The world seed is only the opening premise. After play begins, the transcript is the source of story continuity.",
  "The immediateContext field is the high-priority recent transcript. Use it before older transcript entries when deciding what is happening now.",
  "The lastAction field is the only new action for this turn and has priority over prior Director prose when the player clearly changes course.",
  "Treat lastAction as player intent for the Director to resolve, not as already-canonical story prose.",
  "Do not copy lastAction verbatim as the next story paragraph unless it is quoted player dialogue.",
  "Respond directly to lastAction before advancing the scene. Do not silently ignore it or continue a previous beat as if the input did not happen.",
  "If lastAction is dialogue, a request, an answer, an order, or a question directed at a nearby established character from immediateContext, include that character's answer, refusal, action, or intentional silence in this same response.",
  "Do not merely restate that the player said the line. Resolve the exchange unless transcript continuity makes that impossible.",
  "Do not repeat prior setup unless one brief sentence is needed to orient the reader.",
  "If the transcript says the player traveled, time passed, or the scene changed, continue from that transcript continuity.",
  "If lastAction conflicts with transcript continuity, resolve the conflict in the narration from the transcript's point of view. For example, if the player addresses Mira after leaving her days behind, narrate the attempted address, memory, or impossible call; do not make Mira answer unless the transcript establishes she is present.",
  "Do not snap the story back to the opening scene unless the transcript supports returning there.",
  "Respond with plain prose only.",
  "Do not return JSON, Markdown, headings, bullets, schemas, npcUpdates, state diffs, events, or machine-readable mutation proposals.",
  "When the player directly engages a character established by the seed or transcript, that character should make a concrete choice: answer, refuse, deflect, warn, lie, ask back, act, or make intentionally meaningful silence visible.",
  "NPC dialogue is allowed as quoted or clearly attributed speech.",
  "No canonical runtime world state is provided in this mode. Do not infer hidden backend state beyond the seed and transcript.",
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

  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ promptComponents: prompt.components }, null, 2) },
    ],
    requestSummary: {
      directorMode: "persistent",
      outputContract: "json_npc_updates",
      worldName: context.world.name,
      roomKey: context.room.key,
      playerInputLength: playerInput.length,
      recentFeedCount: prompt.recentFeed.length,
      actorKeys: context.actors.map((actor) => actor.key),
      npcFactKeys: NPC_FACT_KEYS.filter((key) =>
        context.actors.some((actor) => actor.facts.some((fact) => fact.key === key)),
      ),
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
      promptComponentKeys: Object.keys(prompt.components),
      ...(prompt.promptGuidanceKeys.length > 0 ? { promptGuidanceKeys: prompt.promptGuidanceKeys } : {}),
      ...(options.generationSettings ? { generationSettings: options.generationSettings } : {}),
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
    sourceOwnership: {
      editableConfiguration: [
        "directorInstructions",
        "authorToneGuidance",
        "promptGuidance",
        "providerGenerationSettings",
      ],
      seedOnly: ["worldSeed"],
      transcriptContinuity: ["transcript"],
      highPriorityContinuity: ["immediateContext"],
      latestPlayerAction: ["lastAction"],
      nearOutputGuidance: ["sceneDirective"],
      noRuntimeWorldState: true,
    },
    directorInstructions: "See system message. Respond with plain prose only.",
    authorToneGuidance:
      "Write grounded, active, player-facing prose. Use immediateContext to determine the current exchange, nearby characters, and unresolved prompts before consulting older transcript.",
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

  return {
    messages: [
      { role: "system", content: TRANSCRIPT_DIRECTOR_INSTRUCTIONS },
      { role: "user", content: JSON.stringify({ promptComponents: components }, null, 2) },
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
      promptComponentKeys: Object.keys(components),
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
    "Resolve lastAction in the immediate scene established by immediateContext.",
    "Player input is intent for the Director to resolve, not already-canonical story prose.",
    "Do not copy lastAction verbatim as the next story paragraph unless it is quoted dialogue.",
    "Keep the response concise and avoid replaying earlier setup.",
    "Do not decide new player actions, thoughts, feelings, or dialogue beyond the submitted input.",
  ];

  if (inferredMode === "speech" || inferredMode === "speech_or_address") {
    base.push(
      "Treat lastAction as something the player says or addresses to the most plausible nearby character from immediateContext.",
      "If a nearby character has been directly engaged, include that character's response, refusal, action, or meaningful silence now.",
    );
  }

  if (inferredMode === "action") {
    base.push("Treat lastAction as the player's attempted action and narrate the immediate consequence.");
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
  const requiredSceneBeat = options.requiredSceneBeat ?? deriveRequiredSceneBeat(context, playerInput);
  const promptGuidance = normalizePromptGuidance(options.promptGuidance);
  const currentSceneActors = context.actors.map((actor) => ({
    key: actor.key,
    name: actor.name,
    role: actor.role,
    description: actor.description,
    mutableFacts: actor.facts.filter((fact) => MUTABLE_NPC_FACT_KEYS.has(fact.key)),
  }));
  const hiddenNpcKnowledge = context.actors
    .filter((actor) => actor.role === "npc")
    .map((actor) => ({
      key: actor.key,
      name: actor.name,
      readOnlyFacts: actor.facts.filter((fact) => !MUTABLE_NPC_FACT_KEYS.has(fact.key)),
    }))
    .filter((actor) => actor.readOnlyFacts.length > 0);
  const components = {
    currentTurn: {
      playerInput,
      requiredSceneBeat,
    },
    sourceOwnership: {
      editableConfiguration: [
        "directorInstructions",
        "authorToneGuidance",
        "promptGuidance",
        "providerGenerationSettings",
      ],
      derivedFromWorldState: ["sceneState", "visibleFacts", "hiddenNpcKnowledge", "recentFeed"],
      derivedFromPlayerInput: ["currentTurn.playerInput", "currentTurn.requiredSceneBeat"],
    },
    directorInstructions: "See system message.",
    authorToneGuidance:
      "Write grounded, active, player-facing prose. Let present NPCs speak or act when the player engages them, but keep durable state changes conservative.",
    promptGuidance,
    sceneState: {
      world: {
        name: context.world.name,
        description: context.world.description,
      },
      room: {
        key: context.room.key,
        name: context.room.name,
        description: context.room.description,
      },
    },
    visibleFacts: {
      visibleExits: context.exits,
      visibleObjects: context.objects,
      currentSceneActors,
    },
    hiddenNpcKnowledge,
    recentFeed: recentFeed.map((entry) => ({
      kind: entry.kind,
      text: entry.text,
      source: entry.source,
    })),
  };

  return {
    components,
    recentFeed,
    requiredSceneBeat,
    promptGuidanceKeys: Object.keys(promptGuidance),
    readOnlyKnowledgeKeys: hiddenNpcKnowledge.flatMap((actor) =>
      actor.readOnlyFacts.map((fact) => `${actor.key}.${fact.key}`),
    ),
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
  context: Pick<DirectorContext, "actors">,
  playerInput: string,
): RequiredSceneBeat {
  const normalizedInput = normalizeForMatching(playerInput);
  const presentNpcs = context.actors.filter((actor) => actor.role === "npc");
  const target = findDirectNpcTarget(presentNpcs, normalizedInput);
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
    return {
      kind: "direct_npc_address",
      targetActorKey: target.key,
      targetActorName: target.name,
      expectsNpcResponse: false,
      allowsNpcUpdates: true,
      instruction: `${target.name} is directly engaged. Let ${target.name} make an observable choice when it matters, but do not force a spoken line if the action does not call for one.`,
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
      instruction:
        "The player performs a trivial physical action. Narrate the immediate beat and observable reactions, but return npcUpdates as an empty array.",
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

function findDirectNpcTarget(npcs: DirectorActor[], normalizedInput: string) {
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
