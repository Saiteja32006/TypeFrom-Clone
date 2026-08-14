/**
 * Typed wrapper around the backend API.
 *
 * Every network call in the app goes through `request`, so error handling,
 * base URL resolution and JSON parsing exist in exactly one place.
 */

import type {
  Form,
  FormStats,
  FormSummary,
  PublicForm,
  Question,
  QuestionSettings,
  QuestionType,
  ResponseDetail,
  ResponseRow,
  SubmitAck,
  SubmitValidationError,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/** Thrown for any non-2xx response. */
export class ApiError extends Error {
  status: number;
  /** Present only on a 422 from the public submit endpoint. */
  validation?: SubmitValidationError;

  constructor(status: number, message: string, validation?: SubmitValidationError) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.validation = validation;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    // fetch only rejects on network-level failure, which almost always means
    // the API process is not running.
    throw new ApiError(0, "Can't reach the server. Is the backend running?");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = body?.detail;

    // The public submit endpoint returns {message, errors} inside detail so the
    // runner can mark the specific question that failed.
    if (detail && typeof detail === "object" && "errors" in detail) {
      throw new ApiError(res.status, detail.message ?? "Some answers need attention", detail);
    }
    if (typeof detail === "string") throw new ApiError(res.status, detail);

    // FastAPI's own request-shape errors arrive as an array of {loc, msg}.
    if (Array.isArray(detail) && detail[0]?.msg) {
      throw new ApiError(res.status, detail[0].msg);
    }
    throw new ApiError(res.status, `Request failed (${res.status})`);
  }

  return body as T;
}

const json = (method: string, payload?: unknown): RequestInit => ({
  method,
  ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
});

export interface QuestionInput {
  type: QuestionType;
  title?: string;
  description?: string | null;
  is_required?: boolean;
  settings?: QuestionSettings;
  options?: { id?: number; label: string }[];
  position?: number | null;
}

export const api = {
  // ---- creator: forms -------------------------------------------------
  listForms: () => request<FormSummary[]>("/api/forms"),

  getForm: (id: number) => request<Form>(`/api/forms/${id}`),

  createForm: (title: string) => request<Form>("/api/forms", json("POST", { title })),

  updateForm: (
    id: number,
    patch: Partial<Pick<Form, "title" | "description" | "theme" | "thankyou_title" | "thankyou_message">>,
  ) => request<Form>(`/api/forms/${id}`, json("PATCH", patch)),

  deleteForm: (id: number) => request<void>(`/api/forms/${id}`, json("DELETE")),

  duplicateForm: (id: number) => request<Form>(`/api/forms/${id}/duplicate`, json("POST")),

  publishForm: (id: number) => request<Form>(`/api/forms/${id}/publish`, json("POST")),

  unpublishForm: (id: number) => request<Form>(`/api/forms/${id}/unpublish`, json("POST")),

  // ---- creator: questions ---------------------------------------------
  addQuestion: (formId: number, payload: QuestionInput) =>
    request<Question>(`/api/forms/${formId}/questions`, json("POST", payload)),

  updateQuestion: (formId: number, questionId: number, patch: Partial<QuestionInput>) =>
    request<Question>(`/api/forms/${formId}/questions/${questionId}`, json("PATCH", patch)),

  deleteQuestion: (formId: number, questionId: number) =>
    request<void>(`/api/forms/${formId}/questions/${questionId}`, json("DELETE")),

  /** Sends the complete post-drop order; the backend applies it in one transaction. */
  reorderQuestions: (formId: number, questionIds: number[]) =>
    request<Question[]>(
      `/api/forms/${formId}/questions/reorder`,
      json("PATCH", { question_ids: questionIds }),
    ),

  // ---- creator: results -------------------------------------------------
  listResponses: (formId: number) =>
    request<ResponseRow[]>(`/api/forms/${formId}/responses`),

  getResponse: (formId: number, responseId: number) =>
    request<ResponseDetail>(`/api/forms/${formId}/responses/${responseId}`),

  getStats: (formId: number) => request<FormStats>(`/api/forms/${formId}/summary`),

  /** Not a JSON endpoint -- the browser downloads this directly. */
  exportUrl: (formId: number) => `${BASE_URL}/api/forms/${formId}/responses/export`,

  // ---- public respondent flow -------------------------------------------
  getPublicForm: (slug: string) => request<PublicForm>(`/api/f/${slug}`),

  submitResponse: (
    slug: string,
    answers: { question_id: number; value: unknown }[],
    isComplete = true,
  ) =>
    request<SubmitAck>(
      `/api/f/${slug}/responses`,
      json("POST", { answers, is_complete: isComplete }),
    ),
};
