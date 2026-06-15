/** Transient browser/network failures — safe to ignore during navigation or Strict Mode. */
export function isBenignSupabaseNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message ?? "";
  return (
    message === "Failed to fetch" ||
    error.name === "AbortError" ||
    error.name === "AuthRetryableFetchError" ||
    error.name === "NavigatorLockAcquireTimeoutError" ||
    message.includes("Lock broken by another request") ||
    message.includes("was released because another request stole it")
  );
}
