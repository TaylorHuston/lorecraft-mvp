"use client";

import { useEffect, useRef } from "react";

type HelpDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ACTION_HELP = [
  {
    name: "Act",
    description: "Describe what your character does or says. The Game Master resolves it and ends the turn.",
  },
  {
    name: "Story",
    description: "Add canonical prose directly to the story without ending the current turn.",
  },
  {
    name: "Guide",
    description: "Privately steer the Game Master's next narration. Your guidance is not shown in the story.",
  },
  {
    name: "Pass",
    description: "Take no action and ask the Game Master to continue the scene and resolve the turn.",
  },
];

const COMMAND_HELP = [
  {
    command: "/help",
    description: "List the slash commands available during play.",
  },
  {
    command: "/look <target>",
    description: "Inspect a visible person, object, or location without ending the turn.",
  },
];

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      id="help-dialog"
      aria-labelledby="help-dialog-title"
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
      className="m-auto max-h-[88dvh] w-[min(calc(100%-2rem),42rem)] max-w-none rounded-sm border-2 border-zinc-600 bg-[#090908] p-0 text-zinc-100 shadow-2xl shadow-black/70 backdrop:bg-black/75 backdrop:backdrop-blur-[2px]"
    >
      <div id="help-dialog-frame" className="flex max-h-[88dvh] min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-zinc-700 px-4 py-3">
          <div>
            <h2 id="help-dialog-title" className="text-sm font-semibold text-zinc-100">
              How to play
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Choose how you want to contribute before the Game Master continues the story.
            </p>
          </div>
          <button
            id="help-dialog-close"
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close help"
            className="group flex size-11 shrink-0 items-center justify-end rounded-sm text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
            title="Close help"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-sm border-2 border-zinc-700 transition-colors group-hover:border-zinc-400 group-hover:bg-zinc-900 group-hover:text-zinc-100"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </span>
          </button>
        </header>

        <div id="help-dialog-content" className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5">
          <section aria-labelledby="help-actions-title">
            <h3 id="help-actions-title" className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200/80">
              Actions
            </h3>
            <dl className="mt-3 divide-y divide-zinc-800 border-y-2 border-zinc-800">
              {ACTION_HELP.map((action) => (
                <div key={action.name} className="grid gap-1 py-3 sm:grid-cols-[5rem_1fr] sm:gap-4">
                  <dt className="text-sm font-medium text-zinc-100">{action.name}</dt>
                  <dd className="text-sm leading-6 text-zinc-400">{action.description}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="help-commands-title">
            <h3 id="help-commands-title" className="text-xs font-medium uppercase tracking-[0.14em] text-sky-200/80">
              Slash commands
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Enter slash commands through Act. Utilities do not end the current turn.
            </p>
            <dl className="mt-3 divide-y divide-zinc-800 border-y-2 border-zinc-800">
              {COMMAND_HELP.map((item) => (
                <div key={item.command} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                  <dt className="font-mono text-sm text-sky-200">{item.command}</dt>
                  <dd className="text-sm leading-6 text-zinc-400">{item.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </dialog>
  );
}
