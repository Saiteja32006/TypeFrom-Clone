"use client";

import { motion } from "framer-motion";
import { ArrowRight, FilePlus2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

/**
 * Create-form screen.
 *
 * Typeform opens a full-screen "What would you like to create?" step rather
 * than a small dialog, so creating a form feels like the start of something.
 * Their version leads with an AI prompt and offers "Start from scratch"
 * alongside; naming the form is the scratch path, and the AI generation route
 * is out of scope for this project, so it is shown as unavailable rather than
 * faked.
 */
export function CreateFormScreen({ open, busy, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");

  if (!open) return null;

  const submit = () => onCreate(title.trim() || "Untitled form");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-canvas"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-medium text-ink-soft">New form</span>
        <button
          onClick={onClose}
          aria-label="Cancel"
          className="rounded-lg p-2 text-ink-muted transition hover:bg-black/[0.05] hover:text-ink focus-ring"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mx-auto grid max-w-xl place-items-center px-6 pb-24 pt-[8vh] text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white">
            <FilePlus2 size={20} />
          </span>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">
            What would you like to create?
          </h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Give your form a name. You can change it at any time.
          </p>

          <div className="mt-8 rounded-2xl border border-line bg-white p-2 shadow-card focus-within:border-ink/25">
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
                if (event.key === "Escape") onClose();
              }}
              placeholder="Customer feedback survey"
              aria-label="Form name"
              className="w-full bg-transparent px-4 py-3 text-lg text-ink outline-none placeholder:text-ink/30"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2">
              <span className="text-xs text-ink-muted">
                Press <kbd className="font-sans font-medium text-ink-soft">Enter</kbd> to continue
              </span>
              <Button loading={busy} onClick={submit}>
                Start from scratch
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>

          <p className="mt-6 text-xs text-ink-muted">
            Generating a form from a prompt is not available in this build.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
