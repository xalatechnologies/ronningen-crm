export const PROFILE_NAME_MAX = 100;

/** The name as it is saved: surrounding blank space removed, inner spacing kept. */
export function normalizeProfileName(input: string): string {
  return input.trim();
}

export function profileNameError(input: string): "too_long" | null {
  return normalizeProfileName(input).length > PROFILE_NAME_MAX ? "too_long" : null;
}

/** True when saving would change something. */
export function isNameChanged(current: string, saved: string): boolean {
  return normalizeProfileName(current) !== normalizeProfileName(saved);
}

/** Seconds left before the reset link may be requested again, or 0 when it may be requested now. */
export function resetCooldownLeft(sentAtMs: number | null, nowMs: number, cooldownSeconds: number): number {
  if (sentAtMs == null) return 0;
  return Math.max(0, Math.ceil((sentAtMs + cooldownSeconds * 1000 - nowMs) / 1000));
}
