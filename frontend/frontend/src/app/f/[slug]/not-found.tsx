import Link from "next/link";
import { FileQuestion } from "lucide-react";

/**
 * Shown when a public link points at a form that is unpublished, deleted, or
 * simply wrong. The three cases are deliberately indistinguishable: saying
 * "this form exists but is unpublished" would leak the existence of a draft.
 */
export default function FormUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/[0.04] text-ink-soft">
          <FileQuestion size={26} aria-hidden />
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
          This form is currently unavailable
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
          The link may be incorrect, or the form may have been unpublished by its owner. If someone
          sent you this link, check with them for an updated one.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus-ring"
        >
          Go to Typeform Builder
        </Link>
      </div>
    </main>
  );
}
