import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { deliveryFromEvent, shouldApplyDelivery, verifyResendSignature } from "./resend-webhook";

const secret = `whsec_${Buffer.from("test-secret-key").toString("base64")}`;
const sign = (id: string, ts: string, body: string) =>
  "v1," + createHmac("sha256", Buffer.from("test-secret-key")).update(`${id}.${ts}.${body}`).digest("base64");

describe("verifyResendSignature", () => {
  const now = 1_800_000_000_000;
  const ts = String(now / 1000);
  const body = '{"type":"email.delivered"}';
  const good = { id: "msg_1", timestamp: ts, signature: sign("msg_1", ts, body), body, secret, now };

  it("accepts a correct signature", () => {
    expect(verifyResendSignature(good)).toBe(true);
  });
  it("accepts any matching signature in a list", () => {
    expect(verifyResendSignature({ ...good, signature: `v1,AAAA ${good.signature}` })).toBe(true);
  });
  it("rejects a changed body, wrong secret, missing headers and old timestamps", () => {
    expect(verifyResendSignature({ ...good, body: body + " " })).toBe(false);
    expect(verifyResendSignature({ ...good, secret: `whsec_${Buffer.from("other").toString("base64")}` })).toBe(false);
    expect(verifyResendSignature({ ...good, signature: null })).toBe(false);
    expect(verifyResendSignature({ ...good, id: null })).toBe(false);
    expect(verifyResendSignature({ ...good, now: now + 10 * 60 * 1000 })).toBe(false);
    expect(verifyResendSignature({ ...good, signature: "v2," + good.signature.slice(3) })).toBe(false);
  });
});

describe("delivery events", () => {
  it("maps what the customer needs to know", () => {
    expect(deliveryFromEvent("email.delivered")).toEqual({ delivery: "delivered", issue: null });
    expect(deliveryFromEvent("email.delivery_delayed")?.issue).toBe("delayed");
    expect(deliveryFromEvent("email.bounced")?.issue).toBe("bounced");
    expect(deliveryFromEvent("email.complained")?.issue).toBe("bounced");
    expect(deliveryFromEvent("email.opened")).toBeNull();
  });
  it("never lets a late 'delayed' undo a final outcome", () => {
    expect(shouldApplyDelivery(null, "delayed")).toBe(true);
    expect(shouldApplyDelivery("delayed", "delayed")).toBe(true);
    expect(shouldApplyDelivery("delivered", "delayed")).toBe(false);
    expect(shouldApplyDelivery("bounced", "delayed")).toBe(false);
    expect(shouldApplyDelivery("delayed", "delivered")).toBe(true);
    expect(shouldApplyDelivery("delayed", "bounced")).toBe(true);
  });
});
