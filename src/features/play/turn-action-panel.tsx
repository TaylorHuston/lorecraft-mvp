"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
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
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const directorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const autocompleteSuggestions = useMemo(
    () => getSlashCommandAutocomplete(input, slashCommandTargets),
    [input, slashCommandTargets],
  );
  const boundedActiveSuggestionIndex = Math.min(
    activeSuggestionIndex,
    Math.max(autocompleteSuggestions.length - 1, 0),
  );
  const shouldShowAutocomplete =
    isAutocompleteOpen &&
    autocompleteSuggestions.length > 0 &&
    !isSubmitting;
  const activeSuggestion = shouldShowAutocomplete
    ? autocompleteSuggestions[boundedActiveSuggestionIndex]
    : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitActionInput("act");
  }

  async function submitActionInput(mode: ActionMode) {
    const submittedInput = input.trim();
    if (!submittedInput || isSubmitting || disabled) {
      return;
    }

    setInput("");
    setIsAutocompleteOpen(false);
    const result = await submitForMode(mode, submittedInput);
    if (result === "close" || result === "keep-open") {
      if (directorInputRef.current) {
        resetDirectorInputHeight(directorInputRef.current);
      }
      return;
    }

    setInput((currentInput) => restoreSubmittedInput(currentInput, submittedInput));
    setIsAutocompleteOpen(false);
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

  return (
    <form
      id="narrative-input-form"
      onSubmit={handleSubmit}
      className="relative min-w-0 shrink-0 border-2 border-zinc-700 bg-transparent px-4 py-3 sm:px-5"
    >
      <p id="turn-action-prompt" className="text-left text-[1.08rem] italic leading-8 text-zinc-200">
        What do you do?
      </p>
      <div className="relative mt-2">
        <textarea
          id="director-input"
          ref={directorInputRef}
          aria-labelledby="turn-action-prompt"
          aria-describedby="turn-action-input-help"
          aria-autocomplete="list"
          aria-controls={shouldShowAutocomplete ? "slash-command-autocomplete" : undefined}
          aria-activedescendant={
            shouldShowAutocomplete
              ? `slash-command-suggestion-${boundedActiveSuggestionIndex}`
              : undefined
          }
          value={input}
          onChange={(event) => handleInputChange(event.target.value, event.currentTarget)}
          onKeyDown={handleInputKeyDown}
          placeholder="Type your response..."
          rows={2}
          disabled={disabled || isSubmitting}
          className="block min-h-20 max-h-60 w-full resize-none overflow-y-auto rounded-sm border-2 border-zinc-600 bg-zinc-950/40 px-3 py-2 text-left text-base leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/80 sm:text-sm"
        />
        {shouldShowAutocomplete ? (
          <SlashCommandAutocomplete
            suggestions={autocompleteSuggestions}
            activeIndex={boundedActiveSuggestionIndex}
            onActiveIndexChange={setActiveSuggestionIndex}
            onAccept={acceptAutocompleteSuggestion}
          />
        ) : null}
      </div>
      <p id="turn-action-input-help" className="mt-2 text-xs leading-5 text-zinc-500">
        Enter submits as Act. Choose Story or Guide to use the same text differently.
      </p>
      <div id="turn-controls" className="mt-3 grid grid-cols-4 gap-2">
        <TurnActionButton id="act-turn-button" type="submit" disabled={disabled || isSubmitting}>
          Act
        </TurnActionButton>
        <TurnActionButton
          id="story-turn-button"
          type="button"
          disabled={disabled || isSubmitting}
          onClick={() => void submitActionInput("story")}
        >
          Story
        </TurnActionButton>
        <TurnActionButton
          id="guide-turn-button"
          type="button"
          disabled={disabled || isSubmitting}
          onClick={() => void submitActionInput("guide")}
        >
          Guide
        </TurnActionButton>
        <TurnActionButton
          id="pass-turn-button"
          type="button"
          disabled={disabled || isSubmitting}
          onClick={() => void handlePass()}
        >
          Pass
        </TurnActionButton>
      </div>
      <div
        id="async-status-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {isSubmitting ? <TurnPendingPlaceholder /> : null}
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

type DirectorInputSizingTarget = {
  scrollHeight: number;
  style: {
    height: string;
    overflowY: string;
  };
};

export function resizeDirectorInput(textarea: DirectorInputSizingTarget) {
  textarea.style.height = "auto";
  const height = Math.min(240, Math.max(80, textarea.scrollHeight));
  textarea.style.height = `${height}px`;
  textarea.style.overflowY = textarea.scrollHeight > 240 ? "auto" : "hidden";
}

export function resetDirectorInputHeight(textarea: DirectorInputSizingTarget) {
  textarea.style.height = "";
  textarea.style.overflowY = "hidden";
}

export function restoreSubmittedInput(currentInput: string, submittedInput: string) {
  return currentInput.trim() ? currentInput : submittedInput;
}

function TurnActionButton({
  id,
  type,
  disabled,
  onClick,
  children,
}: {
  id: string;
  type: "submit" | "button";
  disabled: boolean;
  onClick?: () => void;
  children: string;
}) {
  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-center rounded-sm border-2 border-zinc-600 bg-transparent px-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-200 hover:bg-zinc-200 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
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
      className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-sm border-2 border-zinc-700 bg-zinc-950 text-sm"
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
            className={`flex min-h-11 w-full items-start justify-between gap-4 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/80 ${
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
        <span className="size-2 rounded-full bg-amber-300/90 motion-safe:animate-pulse [animation-delay:0ms]" />
        <span className="size-2 rounded-full bg-amber-300/70 motion-safe:animate-pulse [animation-delay:150ms]" />
        <span className="size-2 rounded-full bg-amber-300/50 motion-safe:animate-pulse [animation-delay:300ms]" />
      </span>
      <span aria-hidden="true" className="text-zinc-400">
        The story is turning...
      </span>
    </div>
  );
}
