"use client";

import { Modal } from "@/components/ui/Modal";
import { QUESTION_TYPES, TYPE_ORDER } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
}

export function AddQuestionDialog({ open, onClose, onPick }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a question"
      description="Pick how people should answer."
    >
      <div className="grid grid-cols-2 gap-2">
        {TYPE_ORDER.map((type) => {
          const meta = QUESTION_TYPES[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => {
                onPick(type);
                onClose();
              }}
              className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-left text-sm transition hover:border-ink/30 hover:bg-black/[0.02] focus-ring"
            >
              <Icon size={16} className="shrink-0 text-ink-muted" aria-hidden />
              <span className="truncate">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
