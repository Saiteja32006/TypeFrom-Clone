/**
 * Single registry describing every question type.
 *
 * Adding a ninth type means editing this file and adding one input component --
 * nothing else in the builder or the runner needs to change.
 */

import {
  AlignLeft,
  AtSign,
  ChevronDownCircle,
  CircleDot,
  Hash,
  Star,
  ToggleLeft,
  Type,
  type LucideIcon,
} from "lucide-react";

import type { Question, QuestionSettings, QuestionType } from "./types";

export interface TypeMeta {
  label: string;
  icon: LucideIcon;
  /** Choice types need an option editor and at least one option to publish. */
  hasOptions: boolean;
  /** Tailwind classes for the type's icon tile. Typeform colour-codes these so
   *  a long question list is scannable by shape and hue, not just by reading. */
  tone: string;
  defaults: QuestionSettings;
  placeholder: string;
}

export const QUESTION_TYPES: Record<QuestionType, TypeMeta> = {
  short_text: {
    label: "Short text",
    icon: Type,
    tone: "bg-sky-100 text-sky-700",
    hasOptions: false,
    defaults: { max_length: 200 },
    placeholder: "Type your answer here...",
  },
  long_text: {
    label: "Long text",
    icon: AlignLeft,
    tone: "bg-sky-100 text-sky-700",
    hasOptions: false,
    defaults: { max_length: 1000 },
    placeholder: "Type your answer here...",
  },
  multiple_choice: {
    label: "Multiple choice",
    icon: CircleDot,
    tone: "bg-violet-100 text-violet-700",
    hasOptions: true,
    defaults: { allow_multiple: false },
    placeholder: "",
  },
  dropdown: {
    label: "Dropdown",
    icon: ChevronDownCircle,
    tone: "bg-violet-100 text-violet-700",
    hasOptions: true,
    defaults: {},
    placeholder: "Select an option",
  },
  email: {
    label: "Email",
    icon: AtSign,
    tone: "bg-teal-100 text-teal-700",
    hasOptions: false,
    defaults: {},
    placeholder: "name@example.com",
  },
  number: {
    label: "Number",
    icon: Hash,
    tone: "bg-amber-100 text-amber-700",
    hasOptions: false,
    defaults: {},
    placeholder: "Type your answer here...",
  },
  yes_no: {
    label: "Yes / No",
    icon: ToggleLeft,
    tone: "bg-rose-100 text-rose-700",
    hasOptions: false,
    defaults: {},
    placeholder: "",
  },
  rating: {
    label: "Rating",
    icon: Star,
    tone: "bg-orange-100 text-orange-700",
    hasOptions: false,
    defaults: { max_rating: 5 },
    placeholder: "",
  },
};

export const TYPE_ORDER: QuestionType[] = [
  "short_text",
  "long_text",
  "multiple_choice",
  "dropdown",
  "email",
  "number",
  "yes_no",
  "rating",
];

/** Letter badges on choice options, matching Typeform's keyboard shortcuts. */
export const CHOICE_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/;

/**
 * Client-side mirror of the backend's rules, for instant feedback only.
 * The server revalidates everything -- see backend/app/services/validation.py.
 */
export function validateAnswer(question: Question, value: unknown): string | null {
  if (isBlank(value)) {
    return question.is_required ? "This question is required" : null;
  }

  const s = question.settings ?? {};

  switch (question.type) {
    case "short_text":
    case "long_text": {
      const text = String(value);
      if (s.max_length && text.length > s.max_length) {
        return `Keep this under ${s.max_length} characters`;
      }
      return null;
    }
    case "email":
      return EMAIL_RE.test(String(value).trim()) ? null : "Enter a valid email address";
    case "number": {
      const n = Number(String(value).trim());
      if (Number.isNaN(n)) return "Enter a number";
      if (s.min !== undefined && n < s.min) return `Enter ${s.min} or more`;
      if (s.max !== undefined && n > s.max) return `Enter ${s.max} or less`;
      return null;
    }
    case "rating": {
      const max = s.max_rating ?? 5;
      const n = Number(value);
      return n >= 1 && n <= max ? null : `Pick a rating from 1 to ${max}`;
    }
    default:
      return null;
  }
}

/** Human label for a question in lists where the title may be empty. */
export function questionLabel(question: Question): string {
  return question.title.trim() || "Untitled question";
}
