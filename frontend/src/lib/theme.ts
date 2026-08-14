import type { CSSProperties } from "react";

import type { FormTheme } from "@/lib/types";

/** "#0445AF" | "#04a" -> "4 69 175" (the channel form Tailwind's tokens expect). */
function toChannels(hex: string): string | null {
  const clean = hex.trim().replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  const int = parseInt(full, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

/** Perceived brightness (ITU-R BT.601), 0-255. Used to pick readable defaults. */
function luminance(channels: string): number {
  const [r, g, b] = channels.split(" ").map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Map a stored theme onto the CSS variables the palette resolves through.
 *
 * Only the keys a theme actually sets are overridden, so a partial theme (or an
 * empty one, which is what unthemed seeded forms have) falls back to the
 * defaults in globals.css instead of rendering an unstyled page.
 */
export function themeStyle(theme: FormTheme | undefined | null): CSSProperties {
  const style: Record<string, string> = {};
  if (!theme) return style as CSSProperties;

  const accent = theme.accent ? toChannels(theme.accent) : null;
  const background = theme.background ? toChannels(theme.background) : null;
  const text = theme.text ? toChannels(theme.text) : null;

  if (accent) {
    style["--c-accent"] = accent;
    // Derive the soft fill from the accent so selected choices stay legible on
    // dark themes, where a fixed pale blue would disappear.
    style["--c-accent-soft"] = luminance(accent) > 140 ? "255 255 255" : accent;
  }

  if (background) {
    style["--c-canvas"] = background;
    const dark = luminance(background) < 128;
    // Hairlines have to flip on dark backgrounds or the UI loses its structure.
    style["--c-line"] = dark ? "255 255 255" : "230 230 229";
  }

  if (text) {
    style["--c-ink"] = text;
    style["--c-ink-soft"] = text;
    style["--c-ink-muted"] = text;
  }

  return style as CSSProperties;
}
