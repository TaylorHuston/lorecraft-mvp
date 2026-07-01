import type { DirectorActor, DirectorNpcProfile } from "./types";

export function buildNpcProfiles(actors: DirectorActor[]): DirectorNpcProfile[] {
  return actors
    .filter((actor) => actor.role === "npc")
    .map((actor) => ({
      key: actor.key,
      name: actor.name,
      description: actor.description,
      attributes: actor.facts.map((fact) => ({
        key: fact.key,
        value: fact.value,
        source: fact.source,
      })),
    }));
}
