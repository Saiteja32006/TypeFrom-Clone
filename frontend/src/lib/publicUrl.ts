/**
 * The shareable URL for a published form.
 *
 * Built from the browser's own origin rather than the backend's FRONTEND_URL.
 * That way the copied link is correct wherever the app happens to be served --
 * localhost in development, the Vercel domain in production -- without a
 * deploy-time environment variable having to be kept in sync.
 */
export function publicFormUrl(slug: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/f/${slug}`;
}
