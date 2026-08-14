"use client";

/**
 * Answer inputs for the respondent experience.
 *
 * Shared by the public runner and the builder's live preview, so what a creator
 * sees while editing is literally the same component a respondent will use.
 */

import { Check, Star } from "lucide-react";
import { useEffect, useRef } from "react";

import { CHOICE_KEYS, QUESTION_TYPES } from "@/lib/questionTypes";
import type { Question } from "@/lib/types";

export interface AnswerInputProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Enter advances, except in long text where it inserts a newline. */
  onSubmit: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function AnswerInput(props: AnswerInputProps) {
  switch (props.question.type) {
    case "long_text":
      return <LongTextInput {...props} />;
    case "multiple_choice":
      return <ChoiceInput {...props} />;
    case "dropdown":
      return <DropdownInput {...props} />;
    case "yes_no":
      return <YesNoInput {...props} />;
    case "rating":
      return <RatingInput {...props} />;
    default:
      return <TextInput {...props} />;
  }
}

function TextInput({ question, value, onChange, onSubmit, autoFocus, disabled }: AnswerInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, question.id]);

  const inputType = question.type === "email" ? "email" : question.type === "number" ? "number" : "text";

  return (
    <input
      ref={ref}
      type={inputType}
      inputMode={question.type === "number" ? "decimal" : undefined}
      value={(value as string) ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onSubmit();
        }
      }}
      placeholder={question.settings?.placeholder ?? QUESTION_TYPES[question.type].placeholder}
      className="runner-input"
    />
  );
}

function LongTextInput({ question, value, onChange, onSubmit, autoFocus, disabled }: AnswerInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, question.id]);

  return (
    <div>
      <textarea
        ref={ref}
        rows={3}
        value={(value as string) ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Shift+Enter is the newline here, so plain Enter can still advance.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={QUESTION_TYPES.long_text.placeholder}
        className="runner-input resize-none"
      />
      <p className="mt-2 text-xs text-ink-muted">Shift + Enter to add a new line</p>
    </div>
  );
}

function ChoiceInput({ question, value, onChange, onSubmit, disabled }: AnswerInputProps) {
  const multiple = Boolean(question.settings?.allow_multiple);
  const selected: number[] = multiple
    ? Array.isArray(value)
      ? (value as number[])
      : []
    : value != null
      ? [value as number]
      : [];

  function toggle(optionId: number) {
    if (disabled) return;
    if (!multiple) {
      onChange(optionId);
      // Single-select advances on its own, as Typeform does.
      window.setTimeout(onSubmit, 220);
      return;
    }
    onChange(
      selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId],
    );
  }

  // Letter shortcuts: pressing "b" picks the second choice.
  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const index = CHOICE_KEYS.indexOf(event.key.toUpperCase());
      if (index >= 0 && index < question.options.length) {
        event.preventDefault();
        toggle(question.options[index].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="space-y-2.5">
      {question.options.map((option, index) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => toggle(option.id)}
            className={`runner-choice ${isSelected ? "runner-choice-selected" : ""}`}
          >
            <span className="choice-key">{CHOICE_KEYS[index]}</span>
            <span className="flex-1">{option.label}</span>
            {isSelected && <Check size={18} className="text-accent" aria-hidden />}
          </button>
        );
      })}
      {multiple && (
        <p className="pt-1 text-xs text-ink-muted">Choose as many as you like</p>
      )}
    </div>
  );
}

function DropdownInput({ question, value, onChange, onSubmit, disabled }: AnswerInputProps) {
  return (
    <select
      value={(value as number) ?? ""}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value ? Number(event.target.value) : null);
      }}
      onKeyDown={(event) => event.key === "Enter" && onSubmit()}
      className="w-full border-b-2 border-ink/25 bg-transparent pb-2 text-2xl text-ink focus:border-accent focus:outline-none sm:text-3xl"
    >
      <option value="">{QUESTION_TYPES.dropdown.placeholder}</option>
      {question.options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function YesNoInput({ value, onChange, onSubmit, disabled }: AnswerInputProps) {
  function pick(next: boolean) {
    if (disabled) return;
    onChange(next);
    window.setTimeout(onSubmit, 220);
  }

  return (
    <div className="flex gap-3">
      {[
        { label: "Yes", key: "Y", flag: true },
        { label: "No", key: "N", flag: false },
      ].map((choice) => (
        <button
          key={choice.label}
          type="button"
          disabled={disabled}
          aria-pressed={value === choice.flag}
          onClick={() => pick(choice.flag)}
          className={`runner-choice w-32 ${value === choice.flag ? "runner-choice-selected" : ""}`}
        >
          <span className="choice-key">{choice.key}</span>
          <span>{choice.label}</span>
        </button>
      ))}
    </div>
  );
}

function RatingInput({ question, value, onChange, onSubmit, disabled }: AnswerInputProps) {
  const max = question.settings?.max_rating ?? 5;
  const current = typeof value === "number" ? value : 0;
  // Above 5 points a star row stops being readable, so switch to numbered tiles.
  const asStars = max <= 5;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} out of ${max}`}
            aria-pressed={current === n}
            onClick={() => {
              onChange(n);
              window.setTimeout(onSubmit, 220);
            }}
            className={
              asStars
                ? `rounded-lg p-1.5 transition hover:scale-110 ${
                    current >= n ? "text-accent" : "text-ink/25 hover:text-ink/40"
                  }`
                : `grid h-12 w-12 place-items-center rounded-lg border-2 text-base font-medium transition ${
                    current >= n
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-ink/20 text-ink-muted hover:border-ink/40"
                  }`
            }
          >
            {asStars ? <Star size={38} fill={current >= n ? "currentColor" : "none"} strokeWidth={1.5} /> : n}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        1 = poor · {max} = excellent
      </p>
    </div>
  );
}
