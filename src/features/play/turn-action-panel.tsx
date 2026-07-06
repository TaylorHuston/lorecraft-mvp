"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  getSlashCommandAutocomplete,
  type SlashCommandAutocompleteSuggestion,
  type SlashCommandAutocompleteTarget,
} from "@/lib/director/slash-command-autocomplete";

type TurnActionPanelProps = {
  disabled: boolean;
  isSubmitting: boolean;
  notice: string | null;
  error: string | null;
  slashCommandTargets: SlashCommandAutocompleteTarget[];
  onActSubmit: (input: string) => Promise<"close" | "keep-open" | false>;
  onPass: () => Promise<boolean>;
};

export function TurnActionPanel({
  disabled,
  isSubmitting,
  notice,
  error,
  slashCommandTargets,
  onActSubmit,
  onPass,
}: TurnActionPanelProps) {
  const [input, setInput] = useState("");
  const [isActInputOpen, setIsActInputOpen] = useState(false);
  const [isActInputClosing, setIsActInputClosing] = useState(false);
  const [isTurnControlsSettling, setIsTurnControlsSettling] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const directorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const actInputCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteSuggestions = useMemo(
    () => getSlashCommandAutocomplete(input, slashCommandTargets),
    [input, slashCommandTargets],
  );
  const boundedActiveSuggestionIndex = Math.min(
    activeSuggestionIndex,
    Math.max(autocompleteSuggestions.length - 1, 0),
  );
  const shouldShowAutocomplete =
    isActInputOpen && isAutocompleteOpen && autocompleteSuggestions.length > 0 && !isSubmitting;
  const activeSuggestion = shouldShowAutocomplete
    ? autocompleteSuggestions[boundedActiveSuggestionIndex]
    : undefined;

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
    setIsAutocompleteOpen(false);
    const result = await onActSubmit(submittedInput);
    if (result === "close") {
      setIsActInputOpen(false);
      setIsActInputClosing(false);
      setIsTurnControlsSettling(false);
      return;
    }
    if (result === "keep-open") {
      setIsActInputOpen(true);
      setIsActInputClosing(false);
      setIsTurnControlsSettling(false);
      return;
    }

    setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
    setIsAutocompleteOpen(false);
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
    setIsAutocompleteOpen(false);
  }

  function handleCancelAct() {
    if (isSubmitting || isActInputClosing) {
      return;
    }

    setIsActInputClosing(true);
    setIsAutocompleteOpen(false);
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
    if (shouldShowAutocomplete) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestionIndex((current) => (current + 1) % autocompleteSuggestions.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestionIndex(
          (current) => (current - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length,
        );
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        acceptAutocompleteSuggestion(activeSuggestion);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setIsAutocompleteOpen(false);
        return;
      }
    }

    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    if (shouldShowAutocomplete && activeSuggestion) {
      event.preventDefault();
      acceptAutocompleteSuggestion(activeSuggestion);
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function handleInputChange(value: string, textarea: HTMLTextAreaElement) {
    setInput(value);
    setIsAutocompleteOpen(value.trimStart().startsWith("/"));
    setActiveSuggestionIndex(0);
    resizeDirectorInput(textarea);
  }

  function acceptAutocompleteSuggestion(suggestion: SlashCommandAutocompleteSuggestion | undefined) {
    if (!suggestion) {
      return;
    }

    const nextInput = suggestion.value === "/look" ? "/look " : suggestion.value;
    setInput(nextInput);
    setIsAutocompleteOpen(false);
    setActiveSuggestionIndex(0);
    window.requestAnimationFrame(() => {
      const textarea = directorInputRef.current;
      if (!textarea) {
        return;
      }
      resizeDirectorInput(textarea);
      textarea.focus();
      textarea.setSelectionRange(nextInput.length, nextInput.length);
    });
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
                aria-autocomplete="list"
                aria-controls={shouldShowAutocomplete ? "slash-command-autocomplete" : undefined}
                aria-activedescendant={
                  shouldShowAutocomplete
                    ? `slash-command-suggestion-${boundedActiveSuggestionIndex}`
                    : undefined
                }
                value={input}
                onChange={(event) => {
                  handleInputChange(event.target.value, event.currentTarget);
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
              {shouldShowAutocomplete ? (
                <SlashCommandAutocomplete
                  suggestions={autocompleteSuggestions}
                  activeIndex={boundedActiveSuggestionIndex}
                  onActiveIndexChange={setActiveSuggestionIndex}
                  onAccept={acceptAutocompleteSuggestion}
                />
              ) : null}
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

function SlashCommandAutocomplete({
  suggestions,
  activeIndex,
  onActiveIndexChange,
  onAccept,
}: {
  suggestions: SlashCommandAutocompleteSuggestion[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onAccept: (suggestion: SlashCommandAutocompleteSuggestion) => void;
}) {
  return (
    <div
      id="slash-command-autocomplete"
      role="listbox"
      aria-label="Slash command suggestions"
      className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-zinc-700/70 bg-zinc-900/95 text-sm shadow-xl shadow-black/35"
    >
      {suggestions.map((suggestion, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            id={`slash-command-suggestion-${index}`}
            key={`${suggestion.value}-${suggestion.detail}`}
            type="button"
            role="option"
            aria-selected={isActive}
            onMouseEnter={() => onActiveIndexChange(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onAccept(suggestion);
            }}
            className={`flex w-full items-start justify-between gap-4 px-3 py-2 text-left transition ${
              isActive
                ? "bg-amber-300/15 text-amber-100"
                : "text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
          >
            <span className="font-medium">{suggestion.label}</span>
            <span className="text-xs leading-5 text-zinc-400">{suggestion.detail}</span>
          </button>
        );
      })}
    </div>
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
