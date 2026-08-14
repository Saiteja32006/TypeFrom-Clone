"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { QuestionScreen } from "@/components/runner/QuestionScreen";
import { ThankYouScreen } from "@/components/runner/ThankYouScreen";
import { themeStyle } from "@/lib/theme";
import type { Form, Question } from "@/lib/types";

interface Props {
  open: boolean;
  form: Form;
  questions: Question[];
  onClose: () => void;
}

/**
 * Full-screen preview.
 *
 * Runs the real respondent components against the in-memory draft, so a form
 * can be walked through before it is published -- the public route only serves
 * published forms, and unsaved edits would not appear there anyway.
 *
 * Answers are kept in local state and never submitted; nothing here touches the
 * API, so previewing cannot pollute the response data.
 */
export function PreviewOverlay({ open, form, questions, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [done, setDone] = useState(false);

  const total = questions.length;

  useEffect(() => {
    if (open) {
      setIndex(0);
      setAnswers({});
      setDone(false);
    }
  }, [open]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        setDone(true);
        return i;
      }
      return i + 1;
    });
  }, [total]);

  const goBack = useCallback(() => {
    if (done) {
      setDone(false);
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
  }, [done]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // Arrows only: Enter belongs to the focused input, which advances itself.
      if (event.key === "ArrowDown") goNext();
      if (event.key === "ArrowUp") goBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, goNext, goBack]);

  if (!open) return null;

  const question = questions[index] ?? null;
  const progress = done ? 100 : total > 0 ? ((index + 1) / total) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-canvas"
      style={themeStyle(form.theme)}
      role="dialog"
      aria-modal="true"
      aria-label="Form preview"
    >
      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-black/[0.06]">
        <motion.div
          className="h-full bg-accent"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          Preview
        </span>
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-lg p-2 text-ink-muted transition hover:bg-black/[0.05] hover:text-ink focus-ring"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-1 items-center overflow-y-auto px-8 pb-24 sm:px-16">
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {done || !question ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ThankYouScreen title={form.thankyou_title} message={form.thankyou_message} />
              </motion.div>
            ) : (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <QuestionScreen
                  question={question}
                  index={index}
                  total={total}
                  value={answers[question.id]}
                  onChange={(value) =>
                    setAnswers((current) => ({ ...current, [question.id]: value }))
                  }
                  onSubmit={goNext}
                  isLast={index === total - 1}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 flex gap-1.5">
        <button
          onClick={goBack}
          disabled={index === 0 && !done}
          aria-label="Previous question"
          className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white transition disabled:opacity-30 focus-ring"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={goNext}
          disabled={done}
          aria-label="Next question"
          className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white transition disabled:opacity-30 focus-ring"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}
