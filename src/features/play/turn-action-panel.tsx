"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  getSlashCommandAutocomplete,
  type SlashCommandAutocompleteSuggestion,
  type SlashCommandAutocompleteTarget,
} from "@/lib/director/slash-command-autocomplete";

type ActionMode = "act" | "story" | "guide";
type SubmitResult = "close" | "keep-open" | false;

type TurnActionPanelProps = {
  disabled: boolean;
  isSubmitting: boolean;
  notice: string | null;
  error: string | null;
  slashCommandTargets: SlashCommandAutocompleteTarget[];
  onActSubmit: (input: string) => Promise<SubmitResult>;
  onStorySubmit: (input: string) => Promise<SubmitResult>;
  onGuideSubmit: (input: string) => Promise<SubmitResult>;
  onPass: () => Promise<boolean>;
};

export function TurnActionPanel({
  disabled,
  isSubmitting,
  notice,
  error,
  slashCommandTargets,
  onActSubmit,
  onStorySubmit,
  onGuideSubmit,
  onPass,
}: TurnActionPanelProps) {
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<ActionMode | null>(null);
  const [isInputClosing, setIsInputClosing] = useState(false);
  const [isTurnControlsSettling, setIsTurnControlsSettling] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const directorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const inputCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeModeConfig = activeMode ? ACTION_MODE_CONFIG[activeMode] : null;
  const autocompleteSuggestions = useMemo(
    () => getSlashCommandAutocomplete(input, slashCommandTargets),
    [input, slashCommandTargets],
  );
  const boundedActiveSuggestionIndex = Math.min(
    activeSuggestionIndex,
    Math.max(autocompleteSuggestions.length - 1, 0),
  );
  const shouldShowAutocomplete =
    activeMode === "act" &&
    isAutocompleteOpen &&
    autocompleteSuggestions.length > 0 &&
    !isSubmitting;
  const activeSuggestion = shouldShowAutocomplete
    ? autocompleteSuggestions[boundedActiveSuggestionIndex]
    : undefined;

  useEffect(() => {
    if (!activeMode || isSubmitting) {
      return;
    }

    if (directorInputRef.current) {
      resizeDirectorInput(directorInputRef.current);
      directorInputRef.current.focus();
    }
  }, [activeMode, isSubmitting]);

  useEffect(() => {
    return () => {
      if (inputCloseTimer.current) {
        clearTimeout(inputCloseTimer.current);
      }
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitActionInput();
  }

  async function submitActionInput() {
    const submittedInput = input.trim();
    if (!activeMode || !submittedInput || isSubmitting || disabled) {
      return;
    }

    setInput("");
    setIsAutocompleteOpen(false);
    const result = await submitForMode(activeMode, submittedInput);
    if (result === "close") {
      setActiveMode(null);
      setIsInputClosing(false);
      setIsTurnControlsSettling(false);
      return;
    }
    if (result === "keep-open") {
      setActiveMode(activeMode);
      setIsInputClosing(false);
      setIsTurnControlsSettling(false);
      return;
    }

    setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
    setIsAutocompleteOpen(false);
    setActiveMode(activeMode);
  }

  function submitForMode(mode: ActionMode, submittedInput: string) {
    if (mode === "story") {
      return onStorySubmit(submittedInput);
    }
    if (mode === "guide") {
      return onGuideSubmit(submittedInput);
    }
    return onActSubmit(submittedInput);
  }

  function handleActionMode(mode: ActionMode) {
    if (isSubmitting || disabled) {
      return;
    }

    if (inputCloseTimer.current) {
      clearTimeout(inputCloseTimer.current);
      inputCloseTimer.current = null;
    }
    setIsTurnControlsSettling(false);
    setIsInputClosing(false);
    setActiveMode(mode);
    setIsAutocompleteOpen(false);
    setActiveSuggestionIndex(0);
  }

  function handleCancelAction() {
    if (isSubmitting || isInputClosing) {
      return;
    }

    setIsInputClosing(true);
    setIsAutocompleteOpen(false);
    inputCloseTimer.current = setTimeout(() => {
      setActiveMode(null);
      setInput("");
      setIsInputClosing(false);
      inputCloseTimer.current = null;
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
    setIsAutocompleteOpen(activeMode === "act" && value.trimStart().startsWith("/"));
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
          {activeModeConfig ? (
            <div
              className={`${isInputClosing ? "turn-response-area-exit" : "turn-response-area-enter"} relative mt-3`}
            >
              <textarea
                id={activeModeConfig.inputId}
                ref={directorInputRef}
                aria-labelledby="turn-action-prompt"
                aria-describedby={activeModeConfig.helpId}
                aria-autocomplete={activeMode === "act" ? "list" : "none"}
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
                placeholder={activeModeConfig.placeholder}
                rows={1}
                disabled={disabled}
                className="block h-24 min-h-24 w-full resize-none overflow-hidden rounded-xl bg-zinc-700/45 py-3 pl-4 pr-12 text-left text-sm leading-6 text-zinc-100 outline-none ring-1 ring-transparent transition placeholder:text-zinc-500 focus:bg-zinc-700/65 focus-visible:ring-2 focus-visible:ring-amber-300/80"
              />
              <p id={activeModeConfig.helpId} className="mt-2 text-xs leading-5 text-zinc-500">
                {activeModeConfig.help}
              </p>
              <button
                id={activeModeConfig.closeButtonId}
                type="button"
                aria-label="Return to turn actions"
                onClick={handleCancelAction}
                disabled={isSubmitting || isInputClosing}
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
              className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-start"
              onPointerLeave={() => setIsTurnControlsSettling(false)}
            >
              <button
                id="act-turn-button"
                type="button"
                onClick={() => handleActionMode("act")}
                disabled={disabled}
                className={`flex h-12 w-full items-center justify-center rounded-xl bg-zinc-700/80 text-sm font-semibold text-zinc-100 transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-28 ${isTurnControlsSettling ? "" : "hover:bg-zinc-200 hover:text-zinc-950"}`}
              >
                Act
              </button>
              <button
                id="pass-turn-button"
                type="button"
                onClick={handlePass}
                disabled={disabled}
                className={`flex h-12 w-full items-center justify-center rounded-xl bg-zinc-700/80 text-sm font-semibold text-zinc-100 transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-28 ${isTurnControlsSettling ? "" : "hover:bg-zinc-200 hover:text-zinc-950"}`}
              >
                Pass
              </button>
              <button
                id="story-turn-button"
                type="button"
                onClick={() => handleActionMode("story")}
                disabled={disabled}
                className={`flex h-12 w-full items-center justify-center rounded-xl bg-zinc-700/80 text-sm font-semibold text-zinc-100 transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-28 ${isTurnControlsSettling ? "" : "hover:bg-zinc-200 hover:text-zinc-950"}`}
              >
                Story
              </button>
              <button
                id="guide-turn-button"
                type="button"
                onClick={() => handleActionMode("guide")}
                disabled={disabled}
                className={`flex h-12 w-full items-center justify-center rounded-xl bg-zinc-700/80 text-sm font-semibold text-zinc-100 transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-28 ${isTurnControlsSettling ? "" : "hover:bg-zinc-200 hover:text-zinc-950"}`}
              >
                Guide
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

const ACTION_MODE_CONFIG: Record<
  ActionMode,
  {
    inputId: string;
    closeButtonId: string;
    helpId: string;
    placeholder: string;
    help: string;
  }
> = {
  act: {
    inputId: "director-input",
    closeButtonId: "close-act-input-button",
    helpId: "act-input-help",
    placeholder: "Type your response...",
    help: "Act resolves what your character does next. Slash utilities work here.",
  },
  story: {
    inputId: "story-action-input",
    closeButtonId: "close-story-input-button",
    helpId: "story-input-help",
    placeholder: "Add a scene beat...",
    help: "Story becomes accepted scene prose before the next resolving turn.",
  },
  guide: {
    inputId: "guide-action-input",
    closeButtonId: "close-guide-input-button",
    helpId: "guide-input-help",
    placeholder: "Steer the next narration...",
    help: "Guide is private direction for the Game Master, not visible story text.",
  },
};

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
