function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message ?? "";
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return typeof error === "string" ? error : "";
}

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name ?? "";
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }
  return "";
}

/** Transient browser/network failures — safe to ignore during navigation or Strict Mode. */
export function isBenignSupabaseNetworkError(error: unknown): boolean {
  const message = errorMessage(error);
  const name = errorName(error);
  return (
    message === "Failed to fetch" ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    name === "AbortError" ||
    name === "AuthRetryableFetchError" ||
    name === "NavigatorLockAcquireTimeoutError" ||
    message.includes("Lock broken by another request") ||
    message.includes("was released because another request stole it")
  );
}
