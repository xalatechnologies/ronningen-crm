/** Whole days remaining in local trial; 0 or negative when expired. */
export function resolveRemainingTrialDays(
  currentPeriodEnd: string | null | undefined,
): number {
  if (!currentPeriodEnd) return 0;
  const msLeft = new Date(currentPeriodEnd).getTime() - Date.now();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
}
