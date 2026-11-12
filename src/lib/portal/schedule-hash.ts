import { sha256Hex } from "@/lib/contracts/crypto";
import { canonicalEntries, type ScheduleEntry } from "./schedule-rules";

/** Server-side only (node:crypto). Kept apart from the rules so client bundles never import it. */
export function scheduleContentHash(entries: readonly ScheduleEntry[]): string {
  return sha256Hex(canonicalEntries(entries));
}
