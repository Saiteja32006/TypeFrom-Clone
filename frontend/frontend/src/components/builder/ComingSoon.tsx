"use client";

import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}

/**
 * Placeholder for the areas the brief explicitly scopes out (integrations,
 * team sharing, logic jumps, file upload). Stated as "not built yet" rather
 * than dressed up as a real screen, so nobody clicks expecting it to work.
 */
export function ComingSoon({ icon: Icon, title, description, items }: Props) {
  return (
    <div className="grid h-full place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-black/[0.04] text-ink-soft">
          <Icon size={22} />
        </span>

        <h2 className="mt-4 text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>

        <span className="mt-4 inline-flex items-center rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          Coming soon
        </span>

        <ul className="mt-6 space-y-2 text-left">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-sm text-ink-soft"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
