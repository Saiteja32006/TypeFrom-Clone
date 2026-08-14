"use client";

import { LayoutGrid, List, Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FormCard } from "@/components/dashboard/FormCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { CreateFormScreen } from "@/components/dashboard/CreateFormScreen";
import { FormList } from "@/components/dashboard/FormList";
import { WorkspaceSidebar } from "@/components/dashboard/WorkspaceSidebar";
import { ApiError, api } from "@/lib/api";
import { publicFormUrl } from "@/lib/publicUrl";
import type { FormSummary } from "@/lib/types";

type Dialog =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "rename"; form: FormSummary }
  | { kind: "delete"; form: FormSummary };

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();

  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [draftTitle, setDraftTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setForms(await api.listForms());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!forms) return [];
    const needle = query.trim().toLowerCase();
    return needle ? forms.filter((f) => f.title.toLowerCase().includes(needle)) : forms;
  }, [forms, query]);

  const closeDialog = () => {
    setDialog({ kind: "none" });
    setDraftTitle("");
  };

  async function createForm(title: string) {
    setBusy(true);
    try {
      const form = await api.createForm(title);
      toast.success("Form created");
      router.push(`/forms/${form.id}/create`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create the form");
      setBusy(false);
    }
  }

  async function renameForm(form: FormSummary) {
    const title = draftTitle.trim();
    if (!title) return;
    setBusy(true);
    try {
      await api.updateForm(form.id, { title });
      await load();
      toast.success("Form renamed");
      closeDialog();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't rename the form");
    } finally {
      setBusy(false);
    }
  }

  async function duplicateForm(form: FormSummary) {
    try {
      await api.duplicateForm(form.id);
      await load();
      toast.success(`Duplicated "${form.title}"`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't duplicate the form");
    }
  }

  async function deleteForm(form: FormSummary) {
    setBusy(true);
    try {
      await api.deleteForm(form.id);
      await load();
      toast.success("Form deleted");
      closeDialog();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the form");
    } finally {
      setBusy(false);
    }
  }

  function copyLink(form: FormSummary) {
    const url = publicFormUrl(form.slug);
    void navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  const responsesUsed = (forms ?? []).reduce((sum, f) => sum + f.response_count, 0);

  return (
    <div className="flex min-h-screen">
      <WorkspaceSidebar
        formCount={forms?.length ?? 0}
        responsesUsed={responsesUsed}
        onCreate={() => {
          setDraftTitle("");
          setDialog({ kind: "create" });
        }}
      />

      <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-ink text-sm font-bold text-white">
              T
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Typeform Builder</span>
          </div>

          {/* The sidebar owns "Create form" from lg up; this is the same action
              for narrower viewports, where the sidebar is hidden. Showing both
              at once put two identical buttons on screen. */}
          <Button
            className="lg:hidden"
            onClick={() => {
              setDraftTitle("");
              setDialog({ kind: "create" });
            }}
          >
            <Plus size={16} />
            New form
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My forms</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {forms === null
                ? "Loading…"
                : `${forms.length} ${forms.length === 1 ? "form" : "forms"}`}
            </p>
          </div>

          {forms !== null && forms.length > 0 && (
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-hidden
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search forms"
                aria-label="Search forms"
                className="h-10 w-56 rounded-lg border border-line bg-white pl-9 pr-3 text-sm placeholder:text-ink-muted focus:border-ink/30 focus-ring"
              />
            </div>
          )}

          {forms !== null && forms.length > 0 && (
            <div className="flex items-center gap-0.5 rounded-lg bg-black/[0.04] p-0.5">
              {([["list", List], ["grid", LayoutGrid]] as const).map(([mode, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  aria-label={`${mode} view`}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium capitalize transition focus-ring ${
                    view === mode ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <Icon size={14} />
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          {error && (
            <div className="rounded-xl border border-danger/25 bg-danger/[0.04] p-5">
              <p className="text-sm font-medium text-danger">{error}</p>
              <p className="mt-1 text-sm text-ink-soft">
                Start the API with <code className="font-mono text-[13px]">uvicorn app.main:app --reload</code>,
                then try again.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          )}

          {!error && forms === null && (
            <div className="flex items-center gap-2 py-16 text-sm text-ink-muted">
              <Loader2 size={16} className="animate-spin" />
              Loading your forms…
            </div>
          )}

          {!error && forms !== null && visible.length === 0 && (
            <div className="rounded-xl border border-dashed border-line bg-white/60 py-20 text-center">
              <h2 className="text-base font-semibold">
                {query ? "No forms match that search" : "Create your first form"}
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
                {query
                  ? "Try a different word, or clear the search to see everything."
                  : "Add questions, publish it, and share the link. Responses land here."}
              </p>
              {!query && (
                <Button
                  className="mt-5"
                  onClick={() => {
                    setDraftTitle("");
                    setDialog({ kind: "create" });
                  }}
                >
                  <Plus size={16} />
                  New form
                </Button>
              )}
            </div>
          )}

          {visible.length > 0 &&
            (view === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((form) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    onRename={(f) => {
                      setDraftTitle(f.title);
                      setDialog({ kind: "rename", form: f });
                    }}
                    onDuplicate={(f) => void duplicateForm(f)}
                    onDelete={(f) => setDialog({ kind: "delete", form: f })}
                    onCopyLink={copyLink}
                  />
                ))}
              </div>
            ) : (
              <FormList
                forms={visible}
                onRename={(f) => {
                  setDraftTitle(f.title);
                  setDialog({ kind: "rename", form: f });
                }}
                onDuplicate={(f) => void duplicateForm(f)}
                onDelete={(f) => setDialog({ kind: "delete", form: f })}
                onCopyLink={copyLink}
              />
            ))}
        </div>
      </main>
      </div>

      <CreateFormScreen
        open={dialog.kind === "create"}
        busy={busy}
        onClose={closeDialog}
        onCreate={(title) => void createForm(title)}
      />


      <Modal
        open={dialog.kind === "rename"}
        onClose={closeDialog}
        title="Rename form"
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={() => dialog.kind === "rename" && void renameForm(dialog.form)}
            >
              Save changes
            </Button>
          </>
        }
      >
        <input
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) =>
            event.key === "Enter" && dialog.kind === "rename" && void renameForm(dialog.form)
          }
          aria-label="Form name"
          className="h-11 w-full rounded-lg border border-line px-3.5 text-sm focus:border-ink/30 focus-ring"
        />
      </Modal>

      <Modal
        open={dialog.kind === "delete"}
        onClose={closeDialog}
        title={dialog.kind === "delete" ? `Delete "${dialog.form.title}"?` : ""}
        description="This removes the form and every response it collected. It can't be undone."
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog}>
              Keep form
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => dialog.kind === "delete" && void deleteForm(dialog.form)}
            >
              Delete form
            </Button>
          </>
        }
      />
    </div>
  );
}
