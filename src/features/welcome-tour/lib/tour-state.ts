/** An account counts as new for this long after it was created. */
export const NEW_ACCOUNT_DAYS = 14;

/** True when the account was created within the last NEW_ACCOUNT_DAYS days. A missing or unreadable date is not new. */
export function isNewAccount(createdAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return now.getTime() - created <= NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
}

export type TourAccountState = {
  createdAt: string | null;
  /** Set once the tour was finished or closed; never cleared. */
  tipsSeenAt: string | null;
};

/**
 * Whether the tour should open by itself: a new account that has not finished or closed it, and nobody
 * (support or an admin) is looking at the app on the customer's behalf.
 */
export function shouldAutoShowTour(input: { account: TourAccountState | null; impersonating: boolean; now?: Date }): boolean {
  if (input.impersonating || !input.account) return false;
  if (input.account.tipsSeenAt) return false;
  return isNewAccount(input.account.createdAt, input.now);
}
