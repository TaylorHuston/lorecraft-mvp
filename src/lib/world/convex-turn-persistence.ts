import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { MutationCtx } from "../../../convex/_generated/server";

export type FactValue = string | number | boolean | null;

export type AcceptedNpcUpdateForWrite = {
  actorKey: string;
  actorName: string;
  reason: string;
  changes: Array<{ key: "mood" | "status" | "memory"; value: string }>;
};

export type AcceptedActorMoveForWrite = {
  actorKey: string;
  actorName: string;
  toLocationKey: string;
  toLocationName: string;
  reason: string;
};

type SetFact = (
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    adventureId: Id<"adventures">;
    subjectType: "world" | "room" | "actor" | "object" | "exit";
    subjectId: string;
    key: string;
    value: FactValue;
    source: "seed" | "player" | "engine" | "llm" | "manual";
    overwrite: boolean;
  },
) => Promise<Id<"facts">>;

type FindActorByKeyOrName = (
  ctx: MutationCtx,
  adventureId: Id<"adventures">,
  key: string,
  name: string,
) => Promise<Doc<"actors"> | null>;

type FindRoomByKey = (
  ctx: MutationCtx,
  adventureId: Id<"adventures">,
  key: string,
) => Promise<Doc<"rooms"> | null>;

type TurnPersistenceDependencies = {
  setFact: SetFact;
  findActorByKeyOrName: FindActorByKeyOrName;
  findRoomByKey: FindRoomByKey;
  actorSubjectId: (actorKey: string) => string;
};

export async function applyAcceptedNpcUpdates(
  ctx: MutationCtx,
  dependencies: Pick<TurnPersistenceDependencies, "setFact" | "actorSubjectId">,
  args: {
    worldId: Id<"worlds">;
    adventureId: Id<"adventures">;
    turnId: Id<"turns">;
    commandId?: Id<"commands">;
    acceptedUpdates: AcceptedNpcUpdateForWrite[];
  },
) {
  let changedFacts = 0;
  const operations: Array<
    | {
        op: "setFact";
        subjectType: string;
        subjectId: string;
        key: string;
        value: FactValue;
      }
    | { op: "appendEvent"; text: string }
  > = [];

  for (const update of args.acceptedUpdates) {
    const subjectId = dependencies.actorSubjectId(update.actorKey);
    for (const change of update.changes) {
      await dependencies.setFact(ctx, {
        worldId: args.worldId,
        adventureId: args.adventureId,
        subjectType: "actor",
        subjectId,
        key: change.key,
        value: change.value,
        source: "llm",
        overwrite: true,
      });
      changedFacts += 1;
      operations.push({
        op: "setFact",
        subjectType: "actor",
        subjectId,
        key: change.key,
        value: change.value,
      });
    }

    const changedKeys = update.changes.map((change) => change.key).join(", ");
    const eventText = `${update.actorName}'s ${changedKeys} changed after the exchange.`;
    await ctx.db.insert("events", {
      worldId: args.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      ...(args.commandId ? { commandId: args.commandId } : {}),
      text: eventText,
      source: "llm",
    });
    operations.push({ op: "appendEvent", text: eventText });
  }

  if (operations.length > 0) {
    await ctx.db.insert("stateDiffs", {
      worldId: args.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      ...(args.commandId ? { commandId: args.commandId } : {}),
      source: "llm",
      operations,
    });
  }

  return changedFacts;
}

export async function applyAcceptedActorMoves(
  ctx: MutationCtx,
  dependencies: Pick<TurnPersistenceDependencies, "findActorByKeyOrName" | "findRoomByKey">,
  args: {
    worldId: Id<"worlds">;
    adventureId: Id<"adventures">;
    turnId: Id<"turns">;
    commandId?: Id<"commands">;
    acceptedMoves: AcceptedActorMoveForWrite[];
  },
) {
  if (args.acceptedMoves.length === 0) {
    return 0;
  }

  const adventure = await ctx.db.get(args.adventureId);
  const player = adventure?.currentPlayerActorId
    ? await ctx.db.get(adventure.currentPlayerActorId)
    : null;
  const currentRoomId = player?.roomId;
  const operations: Array<{ op: "moveActor"; actorId: Id<"actors">; toRoomId: Id<"rooms"> }> = [];

  if (!currentRoomId) {
    return 0;
  }

  for (const move of args.acceptedMoves) {
    const actor = await dependencies.findActorByKeyOrName(
      ctx,
      args.adventureId,
      move.actorKey,
      move.actorName,
    );
    const toRoom = await dependencies.findRoomByKey(ctx, args.adventureId, move.toLocationKey);

    if (
      !actor ||
      !toRoom ||
      actor.adventureId !== args.adventureId ||
      toRoom.adventureId !== args.adventureId ||
      actor.roomId !== currentRoomId
    ) {
      continue;
    }

    await ctx.db.patch(actor._id, { roomId: toRoom._id });
    operations.push({ op: "moveActor", actorId: actor._id, toRoomId: toRoom._id });
  }

  if (operations.length > 0) {
    await ctx.db.insert("stateDiffs", {
      worldId: args.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      ...(args.commandId ? { commandId: args.commandId } : {}),
      source: "llm",
      operations,
    });
  }

  return operations.length;
}
