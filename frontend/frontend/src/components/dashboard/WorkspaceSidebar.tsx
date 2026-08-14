"use client";

import { FolderClosed, LayoutGrid, Plus, Users, Workflow } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface Props {
  formCount: number;
  responsesUsed: number;
  onCreate: () => void;
}

/**
 * Workspace sidebar.
 *
 * Typeform's dashboard is organised around workspaces, with Forms / Contacts /
 * Automations as top-level sections. Only Forms is built here -- the other two
 * are shown disabled rather than hidden, so the navigation reads as familiar
 * without implying features that do not exist.
 */
export function WorkspaceSidebar({ formCount, responsesUsed, onCreate }: Props) {
  const sections = [
    { label: "Forms", icon: LayoutGrid, active: true },
    { label: "Contacts", icon: Users, active: false },
    { label: "Automations", icon: Workflow, active: false },
  ];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
      <div className="p-3">
        <Button className="w-full justify-center" onClick={onCreate}>
          <Plus size={16} />
          Create form
        </Button>
      </div>

      <nav className="px-2">
        {sections.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            disabled={!active}
            title={active ? undefined : "Not available in this build"}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition ${
              active
                ? "bg-black/[0.05] text-ink"
                : "cursor-not-allowed text-ink-muted/60"
            }`}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-5 px-2">
        <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Workspaces
        </p>
        <div className="flex items-center gap-2.5 rounded-lg bg-accent-soft px-2.5 py-2 text-[13px] font-medium text-ink">
          <FolderClosed size={15} aria-hidden />
          <span className="flex-1 truncate">My workspace</span>
          <span className="tabular-nums text-xs text-ink-muted">{formCount}</span>
        </div>
      </div>

      {/* Mirrors Typeform's free-plan meter. The cap is illustrative: this build
          has no billing, so nothing is actually enforced. */}
      <div className="mt-auto border-t border-line p-4">
        <p className="text-xs font-medium text-ink-soft">Responses collected</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-500"
            style={{ width: `${Math.min((responsesUsed / 100) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          <span className="font-semibold text-ink">{responsesUsed}</span> / 100
        </p>
      </div>
    </aside>
  );
}
