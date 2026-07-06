"use client";

import { KeyboardEvent, ReactNode, useState } from "react";

export type DebugTab = "prompt" | "npcs" | "locations" | "state";

type DebugPanelShellProps = {
  isCollapsed: boolean;
  headerActions: ReactNode;
  emptyState: ReactNode;
  hasSnapshot: boolean;
  promptPanel: ReactNode;
  npcsPanel: ReactNode;
  locationsPanel: ReactNode;
  statePanel: ReactNode;
};

export function DebugPanelShell({
  isCollapsed,
  headerActions,
  emptyState,
  hasSnapshot,
  promptPanel,
  npcsPanel,
  locationsPanel,
  statePanel,
}: DebugPanelShellProps) {
  const [debugTab, setDebugTab] = useState<DebugTab>("prompt");

  return (
    <aside
      id="debug-panel"
      className={`fixed right-0 top-12 z-20 h-[calc(100vh-3rem)] w-full max-w-[600px] overflow-y-auto border-l border-zinc-800 bg-zinc-900/95 px-4 py-5 shadow-2xl shadow-black/40 transition-transform duration-200 ease-out sm:w-[600px] ${
        isCollapsed ? "translate-x-full" : "translate-x-0"
      }`}
      aria-hidden={isCollapsed}
      inert={isCollapsed ? true : undefined}
    >
      <div id="debug-panel-content" className="space-y-5">
        <div id="debug-panel-header">
          <h2 className="text-sm font-semibold text-zinc-100">Debug panel</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Hidden world state, Game Master calls, authoring controls, and reset tools.
          </p>
          <div id="debug-panel-actions" className="mt-3 flex flex-wrap gap-2">
            {headerActions}
          </div>
        </div>

        {hasSnapshot ? (
          <>
            <DebugTabs value={debugTab} onChange={setDebugTab} />
            <div
              id={debugTabPanelId("prompt")}
              role="tabpanel"
              aria-labelledby={debugTabId("prompt")}
              hidden={debugTab !== "prompt"}
            >
              {debugTab === "prompt" ? promptPanel : null}
            </div>
            <div
              id={debugTabPanelId("npcs")}
              role="tabpanel"
              aria-labelledby={debugTabId("npcs")}
              hidden={debugTab !== "npcs"}
            >
              {debugTab === "npcs" ? npcsPanel : null}
            </div>
            <div
              id={debugTabPanelId("locations")}
              role="tabpanel"
              aria-labelledby={debugTabId("locations")}
              hidden={debugTab !== "locations"}
            >
              {debugTab === "locations" ? locationsPanel : null}
            </div>
            <div
              id={debugTabPanelId("state")}
              role="tabpanel"
              aria-labelledby={debugTabId("state")}
              hidden={debugTab !== "state"}
            >
              {debugTab === "state" ? statePanel : null}
            </div>
          </>
        ) : (
          emptyState
        )}
      </div>
    </aside>
  );
}

export function DebugActionButton({
  id,
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  id: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "danger"
          ? "border-rose-500/70 text-rose-200 hover:bg-rose-950/40"
          : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function DebugTabs({ value, onChange }: { value: DebugTab; onChange: (value: DebugTab) => void }) {
  const tabs: Array<{ value: DebugTab; label: string }> = [
    { value: "prompt", label: "Prompt" },
    { value: "npcs", label: "NPCs" },
    { value: "locations", label: "Locations" },
    { value: "state", label: "State" },
  ];
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: DebugTab) => {
    const currentIndex = tabs.findIndex((item) => item.value === tab);
    if (currentIndex < 0) {
      return;
    }

    const lastIndex = tabs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex].value;
    onChange(nextTab);
    document.getElementById(debugTabId(nextTab))?.focus();
  };

  return (
    <div
      id="debug-tabs"
      role="tablist"
      aria-label="Debug sections"
      className="grid grid-cols-4 rounded-md border border-zinc-800 text-xs uppercase"
    >
      {tabs.map((tab) => (
        <button
          id={debugTabId(tab.value)}
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          aria-controls={debugTabPanelId(tab.value)}
          tabIndex={value === tab.value ? 0 : -1}
          onClick={() => onChange(tab.value)}
          onKeyDown={(event) => handleKeyDown(event, tab.value)}
          className={`px-3 py-2 ${
            value === tab.value
              ? "bg-amber-300 text-zinc-950"
              : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function debugTabId(tab: DebugTab) {
  return `debug-tab-${tab}`;
}

function debugTabPanelId(tab: DebugTab) {
  return `debug-tab-panel-${tab}`;
}
