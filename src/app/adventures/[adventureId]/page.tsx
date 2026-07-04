import { WorldClient } from "@/features/play/world-client";
import type { Id } from "../../../../convex/_generated/dataModel";

export default async function AdventurePage({
  params,
}: {
  params: Promise<{ adventureId: string }>;
}) {
  const { adventureId } = await params;

  return <WorldClient initialAdventureId={adventureId as Id<"adventures">} />;
}
