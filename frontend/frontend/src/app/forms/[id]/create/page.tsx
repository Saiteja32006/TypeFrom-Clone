"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AddQuestionDialog } from "@/components/builder/AddQuestionDialog";
import { BuilderHeader } from "@/components/builder/BuilderHeader";
import { PreviewOverlay } from "@/components/builder/PreviewOverlay";
import { PreviewPane } from "@/components/builder/PreviewPane";
import { QuestionEditor } from "@/components/builder/QuestionEditor";
import { QuestionList } from "@/components/builder/QuestionList";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { publicFormUrl } from "@/lib/publicUrl";
import { QUESTION_TYPES } from "@/lib/questionTypes";
import type { Form, Question, QuestionType } from "@/lib/types";

const SAVE_DELAY = 550;

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const formId = Number(params.id);
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedId, setSelectedId] = useState<number | "ending" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [inspector, setInspector] = useState<"question" | "settings">("question");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);

  // One timer per question id, so edits to different questions don't cancel
  // each other while the creator moves around the builder.
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await api.getForm(formId);
        if (cancelled) return;
        setForm(loaded);
        setQuestions(loaded.questions);
        setSelectedId(loaded.questions[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Couldn't load this form");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  // "ending" is not a question id, so both lookups must fall through to null/-1
  // rather than matching some question by coincidence.
  const selected = useMemo(
    () => (selectedId === "ending" ? null : questions.find((q) => q.id === selectedId) ?? null),
    [questions, selectedId],
  );
  const selectedIndex = useMemo(
    () => (selectedId === "ending" ? -1 : questions.findIndex((q) => q.id === selectedId)),
    [questions, selectedId],
  );

  /** Optimistic local update, then a debounced PATCH. */
  const patchQuestion = useCallback(
    (questionId: number, patch: Partial<Question>, optionsPayload?: { id?: number; label: string }[]) => {
      setQuestions((current) =>
        current.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      );

      const existing = timers.current.get(questionId);
      if (existing) clearTimeout(existing);

      setSaving(true);
      const timer = setTimeout(async () => {
        try {
          const updated = await api.updateQuestion(formId, questionId, {
            ...(patch.type !== undefined ? { type: patch.type } : {}),
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.is_required !== undefined ? { is_required: patch.is_required } : {}),
            ...(patch.settings !== undefined ? { settings: patch.settings } : {}),
            ...(optionsPayload ? { options: optionsPayload } : {}),
          });
          // Reconcile with the server's copy: option ids for newly added
          // choices only exist after the round trip.
          setQuestions((current) => current.map((q) => (q.id === questionId ? updated : q)));
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : "Couldn't save that change");
        } finally {
          timers.current.delete(questionId);
          if (timers.current.size === 0) setSaving(false);
        }
      }, SAVE_DELAY);

      timers.current.set(questionId, timer);
    },
    [formId, toast],
  );

  async function addQuestion(type: QuestionType) {
    const meta = QUESTION_TYPES[type];
    try {
      const created = await api.addQuestion(formId, {
        type,
        title: "",
        is_required: false,
        settings: meta.defaults,
        options: meta.hasOptions
          ? [{ label: "Option 1" }, { label: "Option 2" }, { label: "Option 3" }]
          : [],
      });
      setQuestions((current) => [...current, created]);
      setSelectedId(created.id);
      toast.success(`${meta.label} added`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't add the question");
    }
  }

  async function reorder(orderedIds: number[]) {
    const previous = questions;
    // Reorder locally first so the drop feels instant.
    setQuestions(orderedIds.map((id, i) => {
      const q = previous.find((item) => item.id === id)!;
      return { ...q, position: i };
    }));

    try {
      const updated = await api.reorderQuestions(formId, orderedIds);
      setQuestions(updated);
    } catch (err) {
      setQuestions(previous); // roll back on failure
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the new order");
    }
  }

  async function deleteQuestion(question: Question) {
    setPendingDelete(null);
    const previous = questions;
    setQuestions((current) => current.filter((q) => q.id !== question.id));
    if (selectedId === question.id) {
      const remaining = previous.filter((q) => q.id !== question.id);
      setSelectedId(remaining[0]?.id ?? null);
    }

    try {
      await api.deleteQuestion(formId, question.id);
      toast.success("Question deleted");
    } catch (err) {
      setQuestions(previous);
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the question");
    }
  }

  async function publish() {
    try {
      const updated = await api.publishForm(formId);
      setForm(updated);
      toast.success("Published");
    } catch (err) {
      // The backend refuses to publish an empty form or a choice question
      // with no options; surface that message verbatim.
      toast.error(err instanceof ApiError ? err.message : "Couldn't publish this form");
    }
  }

  async function unpublish() {
    try {
      const updated = await api.unpublishForm(formId);
      setForm(updated);
      toast.info("Unpublished — the public link no longer works");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't unpublish this form");
    }
  }

  async function rename(title: string) {
    try {
      const updated = await api.updateForm(formId, { title });
      setForm((current) => (current ? { ...current, title: updated.title } : updated));
      toast.success("Form renamed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't rename the form");
    }
  }

  /** Theme and thank-you screen edits. Optimistic: the panel is a live preview
   *  of the respondent screen, so waiting on the round trip would feel laggy. */
  async function patchForm(patch: Partial<Pick<Form, "theme" | "thankyou_title" | "thankyou_message">>) {
    const previous = form;
    setForm((current) => (current ? { ...current, ...patch } : current));
    setSaving(true);
    try {
      const updated = await api.updateForm(formId, patch);
      setForm(updated);
    } catch (err) {
      setForm(previous);
      toast.error(err instanceof ApiError ? err.message : "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  }

  /** Duplicate a question directly beneath the original.
   *  Built from the existing add-question endpoint rather than a bespoke one:
   *  the payload is the source question's fields plus its option labels. */
  async function duplicateQuestion(question: Question) {
    try {
      const created = await api.addQuestion(formId, {
        type: question.type,
        title: question.title,
        description: question.description,
        is_required: question.is_required,
        settings: question.settings,
        options: question.options.map((o) => ({ label: o.label })),
        position: question.position + 1,
      });
      // Positions shift on insert, so take the server's ordering as truth.
      const fresh = await api.getForm(formId);
      setQuestions(fresh.questions);
      setSelectedId(created.id);
      toast.success("Question duplicated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't duplicate that question");
    }
  }

  function copyLink() {
    if (!form) return;
    void navigator.clipboard.writeText(publicFormUrl(form.slug));
    toast.success("Link copied");
  }

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">{loadError}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            The form may have been deleted, or the API may not be running.
          </p>
          <Button className="mt-5" variant="secondary" onClick={() => router.push("/")}>
            Back to my forms
          </Button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BuilderHeader
        form={form}
        active="create"
        saving={saving}
        onPublish={() => void publish()}
        onUnpublish={() => void unpublish()}
        onCopyLink={copyLink}
        onRename={(title) => void rename(title)}
        onPreview={() => setPreviewOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-line bg-white lg:block">
          <QuestionList
            questions={questions}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              // Picking the ending has nothing to edit under "Question",
              // so move the inspector to where its fields actually live.
              setInspector(id === "ending" ? "settings" : "question");
            }}
            onReorder={(ids) => void reorder(ids)}
            onDelete={setPendingDelete}
            onDuplicate={(question) => void duplicateQuestion(question)}
            onAdd={() => setAdding(true)}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <PreviewPane
            question={selected}
            index={selectedIndex < 0 ? 0 : selectedIndex}
            total={questions.length}
            form={form}
            showEnding={selectedId === "ending"}
            onEditTitle={(title) => selected && patchQuestion(selected.id, { title })}
            onEditDescription={(description) =>
              selected && patchQuestion(selected.id, { description })
            }
          />
        </main>

        <aside className="hidden w-72 shrink-0 flex-col border-l border-line bg-white xl:flex">
          {/* One inspector, two scopes: the selected question, or the whole form. */}
          <div className="flex shrink-0 gap-0.5 border-b border-line p-2">
            {(["question", "settings"] as const).map((pane) => (
              <button
                key={pane}
                type="button"
                onClick={() => setInspector(pane)}
                className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition focus-ring ${
                  inspector === pane ? "bg-black/[0.06] text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {pane}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {inspector === "question" ? (
              <QuestionEditor
                question={selected}
                hasResponses={form.status === "published"}
                onChange={(patch) => selected && patchQuestion(selected.id, patch)}
                onOptionsChange={(options) =>
                  selected && patchQuestion(selected.id, {}, options)
                }
              />
            ) : (
              <SettingsPanel form={form} onChange={(patch) => void patchForm(patch)} />
            )}
          </div>
        </aside>
      </div>

      <AddQuestionDialog
        open={adding}
        onClose={() => setAdding(false)}
        onPick={(type) => void addQuestion(type)}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this question?"
        description="Answers already collected for it stay in your results, but the question won't be shown to new respondents."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => pendingDelete && void deleteQuestion(pendingDelete)}
            >
              Delete question
            </Button>
          </>
        }
      />

      <PreviewOverlay
        open={previewOpen}
        form={form}
        questions={questions}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
