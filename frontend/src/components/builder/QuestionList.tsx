"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CopyPlus, GripVertical, MoreHorizontal, PartyPopper, Plus, Trash2 } from "lucide-react";

import { Menu } from "@/components/ui/Menu";

import { QUESTION_TYPES, questionLabel } from "@/lib/questionTypes";
import type { Question } from "@/lib/types";

interface Props {
  questions: Question[];
  /** "ending" selects the end screen rather than a question. */
  selectedId: number | "ending" | null;
  onSelect: (id: number | "ending") => void;
  onReorder: (orderedIds: number[]) => void;
  onDelete: (question: Question) => void;
  onDuplicate: (question: Question) => void;
  onAdd: () => void;
}

function SortableRow({
  question,
  index,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  question: Question;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const { icon: Icon, tone } = QUESTION_TYPES[question.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
        selected ? "bg-accent-soft" : "hover:bg-black/[0.035]"
      } ${isDragging ? "z-10 opacity-90 shadow-pop" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${questionLabel(question)}`}
        className="cursor-grab touch-none rounded p-0.5 text-ink-muted opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing focus-ring"
      >
        <GripVertical size={15} />
      </button>

      <button
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded text-left focus-ring"
      >
        {/* Colour-coded type tile with the position, as Typeform does -- the
            hue tells you the question type before you read the title. */}
        <span
          className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[11px] font-semibold tabular-nums ${tone}`}
        >
          <Icon size={13} aria-hidden />
          {index + 1}
        </span>
        <span className="truncate text-[13px] text-ink">{questionLabel(question)}</span>
        {question.is_required && (
          <span className="shrink-0 text-ink-muted" aria-label="Required" title="Required">
            *
          </span>
        )}
      </button>

      {/* Overflow menu rather than a bare delete icon: gives duplicate a home
          and keeps a destructive action from sitting one stray click away. */}
      <div className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <Menu
          align="right"
          label={`Actions for ${questionLabel(question)}`}
          trigger={
            <span className="grid h-6 w-6 place-items-center rounded text-ink-muted transition hover:bg-black/[0.06] hover:text-ink">
              <MoreHorizontal size={15} />
            </span>
          }
          items={[
            { label: "Duplicate", icon: <CopyPlus size={14} />, onSelect: onDuplicate },
            { label: "Delete", icon: <Trash2 size={14} />, onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}

export function QuestionList({
  questions,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
  onDuplicate,
  onAdd,
}: Props) {
  // The keyboard sensor makes reordering possible without a mouse.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = questions.findIndex((q) => q.id === active.id);
    const to = questions.findIndex((q) => q.id === over.id);
    if (from === -1 || to === -1) return;

    const next = [...questions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Hand the parent the full desired order; it sends one request.
    onReorder(next.map((q) => q.id));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Questions</h2>
        <span className="text-xs tabular-nums text-ink-muted">{questions.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {questions.length === 0 ? (
          <p className="px-2 py-6 text-[13px] leading-relaxed text-ink-muted">
            No questions yet. Add your first one below.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {questions.map((question, index) => (
                  <SortableRow
                    key={question.id}
                    question={question}
                    index={index}
                    selected={question.id === selectedId}
                    onSelect={() => onSelect(question.id)}
                    onDelete={() => onDelete(question)}
                    onDuplicate={() => onDuplicate(question)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Endings. Typeform lists the end screen as its own editable block
          beneath the questions, not as a hidden setting. */}
      <div className="border-t border-line px-3 py-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Endings
        </p>
        <button
          onClick={() => onSelect("ending")}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition focus-ring ${
            selectedId === "ending" ? "bg-accent-soft" : "hover:bg-black/[0.03]"
          }`}
        >
          <span className="flex shrink-0 items-center gap-1 rounded bg-emerald-100 px-1.5 py-1 text-[11px] font-semibold text-emerald-700">
            <PartyPopper size={13} aria-hidden />
            A
          </span>
          <span className="truncate text-[13px] text-ink">Thank-you screen</span>
        </button>
      </div>

      <div className="border-t border-line p-3">
        <button
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-2.5 text-[13px] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink focus-ring"
        >
          <Plus size={15} />
          Add question
        </button>
      </div>
    </div>
  );
}
