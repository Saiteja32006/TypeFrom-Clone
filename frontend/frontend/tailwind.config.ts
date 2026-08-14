import type { Config } from "tailwindcss";

/**
 * Tokens mirror Typeform's own interface: a near-black ink used for text and
 * primary buttons, a very light warm grey canvas, and a single blue reserved
 * for focus and selection. Deliberately no second accent -- Typeform's builder
 * gets its calm from restraint, and adding a palette would read as a different
 * product.
 *
 * Colours resolve through CSS variables holding space-separated RGB channels.
 * The channel form (rather than a plain hex in a var) is what keeps Tailwind's
 * opacity modifiers working -- `text-ink/25` still compiles. Defaults live in
 * globals.css; the respondent flow overrides them per form theme at runtime.
 */
const channel = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: channel("--c-ink"), // primary text, primary buttons
          soft: channel("--c-ink-soft"), // secondary text
          muted: channel("--c-ink-muted"), // captions, placeholders
        },
        canvas: channel("--c-canvas"), // app background
        line: channel("--c-line"), // hairline borders
        accent: {
          DEFAULT: channel("--c-accent"), // focus rings, selected states
          soft: channel("--c-accent-soft"), // selected row / choice fill
        },
        positive: channel("--c-positive"),
        danger: channel("--c-danger"),
      },
      fontFamily: {
        // Typeform's own faces are proprietary. Inter is the closest widely
        // available match for its geometry; the system stack is the fallback.
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      fontSize: {
        // The respondent flow's question text is the largest type in the app.
        question: ["2rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
        "question-lg": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(38,38,39,0.06), 0 1px 3px rgba(38,38,39,0.04)",
        pop: "0 8px 28px rgba(38,38,39,0.12)",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "toast-in": "toast-in 180ms cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
