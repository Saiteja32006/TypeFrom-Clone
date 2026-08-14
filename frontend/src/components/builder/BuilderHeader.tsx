"use client";

import { ArrowLeft, Check, Copy, Loader2, Play } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import type { Form } from "@/lib/types";

interface Props {
  form: Form;
  active: "create" | "workflow" | "connect" | "results";
  saving?: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onCopyLink: () => void;
  onRename: (title: string) => void;
  /** Opens the full-screen preview. Omitted on tabs that have no preview. */
  onPreview?: () => void;
}

export function BuilderHeader({
  form,
  active,
  saving = false,
  onPublish,
  onUnpublish,
  onCopyLink,
  onRename,
  onPreview,
}: Props) {
  const published = form.status === "published";

  // Mirrors Typeform's builder tabs. Connect and Share are placeholders the
  // brief scopes out; they are kept in the bar so the navigation is familiar.
  const tabs = [
    { key: "create" as const, label: "Content", href: `/forms/${form.id}/create` },
    { key: "workflow" as const, label: "Workflow", href: `/forms/${form.id}/workflow` },
    { key: "connect" as const, label: "Connect", href: `/forms/${form.id}/connect` },
    { key: "results" as const, label: "Results", href: `/forms/${form.id}/results` },
  ];

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/"
          aria-label="Back to my forms"
          className="rounded-lg p-1.5 text-ink-muted transition hover:bg-black/[0.05] hover:text-ink focus-ring"
        >
          <ArrowLeft size={17} />
        </Link>

        {/* Inline rename: the title in the header is the edit field. */}
        <input
          defaultValue={form.title}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next && next !== form.title) onRename(next);
            else event.target.value = form.title;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              event.currentTarget.value = form.title;
              event.currentTarget.blur();
            }
          }}
          aria-label="Form name"
          className="min-w-0 max-w-[16rem] flex-1 truncate rounded-md border border-transparent px-2 py-1 text-sm font-semibold tracking-tight transition hover:border-line focus:border-ink/30 focus-ring"
        />

        <span className="flex items-center gap-1.5 text-xs text-ink-muted" aria-live="polite">
          {saving ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Check size={12} />
              Saved
            </>
          )}
        </span>
      </div>

      {/* Absolutely positioned so the tabs sit dead centre in the header
          regardless of how wide the title or the action buttons are. */}
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-lg bg-black/[0.04] p-0.5 md:flex">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition focus-ring ${
              active === tab.key ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        {onPreview && (
          <Button variant="ghost" size="sm" onClick={onPreview}>
            <Play size={14} />
            Preview
          </Button>
        )}
        {published && (
          <Button variant="secondary" size="sm" onClick={onCopyLink}>
            <Copy size={14} />
            Copy link
          </Button>
        )}
        {published ? (
          <Button variant="secondary" size="sm" onClick={onUnpublish}>
            Unpublish
          </Button>
        ) : (
          <Button size="sm" onClick={onPublish}>
            Publish
          </Button>
        )}
      </div>
    </header>
  );
}
