import { describe, expect, it } from "vitest";
import { buildDirectorDebugLogRecord, writeDirectorDebugLog } from "./debug-log";
import { readDirectorMode } from "./mode";
import { validateNarrativeInput } from "./input";
import {
  buildDirectorRequest,
  buildNpcStateExtractionRequest,
  buildTranscriptDirectorRequest,
  deriveRequiredSceneBeat,
} from "./prompt";
import { rawDirectorRequestForStorage, shouldStoreRawDirectorRequest } from "./raw-request";
import {
  applyNarrationSupportBoundary,
  applySceneBeatPersistenceBoundary,
  parseDirectorOutput,
  parseNpcStateExtractionOutput,
  parsePlainProseDirectorOutput,
  parseStateExtractionOutput,
  validateActorMoves,
  validateNpcUpdates,
} from "./output";
import { readLlmConfig, requestOpenAICompatibleChat } from "./provider";
import { normalizeWorldLoadError } from "./turn-errors";
import type { DirectorActor, DirectorContext, TranscriptDirectorContext } from "./types";

const mira: DirectorActor = {
  key: "mira",
  name: "Mira",
  role: "npc",
  description:
    "A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.",
  facts: [
    {
      key: "background",
      value:
        "Mira grew up around Stormbound Chapel and learned its routines from older caretakers.",
      source: "seed",
    },
    {
      key: "persona",
      value: "Cautious, observant, and slow to trust.",
      source: "seed",
    },
    {
      key: "voice",
      value: "Plain-spoken and restrained, with short practical warnings.",
      source: "seed",
    },
    { key: "mood", value: "watchful", source: "seed" },
    {
      key: "status",
      value: "standing near the chapel aisle, tense from the storm",
      source: "seed",
    },
    {
      key: "memory",
      value: "Mira has not yet formed meaningful memories of Taylor.",
      source: "seed",
    },
    {
      key: "knowledge",
      value:
        "Mira knows the storm began after the chapel bell rang at midnight, but she is afraid to say that plainly.",
      source: "seed",
    },
  ],
};

const brotherAlden: DirectorActor = {
  key: "brother-alden",
  name: "Brother Alden",
  role: "npc",
  description:
    "A small, middle-aged priest in a patched black cassock, with ink-stained fingers and a careful stoop.",
  facts: [
    {
      key: "background",
      value: "Brother Alden has tended Stormbound Chapel for years.",
      source: "seed",
    },
    {
      key: "persona",
      value: "Gentle, nervous, and dutiful.",
      source: "seed",
    },
    {
      key: "voice",
      value: "Soft and formal, with small apologies and careful religious phrasing.",
      source: "seed",
    },
    { key: "mood", value: "uneasy", source: "seed" },
    {
      key: "status",
      value: "standing near the altar with a damp ledger tucked under one arm",
      source: "seed",
    },
    {
      key: "memory",
      value: "Brother Alden has not yet formed meaningful memories of Taylor.",
      source: "seed",
    },
    {
      key: "knowledge",
      value:
        "Alden found a torn bell-rope fiber near the altar after midnight, but he has not told Mira.",
      source: "seed",
    },
  ],
};

const context: DirectorContext = {
  adventure: {
    id: "adventure-id",
    name: "Stormbound Chapel",
    worldId: "world-id",
    worldVersionId: "world-version-id",
  },
  world: {
    id: "world-id",
    name: "Stormbound Chapel",
    description: "A chapel in a storm.",
  },
  sourceWorldVersion: {
    id: "world-version-id",
    versionNumber: 1,
    name: "Stormbound Chapel",
  },
  player: {
    id: "player-id",
    key: "taylor",
    name: "Taylor",
    description: "A rain-soaked traveler in a dark coat.",
    locationKey: "chapel",
    locationName: "Chapel",
    profile: {
      physicalDescription: "A rain-soaked traveler in a dark coat.",
      backstory: "Taylor came to Stormbound Chapel to investigate the midnight bell.",
      status: "standing near the chapel aisle",
    },
  },
  room: {
    id: "room-id",
    key: "chapel",
    name: "Chapel",
    description: "Rain taps against warped shutters.",
  },
  exits: [{ label: "north", toRoomName: "Graveyard" }],
  actors: [
    {
      key: "taylor",
      name: "Taylor",
      role: "player",
      description: "The playtester.",
      facts: [],
    },
    mira,
  ],
  objects: [{ key: "lantern", name: "Lantern", description: "A cracked lantern." }],
  locationCard: {
    id: "room-id",
    key: "chapel",
    name: "Chapel",
    description: "Rain taps against warped shutters.",
    facts: [{ key: "sanctity", value: "fading", source: "seed" }],
    visibleObjects: [{ key: "lantern", name: "Lantern", description: "A cracked lantern." }],
    visibleExits: [{ label: "north", toLocationKey: "graveyard", toLocationName: "Graveyard" }],
    presentActors: [
      { key: "taylor", name: "Taylor", role: "player" },
      { key: "mira", name: "Mira", role: "npc" },
    ],
  },
  knownLocations: [
    {
      id: "room-id",
      key: "chapel",
      name: "Chapel",
      description: "Rain taps against warped shutters.",
    },
    {
      id: "vestry-id",
      key: "vestry",
      name: "Vestry",
      description: "The vestry smells of old paper and damp wool.",
    },
    {
      id: "graveyard-id",
      key: "graveyard",
      name: "Graveyard",
      description: "Tilted stones vanish into the rain.",
    },
  ],
  recentFeed: Array.from({ length: 15 }, (_, index) => ({
    id: `entry-${index}`,
    kind: index % 3 === 0 ? ("player" as const) : index % 3 === 1 ? ("event" as const) : ("director" as const),
    text: `feed entry ${index}`,
    source: index % 3 === 0 ? "player" : index % 3 === 1 ? "llm" : "llm",
    createdAt: index,
    turnId: `turn-${index}`,
    commandId: `command-${index}`,
  })),
  storyVisibleHistory: Array.from({ length: 15 }, (_, index) => ({
    id: `story-entry-${index}`,
    kind: "director" as const,
    text: `accepted narration ${index}`,
    source: "llm",
    createdAt: index,
    turnId: `turn-${index}`,
    ...(index % 2 === 0 ? { commandId: `command-${index}` } : {}),
  })),
};

const transcriptContext: TranscriptDirectorContext = {
  adventure: {
    id: "adventure-id",
    name: "Stormbound Chapel",
    worldId: "world-id",
    worldVersionId: "world-version-id",
  },
  world: {
    id: "world-id",
    name: "Stormbound Chapel",
    description: "A chapel in a storm.",
  },
  sourceWorldVersion: {
    id: "world-version-id",
    versionNumber: 1,
    name: "Stormbound Chapel",
  },
  initialSeed:
    "Stormbound Chapel: A chapel in a storm.\nOpening scene: Rain taps against warped shutters. Mira waits near the aisle.",
  transcript: [
    {
      id: "command-1",
      kind: "player",
      text: "I leave the chapel and walk for days.",
      source: "player",
      createdAt: 1,
    },
    {
      id: "narration-1",
      kind: "director",
      text: "You leave the chapel behind. Days later, the road opens into a gray valley.",
      source: "llm",
      createdAt: 2,
    },
  ],
};

const transcriptWithInvalidTurn: TranscriptDirectorContext = {
  ...transcriptContext,
  transcript: [
    ...transcriptContext.transcript,
    {
      id: "command-bad",
      kind: "player",
      text: "√",
      source: "player",
      createdAt: 3,
      turnId: "turn-bad",
      commandId: "command-bad",
    },
    {
      id: "narration-bad",
      kind: "director",
      text: "You walk into a deserted inn because the symbol was treated as a turn.",
      source: "llm",
      createdAt: 4,
      turnId: "turn-bad",
      commandId: "command-bad",
    },
    {
      id: "command-2",
      kind: "player",
      text: "You sit at the bar.",
      source: "player",
      createdAt: 5,
      turnId: "turn-2",
      commandId: "command-2",
    },
    {
      id: "narration-2",
      kind: "director",
      text: "The bartender leans close and asks what you want.",
      source: "llm",
      createdAt: 6,
      turnId: "turn-2",
      commandId: "command-2",
    },
  ],
};

describe("Director request construction", () => {
  it("builds a bounded plain-prose story request from compact prompt sections", () => {
    const request = buildDirectorRequest(context, "I ask Mira about the storm.", {
      generationSettings: {
        temperature: 0.4,
        maxTokens: 700,
        topP: 0.9,
        responseFormat: "json_object",
      },
      promptGuidance: {
        style: "  Write like a tense chapel scene.  ",
        npcBehavior: "Mira should answer direct questions with a concrete choice.",
        persistence: "Keep passing reactions out of durable facts.",
      },
    });
    const systemMessage = request.messages.find((message) => message.role === "system");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.messages).toHaveLength(2);
    expect(request.requestSummary).toMatchObject({
      directorMode: "persistent",
      callRole: "story_generation",
      outputContract: "plain_prose",
      worldName: "Stormbound Chapel",
      roomKey: "chapel",
      recentFeedCount: 12,
      actorKeys: ["taylor", "mira"],
      npcFactKeys: ["mood", "status", "memory"],
      npcProfileKeys: ["mira"],
      locationKeys: ["chapel", "vestry", "graveyard"],
      movementMode: "bounded_existing_locations",
      readOnlyKnowledgeKeys: ["mira.knowledge"],
      requiredSceneBeat: {
        kind: "direct_npc_question",
        targetActorKey: "mira",
        expectsNpcResponse: true,
        allowsNpcUpdates: true,
      },
      npcMutationMode: "bounded_updates",
      generationSettings: {
        temperature: 0.4,
        maxTokens: 700,
        topP: 0.9,
        responseFormat: "text",
      },
      promptGuidanceKeys: ["style", "npcBehavior", "persistence"],
    });
    expect(request.requestSummary.promptComponentKeys).toEqual([
      "aiInstructions",
      "world",
      "playerCard",
      "locationCard",
      "knownLocations",
      "npcCards",
      "recentStory",
      "currentInput",
      "output",
    ]);
    expect(userMessage?.content).toContain("AI Instructions:");
    expect(userMessage?.content).toContain("World:");
    expect(userMessage?.content).toContain("Player Card:");
    expect(userMessage?.content).toContain("PLAYER CARD: Taylor (taylor)");
    expect(userMessage?.content).toContain("Current location: Chapel (chapel)");
    expect(userMessage?.content).toContain("Physical description: A rain-soaked traveler in a dark coat.");
    expect(userMessage?.content).toContain(
      "Backstory: Taylor came to Stormbound Chapel to investigate the midnight bell.",
    );
    expect(userMessage?.content).toContain("Current status: standing near the chapel aisle");
    expect(userMessage?.content).toContain(
      "Agency boundary: use this card for continuity, perception, and consequences",
    );
    expect(userMessage?.content).toContain("Location Card:");
    expect(userMessage?.content).toContain("LOCATION CARD: Chapel (chapel)");
    expect(userMessage?.content).toContain("Facts: sanctity=fading (seed)");
    expect(userMessage?.content).toContain("Present actors: Taylor (taylor, player); Mira (mira, npc)");
    expect(userMessage?.content).toContain("Known Locations:");
    expect(userMessage?.content).toContain("- Vestry (vestry): The vestry smells of old paper and damp wool.");
    expect(userMessage?.content).toContain("NPC Cards:");
    expect(userMessage?.content).toContain("Recent Story:");
    expect(userMessage?.content).toContain("Current Input:");
    expect(userMessage?.content).toContain("Output:");
    expect(userMessage?.content).toContain("> I ask Mira about the storm.");
    expect(userMessage?.content).toContain("Style guidance: Write like a tense chapel scene.");
    expect(userMessage?.content).toContain(
      "NPC behavior guidance: Mira should answer direct questions with a concrete choice.",
    );
    expect(userMessage?.content).toContain(
      "Persistence guidance: Keep passing reactions out of durable facts.",
    );
    expect(userMessage?.content).toContain("Mira is being directly engaged");
    expect(userMessage?.content).toContain("NPC CARD: Mira (mira)");
    expect(userMessage?.content).toContain(
      "Description: A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.",
    );
    expect(userMessage?.content).toContain(
      "Private knowledge: Mira knows the storm began after the chapel bell rang at midnight",
    );
    expect(userMessage?.content).toContain("accepted narration 14");
    expect(userMessage?.content).not.toContain("accepted narration 0");
    expect(userMessage?.content).not.toContain("feed entry");
    expect(userMessage?.content).not.toContain("turn-14");
    expect(userMessage?.content).not.toContain("command-14");
    expect(userMessage?.content).not.toContain("outputShape");
    expect(userMessage?.content).not.toContain("promptComponents");
    expect(userMessage?.content).not.toContain("sourceOwnership");
    expect(userMessage?.content).not.toContain("npcProfiles");
    expect(userMessage?.content).not.toContain("hiddenNpcKnowledge");
    expect(userMessage?.content).not.toContain("mutableFacts");
    expect(userMessage?.content).not.toContain("npcUpdates");
    expect(userMessage?.content).not.toContain("Return JSON");
    expect(userMessage?.content).not.toContain("read-only for this turn");
    expect(userMessage?.content.length).toBeLessThan(5500);
    expect(systemMessage?.content).toContain("Continue the scene in present tense");
    expect(systemMessage?.content).toContain("The Player Card is canonical protagonist context");
    expect(systemMessage?.content).toContain("NPC cards are canonical");
    expect(systemMessage?.content).toContain("Return only player-facing story prose");
    expect(systemMessage?.content).not.toContain("strict JSON");
  });

  it("builds a JSON-only NPC state extraction request from the completed story beat", () => {
    const storyRequest = buildDirectorRequest(context, "I ask Mira about the storm.", {
      generationSettings: {
        temperature: 0.4,
        maxTokens: 100,
        responseFormat: "text",
      },
    });
    const request = buildNpcStateExtractionRequest(
      context,
      "I ask Mira about the storm.",
      "Mira's hand tightens around the pew. \"The bell rang at midnight,\" she says.",
      {
        generationSettings: {
          temperature: 0.2,
          maxTokens: 100,
          responseFormat: "text",
        },
        requiredSceneBeat: {
          ...storyRequest.requestSummary.requiredSceneBeat,
          instruction: "",
        },
      },
    );
    const systemMessage = request.messages.find((message) => message.role === "system");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      directorMode: "persistent",
      callRole: "npc_state_extraction",
      outputContract: "json_npc_updates",
      worldName: "Stormbound Chapel",
      roomKey: "chapel",
      recentFeedCount: 12,
      actorKeys: ["taylor", "mira"],
      npcFactKeys: ["mood", "status", "memory"],
      npcProfileKeys: ["mira"],
      readOnlyKnowledgeKeys: ["mira.knowledge"],
      requiredSceneBeat: {
        kind: "direct_npc_question",
        targetActorKey: "mira",
        expectsNpcResponse: true,
        allowsNpcUpdates: true,
      },
      npcMutationMode: "bounded_updates",
      generationSettings: {
        temperature: 0.2,
        maxTokens: 100,
        responseFormat: "json_object",
      },
    });
    expect(request.requestSummary.promptComponentKeys).toEqual([
      "extractionInstructions",
      "locationCard",
      "knownLocations",
      "npcCards",
      "recentStory",
      "currentInput",
      "gameMasterNarration",
      "output",
    ]);
    expect(systemMessage?.content).toContain("Return only a JSON object");
    expect(userMessage?.content).toContain("Allowed update fields: mood, status, memory");
    expect(userMessage?.content).toContain("Actor movement is separate from NPC facts");
    expect(userMessage?.content).toContain("Known Locations:");
    expect(userMessage?.content).toContain("NPC CARD: Mira (mira)");
    expect(userMessage?.content).toContain("> I ask Mira about the storm.");
    expect(userMessage?.content).toContain("accepted narration 14");
    expect(userMessage?.content).not.toContain("feed entry");
    expect(userMessage?.content).toContain("Mira's hand tightens around the pew");
    expect(userMessage?.content).toContain('{"npcUpdates":[],"actorMoves":[]}');
    expect(userMessage?.content).toContain("Do not update description, background, persona");
    expect(userMessage?.content).toContain(
      "Only update a field when the completed Game Master Narration directly supports that exact durable condition.",
    );
    expect(userMessage?.content).toContain(
      "ledger slipping slightly' does not support 'dropping his ledger",
    );
    expect(userMessage?.content).toContain("should still matter three turns from now");
  });

  it("builds a Pass request without turning Pass into player story prose", () => {
    const request = buildDirectorRequest(context, null, { turnTrigger: "pass" });
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      turnTrigger: "pass",
      playerInputLength: 0,
      requiredSceneBeat: {
        kind: "pass",
        expectsNpcResponse: false,
        allowsNpcUpdates: true,
      },
    });
    expect(userMessage?.content).toContain("Turn trigger: Pass.");
    expect(userMessage?.content).toContain("The player passes.");
    expect(userMessage?.content).toContain("accepted narration 14");
    expect(userMessage?.content).not.toContain("> Pass");
    expect(userMessage?.content).not.toContain("feed entry");
  });

  it("labels player-authored Story inserts as canonical recent story", () => {
    const storyContext: DirectorContext = {
      ...context,
      storyVisibleHistory: [
        ...(context.storyVisibleHistory ?? []).slice(-2),
        {
          id: "story-insert-1",
          kind: "story",
          text: "You have already drawn a chalk circle around the lantern.",
          source: "player",
          createdAt: 16,
        },
      ],
    };

    const request = buildDirectorRequest(storyContext, "I ask Mira to look at the circle.");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(userMessage?.content).toContain(
      "[Player-authored Story] You have already drawn a chalk circle around the lantern.",
    );
    expect(userMessage?.content).toContain(
      "Treat player-authored Story entries in Recent Story as accepted canonical scene content.",
    );
    expect(request.requestSummary.recentFeedCount).toBe(3);
  });

  it("builds a Guide request with hidden current-turn steering", () => {
    const guidance = "Make Mira notice the bell rope without exposing this guidance.";
    const request = buildDirectorRequest(context, null, {
      turnTrigger: "guide",
      guideGuidance: guidance,
      generationSettings: {
        temperature: 0.4,
        responseFormat: "text",
      },
    });
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      turnTrigger: "guide",
      playerInputLength: 0,
      guideGuidanceLength: guidance.length,
      requiredSceneBeat: {
        kind: "guide",
        expectsNpcResponse: false,
        allowsNpcUpdates: true,
      },
    });
    expect(userMessage?.content).toContain("Turn trigger: Guide.");
    expect(userMessage?.content).toContain("[Hidden Guide]");
    expect(userMessage?.content).toContain(guidance);
    expect(userMessage?.content).toContain("current-turn steering only");
    expect(userMessage?.content).not.toContain("Turn trigger: Act.");
  });

  it("omits raw Guide steering from extraction prompts", () => {
    const guidance = "Secretly force a travel update.";
    const request = buildNpcStateExtractionRequest(
      context,
      null,
      "Mira glances toward the vestry but stays beside the pew.",
      {
        turnTrigger: "guide",
        requiredSceneBeat: {
          kind: "guide",
          expectsNpcResponse: false,
          allowsNpcUpdates: true,
          instruction: "",
        },
      },
    );
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      turnTrigger: "guide",
      playerInputLength: 0,
      requiredSceneBeat: {
        kind: "guide",
      },
    });
    expect(request.requestSummary).not.toHaveProperty("guideGuidanceLength");
    expect(userMessage?.content).toContain("Turn trigger: Guide.");
    expect(userMessage?.content).toContain("[Hidden Guide omitted from this request.]");
    expect(userMessage?.content).toContain("durable changes must be justified by the completed Game Master Narration");
    expect(userMessage?.content).not.toContain(guidance);
  });

  it("uses canonical NPC actor and fact values in persistent prompt context without changing transcript mode", () => {
    const canonicalContext: DirectorContext = {
      ...context,
      actors: context.actors.map((actor) =>
        actor.key === "mira"
          ? {
              ...actor,
              description: "A drenched archivist with silver spectacles and a storm-dark cloak.",
              facts: [
                ...actor.facts.map((fact) =>
                  fact.key === "mood" ? { ...fact, value: "deeply suspicious" } : fact,
                ),
                { key: "occupation", value: "chapel archivist", source: "manual" },
              ],
            }
          : actor,
      ),
    };
    const request = buildDirectorRequest(canonicalContext, "I look at Mira.");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      npcProfileKeys: ["mira"],
    });
    expect(userMessage?.content).toContain(
      "Description: A drenched archivist with silver spectacles and a storm-dark cloak.",
    );
    expect(userMessage?.content).toContain("Mood: deeply suspicious");
    expect(userMessage?.content).toContain("occupation: chapel archivist");

    const transcriptRequest = buildTranscriptDirectorRequest(transcriptContext, "I look at Mira.");
    const transcriptUserMessage = transcriptRequest.messages.find((message) => message.role === "user");
    expect(transcriptUserMessage?.content).not.toContain("npcProfiles");
    expect(transcriptUserMessage?.content).not.toContain("Location Card");
    expect(transcriptUserMessage?.content).not.toContain("Known Locations");
    expect(transcriptUserMessage?.content).not.toContain("actorMoves");
    expect(transcriptRequest.requestSummary.npcProfileKeys).toBeUndefined();
    expect(transcriptRequest.requestSummary.locationKeys).toBeUndefined();
    expect(transcriptRequest.requestSummary.movementMode).toBeUndefined();
  });

  it("includes multiple current-scene NPCs as readable cards and targets the addressed NPC", () => {
    const multiNpcContext: DirectorContext = {
      ...context,
      actors: [...context.actors, brotherAlden],
    };

    const request = buildDirectorRequest(multiNpcContext, "I ask Brother Alden about the bell.");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      actorKeys: ["taylor", "mira", "brother-alden"],
      npcProfileKeys: ["mira", "brother-alden"],
      readOnlyKnowledgeKeys: ["mira.knowledge", "brother-alden.knowledge"],
      requiredSceneBeat: {
        kind: "direct_npc_question",
        targetActorKey: "brother-alden",
        expectsNpcResponse: true,
      },
    });
    expect(userMessage?.content).toContain("NPC CARD: Mira (mira)");
    expect(userMessage?.content).toContain("NPC CARD: Brother Alden (brother-alden)");
    expect(userMessage?.content).toContain("Brother Alden is being directly engaged");
    expect(userMessage?.content).not.toContain("hiddenNpcKnowledge");
  });

  it("adds canonical debug-created NPCs to persistent prompt context", () => {
    const ilyra: DirectorActor = {
      key: "debug-npc-1",
      name: "Ilyra",
      role: "npc",
      description: "A temporary scholar with ink-stained sleeves.",
      facts: [
        { key: "persona", value: "Curious and direct.", source: "manual" },
        { key: "voice", value: "Precise, clipped, and impatient.", source: "manual" },
        { key: "status", value: "standing beside the chapel pews", source: "manual" },
      ],
    };
    const request = buildDirectorRequest(
      { ...context, actors: [...context.actors, ilyra] },
      "I ask Ilyra what she noticed.",
    );
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      actorKeys: ["taylor", "mira", "debug-npc-1"],
      npcProfileKeys: ["mira", "debug-npc-1"],
    });
    expect(userMessage?.content).toContain("NPC CARD: Ilyra (debug-npc-1)");
    expect(userMessage?.content).toContain(
      "Description: A temporary scholar with ink-stained sleeves.",
    );
    expect(userMessage?.content).toContain("Personality: Curious and direct.");
    expect(userMessage?.content).toContain("Current status: standing beside the chapel pews");
  });

  it("builds a transcript-only plain-prose request from seed and transcript", () => {
    const request = buildTranscriptDirectorRequest(transcriptContext, "What do I see now?", {
      generationSettings: {
        temperature: 0.7,
        responseFormat: "text",
      },
    });
    const systemMessage = request.messages.find((message) => message.role === "system");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      directorMode: "transcript",
      callRole: "story_generation",
      outputContract: "plain_prose",
      roomKey: "transcript",
      actorKeys: [],
      npcFactKeys: [],
      readOnlyKnowledgeKeys: [],
      requiredSceneBeat: {
        allowsNpcUpdates: false,
      },
      recentFeedCount: 2,
      generationSettings: {
        temperature: 0.7,
        responseFormat: "text",
      },
    });
    expect(request.requestSummary.npcMutationMode).toBeUndefined();
    expect(systemMessage?.content).toContain("Do not return JSON");
    expect(systemMessage?.content).toContain("Recent story is the live continuity");
    expect(systemMessage?.content).toContain("Resolve the current player input first");
    expect(systemMessage?.content).toContain("include that character's answer, refusal, action");
    expect(systemMessage?.content).toContain("plain prose only");
    expect(systemMessage?.content).not.toContain("strict JSON");
    expect(systemMessage?.content).not.toContain("Return exactly this top-level shape");
    expect(request.requestSummary.promptComponentKeys).toEqual([
      "aiInstructions",
      "worldSeed",
      "recentStory",
      "currentInput",
    ]);
    expect(userMessage?.content).toContain("AI Instructions:");
    expect(userMessage?.content).toContain("World Seed:");
    expect(userMessage?.content).toContain("Recent Story:");
    expect(userMessage?.content).toContain("Current Input:");
    expect(userMessage?.content).toContain("> What do I see now?");
    expect(userMessage?.content).toContain("Mira waits near the aisle");
    expect(userMessage?.content).toContain("gray valley");
    expect(userMessage?.content).not.toContain("sceneState");
    expect(userMessage?.content).not.toContain("visibleFacts");
    expect(userMessage?.content).not.toContain("hiddenNpcKnowledge");
    expect(userMessage?.content).not.toContain("requiredSceneBeat");
    expect(userMessage?.content).not.toContain("currentTurn");
    expect(userMessage?.content).not.toContain("immediateContext");
    expect(userMessage?.content).not.toContain("sourceOwnership");
    expect(userMessage?.content).not.toContain("promptComponents");
    expect(userMessage?.content.length).toBeLessThan(2500);
  });

  it("reports transcript prompt guidance only when it is rendered as its own section", () => {
    const request = buildTranscriptDirectorRequest(transcriptContext, "What do I see now?", {
      promptGuidance: {
        style: "Keep the chapel scene spare and tense.",
        npcBehavior: "NPCs should answer direct questions with specific intent.",
      },
    });
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary.promptComponentKeys).toEqual([
      "aiInstructions",
      "promptGuidance",
      "worldSeed",
      "recentStory",
      "currentInput",
    ]);
    expect(request.requestSummary.promptGuidanceKeys).toEqual(["style", "npcBehavior"]);
    expect(userMessage?.content).toContain("Prompt Guidance:");
    expect(userMessage?.content).toContain("Style guidance: Keep the chapel scene spare and tense.");
    expect(userMessage?.content).toContain(
      "NPC behavior guidance: NPCs should answer direct questions with specific intent.",
    );
  });

  it("highlights immediate transcript context and omits invalid historical turns", () => {
    const request = buildTranscriptDirectorRequest(
      transcriptWithInvalidTurn,
      '"Just some ale please"',
    );
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary.recentFeedCount).toBe(4);
    expect(userMessage?.content).toContain('> "Just some ale please"');
    expect(userMessage?.content).toContain(
      "Treat Current Input as something the player says",
    );
    expect(userMessage?.content).toContain(
      "include that character's response",
    );
    expect(userMessage?.content).toContain("I leave the chapel and walk for days.");
    expect(userMessage?.content).toContain(
      "You leave the chapel behind. Days later, the road opens into a gray valley.",
    );
    expect(userMessage?.content).toContain("You sit at the bar.");
    expect(userMessage?.content).toContain("The bartender leans close and asks what you want.");
    expect(userMessage?.content).not.toContain("√");
    expect(userMessage?.content).not.toContain("symbol was treated as a turn");
    expect(userMessage?.content).not.toContain("immediateContext");
    expect(userMessage?.content).not.toContain("promptComponents");
  });

  it("derives a direct NPC question scene beat without forcing dialogue for plain actions", () => {
    expect(deriveRequiredSceneBeat(context, "I ask Mira what she knows about the storm.")).toMatchObject({
      kind: "direct_npc_question",
      targetActorKey: "mira",
      expectsNpcResponse: true,
      allowsNpcUpdates: true,
    });
    expect(deriveRequiredSceneBeat(context, '"When was the last time we saw each other?"')).toMatchObject(
      {
        kind: "direct_npc_question",
        targetActorKey: "mira",
        expectsNpcResponse: true,
        allowsNpcUpdates: true,
      },
    );

    expect(deriveRequiredSceneBeat(context, "I jump.")).toMatchObject({
      kind: "trivial_player_action",
      expectsNpcResponse: false,
      allowsNpcUpdates: false,
    });
  });

  it("uses recent addressed NPC focus for ambiguous follow-up dialogue", () => {
    const garthContext: DirectorContext = {
      ...context,
      actors: [
        ...context.actors,
        {
          key: "debug-npc-1",
          name: "Garth",
          role: "npc",
          description: "A burly bartender with a limp and curled mustache.",
          facts: [
            { key: "persona", value: "Friendly and boisterous.", source: "manual" },
            { key: "voice", value: "Speaks with dramatic flair.", source: "manual" },
            { key: "status", value: "working behind the bar", source: "manual" },
          ],
        },
      ],
      recentFeed: [
        {
          id: "garth-greeting",
          kind: "player" as const,
          text: '"Well met Garth!"',
          source: "player",
          createdAt: 1,
        },
      ],
    };

    expect(deriveRequiredSceneBeat(garthContext, '"How have you been?"')).toMatchObject({
      kind: "direct_npc_question",
      targetActorKey: "debug-npc-1",
      targetActorName: "Garth",
      expectsNpcResponse: true,
    });
    expect(deriveRequiredSceneBeat(garthContext, '"Well met Garth!"')).toMatchObject({
      kind: "direct_npc_address",
      targetActorKey: "debug-npc-1",
      expectsNpcResponse: true,
    });
    expect(deriveRequiredSceneBeat(garthContext, "I look at Garth.")).toMatchObject({
      kind: "direct_npc_address",
      targetActorKey: "debug-npc-1",
      expectsNpcResponse: false,
    });
  });
});

describe("Narrative input validation", () => {
  it("rejects empty and symbol-only narrative inputs before they become turns", () => {
    expect(validateNarrativeInput("")).toEqual({
      ok: false,
      error: "Narrative input is required.",
    });
    expect(validateNarrativeInput("   ")).toEqual({
      ok: false,
      error: "Narrative input is required.",
    });
    expect(validateNarrativeInput("√")).toEqual({
      ok: false,
      error: "Narrative input must include words or numbers.",
    });
    expect(validateNarrativeInput("...")).toEqual({
      ok: false,
      error: "Narrative input must include words or numbers.",
    });
  });

  it("accepts trimmed prose, dialogue, and numeric narrative input", () => {
    expect(validateNarrativeInput('  "Please."  ')).toEqual({
      ok: true,
      input: '"Please."',
    });
    expect(validateNarrativeInput("I wait for 10 minutes.")).toEqual({
      ok: true,
      input: "I wait for 10 minutes.",
    });
  });
});

describe("Director output parsing", () => {
  it("accepts strict JSON with narration and optional NPC updates", () => {
    const result = parseDirectorOutput(
      JSON.stringify({
        narration: "Mira looks toward the shutters before answering.",
        npcUpdates: [
          {
            actorKey: "mira",
            reason: "Taylor directly asked Mira about the storm.",
            changes: { mood: "concerned" },
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.narration).toBe("Mira looks toward the shutters before answering.");
      expect(result.output.npcUpdates).toHaveLength(1);
    }
  });

  it("rejects malformed JSON without inventing narration", () => {
    const result = parseDirectorOutput("Mira answers in prose.");

    expect(result).toEqual({
      ok: false,
      error: "Game Master response was not valid JSON.",
    });
  });

  it("accepts non-empty plain prose without JSON parsing for transcript mode", () => {
    const result = parsePlainProseDirectorOutput("  Mira says, 'Enough to be afraid.'  ");

    expect(result).toEqual({
      ok: true,
      output: {
        narration: "Mira says, 'Enough to be afraid.'",
        npcUpdates: [],
      },
    });
  });

  it("trims an incomplete trailing prose fragment without changing the raw response", () => {
    const result = parsePlainProseDirectorOutput(
      "Mira runs toward the aisle. Brother Alden drops beside the altar. She scram",
    );

    expect(result).toEqual({
      ok: true,
      output: {
        narration: "Mira runs toward the aisle. Brother Alden drops beside the altar.",
        npcUpdates: [],
      },
    });
  });

  it("accepts NPC state extraction JSON without requiring narration", () => {
    const result = parseNpcStateExtractionOutput(
      JSON.stringify({
        npcUpdates: [
          {
            actorKey: "mira",
            reason: "Mira answered Taylor's question with new trust.",
            changes: {
              mood: "guarded but willing to answer",
              memory: "Mira told Taylor the chapel bell rang at midnight.",
            },
          },
        ],
      }),
    );

    expect(result).toEqual({
      ok: true,
      npcUpdates: [
        {
          actorKey: "mira",
          reason: "Mira answered Taylor's question with new trust.",
          changes: {
            mood: "guarded but willing to answer",
            memory: "Mira told Taylor the chapel bell rang at midnight.",
          },
        },
      ],
    });
  });

  it("accepts an empty NPC state extraction result", () => {
    expect(parseNpcStateExtractionOutput('{"npcUpdates":[]}')).toEqual({
      ok: true,
      npcUpdates: [],
    });
  });

  it("accepts state extraction JSON with NPC updates and actor moves", () => {
    expect(
      parseStateExtractionOutput(
        JSON.stringify({
          npcUpdates: [],
          actorMoves: [
            {
              actorKey: "taylor",
              toLocationKey: "vestry",
              reason: "Taylor entered the vestry in the narration.",
            },
          ],
        }),
      ),
    ).toEqual({
      ok: true,
      npcUpdates: [],
      actorMoves: [
        {
          actorKey: "taylor",
          toLocationKey: "vestry",
          reason: "Taylor entered the vestry in the narration.",
        },
      ],
    });
  });

  it("rejects malformed NPC state extraction JSON", () => {
    expect(parseNpcStateExtractionOutput("Mira seems different.")).toEqual({
      ok: false,
      error: "NPC state extractor response was not valid JSON.",
    });
  });

  it("rejects empty plain prose without inventing narration", () => {
    expect(parsePlainProseDirectorOutput("   ")).toEqual({
      ok: false,
      error: "Game Master returned an empty response.",
    });
  });
});

describe("Actor movement validation", () => {
  it("accepts player and present-NPC moves to existing locations after clear travel", () => {
    const validation = validateActorMoves(
      [
        {
          actorKey: "taylor",
          toLocationKey: "vestry",
          reason: "Taylor enters the vestry.",
        },
        {
          actorKey: "mira",
          toLocationKey: "vestry",
          reason: "Mira follows Taylor into the vestry.",
        },
      ],
      context.actors,
      context.knownLocations ?? [],
      "I go to the vestry and ask Mira to follow.",
      "You enter the vestry as Mira follows close behind you.",
    );

    expect(validation.acceptedMoves).toEqual([
      {
        actorKey: "taylor",
        actorName: "Taylor",
        toLocationKey: "vestry",
        toLocationName: "Vestry",
        reason: "Taylor enters the vestry.",
      },
      {
        actorKey: "mira",
        actorName: "Mira",
        toLocationKey: "vestry",
        toLocationName: "Vestry",
        reason: "Mira follows Taylor into the vestry.",
      },
    ]);
    expect(validation.ignoredMoves).toEqual([]);
  });

  it("rejects unknown destinations, offscreen actors, non-travel input, and unconfirmed arrival", () => {
    const noTarget = validateActorMoves(
      [{ actorKey: "taylor", toLocationKey: "bell-tower", reason: "Taylor climbs the bell tower." }],
      context.actors,
      context.knownLocations ?? [],
      "I go to the bell tower.",
      "The chapel offers no obvious route upward.",
    );
    const offscreen = validateActorMoves(
      [{ actorKey: "osric", toLocationKey: "vestry", reason: "Osric enters the vestry." }],
      context.actors,
      context.knownLocations ?? [],
      "I go to the vestry.",
      "You enter the vestry.",
    );
    const noTravel = validateActorMoves(
      [{ actorKey: "taylor", toLocationKey: "vestry", reason: "Taylor enters the vestry." }],
      context.actors,
      context.knownLocations ?? [],
      "I look at the vestry door.",
      "The vestry door is damp and swollen in its frame.",
    );
    const noArrival = validateActorMoves(
      [{ actorKey: "taylor", toLocationKey: "vestry", reason: "Taylor enters the vestry." }],
      context.actors,
      context.knownLocations ?? [],
      "I go to the vestry.",
      "The chapel floor creaks under your first step.",
    );
    const destinationMentionWithoutArrival = validateActorMoves(
      [{ actorKey: "taylor", toLocationKey: "vestry", reason: "Taylor enters the vestry." }],
      context.actors,
      context.knownLocations ?? [],
      "I go to the vestry.",
      "You remain in the chapel, looking toward the vestry door.",
    );

    expect(noTarget.acceptedMoves).toEqual([]);
    expect(noTarget.ignoredMoves).toMatchObject([
      { actorKey: "taylor", toLocationKey: "bell-tower", reason: "Actor move destination is unknown." },
    ]);
    expect(offscreen.ignoredMoves).toMatchObject([
      { actorKey: "osric", toLocationKey: "vestry", reason: "Actor move actor is unknown or not in the current scene." },
    ]);
    expect(noTravel.ignoredMoves).toMatchObject([
      { actorKey: "taylor", toLocationKey: "vestry", reason: "Player input did not clearly attempt travel to this location." },
    ]);
    expect(noArrival.ignoredMoves).toMatchObject([
      { actorKey: "taylor", toLocationKey: "vestry", reason: "Game Master narration did not confirm arrival at this location." },
    ]);
    expect(destinationMentionWithoutArrival.ignoredMoves).toMatchObject([
      { actorKey: "taylor", toLocationKey: "vestry", reason: "Game Master narration did not confirm arrival at this location." },
    ]);
  });

  it("rejects NPC movement when the narration only confirms player travel", () => {
    const validation = validateActorMoves(
      [{ actorKey: "mira", toLocationKey: "vestry", reason: "Mira follows Taylor into the vestry." }],
      context.actors,
      context.knownLocations ?? [],
      "I go to the vestry.",
      "You enter the vestry and the damp smell of old hymnals closes around you.",
    );

    expect(validation.acceptedMoves).toEqual([]);
    expect(validation.ignoredMoves).toMatchObject([
      {
        actorKey: "mira",
        toLocationKey: "vestry",
        reason: "Game Master narration did not explicitly confirm this NPC moved.",
      },
    ]);
  });
});

describe("NPC update validation", () => {
  it("partially accepts valid fields and records ignored fields", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "mira",
          reason: "Taylor reassured Mira.",
          changes: {
            mood: "less guarded",
            hitPoints: 8,
            knowledge: "Mira blurts out the bell secret.",
            status: "standing beside Taylor",
          },
        },
      ],
      context.actors,
    );

    expect(validation.acceptedUpdates).toEqual([
      {
        actorKey: "mira",
        actorName: "Mira",
        reason: "Taylor reassured Mira.",
        changes: [
          { key: "mood", value: "less guarded" },
          { key: "status", value: "standing beside Taylor" },
        ],
      },
    ]);
    expect(validation.ignoredUpdates).toMatchObject([
      {
        actorKey: "mira",
        field: "hitPoints",
        reason: "NPC update field is not allowed.",
      },
      {
        actorKey: "mira",
        field: "knowledge",
        reason: "NPC update field is not allowed.",
      },
    ]);
  });

  it("ignores unknown or offscreen NPC updates", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "osric",
          reason: "The Game Master tried to update someone offscreen.",
          changes: { mood: "curious" },
        },
      ],
      context.actors,
    );

    expect(validation.acceptedUpdates).toEqual([]);
    expect(validation.ignoredUpdates).toEqual([
      {
        actorKey: "osric",
        reason: "NPC update actor is unknown or not in the current scene.",
      },
    ]);
  });

  it("caps durable NPC memory at 500 characters", () => {
    const longMemory = "x".repeat(520);
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "mira",
          reason: "Taylor shared a durable secret.",
          changes: { memory: longMemory },
        },
      ],
      context.actors,
    );

    expect(validation.acceptedUpdates[0]?.changes[0]).toEqual({
      key: "memory",
      value: "x".repeat(500),
    });
    expect(validation.ignoredUpdates).toMatchObject([
      {
        actorKey: "mira",
        field: "memory",
        reason: "NPC memory exceeded 500 characters and was truncated.",
      },
    ]);
  });

  it("suppresses accepted NPC updates when the scene beat disallows durable changes", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "mira",
          reason: "Mira noticed a trivial action.",
          changes: { mood: "concerned" },
        },
      ],
      context.actors,
    );
    const bounded = applySceneBeatPersistenceBoundary(validation, {
      allowsNpcUpdates: false,
    });

    expect(bounded.acceptedUpdates).toEqual([]);
    expect(bounded.ignoredUpdates).toMatchObject([
      {
        actorKey: "mira",
        field: "mood",
        reason: "Required scene beat does not allow durable NPC updates for this action.",
        valuePreview: "concerned",
      },
    ]);
  });

  it("rejects momentary or intensified NPC state updates not supported by narration", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "brother-alden",
          reason: "Brother Alden is paralyzed with horror by the ghoul's appearance.",
          changes: {
            mood: "paralyzed",
            status: "frozen in horror, dropping his ledger",
          },
        },
        {
          actorKey: "mira",
          reason: "Mira reacts durably to the ghoul threat.",
          changes: {
            mood: "terrified",
            status: "guarding the aisle against the ghoul",
          },
        },
      ],
      [...context.actors, brotherAlden],
    );
    const bounded = applyNarrationSupportBoundary(
      validation,
      "Mira gasps, stumbling backward toward the shadows of the aisle, while Brother Alden freezes, the ledger slipping slightly from his grasp as he stares in paralyzed horror at the intruder.",
    );

    expect(bounded.acceptedUpdates).toEqual([
      {
        actorKey: "mira",
        actorName: "Mira",
        reason: "Mira reacts durably to the ghoul threat.",
        changes: [
          { key: "mood", value: "terrified" },
          { key: "status", value: "guarding the aisle against the ghoul" },
        ],
      },
    ]);
    expect(bounded.ignoredUpdates).toMatchObject([
      {
        actorKey: "brother-alden",
        field: "mood",
        reason: "NPC mood update encodes physical incapacity instead of an affective state.",
        valuePreview: "paralyzed",
      },
      {
        actorKey: "brother-alden",
        field: "status",
        reason: "NPC status update describes a momentary beat, not a durable condition.",
        valuePreview: "frozen in horror, dropping his ledger",
      },
    ]);
  });
});

describe("OpenAI-compatible provider boundary", () => {
  it("defaults to persistent mode and rejects unknown director modes", () => {
    expect(readDirectorMode({})).toEqual({ ok: true, mode: "persistent" });
    expect(readDirectorMode({ LORECRAFT_DIRECTOR_MODE: "transcript" })).toEqual({
      ok: true,
      mode: "transcript",
    });
    expect(readDirectorMode({ LORECRAFT_DIRECTOR_MODE: "transcript" })).toEqual({
      ok: true,
      mode: "transcript",
    });
    expect(readDirectorMode({ LORECRAFT_DIRECTOR_MODE: "weird" })).toEqual({
      ok: false,
      error: 'LORECRAFT_DIRECTOR_MODE must be "persistent" or "transcript".',
    });
  });

  it("reports missing config without choosing a provider", () => {
    const config = readLlmConfig({});

    expect(config).toEqual({
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Game Master turns.",
    });
  });

  it("extracts the assistant message from an OpenAI-compatible response", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const content = await requestOpenAICompatibleChat({
      config: {
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "local-model",
        generationSettings: {
          temperature: 0.2,
          maxTokens: 600,
          topP: 0.85,
          reasoningEffort: "none",
          responseFormat: "json_object",
        },
      },
      messages: [{ role: "user", content: "hello" }],
      fetchImpl: async (_input, init) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"narration":"Hello."}' } }],
          }),
          { status: 200 },
        );
      },
    });

    expect(content).toBe('{"narration":"Hello."}');
    expect(capturedBody).toMatchObject({
      model: "local-model",
      temperature: 0.2,
      max_tokens: 600,
      top_p: 0.85,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
    });
  });

  it("omits provider JSON response_format for plain-text generation settings", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const content = await requestOpenAICompatibleChat({
      config: {
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "local-model",
        generationSettings: {
          temperature: 0.7,
          responseFormat: "text",
        },
      },
      messages: [{ role: "user", content: "continue the scene" }],
      fetchImpl: async (_input, init) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Mira answers in plain prose." } }],
          }),
          { status: 200 },
        );
      },
    });

    expect(content).toBe("Mira answers in plain prose.");
    expect(capturedBody).toMatchObject({
      model: "local-model",
      temperature: 0.7,
    });
    expect(capturedBody).not.toHaveProperty("response_format");
    expect(capturedBody).not.toHaveProperty("reasoning_effort");
  });

  it("reads optional generation settings with safe defaults", () => {
    const defaults = readLlmConfig({
      LLM_BASE_URL: "http://localhost:11434/v1",
      LLM_API_KEY: "ollama",
      LLM_MODEL: "llama3.1:8b",
    });
    const configured = readLlmConfig({
      LLM_BASE_URL: "http://localhost:11434/v1",
      LLM_API_KEY: "ollama",
      LLM_MODEL: "llama3.1:8b",
      LLM_TEMPERATURE: "0.3",
      LLM_MAX_TOKENS: "900",
      LLM_TOP_P: "0.8",
      LLM_REASONING_EFFORT: "none",
    });
    const invalid = readLlmConfig({
      LLM_BASE_URL: "http://localhost:11434/v1",
      LLM_API_KEY: "ollama",
      LLM_MODEL: "llama3.1:8b",
      LLM_MAX_TOKENS: "12.5",
    });

    expect(defaults).toMatchObject({
      ok: true,
      config: {
        generationSettings: { temperature: 0.7, responseFormat: "json_object" },
      },
    });
    expect(configured).toMatchObject({
      ok: true,
      config: {
        generationSettings: {
          temperature: 0.3,
          maxTokens: 900,
          topP: 0.8,
          reasoningEffort: "none",
          responseFormat: "json_object",
        },
      },
    });
    expect(invalid).toEqual({
      ok: false,
      error: "LLM_MAX_TOKENS must be an integer number at least 1 and no greater than 8000.",
    });
    expect(
      readLlmConfig({
        LLM_BASE_URL: "http://localhost:11434/v1",
        LLM_API_KEY: "ollama",
        LLM_MODEL: "llama3.1:8b",
        LLM_REASONING_EFFORT: "extreme",
      }),
    ).toEqual({
      ok: false,
      error: "LLM_REASONING_EFFORT must be one of none, low, medium, high, or max.",
    });
  });
});

describe("Raw Director request storage", () => {
  it("stores exact provider messages only when explicitly enabled", () => {
    const messages = [
      { role: "system" as const, content: "System prompt" },
      { role: "user" as const, content: '{"promptComponents":{}}' },
    ];

    expect(shouldStoreRawDirectorRequest({})).toBe(false);
    expect(shouldStoreRawDirectorRequest({ LORECRAFT_DEBUG_STORE_RAW_REQUEST: "0" })).toBe(false);
    expect(shouldStoreRawDirectorRequest({ LORECRAFT_DEBUG_STORE_RAW_REQUEST: "1" })).toBe(true);
    expect(rawDirectorRequestForStorage(messages, {})).toBeUndefined();
    expect(
      rawDirectorRequestForStorage(messages, {
        LORECRAFT_DEBUG_STORE_RAW_REQUEST: "1",
      }),
    ).toBe(messages);
  });
});

describe("Director turn route errors", () => {
  it("maps malformed Convex Adventure ids to a structured 400 response", () => {
    const result = normalizeWorldLoadError(
      new Error('ArgumentValidationError: Value does not match validator for field "adventureId"'),
    );

    expect(result).toEqual({
      httpStatus: 400,
      clientMessage: "The selected Adventure id is invalid. Seed or reload the Adventure and try again.",
      logMessage: "The selected Adventure id is invalid.",
    });
  });

  it("keeps unexpected context load errors as server errors", () => {
    const result = normalizeWorldLoadError(new Error("Convex deployment unavailable"));

    expect(result).toEqual({
      httpStatus: 500,
      clientMessage: "The selected Adventure could not be loaded. Seed or reload the Adventure and try again.",
      logMessage: "The selected Adventure could not be loaded.",
    });
  });
});

describe("Director debug logging", () => {
  it("omits raw LLM text unless explicitly enabled", () => {
    const record = buildDirectorDebugLogRecord(
      {
        event: "director.turn.unit",
        stage: "parse_director_output",
        turnId: "turn-id",
        provider: "localhost:11434",
        model: "llama3.1:8b",
        rawResponse: '{"narration":"Hello."}',
        status: "invalid_output",
      },
      {
        env: { LORECRAFT_DEBUG_LOG: "1" },
        now: () => new Date("2026-06-27T19:30:00.000Z"),
      },
    );

    expect(record).toMatchObject({
      ts: "2026-06-27T19:30:00.000Z",
      event: "director.turn.unit",
      rawResponseLength: 22,
      turnId: "turn-id",
    });
    expect(record).not.toHaveProperty("rawResponse");
  });

  it("builds a turn-centered debug unit without raw request text by default", () => {
    const record = buildDirectorDebugLogRecord(
      {
        event: "director.turn.unit",
        stage: "complete_director_turn",
        turnId: "turn-id",
        commandId: "command-id",
        playerInput: "I ask Mira about the storm.",
        requestSummary: { roomKey: "chapel" },
        rawRequest: [
          { role: "system", content: "Hidden context." },
          { role: "user", content: "I ask Mira about the storm." },
        ],
        rawResponse: '{"narration":"Mira answers."}',
        parsedResponse: { narration: "Mira answers.", npcUpdates: [] },
        narration: "Mira answers.",
        acceptedUpdates: [{ actorKey: "mira" }],
        ignoredUpdates: [],
        status: "success",
      },
      {
        env: { LORECRAFT_DEBUG_LOG: "1" },
        now: () => new Date("2026-06-27T19:32:00.000Z"),
      },
    );

    expect(record).toMatchObject({
      event: "director.turn.unit",
      stage: "complete_director_turn",
      turnId: "turn-id",
      commandId: "command-id",
      playerInput: "I ask Mira about the storm.",
      rawRequestMessageCount: 2,
      rawResponseLength: 29,
      parsedResponse: { narration: "Mira answers.", npcUpdates: [] },
      narration: "Mira answers.",
      acceptedUpdateCount: 1,
      ignoredUpdateCount: 0,
    });
    expect(record).not.toHaveProperty("rawRequest");
    expect(record).not.toHaveProperty("rawResponse");
  });

  it("includes raw provider request text in local logs only when explicitly enabled", () => {
    const rawRequest = [{ role: "user", content: "Exact provider message." }];
    const record = buildDirectorDebugLogRecord(
      {
        event: "director.turn.unit",
        stage: "complete_director_turn",
        rawRequest,
      },
      {
        env: { LORECRAFT_DEBUG_LOG: "1", LORECRAFT_DEBUG_LOG_RAW_REQUEST: "1" },
      },
    );

    expect(record).toMatchObject({
      rawRequestMessageCount: 1,
      rawRequest,
    });
  });

  it("writes JSONL records only when local debug logging is enabled", async () => {
    const writes: string[] = [];
    const mkdirs: string[] = [];
    const entry = { event: "director.turn.unit", stage: "complete_director_turn" };

    const disabled = await writeDirectorDebugLog(entry, {
      env: {},
      mkdirImpl: async (path) => {
        mkdirs.push(String(path));
        return undefined;
      },
      appendFileImpl: async (_path, data) => {
        writes.push(String(data));
      },
    });

    const enabled = await writeDirectorDebugLog(entry, {
      env: { LORECRAFT_DEBUG_LOG: "1", LORECRAFT_DEBUG_LOG_PATH: "logs/test.jsonl" },
      cwd: "/tmp/lorecraft",
      now: () => new Date("2026-06-27T19:31:00.000Z"),
      mkdirImpl: async (path) => {
        mkdirs.push(String(path));
        return undefined;
      },
      appendFileImpl: async (path, data) => {
        writes.push(`${path}:${data}`);
      },
    });

    expect(disabled).toBe(false);
    expect(enabled).toBe(true);
    expect(mkdirs).toEqual(["/tmp/lorecraft/logs"]);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("/tmp/lorecraft/logs/test.jsonl:");
    expect(writes[0]).toContain('"event":"director.turn.unit"');
  });
});
