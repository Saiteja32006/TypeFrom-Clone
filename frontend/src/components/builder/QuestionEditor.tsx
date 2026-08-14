"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { TypePicker } from "@/components/builder/TypePicker";
import { QUESTION_TYPES } from "@/lib/questionTypes";
import type { Option, Question, QuestionSettings } from "@/lib/types";

interface Props {
  question: Question | null;
  /** Debounced upstream; safe to call on every keystroke. */
  onChange: (patch: Partial<Question>) => void;
  onOptionsChange: (options: { id?: number; label: string }[]) => void;
  /** Drives the warning shown when switching type on a form with data. */
  hasResponses?: boolean;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm placeholder:text-ink-muted focus:border-ink/30 focus-ring";

export function QuestionEditor({ question, onChange, onOptionsChange, hasResponses }: Props) {
  // Local mirror so typing stays responsive; synced when the selection changes.
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    setOptions(question?.options ?? []);
  }, [question?.id, question?.options]);

  if (!question) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="max-w-[190px] text-[13px] leading-relaxed text-ink-muted">
          Select a question to edit its settings.
        </p>
      </div>
    );
  }

  const meta = QUESTION_TYPES[question.type];
  const settings: QuestionSettings = question.settings ?? {};

  const patchSettings = (patch: QuestionSettings) =>
    onChange({ settings: { ...settings, ...patch } });

  function commitOptions(next: Option[]) {
    setOptions(next);
    // Existing options keep their id so the backend updates in place and
    // preserves the response tallies already collected against them.
    onOptionsChange(next.map((o) => (o.id > 0 ? { id: o.id, label: o.label } : { label: o.label })));
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 border-b border-line pb-4">
        <span className="mb-1.5 block text-xs font-medium text-ink-soft">Answer type</span>
        <TypePicker
          value={question.type}
          hasResponses={hasResponses}
          onChange={(type) => onChange({ type })}
        />
      </div>

      <div className="space-y-4">
        <Field label="Question">
          <textarea
            value={question.title}
            onChange={(event) => onChange({ title: event.target.value })}
            rows={2}
            placeholder="What would you like to ask?"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Description">
          <input
            value={question.description ?? ""}
            onChange={(event) => onChange({ description: event.target.value || null })}
            placeholder="Optional help text"
            className={inputClass}
          />
        </Field>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <span className="text-sm">Required</span>
          <input
            type="checkbox"
            checked={question.is_required}
            onChange={(event) => onChange({ is_required: event.target.checked })}
            className="h-4 w-4 accent-ink focus-ring"
          />
        </label>

        {meta.hasOptions && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Choices</span>
            <div className="space-y-1.5">
              {options.map((option, index) => (
                <div key={option.id || `new-${index}`} className="flex items-center gap-1.5">
                  <GripVertical size={14} className="shrink-0 text-ink-muted" aria-hidden />
                  <input
                    value={option.label}
                    onChange={(event) => {
                      const next = [...options];
                      next[index] = { ...option, label: event.target.value };
                      commitOptions(next);
                    }}
                    aria-label={`Choice ${index + 1}`}
                    className={inputClass}
                  />
                  <button
                    onClick={() => commitOptions(options.filter((_, i) => i !== index))}
                    disabled={options.length <= 1}
                    aria-label={`Remove choice ${index + 1}`}
                    className="rounded p-1 text-ink-muted transition hover:text-danger disabled:opacity-30 focus-ring"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                commitOptions([
                  ...options,
                  { id: 0, label: `Option ${options.length + 1}`, position: options.length },
                ])
              }
              className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition hover:text-ink focus-ring"
            >
              <Plus size={14} />
              Add choice
            </button>
          </div>
        )}

        {question.type === "multiple_choice" && (
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2.5">
            <span className="text-sm">Allow multiple answers</span>
            <input
              type="checkbox"
              checked={Boolean(settings.allow_multiple)}
              onChange={(event) => patchSettings({ allow_multiple: event.target.checked })}
              className="h-4 w-4 accent-ink focus-ring"
            />
          </label>
        )}

        {question.type === "rating" && (
          <Field label="Scale">
            <select
              value={settings.max_rating ?? 5}
              onChange={(event) => patchSettings({ max_rating: Number(event.target.value) })}
              className={inputClass}
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  1 to {n}
                </option>
              ))}
            </select>
          </Field>
        )}

        {question.type === "number" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Minimum">
              <input
                type="number"
                value={settings.min ?? ""}
                onChange={(event) =>
                  patchSettings({ min: event.target.value === "" ? undefined : Number(event.target.value) })
                }
                placeholder="None"
                className={inputClass}
              />
            </Field>
            <Field label="Maximum">
              <input
                type="number"
                value={settings.max ?? ""}
                onChange={(event) =>
                  patchSettings({ max: event.target.value === "" ? undefined : Number(event.target.value) })
                }
                placeholder="None"
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {(question.type === "short_text" || question.type === "long_text") && (
          <Field label="Character limit">
            <input
              type="number"
              value={settings.max_length ?? ""}
              onChange={(event) =>
                patchSettings({
                  max_length: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
              placeholder="None"
              className={inputClass}
            />
          </Field>
        )}
      </div>
    </div>
  );
}
