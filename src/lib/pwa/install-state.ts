export type InstallStored = { installed?: boolean; dismissals?: number; dismissedAt?: number };

export type InstallDecision = "none" | "install-button" | "ios-instructions" | "chrome-hint";

const DAY = 86_400_000;
/** Cooldown after "Ikke nå": Chromium gets a reminder sooner than iPhone, where we cannot tell if it is installed. */
export const COOLDOWN_DAYS = { chromium: 14, ios: 90 } as const;
export const MAX_DISMISSALS = 3;

/**
 * Whether to offer the install prompt, in the order of docs/pwa-install-plan.md section 3:
 * never inside the app, never when known installed, respect cooldown and 3-strike stop, phones/tablets only,
 * then the native prompt (Chromium) or the instructions (iPhone). First matching rule wins.
 */
export function decideInstall(input: {
  standalone: boolean;
  isIos: boolean;
  /** Samsung Internet: its install wrapper can trigger a Google Play Protect warning, so we point to Chrome. */
  samsung?: boolean;
  hasPrompt: boolean;
  coarsePointer: boolean;
  stored: InstallStored;
  now: number;
}): InstallDecision {
  const { stored } = input;
  if (input.standalone || stored.installed) return "none";
  if ((stored.dismissals ?? 0) >= MAX_DISMISSALS) return "none";
  const cooldown = (input.isIos && !input.hasPrompt ? COOLDOWN_DAYS.ios : COOLDOWN_DAYS.chromium) * DAY;
  if (stored.dismissedAt !== undefined && input.now - stored.dismissedAt < cooldown) return "none";
  if (!input.coarsePointer) return "none";
  if (input.hasPrompt && input.samsung) return "chrome-hint";
  if (input.hasPrompt) return "install-button";
  if (input.isIos) return "ios-instructions";
  return "none";
}

/** The permanent "Installer appen" menu entry: available whenever installing is possible, regardless of cooldown. */
export function installMenuAvailable(input: { standalone: boolean; isIos: boolean; hasPrompt: boolean; stored: InstallStored }): boolean {
  if (input.standalone || input.stored.installed) return false;
  return input.hasPrompt || input.isIos;
}

export function isSamsungBrowser(nav: Pick<Navigator, "userAgent">): boolean {
  return /SamsungBrowser/i.test(nav.userAgent);
}

export function isIosDevice(nav: Pick<Navigator, "userAgent" | "maxTouchPoints"> & { platform?: string }): boolean {
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
}

const KEY = "em:pwa-install";

export function readInstallState(): InstallStored {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as InstallStored;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeInstallState(next: InstallStored): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode or blocked storage: the prompt simply may reappear next visit
  }
}
