"use client";

import { QUESTION_TYPES } from "@/lib/questionTypes";
import type { FormStats, QuestionSummary } from "@/lib/types";

function Bar({ label, count, percentage }: { label: string; count: number; percentage: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-ink">{label}</span>
        <span className="shrink-0 tabular-nums text-ink-muted">
          {count} · {percentage}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function QuestionBlock({ summary }: { summary: QuestionSummary }) {
  const meta = QUESTION_TYPES[summary.type];
  const Icon = meta.icon;
  const hasBreakdown = summary.breakdown && summary.breakdown.length > 0;
  const stats = summary.stats ?? {};

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start gap-2.5">
        <Icon size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">{summary.title || "Untitled question"}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            {summary.answered} answered · {summary.skipped} skipped
          </p>
        </div>
      </div>

      {hasBreakdown && (
        <div className="mt-4 space-y-3">
          {summary.breakdown.map((item) => (
            <Bar
              key={item.option_id ?? item.label}
              label={item.label}
              count={item.count}
              percentage={item.percentage}
            />
          ))}
        </div>
      )}

      {!hasBreakdown && Object.keys(stats).length > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-3">
          {Object.entries(stats)
            .filter(([key]) => key !== "max_rating")
            .map(([key, value]) => (
              <div key={key} className="rounded-lg bg-black/[0.03] px-3 py-2">
                <dt className="text-xs capitalize text-ink-muted">{key.replace(/_/g, " ")}</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-ink">{value}</dd>
              </div>
            ))}
        </dl>
      )}

      {summary.samples && summary.samples.length > 0 && (
        <ul className="mt-4 space-y-2">
          {summary.samples.map((sample, index) => (
            <li
              key={index}
              className="rounded-lg border-l-2 border-line bg-black/[0.02] px-3 py-2 text-sm text-ink-soft"
            >
              {sample}
            </li>
          ))}
        </ul>
      )}

      {!hasBreakdown && Object.keys(stats).length === 0 && !summary.samples?.length && (
        <p className="mt-3 text-sm text-ink-muted">No answers yet.</p>
      )}
    </div>
  );
}

export function SummaryPanel({ stats }: { stats: FormStats }) {
  const cards = [
    { label: "Responses", value: stats.total_responses },
    { label: "Completed", value: stats.completed_responses },
    { label: "Completion rate", value: `${stats.completion_rate}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-white p-4">
            <div className="text-2xl font-semibold tabular-nums tracking-tight">{card.value}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {stats.questions.map((summary) => (
          <QuestionBlock key={summary.question_id} summary={summary} />
        ))}
      </div>
    </div>
  );
}
