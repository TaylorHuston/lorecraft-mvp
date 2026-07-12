"use client";

import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";

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
  onClose: () => void;
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
  onClose,
}: DebugPanelShellProps) {
  const [debugTab, setDebugTab] = useState<DebugTab>("prompt");
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!isCollapsed && !dialog.open) {
      dialog.showModal();
    } else if (isCollapsed && dialog.open) {
      dialog.close();
    }
  }, [isCollapsed]);

  return (
    <dialog
      ref={dialogRef}
      id="debug-panel"
      aria-labelledby="debug-panel-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="m-auto h-[min(88dvh,52rem)] w-[min(calc(100%-2rem),60rem)] max-w-none rounded-sm border-2 border-zinc-600 bg-[#090908] p-0 text-zinc-100 shadow-2xl shadow-black/70 backdrop:bg-black/75 backdrop:backdrop-blur-[2px]"
    >
      <div id="debug-panel-frame" className="flex h-full min-h-0 flex-col">
        <header
          id="debug-panel-header"
          className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-zinc-700 px-4 py-3"
        >
          <div className="min-w-0">
            <h2 id="debug-panel-title" className="text-sm font-semibold text-zinc-100">
              Debug panel
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Hidden world state, Game Master calls, authoring controls, and reset tools.
            </p>
            <div id="debug-panel-actions" className="mt-3 flex flex-wrap gap-2">
              {headerActions}
            </div>
          </div>
          <button
            id="debug-panel-close"
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close debug panel"
            className="group flex size-11 shrink-0 items-center justify-end rounded-sm text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
            title="Close debug panel"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-sm border-2 border-zinc-700 transition-colors group-hover:border-zinc-400 group-hover:bg-zinc-900 group-hover:text-zinc-100"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </span>
          </button>
        </header>

        <div id="debug-panel-content" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">

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
      </div>
    </dialog>
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
      className={`min-h-11 rounded-sm border-2 px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 disabled:cursor-not-allowed disabled:opacity-60 ${
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
      className="grid grid-cols-4 rounded-sm border-2 border-zinc-800 text-xs uppercase"
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
          className={`min-h-11 px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/80 ${
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
