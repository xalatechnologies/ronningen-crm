const BILLING_ACTIVATED_STORAGE_KEY = "rn-billing-activated";

export function readBillingCheckoutParams(): {
  checkout: string | null;
  sessionId: string | null;
} {
  if (typeof window === "undefined") {
    return { checkout: null, sessionId: null };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    checkout: params.get("checkout"),
    sessionId: params.get("session_id"),
  };
}

export function clearBillingCheckoutParams(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", "/app/settings/billing");
}

export function markBillingActivatedForDashboard(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BILLING_ACTIVATED_STORAGE_KEY, "1");
}

export function consumeBillingActivatedToast(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(BILLING_ACTIVATED_STORAGE_KEY) !== "1") {
    return false;
  }
  sessionStorage.removeItem(BILLING_ACTIVATED_STORAGE_KEY);
  return true;
}
