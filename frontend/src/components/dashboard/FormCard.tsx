"use client";

import { BarChart3, Copy, ExternalLink, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Menu } from "@/components/ui/Menu";
import type { FormSummary } from "@/lib/types";

interface Props {
  form: FormSummary;
  onRename: (form: FormSummary) => void;
  onDuplicate: (form: FormSummary) => void;
  onDelete: (form: FormSummary) => void;
  onCopyLink: (form: FormSummary) => void;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FormCard({ form, onRename, onDuplicate, onDelete, onCopyLink }: Props) {
  const published = form.status === "published";

  return (
    <div className="group relative flex flex-col rounded-xl border border-line bg-white p-5 shadow-card transition hover:border-ink/20">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/forms/${form.id}/create`}
          className="min-w-0 flex-1 rounded focus-ring"
          title={form.title}
        >
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">
            {form.title}
          </h3>
        </Link>

        <Menu
          label={`Actions for ${form.title}`}
          trigger={<MoreHorizontal size={17} />}
          items={[
            { label: "Rename", icon: <Pencil size={14} />, onSelect: () => onRename(form) },
            { label: "Duplicate", icon: <Copy size={14} />, onSelect: () => onDuplicate(form) },
            ...(published
              ? [{ label: "Copy link", icon: <Link2 size={14} />, onSelect: () => onCopyLink(form) }]
              : []),
            { label: "Delete", icon: <Trash2 size={14} />, onSelect: () => onDelete(form), danger: true },
          ]}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${
            published ? "bg-positive/10 text-positive" : "bg-black/[0.05] text-ink-soft"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${published ? "bg-positive" : "bg-ink-muted"}`}
            aria-hidden
          />
          {published ? "Published" : "Draft"}
        </span>
        <span className="text-ink-muted">
          {form.question_count} {form.question_count === 1 ? "question" : "questions"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
        <div>
          <div className="text-xl font-semibold tabular-nums text-ink">{form.response_count}</div>
          <div className="text-xs text-ink-muted">
            {form.response_count === 1 ? "response" : "responses"} · edited {relativeTime(form.updated_at)}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {form.response_count > 0 && (
            <Link
              href={`/forms/${form.id}/results`}
              className="rounded-lg p-2 text-ink-muted transition hover:bg-black/[0.05] hover:text-ink focus-ring"
              title="View results"
            >
              <BarChart3 size={16} />
            </Link>
          )}
          {published && (
            <a
              href={`/f/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-ink-muted transition hover:bg-black/[0.05] hover:text-ink focus-ring"
              title="Open public form"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
