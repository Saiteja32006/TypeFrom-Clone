"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel: string;
}

/**
 * A textarea that looks like the text it replaces.
 *
 * Used for editing a question straight in the preview, the way Typeform does.
 * Height is driven by content so the surrounding layout does not jump between
 * the read-only and editable states, and the browser's own resize handle is
 * suppressed for the same reason.
 */
export function InlineTextarea({ value, placeholder, onChange, className = "", ariaLabel }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Collapse first: scrollHeight only shrinks if the element is smaller than
    // its content, so without this the box can grow but never shrink.
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        // Enter would otherwise insert a newline into a title that renders on
        // one visual line; blur is the more useful behaviour here.
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent outline-none transition placeholder:text-ink/25 hover:border-ink/15 focus:border-ink/30 ${className}`}
    />
  );
}
