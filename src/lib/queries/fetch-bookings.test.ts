import { describe, expect, it } from "vitest";

import { summarizeBookingContract } from "@/lib/queries/fetch-bookings";

describe("summarizeBookingContract", () => {
  it("prefers an accepted version so PDF stays available", () => {
    expect(
      summarizeBookingContract([
        { id: "v2", status: "cancelled", version_number: 2 },
        { id: "v1", status: "accepted", version_number: 1 },
      ]),
    ).toEqual({ versionId: "v1", status: "accepted" });
  });

  it("uses the latest waiting version when none are accepted", () => {
    expect(
      summarizeBookingContract([
        { id: "v1", status: "draft", version_number: 1 },
        { id: "v2", status: "sent", version_number: 2 },
      ]),
    ).toEqual({ versionId: "v2", status: "sent" });
  });
});
