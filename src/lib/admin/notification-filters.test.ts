import { describe, expect, it } from "vitest";

import {
  computeCampaignFilterCounts,
  computeNotificationStats,
  computeNotificationViewCounts,
  matchesCampaignFilter,
  matchesDeliveryFilter,
  matchesTemplateSearch,
} from "@/lib/admin/notification-filters";

const template = {
  key: "welcome",
  subject: "Velkommen",
  bodyHtml: "<p>Hei</p>",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const campaign = {
  id: "c1",
  name: "Nyhetsbrev",
  templateKey: "welcome",
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  deliveryCount: 0,
};

const delivery = {
  id: "d1",
  recipientEmail: "test@example.com",
  campaignId: "c1",
  campaignName: "Nyhetsbrev",
  status: "sent",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("matchesTemplateSearch", () => {
  it("matches key and subject", () => {
    expect(matchesTemplateSearch(template, "welcome")).toBe(true);
    expect(matchesTemplateSearch(template, "velkommen")).toBe(true);
    expect(matchesTemplateSearch(template, "billing")).toBe(false);
  });
});

describe("matchesCampaignFilter", () => {
  it("filters by status and search", () => {
    expect(matchesCampaignFilter(campaign, "draft")).toBe(true);
    expect(matchesCampaignFilter(campaign, "active")).toBe(false);
    expect(matchesCampaignFilter(campaign, "all", "nyhet")).toBe(true);
  });
});

describe("matchesDeliveryFilter", () => {
  it("filters by status and email", () => {
    expect(matchesDeliveryFilter(delivery, "sent")).toBe(true);
    expect(matchesDeliveryFilter(delivery, "failed")).toBe(false);
    expect(matchesDeliveryFilter(delivery, "all", "test@")).toBe(true);
  });
});

describe("computeNotificationViewCounts", () => {
  it("returns view totals", () => {
    const counts = computeNotificationViewCounts({
      templates: [template],
      campaigns: [campaign],
      deliveryTotal: 5,
    });
    expect(counts.templates).toBe(1);
    expect(counts.campaigns).toBe(1);
    expect(counts.deliveries).toBe(5);
  });
});

describe("computeCampaignFilterCounts", () => {
  it("aggregates campaign statuses", () => {
    const counts = computeCampaignFilterCounts([
      campaign,
      { ...campaign, id: "c2", status: "active" },
    ]);
    expect(counts.all).toBe(2);
    expect(counts.draft).toBe(1);
    expect(counts.active).toBe(1);
  });
});

describe("computeNotificationStats", () => {
  it("matches typical sandbox counts", () => {
    const stats = computeNotificationStats({
      templateCount: 6,
      campaigns: [{ ...campaign, status: "active" }],
      deliverySuccess: 0,
      deliveryFailed: 4,
      inAppDelivered: 5,
    });

    expect(stats).toEqual({
      templateCount: 6,
      activeCampaigns: 1,
      deliverySuccess: 0,
      deliveryFailed: 4,
      inAppDelivered: 5,
    });
  });
});
