"use client";

import type { FormStats } from "@/lib/types";

function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Big-picture funnel, mirroring Typeform's Insights tab.
 *
 * Typeform also reports Views, which needs a page-view counter on the public
 * route. Nothing here tracks that, so the metric is omitted rather than
 * invented -- a fabricated number on a results page is worse than a missing one.
 */
export function InsightsPanel({ stats }: { stats: FormStats }) {
  const dropOff = stats.total_responses - stats.completed_responses;

  const metrics = [
    { label: "Starts", value: stats.total_responses, hint: "People who opened and began the form" },
    { label: "Submissions", value: stats.completed_responses, hint: "Reached the thank-you screen" },
    { label: "Drop-offs", value: dropOff, hint: "Began but never submitted" },
    { label: "Completion rate", value: `${stats.completion_rate}%`, hint: "Submissions ÷ starts" },
    {
      label: "Time to complete",
      value: duration(stats.avg_completion_seconds),
      hint: "Average, across submissions",
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-base font-semibold tracking-tight">Big picture</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-line bg-white p-4">
              <div className="text-2xl font-semibold tabular-nums tracking-tight">
                {metric.value}
              </div>
              <div className="mt-1 text-xs font-medium text-ink-soft">{metric.label}</div>
              <div className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">{metric.hint}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">Completion funnel</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Where people stop. A question with far fewer answers than the one before it is usually
          the one losing them.
        </p>

        <div className="mt-4 space-y-3">
          {stats.questions.map((question, index) => {
            const share = stats.total_responses
              ? (question.answered / stats.total_responses) * 100
              : 0;
            return (
              <div key={question.question_id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-ink">
                    <span className="mr-1.5 tabular-nums text-ink-muted">{index + 1}</span>
                    {question.title || "Untitled question"}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-muted">
                    {question.answered} · {Math.round(share)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${Math.min(share, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
