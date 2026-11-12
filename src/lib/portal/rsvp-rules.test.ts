import { describe, expect, it } from "vitest";

import { deadlinePassed, MAX_DAILY_EMAILS, normalizeRsvp, rateLimited, selectRecipients, todayInOslo, type SendCandidate } from "./rsvp-rules";

describe("normalizeRsvp", () => {
  it("accepts a yes with diet per person and consent", () => {
    const r = normalizeRsvp({ answer: "accepted", partySize: 2, consent: true, diet: [{ tags: ["gluten", "gluten", "nuts"], note: " " }, { tags: [], note: "ingen sopp" }] }, 3);
    expect(r).toMatchObject({ ok: true, status: "accepted", partySize: 2, hasDiet: true });
    if (r.ok) {
      expect(r.diet).toHaveLength(2);
      expect(r.diet[0].tags).toEqual(["gluten", "nuts"]);
      expect(r.diet[1].note).toBe("ingen sopp");
    }
  });
  it("requires consent only when diet information is given", () => {
    expect(normalizeRsvp({ answer: "accepted", partySize: 1, consent: false, diet: [{ tags: ["vegan"], note: "" }] }, 1)).toEqual({ ok: false, error: "consent_required" });
    expect(normalizeRsvp({ answer: "accepted", partySize: 1, consent: false, diet: [{ tags: [], note: "" }] }, 1)).toMatchObject({ ok: true, hasDiet: false, diet: [] });
  });
  it("rejects a party larger than the invitation allows", () => {
    expect(normalizeRsvp({ answer: "accepted", partySize: 3, consent: true, diet: [] }, 2)).toEqual({ ok: false, error: "party_too_large" });
  });
  it("stores nothing but the answer for no / maybe", () => {
    expect(normalizeRsvp({ answer: "declined", partySize: 5, consent: true, diet: [{ tags: ["fish"], note: "x" }] }, 2)).toEqual({ ok: true, status: "declined", partySize: 1, diet: [], hasDiet: false });
    expect(normalizeRsvp({ answer: "maybe", partySize: 1, consent: false, diet: [] }, 1)).toMatchObject({ ok: true, status: "maybe" });
  });
  it("rejects garbage, unknown tags and links in notes", () => {
    expect(normalizeRsvp(null, 2)).toEqual({ ok: false, error: "invalid" });
    expect(normalizeRsvp({ answer: "yes", partySize: 1, consent: true, diet: [] }, 2)).toEqual({ ok: false, error: "invalid" });
    expect(normalizeRsvp({ answer: "accepted", partySize: 1, consent: true, diet: [{ tags: ["peanutbutter"], note: "" }] }, 2)).toEqual({ ok: false, error: "invalid" });
    expect(normalizeRsvp({ answer: "accepted", partySize: 1, consent: true, diet: [{ tags: [], note: "se https://evil.no" }] }, 2)).toEqual({ ok: false, error: "invalid" });
    expect(normalizeRsvp({ answer: "accepted", partySize: 1, consent: true, diet: [{ tags: [], note: "x".repeat(201) }] }, 2)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("deadlinePassed / todayInOslo", () => {
  it("keeps the deadline day open and closes the next day", () => {
    const noon = new Date("2027-03-01T12:00:00Z");
    expect(todayInOslo(noon)).toBe("2027-03-01");
    expect(deadlinePassed("2027-03-01", noon)).toBe(false);
    expect(deadlinePassed("2027-02-28", noon)).toBe(true);
    expect(deadlinePassed(null, noon)).toBe(false);
  });
  it("uses the Oslo date near midnight UTC", () => {
    expect(todayInOslo(new Date("2027-03-01T23:30:00Z"))).toBe("2027-03-02");
  });
});

describe("rateLimited", () => {
  const now = new Date("2027-01-01T12:00:10Z");
  it("blocks rapid repeats and exhausted counters", () => {
    expect(rateLimited("2027-01-01T12:00:09Z", 1, now)).toBe(true);
    expect(rateLimited("2027-01-01T12:00:05Z", 1, now)).toBe(false);
    expect(rateLimited(null, 50, now)).toBe(true);
    expect(rateLimited(null, 0, now)).toBe(false);
  });
});

describe("selectRecipients", () => {
  const now = new Date("2027-01-10T12:00:00Z");
  const g = (over: Partial<SendCandidate>): SendCandidate => ({ id: "x", email: "a@b.no", status: "not_sent", optedOut: false, lastSentAt: null, ...over });
  it("invites only never-sent guests with an e-mail who have not opted out", () => {
    const { send } = selectRecipients([g({ id: "1" }), g({ id: "2", email: null }), g({ id: "3", status: "invited" }), g({ id: "4", optedOut: true })], "invite", 0, now);
    expect(send.map((x) => x.id)).toEqual(["1"]);
  });
  it("reminds only unanswered guests outside the 3-day cooldown", () => {
    const { send } = selectRecipients(
      [g({ id: "1", status: "invited", lastSentAt: "2027-01-05T12:00:00Z" }), g({ id: "2", status: "invited", lastSentAt: "2027-01-09T12:00:00Z" }), g({ id: "3", status: "accepted", lastSentAt: "2027-01-01T00:00:00Z" }), g({ id: "4", status: "invited", lastSentAt: null })],
      "reminder",
      0,
      now,
    );
    expect(send.map((x) => x.id)).toEqual(["1", "4"]);
  });
  it("respects the daily cap", () => {
    const many = Array.from({ length: 5 }, (_, i) => g({ id: String(i) }));
    const r = selectRecipients(many, "invite", MAX_DAILY_EMAILS - 2, now);
    expect(r.send).toHaveLength(2);
    expect(r.skippedForCap).toBe(3);
    expect(selectRecipients(many, "invite", MAX_DAILY_EMAILS, now).send).toHaveLength(0);
  });
});
