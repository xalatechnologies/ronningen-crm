import type { Translator } from "@/i18n/types";
import type { TranslationKey } from "@/i18n/types";

export type FeatureFlagStatus = "active" | "rollout" | "scheduled" | "off";

export type AdminFeatureFlagFilter =
  | "all"
  | "active"
  | "rollout"
  | "off"
  | "scheduled";

export type FeatureFlagLike = {
  key: string;
  description: string;
  enabledGlobal: boolean;
  rolloutPercentage: number;
  enabledAt: string | null;
};

const FILTER_KEYS: Record<AdminFeatureFlagFilter, TranslationKey> = {
  all: "adminLabels.featureFlags.filter.all",
  active: "adminLabels.featureFlags.filter.activeGlobal",
  rollout: "adminLabels.featureFlags.filter.rollout",
  off: "adminLabels.featureFlags.filter.off",
  scheduled: "adminLabels.featureFlags.filter.scheduled",
};

const STATUS_KEYS: Record<FeatureFlagStatus, TranslationKey> = {
  active: "adminLabels.featureFlags.status.active",
  rollout: "adminLabels.featureFlags.status.rollout",
  scheduled: "adminLabels.featureFlags.status.scheduled",
  off: "adminLabels.featureFlags.status.off",
};

export function getAdminFeatureFlagFilterOptions(t: Translator) {
  return (Object.keys(FILTER_KEYS) as AdminFeatureFlagFilter[]).map((value) => ({
    value,
    label: t(FILTER_KEYS[value]),
  }));
}

export function featureFlagStatusLabel(
  status: FeatureFlagStatus,
  t: Translator,
): string {
  return t(STATUS_KEYS[status]);
}

/** @deprecated Use getAdminFeatureFlagFilterOptions(t) */
export const ADMIN_FEATURE_FLAG_FILTER_OPTIONS: {
  value: AdminFeatureFlagFilter;
  label: string;
}[] = [
  { value: "all", label: "Alle" },
  { value: "active", label: "Aktiv globalt" },
  { value: "rollout", label: "Gradvis utrulling" },
  { value: "off", label: "Av" },
  { value: "scheduled", label: "Planlagt" },
];

/** @deprecated Use featureFlagStatusLabel(status, t) */
export const FEATURE_FLAG_STATUS_LABELS: Record<FeatureFlagStatus, string> = {
  active: "Aktiv",
  rollout: "Gradvis",
  scheduled: "Planlagt",
  off: "Av",
};

export function isFeatureFlagScheduled(flag: {
  enabledAt: string | null;
}): boolean {
  return Boolean(flag.enabledAt && new Date(flag.enabledAt) > new Date());
}

export function resolveFeatureFlagStatus(flag: FeatureFlagLike): FeatureFlagStatus {
  if (isFeatureFlagScheduled(flag)) return "scheduled";
  if (flag.enabledGlobal) return "active";
  if (flag.rolloutPercentage > 0) return "rollout";
  return "off";
}

export function matchesFeatureFlagFilter(
  flag: FeatureFlagLike,
  filter: AdminFeatureFlagFilter,
  q?: string,
): boolean {
  const needle = q?.trim().toLowerCase();
  if (needle) {
    const matchesSearch =
      flag.key.toLowerCase().includes(needle) ||
      flag.description.toLowerCase().includes(needle);
    if (!matchesSearch) return false;
  }

  switch (filter) {
    case "all":
      return true;
    case "active":
      return flag.enabledGlobal;
    case "rollout":
      return !flag.enabledGlobal && flag.rolloutPercentage > 0;
    case "off":
      return (
        !flag.enabledGlobal &&
        flag.rolloutPercentage === 0 &&
        !isFeatureFlagScheduled(flag)
      );
    case "scheduled":
      return isFeatureFlagScheduled(flag);
    default:
      return true;
  }
}

export function computeFeatureFlagFilterCounts<T extends FeatureFlagLike>(
  flags: T[],
): Record<AdminFeatureFlagFilter, number> {
  const counts: Record<AdminFeatureFlagFilter, number> = {
    all: flags.length,
    active: 0,
    rollout: 0,
    off: 0,
    scheduled: 0,
  };

  for (const flag of flags) {
    if (flag.enabledGlobal) counts.active += 1;
    if (!flag.enabledGlobal && flag.rolloutPercentage > 0) counts.rollout += 1;
    if (
      !flag.enabledGlobal &&
      flag.rolloutPercentage === 0 &&
      !isFeatureFlagScheduled(flag)
    ) {
      counts.off += 1;
    }
    if (isFeatureFlagScheduled(flag)) counts.scheduled += 1;
  }

  return counts;
}

export type AdminFeatureFlagOverviewStats = {
  total: number;
  activeGlobal: number;
  partialRollout: number;
  scheduled: number;
  overrideTotal: number;
};

export function computeFeatureFlagStats(
  flags: { enabledGlobal: boolean; rolloutPercentage: number; enabledAt: string | null; overrideCount: number }[],
): AdminFeatureFlagOverviewStats {
  let activeGlobal = 0;
  let partialRollout = 0;
  let scheduled = 0;
  let overrideTotal = 0;

  for (const flag of flags) {
    if (flag.enabledGlobal) activeGlobal += 1;
    if (!flag.enabledGlobal && flag.rolloutPercentage > 0) partialRollout += 1;
    if (isFeatureFlagScheduled(flag)) scheduled += 1;
    overrideTotal += flag.overrideCount;
  }

  return {
    total: flags.length,
    activeGlobal,
    partialRollout,
    scheduled,
    overrideTotal,
  };
}
