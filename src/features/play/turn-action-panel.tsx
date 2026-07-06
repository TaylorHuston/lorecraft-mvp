"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type TurnActionPanelProps = {
  disabled: boolean;
  isSubmitting: boolean;
  notice: string | null;
  error: string | null;
  onActSubmit: (input: string) => Promise<boolean>;
  onPass: () => Promise<boolean>;
};

export function TurnActionPanel({
  disabled,
  isSubmitting,
  notice,
  error,
  onActSubmit,
  onPass,
}: TurnActionPanelProps) {
  const [input, setInput] = useState("");
  const [isActInputOpen, setIsActInputOpen] = useState(false);
  const [isActInputClosing, setIsActInputClosing] = useState(false);
  const [isTurnControlsSettling, setIsTurnControlsSettling] = useState(false);
  const directorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const actInputCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActInputOpen || isSubmitting) {
      return;
    }

    if (directorInputRef.current) {
      resizeDirectorInput(directorInputRef.current);
      directorInputRef.current.focus();
    }
  }, [isActInputOpen, isSubmitting]);

  useEffect(() => {
    return () => {
      if (actInputCloseTimer.current) {
        clearTimeout(actInputCloseTimer.current);
      }
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitActInput();
  }

  async function submitActInput() {
    const submittedInput = input.trim();
    if (!isActInputOpen || !submittedInput || isSubmitting || disabled) {
      return;
    }

    setInput("");
    const ok = await onActSubmit(submittedInput);
    if (ok) {
      setIsActInputOpen(false);
      setIsActInputClosing(false);
      setIsTurnControlsSettling(false);
      return;
    }

    setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
    setIsActInputOpen(true);
  }

  function handleAct() {
    if (isSubmitting || disabled) {
      return;
    }

    if (actInputCloseTimer.current) {
      clearTimeout(actInputCloseTimer.current);
      actInputCloseTimer.current = null;
    }
    setIsTurnControlsSettling(false);
    setIsActInputClosing(false);
    setIsActInputOpen(true);
  }

  function handleCancelAct() {
    if (isSubmitting || isActInputClosing) {
      return;
    }

    setIsActInputClosing(true);
    actInputCloseTimer.current = setTimeout(() => {
      setIsActInputOpen(false);
      setIsActInputClosing(false);
      actInputCloseTimer.current = null;
      setIsTurnControlsSettling(true);
    }, 160);
  }

  async function handlePass() {
    if (isSubmitting || disabled) {
      return;
    }

    await onPass();
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function resizeDirectorInput(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(96, textarea.scrollHeight)}px`;
  }

  return (
    <form
      id="narrative-input-form"
      onSubmit={handleSubmit}
      className="mx-auto mb-5 w-[calc(100%-2.5rem)] max-w-[50rem] shrink-0 rounded-2xl px-5 py-3 shadow-2xl shadow-black/35 sm:w-[calc(100%-4rem)] lg:w-[calc(100%-5rem)]"
    >
      {isSubmitting ? (
        <TurnPendingPlaceholder />
      ) : (
        <>
          <p
            id="turn-action-prompt"
            className="block text-left text-[1.08rem] italic leading-8 text-zinc-200"
          >
            What do you do?
          </p>
          {isActInputOpen ? (
            <div
              className={`${isActInputClosing ? "turn-response-area-exit" : "turn-response-area-enter"} relative mt-3`}
            >
              <textarea
                id="director-input"
                ref={directorInputRef}
                aria-labelledby="turn-action-prompt"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  resizeDirectorInput(event.currentTarget);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Type your response..."
                rows={1}
                disabled={disabled}
                className="block h-24 min-h-24 w-full resize-none overflow-hidden rounded-xl bg-zinc-700/45 py-3 pl-4 pr-12 text-left text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:bg-zinc-700/65"
              />
              <button
                id="close-act-input-button"
                type="button"
                aria-label="Return to turn actions"
                onClick={handleCancelAct}
                disabled={isSubmitting || isActInputClosing}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-lg leading-none text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ) : (
            <div
              id="turn-controls"
              className="mt-3 flex justify-start gap-2"
              onPointerLeave={() => setIsTurnControlsSettling(false)}
            >
              <button
                id="act-turn-button"
                type="button"
                onClick={handleAct}
                disabled={disabled}
                className={`flex h-12 w-28 items-center justify-center rounded-xl bg-zinc-700/80 text-sm font-semibold text-zinc-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${isTurnControlsSettling ? "" : "hover:bg-zinc-200 hover:text-zinc-950"}`}
              >
                Act
              </button>
              <button
                id="pass-turn-button"
                type="button"
                onClick={handlePass}
                disabled={disabled}
                className={`flex h-12 w-28 items-center justify-center rounded-xl bg-zinc-700/80 text-sm font-semibold text-zinc-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${isTurnControlsSettling ? "" : "hover:bg-zinc-200 hover:text-zinc-950"}`}
              >
                Pass
              </button>
            </div>
          )}
        </>
      )}
      <div
        id="async-status-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice ? (
          <p id="turn-notice-message" className="mt-3 text-xs text-emerald-300/80">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            id="turn-error-message"
            role="alert"
            className="mt-3 text-sm text-rose-300"
          >
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function TurnPendingPlaceholder() {
  return (
    <div
      id="turn-pending-placeholder"
      role="status"
      aria-live="polite"
      className="flex min-h-[4.5rem] items-center gap-3 text-sm text-zinc-300"
    >
      <span className="sr-only">Game Master is writing a response.</span>
      <span className="flex gap-1" aria-hidden="true">
        <span className="size-2 animate-pulse rounded-full bg-amber-300/90 [animation-delay:0ms]" />
        <span className="size-2 animate-pulse rounded-full bg-amber-300/70 [animation-delay:150ms]" />
        <span className="size-2 animate-pulse rounded-full bg-amber-300/50 [animation-delay:300ms]" />
      </span>
      <span aria-hidden="true" className="text-zinc-400">
        The story is turning...
      </span>
    </div>
  );
}
