import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormRunner } from "@/components/runner/FormRunner";
import { ApiError, api } from "@/lib/api";
import type { PublicForm } from "@/lib/types";

interface Props {
  params: { slug: string };
}

async function fetchForm(slug: string): Promise<PublicForm | null> {
  try {
    return await api.getPublicForm(slug);
  } catch (err) {
    // The backend returns 404 for both "no such slug" and "not published",
    // so an unpublished link is indistinguishable from a wrong one -- which is
    // the behaviour we want.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const form = await fetchForm(params.slug);
  return {
    title: form ? form.title : "Form not available",
    description: form?.description ?? undefined,
  };
}

export default async function PublicFormPage({ params }: Props) {
  const form = await fetchForm(params.slug);
  if (!form) notFound();

  return <FormRunner form={form} />;
}
