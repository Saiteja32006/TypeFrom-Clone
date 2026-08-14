"use client";

import { PartyPopper } from "lucide-react";

interface Props {
  title: string;
  message?: string | null;
}

/**
 * The end screen.
 *
 * Extracted so the builder's preview renders the identical component the
 * respondent sees, rather than a lookalike that can drift out of sync.
 */
export function ThankYouScreen({ title, message }: Props) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
        <PartyPopper size={26} aria-hidden />
      </div>
      <h1 className="text-question font-semibold tracking-tight">{title}</h1>
      {message && <p className="mt-3 text-lg text-ink-soft">{message}</p>}
    </div>
  );
}
