"use client";

import { motion } from "framer-motion";
import { Monitor } from "lucide-react";

import { QuestionScreen } from "@/components/runner/QuestionScreen";
import { ThankYouScreen } from "@/components/runner/ThankYouScreen";
import { themeStyle } from "@/lib/theme";
import type { Form, Question } from "@/lib/types";

interface Props {
  question: Question | null;
  index: number;
  total: number;
  form: Form;
  /** Preview the end screen instead of a question. */
  showEnding?: boolean;
  onEditTitle?: (title: string) => void;
  onEditDescription?: (description: string) => void;
}

/**
 * Live preview.
 *
 * Renders the exact component the respondent flow uses, in a disabled state,
 * rather than a lookalike -- so the preview cannot drift from the real thing.
 *
 * Framed as a browser window filling the canvas: Typeform previews the form at
 * the proportions a respondent will actually see, and a small centred card gave
 * a misleading impression of a screen dominated by whitespace.
 */
export function PreviewPane({
  question,
  index,
  total,
  form,
  showEnding = false,
  onEditTitle,
  onEditDescription,
}: Props) {
  const progress = showEnding ? 100 : total > 0 ? ((index + 1) / total) * 100 : 0;

  return (
    <div className="flex h-full flex-col bg-canvas px-4 pb-4 lg:px-6 lg:pb-6">
      <div className="flex shrink-0 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-ink-muted">
        <Monitor size={13} aria-hidden />
        Live preview
      </div>
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card">
        {/* Chrome, so the preview reads as "this is the public page". */}
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-black/[0.09]" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/[0.09]" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/[0.09]" />
          </span>
          <span className="mx-auto max-w-[60%] truncate rounded-md bg-black/[0.04] px-3 py-1 text-[11px] text-ink-muted">
            /f/{form.slug}
          </span>
        </div>

        {/* The themed surface. Same variables the respondent flow sets, so a
            theme change in Settings shows up here immediately. */}
        <div
          className="relative flex min-h-0 flex-1 flex-col bg-canvas"
          style={themeStyle(form.theme)}
        >
          <div className="absolute inset-x-0 top-0 z-10 h-1 bg-black/[0.06]">
            <motion.div
              className="h-full bg-accent"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className="flex flex-1 items-center overflow-y-auto px-8 py-12 sm:px-14">
            {showEnding ? (
              <motion.div
                key="ending"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <ThankYouScreen title={form.thankyou_title} message={form.thankyou_message} />
              </motion.div>
            ) : question ? (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <QuestionScreen
                  question={question}
                  index={index}
                  total={total}
                  value={undefined}
                  onChange={() => undefined}
                  onSubmit={() => undefined}
                  preview
                  isLast={index === total - 1}
                  onEditTitle={onEditTitle}
                  onEditDescription={onEditDescription}
                />
              </motion.div>
            ) : (
              <p className="w-full text-center text-sm text-ink-muted">
                Add a question to see it here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
