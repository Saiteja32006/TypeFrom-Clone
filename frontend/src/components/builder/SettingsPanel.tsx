"use client";

import { useState } from "react";

import type { Form, FormTheme } from "@/lib/types";

interface Props {
  form: Form;
  onChange: (patch: { theme?: FormTheme; thankyou_title?: string; thankyou_message?: string }) => void;
}

/**
 * Theme + thank-you screen settings.
 *
 * The assignment lists these as placeholders, but the backend already persists
 * `theme`, `thankyou_title` and `thankyou_message`, so wiring them up properly
 * costs little and makes the respondent flow feel themed rather than fixed.
 */

// Named presets rather than a raw colour picker: Typeform ships curated themes,
// and a fixed set keeps contrast legible on the respondent screen.
const PRESETS: { name: string; theme: FormTheme }[] = [
  { name: "Ink", theme: { accent: "#1a1a1a", background: "#ffffff", text: "#1a1a1a" } },
  { name: "Cobalt", theme: { accent: "#2447f9", background: "#f4f6ff", text: "#16205c" } },
  { name: "Forest", theme: { accent: "#1c7f5a", background: "#f2f9f5", text: "#12352a" } },
  { name: "Ember", theme: { accent: "#d8542f", background: "#fdf5f1", text: "#4a1e11" } },
  { name: "Plum", theme: { accent: "#7b3fa0", background: "#faf5fd", text: "#33144a" } },
  { name: "Midnight", theme: { accent: "#7dd3fc", background: "#0f172a", text: "#e2e8f0" } },
];

export function SettingsPanel({ form, onChange }: Props) {
  const [title, setTitle] = useState(form.thankyou_title ?? "");
  const [message, setMessage] = useState(form.thankyou_message ?? "");

  const activeAccent = form.theme?.accent ?? PRESETS[0].theme.accent;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Theme</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => {
            const selected = preset.theme.accent === activeAccent;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChange({ theme: preset.theme })}
                aria-pressed={selected}
                className={`rounded-lg border p-2 text-left transition focus-ring ${
                  selected ? "border-ink" : "border-line hover:border-ink/30"
                }`}
              >
                <span
                  className="block h-8 w-full rounded"
                  style={{ background: preset.theme.background, border: "1px solid rgba(0,0,0,.08)" }}
                >
                  <span
                    className="ml-1.5 mt-1.5 block h-3 w-3 rounded-full"
                    style={{ background: preset.theme.accent }}
                  />
                </span>
                <span className="mt-1.5 block text-[11px] font-medium">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Thank-you screen
        </h3>
        <p className="mt-1 text-xs text-ink-muted">Shown once someone submits the form.</p>

        <label className="mt-3 block text-xs font-medium" htmlFor="ty-title">
          Headline
        </label>
        <input
          id="ty-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => onChange({ thankyou_title: title.trim() || "Thanks for completing this form" })}
          className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-sm focus-ring"
        />

        <label className="mt-3 block text-xs font-medium" htmlFor="ty-message">
          Message
        </label>
        <textarea
          id="ty-message"
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onBlur={() => onChange({ thankyou_message: message.trim() })}
          className="mt-1 w-full resize-none rounded-lg border border-line px-2.5 py-2 text-sm focus-ring"
        />
      </section>
    </div>
  );
}
