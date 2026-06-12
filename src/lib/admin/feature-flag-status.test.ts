import { describe, expect, it } from "vitest";

import {
  computeFeatureFlagFilterCounts,
  computeFeatureFlagStats,
  isFeatureFlagScheduled,
  matchesFeatureFlagFilter,
  resolveFeatureFlagStatus,
} from "@/lib/admin/feature-flag-status";

const baseFlag = {
  key: "ai_features",
  description: "AI-funksjoner",
  enabledGlobal: false,
  rolloutPercentage: 0,
  enabledAt: null,
};

describe("resolveFeatureFlagStatus", () => {
  it("returns active when globally enabled", () => {
    expect(
      resolveFeatureFlagStatus({ ...baseFlag, enabledGlobal: true }),
    ).toBe("active");
  });

  it("returns scheduled when enabledAt is in the future", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    expect(
      resolveFeatureFlagStatus({
        ...baseFlag,
        enabledAt: future.toISOString(),
      }),
    ).toBe("scheduled");
  });

  it("returns rollout for partial percentage", () => {
    expect(
      resolveFeatureFlagStatus({ ...baseFlag, rolloutPercentage: 25 }),
    ).toBe("rollout");
  });

  it("returns off when disabled with no rollout", () => {
    expect(resolveFeatureFlagStatus(baseFlag)).toBe("off");
  });
});

describe("matchesFeatureFlagFilter", () => {
  it("matches search on key and description", () => {
    expect(matchesFeatureFlagFilter(baseFlag, "all", "ai_")).toBe(true);
    expect(matchesFeatureFlagFilter(baseFlag, "all", "stripe")).toBe(false);
  });

  it("filters active flags", () => {
    expect(
      matchesFeatureFlagFilter(
        { ...baseFlag, enabledGlobal: true },
        "active",
      ),
    ).toBe(true);
    expect(matchesFeatureFlagFilter(baseFlag, "active")).toBe(false);
  });

  it("filters rollout flags", () => {
    expect(
      matchesFeatureFlagFilter(
        { ...baseFlag, rolloutPercentage: 10 },
        "rollout",
      ),
    ).toBe(true);
  });
});

describe("computeFeatureFlagFilterCounts", () => {
  it("aggregates segment counts", () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);

    const counts = computeFeatureFlagFilterCounts([
      baseFlag,
      { ...baseFlag, key: "billing", enabledGlobal: true },
      { ...baseFlag, key: "sms", rolloutPercentage: 50 },
      {
        ...baseFlag,
        key: "reports",
        enabledAt: future.toISOString(),
      },
    ]);

    expect(counts.all).toBe(4);
    expect(counts.active).toBe(1);
    expect(counts.rollout).toBe(1);
    expect(counts.scheduled).toBe(1);
    expect(counts.off).toBe(1);
  });
});

describe("computeFeatureFlagStats", () => {
  it("sums overview stats", () => {
    const stats = computeFeatureFlagStats([
      {
        enabledGlobal: true,
        rolloutPercentage: 0,
        enabledAt: null,
        overrideCount: 2,
      },
      {
        enabledGlobal: false,
        rolloutPercentage: 20,
        enabledAt: null,
        overrideCount: 1,
      },
    ]);

    expect(stats.total).toBe(2);
    expect(stats.activeGlobal).toBe(1);
    expect(stats.partialRollout).toBe(1);
    expect(stats.overrideTotal).toBe(3);
  });

  it("matches seeded platform flags shape", () => {
    const stats = computeFeatureFlagStats([
      { enabledGlobal: false, rolloutPercentage: 0, enabledAt: null, overrideCount: 0 },
      { enabledGlobal: false, rolloutPercentage: 0, enabledAt: null, overrideCount: 0 },
      { enabledGlobal: false, rolloutPercentage: 0, enabledAt: null, overrideCount: 0 },
      { enabledGlobal: true, rolloutPercentage: 0, enabledAt: null, overrideCount: 0 },
      { enabledGlobal: true, rolloutPercentage: 0, enabledAt: null, overrideCount: 0 },
    ]);

    expect(stats).toEqual({
      total: 5,
      activeGlobal: 2,
      partialRollout: 0,
      scheduled: 0,
      overrideTotal: 0,
    });
  });
});

describe("isFeatureFlagScheduled", () => {
  it("detects future enable dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    expect(isFeatureFlagScheduled({ ...baseFlag, enabledAt: future.toISOString() })).toBe(
      true,
    );
    expect(isFeatureFlagScheduled(baseFlag)).toBe(false);
  });
});
