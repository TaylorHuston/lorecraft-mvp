"use client";

import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "./debug-formatters";

export type LocationSaveStatus = "idle" | "saving" | "saved" | "error";

export type NewLocationDraft = {
  key: string;
  name: string;
  description: string;
};

type UseLocationDebugSavesOptions = {
  adventureId: Id<"adventures"> | null;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
};

const EMPTY_LOCATION_DRAFT: NewLocationDraft = {
  key: "",
  name: "",
  description: "",
};

export function useLocationDebugSaves({
  adventureId,
  onError,
  onNotice,
}: UseLocationDebugSavesOptions) {
  const updateLocation = useAction(api.world.updateLocation);
  const createLocation = useAction(api.world.createLocation);
  const [saveStatus, setSaveStatus] = useState<Record<string, LocationSaveStatus>>({});
  const [newLocation, setNewLocation] = useState<NewLocationDraft>(EMPTY_LOCATION_DRAFT);
  const activeSaves = useRef<Record<string, Promise<boolean>[]>>({});

  function resetLocalState() {
    setSaveStatus({});
    setNewLocation(EMPTY_LOCATION_DRAFT);
  }

  async function saveLocation(
    locationId: Id<"rooms">,
    locationKey: string,
    name: string,
    description: string,
  ): Promise<boolean> {
    if (!adventureId) {
      return false;
    }

    setSaveStatus((current) => ({ ...current, [locationKey]: "saving" }));
    const savePromise = persistLocation(adventureId, locationId, locationKey, name, description);
    activeSaves.current[locationKey] = [
      ...(activeSaves.current[locationKey] ?? []),
      savePromise,
    ];
    void savePromise.finally(() => {
      const remainingSaves = (activeSaves.current[locationKey] ?? []).filter(
        (activeSave) => activeSave !== savePromise,
      );
      if (remainingSaves.length > 0) {
        activeSaves.current[locationKey] = remainingSaves;
      } else {
        delete activeSaves.current[locationKey];
      }
    });
    return savePromise;
  }

  async function persistLocation(
    saveAdventureId: Id<"adventures">,
    locationId: Id<"rooms">,
    locationKey: string,
    name: string,
    description: string,
  ): Promise<boolean> {
    onError(null);
    onNotice(null);
    try {
      const result = await updateLocation({
        adventureId: saveAdventureId,
        locationId,
        name,
        description,
      });
      if (!result.ok) {
        onError(result.error ?? "Failed to save location.");
        setSaveStatus((current) => ({ ...current, [locationKey]: "error" }));
        return false;
      }
      setSaveStatus((current) => ({ ...current, [locationKey]: "saved" }));
      onNotice("Location saved.");
      return true;
    } catch (saveError) {
      onError(errorMessage(saveError));
      setSaveStatus((current) => ({ ...current, [locationKey]: "error" }));
      return false;
    }
  }

  async function flushActiveSaves() {
    const activeSaveList = Object.values(activeSaves.current).flat();
    if (activeSaveList.length === 0) {
      return true;
    }

    const results = await Promise.all(activeSaveList);
    return results.every(Boolean);
  }

  async function createNewLocation() {
    if (!adventureId) {
      return;
    }

    onError(null);
    onNotice(null);
    const result = await createLocation({
      adventureId,
      key: newLocation.key,
      name: newLocation.name,
      description: newLocation.description,
    });
    if (!result.ok) {
      onError(result.error ?? "Failed to create location.");
      return;
    }
    setNewLocation(EMPTY_LOCATION_DRAFT);
    onNotice("Location created.");
  }

  return {
    saveStatus,
    newLocation,
    setNewLocation,
    saveLocation,
    flushActiveSaves,
    createNewLocation,
    resetLocalState,
  };
}
