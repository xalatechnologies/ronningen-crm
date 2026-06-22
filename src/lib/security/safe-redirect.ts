const ALLOWED_PREFIXES = ["/app", "/admin", "/auth"] as const;

/**
 * Returns a same-origin path safe for post-login redirects.
 * Rejects absolute URLs, protocol-relative paths, and paths outside app routes.
 */
export function safeInternalRedirect(
  path: string | undefined | null,
  fallback = "/app",
): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  const isAllowed = ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  return isAllowed ? path : fallback;
}
