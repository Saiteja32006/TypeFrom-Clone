"use client";

import { ThankYouScreen } from "@/components/runner/ThankYouScreen";
import { themeStyle } from "@/lib/theme";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { QuestionScreen } from "@/components/runner/QuestionScreen";
import { ApiError, api } from "@/lib/api";
import { isBlank, validateAnswer } from "@/lib/questionTypes";
import type { PublicForm } from "@/lib/types";

type Stage = "welcome" | "questions" | "done";

interface Props {
  form: PublicForm;
}

export function FormRunner({ form }: Props) {
  const reduceMotion = useReducedMotion();

  const [stage, setStage] = useState<Stage>("welcome");
  const [index, setIndex] = useState(0);
  // 1 when moving forward, -1 when going back; drives the slide direction.
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [thanks, setThanks] = useState({
    title: form.thankyou_title,
    message: form.thankyou_message,
  });

  const questions = form.questions;
  const question = questions[index];
  const total = questions.length;
  const progress = stage === "done" ? 100 : Math.round((index / Math.max(total, 1)) * 100);

  const setAnswer = useCallback((questionId: number, value: unknown) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setErrors((current) => {
      if (!current[questionId]) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const payload = Object.entries(answers)
        .filter(([, value]) => !isBlank(value))
        .map(([questionId, value]) => ({ question_id: Number(questionId), value }));

      const ack = await api.submitResponse(form.slug, payload, true);
      setThanks({ title: ack.thankyou_title, message: ack.thankyou_message });
      setStage("done");
    } catch (err) {
      // The server revalidates everything; map its per-question errors back onto
      // the flow and jump to the first question that failed.
      if (err instanceof ApiError && err.validation) {
        const mapped: Record<number, string> = {};
        for (const [key, message] of Object.entries(err.validation.errors)) {
          mapped[Number(key)] = message;
        }
        setErrors(mapped);
        const firstBad = questions.findIndex((q) => mapped[q.id]);
        if (firstBad >= 0) {
          setDirection(-1);
          setIndex(firstBad);
        }
      } else {
        setErrors({ [-1]: err instanceof ApiError ? err.message : "Couldn't submit your answers" });
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, form.slug, questions]);

  const goNext = useCallback(() => {
    if (!question) return;

    const message = validateAnswer(question, answers[question.id]);
    if (message) {
      setErrors((current) => ({ ...current, [question.id]: message }));
      return;
    }

    if (index === total - 1) {
      void submit();
      return;
    }
    setDirection(1);
    setIndex((i) => i + 1);
  }, [answers, index, question, submit, total]);

  // Arrow keys move between questions; Enter is handled by each input so that
  // long text can still insert newlines.
  useEffect(() => {
    if (stage !== "questions") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

      if (event.key === "ArrowDown" && !typing) {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowUp" && !typing) {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage, goNext, goBack]);

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: direction > 0 ? 56 : -56 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: direction > 0 ? -56 : 56 },
      };

  return (
    <div
      className="relative flex min-h-screen flex-col bg-canvas text-ink"
      // The form's theme overrides the palette variables for this subtree only,
      // so the respondent screen is themed while the rest of the app is not.
      style={themeStyle(form.theme)}
    >
      <div className="fixed inset-x-0 top-0 z-30 h-1 bg-black/[0.06]">
        <motion.div
          className="h-full bg-accent"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" initial={false}>
            {stage === "welcome" && (
              <motion.div key="welcome" {...slide} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
                <h1 className="text-question font-semibold tracking-tight sm:text-question-lg">
                  {form.title}
                </h1>
                {form.description && (
                  <p className="mt-4 text-lg text-ink-soft">{form.description}</p>
                )}
                <div className="mt-10 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setDirection(1);
                      setStage("questions");
                    }}
                    disabled={total === 0}
                    className="rounded-lg bg-ink px-6 py-3 text-base font-medium text-white transition hover:bg-black disabled:opacity-40 focus-ring"
                  >
                    {total === 0 ? "No questions yet" : "Start"}
                  </button>
                  {total > 0 && (
                    <span className="text-sm text-ink-muted">
                      {total} {total === 1 ? "question" : "questions"} · takes about{" "}
                      {Math.max(1, Math.round(total * 0.25))} min
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {stage === "questions" && question && (
              <motion.div
                key={question.id}
                {...slide}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <QuestionScreen
                  question={question}
                  index={index}
                  total={total}
                  value={answers[question.id]}
                  error={errors[question.id]}
                  onChange={(value) => setAnswer(question.id, value)}
                  onSubmit={goNext}
                  isLast={index === total - 1}
                />
                {errors[-1] && (
                  <p className="mt-4 text-sm font-medium text-danger" role="alert">
                    {errors[-1]}
                  </p>
                )}
              </motion.div>
            )}

            {stage === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <ThankYouScreen title={thanks.title} message={thanks.message} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {stage === "questions" && (
        <div className="fixed bottom-6 right-6 z-20 flex items-center gap-1.5">
          {submitting && <Loader2 size={16} className="mr-1 animate-spin text-ink-muted" />}
          <button
            onClick={goBack}
            disabled={index === 0}
            aria-label="Previous question"
            className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white transition hover:bg-black disabled:opacity-30 focus-ring"
          >
            <ChevronUp size={17} />
          </button>
          <button
            onClick={goNext}
            disabled={submitting}
            aria-label="Next question"
            className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white transition hover:bg-black disabled:opacity-30 focus-ring"
          >
            <ChevronDown size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
