/**
 * Remembers, in this browser, whether a user has seen the checklist unfinished and whether they have closed
 * the "setup is done" message. That way only people who actually went through the setup see the message,
 * and only once. Storage can be blocked or full, so every access is guarded and failures mean "not remembered".
 */
export type CompletionFlag = "seenIncomplete" | "dismissed";

const keyFor = (organizationId: string, flag: CompletionFlag) => `setup-checklist:${organizationId}:${flag}`;

export function readCompletionFlag(organizationId: string, flag: CompletionFlag): boolean {
  try {
    return window.localStorage.getItem(keyFor(organizationId, flag)) === "1";
  } catch {
    return false;
  }
}

export function writeCompletionFlag(organizationId: string, flag: CompletionFlag): void {
  try {
    window.localStorage.setItem(keyFor(organizationId, flag), "1");
  } catch {
    // Not remembered; the worst case is that the message shows again.
  }
}
