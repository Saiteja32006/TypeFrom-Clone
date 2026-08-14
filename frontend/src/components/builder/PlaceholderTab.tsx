"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BuilderHeader } from "@/components/builder/BuilderHeader";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { publicFormUrl } from "@/lib/publicUrl";
import type { Form } from "@/lib/types";

interface Props {
  active: "connect" | "workflow";
  children: React.ReactNode;
}

/**
 * Chrome for the placeholder tabs.
 *
 * They still load the real form and render the real header, so publishing and
 * copying a link work from here exactly as they do on Create and Results --
 * only the tab's own content is unbuilt.
 */
export function PlaceholderTab({ active, children }: Props) {
  const params = useParams<{ id: string }>();
  const formId = Number(params.id);
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getForm(formId)
      .then((loaded) => !cancelled && setForm(loaded))
      .catch((err) =>
        !cancelled && setLoadError(err instanceof ApiError ? err.message : "Couldn't load this form"),
      );
    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-sm text-ink-soft">{loadError}</p>
      </div>
    );
  }

  if (!form) {
    return <div className="grid min-h-screen place-items-center text-sm text-ink-muted">Loading</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BuilderHeader
        form={form}
        active={active}
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
        onCopyLink={async () => {
          if (form.status !== "published") return;
          await navigator.clipboard.writeText(publicFormUrl(form.slug));
          toast.success("Link copied");
        }}
        onRename={async (title) => {
          try {
            setForm(await api.updateForm(formId, { title }));
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Couldn't rename");
          }
        }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">{children}</div>
    </div>
  );
}
