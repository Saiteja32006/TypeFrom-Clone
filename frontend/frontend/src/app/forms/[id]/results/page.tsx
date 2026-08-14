"use client";

import { Clock, Download, Filter, Loader2, Search } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BuilderHeader } from "@/components/builder/BuilderHeader";
import { InsightsPanel } from "@/components/results/InsightsPanel";
import { SummaryPanel } from "@/components/results/SummaryPanel";
import { QUESTION_TYPES } from "@/lib/questionTypes";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import type { Form, FormStats, ResponseDetail, ResponseRow } from "@/lib/types";

type Tab = "insights" | "summary" | "responses";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const formId = Number(params.id);
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [rows, setRows] = useState<ResponseRow[] | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  // The dashboard links the Completed column here with ?tab=summary, so the
  // two counts lead somewhere meaningfully different.
  const initialTab = (useSearchParams().get("tab") as Tab | null) ?? "responses";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [rowQuery, setRowQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedForm, loadedRows, loadedStats] = await Promise.all([
          api.getForm(formId),
          api.listResponses(formId),
          api.getStats(formId),
        ]);
        if (cancelled) return;
        setForm(loadedForm);
        setRows(loadedRows);
        setStats(loadedStats);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Couldn't load results");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  async function openDetail(responseId: number) {
    try {
      setDetail(await api.getResponse(formId, responseId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't open that response");
    }
  }

  // Match against every answer on the row, so searching finds a respondent by
  // anything they typed rather than only by one designated column.
  const visibleRows = (rows ?? []).filter((row) => {
    const needle = rowQuery.trim().toLowerCase();
    if (!needle) return true;
    return Object.values(row.answers).some((value) =>
      (value ?? "").toLowerCase().includes(needle),
    );
  });

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">{loadError}</h1>
          <Button className="mt-5" variant="secondary" onClick={() => router.push("/")}>
            Back to my forms
          </Button>
        </div>
      </div>
    );
  }

  if (!form || !rows || !stats) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  const questions = form.questions;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BuilderHeader
        form={form}
        active="results"
        onPublish={async () => {
          try {
            setForm(await api.publishForm(formId));
            toast.success("Published");
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Couldn't publish");
          }
        }}
        onUnpublish={async () => {
          try {
            setForm(await api.unpublishForm(formId));
            toast.info("Unpublished");
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Couldn't unpublish");
          }
        }}
        onCopyLink={() => {
          void navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
          toast.success("Link copied");
        }}
        onRename={async (title) => {
          try {
            const updated = await api.updateForm(formId, { title });
            setForm(updated);
            toast.success("Form renamed");
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Couldn't rename");
          }
        }}
      />

      <div className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
        <div className="flex gap-0.5 rounded-lg bg-black/[0.04] p-0.5">
          {(["insights", "summary", "responses"] as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition focus-ring ${
                tab === key ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
        {tab === "responses" && (
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              value={rowQuery}
              onChange={(event) => setRowQuery(event.target.value)}
              placeholder="Search responses"
              aria-label="Search responses"
              className="h-8 w-52 rounded-lg border border-line bg-white pl-8 pr-3 text-[13px] placeholder:text-ink-muted focus:border-ink/30 focus-ring"
            />
          </div>
        )}
        <a
          href={api.exportUrl(formId)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-medium transition hover:border-ink/30 focus-ring"
        >
          <Download size={14} />
          Export CSV
        </a>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas p-6">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white/60 py-20 text-center">
            <h2 className="text-base font-semibold">No responses yet</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
              {form.status === "published"
                ? "Share your link and answers will appear here as they arrive."
                : "Publish this form to start collecting answers."}
            </p>
          </div>
        ) : tab === "insights" ? (
          <InsightsPanel stats={stats} />
        ) : tab === "summary" ? (
          <SummaryPanel stats={stats} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} aria-hidden />
                      Response time
                    </span>
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <Filter size={13} aria-hidden />
                      Response type
                    </span>
                  </th>
                  {questions.map((question) => (
                    <th
                      key={question.id}
                      className="max-w-[220px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                      title={question.title}
                    >
                      {/* The type icon tells you what kind of answer a column
                          holds without widening it. */}
                      <span className="flex items-center gap-1.5">
                        {(() => {
                          const Icon = QUESTION_TYPES[question.type].icon;
                          return <Icon size={13} aria-hidden />;
                        })()}
                        <span className="truncate">{question.title || "Untitled"}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={questions.length + 2}
                      className="px-4 py-12 text-center text-sm text-ink-muted"
                    >
                      No responses match “{rowQuery}”.
                    </td>
                  </tr>
                )}
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => void openDetail(row.id)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-black/[0.02]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                      {formatDate(row.submitted_at ?? row.started_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          row.is_complete
                            ? "bg-positive/10 text-positive"
                            : "bg-black/[0.06] text-ink-muted"
                        }`}
                      >
                        {row.is_complete ? "Completed" : "Partial"}
                      </span>
                    </td>
                    {questions.map((question) => (
                      <td
                        key={question.id}
                        className="max-w-[220px] truncate px-4 py-3 text-ink"
                        title={row.answers[String(question.id)] ?? ""}
                      >
                        {row.answers[String(question.id)] || (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Response"
        description={detail ? `Submitted ${formatDate(detail.submitted_at)}` : undefined}
      >
        {detail && (
          <dl className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {detail.answers.map((answer) => (
              <div key={answer.question_id}>
                <dt className="text-xs font-medium text-ink-muted">{answer.question_title}</dt>
                <dd className="mt-1 text-sm text-ink">
                  {answer.value_text || <span className="text-ink-muted">Not answered</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
