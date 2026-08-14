"use client";

import { BarChart3, CopyPlus, ExternalLink, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Menu } from "@/components/ui/Menu";
import type { FormSummary } from "@/lib/types";

interface Props {
  forms: FormSummary[];
  onRename: (form: FormSummary) => void;
  onDuplicate: (form: FormSummary) => void;
  onDelete: (form: FormSummary) => void;
  onCopyLink: (form: FormSummary) => void;
}

function updatedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Dense list view, matching the columns Typeform's dashboard shows:
 * responses, completed, and last updated.
 *
 * "Completed" is a percentage rather than a count because the raw number
 * duplicates the responses column; the ratio is what tells a creator whether
 * people are dropping out mid-form.
 */
export function FormList({ forms, onRename, onDuplicate, onDelete, onCopyLink }: Props) {
  const router = useRouter();
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="hidden items-center gap-4 border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted sm:flex">
        <span className="flex-1">Form</span>
        <span className="w-24 text-right">Responses</span>
        <span className="w-24 text-right">Completed</span>
        <span className="w-28 text-right">Updated</span>
        <span className="w-8" />
      </div>

      {forms.map((form) => {
        const published = form.status === "published";
        return (
          <div
            key={form.id}
            className="group flex items-center gap-4 border-b border-line px-4 py-3 last:border-0 hover:bg-black/[0.02]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[13px] font-semibold ${
                  published ? "bg-accent-soft text-accent" : "bg-black/[0.05] text-ink-muted"
                }`}
              >
                {form.title.trim().charAt(0).toUpperCase() || "?"}
              </span>

              <div className="min-w-0">
                <Link
                  href={`/forms/${form.id}/create`}
                  className="block truncate text-sm font-medium text-ink hover:underline focus-ring"
                >
                  {form.title || "Untitled form"}
                </Link>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      published ? "bg-positive" : "bg-ink-muted/50"
                    }`}
                  />
                  {published ? "Published" : "Draft"} · {form.question_count}{" "}
                  {form.question_count === 1 ? "question" : "questions"}
                </span>
              </div>
            </div>

            {/* The counts are the affordance for opening results -- that is
                where a creator expects a response number to take them. */}
            <Link
              href={`/forms/${form.id}/results`}
              title="View responses"
              className="w-24 rounded-md px-2 py-1 text-right text-sm tabular-nums text-ink transition hover:bg-black/[0.05] focus-ring"
            >
              {form.response_count || <span className="text-ink-muted">—</span>}
            </Link>
            <Link
              href={`/forms/${form.id}/results?tab=summary`}
              title="View summary"
              className="w-24 rounded-md px-2 py-1 text-right text-sm tabular-nums text-ink-soft transition hover:bg-black/[0.05] focus-ring"
            >
              {form.completion_rate === null || form.completion_rate === undefined ? (
                <span className="text-ink-muted">—</span>
              ) : (
                `${form.completion_rate}%`
              )}
            </Link>
            <span className="w-28 text-right text-xs tabular-nums text-ink-muted">
              {updatedLabel(form.updated_at)}
            </span>

            <div className="w-8 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <Menu
                align="right"
                label={`Actions for ${form.title}`}
                trigger={
                  <span className="grid h-7 w-7 place-items-center rounded-md text-ink-muted transition hover:bg-black/[0.06] hover:text-ink">
                    <MoreHorizontal size={16} />
                  </span>
                }
                items={[
                  { label: "Rename", icon: <PencilLine size={14} />, onSelect: () => onRename(form) },
                  {
                    label: "Duplicate",
                    icon: <CopyPlus size={14} />,
                    onSelect: () => onDuplicate(form),
                  },
                  ...(published
                    ? [
                        {
                          label: "Copy link",
                          icon: <ExternalLink size={14} />,
                          onSelect: () => onCopyLink(form),
                        },
                      ]
                    : []),
                  {
                    label: "View results",
                    icon: <BarChart3 size={14} />,
                    onSelect: () => router.push(`/forms/${form.id}/results`),
                  },
                  {
                    label: "Delete",
                    icon: <Trash2 size={14} />,
                    onSelect: () => onDelete(form),
                    danger: true,
                  },
                ]}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
