"use client";

import { AlertCircle, ArrowRight, Check } from "lucide-react";

import { InlineTextarea } from "@/components/builder/InlineTextarea";
import { AnswerInput } from "@/components/runner/AnswerInput";
import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  index: number;
  total: number;
  value: unknown;
  error?: string | null;
  onChange: (value: unknown) => void;
  onSubmit: () => void;
  /** Preview mode renders the same layout but ignores interaction. */
  preview?: boolean;
  isLast?: boolean;
  /** Builder only: edit the question straight on the preview, as Typeform does. */
  onEditTitle?: (title: string) => void;
  onEditDescription?: (description: string) => void;
}

/**
 * One question, full width of its container.
 *
 * Typeform's signature layout: a small numbered eyebrow, the question as the
 * largest type on screen, the input directly beneath, and a confirm button
 * paired with a keyboard hint.
 */
export function QuestionScreen({
  question,
  index,
  total,
  value,
  error,
  onChange,
  onSubmit,
  preview = false,
  isLast = false,
  onEditTitle,
  onEditDescription,
}: Props) {
  const editable = Boolean(onEditTitle);
  const showButton = !["multiple_choice", "yes_no", "rating"].includes(question.type)
    || Boolean(question.settings?.allow_multiple);

  return (
    <div className="w-full">
      {/* Typeform's eyebrow is just the number and an arrow -- no "of N", which
          would duplicate what the progress bar already communicates. */}
      <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-accent">
        <span className="tabular-nums">{index + 1}</span>
        <ArrowRight size={13} aria-hidden />
      </div>

      {/* Required is conveyed to assistive tech on the input itself and enforced
          on submit. Typeform shows no asterisk here, so neither do we. */}
      {editable ? (
        <InlineTextarea
          value={question.title}
          placeholder="Your question here..."
          onChange={(next) => onEditTitle?.(next)}
          ariaLabel="Question title"
          className="-mx-2 px-2 text-question font-medium text-ink sm:text-question-lg"
        />
      ) : (
        <h2 className="text-question font-medium text-ink sm:text-question-lg">
          {question.title.trim() || "Untitled question"}
        </h2>
      )}

      {editable ? (
        <InlineTextarea
          value={question.description ?? ""}
          placeholder="Description (optional)"
          onChange={(next) => onEditDescription?.(next)}
          ariaLabel="Question description"
          className="-mx-2 mt-2 px-2 text-base text-ink-soft"
        />
      ) : (
        question.description && (
          <p className="mt-3 text-base text-ink-soft">{question.description}</p>
        )
      )}

      <div className="mt-8">
        <AnswerInput
          question={question}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          autoFocus={!preview}
          disabled={preview}
        />
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-danger" role="alert">
          <AlertCircle size={15} aria-hidden />
          {error}
        </p>
      )}

      {showButton && (
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={preview}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-base font-medium text-white transition hover:bg-black disabled:opacity-50 focus-ring"
          >
            {isLast ? "Submit" : "OK"}
            <Check size={16} aria-hidden />
          </button>
          <span className="hidden text-xs text-ink-muted sm:inline">
            press <strong className="font-semibold">Enter</strong> ↵
          </span>
        </div>
      )}
    </div>
  );
}
