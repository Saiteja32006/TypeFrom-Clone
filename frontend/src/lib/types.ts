/** Colour tokens a creator can set per form; all optional so a partial
 *  theme falls back to the app defaults rather than rendering unstyled. */
export interface FormTheme {
  accent?: string;
  background?: string;
  text?: string;
}

/**
 * Mirrors the FastAPI schemas exactly (see backend/app/schemas).
 * Field names are copied from /openapi.json rather than guessed -- if the
 * backend contract changes, this file is the single place to update.
 */

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export type FormStatus = "draft" | "published";

/** Per-type configuration stored as JSON on the question. */
export interface QuestionSettings {
  max_length?: number;
  min?: number;
  max?: number;
  max_rating?: number;
  allow_multiple?: boolean;
  placeholder?: string;
}

export interface Option {
  id: number;
  label: string;
  position: number;
}

export interface Question {
  id: number;
  type: QuestionType;
  title: string;
  description: string | null;
  is_required: boolean;
  settings: QuestionSettings;
  position: number;
  options: Option[];
}

export interface Form {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  status: FormStatus;
  theme: FormTheme;
  thankyou_title: string;
  thankyou_message: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  questions: Question[];
  share_url: string | null;
}

/** Dashboard row -- counts only, no nested questions. */
export interface FormSummary {
  id: number;
  title: string;
  slug: string;
  status: FormStatus;
  question_count: number;
  /** Completed responses only. */
  response_count: number;
  /** Everyone who started, including drop-offs. */
  started_count: number;
  /** null when nobody has started, which is distinct from a rate of 0. */
  completion_rate: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  share_url: string | null;
}

/** What a respondent receives: no id, no status, no timestamps. */
export interface PublicForm {
  title: string;
  description: string | null;
  slug: string;
  theme: FormTheme;
  thankyou_title: string;
  thankyou_message: string | null;
  questions: Question[];
}

export interface SubmitAck {
  token: string;
  submitted_at: string | null;
  thankyou_title: string;
  thankyou_message: string | null;
}

export interface ResponseRow {
  id: number;
  token: string;
  is_complete: boolean;
  /** Partial responses have no submitted_at, so this is their only timestamp. */
  started_at: string;
  submitted_at: string | null;
  /** question_id (as a string key) -> flattened display text */
  answers: Record<string, string | null>;
}

export interface AnswerDetail {
  question_id: number;
  question_title: string;
  question_type: QuestionType;
  value: unknown;
  value_text: string | null;
}

export interface ResponseDetail {
  id: number;
  token: string;
  is_complete: boolean;
  started_at: string;
  submitted_at: string | null;
  answers: AnswerDetail[];
}

export interface ChoiceBreakdown {
  label: string;
  option_id?: number;
  count: number;
  percentage: number;
}

export interface QuestionSummary {
  question_id: number;
  title: string;
  type: QuestionType;
  answered: number;
  skipped: number;
  breakdown: ChoiceBreakdown[];
  stats: Record<string, number>;
  samples: string[];
}

export interface FormStats {
  form_id: number;
  total_responses: number;
  completed_responses: number;
  completion_rate: number;
  /** Mean seconds from start to submit; null when nothing is completed yet. */
  avg_completion_seconds: number | null;
  questions: QuestionSummary[];
}

/** Body of the 422 the public submit endpoint returns. */
export interface SubmitValidationError {
  message: string;
  /** question_id (as a string key) -> human-readable message */
  errors: Record<string, string>;
}
