"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { QUESTION_TYPES } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";

interface Props {
  value: QuestionType;
  /** True once the form has responses, which makes a switch destructive. */
  hasResponses?: boolean;
  onChange: (type: QuestionType) => void;
}

const ALL = Object.entries(QUESTION_TYPES) as [QuestionType, (typeof QUESTION_TYPES)[QuestionType]][];

/**
 * Answer-type picker.
 *
 * Typeform lets a creator change a question's type after the fact, from a
 * searchable dropdown in the inspector. The search box earns its place at eight
 * types and would earn it more at twenty.
 */
export function TypePicker({ value, hasResponses = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = QUESTION_TYPES[value];
  const matches = ALL.filter(([, meta]) =>
    meta.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-2 py-2 text-left text-sm transition hover:border-ink/30 focus-ring"
      >
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded ${current.tone}`}>
          <current.icon size={13} aria-hidden />
        </span>
        <span className="flex-1 truncate">{current.label}</span>
        <ChevronDown size={15} className="shrink-0 text-ink-muted" aria-hidden />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center gap-2 border-b border-line px-2.5 py-2">
            <Search size={14} className="shrink-0 text-ink-muted" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search types"
              aria-label="Search question types"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
            />
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
            {matches.length === 0 && (
              <li className="px-2.5 py-3 text-center text-xs text-ink-muted">No matching type</li>
            )}
            {matches.map(([type, meta]) => (
              <li key={type}>
                <button
                  type="button"
                  role="option"
                  aria-selected={type === value}
                  onClick={() => {
                    if (type !== value) onChange(type);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                    type === value ? "bg-black/[0.04]" : "hover:bg-black/[0.03]"
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded ${meta.tone}`}>
                    <meta.icon size={13} aria-hidden />
                  </span>
                  <span className="flex-1 truncate">{meta.label}</span>
                  {type === value && <Check size={14} className="shrink-0 text-ink-soft" />}
                </button>
              </li>
            ))}
          </ul>

          {hasResponses && (
            <p className="border-t border-line bg-black/[0.02] px-2.5 py-2 text-[11px] leading-relaxed text-ink-muted">
              This form already has responses. Changing the type keeps them, but old answers may
              not match the new format.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
